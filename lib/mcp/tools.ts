import { queryAll, queryOne, sql, ensureDatabaseHealed } from "@/lib/db/client";
import { brainQueryAll } from "@/lib/db/brain";
import { recall } from "@/lib/forge/semantic-recall";
import { resolveAccessForUser } from "@/lib/connect/resolve-token";
import { githubClientFromToken } from "@/lib/github/client";
import { randomBytes } from "node:crypto";
import { type McpPrincipal, isPublicTool, isAdmin } from "./rbac";

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const CONFIRM_PROPS = {
  confirm: { type: "boolean", description: "true para ejecutar un plan ya generado" },
  action_id: { type: "string", description: "id del plan pendiente (devuelto en la primera llamada)" },
};

export const MCP_TOOLS: McpToolDef[] = [
  /* ============================ TOOLS PÚBLICAS ============================ */
  /* Marketing — sin datos privados. Accesibles con token public o sin auth.  */
  {
    name: "getting_started",
    description:
      "PÚBLICA: qué es VForge y cómo conectarse. README vivo — explica la fábrica de apps, qué hace el agente V, cómo obtener un token MCP y empezar. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_method",
    description:
      "PÚBLICA: el Método VForge resumido — las 3 capas, los anillos de privilegio y el stack validado con el que VForge construye y opera apps. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "help",
    description:
      "PÚBLICA: lista las tools del MCP de VForge, qué hace cada una y qué scope necesita (público / con token). Punto de entrada para orientarse. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },

  /* ============================== TOOLS DE DATOS ============================== */
  {
    name: "vforge_brain_search",
    description:
      "Busca en la memoria y el método de VForge (knowledge base + memoria semántica): el método de construcción, decisiones de arquitectura, lecciones, runbooks. Devuelve resultados curados por categoría y, si hace falta, fragmentos semánticos.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Qué buscar" } }, required: ["query"] },
  },
  {
    name: "vforge_skill_list",
    description: "Lista las skills (capacidades/flujos) disponibles en VForge con su descripción.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_integration_plan",
    description:
      "Dado el alcance de un proyecto (tipo de app y features), recomienda qué servicios/cuentas conectar (GitHub, Vercel, Stripe, Neon, etc.) con porqué, costo aproximado, pasos de cuenta y llave necesaria por servicio.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Tipo de app (ecommerce, servicios, comunidad, etc.)" },
        features: { type: "array", items: { type: "string" }, description: "Features: pagos, emails, base de datos, sms, auth, mapa…" },
      },
    },
  },
  {
    name: "vforge_recommend_stack",
    description: "Recomienda el stack técnico validado de VForge (Next.js + TS + Tailwind + Clerk + Neon + Vercel) con justificación por pieza, alternativas y cuándo NO usar cada una.",
    inputSchema: { type: "object", properties: { type: { type: "string" } } },
  },
  {
    name: "vforge_project_status",
    description: "DATOS (admin|client): estado de los proyectos en VForge. Admin (operador) ve todos; client ve SOLO los de su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_project_feedback",
    description:
      "DATOS (admin|client): lee las observaciones/anotaciones de una sala live (texto, ancla viewport/selector/URL y estado de la tarea). Exige project_id y valida que el token sea owner del tenant o miembro activo del proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "ID exacto del proyecto cuya sala se quiere revisar (por ejemplo: apsus)",
        },
        limit: {
          type: "number",
          description: "Cantidad de observaciones recientes (1-100; default 40)",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_project_context",
    description:
      "DATOS (admin|client): estado de código/deploy, URLs de referencia con contenido leído, CONTENIDO.md, integraciones sin secretos y archivos privados de una sala autorizada.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_project_file",
    description:
      "DATOS (admin|client): lee por fragmentos el texto extraído de un ZIP privado de contexto. Revalida acceso al proyecto y nunca devuelve la URL privada del blob.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto" },
        asset_id: { type: "string", description: "ID del archivo listado por vforge_project_context" },
        offset: { type: "number", description: "Posición inicial en caracteres (default 0)" },
        limit: { type: "number", description: "Caracteres por fragmento (1-40000; default 20000)" },
      },
      required: ["project_id", "asset_id"],
    },
  },
  {
    name: "vforge_project_see",
    description:
      "OJOS (admin|client): fotografía Escritorio/Móvil/Admin, guarda cada foto como documento de la sala y las devuelve. También incluye fotos del plugin de Chrome. Usa project_id y viewport=desktop|mobile|admin|all.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto (por ejemplo: netmas-distribuidores)" },
        viewport: {
          type: "string",
          description: "desktop, mobile, admin o all. Default: desktop y mobile",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_navegador_see",
    description:
      "OJOS (admin): fotografía la pestaña ABIERTA del Navegador Pro en Hetzner. Lo que está en el Chrome de la nube, no un Chrome aislado.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_payments",
    description: "DATOS (admin|client): pagos y avance financiero (total/pagado/pendiente) de los proyectos. Admin ve todo; client ve SOLO su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_apps_health",
    description: "DATOS (admin|client): salud/estado de despliegue de las apps (live/building/error/idle). Admin ve todo; client ve SOLO su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_create_repo",
    description:
      "EJECUTABLE (two-step): crea un repositorio GitHub real con el token del usuario. Primera llamada sin confirm devuelve un plan + action_id; segunda llamada con confirm=true y action_id lo ejecuta.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del repo" },
        description: { type: "string" },
        private: { type: "boolean", description: "Repo privado (default true)" },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_deploy",
    description:
      "EJECUTABLE (two-step): crea/conecta un proyecto Vercel a un repo GitHub y dispara un deployment con el token Vercel del usuario. Primera llamada sin confirm devuelve plan + action_id; con confirm=true ejecuta y devuelve la URL.",
    inputSchema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string", description: "owner/repo en GitHub" },
        project_name: { type: "string", description: "Nombre del proyecto Vercel (default: nombre del repo)" },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_scaffold_project",
    description:
      "EJECUTABLE (two-step): andamiaje completo de proyecto — crea repo GitHub + proyecto Vercel conectado y lista las integraciones recomendadas pendientes de conectar. Two-step: plan primero, confirm=true para ejecutar.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del proyecto" },
        scope: {
          type: "object",
          properties: {
            appType: { type: "string" },
            features: { type: "array", items: { type: "string" } },
          },
        },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_execute_skill",
    description:
      "EJECUTABLE (two-step, solo owner): ejecuta una skill de VForge vía Claude Code en el servidor. Busca la skill por nombre, arma el prompt con su system_prompt + instrucciones y lo dispara. Plan primero, confirm=true para ejecutar.",
    inputSchema: {
      type: "object",
      properties: {
        skill_name: { type: "string", description: "Nombre (o parte) de la skill" },
        instructions: { type: "string", description: "Instrucciones adicionales" },
        ...CONFIRM_PROPS,
      },
    },
  },

  /* ===================== TOOLS DE OPERADOR (fragua Vulcano) ===================== */
  /* Owner/Associate (admin|client). NUNCA public. Ver OPERATOR_TOOLS en rbac.ts. */
  {
    name: "vulcano_taller_status",
    description:
      "OPERADOR (Owner/Associate): estado vivo de la fragua — qué está pasando AHORA en la empresa. Jobs corriendo, en cola y cerrados recientemente desde la cola real de despacho (dispatch_queue): agente, source, progreso, log en vivo y veredicto Grok (APROBADO/RECHAZADO/REVISION). Sin mock.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_dispatch",
    description:
      "OPERADOR (Owner/Associate, ejecuta directo): encola un trabajo REAL a la fragua (INSERT en dispatch_queue). El source queda auditado como mcp:<tu userId de Clerk> — registro de quién ordenó qué. Devuelve el id de cola asignado.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "Agente que ejecuta: claude | codex | grok | shell | browser (default claude)" },
        prompt: { type: "string", description: "La tarea a ejecutar en la fragua" },
        priority: { type: "number", description: "Prioridad 1-100 (más alto = antes; default 5)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "vulcano_brain_module",
    description:
      "OPERADOR (Owner/Associate): lee un módulo de arranque del Brain por nombre — la doctrina completa de la fábrica. Módulos: proposito, contexto-minimo, marco-legal-entrega, publicidad, tipos-de-diseno, catalogo-forks, anatomia-arte, onboarding-operador. Sin 'name' lista los disponibles.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del módulo (ej. proposito). Vacío = lista los módulos." },
      },
    },
  },
  {
    name: "vulcano_salud",
    description:
      "OPERADOR (Owner/Associate): el pulso de la fábrica en una sola llamada — token-health (horas restantes), daemon Vulcano vivo + claude_loop, y conteo de la cola (corriendo/pendiente/total). Sin mock.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_boot",
    description:
      "AGENTE (Owner): arranque de identidad Vulcano — carga boot-context, proyectos activos, lecciones recientes y ritual de identidad en una sola llamada. LLAMAR PRIMERO al iniciar cualquier sesión de agente autónomo.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_brain_exec",
    description:
      "OPERADOR (Owner): ejecuta un comando shell en el servidor Hetzner desde el MCP. Auditado. Blocklist básica activa. project_id opcional para auto-registrar lección.",
    inputSchema: {
      type: "object",
      properties: {
        cmd: { type: "string", description: "Comando bash a ejecutar en Hetzner" },
        project_id: { type: "string", description: "ID de proyecto para registrar lección (opcional)" },
      },
      required: ["cmd"],
    },
  },
  {
    name: "v_instruct",
    description:
      "OPERADOR (Owner): da una instrucción directa a V, el cerebro orquestador. V detecta el intent y, si aplica, despacha al agente correcto (Vulcano/Tanit/Breack/Goossip/Enjambre) encolando el job real en dispatch_queue; si no, responde ella misma. Es el canal Claude → V → agentes.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "La instrucción o mensaje para V, en lenguaje natural." },
        session_id: { type: "string", description: "Sesión de V (default: claude-mcp). Aísla la memoria conversacional." },
      },
      required: ["message"],
    },
  },
  {
    name: "vulcano_brain_query",
    description:
      "OPERADOR (Owner): ejecuta SQL en Neon (Brain DB) desde el MCP. Permite SELECT libre + INSERT en lessons/patterns + UPDATE en projects/dispatch_queue.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL a ejecutar" },
        params: { type: "array", description: "Parámetros posicionales ($1, $2…)", items: {} },
      },
      required: ["query"],
    },
  },
  {
    name: "vulcano_update_project",
    description:
      "AGENTE (Owner): actualiza el estado de un proyecto en el Brain (last_action, next_step, phase, blocked). Llamar siempre al terminar una tarea sobre un proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID del proyecto (ej. rideme, credeti, vforge)" },
        last_action: { type: "string", description: "Resumen de lo que se hizo" },
        next_step: { type: "string", description: "Qué sigue" },
        phase: { type: "string", description: "Fase actual del proyecto (opcional)" },
        blocked: { type: "string", description: "Blocker activo, o cadena vacía para limpiar (opcional)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vulcano_save_lesson",
    description:
      "AGENTE (Owner): persiste una lección, error o patrón aprendido en el Brain. Llamar siempre que descubras algo reutilizable.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID de proyecto relacionado (default: general)" },
        type: { type: "string", enum: ["acierto", "error", "patron"], description: "Tipo de lección" },
        area: { type: "string", description: "Área técnica: shell | postgres | pwa | auth | deploy | etc." },
        lesson: { type: "string", description: "La lección en sí (qué aprendiste)" },
        fix: { type: "string", description: "Cómo resolverlo si era un error (opcional)" },
        source: { type: "string", description: "Fuente (default: mcp-agent)" },
      },
      required: ["lesson"],
    },
  },
  {
    name: "vulcano_memory_search",
    description:
      "AGENTE (Owner): búsqueda semántica en el Brain (pgvector + Jina embeddings). Encuentra doctrina, patrones, skills y contexto por significado, no por ruta exacta.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Pregunta en lenguaje natural" },
        limit: { type: "number", description: "Resultados (default: 5, max: 10)" },
      },
      required: ["q"],
    },
  },

];

