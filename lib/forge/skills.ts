/**
 * Skills registry — search + invoke (M16).
 *
 * A skill is a self-describing capability bundle that V can discover
 * and "install" at runtime. Each skill provides:
 *   - system_prompt: a fragment V reads to frame its next reasoning step.
 *   - required_tools: list of tool names V should rely on while operating.
 *   - tags + description: used by skill_search to surface matches.
 *
 * Search uses pg_trgm ILIKE (no embeddings) — coherent with the "only
 * OpenRouter" directive since OpenRouter doesn't sell embeddings. Add
 * pgvector + OpenAI text-embedding-3-small later if we outgrow it.
 *
 * Install is stateless: skill_install returns the full body to V; V
 * uses that info during the same turn. No cross-turn persistence yet.
 * Add an active_skills_per_session table if a use case appears.
 */
import { sql } from "@/lib/db/client";

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  required_tools: string[];
  ring_max: number;
  tags: string[];
  score: number;
}

export interface SkillBody extends SkillSummary {
  system_prompt: string;
  examples: unknown | null;
}

/**
 * Search skills by free-text query. Matches against name, description,
 * and tags using ILIKE on trigram indexes. Returns top_k ranked by
 * a simple priority: tag exact match > name substring > description
 * substring.
 */
/** Stop-words to skip when tokenizing a free-text query. Keeps the
 *  scoring noise-free for common Spanish + English filler.
 */
const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "al", "a", "en", "con", "por", "para", "sin",
  "y", "o", "u", "que", "qué", "mi", "mis", "tu", "tus",
  "es", "son", "ser", "estar", "está", "están", "hay",
  "the", "a", "an", "to", "of", "in", "on", "at", "by",
  "for", "with", "and", "or", "is", "are", "be", "from",
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents so "rescatar" matches "rescate"
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

export async function searchSkills(
  query: string,
  topK = 5,
): Promise<SkillSummary[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Per-token ILIKE matches contribute to a score. Tag exact match >
  // name substring > description substring > tag substring.
  // We compute the score in SQL using a generated_subquery over
  // unnest(tokens) so the planner can use the GIN trigram indexes.
  const tokensArr = tokens;
  const rows = (await sql`
    WITH tokens AS (
      SELECT lower(unnest(${tokensArr}::text[])) AS tok
    )
    SELECT
      s.id, s.name, s.description, s.required_tools, s.ring_max, s.tags,
      (
        SELECT COALESCE(SUM(
          CASE WHEN EXISTS (SELECT 1 FROM unnest(s.tags) tag WHERE lower(tag) = t.tok) THEN 100 ELSE 0 END +
          CASE WHEN lower(s.name) LIKE '%' || t.tok || '%' THEN 50 ELSE 0 END +
          CASE WHEN lower(s.description) LIKE '%' || t.tok || '%' THEN 25 ELSE 0 END +
          CASE WHEN EXISTS (SELECT 1 FROM unnest(s.tags) tag WHERE lower(tag) LIKE '%' || t.tok || '%') THEN 30 ELSE 0 END
        ), 0) FROM tokens t
      )::int AS score
    FROM skills s
    WHERE EXISTS (
      SELECT 1 FROM tokens t
      WHERE
        lower(s.name) LIKE '%' || t.tok || '%'
        OR lower(s.description) LIKE '%' || t.tok || '%'
        OR EXISTS (SELECT 1 FROM unnest(s.tags) tag WHERE lower(tag) LIKE '%' || t.tok || '%')
    )
    ORDER BY score DESC, invocation_count DESC, id ASC
    LIMIT ${topK}
  `) as Array<SkillSummary>;

  return rows;
}

/**
 * Fetch the full body of one skill. Bumps invocation_count + records
 * the invocation so we can later score "most useful skills".
 */
export async function getSkillBody(
  id: string,
  options: { sessionId?: string; userId?: string } = {},
): Promise<SkillBody | null> {
  const rows = (await sql`
    SELECT
      id, name, description, required_tools, ring_max, tags,
      system_prompt, examples
    FROM skills
    WHERE id = ${id}
  `) as Array<SkillBody>;
  if (rows.length === 0) return null;
  const skill = rows[0];

  // Record invocation (fire-and-forget on auxiliary tables)
  if (options.sessionId) {
    try {
      await sql`
        INSERT INTO skill_invocations (skill_id, session_id, user_id, outcome)
        VALUES (${id}, ${options.sessionId}, ${options.userId ?? null}, 'pending')
      `;
    } catch {
      /* non-blocking */
    }
  }
  try {
    await sql`
      UPDATE skills
      SET invocation_count = invocation_count + 1,
          last_invoked_at = now()
      WHERE id = ${id}
    `;
  } catch {
    /* non-blocking */
  }

  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    required_tools: skill.required_tools,
    ring_max: skill.ring_max,
    tags: skill.tags,
    system_prompt: skill.system_prompt,
    examples: skill.examples ?? null,
    score: 0,
  };
}

/** List all builtin skills (useful for /modules UI). */
export async function listSkills(
  options: { source?: "builtin" | "user" | "marketplace" } = {},
): Promise<SkillSummary[]> {
  const src = options.source ?? null;
  const rows = (await sql`
    SELECT id, name, description, required_tools, ring_max, tags, 0::int AS score
    FROM skills
    WHERE (${src}::text IS NULL OR source = ${src})
    ORDER BY id
  `) as Array<SkillSummary>;
  return rows;
}
