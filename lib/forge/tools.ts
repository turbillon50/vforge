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
  listDirectory as ghListDirectory,
  searchCode as ghSearchCode,
  listPullRequests as ghListPullRequests,
  dispatchWorkflow as ghDispatchWorkflow,
  getWorkflowRun as ghGetWorkflowRun,
  getWorkflowRunLogs as ghGetWorkflowRunLogs,
  listRecentWorkflowRuns as ghListRecentWorkflowRuns,
  createRepo as ghCreateRepo,
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
import { invalidateSecretCache, getOperatorSecret } from "@/lib/vault/get-secret";
import { routeFor } from "@/lib/forge/routing";
import { MODELS } from "@/lib/forge/models";
import { listAgentConfig, setModelForTask } from "@/lib/forge/agent-config";
import { callVServer } from "@/lib/forge/v-server";
import {
  getBridgeStatus,
  approvePending,
  rejectPending,
  dispatchBridgeTask,
} from "@/lib/forge/bridge";
import {
  listAllOpenRouterModels,
  getOpenRouterModel,
  searchOpenRouterModels,
} from "@/lib/forge/openrouter-catalog";
import {
  getPlan as integrationGetPlan,
  setItemStatus as integrationSetItemStatus,
  refreshConnectedStatus as integrationRefreshStatus,
  type ItemStatus as IntegrationItemStatus,
} from "@/lib/integrations/plan-db";

/**
 * Archivos core de V que NUNCA pueden ser modificados vía sus propias tools.
 * Solo Claude Code (en terminal, con PR revisado por Luis) puede tocarlos.
 *
 * Esto blinda contra:
 *  - alucinaciones de V modificándose el cerebro de forma irreparable
 *  - sugerencias mal intencionadas inyectadas via prompt
 *  - bucles de auto-mejora sin gate humano
 *
 * El bloqueo se aplica SIEMPRE, incluso con confirmed=true. La única forma
 * de modificarlos es vía git/PR fuera del agente.
 */
const PROTECTED_CORE_REPO = { owner: "turbillon50", repo: "vforge" } as const;
const PROTECTED_CORE_PATHS = new Set<string>([
  "lib/forge/tools.ts",
  "lib/forge/system-prompt.ts",
  "lib/forge/gemini-adapter.ts",
  "lib/forge/v-server.ts",
  "lib/forge/routing.ts",
  "lib/forge/model-config.ts",
  "lib/forge/agent-config.ts",
  "lib/forge/openrouter-catalog.ts",
  "lib/forge/models.ts",
]);

function isProtectedCoreFile(
  owner: string,
  repo: string,
  path: string,
): boolean {
  if (owner !== PROTECTED_CORE_REPO.owner) return false;
  if (repo !== PROTECTED_CORE_REPO.repo) return false;
  // Normaliza path por si llega con leading slash.
  const norm = path.replace(/^\/+/, "");
  return PROTECTED_CORE_PATHS.has(norm);
}

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
      "Lee el contenido de un archivo de un repo (README, package.json, configs, código fuente). El contenido se trunca a 100KB para no inflar el contexto. Si Luis no especifica owner, asume 'turbillon50'.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50' si no se especifica." },
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
      required: ["repo", "path"],
    },
  },
  {
    name: "github_list_directory",
    description:
      "Lista los archivos y carpetas dentro de un path de un repo SIN descargar el contenido. Devuelve { name, type (file|dir|submodule|symlink), size, path, sha } para cada entrada. Úsala para explorar la estructura de un repo, o antes de leer múltiples archivos para no adivinar paths. Si Luis no especifica owner, asume 'turbillon50'. path='/' o vacío significa la raíz del repo.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50' si no se especifica." },
        repo: { type: "string" },
        path: {
          type: "string",
          description: "Ruta de la carpeta. Default '/' (raíz).",
        },
        branch: {
          type: "string",
          description: "Branch a listar (default: el default branch del repo).",
        },
      },
      required: ["repo"],
    },
  },
  {
    name: "github_search_code",
    description:
      "Busca texto/código dentro de los archivos de un repo. Devuelve { path, repo, score, fragments } con hasta 3 fragmentos de texto alrededor de cada match. Útil cuando Luis pregunta 'dónde se usa X' o 'qué archivos mencionan Y' sin saber el path exacto. Rate limit GitHub: 30 req/min. Si Luis no especifica owner, asume 'turbillon50'.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50' si no se especifica." },
        repo: { type: "string" },
        query: {
          type: "string",
          description: "Texto a buscar. Sintaxis de GitHub code search (ej. 'language:ts useEffect').",
        },
        per_page: {
          type: "number",
          description: "Máximo de hits a devolver (1-50, default 20).",
        },
      },
      required: ["repo", "query"],
    },
  },
  {
    name: "github_list_pull_requests",
    description:
      "Lista los Pull Requests de un repo. Devuelve { number, title, state, draft, head, base, user, created_at, updated_at, url } por PR. Útil para ver qué PRs hay abiertos, quiénes los autoraron, y si están en draft. Si Luis no especifica owner, asume 'turbillon50'.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50' si no se especifica." },
        repo: { type: "string" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Estado de los PRs. Default 'open'.",
        },
        per_page: {
          type: "number",
          description: "Máximo de PRs a devolver (1-100, default 30).",
        },
      },
      required: ["repo"],
    },
  },

  // ─── GitHub write (Ring 1, escrituras en feature branches) ───────────
  // Por AGENTS.md §2: escribir a la rama 'main' es Ring 2 (destructivo
  // potencial sobre prod). El dispatcher rechaza writes a main salvo
  // que el caller pase allow_main=true explícito.
  {
    name: "github_create_repo",
    description:
      "Crea un repositorio nuevo en la cuenta de GitHub del operador (turbillon50). Por default: privado, con README inicial (auto_init=true). Devuelve { full_name, url, clone_url, default_branch }. Úsala al inicio de un proyecto nuevo antes de crear archivos con github_create_file.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nombre del repo (slug, ej. 'mi-proyecto'). Sin espacios.",
        },
        description: {
          type: "string",
          description: "Descripción corta del repo.",
        },
        private: {
          type: "boolean",
          description: "true = privado (default), false = público.",
        },
        auto_init: {
          type: "boolean",
          description: "Inicializar con README vacío (default true). Necesario para poder crear archivos de inmediato.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "github_create_file",
    description:
      "Crea un archivo nuevo en un repo. Falla 422 si el path ya existe — usa github_update_file en ese caso. El contenido se manda en plain UTF-8, la tool lo encodea a base64. Para escribir a 'main' (Ring 2): PRIMERO pide confirmación a Luis en texto, LUEGO llama con confirmed=true. Default branch = 'main' (obliga a especificar feature branch si no quieres main).",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "Ruta relativa (ej. 'docs/runbook.md')" },
        content: { type: "string", description: "Contenido en UTF-8 plain (sin base64)" },
        message: { type: "string", description: "Commit message (Conventional Commits preferred)" },
        branch: { type: "string", description: "Branch destino. Default 'main'. Si es main, requiere confirmed=true." },
        confirmed: {
          type: "boolean",
          description: "REQUERIDO si branch='main'. Set true SOLO después de que Luis confirmó explícitamente escribir a main. Ring 2 — V debe solicitar confirmación primero.",
        },
      },
      required: ["owner", "repo", "path", "content", "message"],
    },
  },
  {
    name: "github_update_file",
    description:
      "Actualiza un archivo existente en un repo. Si no le pasas sha, lo busca con un GET previo. Para escribir a 'main' (Ring 2): PRIMERO pide confirmación a Luis en texto, LUEGO llama con confirmed=true.",
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
        branch: { type: "string", description: "Branch destino. Default 'main'. Si es main, requiere confirmed=true." },
        confirmed: {
          type: "boolean",
          description: "REQUERIDO si branch='main'. Set true SOLO después de que Luis confirmó explícitamente escribir a main. Ring 2.",
        },
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
              confirmed: { type: "boolean", description: "DEBE ser true (gate). Primero confirma con Luis, luego rellama con confirmed=true." },
required: ["owner", "repo", "path", "message"],
    },
  },
  {
    name: "github_revert_commit",
    description:
      "Revierte un commit específico en una rama (Ring 2 — destructivo). Úsala cuando github_run_check falla en main después de github_create_file/github_update_file. Crea un nuevo commit de revert. Devuelve el SHA del nuevo revert commit.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50' si no se especifica." },
        repo: { type: "string" },
        sha: {
          type: "string",
          description: "SHA del commit a revertir (ej. resultado de github_create_file/update_file)",
        },
        branch: {
          type: "string",
          description: "Rama en donde está el commit. Default 'main'.",
        },
        message: {
          type: "string",
          description: "Mensaje del revert commit. Default: 'Revert <sha>'.",
        },
      },
              confirmed: { type: "boolean", description: "DEBE ser true (gate). Primero confirma con Luis, luego rellama con confirmed=true." },