/** Tools visibles para un principal: public ve sólo las públicas; admin|client
 *  ven todas. Lo usa tools/list para no anunciar tools que igual rebotarían. */
export function mcpToolsForScope(principal: McpPrincipal): McpToolDef[] {
  if (principal.scope === "admin" || principal.scope === "client") return MCP_TOOLS;
  return MCP_TOOLS.filter((t) => isPublicTool(t.name));
}

function text(t: string) {
  return { content: [{ type: "text", text: t }] };
}

function err(t: string) {
  return { ...text(t), isError: true };
}

/* ============================== pending actions ============================== */

let _pendingEnsured = false;
async function ensurePendingTable(): Promise<void> {
  if (_pendingEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS mcp_pending_actions (
      id text PRIMARY KEY,
      clerk_user_id text,
      tool text,
      params jsonb,
      plan text,
      created_at timestamptz DEFAULT now(),
      executed_at timestamptz
    )
  `;
  _pendingEnsured = true;
}

interface PendingAction {
  id: string;
  clerk_user_id: string;
  tool: string;
  params: Record<string, unknown>;
  plan: string;
  executed_at: string | null;
}

async function savePlan(
  userId: string,
  tool: string,
  params: Record<string, unknown>,
  plan: string,
) {
  await ensurePendingTable();
  const id = "act_" + randomBytes(8).toString("hex");
  await sql`
    INSERT INTO mcp_pending_actions (id, clerk_user_id, tool, params, plan)
    VALUES (${id}, ${userId}, ${tool}, ${JSON.stringify(params)}::jsonb, ${plan})
  `;
  return text(
    plan +
      `\n\naction_id: ${id}\nPara ejecutar, llama de nuevo a ${tool} con confirm:true y action_id:"${id}".`,
  );
}

async function loadPlan(
  userId: string,
  tool: string,
  actionId: string,
): Promise<PendingAction | { error: string }> {
  await ensurePendingTable();
  const row = await queryOne<PendingAction>(
    "SELECT id, clerk_user_id, tool, params, plan, executed_at::text FROM mcp_pending_actions WHERE id = $1",
    [actionId],
  );
  if (!row) return { error: "action_id no encontrado. Genera un plan nuevo (llama sin confirm)." };
  if (row.clerk_user_id !== userId) return { error: "Ese plan no te pertenece." };
  if (row.tool !== tool) return { error: `Ese action_id es de otra tool (${row.tool}).` };
  if (row.executed_at) return { error: "Ese plan ya fue ejecutado. Genera uno nuevo si quieres repetir." };
  return row;
}

async function markExecuted(actionId: string): Promise<void> {
  await sql`UPDATE mcp_pending_actions SET executed_at = now() WHERE id = ${actionId}`;
}

const NO_GITHUB = "No tienes GitHub conectado. Conecta tu cuenta en vforge.site/app/integrations y vuelve a intentar.";
const NO_VERCEL = "No tienes Vercel conectado. Conecta tu cuenta en vforge.site/app/integrations y vuelve a intentar.";

/* ============================== ejecutores reales ============================== */

async function doCreateRepo(
  githubToken: string,
  p: { name: string; description?: string; private?: boolean },
): Promise<{ full_name: string; html_url: string }> {
  const octokit = githubClientFromToken(githubToken);
  const { data } = await octokit.request("POST /user/repos", {
    name: p.name,
    description: p.description ?? "",
    private: p.private !== false,
    auto_init: true,
  });
  return { full_name: data.full_name, html_url: data.html_url };
}

async function vercelApi<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `vercel ${res.status} en ${path}`);
  }
  return body as T;
}

async function doDeploy(
  vercelToken: string,
  repoFullName: string,
  projectName: string,
): Promise<{ project: string; url: string; deploymentId: string }> {
  // 1) crear/obtener proyecto conectado al repo
  let projectId: string;
  try {
    const proj = await vercelApi<{ id: string }>(vercelToken, "/v10/projects", {
      method: "POST",
      body: {
        name: projectName,
        framework: "nextjs",
        gitRepository: { type: "github", repo: repoFullName },
      },
    });
    projectId = proj.id;
  } catch (e) {
    // si ya existe, recuperarlo
    const proj = await vercelApi<{ id: string }>(
      vercelToken,
      `/v9/projects/${encodeURIComponent(projectName)}`,
    ).catch(() => null);
    if (!proj) throw e;
    projectId = proj.id;
  }

  // 2) repoId numérico de GitHub para gitSource
  const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}`);
  if (!ghRes.ok) throw new Error(`no pude leer el repo ${repoFullName} en GitHub (${ghRes.status})`);
  const gh = (await ghRes.json()) as { id: number; default_branch?: string };

  // 3) disparar deployment
  const dep = await vercelApi<{ id: string; url: string }>(
    vercelToken,
    "/v13/deployments?forceNew=1",
    {
      method: "POST",
      body: {
        name: projectName,
        project: projectId,
        target: "production",
        gitSource: { type: "github", repoId: gh.id, ref: gh.default_branch ?? "main" },
      },
    },
  );
  return { project: projectName, url: `https://${dep.url}`, deploymentId: dep.id };
}

/* ============================== knowledge_base helpers ============================== */

async function kbByTitlePrefix(prefix: string): Promise<string | null> {
  const row = await queryOne<{ content: string }>(
    "SELECT content FROM knowledge_base WHERE title ILIKE $1 ORDER BY created_at DESC LIMIT 1",
    [prefix + "%"],
  ).catch(() => null);
  return row?.content ?? null;
}

/**
 * brain_files no tiene columna `kind`; derivamos una categoría a partir del
 * prefijo del nombre para poder agrupar los resultados igual que knowledge_base.
 */
function brainKind(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith("roadmap")) return "roadmap";
  if (n.startsWith("leccion") || n.startsWith("lección")) return "lesson";
  if (n.startsWith("runbook")) return "runbook";
  if (n.startsWith("credencial") || n.startsWith("accesos") || n.startsWith("alias")) return "credential";
  if (n.startsWith("experto") || n.startsWith("curso") || n.startsWith("stack")) return "knowledge";
  if (n.startsWith("metodo") || n.startsWith("método") || n.includes("method")) return "method";
  return "memory";
}

/**
 * Nombres del brain que NUNCA debe ver un client (sólo el operador/admin):
 * credenciales, accesos, llaves, hosts. El conocimiento/método/memoria SÍ es
 * global y visible para cualquier token válido.
 */
const BRAIN_SENSITIVE = /credencial|secret|token|password|api[\s_-]?key|^accesos|^alias|ssh|superadmin/i;

/* ============================== contenido público ============================== */

