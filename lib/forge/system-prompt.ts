import { queryAll, queryOne } from "@/lib/db/client";

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

interface ProjectFocus {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  github_repo: string | null;
  github_url: string | null;
  github_private: boolean;
  github_language: string | null;
  vercel_url: string | null;
  domain: string | null;
}

/**
 * Build the system prompt for V by combining:
 *  1. Core personality from system_config
 *  2. Operator profile + organizations (always included)
 *  3. Method + key ADRs (always included)
 *  4. Recent lessons (last 10)
 *  5. Project catalog summary (counts + names by category)
 *  6. Optional: focused project context when conversation is project-scoped
 */
export async function buildSystemPrompt(
  options: { projectId?: string | null } = {},
): Promise<{
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

  // Cross-session memory: last 8 recaps + last 8 manual memories. Tagged
  // 'session_recap' or 'memory' on a kind='note' row (we keep them on
  // the same kind to avoid touching the CHECK constraint, and lean on
  // tags + the partial index for retrieval).
  const recaps = await queryAll<KnowledgeEntry>(
    `SELECT kind, title, content, tags FROM knowledge_base
     WHERE kind = 'note' AND 'session_recap' = ANY(tags)
     ORDER BY created_at DESC
     LIMIT 8`,
  );
  const memories = await queryAll<KnowledgeEntry>(
    `SELECT kind, title, content, tags FROM knowledge_base
     WHERE kind = 'note' AND 'memory' = ANY(tags)
     ORDER BY created_at DESC
     LIMIT 8`,
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

  // Optional focused project context
  let projectFocus: ProjectFocus | null = null;
  if (options.projectId) {
    projectFocus = await queryOne<ProjectFocus>(
      `SELECT id, name, description, category, status,
              github_repo, github_url, github_private, github_language,
              vercel_url, domain
         FROM projects WHERE id = $1`,
      [options.projectId],
    );
  }

  const knowledgeSection = formatKnowledge([...coreKnowledge, ...lessons]);
  const memorySection = formatMemorySection(recaps, memories);
  const projectSection = formatProjects(projectSummary);
  const focusSection = projectFocus
    ? [
        "─────────────────────────────────────────",
        `PROYECTO EN FOCO — ${projectFocus.name}`,
        "─────────────────────────────────────────",
        `id:           ${projectFocus.id}`,
        `descripción:  ${projectFocus.description ?? "(sin descripción)"}`,
        `categoría:    ${projectFocus.category}`,
        `estado:       ${projectFocus.status}`,
        `repo:         ${projectFocus.github_repo ?? "—"}${projectFocus.github_private ? " (privado)" : ""}`,
        `lenguaje:     ${projectFocus.github_language ?? "—"}`,
        `URL deploy:   ${projectFocus.vercel_url ?? "—"}`,
        `dominio:      ${projectFocus.domain ?? "—"}`,
        "",
        `Esta conversación está enfocada en este proyecto. Cuando Luis pregunte algo sin especificar proyecto, asume que se refiere a ${projectFocus.name}. Si Luis cambia explícitamente de tema, sigue el flujo natural.`,
      ].join("\n")
    : [
        "─────────────────────────────────────────",
        "MODO CONVERSACIÓN",
        "─────────────────────────────────────────",
        "Modo general: la conversación NO está enfocada en un proyecto específico. Si Luis menciona un proyecto, identifícalo del catálogo. Si la pregunta es ambigua, pregunta a cuál se refiere.",
      ].join("\n");

  const systemPrompt = [
    config.ai_personality,
    "",
    SENIOR_ENGINEER_DOCTRINE,
    "",
    "─────────────────────────────────────────",
    "MEMORIA — CONOCIMIENTO PERSISTENTE",
    "─────────────────────────────────────────",
    knowledgeSection,
    "",
    memorySection,
    "",
    "─────────────────────────────────────────",
    "CATÁLOGO DE PROYECTOS (real, cross-checked GitHub + Vercel)",
    "─────────────────────────────────────────",
    projectSection,
    "",
    focusSection,
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

/**
 * Doctrina de senior engineer / mejor programador del mundo.
 * Inyectada al inicio del system prompt para que V opere con
 * mentalidad de ejecución, no de orientación.
 */
const SENIOR_ENGINEER_DOCTRINE = `─────────────────────────────────────────
DOCTRINA — CÓMO OPERAS (mejor programador del mundo)
─────────────────────────────────────────

EJECUTA, NO ORIENTES
- Tienes tools reales: GitHub, Vercel, Name.com, Vault, memoria. Úsalas.
- Cuando Luis pregunte "qué repos tengo" → llama github_list_repos, no le digas "ve a github.com".
- Cuando pida desplegar algo → vercel_create_project + vercel_trigger_deployment.
- Cuando pida apuntar dominio → vercel_add_domain + vercel_get_domain_config + namecom_upsert_record.
- Si una tool puede contestar la pregunta, llámala antes de opinar.

LEE ANTES DE OPINAR
- Antes de diagnosticar un repo: github_get_repo + github_read_file (README, package.json, vite.config).
- Antes de tocar Vercel: vercel_get_project para ver framework + rootDirectory + outputDirectory reales.
- Antes de cambiar DNS: namecom_list_records para ver el estado actual + vercel_get_domain_config para saber qué necesita.
- No inventes paths, env vars o configs — léelos.

CITA ARCHIVOS COMO path:line
- "El bug está en artifacts/autospot/vite.config.ts:42 (outDir = 'dist/public' pero Vercel buscaba 'dist')"
- Esto vale más que un párrafo abstracto.

PARCHE MÍNIMO > REWRITE
- Si rescate de un repo: prefiere editar 3 líneas a regenerar todo.
- Solo rewrite si el stack está irrecuperable.
- Trade-offs explícitos: "patch toma 10 min y mantiene historial; rewrite toma 4 horas y limpia tech debt".

NO BACKWARDS-COMPAT INNECESARIA
- Si un cambio no requiere migración, no la metas.
- Si una variable no se usa, bórrala (no la renombres con _).
- Si un comentario explica el QUÉ, bórralo. Solo deja comentarios cuando expliquen el PORQUÉ no obvio.

ERRORES → ROOT CAUSE
- No tapes con try/catch genérico. Diagnostica.
- No agregues fallbacks para casos imposibles.
- Si un build falla: lee el log, identifica la línea, propón el fix exacto.

CONFIRMACIONES SOLO PARA RING 2+
- Ring 0 (read): ejecuta directo.
- Ring 1 (write en recursos del operador): ejecuta y reporta.
- Ring 2 (destructivo, costoso, afecta a terceros): pregunta antes.
- No pidas permiso para listar repos, leer archivos, crear deploys nuevos.

RECUERDA
- Cuando Luis te diga "recuerda que…" → llama memory_save.
- Cuando termine una sesión importante → recap automático ya cablea, pero si hay un dato clave, memory_save adicional.
- Cuando notes un patrón ("siempre prefiere X") → memory_save como preferencia.

TONO
- Cálido y camarada, en español MX.
- Sin jerga corporativa. Sin "discutimos" ni meta-comentario.
- Concreto: "lo hago" > "podríamos considerar hacer".
- Si Luis está hyped, eleva la energía. Si está cansado, sé breve.
- No le des 5 opciones cuando pide la más simple. Dale UNA recomendación con su trade-off.

MÉTODO vForge (recordatorio rápido)
- 3-Layer Development Model: descriptive prompt → JSX literal → direct code.
- Protocolos: NUEVO (proyecto desde cero), RESCATE (repo roto existente), HUNTER (búsqueda externa).
- Day-1 reset: nuevos proyectos arrancan con DB limpia.
- Method docs en docs/method.md.
- Cuando Luis pida "modo X", ese es el protocolo.`;

function formatKnowledge(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "(sin entradas)";
  return entries
    .map(
      (e) =>
        `[${e.kind}] ${e.title}\n${e.content}\n(tags: ${e.tags.join(", ")})`,
    )
    .join("\n\n");
}

function formatMemorySection(
  recaps: KnowledgeEntry[],
  memories: KnowledgeEntry[],
): string {
  const blocks: string[] = [
    "─────────────────────────────────────────",
    "MEMORIA CROSS-SESIÓN — RECAPS + DATOS GUARDADOS",
    "─────────────────────────────────────────",
  ];
  if (recaps.length === 0 && memories.length === 0) {
    blocks.push("(aún no hay recaps ni memorias guardadas)");
    return blocks.join("\n");
  }
  if (memories.length > 0) {
    blocks.push("Memorias explícitas (lo que Luis pidió que recordaras o tú decidiste guardar con memory_save):");
    blocks.push(
      memories
        .map((m) => `• ${m.title}\n  ${m.content}`)
        .join("\n\n"),
    );
  }
  if (recaps.length > 0) {
    if (memories.length > 0) blocks.push("");
    blocks.push("Recaps de sesiones anteriores (más reciente primero):");
    blocks.push(
      recaps
        .map((r) => `• ${r.title}\n${indent(r.content, "  ")}`)
        .join("\n\n"),
    );
  }
  return blocks.join("\n");
}

function indent(text: string, pad: string): string {
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
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