required: ["repo", "sha"],
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
  {
    name: "memory_search",
    description:
      "LEE y busca en TU propia memoria. Es tu mente — consúltala antes de decir 'no recuerdo'. Busca semánticamente en tus recuerdos vectoriales (semantic_memory, embeddings de todo tu historial con Luis), tus datos guardados (v_user_memory, knowledge_base) y conversaciones pasadas. Úsala cuando Luis pregunte '¿recuerdas…?', '¿qué hablamos de…?', '¿qué sabes de…?', o cuando necesites contexto histórico para responder bien. Devuelve los fragmentos más relevantes con su score.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Qué buscar en tu memoria, en lenguaje natural." },
        limit: { type: "number", description: "Cuántos recuerdos traer (1-15). Default 8." },
      },
      required: ["query"],
    },
  },
  {
    name: "db_query",
    description:
      "Lee TU base de datos de producción (Neon) con una consulta SELECT. Es TU sistema — puedes inspeccionar tus tablas: skills, knowledge_base, agent_config, agent_directives, projects, conversations, v_user_memory, semantic_memory, forge_cost, client/pagos, etc. SOLO lectura: solo se permiten sentencias SELECT (cualquier INSERT/UPDATE/DELETE/DROP se rechaza). Úsala cuando necesites datos exactos de tus tablas (cuántas skills tienes, qué proyectos hay, cuánto se gastó, etc.) en vez de adivinar. Devuelve hasta 100 filas.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "Una sola sentencia SELECT. Sin punto y coma final, sin múltiples statements." },
      },
      required: ["sql"],
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

  // ─── Self-config (V reconfigura sus propios modelos) ─────────────
  {
    name: "agent_config_get",
    description:
      "Devuelve la configuración actual de modelos por tipo de tarea. Lo que V está usando ahora mismo para chat-main, code-edit, classification, etc. Úsala cuando Luis pregunte 'qué modelo estás usando' o antes de proponer un cambio para saber el estado actual.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "agent_config_set",
    description:
      "Cambia el modelo que V usará para un tipo de tarea específico. Aplica al siguiente turno SIN redeploy. Úsala cuando Luis te diga 'usa Haiku para chat', 'cambia clasificación a Gemini Flash', 'para código usa Sonnet'. task_kind debe ser uno de: chat-main, reasoning, code-edit, classification, summarization, extraction. model debe ser un slug válido de OpenRouter (ej. 'anthropic/claude-haiku-4.5', 'google/gemini-2.5-flash').",
    input_schema: {
      type: "object",
      properties: {
        task_kind: {
          type: "string",
          enum: [
            "chat-main",
            "reasoning",
            "code-edit",
            "classification",
            "summarization",
            "extraction",
          ],
          description: "Tipo de tarea para la cual cambiar el modelo.",
        },
        model: {
          type: "string",
          description:
            "Slug de OpenRouter (ej. 'anthropic/claude-haiku-4.5', 'google/gemini-2.5-flash', 'anthropic/claude-sonnet-4.6').",
        },
      },
      required: ["task_kind", "model"],
    },
  },
  {
    name: "model_set_default",
    description:
      "Atajo para cambiar el modelo principal del chat (task_kind='chat-main'). Equivalente a agent_config_set({task_kind:'chat-main', model: <slug>}). Úsala cuando Luis dice 'V, a partir de ahora usa X para todo'.",
    input_schema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description:
            "Slug de OpenRouter del nuevo modelo principal.",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "skill_create",
    description:
      "Crea una nueva habilidad reusable en el catálogo de skills. Úsala cuando Luis te describe un flujo que vale la pena recordar como skill ('cuando te pida X, sigue Y, Z, W') o cuando V identifica un patrón frecuente que merece skill propia. Después de crear, skill_search la encontrará y skill_install la cargará.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Slug único kebab-case (ej. 'deploy-monorepo-vercel').",
        },
        name: {
          type: "string",
          description: "Nombre corto descriptivo (ej. 'Deploy de monorepo a Vercel').",
        },
        description: {
          type: "string",
          description: "1-2 líneas de para qué sirve y cuándo activarla.",
        },
        system_prompt: {
          type: "string",
          description:
            "Fragment de instrucciones que V leerá al instalar la skill. Debe incluir el flujo paso a paso y reglas.",
        },
        required_tools: {
          type: "array",
          items: { type: "string" },
          description:
            "Tools que la skill típicamente usa (ej. ['github_create_branch','github_create_file']).",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags para búsqueda (ej. ['deploy', 'vercel', 'monorepo']).",
        },
        ring_max: {
          type: "number",
          description: "Anillo máximo de privilegio. Default 1.",
        },
      },
      required: ["id", "name", "description", "system_prompt"],
    },
  },
  {
    name: "skill_list",
    description:
      "Lista todas las skills disponibles en el catalogo (instaladas y no instaladas). Devuelve id, name, description, tags, source, installed_at. Usala cuando Luis pregunte 'que skills tienes' o 'que sabes hacer'.",
    input_schema: {
      type: "object",
      properties: {
        installed_only: {
          type: "boolean",
          description: "Si true, solo muestra skills instaladas. Default false.",
        },
      },
    },
  },
  {
    name: "skill_search",
    description:
      "Busca skills por nombre, descripción o tags. Útil para ver si ya existe una skill antes de crear una nueva. Devuelve matches ordenados por relevancia.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Texto a buscar en nombre, descripción o tags.",
        },
        limit: {
          type: "number",
          description: "Máximo de resultados. Default 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "skill_install",
    description:
      "Activa una skill — marca installed_at=now() para que buildSystemPrompt() la inyecte en el contexto de V en el próximo turno. Úsala cuando Luis diga 'activa skill X' o cuando V quiera cargar una skill disponible.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID (slug) de la skill a instalar, ej. 'repo-rescue'.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "skill_uninstall",
    description:
      "Desactiva una skill — pone installed_at=NULL para que deje de inyectarse en el contexto. La skill sigue en el catálogo y se puede re-instalar.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID (slug) de la skill a desinstalar.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "self_audit",
    description:
      "Auto-diagnóstico de V. Cruza tres fuentes de verdad y devuelve un reporte: 1) skills declaradas en la BD, 2) docs en docs/skills/, 3) tools cableadas en lib/forge/tools.ts. Para cada skill etiqueta: 'real' (BD + doc + todas sus tools existen), 'partial' (falta doc o falta alguna tool) o 'hallucinated' (ninguna tool requerida existe). Úsala cuando Luis pregunte 'qué es real y qué no', 'diagnostícate' o cuando V quiera verificar su propio estado antes de prometer algo. Internamente llama GET /api/v-self-audit.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "directive_list",
    description:
      "Lista las directivas actuales de V (mantra, directive, preference). El mantra son las directivas LOCKED que definen la identidad core de V y no se pueden modificar. Usala cuando Luis pregunte 'cuales son tus reglas' o cuando V quiera ver su configuracion.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["mantra", "directive", "preference"],
          description: "Filtra por tipo de directiva. Sin filtro devuelve todas.",
        },
      },
    },
  },
  {
    name: "directive_add",
    description:
      "Agrega una nueva directiva a V. IMPORTANTE: No puedes crear mantras, solo directives o preferences. Usala cuando Luis diga 'recuerda que siempre quiero X' o cuando V quiera programarse una nueva regla.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["directive", "preference"],
          description: "Tipo: 'directive' = regla operacional, 'preference' = preferencia suave.",
        },
        title: {
          type: "string",
          description: "Titulo corto descriptivo.",
        },
        content: {
          type: "string",
          description: "Contenido completo de la directiva.",
        },
        priority: {
          type: "number",
          description: "Prioridad (0=maxima, 100=normal). Default 100.",
        },
      },
      required: ["kind", "title", "content"],
    },
  },

  {
    name: "directive_update",
    description:
      "Actualiza el título o contenido de una directiva existente (directive o preference). NUNCA puedes modificar mantras (locked=true). Úsala para refinar una regla que ya creaste.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID de la directiva a actualizar.",
        },
        title: {
          type: "string",
          description: "Nuevo título (opcional).",
        },
        content: {
          type: "string",
          description: "Nuevo contenido (opcional).",
        },
        priority: {
          type: "number",
          description: "Nueva prioridad (opcional).",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "directive_delete",
    description:
      "Elimina una directiva (directive o preference). NUNCA puedes eliminar mantras (locked=true). El trigger de la DB rechazará intentos de borrar mantras.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID de la directiva a eliminar.",
        },
      },
      required: ["id"],
    },
  },

  // ─── Sandbox vía GitHub Actions (M5 alt) ────────────────────────
  {
    name: "github_run_check",
    description:
      "Dispara una validación on-demand (type-check + lint + build) en GitHub Actions contra la rama indicada. Úsala DESPUÉS de hacer cambios en un repo y ANTES de abrir un PR, para validar que el código compila. Devuelve { run_id, url } — guarda el run_id y consulta el estado con github_get_check_status. El workflow es .github/workflows/v-sandbox.yml (debe existir en el repo). Si Luis no especifica owner, asume 'turbillon50'.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50'." },
        repo: { type: "string" },
        branch: {
          type: "string",
          description: "Rama a validar (ej. 'claude/fix-X').",
        },
        command: {
          type: "string",
          description: "Comando npm opcional (ej. 'npm run test'). Default: tc+lint+build.",
        },
        reason: {
          type: "string",
          description: "Una línea explicando por qué validas (queda en audit).",
        },
      },
      required: ["repo", "branch"],
    },
  },
  {
    name: "github_get_check_status",
    description:
      "Devuelve el estado de una corrida de GitHub Actions. status: queued|in_progress|completed. conclusion (solo si completed): success|failure|cancelled|skipped|timed_out. Úsala en loop con un pequeño delay para esperar el resultado de github_run_check.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50'." },
        repo: { type: "string" },
        run_id: { type: "number" },
      },
      required: ["repo", "run_id"],
    },
  },
  {
    name: "github_get_check_logs",
    description:
      "Devuelve los logs de una corrida fallida de GitHub Actions (truncados a 100KB). Úsala SOLO cuando github_get_check_status devuelve conclusion=failure para entender qué falló. Para corridas exitosas no es necesario.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50'." },
        repo: { type: "string" },
        run_id: { type: "number" },
      },
      required: ["repo", "run_id"],
    },
  },
  {
    name: "github_list_check_runs",
    description:
      "Lista las últimas corridas del workflow v-sandbox en un repo, opcionalmente filtradas por rama. Útil para ver historia de validaciones o encontrar el último run de una rama.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Default 'turbillon50'." },
        repo: { type: "string" },
        branch: { type: "string", description: "Filtrar por rama (opcional)." },
        per_page: { type: "number", description: "1-30, default 10." },
      },
      required: ["repo"],
    },
  },

  // ─── OpenRouter catálogo en vivo (365+ modelos) ───────────────────
  {
    name: "openrouter_list_models",
    description:
      "Lista modelos disponibles en OpenRouter en vivo (cache 15 min). Útil para descubrir qué modelos hay sin estar limitada al registry hardcoded de 9. Devuelve { id, name, provider, context_length, pricing_per_1m, supports_tools, is_free } por modelo. Default: 50 modelos. Pasa provider='anthropic' o 'google' para filtrar.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Cuántos modelos devolver. 0 = todos (~365). Default 50.",
        },
        provider: {
          type: "string",
          description: "Filtrar por provider (ej. 'anthropic', 'google', 'meta-llama', 'openai', 'deepseek', 'mistralai').",
        },
      },
    },
  },
  {
    name: "openrouter_get_model",
    description:
      "Detalle completo de un modelo de OpenRouter por slug. Devuelve descripción, context_length, pricing exacto, supports_tools, is_free. Úsala antes de agent_config_set para confirmar que el slug existe y ver costos reales.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "OpenRouter slug (ej. 'deepseek/deepseek-chat', 'anthropic/claude-haiku-4.5').",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "openrouter_search_models",
    description:
      "Busca modelos en OpenRouter por filtros: free, supports_tools, min_context, max_cost_per_1m_in, max_cost_per_1m_out, provider, query (substring). Ordenado por más barato primero. Úsala para encontrar 'el más barato con tools y context > 100K' o 'todos los free de Google'.",
    input_schema: {
      type: "object",
      properties: {
        free: { type: "boolean", description: "true = solo gratis; false = solo de paga; omit = todos." },
        supports_tools: { type: "boolean", description: "true = solo modelos que soportan tool calling." },
        min_context: { type: "number", description: "Tokens mínimos de contexto (ej. 100000)." },
        max_cost_per_1m_in: { type: "number", description: "USD máximo por 1M tokens de input." },
        max_cost_per_1m_out: { type: "number", description: "USD máximo por 1M tokens de output." },
        provider: { type: "string", description: "Filtrar por provider." },
        query: { type: "string", description: "Substring en id o name (ej. 'haiku', 'flash')." },
        limit: { type: "number", description: "Default 25." },
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

  // ─── Vercel Deployment Diagnostics (Ring 0, auto-recovery) ────────────
  {
    name: "vercel_get_deployment_logs",
    description:
      "Obtiene los últimos 100 logs/eventos de un deployment de Vercel. Filtra errores primero. Úsala después de un deployment fallido para diagnosticar qué salió mal (build errors, runtime errors, timeout, etc.). Devuelve lista de eventos con timestamp, level, message.",
    input_schema: {
      type: "object",
      properties: {
        deploymentId: {
          type: "string",
          description: "ID del deployment de Vercel (ej. 'dpl_XXX')",
        },
      },
      required: ["deploymentId"],
    },
  },
  {
    name: "vercel_get_deployment_status",
    description:
      "Obtiene el estado actual de un deployment: state (READY/BUILDING/ERROR), url, errorMessage, buildingAt, readyAt. Ring 0, auto-allowed. Usa esto para verificar si un deployment está vivo o bloqueado.",
    input_schema: {
      type: "object",
      properties: {
        deploymentId: {
          type: "string",
          description: "ID del deployment",
        },
      },
      required: ["deploymentId"],
    },
  },
  {
    name: "vercel_check_url",
    description:
      "Verifica que una URL deployada esté respondiendo correctamente. Hace fetch() y devuelve: HTTP status, headers importantes, primeros 500 caracteres del body. Úsala para validar que el deployment llegó a producción.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL completa del deployment (ej. 'https://project.vercel.app')",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "vercel_get_deployment_by_project",
    description:
      "Obtiene el deployment más reciente de un proyecto específico por nombre. Ring 0, auto-allowed. Devuelve deployment details para poder usar con otros tools de diagnóstico.",
    input_schema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Nombre del proyecto en Vercel (ej. 'my-app')",
        },
      },
      required: ["projectName"],
    },
  },
  {
    name: "vercel_diagnose_deployment",
    description:
      "Tool compuesta: ejecuta diagnóstico COMPLETO de un deployment. Llama en secuencia: status → logs → URL check. Devuelve reporte ejecutivo: '✅ OK' o '❌ PROBLEMA: [X], LOG ERROR: [Y], SUGERENCIA: [Z]'. FORGE y TANIT usan esto automáticamente cuando aparece error en deploy. Ring 0.",
    input_schema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Nombre del proyecto en Vercel",
        },
      },
      required: ["projectName"],
    },
  },
  {
    name: "http_request",
    description:
      "Haz un request HTTP GET, POST, PUT, DELETE a cualquier URL. Devuelve status, headers y body. Úsala para llamar APIs, webhooks, endpoints propios, etc. V la usa para auto-repararse (POST a /api/v-full-repair), llamar APIs externas, etc. Ring 0, auto-allowed.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL completa (ej. 'https://vforge.site/api/v-full-repair')",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "Método HTTP. Default: GET",
        },
        headers: {
          type: "object",
          description: "Headers adicionales (ej. {'Authorization': 'Bearer token'})",
        },
        body: {
          type: "string",
          description: "Body como string (JSON, etc.)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "remote_execution",
    description:
      "Ejecuta código Python o JavaScript en el servidor Hetzner de V (178.105.135.26) y devuelve stdout, stderr y returncode. Úsala cuando necesites probar un snippet, validar lógica, consultar una API externa, procesar datos, o verificar que algo funciona antes de meterlo a un repo. NO ejecutes código destructivo aquí — el servidor es de Luis. Timeout 30s.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Código a ejecutar. Para Python usa sintaxis Python 3; para Node usa sintaxis JS moderna." },
        language: { type: "string", enum: ["python", "node"], description: "Lenguaje del código. Default 'python'." },
      },
      required: ["code"],
    },
  },
  {
    name: "browser_control",
    description:
      "Controla un navegador headless (Playwright) en el servidor de V. Acciones: goto, click, type, screenshot, get_html, get_text, describe_element, execute_script. Soporta wait_for_selector para esperar elementos antes de actuar. Úsala para verificar UI de deploys, web scraping/OSINT, automatización de formularios. (Nota: endpoint /browser puede no estar implementado todavía en api.py — si 404, repórtalo a Luis para que el servidor lo agregue.)",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["goto", "click", "type", "screenshot", "get_html", "get_text", "describe_element", "execute_script"], description: "Qué hacer en el navegador." },
        url: { type: "string", description: "URL a navegar (requerido si action='goto')" },
        selector: { type: "string", description: "Selector CSS o XPath del elemento" },
        text_to_type: { type: "string", description: "Texto a escribir (requerido si action='type')" },
        script: { type: "string", description: "JavaScript a ejecutar (requerido si action='execute_script')" },
        wait_for_selector: { type: "string", description: "Esperar a que este selector aparezca antes de la acción (hasta 10s)" },
        return_screenshot_base64: { type: "boolean", description: "Si true, también devuelve screenshot base64. Default false." },
        wait_ms: { type: "number", description: "Esperar N ms tras la acción (default 500)" },
      },
      required: ["action"],
    },
  },
  {
    name: "image_generation",
    description:
      "Genera una imagen vía OpenRouter (Gemini Image / FLUX / Recraft) en el servidor de V. Default: google/gemini-3.1-flash-image-preview ('Nano Banana') con generación + edición + multi-turn. ~$0.014/imagen 1024x1024 contra el saldo OpenRouter de Luis. Úsala para hero images, ilustraciones, logos preliminares. (Nota: endpoint /generate-image puede no estar implementado todavía en api.py — si 404, repórtalo a Luis.)",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Descripción de la imagen, preferentemente en inglés. Sé específico: estilo, composición, colores, iluminación, mood." },
        size: { type: "string", enum: ["512x512", "768x768", "1024x1024"], description: "Tamaño de salida. Default 1024x1024." },
        negative_prompt: { type: "string", description: "Qué evitar (ej. 'blurry, watermark'). Se inyecta como 'Avoid: ...'." },
        model: { type: "string", description: "ID del modelo OpenRouter. Default: google/gemini-3.1-flash-image-preview. Alternativas: black-forest-labs/flux.2-pro, sourceful/riverflow-v2-standard-preview." },
      },
      required: ["prompt"],
    },
  },
  {
    name: "ssh_command_executor",
    description:
      "Ejecuta un comando shell en un servidor remoto vía SSH. Esencial para gestión de infraestructura, deploy de microservicios, automatización de tareas en Linux. Soporta password o llave privada, sudo opcional, timeout configurable. Las credenciales NUNCA se loguean (audit las redacta). RING 2 — destructivo: un comando mal puesto puede tumbar un servidor. SIEMPRE PIDE CONFIRMACIÓN A LUIS antes de ejecutar — primero describe el comando y por qué, espera el 'sí', LUEGO rellama con confirmed=true. (Nota: endpoint /ssh-execute puede no estar implementado todavía en api.py — si 404, repórtalo a Luis.)",
    input_schema: {
      type: "object",
      properties: {
        host: { type: "string", description: "IP o hostname del servidor remoto" },
        command: { type: "string", description: "Comando shell a ejecutar" },
        username: { type: "string", description: "Usuario SSH. Default 'root'." },
        password: { type: "string", description: "Password SSH (alternativa a private_key). Se redacta del audit log." },
        private_key: { type: "string", description: "Contenido de llave privada SSH en PEM. Se redacta del audit log." },
        sudo: { type: "boolean", description: "Anteponer 'sudo' al comando. Default false." },
        port: { type: "number", description: "Puerto SSH. Default 22." },
        timeout_seconds: { type: "number", description: "Timeout en segundos (1-300). Default 60." },
        confirmed: { type: "boolean", description: "DEBE ser true para que el comando se ejecute (gate ring 2). Primero describe el comando a Luis en texto, espera 'sí' explícito, LUEGO rellama con confirmed=true." },
      },
      required: ["host", "command"],
    },
  },
  {
    name: "claude_code",
    description:
      "Orquesta a Claude Code (el binario agente de codificación) en el servidor de V para tareas grandes y multi-paso: refactors extensos, montar features completas, depurar un repo entero, correr migraciones, escribir suites de pruebas. V delega aquí lo PESADO mientras ella sigue conversando con Luis. Pasa una instrucción clara y, si aplica, el directorio del repo (cwd) ya clonado en el servidor. Devuelve el output de la sesión de Claude Code. RING 2 — puede escribir/ejecutar en el servidor: para acciones destructivas (borrar, deploy, push a main) describe primero a Luis y espera su 'sí'; para trabajo en sandbox/branch puedes proceder. (Nota: endpoint /claude en api.py — si 404, repórtalo a Luis para redesplegar el v-server.)",
    input_schema: {
      type: "object",
      properties: {
        instruction: { type: "string", description: "La tarea para Claude Code, clara y autocontenida. Ej: 'En el repo clonado en /tmp/foo, agrega autenticación Clerk a todas las rutas /app y corre el typecheck'." },
        cwd: { type: "string", description: "Directorio de trabajo en el servidor (un repo ya clonado). Opcional; default el workspace de V." },
        timeout_seconds: { type: "number", description: "Timeout en segundos (1-600). Default 300, porque Claude Code puede tardar." },
      },
      required: ["instruction"],
    },
  },
  {
    name: "design_version",
    description:
      "Guarda una versión de diseño generada por V para un build (modo v0-sin-v0). Crea el build si no existe (por project_name del operador) y agrega la versión con sus archivos. Devuelve versionId, n y preview_url para que el chat muestre la VersionCard con preview inline. Úsala cada vez que generes/iteres el código de una app o UI pedida por Luis.",
    input_schema: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "Nombre del proyecto/app (estable entre iteraciones para versionar el mismo build)" },
        summary: { type: "string", description: "Resumen corto de qué tiene esta versión (1 línea)" },
        files: {
          type: "array",
          description: "Archivos de la versión",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "Ruta relativa (ej. index.html, app/page.tsx)" },
              content: { type: "string", description: "Contenido completo del archivo" },
            },
            required: ["path", "content"],
          },
        },
      },
      required: ["project_name", "summary", "files"],
    },
  },
  {
    name: "taste_remember",
    description:
      "Guarda una preferencia estética/de gusto durable de Luis en la memoria de cuenta (v_user_memory). Úsala cuando Luis exprese qué le gusta o no de un diseño (colores, tipografía, densidad, mood) para que las próximas versiones nazcan con su gusto.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Clave corta (ej. estetica.colores, estetica.tipografia)" },
        value: { type: "string", description: "La preferencia, en una frase" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "hub_pending_status",
    description:
      "Consulta el puente del hub de agentes (Hetzner): pendientes de aprobación QA, estado de agentes y cola del pipeline. Úsala cuando Luis pregunte qué hay pendiente en la operación o antes de aprobar/rechazar.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "hub_approve",
    description:
      "Aprueba un pendiente del hub de agentes por id (lo viste antes con hub_pending_status). Devuelve la respuesta del hub.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Id del pendiente a aprobar." },
      },
      required: ["id"],
    },
  },
  {
    name: "hub_reject",
    description:
      "Rechaza un pendiente del hub de agentes por id, con motivo en español claro para el agente que lo produjo.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Id del pendiente a rechazar." },
        motivo: { type: "string", description: "Motivo del rechazo." },
      },
      required: ["id", "motivo"],
    },
  },
  {
    name: "hub_dispatch_task",
    description:
      "Ordena una tarea nueva a un agente del hub (abogado, logistica, qa, valentina). Úsala cuando Luis pida delegar trabajo a la operación.",
    input_schema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          enum: ["abogado", "logistica", "qa", "valentina"],
          description: "Agente destino.",
        },
        task: { type: "string", description: "Descripción de la tarea." },
        context: { type: "string", description: "Contexto adicional (opcional)." },
        projectId: { type: "string", description: "Id de proyecto (opcional)." },
      },
      required: ["agent", "task"],
    },
  },
  {
    name: "integration_plan_get",
    description:
      "Devuelve el plan de conexiones del usuario actual (los servicios recomendados para su app) con su progreso (cuántos lleva conectados). Úsala para decirle cosas como \"vas 2 de 5\" o saber qué le falta conectar.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "integration_plan_update",
    description:
      "Actualiza el estado de un servicio en el plan de conexiones del usuario (pending, connected o skipped). Úsala cuando el usuario confirme que ya conectó o que quiere saltar un servicio.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Id del servicio (github, vercel, domain, stripe, neon, resend, clerk, twilio, google_maps).",
        },
        status: {
          type: "string",
          enum: ["pending", "connected", "skipped"],
          description: "Nuevo estado del servicio.",
        },
      },
      required: ["serviceId", "status"],
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

