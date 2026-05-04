/**
 * Tool registry for V (forge brain).
 *
 * Each tool is a small read-only adapter over an existing capability
 * (GitHub via Octokit, Vault metadata via SQL). All tools require an
 * authenticated operator user id passed through the execution context;
 * each call audits a `forge.tool.invoke` event so we can trace what V
 * did during a turn.
 */
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { sql } from "@/lib/db/client";
import {
  listAllUserRepos,
  getRepo,
  listRecentCommits,
  getFileContent,
} from "@/lib/github/client";

export const TOOLS: Tool[] = [
  {
    name: "github_list_repos",
    description:
      "Lista los repositorios de GitHub visibles para el PAT del operador (públicos y privados). Devuelve full_name, descripción, lenguaje, último push, archived, fork, stars, html_url. Úsala cuando Luis pregunte qué repos tiene, qué proyectos hay en su GitHub, o quiera ver actividad reciente del catálogo.",
    input_schema: {
      type: "object",
      properties: {
        max: {
          type: "number",
          description: "Cuántos repos devolver (1-200, default 50)",
        },
      },
    },
  },
  {
    name: "github_get_repo",
    description:
      "Detalle de un repo específico: descripción, lenguaje, license, default_branch, stars, forks, open_issues, archived, etc. Úsala cuando Luis pregunte por un repo concreto por nombre.",
    input_schema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Owner del repo (user u organización)",
        },
        repo: { type: "string", description: "Nombre del repo" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_list_commits",
    description:
      "Últimos commits de un repo (sha, mensaje, autor, fecha). Úsala cuando Luis pregunte qué hizo recientemente, qué actividad hay, qué cambios se hicieron en un repo.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        limit: {
          type: "number",
          description: "Máximo de commits a devolver (1-50, default 20)",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_read_file",
    description:
      "Lee el contenido de un archivo de un repo (README, package.json, configs, etc.). El contenido se trunca a 5KB para no inflar el contexto.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: {
          type: "string",
          description: "Ruta relativa del archivo en el repo (ej. 'README.md')",
        },
        branch: {
          type: "string",
          description: "Branch a leer (default: el default branch del repo)",
        },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "vault_list_secrets",
    description:
      "Lista los METADATOS de los secrets del vault del operador: nombre, provider, descripción, fecha de creación, último uso. NUNCA devuelve los valores plaintext — solo la lista. Úsala cuando Luis pregunte qué keys tiene guardadas, qué providers están configurados, qué hay en su Vault.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
}

export interface ToolExecutionResult {
  ok: boolean;
  /** JSON string body returned to Claude as tool_result content */
  content: string;
  /** Short human-readable summary surfaced to the chat UI */
  summary: string;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  let result: ToolExecutionResult;
  try {
    result = await dispatch(name, input, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = {
      ok: false,
      content: JSON.stringify({ error: message }),
      summary: `error: ${message.slice(0, 80)}`,
    };
  }
  const durationMs = Date.now() - startedAt;

  // Best-effort audit; never block the tool result on a failed insert.
  try {
    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${ctx.userId}, 'forge.tool.invoke', 'tool', ${name}, 0,
        ${JSON.stringify({
          tool: name,
          input: redactInput(input),
          ok: result.ok,
          summary: result.summary,
          duration_ms: durationMs,
          session_id: ctx.sessionId,
        })}::jsonb
      )
    `;
  } catch {
    /* audit failures must not break the chat turn */
  }
  return result;
}

async function dispatch(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  switch (name) {
    case "github_list_repos": {
      const max = clampNumber(input.max, 1, 200, 50);
      const repos = await listAllUserRepos({
        max,
        auditUserId: ctx.userId,
      });
      const slim = repos.map((r) => ({
        full_name: r.full_name,
        private: r.private,
        archived: r.archived,
        fork: r.fork,
        description: r.description,
        language: r.language,
        default_branch: r.default_branch,
        pushed_at: r.pushed_at,
        stargazers_count: r.stargazers_count,
        open_issues_count: r.open_issues_count,
        html_url: r.html_url,
      }));
      return {
        ok: true,
        content: JSON.stringify({ total: slim.length, repos: slim }),
        summary: `${slim.length} repos`,
      };
    }
    case "github_get_repo": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const detail = await getRepo(owner, repo, {
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(detail),
        summary: `${owner}/${repo}`,
      };
    }
    case "github_list_commits": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const limit = clampNumber(input.limit, 1, 50, 20);
      const commits = await listRecentCommits(owner, repo, {
        limit,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({ total: commits.length, commits }),
        summary: `${commits.length} commits de ${owner}/${repo}`,
      };
    }
    case "github_read_file": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const path = requireString(input.path, "path");
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : undefined;
      const file = await getFileContent(owner, repo, path, {
        branch,
        auditUserId: ctx.userId,
      });
      const MAX_BYTES = 5000;
      const truncated = file.content.length > MAX_BYTES;
      const slice = truncated ? file.content.slice(0, MAX_BYTES) : file.content;
      return {
        ok: true,
        content: JSON.stringify({
          path,
          size: file.size,
          sha: file.sha,
          truncated,
          content: slice,
        }),
        summary: `${path} (${file.size} B${truncated ? ", truncado a 5KB" : ""})`,
      };
    }
    case "vault_list_secrets": {
      const rows = (await sql`
        SELECT name, provider, description, created_at, last_used_at
        FROM operator_secrets
        ORDER BY name
      `) as Array<{
        name: string;
        provider: string | null;
        description: string | null;
        created_at: Date | string;
        last_used_at: Date | string | null;
      }>;
      return {
        ok: true,
        content: JSON.stringify({ total: rows.length, secrets: rows }),
        summary: `${rows.length} secrets`,
      };
    }
    default:
      return {
        ok: false,
        content: JSON.stringify({ error: `Unknown tool: ${name}` }),
        summary: `unknown tool: ${name}`,
      };
  }
}

function clampNumber(
  v: unknown,
  min: number,
  max: number,
  def: number,
): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

function requireString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`'${name}' must be a non-empty string`);
  }
  return v;
}

/**
 * Strip values that might leak secrets if logged. Tool inputs for the
 * Tier-1 read-only set are safe (owner/repo/path), but we keep this
 * defensive.
 */
function redactInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > 200) {
      safe[k] = `${v.slice(0, 80)}…(truncated)`;
    } else {
      safe[k] = v;
    }
  }
  return safe;
}
