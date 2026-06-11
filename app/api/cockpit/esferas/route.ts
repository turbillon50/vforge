import { resolveAccess } from "@/lib/connect/resolve-token";
import { neon } from "@neondatabase/serverless";
import type { EsferaId, EsferaState, EsferasPayload } from "@/components/cockpit/esferas-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estado en vivo de las ESFERAS Vulcano (claude, codex, grok, shell, browser)
 * para la visualización del núcleo en el cockpit.
 *
 * Fuente de verdad: tabla `dispatch_queue` de la DB del DAEMON (distinta de la
 * DB principal de vForge). Se conecta con `DISPATCH_DATABASE_URL` si existe;
 * si no, cae a `DATABASE_URL`. Si la tabla no existe o la query falla, devuelve
 * un set MOCK plausible marcado con `source:"mock"` para que la UI nunca quede
 * en blanco.
 *
 * TODO(daemon): confirmar el esquema real de `dispatch_queue` en el daemon
 * (columnas agent/status/project/task/started_at) y afinar el SELECT abajo.
 */

const ESFERAS: EsferaId[] = ["claude", "codex", "grok", "shell", "browser"];

const LABEL: Record<EsferaId, string> = {
  claude: "Claude",
  codex: "Codex",
  grok: "Grok",
  shell: "Shell",
  browser: "Browser",
};

const ROLE: Record<EsferaId, string> = {
  claude: "Razonamiento y arquitectura",
  codex: "Generación de código",
  grok: "Investigación y contexto",
  shell: "Ejecución en servidor",
  browser: "Navegación y scraping",
};

const pick = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
};

function normalizeAgent(raw: string | null): EsferaId | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("claude")) return "claude";
  if (s.includes("codex") || s.includes("gpt") || s.includes("openai")) return "codex";
  if (s.includes("grok") || s.includes("xai")) return "grok";
  if (s.includes("shell") || s.includes("bash") || s.includes("term")) return "shell";
  if (s.includes("browser") || s.includes("web") || s.includes("playwright")) return "browser";
  return null;
}

async function readDispatchQueue(): Promise<EsferaState[] | null> {
  const url = process.env.DISPATCH_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const sql = neon(url);
    // Toma el job activo más reciente por agente. Tolerante a columnas ausentes.
    const rows = (await sql`
      SELECT *
      FROM dispatch_queue
      WHERE status IN ('running', 'in_progress', 'active', 'pending', 'queued')
         OR (status = 'done' AND COALESCE(completed_at, created_at) > NOW() - INTERVAL '5 minutes')
      ORDER BY
        CASE WHEN status IN ('running','in_progress','active') THEN 0
             WHEN status IN ('pending','queued') THEN 1
             ELSE 2 END,
        COALESCE(started_at, created_at, NOW()) DESC
      LIMIT 100
    `) as Record<string, unknown>[];

    if (!Array.isArray(rows)) return null;

    const byAgent = new Map<EsferaId, EsferaState>();
    for (const row of rows) {
      const agent = normalizeAgent(pick(row, ["agent", "esfera", "worker", "sphere", "model"]));
      if (!agent || byAgent.has(agent)) continue;
      const statusRaw = (pick(row, ["status", "state"]) || "").toLowerCase();
      const working = /run|progress|active|pending|queued/.test(statusRaw);
      byAgent.set(agent, {
        id: agent,
        name: LABEL[agent],
        role: ROLE[agent],
        status: working ? "working" : "idle",
        project: pick(row, ["gajo", "project", "repo", "project_id", "target", "repository", "source"]),
        task: pick(row, ["task", "title", "prompt", "description", "summary", "job", "source"]),
        since: pick(row, ["started_at", "created_at", "updated_at"]),
      });
    }

    return ESFERAS.map(
      (id) =>
        byAgent.get(id) ?? {
          id,
          name: LABEL[id],
          role: ROLE[id],
          status: "idle" as const,
          project: null,
          task: null,
          since: null,
        },
    );
  } catch {
    return null;
  }
}

function mockEsferas(): EsferaState[] {
  // TODO(daemon): reemplazar por datos reales cuando dispatch_queue esté accesible.
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60000).toISOString();
  const data: Record<EsferaId, Partial<EsferaState>> = {
    claude: { status: "working", project: "FINAL-CASTORES", task: "Refactor del panel de admin", since: iso(12) },
    codex: { status: "working", project: "hapicredit", task: "Endpoint de scoring crediticio", since: iso(4) },
    grok: { status: "idle" },
    shell: { status: "working", project: "vforge", task: "Migración 016 en Neon", since: iso(1) },
    browser: { status: "idle" },
  };
  return ESFERAS.map((id) => ({
    id,
    name: LABEL[id],
    role: ROLE[id],
    status: (data[id].status as "working" | "idle") ?? "idle",
    project: data[id].project ?? null,
    task: data[id].task ?? null,
    since: data[id].since ?? null,
  }));
}

export async function GET() {
  const access = await resolveAccess();
  if (!access.userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const live = await readDispatchQueue();
  const esferas = live ?? mockEsferas();
  const running = esferas.filter((e) => e.status === "working").length;

  const payload: EsferasPayload = {
    source: live ? "live" : "mock",
    updatedAt: new Date().toISOString(),
    queue: { running, pending: 0 },
    esferas,
  };

  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