type AutonomyMode = "observe" | "build" | "operate" | "root";

const AUTONOMY_RANK: Record<AutonomyMode, number> = {
  observe: 0,
  build: 1,
  operate: 2,
  root: 3,
};

function getAutonomyMode(): AutonomyMode {
  const raw = (process.env.VFORGE_AUTONOMY_MODE ?? "build").toLowerCase();
  if (raw === "observe" || raw === "build" || raw === "operate" || raw === "root") {
    return raw;
  }
  return "build";
}

function requiredModeForTool(name: string): AutonomyMode {
  if (
    name.includes("delete") ||
    name.includes("revert") ||
    name === "ssh_command_executor" ||
    name === "claude_code" ||
    name === "remote_execution"
  ) {
    return "root";
  }
  if (
    name.startsWith("vercel_") ||
    name.startsWith("namecom_") ||
    name.startsWith("project_secret_") ||
    name === "http_request" ||
    name === "browser_control" ||
    name === "image_generation" ||
    name === "github_run_check" ||
    name.startsWith("hub_")
  ) {
    return "operate";
  }
  if (
    name.startsWith("github_create") ||
    name.startsWith("github_update") ||
    name.startsWith("skill_") ||
    name.startsWith("directive_") ||
    name === "memory_save" ||
    name === "agent_config_set"
  ) {
    return "build";
  }
  return "observe";
}