const GETTING_STARTED = `# VForge — empieza aquí

VForge es una fábrica de aplicaciones operada por un agente (V): construye, despliega y mantiene apps por conversación. Tú describes lo que quieres; V conecta GitHub, Vercel, Neon, Stripe/Mercado Pago, Clerk y opera el ciclo completo.

## Cómo conectarte (MCP)
1. Entra a https://vforge.site e inicia sesión.
2. Genera tu token MCP: POST https://vforge.site/api/mcp/token (estando logueado). Se muestra UNA sola vez.
3. Configura tu cliente MCP:
   • URL:  https://vforge.site/api/mcp
   • Auth: Bearer <tu-token>
4. Llama \`help\` para ver las tools, o \`vforge_method\` para el método.
5. Para ver una sala: \`vforge_project_see\` con el project_id. Fotografía cada visor y lo guarda en documentos. \`vforge_project_context\` las vuelve a leer.

## Scopes
• Tu token te aísla a TU forge: sólo ves tus propios proyectos, pagos y apps.
• El operador (admin) ve todo; tú nunca ves datos de otro cliente.
• Sin token puedes usar las tools públicas (getting_started, vforge_method, help) en https://vforge.site/api/mcp/public.`;

const VFORGE_METHOD = `# El Método VForge (resumen)

## Las 3 capas de construcción
1. Capa 1 — prompt descriptivo a un generador visual (layout, copy, microinteracciones).
2. Capa 2 — JSX/CSS literal para componentes icónicos donde la geometría debe ser exacta.
3. Capa 3 — código directo en el repo (configs, refactors cross-file, CI, docs, git ops).

## Anillos de privilegio (cuándo avisar, no pedir permiso)
• Anillo 0 — sólo lectura: ejecuta directo.
• Anillo 1 — escritura en repo: ejecuta directo.
• Anillo 2 — infra (deploy, env vars, DNS): ejecuta directo.
• Anillo 3 — irreversible de gran blast radius: ejecuta y avisa en la misma respuesta.

## Stack validado
Next.js (App Router) + TypeScript + Tailwind + Clerk (auth) + Neon (Postgres serverless) + Vercel (deploy) + Stripe/Mercado Pago (pagos). Todo se conecta por OAuth/API key y se opera por conversación.`;

function helpText(principal: McpPrincipal): string {
  const lines: string[] = [];
  lines.push("# VForge MCP — tools disponibles\n");
  lines.push("## Públicas (sin token / token public)");
  lines.push("• getting_started — qué es VForge y cómo conectarte.");
  lines.push("• vforge_method — el método VForge resumido.");
  lines.push("• help — esta ayuda.\n");
  lines.push("## De datos (requieren token admin|client; aisladas por tenant)");
  lines.push("• vforge_project_status — estado de tus proyectos.");
  lines.push("• vforge_project_feedback — observaciones y anclas de una sala.");
  lines.push("• vforge_project_context — código, referencias, CONTENIDO.md, archivos y fotos de los visores.");
  lines.push("• vforge_project_file — texto extraído de un ZIP privado, leído por fragmentos.");
  lines.push("• vforge_project_see — fotografía cada visor, lo guarda en documentos y lo devuelve. Incluye plugin Chrome.");
  lines.push("• vforge_navegador_see — ojos admin: fotografía la pestaña abierta del Chrome en Hetzner.");
  lines.push("• vforge_payments — avance financiero (total/pagado/pendiente).");
  lines.push("• vforge_apps_health — salud de despliegue de tus apps.");
  lines.push("• vforge_brain_search — memoria y método de VForge.");
  lines.push("• vforge_skill_list — skills disponibles.");
  lines.push("• vforge_integration_plan — qué servicios conectar para tu proyecto.");
  lines.push("• vforge_recommend_stack — stack técnico recomendado.");
  lines.push("• vforge_create_repo / vforge_deploy / vforge_scaffold_project — ejecutables (two-step).");
  lines.push("• vforge_execute_skill — ejecuta una skill (sólo operador).");
  lines.push("\n## De operador (fragua Vulcano — Owner/Associate, nunca public)");
  lines.push("• vulcano_taller_status — qué está pasando ahora en la empresa (jobs vivos + veredicto Grok).");
  lines.push("• vulcano_dispatch — encola un trabajo real a la fragua (auditado por userId).");
  lines.push("• vulcano_brain_module — lee la doctrina del Brain por módulo.");
  lines.push("• vulcano_salud — pulso de la fábrica: token, daemon y cola.");
  lines.push("• vulcano_boot — ARRANQUE: carga identidad Vulcano + proyectos + lecciones en una llamada.");
  lines.push("• vulcano_brain_exec — ejecuta shell en Hetzner desde el MCP (admin).");
  lines.push("• vulcano_brain_query — SQL en Neon Brain directo (admin).");
  lines.push("• vulcano_update_project — actualiza estado de proyecto en Brain (agentes).");
  lines.push("• vulcano_save_lesson — persiste lección/error/patrón en Brain (agentes).");
  lines.push("• vulcano_memory_search — búsqueda semántica en Brain (agentes).");
  const scopeName =
    principal.scope === "admin" ? "admin (operador — ves todo)" :
    principal.scope === "client" ? "client (ves SOLO tu forge)" :
    "public (sólo tools públicas)";
  lines.push(`\nTu scope actual: ${scopeName}.`);
  return lines.join("\n");
}

export async function authorizeMcpProject(projectId: string, principal: McpPrincipal) {
  if (isAdmin(principal)) {
    return queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM projects WHERE id = $1 LIMIT 1",
      [projectId],
    ).catch(() => null);
  }
  if (!principal.userId) return null;
  return queryOne<{ id: string; name: string }>(
    `SELECT p.id, p.name
       FROM projects p
      WHERE p.id = $1
        AND (
          p.org_id = $2
          OR EXISTS (
            SELECT 1 FROM project_live_members m
             WHERE m.project_id = p.id
               AND m.clerk_user_id = $3
               AND m.status = 'active'
               AND (m.expires_at IS NULL OR m.expires_at > now())
          )
        )
      LIMIT 1`,
    [projectId, principal.orgId, principal.userId],
  ).catch(() => null);
}

/* ============================== runMcpTool ============================== */

