import { queryAll, queryOne, sql, ensureDatabaseHealed } from "@/lib/db/client";
import { brainQueryAll } from "@/lib/db/brain";
import { recall } from "@/lib/forge/semantic-recall";
import { resolveAccessForUser } from "@/lib/connect/resolve-token";
import { githubClientFromToken } from "@/lib/github/client";
import { randomBytes } from "node:crypto";
import { type McpPrincipal, isPublicTool } from "./rbac";

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
  lines.push("• vforge_payments — avance financiero (total/pagado/pendiente).");
  lines.push("• vforge_apps_health — salud de despliegue de tus apps.");
  lines.push("• vforge_brain_search — memoria y método de VForge.");
  lines.push("• vforge_skill_list — skills disponibles.");
  lines.push("• vforge_integration_plan — qué servicios conectar para tu proyecto.");
  lines.push("• vforge_recommend_stack — stack técnico recomendado.");
  lines.push("• vforge_create_repo / vforge_deploy / vforge_scaffold_project — ejecutables (two-step).");
  lines.push("• vforge_execute_skill — ejecuta una skill (sólo operador).");
  const scopeName =
    principal.scope === "admin" ? "admin (operador — ves todo)" :
    principal.scope === "client" ? "client (ves SOLO tu forge)" :
    "public (sólo tools públicas)";
  lines.push(`\nTu scope actual: ${scopeName}.`);
  return lines.join("\n");
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
            "SELECT name, category, status, vercel_url FROM projects ORDER BY name LIMIT 60",
          ).catch(() => [])
        : await queryAll<{ name: string; category: string; status: string; vercel_url: string | null }>(
            "SELECT name, category, status, vercel_url FROM projects WHERE org_id = $1 ORDER BY name LIMIT 60",
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
            "SELECT name, status, category, vercel_url, last_audit_score FROM projects ORDER BY name LIMIT 100",
          ).catch(() => [])
        : await queryAll<{ name: string; status: string; category: string; vercel_url: string | null; last_audit_score: number | null }>(
            "SELECT name, status, category, vercel_url, last_audit_score FROM projects WHERE org_id = $1 ORDER BY name LIMIT 100",
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

    default:
      return err(`Tool desconocida: ${name}`);
  }
}