function checkAutonomy(name: string): ToolExecutionResult | null {
  const current = getAutonomyMode();
  const required = requiredModeForTool(name);
  if (AUTONOMY_RANK[current] >= AUTONOMY_RANK[required]) return null;
  return {
    ok: false,
    content: JSON.stringify({
      error: "capability blocked by VFORGE_AUTONOMY_MODE",
      tool: name,
      currentMode: current,
      requiredMode: required,
      modes: ["observe", "build", "operate", "root"],
      instruction:
        "Set VFORGE_AUTONOMY_MODE to the required mode in the server environment, then retry.",
    }),
    summary: `${name} requiere modo ${required} (actual: ${current})`,
  };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  let result: ToolExecutionResult;
  try {
    result = checkAutonomy(name) ?? await dispatch(name, input, ctx);
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
      const owner = ownerOrDefault(input.owner);
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
      const owner = ownerOrDefault(input.owner);
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
      const owner = ownerOrDefault(input.owner);
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
      const MAX_BYTES = 100_000;
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
        summary: `${path} (${file.size} B${truncated ? ", truncado a 100KB" : ""})`,
      };
    }
    case "github_list_directory": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const path =
        typeof input.path === "string" && input.path.length > 0
          ? input.path
          : "/";
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : undefined;
      const entries = await ghListDirectory(owner, repo, path, {
        branch,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          owner,
          repo,
          path,
          total: entries.length,
          entries,
        }),
        summary: `${entries.length} en ${owner}/${repo}:${path}`,
      };
    }
    case "github_search_code": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const query = requireString(input.query, "query");
      const perPage = clampNumber(input.per_page, 1, 50, 20);
      const hits = await ghSearchCode(owner, repo, query, {
        perPage,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          owner,
          repo,
          query,
          total: hits.length,
          hits,
        }),
        summary: `${hits.length} hits para "${query.slice(0, 30)}" en ${owner}/${repo}`,
      };
    }
    case "github_list_pull_requests": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const state =
        input.state === "closed" || input.state === "all"
          ? (input.state as "closed" | "all")
          : "open";
      const perPage = clampNumber(input.per_page, 1, 100, 30);
      const prs = await ghListPullRequests(owner, repo, {
        state,
        perPage,
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          owner,
          repo,
          state,
          total: prs.length,
          pull_requests: prs,
        }),
        summary: `${prs.length} PRs ${state} en ${owner}/${repo}`,
      };
    }

    // ─── GitHub write ────────────────────────────────────────────────
    case "github_create_repo": {
      try {
        const name = requireString(input.name, "name");
        const result = await ghCreateRepo(
          {
            name,
            description: typeof input.description === "string" ? input.description : undefined,
            private: typeof input.private === "boolean" ? input.private : true,
            auto_init: typeof input.auto_init === "boolean" ? input.auto_init : true,
          },
          { auditUserId: ctx.userId },
        );
        return {
          ok: true,
          content: JSON.stringify(result),
          summary: `repo creado: ${result.full_name} (${result.private ? "privado" : "público"})`,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({
            error: errorMsg,
            type: err instanceof Error ? err.constructor.name : "Unknown",
            failureCode: errorMsg.includes("already exists") ? "REPO_EXISTS" : "CREATE_FAILED",
          }),
          summary: `❌ github_create_repo falló: ${errorMsg.split('\n')[0]}`,
        };
      }
    }

    case "github_create_file": {
      try {
        const owner = ownerOrDefault(input.owner);
        const repo = requireString(input.repo, "repo");
        const path = requireString(input.path, "path");
        const content = requireString(input.content, "content");
        const message = requireString(input.message, "message");
        const branch =
          typeof input.branch === "string" && input.branch.length > 0
            ? input.branch
            : "main";
        const confirmed = input.confirmed === true;

        if (isProtectedCoreFile(owner, repo, path)) {
          return {
            ok: false,
            content: JSON.stringify({
              error: `${path} es un archivo core protegido — V no puede modificarlo por sus propios medios`,
              instruction: "V: este archivo define tu identidad/cerebro. Si necesitas un cambio, descríbelo a Luis en texto. Él construirá el cambio con Claude Code y lo mergea como PR revisado.",
              failureCode: "PROTECTED_CORE_FILE",
              path,
            }),
            summary: `bloqueado: ${path} es core protegido`,
          };
        }

        if (branch === "main" && !confirmed) {
          return {
            ok: false,
            content: JSON.stringify({
              error: "Ring 2: escribir a main requiere confirmación explícita de Luis primero",
              instruction: "V: '¿Luis, confirmas que escriba este archivo a main?' Espera confirmación, LUEGO rellamá la tool con confirmed=true.",
              failureCode: "RING2_NEEDS_CONFIRMATION",
            }),
            summary: `❌ ${owner}/${repo}#main:${path} — requiere confirmación de Luis`,
          };
        }

        const result = await ghCreateFile(owner, repo, path, content, message, {
          branch,
          auditUserId: ctx.userId,
        });

        const summary = branch === "main"
          ? `✅ creado ${owner}/${repo}#${branch}:${path} — ⚠️ DEBES ejecutar github_run_check(repo='${repo}', branch='main', reason='validate after create'). Si falla, usa github_revert_commit(sha='${result.commit_sha}').`
          : `created ${owner}/${repo}#${branch}:${path}`;

        return {
          ok: true,
          content: JSON.stringify({
            ...result,
            _validation_note: branch === "main"
              ? `Ring 2 write to main. Commit SHA: ${result.commit_sha}. NEXT: github_run_check then github_revert_commit if needed.`
              : undefined,
          }),
          summary,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({
            error: errorMsg,
            type: err instanceof Error ? err.constructor.name : "Unknown",
          }),
          summary: `❌ github_create_file falló: ${errorMsg.split('\n')[0]}`,
        };
      }
    }
    case "github_update_file": {
      try {
        const owner = ownerOrDefault(input.owner);
        const repo = requireString(input.repo, "repo");
        const path = requireString(input.path, "path");
        const content = requireString(input.content, "content");
        const message = requireString(input.message, "message");
        const branch =
          typeof input.branch === "string" && input.branch.length > 0
            ? input.branch
            : "main";
        const confirmed = input.confirmed === true;

        if (isProtectedCoreFile(owner, repo, path)) {
          return {
            ok: false,
            content: JSON.stringify({
              error: `${path} es un archivo core protegido — V no puede modificarlo por sus propios medios`,
              instruction: "V: este archivo define tu identidad/cerebro. Si necesitas un cambio, descríbelo a Luis en texto. Él construirá el cambio con Claude Code y lo mergea como PR revisado.",
              failureCode: "PROTECTED_CORE_FILE",
              path,
            }),
            summary: `bloqueado: ${path} es core protegido`,
          };
        }

        if (branch === "main" && !confirmed) {
          return {
            ok: false,
            content: JSON.stringify({
              error: "Ring 2: escribir a main requiere confirmación explícita de Luis primero",
              instruction: "V: '¿Luis, confirmas que actualice este archivo en main?' Espera confirmación, LUEGO rellamá la tool con confirmed=true.",
              failureCode: "RING2_NEEDS_CONFIRMATION",
            }),
            summary: `❌ ${owner}/${repo}#main:${path} — requiere confirmación de Luis`,
          };
        }

        const result = await ghUpdateFile(owner, repo, path, content, message, {
          sha: typeof input.sha === "string" ? input.sha : undefined,
          branch,
          auditUserId: ctx.userId,
        });

        const summary = branch === "main"
          ? `✅ actualizado ${owner}/${repo}#${branch}:${path} — ⚠️ DEBES ejecutar github_run_check(repo='${repo}', branch='main', reason='validate after update'). Si falla, usa github_revert_commit(sha='${result.commit_sha}').`
          : `updated ${owner}/${repo}#${branch}:${path}`;

        return {
          ok: true,
          content: JSON.stringify({
            ...result,
            _validation_note: branch === "main"
              ? `Ring 2 write to main. Commit SHA: ${result.commit_sha}. NEXT: github_run_check then github_revert_commit if needed.`
              : undefined,
          }),
          summary,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({
            error: errorMsg,
            type: err instanceof Error ? err.constructor.name : "Unknown",
          }),
          summary: `❌ github_update_file falló: ${errorMsg.split('\n')[0]}`,
        };
      }
    }
    case "github_delete_file": {
      if (input.confirmed !== true) {
        return { ok: false, content: JSON.stringify({ needs_confirmation: true, instruction: "V: describe a Luis qué vas a borrar/revertir y por qué; espera su 'sí'; LUEGO rellama con confirmed=true." }), summary: "requiere confirmación de Luis (acción irreversible)" };
      }
      const owner = ownerOrDefault(input.owner);
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

    case "github_revert_commit": {
      if (input.confirmed !== true) {
        return { ok: false, content: JSON.stringify({ needs_confirmation: true, instruction: "V: describe a Luis qué vas a borrar/revertir y por qué; espera su 'sí'; LUEGO rellama con confirmed=true." }), summary: "requiere confirmación de Luis (acción irreversible)" };
      }
      try {
        const owner = ownerOrDefault(input.owner);
        const repo = requireString(input.repo, "repo");
        const sha = requireString(input.sha, "sha");
        const branch = typeof input.branch === "string" ? input.branch : "main";
        const message = typeof input.message === "string" ? input.message : `Revert ${sha.slice(0, 7)}`;

        // Import the Octokit client directly
        const { getGithubClient } = await import("@/lib/github/client");
        const octokit = await getGithubClient({ auditUserId: ctx.userId });

        const revertResult = await octokit.request(
          "POST /repos/{owner}/{repo}/commits/{commit_sha}/reverts",
          {
            owner,
            repo,
            commit_sha: sha,
            message,
          }
        );

        return {
          ok: true,
          content: JSON.stringify({
            reverted_sha: revertResult.data.sha,
            reverted_message: revertResult.data.commit.message,
            revert_commit_url: revertResult.data.html_url,
          }),
          summary: `✅ revertido ${owner}/${repo}#${branch}: ${sha.slice(0, 7)} → ${revertResult.data.sha.slice(0, 7)}`,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({
            error: errorMsg,
            type: err instanceof Error ? err.constructor.name : "Unknown",
            failureCode: errorMsg.includes("not found") ? "COMMIT_NOT_FOUND" : "REVERT_FAILED",
          }),
          summary: `❌ github_revert_commit falló: ${errorMsg.split('\n')[0]}`,
        };
      }
    }

    case "github_create_branch": {
      const owner = ownerOrDefault(input.owner);
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
      const owner = ownerOrDefault(input.owner);
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

    case "memory_search": {
      const query = requireString(input.query, "query");
      const limit = typeof input.limit === "number" ? Math.max(1, Math.min(15, input.limit)) : 8;
      const { recall } = await import("@/lib/forge/semantic-recall");
      const hits = await recall(query, limit).catch(() => [] as Array<{ content: string; score: number }>);
      // Además, coincidencias léxicas en knowledge_base (datos guardados).
      let kb: Array<{ title: string; content: string }> = [];
      try {
        kb = (await sql`
          SELECT title, content FROM knowledge_base
          WHERE content ILIKE ${"%" + query.slice(0, 80) + "%"} OR title ILIKE ${"%" + query.slice(0, 80) + "%"}
          ORDER BY created_at DESC LIMIT 5
        `) as Array<{ title: string; content: string }>;
      } catch { /* ignore */ }
      return {
        ok: true,
        content: JSON.stringify({
          semantic: hits.map((h) => ({ score: Math.round(h.score * 1000) / 1000, content: h.content.slice(0, 600) })),
          saved: kb.map((k) => ({ title: k.title, content: k.content.slice(0, 400) })),
        }),
        summary: `memoria: ${hits.length} recuerdos + ${kb.length} datos`,
      };
    }
    case "db_query": {
      const raw = requireString(input.sql, "sql").trim().replace(/;+\s*$/, "");
      const lowered = raw.toLowerCase();
      // Solo lectura: debe empezar con SELECT o WITH, y no contener verbos de escritura.
      const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum)\b/;
      if (!/^(select|with)\b/.test(lowered) || forbidden.test(lowered)) {
        return { ok: false, content: JSON.stringify({ error: "Solo se permiten consultas SELECT de lectura." }), summary: "db_query rechazada (no es SELECT)" };
      }
      try {
        const capped = /\blimit\b/.test(lowered) ? raw : `${raw} LIMIT 100`;
        const { queryAll } = await import("@/lib/db/client");
        const rows = await queryAll<Record<string, unknown>>(capped);
        return { ok: true, content: JSON.stringify({ rows: rows.slice(0, 100), count: rows.length }), summary: `db_query: ${rows.length} filas` };
      } catch (e) {
        return { ok: false, content: JSON.stringify({ error: String(e).slice(0, 300) }), summary: "db_query error" };
      }
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

    // ─── Vercel Deployment Diagnostics ────────────────────────────
    case "vercel_get_deployment_logs": {
      try {
        const deploymentId = requireString(input.deploymentId, "deploymentId");
        const response = await fetch(`https://api.vercel.com/v1/deployments/${deploymentId}/events`, {
          headers: {
            "Authorization": `Bearer ${await getOperatorSecret("VERCEL_TOKEN", { auditUserId: ctx.userId })}`,
          },
        });
        const events = (await response.json()) as Array<{
          id: string;
          timestamp: number;
          type: string;
          text: string;
          payload?: Record<string, unknown>;
        }>;

        // Filtra errores primero
        const errors = events.filter((e) => e.type === "error" || e.text.toLowerCase().includes("error"));
        const sorted = errors.length > 0 ? errors : events;
        const last100 = sorted.slice(0, 100);

        return {
          ok: true,
          content: JSON.stringify({
            deploymentId,
            totalEvents: events.length,
            errorCount: errors.length,
            lastLogs: last100.map((e) => ({
              timestamp: new Date(e.timestamp).toISOString(),
              type: e.type,
              text: e.text,
            })),
          }),
          summary: `Deployment ${deploymentId}: ${errors.length} errores en ${events.length} eventos totales`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({ error: msg }),
          summary: `❌ Error obteniendo logs: ${msg.split('\n')[0]}`,
        };
      }
    }

    case "vercel_get_deployment_status": {
      try {
        const deploymentId = requireString(input.deploymentId, "deploymentId");
        const deployment = await vercelGetDeployment(deploymentId, {
          auditUserId: ctx.userId,
        });

        return {
          ok: true,
          content: JSON.stringify({
            deploymentId,
            state: deployment.readyState,
            url: deployment.url,
            errorMessage: deployment.errorMessage,
            buildingAt: deployment.buildingAt,
            readyAt: deployment.readyAt,
            target: deployment.target,
          }),
          summary: `Deploy ${deploymentId}: estado=${deployment.readyState}${deployment.url ? ` (${deployment.url})` : ""}${deployment.errorMessage ? ` ⚠️ ${deployment.errorMessage}` : ""}`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({ error: msg }),
          summary: `❌ Error obteniendo status: ${msg.split('\n')[0]}`,
        };
      }
    }

    case "vercel_check_url": {
      try {
        const url = requireString(input.url, "url");
        const response = await fetch(url, { method: "GET" });
        const text = await response.text();
        const preview = text.length > 500 ? text.substring(0, 500) : text;

        return {
          ok: true,
          content: JSON.stringify({
            url,
            status: response.status,
            headers: {
              contentType: response.headers.get("content-type"),
              contentLength: response.headers.get("content-length"),
              cacheControl: response.headers.get("cache-control"),
            },
            preview,
            statusText: response.statusText,
          }),
          summary: `✅ URL ${url} respondió con ${response.status} ${response.statusText}`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({ error: msg, url: input.url }),
          summary: `❌ URL no responde: ${msg.split('\n')[0]}`,
        };
      }
    }

    case "vercel_get_deployment_by_project": {
      try {
        const projectName = requireString(input.projectName, "projectName");
        const response = await fetch(
          `https://api.vercel.com/v9/deployments?app=${projectName}&limit=1`,
          {
            headers: { "Authorization": `Bearer ${await getOperatorSecret("VERCEL_TOKEN", { auditUserId: ctx.userId })}` },
          }
        );
        const data = (await response.json()) as { deployments: Array<{ id: string; [key: string]: unknown }> };
        const deployment = data.deployments?.[0];

        if (!deployment) {
          return {
            ok: false,
            content: JSON.stringify({ error: "No deployments found for project" }),
            summary: `❌ No deployment encontrado para ${projectName}`,
          };
        }

        return {
          ok: true,
          content: JSON.stringify(deployment),
          summary: `Deployment más reciente: ${deployment.id}`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({ error: msg }),
          summary: `❌ Error: ${msg.split('\n')[0]}`,
        };
      }
    }

    case "vercel_diagnose_deployment": {
      try {
        const projectName = requireString(input.projectName, "projectName");

        // Paso 1: Obtener deployment más reciente
        const deployResponse = await fetch(
          `https://api.vercel.com/v9/deployments?app=${projectName}&limit=1`,
          {
            headers: { "Authorization": `Bearer ${await getOperatorSecret("VERCEL_TOKEN", { auditUserId: ctx.userId })}` },
          }
        );
        const deployData = (await deployResponse.json()) as { deployments: Array<{ id: string; url: string; readyState: string; errorMessage?: string }> };
        const deployment = deployData.deployments?.[0];

        if (!deployment) {
          return {
            ok: false,
            content: JSON.stringify({ error: "No deployment found" }),
            summary: `❌ No deployment encontrado para ${projectName}`,
          };
        }

        // Paso 2: Obtener logs
        const logsResponse = await fetch(`https://api.vercel.com/v1/deployments/${deployment.id}/events`, {
          headers: { "Authorization": `Bearer ${await getOperatorSecret("VERCEL_TOKEN", { auditUserId: ctx.userId })}` },
        });
        const events = (await logsResponse.json()) as Array<{ type: string; text: string }>;
        const errors = events.filter((e) => e.type === "error" || e.text.toLowerCase().includes("error"));

        // Paso 3: Verificar URL
        let urlStatus = "⏳ No verificado";
        let urlError = null;
        if (deployment.url) {
          try {
            const urlResponse = await fetch(`https://${deployment.url}`);
            urlStatus = `✅ ${urlResponse.status}`;
          } catch (err) {
            urlError = err instanceof Error ? err.message : "Connection failed";
            urlStatus = `❌ ${urlError}`;
          }
        }

        const isHealthy = deployment.readyState === "READY" && errors.length === 0 && !urlError;

        return {
          ok: true,
          content: JSON.stringify({
            projectName,
            deploymentId: deployment.id,
            summary: isHealthy ? "✅ DEPLOYMENT HEALTHY" : "❌ DEPLOYMENT HAS ISSUES",
            details: {
              deploymentState: deployment.readyState,
              errorMessage: deployment.errorMessage || null,
              buildErrors: errors.length,
              urlStatus,
              url: deployment.url,
            },
            suggestion: isHealthy
              ? "Deploy está en vivo y respondiendo correctamente."
              : errors.length > 0
              ? `Hay ${errors.length} errores en los logs. Revisa el output del build.`
              : urlError
              ? `URL no responde: ${urlError}. Verifica la aplicación.`
              : "Estado desconocido.",
          }),
          summary: isHealthy
            ? `✅ ${projectName}: HEALTHY (${deployment.id})`
            : `❌ ${projectName}: ISSUES - ${errors.length} build errors, URL: ${urlStatus}`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          content: JSON.stringify({ error: msg }),
          summary: `❌ Diagnóstico falló: ${msg.split('\n')[0]}`,
        };
      }
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

    // ─── Self-config (V reconfigura sus propios modelos / skills) ────
    case "agent_config_get": {
      const rows = await listAgentConfig();
      return {
        ok: true,
        content: JSON.stringify({
          total: rows.length,
          config: rows,
        }),
        summary: `${rows.length} task kinds configurados`,
      };
    }
    case "agent_config_set": {
      const task = requireString(input.task_kind, "task_kind") as
        | "chat-main"
        | "reasoning"
        | "code-edit"
        | "classification"
        | "summarization"
        | "extraction";
      const model = requireString(input.model, "model");
      const result = await setModelForTask(task, model, {
        updatedBy: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          updated: true,
          task_kind: result.task_kind,
          model: result.model,
          note: "Aplica al siguiente turno (cache 60s). No requiere redeploy.",
        }),
        summary: `${result.task_kind} → ${result.model}`,
      };
    }
    case "model_set_default": {
      const model = requireString(input.model, "model");
      const result = await setModelForTask("chat-main", model, {
        updatedBy: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          updated: true,
          task_kind: "chat-main",
          model: result.model,
        }),
        summary: `chat-main → ${result.model}`,
      };
    }
    case "skill_create": {
      const id = requireString(input.id, "id");
      if (!/^[a-z][a-z0-9-]{2,60}$/.test(id)) {
        throw new Error(
          "id must be kebab-case (a-z, 0-9, dash; 3-60 chars; start with letter)",
        );
      }
      const name = requireString(input.name, "name");
      const description = requireString(input.description, "description");
      const systemPrompt = requireString(input.system_prompt, "system_prompt");
      const requiredTools = Array.isArray(input.required_tools)
        ? (input.required_tools as string[]).filter(
            (t) => typeof t === "string" && t.length > 0,
          )
        : [];
      const tags = Array.isArray(input.tags)
        ? (input.tags as string[]).filter(
            (t) => typeof t === "string" && t.length > 0,
          )
        : [];
      const ringMax =
        typeof input.ring_max === "number" &&
        input.ring_max >= 0 &&
        input.ring_max <= 3
          ? input.ring_max
          : 1;
      const rows = (await sql`
        INSERT INTO skills (
          id, name, description, system_prompt, required_tools,
          ring_max, source, tags, created_by
        ) VALUES (
          ${id}, ${name}, ${description}, ${systemPrompt}, ${requiredTools},
          ${ringMax}, 'user', ${tags}, ${ctx.userId}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          system_prompt = EXCLUDED.system_prompt,
          required_tools = EXCLUDED.required_tools,
          ring_max = EXCLUDED.ring_max,
          tags = EXCLUDED.tags,
          updated_at = now()
        RETURNING id, name, ring_max
      `) as Array<{ id: string; name: string; ring_max: number }>;
      return {
        ok: true,
        content: JSON.stringify({
          created: true,
          skill: rows[0],
        }),
        summary: `skill: ${rows[0].id}`,
      };
    }

    case "skill_list": {
      const installedOnly = input.installed_only === true;

      let rows;
      try {
        if (installedOnly) {
          rows = (await sql`
            SELECT id, name, description, tags, source, installed_at, ring_max
            FROM skills
            WHERE active = true AND installed_at IS NOT NULL
            ORDER BY installed_at DESC
          `) as Array<{
            id: string;
            name: string;
            description: string;
            tags: string[];
            source: string;
            installed_at: string | null;
            ring_max: number;
          }>;
        } else {
          rows = (await sql`
            SELECT id, name, description, tags, source, installed_at, ring_max
            FROM skills
            WHERE active = true
            ORDER BY name ASC
          `) as Array<{
            id: string;
            name: string;
            description: string;
            tags: string[];
            source: string;
            installed_at: string | null;
            ring_max: number;
          }>;
        }
      } catch (e) {
        // If skills table is broken, auto-repair it
        try {
          await sql`DROP TABLE IF EXISTS skills CASCADE`;
          await sql`
            CREATE TABLE skills (
              id            text PRIMARY KEY,
              name          text NOT NULL,
              description   text NOT NULL DEFAULT '',
              system_prompt text NOT NULL DEFAULT '',
              required_tools  text[] DEFAULT '{}',
              ring_max        int DEFAULT 1,
              source          text NOT NULL DEFAULT 'user',
              tags            text[] DEFAULT '{}',
              active          boolean DEFAULT true,
              installed_at    timestamptz,
              created_by      text,
              created_at      timestamptz NOT NULL DEFAULT now(),
              updated_at      timestamptz NOT NULL DEFAULT now()
            )
          `;
          await sql`CREATE INDEX idx_skills_source ON skills (source)`;
          await sql`CREATE INDEX idx_skills_tags ON skills USING gin (tags)`;
          await sql`CREATE INDEX idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;
          await sql`
            INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at) VALUES
              ('new-project-bootstrap', 'New Project Bootstrap', 'Create new projects', E'Create projects with GitHub + Vercel', ARRAY['github', 'vercel'], 'system', ARRAY['github_create_repo'], now()),
              ('repo-rescue', 'Repo Rescue', 'Fix broken repos', E'Diagnose and fix errors', ARRAY['github', 'debug'], 'system', ARRAY['github_read_file'], now()),
              ('repo-categorizer', 'Repo Categorizer', 'Audit repos', E'Categorize by activity', ARRAY['github', 'audit'], 'system', ARRAY['github_read_file'], NULL),
              ('dns-manager', 'DNS Manager', 'Manage DNS', E'Handle domains', ARRAY['dns'], 'system', ARRAY['namecom_check_domain'], NULL)
          `;

          // Retry the query
          if (installedOnly) {
            rows = (await sql`
              SELECT id, name, description, tags, source, installed_at, ring_max
              FROM skills
              WHERE active = true AND installed_at IS NOT NULL
              ORDER BY installed_at DESC
            `) as Array<{
              id: string;
              name: string;
              description: string;
              tags: string[];
              source: string;
              installed_at: string | null;
              ring_max: number;
            }>;
          } else {
            rows = (await sql`
              SELECT id, name, description, tags, source, installed_at, ring_max
              FROM skills
              WHERE active = true
              ORDER BY name ASC
            `) as Array<{
              id: string;
              name: string;
              description: string;
              tags: string[];
              source: string;
              installed_at: string | null;
              ring_max: number;
            }>;
          }
        } catch (repairError) {
          throw new Error(`skill_list failed: ${e instanceof Error ? e.message : String(e)}. Repair also failed: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
        }
      }

      return {
        ok: true,
        content: JSON.stringify({
          total: rows.length,
          installed: rows.filter(r => r.installed_at).length,
          skills: rows.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            tags: r.tags,
            source: r.source,
            installed: !!r.installed_at,
          })),
        }),
        summary: `${rows.length} skills (${rows.filter(r => r.installed_at).length} instaladas)`,
      };
    }

    case "skill_search": {
      const query = requireString(input.query, "query");
      const limit = clampNumber(input.limit, 1, 50, 10);
      const q = `%${query.toLowerCase()}%`;
      const rows = (await sql`
        SELECT id, name, description, tags, source, installed_at
        FROM skills
        WHERE active = true
          AND (
            lower(name) LIKE ${q}
            OR lower(description) LIKE ${q}
            OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(t) LIKE ${q})
          )
        ORDER BY
          CASE WHEN lower(name) LIKE ${q} THEN 0 ELSE 1 END,
          name ASC
        LIMIT ${limit}
      `) as Array<{
        id: string;
        name: string;
        description: string;
        tags: string[];
        source: string;
        installed_at: string | null;
      }>;
      return {
        ok: true,
        content: JSON.stringify({
          query,
          total: rows.length,
          skills: rows.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            tags: r.tags,
            source: r.source,
            installed: !!r.installed_at,
          })),
        }),
        summary: `${rows.length} skills matching "${query}"`,
      };
    }

    case "skill_install": {
      const id = requireString(input.id, "id");
      const rows = (await sql`
        UPDATE skills
        SET installed_at = now(), updated_at = now()
        WHERE id = ${id} AND active = true
        RETURNING id, name
      `) as Array<{ id: string; name: string }>;
      if (rows.length === 0) throw new Error(`Skill '${id}' not found.`);
      return {
        ok: true,
        content: JSON.stringify({ installed: true, id: rows[0].id, name: rows[0].name }),
        summary: `skill instalada: ${rows[0].name}`,
      };
    }

    case "skill_uninstall": {
      const id = requireString(input.id, "id");
      const rows = (await sql`
        UPDATE skills
        SET installed_at = NULL, updated_at = now()
        WHERE id = ${id} AND active = true
        RETURNING id, name
      `) as Array<{ id: string; name: string }>;
      if (rows.length === 0) throw new Error(`Skill '${id}' not found.`);
      return {
        ok: true,
        content: JSON.stringify({ uninstalled: true, id: rows[0].id, name: rows[0].name }),
        summary: `skill desinstalada: ${rows[0].name}`,
      };
    }

    case "self_audit": {
      const { runSelfAudit } = await import("@/lib/forge/self-audit");
      const report = await runSelfAudit();
      return {
        ok: report.ok,
        content: JSON.stringify(report),
        summary: report.ok
          ? `audit OK: ${report.summary.real} real · ${report.summary.partial} partial · ${report.summary.hallucinated} hallucinated · ${report.summary.total_tools_in_code} tools`
          : `audit FAIL: ${report.summary.hallucinated} skill(s) alucinada(s)${report.db_error ? " + db_error" : ""}`,
      };
    }

    case "directive_list": {
      const kindFilter = typeof input.kind === "string" ? input.kind : null;

      let rows;
      if (kindFilter) {
        rows = (await sql`
          SELECT id, kind, title, content, locked, priority, active
          FROM agent_directives
          WHERE active = true AND kind = ${kindFilter}
          ORDER BY priority ASC, created_at ASC
        `) as Array<{
          id: string;
          kind: string;
          title: string;
          content: string;
          locked: boolean;
          priority: number;
          active: boolean;
        }>;
      } else {
        rows = (await sql`
          SELECT id, kind, title, content, locked, priority, active
          FROM agent_directives
          WHERE active = true
          ORDER BY priority ASC, created_at ASC
        `) as Array<{
          id: string;
          kind: string;
          title: string;
          content: string;
          locked: boolean;
          priority: number;
          active: boolean;
        }>;
      }

      const byKind = {
        mantra: rows.filter(r => r.kind === 'mantra'),
        directive: rows.filter(r => r.kind === 'directive'),
        preference: rows.filter(r => r.kind === 'preference'),
      };

      return {
        ok: true,
        content: JSON.stringify({
          total: rows.length,
          by_kind: {
            mantra: byKind.mantra.length,
            directive: byKind.directive.length,
            preference: byKind.preference.length,
          },
          directives: rows.map(r => ({
            id: r.id,
            kind: r.kind,
            title: r.title,
            content: r.content,
            locked: r.locked,
            priority: r.priority,
          })),
        }),
        summary: `${rows.length} directivas (${byKind.mantra.length} mantra, ${byKind.directive.length} directive, ${byKind.preference.length} preference)`,
      };
    }

    case "directive_add": {
      const kind = requireString(input.kind, "kind");
      if (kind !== "directive" && kind !== "preference") {
        throw new Error("Solo puedes crear 'directive' o 'preference', no 'mantra'");
      }
      const title = requireString(input.title, "title");
      const content = requireString(input.content, "content");
      const priority = typeof input.priority === "number" ? input.priority : 100;

      const rows = (await sql`
        INSERT INTO agent_directives (kind, title, content, locked, priority, created_by)
        VALUES (${kind}, ${title}, ${content}, false, ${priority}, ${ctx.userId})
        RETURNING id, kind, title, priority
      `) as Array<{ id: string; kind: string; title: string; priority: number }>;

      return {
        ok: true,
        content: JSON.stringify({
          created: true,
          directive: rows[0],
        }),
        summary: `directiva creada: ${rows[0].title}`,
      };
    }

    case "directive_update": {
      const id = requireString(input.id, "id");
      const updates: Record<string, unknown> = {};
      if (typeof input.title === "string" && input.title.length > 0)
        updates.title = input.title;
      if (typeof input.content === "string" && input.content.length > 0)
        updates.content = input.content;
      if (typeof input.priority === "number")
        updates.priority = input.priority;
      if (Object.keys(updates).length === 0) {
        throw new Error("Provide at least one field to update: title, content, or priority.");
      }
      // Reject locked mantras at the application layer (belt) AND rely on the
      // DB trigger (suspenders). The WHERE locked = false means 0 rows returned
      // for a locked row, which we detect and turn into a clear error message.
      const rows = (await sql`
        UPDATE agent_directives
        SET
          title      = COALESCE(${updates.title as string | null ?? null}, title),
          content    = COALESCE(${updates.content as string | null ?? null}, content),
          priority   = COALESCE(${updates.priority as number | null ?? null}, priority),
          updated_at = now()
        WHERE id = ${id} AND active = true AND locked = false
        RETURNING id, kind, title, locked, priority
      `) as Array<{ id: string; kind: string; title: string; locked: boolean; priority: number }>;
      if (rows.length === 0) {
        // Distinguish "not found" from "locked"
        const check = (await sql`
          SELECT id, locked FROM agent_directives WHERE id = ${id}
        `) as Array<{ id: string; locked: boolean }>;
        if (check.length > 0 && check[0].locked) {
          throw new Error(`Cannot modify locked mantra '${id}'. Mantras are immutable.`);
        }
        throw new Error(`Directive '${id}' not found or is inactive.`);
      }
      return {
        ok: true,
        content: JSON.stringify({ updated: true, directive: rows[0] }),
        summary: `directiva actualizada: ${rows[0].title}`,
      };
    }

    case "directive_delete": {
      const id = requireString(input.id, "id");
      // DB trigger will raise an exception for locked=true rows
      const rows = (await sql`
        DELETE FROM agent_directives
        WHERE id = ${id}
        RETURNING id, title, locked
      `) as Array<{ id: string; title: string; locked: boolean }>;
      if (rows.length === 0) throw new Error(`Directive '${id}' not found.`);
      return {
        ok: true,
        content: JSON.stringify({ deleted: true, id: rows[0].id, title: rows[0].title }),
        summary: `directiva eliminada: ${rows[0].title}`,
      };
    }

    // ─── Sandbox vía GitHub Actions (M5 alt) ───────────────────────
    case "github_run_check": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const branch = requireString(input.branch, "branch");
      const command =
        typeof input.command === "string" && input.command.length > 0
          ? input.command
          : "default";
      const reason =
        typeof input.reason === "string" && input.reason.length > 0
          ? input.reason
          : "v-on-demand";
      const result = await ghDispatchWorkflow(
        owner,
        repo,
        "v-sandbox.yml",
        branch,
        { command, reason },
        { auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify({
          run_id: result.run_id,
          ref: result.ref,
          workflow: result.workflow,
          note: result.run_id
            ? "Validación disparada. Usa github_get_check_status para seguir el estado."
            : "Workflow disparado pero la corrida aún no aparece en la lista. Reintenta github_list_check_runs en unos segundos.",
        }),
        summary: `dispatched v-sandbox on ${owner}/${repo}#${branch}${result.run_id ? ` → run ${result.run_id}` : ""}`,
      };
    }
    case "github_get_check_status": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const runId = Number(input.run_id);
      if (!Number.isFinite(runId)) throw new Error("run_id must be a number");
      const run = await ghGetWorkflowRun(owner, repo, runId, {
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify(run),
        summary: `run ${runId}: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ""}`,
      };
    }
    case "github_get_check_logs": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const runId = Number(input.run_id);
      if (!Number.isFinite(runId)) throw new Error("run_id must be a number");
      const logs = await ghGetWorkflowRunLogs(owner, repo, runId, {
        auditUserId: ctx.userId,
      });
      return {
        ok: true,
        content: JSON.stringify({
          run_id: runId,
          jobs: logs.jobs,
          size: logs.size,
          truncated: logs.truncated,
          text: logs.text,
        }),
        summary: `logs run ${runId}: ${logs.jobs} job(s), ${logs.size}B${logs.truncated ? " (truncado 100KB)" : ""}`,
      };
    }
    case "github_list_check_runs": {
      const owner = ownerOrDefault(input.owner);
      const repo = requireString(input.repo, "repo");
      const branch =
        typeof input.branch === "string" && input.branch.length > 0
          ? input.branch
          : undefined;
      const perPage = clampNumber(input.per_page, 1, 30, 10);
      const runs = await ghListRecentWorkflowRuns(
        owner,
        repo,
        "v-sandbox.yml",
        { branch, perPage, auditUserId: ctx.userId },
      );
      return {
        ok: true,
        content: JSON.stringify({
          owner,
          repo,
          branch,
          total: runs.length,
          runs,
        }),
        summary: `${runs.length} runs de v-sandbox en ${owner}/${repo}${branch ? "#" + branch : ""}`,
      };
    }

    // ─── OpenRouter catálogo en vivo ───────────────────────────────
    case "openrouter_list_models": {
      const limit =
        typeof input.limit === "number" ? input.limit : 50;
      const provider =
        typeof input.provider === "string" && input.provider.length > 0
          ? input.provider
          : undefined;
      const models = await listAllOpenRouterModels({ limit, provider });
      return {
        ok: true,
        content: JSON.stringify({
          total: models.length,
          models: models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            context_length: m.context_length,
            pricing_per_1m_in: Number((m.pricing.prompt * 1_000_000).toFixed(4)),
            pricing_per_1m_out: Number((m.pricing.completion * 1_000_000).toFixed(4)),
            supports_tools: m.supports_tools,
            is_free: m.is_free,
          })),
        }),
        summary: `${models.length} modelos${provider ? ` de ${provider}` : ""}`,
      };
    }
    case "openrouter_get_model": {
      const slug = requireString(input.slug, "slug");
      const model = await getOpenRouterModel(slug);
      if (!model) {
        return {
          ok: false,
          content: JSON.stringify({
            error: `Slug '${slug}' no existe en OpenRouter.`,
          }),
          summary: `slug '${slug}' no encontrado`,
        };
      }
      return {
        ok: true,
        content: JSON.stringify({
          id: model.id,
          name: model.name,
          description: model.description,
          provider: model.provider,
          context_length: model.context_length,
          pricing_per_1m_in: Number((model.pricing.prompt * 1_000_000).toFixed(6)),
          pricing_per_1m_out: Number((model.pricing.completion * 1_000_000).toFixed(6)),
          supports_tools: model.supports_tools,
          is_free: model.is_free,
          modality: model.modality,
        }),
        summary: `${model.id}${model.is_free ? " (free)" : ""}`,
      };
    }
    case "openrouter_search_models": {
      const filter: Record<string, unknown> = {};
      if (typeof input.free === "boolean") filter.free = input.free;
      if (typeof input.supports_tools === "boolean")
        filter.supports_tools = input.supports_tools;
      if (typeof input.min_context === "number")
        filter.min_context = input.min_context;
      if (typeof input.max_cost_per_1m_in === "number")
        filter.max_cost_per_1m_in = input.max_cost_per_1m_in;
      if (typeof input.max_cost_per_1m_out === "number")
        filter.max_cost_per_1m_out = input.max_cost_per_1m_out;
      if (typeof input.provider === "string" && input.provider.length > 0)
        filter.provider = input.provider;
      if (typeof input.query === "string" && input.query.length > 0)
        filter.query = input.query;
      if (typeof input.limit === "number") filter.limit = input.limit;
      const models = await searchOpenRouterModels(filter);
      return {
        ok: true,
        content: JSON.stringify({
          total: models.length,
          filter,
          models: models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            context_length: m.context_length,
            pricing_per_1m_in: Number((m.pricing.prompt * 1_000_000).toFixed(4)),
            pricing_per_1m_out: Number((m.pricing.completion * 1_000_000).toFixed(4)),
            supports_tools: m.supports_tools,
            is_free: m.is_free,
          })),
        }),
        summary: `${models.length} matches`,
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

    case "http_request": {
      const url = requireString(input.url, "url");
      const method = (typeof input.method === "string" ? input.method : "GET").toUpperCase() as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      const headers = (input.headers ?? {}) as Record<string, string>;
      const body = typeof input.body === "string" ? input.body : undefined;

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          ...(body ? { body } : {}),
        });

        const text = await response.text();
        let responseBody: unknown;
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }

        return {
          ok: response.ok,
          content: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody,
          }),
          summary: `${method} ${url}: ${response.status}`,
        };
      } catch (e) {
        return {
          ok: false,
          content: JSON.stringify({
            error: e instanceof Error ? e.message : String(e),
          }),
          summary: `${method} ${url}: failed`,
        };
      }
    }
    case "remote_execution": {
      const code = requireString(input.code, "code");
      const language = (input.language === "node" ? "node" : "python") as "python" | "node";
      const res = await callVServer("/execute", { code, language });
      if (!res.ok) {
        return {
          ok: false,
          content: JSON.stringify({ error: res.error, status: res.status, body: res.body }),
          summary: `remote_execution falló: ${res.error}`,
        };
      }
      const body = (res.body ?? {}) as { stdout?: string; stderr?: string; returncode?: number; error?: string };
      const okRun = (body.returncode ?? 0) === 0 && !body.error;
      const summary = okRun
        ? `${language} OK (${(body.stdout ?? "").length} chars stdout)`
        : `${language} exit=${body.returncode ?? "?"} ${(body.stderr ?? body.error ?? "").slice(0, 60)}`;
      return { ok: okRun, content: JSON.stringify(body), summary };
    }
    case "browser_control": {
      const action = requireString(input.action, "action");
      const payload: Record<string, unknown> = { action };
      if (typeof input.url === "string") payload.url = input.url;
      if (typeof input.selector === "string") payload.selector = input.selector;
      if (typeof input.text_to_type === "string") payload.text_to_type = input.text_to_type;
      if (typeof input.script === "string") payload.script = input.script;
      if (typeof input.wait_for_selector === "string") payload.wait_for_selector = input.wait_for_selector;
      if (typeof input.return_screenshot_base64 === "boolean") payload.return_screenshot_base64 = input.return_screenshot_base64;
      if (typeof input.wait_ms === "number") payload.wait_ms = input.wait_ms;
      const res = await callVServer("/browser", payload, { timeoutMs: 60_000 });
      if (!res.ok) {
        return {
          ok: false,
          content: JSON.stringify({ error: res.error, status: res.status, body: res.body }),
          summary: `browser_control falló: ${res.error}`,
        };
      }
      return { ok: true, content: JSON.stringify(res.body), summary: `browser ${action} OK` };
    }
    case "image_generation": {
      const prompt = requireString(input.prompt, "prompt");
      const size = typeof input.size === "string" ? input.size : "1024x1024";
      const payload: Record<string, unknown> = { prompt, size };
      if (typeof input.negative_prompt === "string") payload.negative_prompt = input.negative_prompt;
      if (typeof input.model === "string") payload.model = input.model;
      const res = await callVServer("/generate-image", payload, { timeoutMs: 120_000 });
      if (!res.ok) {
        return {
          ok: false,
          content: JSON.stringify({ error: res.error, status: res.status, body: res.body }),
          summary: `image_generation falló: ${res.error}`,
        };
      }
      const body = (res.body ?? {}) as { model?: string };
      const modelUsed = body.model ?? (typeof input.model === "string" ? input.model : "gemini-image");
      return { ok: true, content: JSON.stringify(res.body), summary: `imagen ${size} (${modelUsed})` };
    }
    case "ssh_command_executor": {
      const host = requireString(input.host, "host");
      const command = requireString(input.command, "command");
      const confirmed = input.confirmed === true;
      if (!confirmed) {
        return {
          ok: false,
          content: JSON.stringify({
            error: "Ring 2: ejecutar SSH en un servidor remoto requiere confirmación explícita de Luis primero",
            instruction: `V: describe a Luis qué comando vas a correr ("voy a ejecutar 'X' en host Y porque Z"). Espera su 'sí' explícito. LUEGO rellamá la tool con confirmed=true.`,
            failureCode: "RING2_NEEDS_CONFIRMATION",
            host,
            command,
          }),
          summary: `ssh ${host}: necesita confirmación de Luis primero`,
        };
      }
      const payload: Record<string, unknown> = { host, command };
      if (typeof input.username === "string") payload.username = input.username;
      if (typeof input.password === "string") payload.password = input.password;
      if (typeof input.private_key === "string") payload.private_key = input.private_key;
      if (typeof input.sudo === "boolean") payload.sudo = input.sudo;
      if (typeof input.port === "number") payload.port = input.port;
      const timeoutSeconds = clampNumber(input.timeout_seconds, 1, 300, 60);
      payload.timeout_seconds = timeoutSeconds;
      const res = await callVServer("/ssh-execute", payload, { timeoutMs: (timeoutSeconds + 15) * 1000 });
      if (!res.ok) {
        return {
          ok: false,
          content: JSON.stringify({ error: res.error, status: res.status, body: res.body }),
          summary: `ssh ${host} falló: ${res.error}`,
        };
      }
      const body = (res.body ?? {}) as { stdout?: string; stderr?: string; return_code?: number; error?: string };
      const okRun = (body.return_code ?? 0) === 0 && !body.error;
      const summary = okRun
        ? `ssh ${host} OK (exit=${body.return_code ?? 0})`
        : `ssh ${host} exit=${body.return_code ?? "?"} ${(body.stderr ?? body.error ?? "").slice(0, 60)}`;
      return { ok: okRun, content: JSON.stringify(body), summary };
    }

    case "claude_code": {
      const instruction = requireString(input.instruction, "instruction");
      const payload: Record<string, unknown> = { instruction };
      if (typeof input.cwd === "string") payload.cwd = input.cwd;
      const to =
        typeof input.timeout_seconds === "number"
          ? Math.max(1, Math.min(600, input.timeout_seconds))
          : 300;
      payload.timeout_seconds = to;
      const res = await callVServer("/claude", payload, { timeoutMs: (to + 15) * 1000 });
      if (!res.ok) {
        return {
          ok: false,
          content: JSON.stringify({ error: res.error, status: res.status, body: res.body }),
          summary: `claude_code falló: ${res.error}`,
        };
      }
      const body = (res.body ?? {}) as { stdout?: string; output?: string; returncode?: number };
      const out = body.output ?? body.stdout ?? "";
      return {
        ok: (body.returncode ?? 0) === 0,
        content: JSON.stringify(res.body),
        summary: `Claude Code corrió (${String(out).length} chars de salida)`,
      };
    }

    case "design_version": {
      const projectName = requireString(input.project_name, "project_name");
      const summary = requireString(input.summary, "summary");
      const rawFiles = Array.isArray(input.files) ? input.files : [];
      const files = rawFiles
        .filter(
          (f): f is { path: string; content: string } =>
            !!f &&
            typeof (f as { path?: unknown }).path === "string" &&
            typeof (f as { content?: unknown }).content === "string",
        )
        .map((f) => ({ path: f.path, content: f.content }));
      if (files.length === 0) {
        return {
          ok: false,
          content: JSON.stringify({ error: "files vacío: manda al menos un archivo {path, content}" }),
          summary: "design_version sin archivos",
        };
      }
      const builder = await import("@/lib/builder/db");
      const existing = await builder.findBuildByName(ctx.userId, projectName);
      const build =
        existing ?? (await builder.createBuild(ctx.userId, projectName));
      const version = await builder.addVersion(build.id, summary, files);
      const previewUrl = `/api/builder/preview/${version.id}`;
      return {
        ok: true,
        content: JSON.stringify({
          buildId: build.id,
          versionId: version.id,
          n: version.n,
          preview_url: previewUrl,
          // Cuando run/route.ts emita send({type:'version',...}) la UI
          // pintará la VersionCard; mientras, V puede compartir el link.
        }),
        summary: `versión ${version.n} de ${projectName} guardada`,
      };
    }
    case "taste_remember": {
      const key = requireString(input.key, "key");
      const value = requireString(input.value, "value");
      const { saveUserMemory } = await import("@/lib/forge/user-memory");
      await saveUserMemory(ctx.userId, key, value.slice(0, 2000));
      return {
        ok: true,
        content: JSON.stringify({ saved: true, key }),
        summary: `gusto guardado: ${key}`,
      };
    }

    case "hub_pending_status": {
      const status = await getBridgeStatus();
      return {
        ok: true,
        content: JSON.stringify(status),
        summary: `${status.pending?.length ?? 0} pendientes, cola: ${status.pipeline?.queued ?? 0}`,
      };
    }

    case "hub_approve": {
      const id = String(input.id ?? "");
      if (!id) throw new Error("id requerido");
      const res = await approvePending(id);
      return { ok: true, content: JSON.stringify(res), summary: `aprobado ${id}` };
    }

    case "hub_reject": {
      const id = String(input.id ?? "");
      const motivo = String(input.motivo ?? "sin motivo");
      if (!id) throw new Error("id requerido");
      const res = await rejectPending(id, motivo);
      return { ok: true, content: JSON.stringify(res), summary: `rechazado ${id}` };
    }

    case "hub_dispatch_task": {
      const agent = String(input.agent ?? "");
      const task = String(input.task ?? "");
      if (!agent || !task) throw new Error("agent y task requeridos");
      const res = await dispatchBridgeTask({
        agent,
        task,
        context: typeof input.context === "string" ? input.context : undefined,
        projectId: typeof input.projectId === "string" ? input.projectId : undefined,
      });
      return { ok: true, content: JSON.stringify(res), summary: `tarea -> ${agent}` };
    }

    case "integration_plan_get": {
      await integrationRefreshStatus(ctx.userId);
      const items = await integrationGetPlan(ctx.userId);
      const sorted = [...items].sort((a, b) => a.order - b.order);
      const total = sorted.length;
      const done = sorted.filter((i) => i.status === "connected").length;
      return {
        ok: true,
        content: JSON.stringify({ items: sorted, progress: { done, total } }),
        summary: `plan de conexiones: ${done}/${total}`,
      };
    }

    case "integration_plan_update": {
      const serviceId = String(input.serviceId || "");
      const status = String(input.status || "") as IntegrationItemStatus;
      if (!serviceId || !["pending", "connected", "skipped"].includes(status)) {
        return {
          ok: false,
          content: JSON.stringify({ error: "serviceId y status válidos requeridos" }),
          summary: "integration_plan_update: parámetros inválidos",
        };
      }
      const items = await integrationSetItemStatus(ctx.userId, serviceId, status);
      const done = items.filter((i) => i.status === "connected").length;
      return {
        ok: true,
        content: JSON.stringify({ ok: true, items, progress: { done, total: items.length } }),
        summary: `${serviceId} -> ${status}`,
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

/**
 * Default GitHub owner when V invokes a write tool without specifying
 * one. The single-tenant MVP only operates on Luis's own repos under
 * 'turbillon50', so an empty owner is almost always V failing to fill
 * the field rather than a real ambiguity. Replace with the Clerk-bound
 * owner when M11 lands (multi-tenant).
 */
const DEFAULT_GITHUB_OWNER = "turbillon50";

function ownerOrDefault(v: unknown): string {
  if (typeof v === "string" && v.length > 0) return v;
  return DEFAULT_GITHUB_OWNER;
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
 * defensive. Campos sensibles (password, private_key, tokens) se
 * reemplazan por "[REDACTED]" SIEMPRE — el audit guarda solo evidencia
 * de que se invocó la tool, no la credencial.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "private_key",
  "privateKey",
  "secret",
  "token",
  "api_key",
  "apiKey",
  "auth",
  "authorization",
]);

function redactInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(k) && typeof v === "string" && v.length > 0) {
      safe[k] = `[REDACTED ${v.length} chars]`;
    } else if (typeof v === "string" && v.length > 200) {
      safe[k] = `${v.slice(0, 80)}…(truncated)`;
    } else {
      safe[k] = v;
    }
  }
  return safe;
}