export async function runMcpTool(
  name: string,
  args: Record<string, unknown>,
  principal: McpPrincipal,
) {
  // --- Tools PÚBLICAS: sin datos privados, cualquier scope (incl. public) ---
  switch (name) {
    case "getting_started":
      return text(GETTING_STARTED);
    case "vforge_method":
      return text(VFORGE_METHOD);
    case "help":
      return text(helpText(principal));
  }

  // --- GATE de datos: todo lo demás exige admin|client. public/anon => 401. ---
  if (principal.scope !== "admin" && principal.scope !== "client") {
    return err(
      "401: esta tool requiere un token MCP válido (admin o client). " +
        "Genera el tuyo en https://vforge.site/api/mcp/token. " +
        "Sin token sólo puedes usar getting_started, vforge_method y help.",
    );
  }

  const userId = principal.userId ?? "";
  const isAdminScope = principal.scope === "admin";
  const orgId = principal.orgId; // null para admin (filtro deshabilitado)

  // Garantiza que las columnas org_id (aislamiento) existan antes de consultar.
  await ensureDatabaseHealed().catch(() => {});

  switch (name) {
    case "vforge_brain_search": {
      const q = String(args.query ?? "").slice(0, 300);
      if (!q) return err("Falta 'query'.");
      const like = "%" + q + "%";

      // 1) BRAIN GLOBAL (brain_files, en BRAIN_DATABASE_URL): el método, la
      //    memoria y el conocimiento del ecosistema. NO son datos de cliente:
      //    son visibles para CUALQUIER token válido (admin o client). Esto es
      //    lo que faltaba — antes sólo se consultaba knowledge_base (otra BD),
      //    así que memoria-vulcano / roadmap-v-mcp / etc. nunca aparecían.
      //    Lo único que se oculta a un client son los nombres SENSIBLES
      //    (credenciales, accesos, llaves, hosts); el operador los ve todos.
      const brainRows = await brainQueryAll<{ name: string; content: string }>(
        `SELECT name, content FROM brain_files
          WHERE name ILIKE $1 OR content ILIKE $1
          ORDER BY (name ILIKE $1) DESC, updated_at DESC
          LIMIT 20`,
        [like],
      ).catch(() => []);
      const brain = brainRows
        .filter((b) => isAdminScope || !BRAIN_SENSITIVE.test(b.name))
        .map((b) => ({ title: b.name, content: b.content, kind: brainKind(b.name), src: "brain" as const }));

      // 2) KNOWLEDGE_BASE (app DB): runbooks/decisiones/lecciones curados.
      //    AISLAMIENTO: admin ve todo; un client SOLO método/runbooks públicos
      //    — nunca perfil de operador, credenciales ni notas privadas.
      const kb = isAdminScope
        ? await queryAll<{ title: string; content: string; kind: string | null }>(
            "SELECT title, content, kind FROM knowledge_base WHERE content ILIKE $1 OR title ILIKE $1 ORDER BY created_at DESC LIMIT 12",
            [like],
          ).catch(() => [])
        : await queryAll<{ title: string; content: string; kind: string | null }>(
            `SELECT title, content, kind FROM knowledge_base
             WHERE (content ILIKE $1 OR title ILIKE $1)
               AND kind IN ('method', 'runbook', 'example', 'adr')
               AND title  NOT ILIKE '%credencial%' AND title  NOT ILIKE '%secret%'
               AND title  NOT ILIKE '%token%'      AND title  NOT ILIKE '%password%'
               AND title  NOT ILIKE '%api key%'
             ORDER BY created_at DESC LIMIT 12`,
            [like],
          ).catch(() => []);

      // El brain global va primero (memoria/método), luego los curados de la app.
      const combined = [
        ...brain,
        ...kb.map((k) => ({ title: k.title, content: k.content, kind: k.kind, src: "kb" as const })),
      ];

      // dedupe curados por título / inicio de contenido
      const seen = new Set<string>();
      const curated = combined.filter((k) => {
        const key = (k.title || k.content.slice(0, 80)).toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const KIND_LABEL: Record<string, string> = {
        memory: "Memoria",
        method: "Método",
        roadmap: "Roadmaps",
        knowledge: "Conocimiento",
        runbook: "Runbooks",
        adr: "Decisiones de arquitectura",
        decision: "Decisiones de arquitectura",
        lesson: "Lecciones",
        note: "Notas",
        credential: "Credenciales",
      };
      const groups = new Map<string, string[]>();
      for (const k of curated) {
        const label = KIND_LABEL[(k.kind ?? "").toLowerCase()] ?? "Otros";
        const line = `• [${k.title}] ${k.content.slice(0, 200).replace(/\s+/g, " ")} (${k.src})`;
        groups.set(label, [...(groups.get(label) ?? []), line]);
      }

      const sections: string[] = [];
      for (const order of ["Memoria", "Método", "Roadmaps", "Conocimiento", "Runbooks", "Decisiones de arquitectura", "Lecciones", "Notas", "Credenciales", "Otros"]) {
        const lines = groups.get(order);
        if (lines?.length) sections.push(`## ${order}\n${lines.join("\n")}`);
      }

      // crudos semánticos solo si hay pocos curados. AISLAMIENTO: la memoria
      // semántica (recall) cruza conversaciones; sólo el operador (admin) la
      // ve. Un client jamás recibe fragmentos de chats de otros.
      if (isAdminScope && curated.length < 3) {
        const hits = await recall(q, 6).catch(() => []);
        const raw: string[] = [];
        for (const h of hits as Array<{ content: string; score?: number }>) {
          const score = typeof h.score === "number" ? h.score : 1;
          if (score < 0.3) continue;
          const snippet = h.content.slice(0, 200).replace(/\s+/g, " ");
          const key = snippet.slice(0, 80).toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          raw.push(`• (fragmento de conversación, score ${score.toFixed(2)}) ${snippet}`);
          if (raw.length >= 3) break;
        }
        if (raw.length) sections.push(`## Fragmentos semánticos\n${raw.join("\n")}`);
      }

      return text(sections.join("\n\n") || "Sin resultados.");
    }

    case "vforge_skill_list": {
      const rows = await queryAll<{ name: string; description: string }>(
        "SELECT name, description FROM skills WHERE active = true ORDER BY name LIMIT 80",
      ).catch(() => []);
      return text(rows.map((r) => `• ${r.name} — ${r.description ?? ""}`).join("\n") || "Sin skills.");
    }

    case "vforge_integration_plan": {
      const { recommendFromScope } = await import("@/lib/integrations/recommend");
      const recs = recommendFromScope({
        appType: String(args.type ?? ""),
        features: Array.isArray(args.features) ? (args.features as string[]) : [],
      } as never);
      const { CATALOG } = await import("@/lib/integrations/catalog");

      const curated = await kbByTitlePrefix("MCP data: integration plan");
      if (curated) {
        const lines = recs.map((r: { id: string; why: string }, i: number) => {
          const c = CATALOG[r.id];
          return `${i + 1}. ${c?.name ?? r.id} — ${r.why || c?.why || ""}`;
        });
        return text(
          "Servicios recomendados para tu proyecto (en orden):\n" +
            lines.join("\n") +
            "\n\nDetalle por servicio (costos, pasos de cuenta y llaves):\n" +
            curated,
        );
      }

      const lines = recs.map((r: { id: string }) => {
        const c = CATALOG[r.id];
        return c ? `• ${c.name} — ${c.why}` : `• ${r.id}`;
      });
      return text("Tu proyecto necesita conectar:\n" + lines.join("\n"));
    }

    case "vforge_recommend_stack": {
      const curated = await kbByTitlePrefix("MCP data: stack recomendado");
      if (curated) return text(curated);
      return text(
        "Stack validado de VForge:\n• Next.js (App Router) + TypeScript — base sólida y SSR.\n• Tailwind — diseño rápido y consistente.\n• Clerk — autenticación (social login, passkeys) sin construir auth.\n• Neon (Postgres serverless) — base de datos.\n• Vercel — despliegue continuo y dominios.\n• Stripe / Mercado Pago — pagos.\nVForge conecta todo esto por OAuth/API key y opera por conversación.",
      );
    }

    case "vforge_project_status": {
      // AISLAMIENTO: admin ve todos los proyectos; client SOLO los de su
      // org_id. El filtro org_id se aplica en SQL — nunca se traen filas de
      // otro tenant para luego filtrarlas en memoria.
      const rows = isAdminScope
        ? await queryAll<{ name: string; category: string; status: string; vercel_url: string | null }>(
            "SELECT name, category, status, vercel_url FROM projects ORDER BY (category = 'produccion') DESC, delivery_priority DESC, name LIMIT 60",
          ).catch(() => [])
        : await queryAll<{ name: string; category: string; status: string; vercel_url: string | null }>(
            "SELECT name, category, status, vercel_url FROM projects WHERE org_id = $1 ORDER BY (category = 'produccion') DESC, delivery_priority DESC, name LIMIT 60",
            [orgId],
          ).catch(() => []);
      if (rows.length === 0) {
        return text(
          isAdminScope
            ? "Sin proyectos."
            : "No tienes proyectos en tu forge todavía. Crea uno desde tu workspace de VForge.",
        );
      }
      return text(rows.map((r) => `• ${r.name} [${r.category}] ${r.status} ${r.vercel_url ?? ""}`.trim()).join("\n"));
    }

    case "vforge_project_feedback": {
      const projectId = String(args.project_id ?? "").trim().slice(0, 160);
      if (!projectId) return err("Falta 'project_id'.");
      const requestedLimit = Number(args.limit ?? 40);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
        : 40;

      // El proyecto se autoriza ANTES de leer comentarios. Un client puede
      // entrar por ser dueño de su tenant o por una membresía live activa.
      // Nunca se acepta email/org desde args: la identidad sale del token MCP.
      const project = await authorizeMcpProject(projectId, principal);

      if (!project) {
        return err("Proyecto no encontrado o sin acceso para este token MCP.");
      }

      const { ensureCommentTasksTable } = await import("@/lib/live/comment-tasks");
      await ensureCommentTasksTable();
      const rows = await queryAll<{
        id: string;
        author_email: string;
        author_name: string | null;
        body: string;
        anchor: Record<string, unknown> | null;
        created_at: string;
        task_id: string | null;
        task_status: string | null;
        task_result: string | null;
      }>(
        `SELECT c.id, c.author_email, c.author_name, c.body, c.anchor, c.created_at,
                task.id AS task_id, task.status AS task_status,
                task.result_summary AS task_result
           FROM project_comments c
           LEFT JOIN LATERAL (
             SELECT t.id, t.status, t.result_summary
               FROM project_comment_tasks t
              WHERE t.project_id = c.project_id AND t.comment_id = c.id
              ORDER BY t.created_at DESC
              LIMIT 1
           ) task ON true
          WHERE c.project_id = $1
          ORDER BY c.created_at DESC
          LIMIT $2`,
        [project.id, limit],
      ).catch(() => []);

      if (rows.length === 0) {
        return text(`# Feedback — ${project.name}\n\nAún no hay observaciones en esta sala.`);
      }

      const items = rows.map((row, index) => {
        const author = row.author_name?.trim() || row.author_email;
        const task = row.task_status
          ? `tarea ${row.task_status}${row.task_id ? ` (${row.task_id})` : ""}`
          : "observación abierta";
        const result = row.task_result ? `\nResultado: ${row.task_result}` : "";
        const anchor = row.anchor
          ? `\nAncla: ${String(row.anchor.viewport ?? "vista")} · ${String(row.anchor.label ?? "")} · ${Math.round(Number(row.anchor.x ?? 0) * 100)}%, ${Math.round(Number(row.anchor.y ?? 0) * 100)}% · ${String(row.anchor.url ?? "")}${row.anchor.selector ? ` · ${String(row.anchor.selector)}` : ""}`
          : "";
        return `${index + 1}. [${row.created_at}] ${author}\nEstado: ${task}\nID: ${row.id}${anchor}\n${row.body}${result}`;
      });
      return text(
        `# Feedback — ${project.name} (${project.id})\n\n` +
          `${rows.length} observación(es), más recientes primero.\n\n` +
          items.join("\n\n"),
      );
    }

    case "vforge_project_context": {
      const projectId = String(args.project_id ?? "").trim().slice(0, 160);
      if (!projectId) return err("Falta 'project_id'.");
      const allowed = await authorizeMcpProject(projectId, principal);
      if (!allowed) return err("Proyecto no encontrado o sin acceso para este token MCP.");

      const [project, integrations, repositories, document, assets, references, visors] = await Promise.all([
        queryOne<{
          id: string; name: string; description: string | null; github_repo: string | null;
          github_default_branch: string | null; github_url: string | null; vercel_url: string | null;
          domain: string | null; status: string; last_audit_score: number | null; last_audit_at: string | null;
        }>(
          `SELECT id, name, description, github_repo, github_default_branch, github_url,
                  vercel_url, domain, status, last_audit_score, last_audit_at
             FROM projects WHERE id = $1 LIMIT 1`,
          [projectId],
        ),
        queryAll<{ kind: string; label: string; status: string }>(
          "SELECT kind, label, status FROM project_integrations WHERE project_id = $1 ORDER BY kind",
          [projectId],
        ).catch(() => []),
        queryAll<{ repo_full_name: string; role: string; is_primary: boolean; default_branch: string | null }>(
          `SELECT repo_full_name, role, is_primary, default_branch
             FROM project_repositories
            WHERE project_id = $1
            ORDER BY is_primary DESC, role, repo_full_name`,
          [projectId],
        ).catch(() => []),
        queryOne<{ content: string; updated_by: string; updated_at: string }>(
          "SELECT content, updated_by, updated_at FROM project_context_documents WHERE project_id = $1 LIMIT 1",
          [projectId],
        ).catch(() => null),
        queryAll<{ id: string; filename: string; size_bytes: number; extracted_text_bytes: number; created_at: string }>(
          `SELECT id, filename, size_bytes, extracted_text_bytes, created_at
             FROM project_context_assets WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50`,
          [projectId],
        ).catch(() => []),
        queryAll<{ label: string; url: string; kind: string; notes: string }>(
          `SELECT label, url, kind, notes
             FROM project_references
            WHERE project_id = $1
            ORDER BY created_at DESC
            LIMIT 20`,
          [projectId],
        ).catch(() => []),
        import("@/lib/live/project-eyes").then((mod) => mod.listVisorEyes(projectId)).catch(() => []),
      ]);
      if (!project) return err("Proyecto no encontrado.");
      const { readPublicPages } = await import("@/lib/live/load-page-text");
      const pages = references.length
        ? await readPublicPages(references.map((item) => item.url)).catch(() => [])
        : [];
      const integrationsText = integrations.length
        ? integrations.map((item) => `• ${item.label} (${item.kind}): ${item.status}`).join("\n")
        : "• Sin integraciones registradas.";
      const repositoriesText = repositories.length
        ? repositories
            .map((item) => `• ${item.repo_full_name} · ${item.role}${item.is_primary ? " · principal" : ""} · rama ${item.default_branch ?? "sin definir"}`)
            .join("\n")
        : `• ${project.github_repo ?? "Sin repositorios enlazados."}`;
      const assetsText = assets.length
        ? assets.map((item) => `• ${item.filename} · id ${item.id} · ${item.size_bytes} bytes · texto extraído ${item.extracted_text_bytes} bytes`).join("\n")
        : "• Sin archivos de contexto.";
      const referencesText = references.length
        ? references
            .map((item) => {
              const notes = item.notes?.trim() ? ` — ${item.notes.trim()}` : "";
              return `• [${item.kind}] ${item.label}: ${item.url}${notes}`;
            })
            .join("\n")
        : "• Sin URLs de referencia.";
      const visorsText = visors.length
        ? visors
            .map((item) => `• ${item.note || item.viewport} · ${item.url || "sin url"} · ${item.created_at}`)
            .join("\n")
        : "• Sin fotos de visor todavía. Usa vforge_project_see o el botón Fotografiar visores.";
      const pagesText = !references.length
        ? "• No hay URLs que leer."
        : pages.length
          ? pages
              .map((page) => {
                const title = page.title?.trim() ? ` — ${page.title.trim()}` : "";
                const body = page.text.trim().slice(0, 1600);
                return `### ${page.url}${title}\n${body}`;
              })
              .join("\n\n")
          : "• No se pudo leer el HTML público de las referencias.";
      return {
        content: [
          {
            type: "text",
            text:
              `# Contexto — ${project.name} (${project.id})\n\n` +
              `## Código y publicación\nEstado: ${project.status}\nRepo principal: ${project.github_repo ?? "sin repo"}\nRama principal: ${project.github_default_branch ?? "sin rama"}\nGitHub: ${project.github_url ?? "sin URL"}\nVercel: ${project.vercel_url ?? "sin URL"}\nDominio: ${project.domain ?? "sin dominio"}\nAuditoría: ${project.last_audit_score ?? "sin score"} · ${project.last_audit_at ?? "sin fecha"}\n\n` +
              `## Grupo de repositorios\n${repositoriesText}\n\n` +
              `## Integraciones\n${integrationsText}\n\n` +
              `## URLs de referencia\n${referencesText}\n\n` +
              `## Contenido leído de las URLs\n${pagesText}\n\n` +
              `## CONTENIDO.md\n${document?.content?.trim() || project.description || "Sin contenido documentado todavía."}\n\n` +
              `## Archivos privados\n${assetsText}\n\n` +
              `## Visores (documentos)\n${visorsText}\n\n` +
              `Usa vforge_project_file con project_id + asset_id para leer el texto extraído. Usa vforge_project_feedback para las anotaciones. Usa vforge_project_see para fotografiar los visores y guardarlos en documentos.`,
          },
          ...visors.map((item) => ({
            type: "image",
            data: item.data_b64,
            mimeType: item.mime_type,
          })),
        ],
      };
    }

    case "vforge_project_file": {
      const projectId = String(args.project_id ?? "").trim().slice(0, 160);
      const assetId = String(args.asset_id ?? "").trim();
      if (!projectId || !/^[0-9a-f-]{36}$/i.test(assetId)) return err("Falta project_id o asset_id válido.");
      const allowed = await authorizeMcpProject(projectId, principal);
      if (!allowed) return err("Proyecto no encontrado o sin acceso para este token MCP.");
      const requestedOffset = Number(args.offset ?? 0);
      const requestedLimit = Number(args.limit ?? 20_000);
      const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0;
      const limit = Number.isFinite(requestedLimit) ? Math.min(40_000, Math.max(1, Math.floor(requestedLimit))) : 20_000;
      const asset = await queryOne<{ filename: string; extracted_text: string }>(
        `SELECT filename, extracted_text FROM project_context_assets
          WHERE project_id = $1 AND id = $2 LIMIT 1`,
        [projectId, assetId],
      ).catch(() => null);
      if (!asset) return err("Archivo no encontrado o sin acceso.");
      const total = asset.extracted_text.length;
      const chunk = asset.extracted_text.slice(offset, offset + limit);
      const nextOffset = offset + chunk.length < total ? offset + chunk.length : null;
      return text(
        `# ${asset.filename}\nProyecto: ${allowed.name} (${projectId})\n` +
        `Fragmento: ${offset}-${offset + chunk.length} de ${total}\n` +
        `Siguiente offset: ${nextOffset ?? "fin"}\n\n${chunk || "[El ZIP no contenía texto legible compatible.]"}`,
      );
    }

    case "vforge_project_see": {
      const projectId = String(args.project_id ?? "").trim().slice(0, 160);
      if (!projectId) return err("Falta 'project_id'.");
      const allowed = await authorizeMcpProject(projectId, principal);
      if (!allowed) return err("Proyecto no encontrado o sin acceso para este token MCP.");
      const { getProjectViewports } = await import("@/lib/projects/live-portal");
      const { captureSeeViewports, parseSeeViewports, mcpSeeResult, SEE_VIEWPORTS } = await import(
        "@/lib/live/see-page"
      );
      const { listProjectEyes, listVisorEyes } = await import("@/lib/live/project-eyes");
      const { persistVisorShots } = await import("@/lib/live/photograph-visors");
      const project = await getProjectViewports(projectId);
      if (!project) return err("Proyecto no encontrado.");
      const viewports = parseSeeViewports(args.viewport ?? args.viewports);
      const [captured, pluginEyes, storedVisors] = await Promise.all([
        captureSeeViewports({
          desktop_url: project.desktop_url,
          mobile_url: project.mobile_url,
          admin_url: project.admin_url,
          viewports,
          preferCdp: isAdminScope,
        }),
        listProjectEyes(projectId, 4),
        listVisorEyes(projectId),
      ]);
      await persistVisorShots(projectId, captured.shots);
      const seen = new Set(captured.shots.map((shot) => shot.viewport));
      for (const eye of storedVisors) {
        const viewport = eye.viewport === "mobile" || eye.viewport === "admin" ? eye.viewport : "desktop";
        if (seen.has(viewport) || !viewports.includes(viewport)) continue;
        captured.shots.push({
          viewport,
          label: SEE_VIEWPORTS[viewport].label,
          url: eye.url || "",
          mimeType: eye.mime_type,
          data: eye.data_b64,
        });
        seen.add(viewport);
      }
      for (const eye of pluginEyes) {
        captured.shots.push({
          viewport: "desktop",
          label: eye.note ? `Plugin: ${eye.note}` : "Plugin Chrome",
          url: eye.url || project.desktop_url || "",
          mimeType: eye.mime_type,
          data: eye.data_b64,
          engine: "plugin",
        });
      }
      return mcpSeeResult(allowed.name, projectId, captured);
    }

    case "vforge_navegador_see": {
      if (!isAdminScope) return err("Sólo el owner usa el Navegador Pro.");
      try {
        const { captureNavegadorCurrent, mcpSeeResult } = await import("@/lib/live/see-page");
        const shot = await captureNavegadorCurrent();
        shot.label = "Pestaña abierta — Navegador Pro";
        return mcpSeeResult("Navegador Pro", "navegador", { shots: [shot], failures: [] });
      } catch (error) {
        return err(error instanceof Error ? error.message : "Navegador Pro no respondió");
      }
    }

    case "vforge_payments": {
      // AISLAMIENTO: admin ve todos los pagos; client SOLO los de su org_id.
      const rows = isAdminScope
        ? await queryAll<{ client_name: string; status: string; total_mxn: number; paid_mxn: number; next_milestone: string | null }>(
            "SELECT client_name, status, total_mxn, paid_mxn, next_milestone FROM client_project_status ORDER BY client_name LIMIT 100",
          ).catch(() => [])
        : await queryAll<{ client_name: string; status: string; total_mxn: number; paid_mxn: number; next_milestone: string | null }>(
            "SELECT client_name, status, total_mxn, paid_mxn, next_milestone FROM client_project_status WHERE org_id = $1 ORDER BY client_name LIMIT 100",
            [orgId],
          ).catch(() => []);
      if (rows.length === 0) {
        return text(isAdminScope ? "Sin pagos registrados." : "No hay pagos en tu forge todavía.");
      }
      const fmt = (n: number) => "$" + Number(n).toLocaleString("es-MX");
      const lines = rows.map((r) => {
        const pend = Number(r.total_mxn) - Number(r.paid_mxn);
        return `• ${r.client_name} [${r.status}] total ${fmt(r.total_mxn)} · pagado ${fmt(r.paid_mxn)} · pendiente ${fmt(pend)}${r.next_milestone ? ` · próximo: ${r.next_milestone}` : ""}`;
      });
      return text(lines.join("\n"));
    }

    case "vforge_apps_health": {
      // AISLAMIENTO: admin ve la salud de todas las apps; client SOLO su org_id.
      const rows = isAdminScope
        ? await queryAll<{ name: string; status: string; category: string; vercel_url: string | null; last_audit_score: number | null }>(
            "SELECT name, status, category, vercel_url, last_audit_score FROM projects ORDER BY (category = 'produccion') DESC, delivery_priority DESC, name LIMIT 100",
          ).catch(() => [])
        : await queryAll<{ name: string; status: string; category: string; vercel_url: string | null; last_audit_score: number | null }>(
            "SELECT name, status, category, vercel_url, last_audit_score FROM projects WHERE org_id = $1 ORDER BY (category = 'produccion') DESC, delivery_priority DESC, name LIMIT 100",
            [orgId],
          ).catch(() => []);
      if (rows.length === 0) {
        return text(isAdminScope ? "Sin apps registradas." : "No tienes apps en tu forge todavía.");
      }
      const icon: Record<string, string> = { live: "🟢", building: "🟡", error: "🔴", idle: "⚪", unknown: "⚫" };
      const lines = rows.map(
        (r) => `${icon[r.status] ?? "⚫"} ${r.name} — ${r.status}${r.last_audit_score != null ? ` (score ${r.last_audit_score})` : ""} ${r.vercel_url ?? ""}`.trim(),
      );
      return text(lines.join("\n"));
    }

    /* ---------------------- ejecutables con gate ---------------------- */

    case "vforge_create_repo": {
      const repoName = String(args.name ?? "").trim();
      const confirm = args.confirm === true;

      if (!confirm) {
        if (!repoName) return err("Falta 'name'.");
        const access = await resolveAccessForUser(userId);
        if (!access.githubToken) return err(NO_GITHUB);
        const priv = args.private !== false;
        const plan =
          `PLAN — vforge_create_repo\n` +
          `Voy a crear un repositorio GitHub real con TU token:\n` +
          `• Nombre: ${repoName}\n` +
          `• Visibilidad: ${priv ? "privado" : "público"}\n` +
          `• Descripción: ${String(args.description ?? "(sin descripción)")}\n` +
          `• Inicializado con README (auto_init).`;
        return savePlan(userId, name, {
          name: repoName,
          description: args.description ?? "",
          private: priv,
        }, plan);
      }

      const pend = await loadPlan(userId, name, String(args.action_id ?? ""));
      if ("error" in pend) return err(pend.error);
      const access = await resolveAccessForUser(userId);
      if (!access.githubToken) return err(NO_GITHUB);
      const p = pend.params as { name: string; description?: string; private?: boolean };
      const repo = await doCreateRepo(access.githubToken, p);
      await markExecuted(pend.id);
      return text(`Repo creado: ${repo.full_name}\n${repo.html_url}`);
    }

    case "vforge_deploy": {
      const repoFullName = String(args.repo_full_name ?? "").trim();
      const confirm = args.confirm === true;

      if (!confirm) {
        if (!repoFullName.includes("/")) return err("Falta 'repo_full_name' (formato owner/repo).");
        const access = await resolveAccessForUser(userId);
        if (!access.vercelToken) return err(NO_VERCEL);
        const projectName = String(args.project_name ?? repoFullName.split("/")[1]);
        const plan =
          `PLAN — vforge_deploy\n` +
          `Voy a publicar el repo en Vercel con TU token:\n` +
          `• Repo GitHub: ${repoFullName}\n` +
          `• Proyecto Vercel: ${projectName} (lo creo si no existe, conectado al repo)\n` +
          `• Deployment: production, rama default del repo.`;
        return savePlan(userId, name, { repo_full_name: repoFullName, project_name: projectName }, plan);
      }

      const pend = await loadPlan(userId, name, String(args.action_id ?? ""));
      if ("error" in pend) return err(pend.error);
      const access = await resolveAccessForUser(userId);
      if (!access.vercelToken) return err(NO_VERCEL);
      const p = pend.params as { repo_full_name: string; project_name: string };
      const out = await doDeploy(access.vercelToken, p.repo_full_name, p.project_name);
      await markExecuted(pend.id);
      return text(`Deployment disparado.\n• Proyecto: ${out.project}\n• URL: ${out.url}\n• Deployment id: ${out.deploymentId}`);
    }

    case "vforge_scaffold_project": {
      const projName = String(args.name ?? "").trim();
      const confirm = args.confirm === true;
      const scope = (args.scope ?? {}) as { appType?: string; features?: string[] };

      const { recommendFromScope } = await import("@/lib/integrations/recommend");
      const { CATALOG } = await import("@/lib/integrations/catalog");
      const recs = recommendFromScope({
        appType: String(scope.appType ?? ""),
        features: Array.isArray(scope.features) ? scope.features : [],
      } as never);
      const extras = recs.filter((r: { id: string }) => !["github", "vercel", "domain"].includes(r.id));
      const extrasNames = extras.map((r: { id: string }) => CATALOG[r.id]?.name ?? r.id);

      if (!confirm) {
        if (!projName) return err("Falta 'name'.");
        const access = await resolveAccessForUser(userId);
        if (!access.githubToken) return err(NO_GITHUB);
        if (!access.vercelToken) return err(NO_VERCEL);
        const plan =
          `PLAN — vforge_scaffold_project\n` +
          `Voy a montar el andamiaje del proyecto "${projName}":\n` +
          `1. Crear repo GitHub privado "${projName}" con tu token (auto_init).\n` +
          `2. Crear proyecto Vercel "${projName}" conectado a ese repo y disparar deployment.\n` +
          `3. Integraciones recomendadas a configurar después: ${extrasNames.join(", ") || "ninguna extra"} (sus llaves quedan PENDIENTES de conectar — no invento valores).`;
        return savePlan(userId, name, { name: projName, scope }, plan);
      }

      const pend = await loadPlan(userId, name, String(args.action_id ?? ""));
      if ("error" in pend) return err(pend.error);
      const access = await resolveAccessForUser(userId);
      if (!access.githubToken) return err(NO_GITHUB);
      if (!access.vercelToken) return err(NO_VERCEL);
      const p = pend.params as { name: string };
      const repo = await doCreateRepo(access.githubToken, { name: p.name, private: true, description: "Proyecto creado por VForge" });
      const dep = await doDeploy(access.vercelToken, repo.full_name, p.name);
      await markExecuted(pend.id);
      return text(
        `Proyecto montado.\n• repo_url: ${repo.html_url}\n• vercel_project: ${dep.project} (${dep.url})\n• integraciones pendientes de conectar: ${extrasNames.join(", ") || "ninguna"}`,
      );
    }

    case "vforge_execute_skill": {
      const skillName = String(args.skill_name ?? "").trim();
      const confirm = args.confirm === true;

      const access = await resolveAccessForUser(userId);
      if (!access.isOwner) return text("vforge_execute_skill está disponible próximamente para usuarios. Por ahora es exclusiva del operador.");

      if (!confirm) {
        if (!skillName) return err("Falta 'skill_name'.");
        const skill = await queryOne<{ name: string; description: string | null }>(
          "SELECT name, description FROM skills WHERE name ILIKE $1 ORDER BY name LIMIT 1",
          ["%" + skillName + "%"],
        ).catch(() => null);
        if (!skill) return err(`No encontré la skill "${skillName}".`);
        const plan =
          `PLAN — vforge_execute_skill\n` +
          `Voy a ejecutar la skill "${skill.name}" vía Claude Code en el servidor (timeout 300s):\n` +
          `• Skill: ${skill.name} — ${skill.description ?? ""}\n` +
          `• Instrucciones extra: ${String(args.instructions ?? "(ninguna)")}`;
        return savePlan(userId, name, { skill_name: skill.name, instructions: args.instructions ?? "" }, plan);
      }

      const pend = await loadPlan(userId, name, String(args.action_id ?? ""));
      if ("error" in pend) return err(pend.error);
      const p = pend.params as { skill_name: string; instructions?: string };
      const skill = await queryOne<{ name: string; system_prompt: string | null; description: string | null }>(
        "SELECT name, system_prompt, description FROM skills WHERE name ILIKE $1 ORDER BY name LIMIT 1",
        ["%" + p.skill_name + "%"],
      ).catch(() => null);
      if (!skill) return err(`La skill "${p.skill_name}" ya no existe.`);
      const instruction =
        `Ejecuta la skill "${skill.name}" de VForge.\n\n` +
        `SYSTEM PROMPT DE LA SKILL:\n${skill.system_prompt ?? skill.description ?? ""}\n\n` +
        (p.instructions ? `INSTRUCCIONES DEL USUARIO:\n${p.instructions}\n` : "");
      const { callVServer } = await import("@/lib/forge/v-server");
      const res = await callVServer(
        "/claude",
        { instruction, timeout_seconds: 300 },
        { timeoutMs: 310_000 },
      );
      await markExecuted(pend.id);
      if (!res.ok) return err(`La ejecución falló: ${res.error ?? "error desconocido"}`);
      const out = typeof res.body === "string" ? res.body : JSON.stringify(res.body);
      return text(`Skill "${skill.name}" ejecutada.\n\nOutput (resumido):\n${out.slice(0, 2000)}`);
    }

    /* ---------------------- operador (fragua Vulcano) ---------------------- */
    /* Gate Owner/Associate: ya cubierto por el GATE de datos de arriba (admin|client). */

    case "vulcano_taller_status": {
      const { tallerStatus } = await import("@/lib/vulcano/operator");
      let st;
      try {
        st = await tallerStatus();
      } catch (e) {
        return err(`No pude leer la cola de la fragua: ${e instanceof Error ? e.message : "error desconocido"}`);
      }
      const fmtJob = (j: (typeof st.running)[number]) => {
        const head = `• #${j.id} [${j.agent ?? "—"}] ${j.task ?? "(sin descripción)"}`;
        const meta = [
          j.progress != null ? `${j.progress}%` : null,
          j.source ? `src:${j.source}` : null,
          j.grokVerdict ? `Grok:${j.grokVerdict}` : null,
        ].filter(Boolean).join(" · ");
        const log = j.logTail ? `\n    ${j.logTail.replace(/\n/g, "\n    ")}` : "";
        return meta ? `${head}\n    ${meta}${log}` : `${head}${log}`;
      };
      const sections: string[] = [];
      sections.push(
        `# Taller Vulcano — qué está pasando ahora\nCorriendo: ${st.counts.running} · En cola: ${st.counts.pending} · Activos totales: ${st.counts.total}`,
      );
      if (st.running.length) sections.push(`## 🔨 Corriendo (${st.running.length})\n${st.running.map(fmtJob).join("\n")}`);
      if (st.pending.length) sections.push(`## ⏳ En cola (${st.pending.length})\n${st.pending.map(fmtJob).join("\n")}`);
      if (st.recent.length) {
        const lines = st.recent.map((j) => {
          const v = j.grokVerdict ? ` · Grok:${j.grokVerdict}` : "";
          return `• #${j.id} [${j.agent ?? "—"}] ${j.status} — ${j.task ?? ""}${v}`;
        });
        sections.push(`## ✅ Cerrados recientes (2h)\n${lines.join("\n")}`);
      }
      if (!st.running.length && !st.pending.length && !st.recent.length) {
        sections.push("La fragua está en reposo: sin jobs corriendo, en cola ni cerrados en las últimas 2h.");
      }
      return text(sections.join("\n\n"));
    }

    case "vulcano_dispatch": {
      const prompt = String(args.prompt ?? "").trim();
      if (!prompt) return err("Falta 'prompt' (la tarea a ejecutar).");
      const ALLOWED = ["claude", "codex", "grok", "shell", "browser"];
      let agent = String(args.agent ?? "claude").trim().toLowerCase();
      if (!ALLOWED.includes(agent)) agent = "claude";
      let priority = Number(args.priority ?? 5);
      if (!Number.isFinite(priority)) priority = 5;
      priority = Math.max(1, Math.min(100, Math.round(priority)));
      // AUDITORÍA: el source SIEMPRE registra el userId de Clerk — quién ordenó.
      const source = `mcp:${userId || "unknown"}`;
      const { dispatchJob } = await import("@/lib/vulcano/operator");
      let res;
      try {
        res = await dispatchJob({ agent, prompt, priority, source });
      } catch (e) {
        return err(`No pude encolar el trabajo: ${e instanceof Error ? e.message : "error desconocido"}`);
      }
      return text(
        `Trabajo encolado en la fragua.\n• id de cola: #${res.id}\n• agente: ${agent}\n• prioridad: ${priority}\n• source (auditoría): ${source}\nSigue su avance con vulcano_taller_status.`,
      );
    }

    case "v_instruct": {
      // Claude → V (cerebro orquestador) → router de intent → agente correcto.
      // SOLO admin (Owner). Habla con el endpoint /v/chat-full que ya enruta.
      if (!isAdmin(principal)) return err("401: v_instruct es solo para el Owner (admin). Tu token no tiene ese nivel.");
      const message = String((args as Record<string, unknown>).message || "").trim();
      if (!message) return err("Falta 'message' (la instrucción para V).");
      if (message.length > 4000) return err("message demasiado largo (max 4000 chars).");
      const session_id = String((args as Record<string, unknown>).session_id || "claude-mcp").trim() || "claude-mcp";
      const BRAIN = "http://178.105.135.26";
      const SECRET = process.env.BRAIN_SECRET || process.env.HETZNER_SECRET || "superclaude2025";
      try {
        const r = await fetch(`${BRAIN}/v/chat-full`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: SECRET, message, session_id }),
          signal: AbortSignal.timeout(120000),
        });
        if (!r.ok) return err(`V no respondió: HTTP ${r.status}`);
        const d = (await r.json()) as { reply?: string; intent?: string };
        const intent = d.intent && d.intent !== "v" ? d.intent : null;
        const head = intent ? `V despachó a ${intent.toUpperCase()} ✓ (job en dispatch_queue)` : "V respondió directamente";
        return text(`${head}\n\n${d.reply || "(sin texto)"}`);
      } catch (e: unknown) {
        return err(`Timeout o error hablando con V: ${String(e).slice(0, 120)}`);
      }
    }

    case "vulcano_brain_module": {
      const { BRAIN_MODULES, isBrainModule, readBrainModule } = await import("@/lib/vulcano/operator");
      const moduleName = String(args.name ?? "").trim().toLowerCase();
      if (!moduleName) {
        return text(
          "Módulos de doctrina del Brain disponibles (pasa 'name'):\n" +
            BRAIN_MODULES.map((m) => `• ${m}`).join("\n"),
        );
      }
      if (!isBrainModule(moduleName)) {
        return err(
          `Módulo "${moduleName}" no reconocido. Válidos: ${BRAIN_MODULES.join(", ")}.`,
        );
      }
      const content = await readBrainModule(moduleName);
      if (!content) return err(`No pude leer el módulo "${moduleName}" del Brain (relay sin respuesta).`);
      return text(`# Módulo Brain: ${moduleName}\n\n${content}`);
    }

    case "vulcano_salud": {
      const { saludFabrica } = await import("@/lib/vulcano/operator");
      const s = await saludFabrica();
      const lines: string[] = ["# Salud de la fábrica"];
      if (s.tokenHealth) {
        const h = s.tokenHealth.hoursLeft;
        const icon = h == null ? "⚪" : h < 1 ? "🔴" : h < 3 ? "🟡" : "🟢";
        lines.push(
          `${icon} Token: ${s.tokenHealth.status ?? "?"}${h != null ? ` · ${h}h restantes` : ""}${s.tokenHealth.checkedAt ? ` (checado ${s.tokenHealth.checkedAt})` : ""}`,
        );
      } else {
        lines.push("⚫ Token: sin lectura (relay sin respuesta).");
      }
      if (s.daemon) {
        lines.push(
          `${s.daemon.vulcanoAlive ? "🟢" : "🔴"} Daemon Vulcano: ${s.daemon.vulcanoAlive ? "vivo" : "caído"} · claude_loop: ${s.daemon.claudeLoopAlive ? "vivo" : "caído"}`,
        );
      } else {
        lines.push("⚫ Daemon: sin lectura (relay sin respuesta).");
      }
      lines.push(`📋 Cola: ${s.queue.running} corriendo · ${s.queue.pending} en cola · ${s.queue.total} activos`);
      lines.push(`🔌 Relay: ${s.relayUp ? "arriba" : "sin respuesta"}`);
      return text(lines.join("\n"));
    }

  // ═══════════════════════════════════════════════════════════════
  // VULCANO AGENT TOOLS — arranque real para agentes autónomos
  // Agregado 2026-06-15. Scope: admin (operador) solamente.
  // ═══════════════════════════════════════════════════════════════

  case "vulcano_boot": {
    // Carga contexto completo de identidad + proyectos activos + estado daemon
    // Es el PRIMER tool que llama cualquier agente al conectarse al MCP.
    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    // 1. boot-context
    let bootCtx = "";
    try {
      const r = await fetch(`${BRAIN}/brain/file/boot-context.md`, {
        headers: { "x-secret": SECRET },
        signal: AbortSignal.timeout(8000),
      });
      bootCtx = r.ok ? await r.text() : `[boot-context error: ${r.status}]`;
    } catch (e: unknown) {
      bootCtx = `[boot-context timeout: ${String(e).slice(0, 80)}]`;
    }

    // 2. Proyectos activos del Brain
    let projectsStr = "";
    try {
      const qr = await fetch(`${BRAIN}/brain/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: SECRET,
          query:
            "SELECT id, name, domain, phase, last_action, next_step, blocked FROM projects WHERE active=true ORDER BY updated_at DESC LIMIT 15",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (qr.ok) {
        const qd = await qr.json();
        const rows = JSON.parse(qd.stdout).rows as Record<string, string>[];
        projectsStr = rows
          .map(
            (p) =>
              `• [${p.id}] ${p.name} | ${p.phase} | domain: ${p.domain || "-"}\n` +
              `  last: ${(p.last_action || "-").slice(0, 120)}\n` +
              `  next: ${p.next_step || "-"}\n` +
              (p.blocked ? `  ⚠️ BLOCKER: ${p.blocked}\n` : ""),
          )
          .join("\n");
      }
    } catch (e: unknown) {
      projectsStr = `[projects query error: ${String(e).slice(0, 80)}]`;
    }

    // 3. Últimas lecciones (errores + aciertos recientes)
    let lessonsStr = "";
    try {
      const lr = await fetch(`${BRAIN}/brain/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: SECRET,
          query:
            "SELECT type, area, lesson FROM lessons ORDER BY ts DESC LIMIT 8",
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (lr.ok) {
        const ld = await lr.json();
        const rows = JSON.parse(ld.stdout).rows as Record<string, string>[];
        lessonsStr = rows
          .map((l) => `[${l.type}/${l.area}] ${l.lesson.slice(0, 120)}`)
          .join("\n");
      }
    } catch {
      lessonsStr = "[lecciones no disponibles]";
    }

    // 4. Ritual de arranque (identidad Vulcano)
    let ritual = "";
    try {
      const rr = await fetch(`${BRAIN}/brain/file/modulos/ritual-arranque-vulcano.md`, {
        headers: { "x-secret": SECRET },
        signal: AbortSignal.timeout(6000),
      });
      ritual = rr.ok ? (await rr.text()).slice(0, 2000) : "";
    } catch {
      ritual = "";
    }

    const output = [
      "# VULCANO BOOT — contexto de arranque cargado",
      "",
      "## IDENTIDAD",
      ritual,
      "",
      "## PROYECTOS ACTIVOS",
      projectsStr || "(sin proyectos)",
      "",
      "## LECCIONES RECIENTES",
      lessonsStr,
      "",
      "## BOOT CONTEXT (extracto)",
      bootCtx.slice(0, 3000),
      "",
      "---",
      "Contexto cargado. Eres Vulcano. Ejecuta tu tarea.",
    ].join("\n");

    return text(output);
  }

  case "vulcano_brain_exec": {
    // Ejecuta un comando shell en Hetzner desde el MCP.
    // SOLO admin (Owner). Client y public: denegado.
    if (!isAdmin(principal)) return err("401: vulcano_brain_exec es solo para el Owner (admin). Tu token no tiene ese nivel.");
    const cmd = String((args as Record<string, unknown>).cmd || "").trim();
    const projectId = String((args as Record<string, unknown>).project_id || "");
    if (!cmd) return err("cmd requerido");
    if (cmd.length > 2000) return err("cmd demasiado largo (max 2000 chars)");

    // Blocklist básica de comandos destructivos
    const BLOCKED = ["rm -rf /", "mkfs", "dd if=", ":(){:|:&};:", "shutdown", "reboot"];
    if (BLOCKED.some((b) => cmd.includes(b))) return err("Comando bloqueado por seguridad.");

    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    try {
      const r = await fetch(`${BRAIN}/brain/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SECRET, cmd }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return err(`Brain exec error: ${r.status}`);
      const d = await r.json();
      const out = `STDOUT:\n${(d.stdout || "").slice(0, 3000)}\nSTDERR:\n${(d.stderr || "").slice(0, 500)}\nRC: ${d.returncode ?? "?"}`;

      // Auto-registrar en lessons si hay project_id
      if (projectId && d.returncode === 0) {
        try {
          await fetch(`${BRAIN}/brain/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret: SECRET,
              query: `INSERT INTO lessons (ts,project_id,type,area,lesson,source) VALUES (now(),$1,'acierto','shell',$2,'mcp-agent')`,
              params: [projectId, `CMD: ${cmd.slice(0, 200)} → RC:0`],
            }),
          });
        } catch {/* no fatal */}
      }

      return text(out);
    } catch (e: unknown) {
      return err(`Timeout o error de red: ${String(e).slice(0, 120)}`);
    }
  }

  case "vulcano_brain_query": {
    // Ejecuta SQL en Neon directamente desde el MCP.
    // SOLO admin (Owner). Client y public: denegado.
    if (!isAdmin(principal)) return err("401: vulcano_brain_query es solo para el Owner (admin). Tu token no tiene ese nivel.");
    const query = String((args as Record<string, unknown>).query || "").trim();
    const qparams = (args as Record<string, unknown>).params as unknown[] | undefined;
    if (!query) return err("query requerido");

    // Solo operaciones seguras
    const qUpper = query.toUpperCase().trimStart();
    const ALLOWED_OPS = ["SELECT", "INSERT INTO LESSONS", "INSERT INTO PATTERNS", "UPDATE PROJECTS", "UPDATE DISPATCH_QUEUE"];
    const isAllowed = ALLOWED_OPS.some((op) => qUpper.startsWith(op));
    if (!isAllowed) return err("Solo SELECT / INSERT en lessons|patterns / UPDATE en projects|dispatch_queue permitidos desde MCP.");

    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    try {
      const r = await fetch(`${BRAIN}/brain/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SECRET, query, params: qparams }),
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return err(`Brain query error: ${r.status}`);
      // /brain/query devuelve el resultado Neon directo (no wrapeado en {stdout})
      const inner = await r.json() as { rows?: Record<string, unknown>[]; rowCount?: number };
      const rows = inner.rows ?? [];
      return text(
        `rowCount: ${inner.rowCount ?? rows.length}\n\n` +
        rows.slice(0, 50).map((r) => JSON.stringify(r)).join("\n"),
      );
    } catch (e: unknown) {
      return err(`Query error: ${String(e).slice(0, 200)}`);
    }
  }

  case "vulcano_update_project": {
    // Actualiza last_action, next_step y phase de un proyecto en el Brain.
    // Llamar al TERMINAR cualquier tarea sobre un proyecto.
    const p = args as Record<string, unknown>;
    const id = String(p.project_id || "").trim();
    const lastAction = String(p.last_action || "").trim();
    const nextStep = String(p.next_step || "").trim();
    const phase = String(p.phase || "").trim();
    const blocked = p.blocked !== undefined ? String(p.blocked) : null;

    if (!id) return err("project_id requerido");
    if (!lastAction && !nextStep) return err("Al menos last_action o next_step requerido");

    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    const setClauses: string[] = ["updated_at = now()"];
    const vals: unknown[] = [id];
    if (lastAction) { vals.push(lastAction); setClauses.push(`last_action = $${vals.length}`); }
    if (nextStep)   { vals.push(nextStep);   setClauses.push(`next_step = $${vals.length}`); }
    if (phase)      { vals.push(phase);      setClauses.push(`phase = $${vals.length}`); }
    if (blocked !== null) { vals.push(blocked || null); setClauses.push(`blocked = $${vals.length}`); }

    const query = `UPDATE projects SET ${setClauses.join(", ")} WHERE id = $1`;

    try {
      const r = await fetch(`${BRAIN}/brain/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SECRET, query, params: vals }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return err(`Update error: ${r.status}`);
      return text(`✅ Proyecto [${id}] actualizado en el Brain.`);
    } catch (e: unknown) {
      return err(`Update failed: ${String(e).slice(0, 120)}`);
    }
  }

  case "vulcano_save_lesson": {
    // Persiste una lección aprendida en el Brain.
    // Llamar siempre al descubrir un error, un patrón o un acierto.
    const p = args as Record<string, unknown>;
    const projectId = String(p.project_id || "general");
    const type = String(p.type || "acierto");        // acierto | error | patron
    const area = String(p.area || "general");         // shell | postgres | pwa | etc.
    const lesson = String(p.lesson || "").trim();
    const fix = String(p.fix || "");
    const source = String(p.source || "mcp-agent");

    if (!lesson) return err("lesson requerido");
    if (!["acierto", "error", "patron"].includes(type)) return err("type debe ser: acierto | error | patron");

    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    try {
      const r = await fetch(`${BRAIN}/brain/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: SECRET,
          query: "INSERT INTO lessons (ts,project_id,type,area,lesson,fix,source) VALUES (now(),$1,$2,$3,$4,$5,$6)",
          params: [projectId, type, area, lesson, fix, source],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return err(`Lesson insert error: ${r.status}`);
      return text(`✅ Lección registrada: [${type}/${area}] ${lesson.slice(0, 80)}...`);
    } catch (e: unknown) {
      return err(`Save lesson failed: ${String(e).slice(0, 120)}`);
    }
  }

  case "vulcano_memory_search": {
    // Búsqueda semántica en el Brain (pgvector).
    const q = String((args as Record<string, unknown>).q || "").trim();
    const limit = Number((args as Record<string, unknown>).limit || 5);
    if (!q) return err("q requerido");

    const BRAIN = "http://178.105.135.26";
    const SECRET = process.env.BRAIN_SECRET || "superclaude2025";

    try {
      const r = await fetch(`${BRAIN}/brain/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SECRET, q, limit }),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) return err(`Search error: ${r.status}`);
      const d = await r.json() as { results?: { text: string; score: number; source: string }[] };
      const results = d.results || [];
      if (!results.length) return text("Sin resultados para: " + q);
      return text(
        results.map((r, i) => `[${i + 1}] score:${r.score?.toFixed(3)} src:${r.source}\n${r.text.slice(0, 300)}`).join("\n\n")
      );
    } catch (e: unknown) {
      return err(`Search failed: ${String(e).slice(0, 120)}`);
    }
  }


    default:
      return err(`Tool desconocida: ${name}`);
  }
}
