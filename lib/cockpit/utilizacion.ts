import { neon } from "@neondatabase/serverless";
import type { EsferaId } from "@/components/cockpit/esferas-types";

/**
 * Panel de UTILIZACION del Taller. Lee la MISMA dispatch_queue real
 * (DISPATCH_DATABASE_URL → ep-aged-paper) que las esferas y calcula, de
 * started_at/completed_at REALES, cuánto estuvo ocupado cada agente en las
 * últimas 24h + cuánto trabajo útil generó. CERO MOCK: sin datos → source:"empty".
 *
 * Ocupación: cada agente es un "carril". busySeconds = suma del solape de cada
 * job [max(started_at, ventana), min(completed_at|now, now)] con la ventana de 24h.
 * occupancyPct = busySeconds / 86400 (tope 100). Jobs corriendo cuentan hasta now.
 */

const WINDOW_HOURS = 24;
const WINDOW_SECS = WINDOW_HOURS * 3600;

const ESFERAS: EsferaId[] = ["claude", "codex", "grok", "shell", "browser"];
const LABEL: Record<EsferaId, string> = {
  claude: "Claude",
  codex: "Codex",
  grok: "Grok",
  shell: "Shell",
  browser: "Browser",
};

/** Mismo mapeo que dispatch.ts: agentes crudos → las 5 esferas. */
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

type Row = {
  id: number;
  agent: string | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type AgentUtil = {
  id: EsferaId;
  name: string;
  /** Segundos ocupado en la ventana (de marcas reales). */
  busySeconds: number;
  /** % de la ventana de 24h ocupado (0-100). */
  occupancyPct: number;
  /** Jobs terminados (done) en la ventana — trabajo útil del agente. */
  doneCount: number;
  /** Jobs fallidos en la ventana. */
  failedCount: number;
  /** ¿Tiene un job corriendo ahora mismo? */
  runningNow: boolean;
};

export type UtilizacionPayload = {
  source: "live" | "empty";
  windowHours: number;
  updatedAt: string;
  /** Trabajo útil total (jobs done) en la ventana. */
  utilDone: number;
  /** Por agente. */
  agents: AgentUtil[];
  /** Estado del backlog (reserva de trabajo permanente). */
  backlog: {
    total: number;
    activos: number;
    recurrentes: number;
    unaVezPendientes: number;
  } | null;
};

function emptyPayload(): UtilizacionPayload {
  return {
    source: "empty",
    windowHours: WINDOW_HOURS,
    updatedAt: new Date().toISOString(),
    utilDone: 0,
    agents: ESFERAS.map((id) => ({
      id,
      name: LABEL[id],
      busySeconds: 0,
      occupancyPct: 0,
      doneCount: 0,
      failedCount: 0,
      runningNow: false,
    })),
    backlog: null,
  };
}

export async function readUtilizacion(): Promise<UtilizacionPayload> {
  const url = process.env.DISPATCH_DATABASE_URL;
  if (!url) return emptyPayload();

  const now = Date.now();
  const windowStart = now - WINDOW_SECS * 1000;
  const sql = neon(url);

  let rows: Row[] = [];
  try {
    rows = (await sql`
      SELECT id, agent, status, started_at, completed_at
      FROM dispatch_queue
      WHERE status = 'running'
         OR COALESCE(completed_at, started_at, created_at) > NOW() - INTERVAL '24 hours'
    `) as Row[];
  } catch {
    return emptyPayload();
  }

  const acc = new Map<
    EsferaId,
    { busy: number; done: number; failed: number; running: boolean }
  >();
  for (const id of ESFERAS) acc.set(id, { busy: 0, done: 0, failed: 0, running: false });

  for (const r of rows) {
    const agent = normalizeAgent(r.agent);
    if (!agent) continue;
    const a = acc.get(agent)!;
    const status = (r.status || "").toLowerCase();

    // Solape de ocupación con la ventana de 24h (de marcas reales).
    if (r.started_at) {
      const start = Date.parse(r.started_at);
      if (!Number.isNaN(start)) {
        const endRaw = r.completed_at ? Date.parse(r.completed_at) : now;
        const end = Number.isNaN(endRaw) ? now : endRaw;
        const ov = Math.min(end, now) - Math.max(start, windowStart);
        if (ov > 0) a.busy += ov / 1000;
      }
    }
    if (status === "done" && r.completed_at) a.done += 1;
    if ((status === "failed" || status === "error") && r.completed_at) a.failed += 1;
    if (status === "running") a.running = true;
  }

  const agents: AgentUtil[] = ESFERAS.map((id) => {
    const a = acc.get(id)!;
    const pct = Math.min(100, Math.round((a.busy / WINDOW_SECS) * 100));
    return {
      id,
      name: LABEL[id],
      busySeconds: Math.round(a.busy),
      occupancyPct: pct,
      doneCount: a.done,
      failedCount: a.failed,
      runningNow: a.running,
    };
  });

  const utilDone = agents.reduce((s, a) => s + a.doneCount, 0);

  // Backlog (best-effort: si la tabla aún no existe, lo omitimos).
  let backlog: UtilizacionPayload["backlog"] = null;
  try {
    const b = (await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE activo)::int AS activos,
        count(*) FILTER (WHERE recurrente)::int AS recurrentes,
        count(*) FILTER (WHERE activo AND NOT recurrente)::int AS una_vez
      FROM backlog_tasks
    `) as { total: number; activos: number; recurrentes: number; una_vez: number }[];
    if (b[0]) {
      backlog = {
        total: b[0].total,
        activos: b[0].activos,
        recurrentes: b[0].recurrentes,
        unaVezPendientes: b[0].una_vez,
      };
    }
  } catch {
    backlog = null;
  }

  const anyActivity = rows.length > 0 || (backlog?.total ?? 0) > 0;
  return {
    source: anyActivity ? "live" : "empty",
    windowHours: WINDOW_HOURS,
    updatedAt: new Date().toISOString(),
    utilDone,
    agents,
    backlog,
  };
}
