import { queryOne, queryAll } from "@/lib/db/client";

interface SystemConfig {
  ai_name: string;
  ai_tagline: string;
  ai_personality: string;
  default_language: string;
  default_model: string;
  default_tone: string;
}

interface KnowledgeEntry {
  kind: string;
  title: string;
  content: string;
  tags: string[];
}

/**
 * Build the system prompt for V by combining:
 *  1. Core personality from system_config
 *  2. Operator profile + organizations (always included)
 *  3. Method + key ADRs (always included)
 *  4. Recent lessons (last 10)
 *  5. Project catalog summary (counts + names by category)
 */
export async function buildSystemPrompt(): Promise<{
  systemPrompt: string;
  config: SystemConfig;
}> {
  const config = await queryOne<SystemConfig>(
    `SELECT ai_name, ai_tagline, ai_personality, default_language, default_model, default_tone
     FROM system_config WHERE id = 1`,
  );

  if (!config) {
    throw new Error("system_config not found — did you run the seed migration?");
  }

  // Always-on knowledge: operator + organization + method + ADRs
  const coreKnowledge = await queryAll<KnowledgeEntry>(
    `SELECT kind, title, content, tags FROM knowledge_base
     WHERE kind IN ('operator_profile', 'organization', 'method', 'preference')
     ORDER BY kind, created_at`,
  );

  // Recent lessons (max 10)
  const lessons = await queryAll<KnowledgeEntry>(
    `SELECT kind, title, content, tags FROM knowledge_base
     WHERE kind = 'lesson'
     ORDER BY created_at DESC
     LIMIT 10`,
  );

  // Project catalog summary
  const projectSummary = await queryAll<{
    category: string;
    count: number;
    names: string[];
  }>(
    `SELECT category,
            COUNT(*)::int AS count,
            ARRAY_AGG(name ORDER BY name) AS names
     FROM projects
     GROUP BY category
     ORDER BY category`,
  );

  const knowledgeSection = formatKnowledge([...coreKnowledge, ...lessons]);
  const projectSection = formatProjects(projectSummary);

  const systemPrompt = [
    config.ai_personality,
    "",
    "─────────────────────────────────────────",
    "MEMORIA — CONOCIMIENTO PERSISTENTE",
    "─────────────────────────────────────────",
    knowledgeSection,
    "",
    "─────────────────────────────────────────",
    "CATÁLOGO DE PROYECTOS (real, cross-checked GitHub + Vercel)",
    "─────────────────────────────────────────",
    projectSection,
    "",
    "─────────────────────────────────────────",
    "CONFIGURACIÓN ACTUAL",
    "─────────────────────────────────────────",
    `Nombre: ${config.ai_name}`,
    `Tagline: ${config.ai_tagline}`,
    `Idioma default: ${config.default_language}`,
    `Tono default: ${config.default_tone}`,
    `Modelo default: ${config.default_model}`,
  ].join("\n");

  return { systemPrompt, config };
}

function formatKnowledge(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "(sin entradas)";
  return entries
    .map(
      (e) =>
        `[${e.kind}] ${e.title}\n${e.content}\n(tags: ${e.tags.join(", ")})`,
    )
    .join("\n\n");
}

function formatProjects(
  summary: { category: string; count: number; names: string[] }[],
): string {
  if (summary.length === 0) return "(sin proyectos)";
  return summary
    .map(
      (s) =>
        `${s.category.toUpperCase()} (${s.count}): ${s.names.join(", ")}`,
    )
    .join("\n");
}
