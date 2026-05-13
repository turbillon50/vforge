/**
 * Tool registry for V (forge brain).
 *
 * Each tool is a small adapter over an existing capability (GitHub
 * via Octokit, Vault metadata via SQL, Vercel REST API, Name.com REST
 * API, knowledge_base SQL). All tools require an authenticated
 * operator user id passed through the execution context; each call
 * audits a `forge.tool.invoke` event so we can trace what V did
 * during a turn.
 *
 * Privilege rings:
 *   ring 0  read-only, auto-allowed
 *   ring 1  write side-effects in operator's own resources, allowed
 *   ring 2  destructive or expensive — would need confirmation (none yet)
 */
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { sql } from "@/lib/db/client";
import {
  listAllUserRepos,
  getRepo,
  listRecentCommits,
  getFileContent,
  createFile as ghCreateFile,
  updateFile as ghUpdateFile,
  deleteFile as ghDeleteFile,
  createBranch as ghCreateBranch,
  createPullRequest as ghCreatePullRequest,
} from "@/lib/github/client";
import {
  listProjects as vercelListProjects,
  getProject as vercelGetProject,
  createProject as vercelCreateProject,
  listDeployments as vercelListDeployments,
  getDeployment as vercelGetDeployment,
  triggerDeployment as vercelTriggerDeployment,
  setEnvVar as vercelSetEnvVar,
  addDomain as vercelAddDomain,
  getDomainConfig as vercelGetDomainConfig,
} from "@/lib/vercel/client";
import {
  listDomains as nameListDomains,
  getDomain as nameGetDomain,
  listRecords as nameListRecords,
  upsertRecord as nameUpsertRecord,
  deleteRecord as nameDeleteRecord,
} from "@/lib/namecom/client";
import { encryptOperatorSecret } from "@/lib/vault/operator-crypto";
import { invalidateSecretCache } from "@/lib/vault/get-secret";
import { routeFor } from "@/lib/forge/routing";
import { MODELS } from "@/lib/forge/models";

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

  // ─── GitHub write (Ring 1, escrituras en feature branches) ───────────
  // Por AGENTS.md §2: escribir a la rama 'main' es Ring 2 (destructivo
  // potencial sobre prod). El dispatcher rechaza writes a main salvo
  // que el caller pase allow_main=true explícito.
  {
    name: "github_create_file",
    description:
      "Crea un archivo nuevo en un repo (Ring 1). Falla 422 si el path ya existe — usa github_update_file en ese caso. El contenido se manda en plain UTF-8, la tool lo encodea a base64. Por seguridad RECHAZA escribir a la rama 'main' salvo que pases allow_main=true (Ring 2 — confirmar con Luis). Default branch = 'main' (lo cual obliga a especificar feature branch).",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "Ruta relativa (ej. 'docs/runbook.md')" },
        content: { type: "string", description: "Contenido en UTF-8 plain (sin base64)" },
        message: { type: "string", description: "Commit message (Conventional Commits preferred)" },
        branch: { type: "string", description: "Branch destino. Default 'main' (rechazado salvo allow_main)" },
        allow_main: {
          type: "boolean",
          description: "Set true SOLO si Luis confirmó escribir directo a main. Default false.",
        },
      },
      required: ["owner", "repo", "path", "content", "message"],
    },
  },
  {
    name: "github_update_file",
    description:
      "Actualiza un archivo existente en un repo (Ring 1). Si no le pasas sha, lo busca con un GET previo. Mismo guard contra rama 'main' que github_create_file.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string" },
        content: { type: "string", description: "Nuevo contenido completo en UTF-8 plain" },
        message: { type: "string", description: "Commit message" },
        sha: {
          type: "string",
          description: "Blob SHA del archivo. Si no se pasa, se resuelve automáticamente con un GET previo.",
        },
        branch: { type: "string" },
        allow_main: { type: "boolean" },
      },
      required: ["owner", "repo", "path", "content", "message"],
    },
  },
  {
    name: "github_delete_file",
    description:
      "Borra un archivo de un repo (Ring 2 — destructivo). Si no le pasas sha, lo resuelve automáticamente. Confirma con Luis antes; el dispatcher exige allow_main=true para borrar de main.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string" },
        message: { type: "string", description: "Commit message del delete" },
        sha: { type: "string", description: "Blob SHA. Opcional." },
        branch: { type: "string" },
        allow_main: { type: "boolean" },
      },
      required: ["owner", "repo", "path", "message"],
    },
  },
  {
    name: "github_create_branch",
    description:
      "Crea una rama nueva en un repo a partir de una rama existente (Ring 1). Resuelve el SHA del head de from_branch internamente. Convención vForge: nombrar como 'claude/<feature>-<id>' o 'forge/<feature>-<id>' (ver AGENTS.md §3).",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        branch: { type: "string", description: "Nombre de la rama nueva (ej. 'claude/add-spec-XYZ')" },
        from_branch: { type: "string", description: "Branch base. Default 'main'." },
      },
      required: ["owner", "repo", "branch"],
    },
  },
  {
    name: "github_create_pull_request",
    description:
      "Abre un Pull Request en un repo (Ring 1). Por default es DRAFT (Luis decide cuándo pasarlo a 'Ready for review' y mergear). El head debe ser una rama que ya exista; usa github_create_branch + github_create_file primero si construyes el cambio desde cero.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string", description: "Título del PR (<70 chars)" },
        body: { type: "string", description: "Markdown completo del PR description" },
        head: { type: "string", description: "Branch con los cambios" },
        base: { type: "string", description: "Branch destino. Default 'main'." },
        draft: { type: "boolean", description: "Default true. Pon false solo si Luis pide directo 'ready'." },
      },
      required: ["owner", "repo", "title", "head"],
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
  {
    name: "memory_save",
    description:
      "Guarda un dato concreto en TU memoria persistente para que esté disponible en futuras conversaciones (cualquier sesión, cualquier dispositivo). Úsala cuando Luis te diga 'recuerda que…', 'guarda esto', o cuando notes una preferencia/decisión/dato relevante que valga la pena retener (ej: 'el broker de Break es IBKR'). NO la uses para conversación trivial — solo para datos que aporten contexto en el futuro.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título corto del dato (3-8 palabras)",
        },
        content: {
          type: "string",
          description:
            "Contenido completo a recordar (1-2 párrafos máximo)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tags para clasificar la memoria (ej: ['preferencia', 'break', 'broker'])",
        },
      },
      required: ["title", "content"],
    },
  },

  // ─── Vercel ──────────────────────────────────────────────────────
  {
    name: "vercel_list_projects",
    description:
      "Lista todos los proyectos de Vercel del equipo del operador. Devuelve id, name, framework, rootDirectory, link al repo de GitHub. Úsala cuando Luis pregunte qué hay en Vercel, qué proyectos están desplegados, o quiera ver el inventario.",
    input_schema: {
      type: "object",
      properties: {
        max: { type: "number", description: "1-200, default 50" },
      },
    },
  },
  {
    name: "vercel_get_project",
    description:
      "Detalle completo de un proyecto de Vercel (id, framework, root, build/install/output commands, dominio, link a repo). Acepta id (prj_…) o slug.",
    input_schema: {
      type: "object",
      properties: {
        idOrSlug: { type: "string", description: "Project id (prj_…) o slug" },
      },
      required: ["idOrSlug"],
    },
  },
  {
    name: "vercel_create_project",
    description:
      "Crea un proyecto nuevo en Vercel, opcionalmente linkeado a un repo de GitHub. Útil cuando Luis quiere desplegar un repo nuevo (ej. 'V despliega turbillon50/break a Vercel'). El primer deploy se dispara automáticamente cuando hay gitRepository.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del proyecto en Vercel" },
        framework: {
          type: ["string", "null"],
          description: "Framework preset: 'vite', 'nextjs', 'remix', 'astro', etc. null para auto-detect.",
        },
        rootDirectory: {
          type: ["string", "null"],
          description: "Subdirectorio del repo donde está el proyecto (ej. 'apps/web')",
        },
        buildCommand: { type: ["string", "null"] },
        outputDirectory: { type: ["string", "null"] },
        installCommand: { type: ["string", "null"] },
        ghRepoFullName: {
          type: "string",
          description: "GitHub owner/repo (ej. 'turbillon50/rivones'). Si lo das, se linkea.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "vercel_list_deployments",
    description:
      "Lista los últimos deployments de un proyecto. Útil para diagnosticar fallos, ver qué deploy está vivo, o checar historial.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "prj_…" },
        limit: { type: "number", description: "1-50, default 10" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "vercel_get_deployment",
    description:
      "Detalle completo de un deployment (URL, estado, errores, build logs link). Acepta id (dpl_…) o URL del deploy.",
    input_schema: {
      type: "object",
      properties: {
        idOrUrl: { type: "string" },
      },
      required: ["idOrUrl"],
    },
  },
  {
    name: "vercel_trigger_deployment",
    description:
      "Dispara un deploy nuevo desde una branch específica de GitHub. Úsala para hacer 'redeploy' o promover una branch a producción.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", description: "Nombre del proyecto Vercel" },
        ghRepoFullName: { type: "string", description: "owner/repo de GitHub" },
        branch: { type: "string", description: "branch a desplegar (ej. 'main')" },
        target: {
          type: "string",
          enum: ["production", "preview", "staging"],
          description: "Default: production",
        },
      },
      required: ["projectId", "name", "ghRepoFullName", "branch"],
    },
  },
  {
    name: "vercel_set_env_var",
    description:
      "Crea o actualiza una variable de entorno en un proyecto Vercel. Útil para meter VITE_CLERK_PUBLISHABLE_KEY, DATABASE_URL, etc. después de crear un proyecto. SIEMPRE encrypted por default.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        key: { type: "string", description: "Nombre de la env var (ej. VITE_CLERK_PUBLISHABLE_KEY)" },
        value: { type: "string", description: "Valor (se cifra al guardar)" },
        target: {
          type: "array",
          items: { type: "string", enum: ["production", "preview", "development"] },
          description: "Entornos donde aplica. Default: ['production', 'preview']",
        },
      },
      required: ["projectId", "key", "value"],
    },
  },
  {
    name: "vercel_add_domain",
    description:
      "Agrega un dominio (apex o subdominio) a un proyecto Vercel. Úsala antes de configurar DNS — devuelve si Vercel ya lo verifica. Para www → apex usa redirect=apexDomain.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        domain: { type: "string", description: "ej. 'rivones.site' o 'www.rivones.site'" },
        redirect: {
          type: "string",
          description: "Si es subdominio que debe redirigir (ej. www→apex), pon el destino aquí",
        },
        redirectStatusCode: {
          type: "number",
          description: "301, 302, 307, 308. Default 308",
        },
      },
      required: ["projectId", "domain"],
    },
  },
  {
    name: "vercel_get_domain_config",
    description:
      "Pregunta a Vercel qué registros DNS espera ver para un dominio dado (A target, CNAME target, recommendedIPv4, recommendedCNAME, misconfigured flag). Úsala ANTES de crear records en Name.com.",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string" },
      },
      required: ["domain"],
    },
  },

  // ─── Name.com ────────────────────────────────────────────────────
  {
    name: "namecom_list_domains",
    description:
      "Lista los dominios del operador en Name.com (con expireDate, nameservers, etc.). Útil para ver qué dominios hay disponibles para apuntar a deploys.",
    input_schema: {
      type: "object",
      properties: {
        max: { type: "number", description: "1-500, default 200" },
      },
    },
  },
  {
    name: "namecom_get_domain",
    description:
      "Detalle de un dominio en Name.com: nameservers, contactos, expiración, autorenew, locked. Devuelve dato sensible (contactos) — solo úsala cuando Luis necesite el dato.",
    input_schema: {
      type: "object",
      properties: { domain: { type: "string" } },
      required: ["domain"],
    },
  },
  {
    name: "namecom_list_records",
    description:
      "Lista los registros DNS de un dominio en Name.com (id, host, type, answer, ttl). Úsala para auditar DNS o decidir qué upsertear.",
    input_schema: {
      type: "object",
      properties: { domain: { type: "string" } },
      required: ["domain"],
    },
  },
  {
    name: "namecom_upsert_record",
    description:
      "Crea o reemplaza un registro DNS en Name.com (idempotente: borra cualquier match previo de mismo host+type, luego crea el nuevo). Úsala para apuntar dominios a Vercel: A apex → 216.150.1.1, CNAME www → cname.vercel-dns.com.",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string" },
        host: {
          type: "string",
          description: "subdominio (ej. 'www', 'api'). Vacío o ausente = apex.",
        },
        type: {
          type: "string",
          enum: ["A", "AAAA", "CNAME", "TXT", "MX", "NS"],
        },
        answer: {
          type: "string",
          description: "El valor (IP, hostname, texto). CNAMEs aceptan con o sin punto final.",
        },
        ttl: { type: "number", description: "Default 300" },
        priority: {
          type: "number",
          description: "Solo para tipo MX",
        },
      },
      required: ["domain", "type", "answer"],
    },
  },
  {
    name: "namecom_delete_record",
    description:
      "Borra un registro DNS por id. Idempotente (no falla si ya no existe).",
    input_schema: {
      type: "object",
      properties: {
        domain: { type: "string" },
        recordId: { type: "number" },
      },
      required: ["domain", "recordId"],
    },
  },

  // ─── Per-project vault ────────────────────────────────────────────
  {
    name: "project_secret_save",
    description:
      "Guarda un secret cifrado en el vault del proyecto especificado. Úsala cuando Luis te diga 'pa rivones la VITE_CLERK_PUBLISHABLE_KEY es pk_live_…' o cuando le agregues una key específica de un proyecto. NO la uses para keys generales que aplican a todos los proyectos (esas van al vault general como ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, etc.). Si Luis no te dice explícitamente que es de un proyecto, pregunta el scope.",
    input_schema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Slug del proyecto (ej. 'rivones', 'vforge'). Debe existir en la tabla projects.",
        },
        name: {
          type: "string",
          description: "Nombre UPPER_SNAKE_CASE (ej. VITE_CLERK_PUBLISHABLE_KEY)",
        },
        value: { type: "string", description: "Valor en plaintext (se cifra al guardar)" },
        description: { type: "string" },
        provider: { type: "string", description: "Proveedor (ej. clerk, stripe, google-maps)" },
      },
      required: ["projectId", "name", "value"],
    },
  },
  {
    name: "project_secret_list",
    description:
      "Lista los METADATOS de los secrets de un proyecto (nombre, provider, descripción, fecha de creación). NUNCA devuelve plaintext. Úsala para auditar qué keys tiene un proyecto.",
    input_schema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
    },
  },
  {
    name: "project_secret_delete",
    description:
      "Borra un secret específico del vault de un proyecto. Ring 3 (destructivo) — confirma con Luis antes.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "projects_sync",
    description:
      "Cruza la lista de proyectos de Vercel con los repos de GitHub y los sincroniza a la tabla `projects` de vForge. Usa esta tool cuando Luis pregunte 'qué proyectos tengo' y la tabla esté vacía/desactualizada, o cuando agregue un proyecto nuevo. Idempotente: actualiza existentes, inserta los nuevos, no borra nada.",
    input_schema: { type: "object", properties: {} },
  },

  // ─── Model routing + cost observability (M3.5) ────────────────────
  {
    name: "model_recommend",
    description:
      "Pregunta al router qué modelo usar para una tarea. Devuelve { primary, cascade, reason }. Úsala antes de invocar openrouter_query para tareas side cuando quieras elegir modelo barato/balanceado consciente. Task kinds: 'chat-main', 'reasoning', 'code-edit', 'classification', 'summarization', 'extraction'. costPreference: 'cheapest' | 'balanced' | 'premium' | 'free-only' (default 'balanced').",
    input_schema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          enum: [
            "chat-main",
            "reasoning",
            "code-edit",
            "classification",
            "summarization",
            "extraction",
          ],
        },
        cost_preference: {
          type: "string",
          enum: ["cheapest", "balanced", "premium", "free-only"],
        },
      },
      required: ["task"],
    },
  },
  {
    name: "forge_cost_report",
    description:
      "Reporte de costos de V agregado en una ventana de tiempo. Útil cuando Luis pregunta cuánto vas gastando, qué modelo es más caro, o cuántas veces fallaste y hubo fallback. period: 'today' | '24h' | 'this_month' | 'last_7d' | 'last_30d' (default 'today').",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "24h", "this_month", "last_7d", "last_30d"],
        },
      },
    },
  },

  // ─── OpenRouter (ADR-009, M3) ─────────────────────────────────────
  {
    name: "openrouter_query",
    description:
      "Hace una consulta one-shot a un modelo accesible vía OpenRouter (Gemini, Mistral, Llama, Claude alternativo, etc.). Úsala cuando necesites una clasificación rápida y barata (ej. categorizar un repo, resumir un dump de logs, decidir si un archivo es código vs documentación) y no quieras gastar tokens de Anthropic en ello. NO la uses para conversación con Luis — esa va por el cerebro principal. Devuelve { content, model, tokensIn, tokensOut, costUsd }. Modelos sugeridos: 'google/gemini-2.5-flash' (más barato), 'anthropic/claude-haiku-4.5' (cuando el costo es secundario), 'meta-llama/llama-3.3-70b-instruct' (open-source).",
    input_schema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "Slug del modelo en OpenRouter (ej. 'google/gemini-2.5-flash'). Ver openrouter.ai/models.",
        },
        system: {
          type: "string",
          description: "System prompt opcional para el modelo.",
        },
        prompt: {
          type: "string",
          description: "El input del usuario (la pregunta o tarea concreta).",
        },
        max_tokens: {
          type: "number",
          description: "Tope de tokens de output. Default 512.",
        },
      },
      required: ["model", "prompt"],
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

    // ─── GitHub write ────────────────────────────────────────────────
    case "github_create_file": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const path = requireString(input.path, "path");
      const content = requireString(input.content, "content");
      const message = requireString(input.message, "message");
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : "main";
      const allowMain = input.allow_main === true;
      if (branch === "main" && !allowMain) {
        throw new Error(
          "Refusing to create file directly on 'main'. Crea una feature branch (github_create_branch) y commitea ahí, o pasa allow_main=true tras confirmar con Luis (Ring 2).",
        );
      }
      const result = await ghCreateFile(owner, repo, path, content, message, {
        branch,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `created ${owner}/${repo}#${branch}:${path}`,
      };
    }
    case "github_update_file": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const path = requireString(input.path, "path");
      const content = requireString(input.content, "content");
      const message = requireString(input.message, "message");
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : "main";
      const allowMain = input.allow_main === true;
      if (branch === "main" && !allowMain) {
        throw new Error(
          "Refusing to update file directly on 'main'. Pasa allow_main=true tras confirmar con Luis (Ring 2).",
        );
      }
      const result = await ghUpdateFile(owner, repo, path, content, message, {
        sha: typeof input.sha === "string" ? input.sha : undefined,
        branch,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `updated ${owner}/${repo}#${branch}:${path}`,
      };
    }
    case "github_delete_file": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const path = requireString(input.path, "path");
      const message = requireString(input.message, "message");
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : "main";
      const allowMain = input.allow_main === true;
      if (branch === "main" && !allowMain) {
        throw new Error(
          "Refusing to delete file from 'main'. Esta tool es Ring 2 (destructivo). Pasa allow_main=true SOLO tras confirmar con Luis.",
        );
      }
      const result = await ghDeleteFile(owner, repo, path, message, {
        sha: typeof input.sha === "string" ? input.sha : undefined,
        branch,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `deleted ${owner}/${repo}#${branch}:${path}`,
      };
    }
    case "github_create_branch": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const branch = requireString(input.branch, "branch");
      const fromBranch =
        typeof input.from_branch === "string" && input.from_branch.length > 0
          ? input.from_branch
          : "main";
      const result = await ghCreateBranch(owner, repo, branch, {
        fromBranch,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `branch ${owner}/${repo}#${branch} created from ${fromBranch}`,
      };
    }
    case "github_create_pull_request": {
      const owner = requireString(input.owner, "owner");
      const repo = requireString(input.repo, "repo");
      const title = requireString(input.title, "title");
      const head = requireString(input.head, "head");
      const result = await ghCreatePullRequest(
        owner,
        repo,
        {
          title,
          body: typeof input.body === "string" ? input.body : undefined,
          head,
          base: typeof input.base === "string" ? input.base : "main",
          draft: input.draft === false ? false : true,
        },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `PR #${result.number} ${result.draft ? "(draft)" : ""}: ${head} → ${result.base}`,
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
    case "memory_save": {
      const title = requireString(input.title, "title").slice(0, 200);
      const content = requireString(input.content, "content").slice(0, 4000);
      const rawTags = Array.isArray(input.tags) ? input.tags : [];
      const tags = ["memory", ...rawTags.map((t) => String(t).slice(0, 60))];
      const inserted = (await sql`
        INSERT INTO knowledge_base (kind, title, content, tags, source, created_by)
        VALUES (
          'note', ${title}, ${content},
          ${tags as unknown as string[]},
          ${`memory_save:${ctx.sessionId}`},
          ${ctx.userId}
        )
        RETURNING id
      `) as Array<{ id: string }>;
      return {
        ok: true,
        content: JSON.stringify({ saved: true, id: inserted[0]?.id, title }),
        summary: `memoria: ${title}`,
      };
    }

    // ─── Vercel ────────────────────────────────────────────────────
    case "vercel_list_projects": {
      const max = clampNumber(input.max, 1, 200, 50);
      const projects = await vercelListProjects({
        max,
        auditUserId: ctx.userId,
      });
      const slim = projects.map((p) => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        rootDirectory: p.rootDirectory,
        link: p.link,
        createdAt: p.createdAt,
      }));
      return {
        ok: true,
        content: JSON.stringify({ total: slim.length, projects: slim }),
        summary: `${slim.length} proyectos vercel`,
      };
    }
    case "vercel_get_project": {
      const idOrSlug = requireString(input.idOrSlug, "idOrSlug");
      const project = await vercelGetProject(idOrSlug, {
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(project),
        summary: `proyecto vercel: ${project.name}`,
      };
    }
    case "vercel_create_project": {
      const name = requireString(input.name, "name");
      const ghRepoFullName =
        typeof input.ghRepoFullName === "string"
          ? input.ghRepoFullName
          : undefined;
      const project = await vercelCreateProject(
        {
          name,
          framework: nullableString(input.framework),
          rootDirectory: nullableString(input.rootDirectory),
          buildCommand: nullableString(input.buildCommand),
          outputDirectory: nullableString(input.outputDirectory),
          installCommand: nullableString(input.installCommand),
          gitRepository: ghRepoFullName
            ? { type: "github", repo: ghRepoFullName }
            : undefined,
        },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify({
          id: project.id,
          name: project.name,
          framework: project.framework,
          rootDirectory: project.rootDirectory,
        }),
        summary: `proyecto vercel creado: ${project.name}`,
      };
    }
    case "vercel_list_deployments": {
      const projectId = requireString(input.projectId, "projectId");
      const limit = clampNumber(input.limit, 1, 50, 10);
      const deployments = await vercelListDeployments(projectId, {
        limit,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({ total: deployments.length, deployments }),
        summary: `${deployments.length} deploys`,
      };
    }
    case "vercel_get_deployment": {
      const idOrUrl = requireString(input.idOrUrl, "idOrUrl");
      const deployment = await vercelGetDeployment(idOrUrl, {
        auditUserId: ctx.userId,
      });
      const slim = {
        id: deployment.id ?? deployment.uid,
        url: deployment.url,
        readyState: deployment.readyState,
        target: deployment.target,
        meta: deployment.meta,
        errorMessage: deployment.errorMessage,
      };
      return {
        ok: true,
        content: JSON.stringify(slim),
        summary: `deploy ${slim.readyState ?? "?"}: ${slim.url ?? slim.id}`,
      };
    }
    case "vercel_trigger_deployment": {
      const result = await vercelTriggerDeployment(
        {
          projectId: requireString(input.projectId, "projectId"),
          name: requireString(input.name, "name"),
          ghRepoFullName: requireString(input.ghRepoFullName, "ghRepoFullName"),
          branch: requireString(input.branch, "branch"),
          target:
            typeof input.target === "string"
              ? (input.target as "production" | "preview" | "staging")
              : "production",
        },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `deploy disparado: ${result.url}`,
      };
    }
    case "vercel_set_env_var": {
      const target = Array.isArray(input.target)
        ? (input.target as string[])
        : ["production", "preview"];
      const result = await vercelSetEnvVar(
        requireString(input.projectId, "projectId"),
        {
          key: requireString(input.key, "key"),
          value: requireString(input.value, "value"),
          target: target.filter((t) =>
            ["production", "preview", "development"].includes(t),
          ) as Array<"production" | "preview" | "development">,
        },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `env ${input.key} → ${target.join("+")}`,
      };
    }
    case "vercel_add_domain": {
      const result = await vercelAddDomain(
        requireString(input.projectId, "projectId"),
        requireString(input.domain, "domain"),
        {
          redirect:
            typeof input.redirect === "string" ? input.redirect : undefined,
          redirectStatusCode:
            typeof input.redirectStatusCode === "number"
              ? input.redirectStatusCode
              : undefined,
          auditUserId: ctx.userId,
        },
      );
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `dominio agregado: ${result.name}${result.verified ? " ✓" : " (pending)"}`,
      };
    }
    case "vercel_get_domain_config": {
      const config = await vercelGetDomainConfig(
        requireString(input.domain, "domain"),
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(config),
        summary: `DNS config ${input.domain}: misconfig=${config.misconfigured}`,
      };
    }

    // ─── Name.com ──────────────────────────────────────────────────
    case "namecom_list_domains": {
      const max = clampNumber(input.max, 1, 500, 200);
      const domains = await nameListDomains({
        max,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          total: domains.length,
          domains: domains.map((d) => ({
            domainName: d.domainName,
            expireDate: d.expireDate,
            autorenewEnabled: d.autorenewEnabled,
            locked: d.locked,
          })),
        }),
        summary: `${domains.length} dominios name.com`,
      };
    }
    case "namecom_get_domain": {
      const domain = await nameGetDomain(
        requireString(input.domain, "domain"),
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(domain),
        summary: `domain ${domain.domainName}`,
      };
    }
    case "namecom_list_records": {
      const records = await nameListRecords(
        requireString(input.domain, "domain"),
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify({ total: records.length, records }),
        summary: `${records.length} DNS records`,
      };
    }
    case "namecom_upsert_record": {
      const created = await nameUpsertRecord(
        requireString(input.domain, "domain"),
        {
          host: typeof input.host === "string" ? input.host : "",
          type: requireString(input.type, "type") as
            | "A"
            | "AAAA"
            | "CNAME"
            | "TXT"
            | "MX"
            | "NS",
          answer: requireString(input.answer, "answer"),
          ttl: typeof input.ttl === "number" ? input.ttl : undefined,
          priority:
            typeof input.priority === "number" ? input.priority : undefined,
        },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(created),
        summary: `${created.type} ${created.fqdn} → ${created.answer}`,
      };
    }
    case "namecom_delete_record": {
      const result = await nameDeleteRecord(
        requireString(input.domain, "domain"),
        Number(input.recordId),
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify(result),
        summary: `record ${input.recordId} borrado`,
      };
    }

    // ─── Per-project vault ─────────────────────────────────────────
    case "project_secret_save": {
      const projectId = requireString(input.projectId, "projectId");
      const name = requireString(input.name, "name");
      const value = requireString(input.value, "value");
      if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(name)) {
        throw new Error(
          "name must be UPPER_SNAKE_CASE ([A-Z][A-Z0-9_]*, max 64)",
        );
      }
      const projExists = (await sql`SELECT id FROM projects WHERE id = ${projectId}`) as Array<{ id: string }>;
      if (projExists.length === 0) {
        throw new Error(`project '${projectId}' not in vForge catalog (run projects_sync first?)`);
      }
      const enc = encryptOperatorSecret(value);
      const ciphertextHex = enc.ciphertext.toString("hex");
      const ivHex = enc.iv.toString("hex");
      const authTagHex = enc.authTag.toString("hex");
      const description =
        typeof input.description === "string" ? input.description : null;
      const provider =
        typeof input.provider === "string" ? input.provider : null;
      const upsert = (await sql`
        INSERT INTO project_secrets (
          project_id, name, description, provider,
          ciphertext, iv, auth_tag
        ) VALUES (
          ${projectId}, ${name}, ${description}, ${provider},
          decode(${ciphertextHex}, 'hex'),
          decode(${ivHex}, 'hex'),
          decode(${authTagHex}, 'hex')
        )
        ON CONFLICT (project_id, name) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, project_secrets.description),
          provider = COALESCE(EXCLUDED.provider, project_secrets.provider),
          ciphertext = EXCLUDED.ciphertext,
          iv = EXCLUDED.iv,
          auth_tag = EXCLUDED.auth_tag,
          rotated_at = now()
        RETURNING id, rotated_at
      `) as Array<{ id: string; rotated_at: string | null }>;
      invalidateSecretCache(name, projectId);
      return {
        ok: true,
        content: JSON.stringify({
          id: upsert[0].id,
          project_id: projectId,
          name,
          rotated: !!upsert[0].rotated_at,
        }),
        summary: `secret ${name} guardado en ${projectId}`,
      };
    }
    case "project_secret_list": {
      const projectId = requireString(input.projectId, "projectId");
      const rows = (await sql`
        SELECT name, description, provider,
               created_at, rotated_at, last_used_at
          FROM project_secrets
         WHERE project_id = ${projectId}
         ORDER BY name
      `) as Array<{
        name: string;
        description: string | null;
        provider: string | null;
        created_at: Date | string;
        rotated_at: Date | string | null;
        last_used_at: Date | string | null;
      }>;
      return {
        ok: true,
        content: JSON.stringify({
          project_id: projectId,
          total: rows.length,
          secrets: rows,
        }),
        summary: `${rows.length} secrets en ${projectId}`,
      };
    }
    case "project_secret_delete": {
      const projectId = requireString(input.projectId, "projectId");
      const name = requireString(input.name, "name");
      const rows = (await sql`
        DELETE FROM project_secrets
         WHERE project_id = ${projectId} AND name = ${name}
        RETURNING id, name
      `) as Array<{ id: string; name: string }>;
      if (rows.length === 0) {
        return {
          ok: false,
          content: JSON.stringify({ error: "not found" }),
          summary: `${name} no existía en ${projectId}`,
        };
      }
      invalidateSecretCache(name, projectId);
      return {
        ok: true,
        content: JSON.stringify({
          deleted: rows[0],
          project_id: projectId,
        }),
        summary: `${name} borrado de ${projectId}`,
      };
    }
    case "projects_sync": {
      const [vps, ghs] = await Promise.all([
        vercelListProjects({ auditUserId: ctx.userId, max: 200 }).catch(
          () => [] as ReturnType<typeof vercelListProjects> extends Promise<infer R> ? R : never,
        ),
        listAllUserRepos({ auditUserId: ctx.userId, max: 200 }).catch(
          () => [],
        ),
      ]);

      type Aggregated = {
        id: string;
        name: string;
        description: string | null;
        github_repo: string | null;
        github_private: boolean | null;
        github_default_branch: string | null;
        github_language: string | null;
        github_url: string | null;
        vercel_project_id: string | null;
        vercel_url: string | null;
      };
      const byKey = new Map<string, Aggregated>();
      for (const repo of (Array.isArray(ghs) ? ghs : [])) {
        byKey.set(repo.full_name.toLowerCase(), {
          id: slugify(repo.name),
          name: repo.name,
          description: repo.description,
          github_repo: repo.full_name,
          github_private: repo.private,
          github_default_branch: repo.default_branch,
          github_language: repo.language,
          github_url: repo.html_url,
          vercel_project_id: null,
          vercel_url: null,
        });
      }
      for (const project of (Array.isArray(vps) ? vps : [])) {
        const link = project.link as
          | { type?: string; org?: string; repo?: string }
          | null
          | undefined;
        const fullName = link?.org && link?.repo ? `${link.org}/${link.repo}` : null;
        const key = fullName ? fullName.toLowerCase() : `vercel:${project.name}`;
        const prev = byKey.get(key);
        const merged: Aggregated = prev
          ? {
              ...prev,
              vercel_project_id: project.id,
              vercel_url: prev.vercel_url ?? `https://${project.name}.vercel.app`,
            }
          : {
              id: slugify(project.name),
              name: project.name,
              description: null,
              github_repo: null,
              github_private: null,
              github_default_branch: null,
              github_language: null,
              github_url: null,
              vercel_project_id: project.id,
              vercel_url: `https://${project.name}.vercel.app`,
            };
        byKey.set(key, merged);
      }
      let inserted = 0;
      let updated = 0;
      for (const agg of byKey.values()) {
        const existing = (await sql`SELECT id FROM projects WHERE id = ${agg.id}`) as Array<{ id: string }>;
        if (existing.length > 0) {
          await sql`
            UPDATE projects SET
              name = COALESCE(${agg.name}, name),
              description = COALESCE(${agg.description}, description),
              github_repo = COALESCE(${agg.github_repo}, github_repo),
              github_private = COALESCE(${agg.github_private}, github_private),
              github_default_branch = COALESCE(${agg.github_default_branch}, github_default_branch),
              github_language = COALESCE(${agg.github_language}, github_language),
              github_url = COALESCE(${agg.github_url}, github_url),
              vercel_project_id = COALESCE(${agg.vercel_project_id}, vercel_project_id),
              vercel_url = COALESCE(${agg.vercel_url}, vercel_url)
            WHERE id = ${agg.id}
          `;
          updated += 1;
        } else {
          await sql`
            INSERT INTO projects (
              id, name, description,
              github_repo, github_private, github_default_branch,
              github_language, github_url,
              vercel_project_id, vercel_url
            ) VALUES (
              ${agg.id}, ${agg.name}, ${agg.description},
              ${agg.github_repo}, ${agg.github_private}, ${agg.github_default_branch},
              ${agg.github_language}, ${agg.github_url},
              ${agg.vercel_project_id}, ${agg.vercel_url}
            )
          `;
          inserted += 1;
        }
      }
      return {
        ok: true,
        content: JSON.stringify({
          inserted,
          updated,
          total: byKey.size,
        }),
        summary: `proyectos sync: +${inserted} nuevos, ${updated} actualizados`,
      };
    }

    case "model_recommend": {
      const task = requireString(input.task, "task") as
        | "chat-main"
        | "reasoning"
        | "code-edit"
        | "classification"
        | "summarization"
        | "extraction";
      const pref =
        typeof input.cost_preference === "string"
          ? (input.cost_preference as
              | "cheapest"
              | "balanced"
              | "premium"
              | "free-only")
          : "balanced";
      const decision = routeFor(task, { costPreference: pref });
      const primary = MODELS[decision.primary];
      return {
        ok: true,
        content: JSON.stringify({
          primary: decision.primary,
          cascade: decision.cascade,
          reason: decision.reason,
          primary_info: primary
            ? {
                label: primary.label,
                tier: primary.tier,
                kind: primary.kind,
                cost_in_per_M_usd: primary.costInPer1M,
                cost_out_per_M_usd: primary.costOutPer1M,
                context_window: primary.contextWindow,
                supports_tools: primary.supportsTools,
              }
            : null,
        }),
        summary: `route ${task}/${pref} → ${decision.primary}`,
      };
    }

    case "forge_cost_report": {
      const period =
        typeof input.period === "string" ? input.period : "today";
      const now = new Date();
      let since: Date;
      switch (period) {
        case "24h":
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "this_month":
          since = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
          break;
        case "last_7d":
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "last_30d":
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "today":
        default:
          since = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          );
      }
      const sinceIso = since.toISOString();
      const totals = (await sql`
        SELECT
          COALESCE(SUM(cost_usd), 0)::numeric(12,6) AS total_usd,
          COUNT(*)::int AS turns,
          COALESCE(SUM(tokens_in), 0)::int AS tokens_in,
          COALESCE(SUM(tokens_out), 0)::int AS tokens_out
        FROM conversations
        WHERE role = 'assistant' AND created_at >= ${sinceIso}
      `) as Array<{
        total_usd: string;
        turns: number;
        tokens_in: number;
        tokens_out: number;
      }>;
      const byModel = (await sql`
        SELECT
          COALESCE(model, '(unknown)') AS model,
          COUNT(*)::int AS turns,
          COALESCE(SUM(cost_usd), 0)::numeric(12,6) AS cost_usd
        FROM conversations
        WHERE role = 'assistant' AND created_at >= ${sinceIso}
        GROUP BY model
        ORDER BY cost_usd DESC
        LIMIT 8
      `) as Array<{ model: string; turns: number; cost_usd: string }>;
      const fallbackRows = (await sql`
        SELECT COUNT(*)::int AS n
        FROM audit_events
        WHERE action = 'forge.chat.turn'
          AND created_at >= ${sinceIso}
          AND jsonb_array_length(COALESCE(payload->'fallbacks', '[]'::jsonb)) > 0
      `) as Array<{ n: number }>;
      return {
        ok: true,
        content: JSON.stringify({
          period,
          since: sinceIso,
          total_usd: Number(totals[0].total_usd),
          total_turns: totals[0].turns,
          total_tokens_in: totals[0].tokens_in,
          total_tokens_out: totals[0].tokens_out,
          by_model: byModel.map((m) => ({
            model: m.model,
            turns: m.turns,
            cost_usd: Number(m.cost_usd),
          })),
          fallback_events: fallbackRows[0].n,
        }),
        summary: `${period}: $${Number(totals[0].total_usd).toFixed(4)} / ${totals[0].turns} turns / ${fallbackRows[0].n} fallbacks`,
      };
    }

    case "openrouter_query": {
      const model = requireString(input.model, "model");
      const prompt = requireString(input.prompt, "prompt");
      const system =
        typeof input.system === "string" && input.system.length > 0
          ? input.system
          : null;
      const maxTokens = clampNumber(input.max_tokens, 1, 4096, 512);

      const { openRouterAdapter } = await import("./adapters/openrouter");
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });

      const result = await openRouterAdapter.execute(
        { model, messages, maxTokens },
        {
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          signal: AbortSignal.timeout(60_000),
          vault: {
            async getOperatorSecret(name) {
              const { getOperatorSecret } = await import("@/lib/vault/get-secret");
              return getOperatorSecret(name, { auditUserId: ctx.userId });
            },
            async getProjectSecret(projectId, name) {
              const { getOperatorSecret } = await import("@/lib/vault/get-secret");
              return getOperatorSecret(name, { auditUserId: ctx.userId, projectId });
            },
          },
        },
      );

      return {
        ok: true,
        content: JSON.stringify({
          content: result.content,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
          finishReason: result.finishReason,
        }),
        summary: `${result.model}: ${result.tokensIn}+${result.tokensOut} tok ($${result.costUsd.toFixed(6)})`,
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

function nullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.length === 0 ? null : v;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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
