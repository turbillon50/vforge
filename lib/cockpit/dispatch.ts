import { neon } from "@neondatabase/serverless";
import type {
  ActiveJob,
  EsferaId,
  EsferaState,
  EsferasPayload,
  FeedItem,
  GrokVerdict,
  HealthState,
  ProjectRef,
} from "@/components/cockpit/esferas-types";

/**
 * Fuente de verdad del TALLER: la tabla `dispatch_queue` de la DB del DAEMON
 * Vulcano (ep-aged-paper), distinta de la DB principal de vForge y de la DB del
 * brain. Se conecta SOLO con `DISPATCH_DATABASE_URL`. CERO MOCK: si no hay
 * actividad, devolvemos un estado vacío honesto (`source:"empty"`).
 *
 * Esquema real verificado vía information_schema:
 *   id, created_at, status, priority, agent, prompt, result, error,
 *   started_at, completed_at, source, metadata, files_touched, grok_verdict,
 *   grok_notes, worktree_path, gajo, parent_task_id, progress_pct, log_tail
 * Estados reales: pending · running · done · failed · error
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

type Row = {
  id: number;
  status: string | null;
  agent: string | null;
  prompt: string | null;
  source: string | null;
  gajo: string | null;
  progress_pct: number | null;
  started_at: string | null;
  created_at: string | null;
  completed_at: string | null;
  grok_verdict: string | null;
  grok_notes: string | null;
};

function normalizeVerdict(raw: string | null): GrokVerdict | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s.includes("APROB")) return "APROBADO";
  if (s.includes("RECHAZ")) return "RECHAZADO";
  if (s.includes("REVIS")) return "REVISION";
  return null;
}

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

const RUNNING = new Set(["running", "in_progress", "active"]);
const PENDING = new Set(["pending", "queued"]);

function statusOf(raw: string | null): "working" | "pending" | "done" | "other" {
  const s = (raw || "").toLowerCase();
  if (RUNNING.has(s)) return "working";
  if (PENDING.has(s)) return "pending";
  if (s === "done") return "done";
  return "other";
}

/**
 * REGLA ANTI-STALE: un row marcado `running` pero sin progreso desde hace
 * demasiado es un ZOMBIE (proceso muerto, daemon reiniciado). NO debe encender
 * esfera/tag/haz: pintaría trabajo que ya no ocurre. El barrido del daemon lo
 * marca `failed/error=stale` al iniciar; este guard protege el render aunque el
 * barrido todavía no haya corrido. Umbral configurable (default 3h, alineado al
 * criterio de la cola; el timeout duro de un job claude es mayor, así que esto
 * solo OCULTA del Taller — nunca cancela el job real).
 */
const STALE_HOURS = Number(process.env.TALLER_STALE_HOURS ?? 3);
const STALE_MS = STALE_HOURS * 3600 * 1000;

function isStaleRunning(row: Row): boolean {
  if (!RUNNING.has((row.status || "").toLowerCase())) return false;
  const t = Date.parse(row.started_at || row.created_at || "");
  if (Number.isNaN(t)) return true; // running sin marca de inicio = sospechoso
  return Date.now() - t > STALE_MS;
}

/** Resumen corto del prompt: primer título/oración, sin ruido. */
function summarizePrompt(prompt: string | null): string | null {
  if (!prompt) return null;
  let s = prompt.replace(/\s+/g, " ").trim();
  if (!s) return null;
  // Corta en el primer delimitador natural de título.
  const m = s.match(/^(.{8,90}?)(?:[.:]|\s[—-]\s|$)/);
  if (m) s = m[1].trim();
  if (s.length > 90) s = `${s.slice(0, 89)}…`;
  return s;
}

/** Etiqueta legible del proyecto a partir de gajo/source. */
function projectLabel(key: string): string {
  return key
    .replace(/^claude-chat-/i, "")
    .replace(/^vulcano-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Clave de proyecto estable: gajo si existe, si no el source. */
function projectKeyOf(row: Row): string | null {
  const raw = (row.gajo || row.source || "").trim();
  return raw || null;
}

const RELAY_BASE =
  process.env.HETZNER_URL?.replace(/\/$/, "") || "http://178.105.135.26";

async function fetchJson(url: string, ms = 2500): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Healthcheck de procesos del server vía el relay de Hetzner. */
async function readHealth(hasRunningJobs: boolean): Promise<HealthState> {
  const [daemonRaw, statusRaw] = await Promise.all([
    fetchJson(`${RELAY_BASE}/brain/file/vagent/daemon-health.json`),
    fetchJson(`${RELAY_BASE}/brain/file/folletos/status.json`),
  ]);

  const d = daemonRaw as
    | { processes?: { claude_loop?: { alive?: boolean; count?: number }; vulcano_daemon?: { alive?: boolean; count?: number } } }
    | null;
  const daemons = d?.processes
    ? {
        claude_loop: {
          alive: Boolean(d.processes.claude_loop?.alive),
          count: Number(d.processes.claude_loop?.count ?? 0),
        },
        vulcano_daemon: {
          alive: Boolean(d.processes.vulcano_daemon?.alive),
          count: Number(d.processes.vulcano_daemon?.count ?? 0),
        },
      }
    : null;

  const s = statusRaw as
    | { cpu?: { loadPct?: number; cores?: number }; mem?: { usedPct?: number }; uptime?: number; agents?: { key?: string; name?: string; count?: number }[] }
    | null;
  const server = s?.cpu
    ? {
        loadPct: Number(s.cpu.loadPct ?? 0),
        memPct: Number(s.mem?.usedPct ?? 0),
        cores: Number(s.cpu.cores ?? 0),
        uptime: Number(s.uptime ?? 0),
      }
    : null;
  const agents = Array.isArray(s?.agents)
    ? s!.agents.map((a) => ({
        key: String(a.key ?? "").trim(),
        name: String(a.name ?? ""),
        count: Number(a.count ?? 0),
      }))
    : null;

  const relayUp = Boolean(daemonRaw || statusRaw);
  // Sano si los daemons reportan vivos, o si hay jobs corriendo (prueba viva).
  const daemonsAlive =
    (daemons?.claude_loop.alive && daemons?.vulcano_daemon.alive) || false;
  const healthy = daemonsAlive || hasRunningJobs;

  return {
    relayUp,
    daemons,
    server,
    agents,
    healthy,
    checkedAt: new Date().toISOString(),
  };
}

export async function readDispatchState(): Promise<EsferasPayload> {
  const url = process.env.DISPATCH_DATABASE_URL;
  let rows: Row[] = [];
  if (url) {
    try {
      const sql = neon(url);
      rows = (await sql`
        SELECT id, status, agent, prompt, source, gajo, progress_pct,
               started_at, created_at, completed_at, grok_verdict, grok_notes
        FROM dispatch_queue
        WHERE status IN ('running','in_progress','active','pending','queued')
           OR COALESCE(completed_at, started_at, created_at) > NOW() - INTERVAL '30 minutes'
        ORDER BY
          CASE
            WHEN status IN ('running','in_progress','active') THEN 0
            WHEN status IN ('pending','queued') THEN 1
            ELSE 2
          END,
          COALESCE(started_at, created_at) DESC
        LIMIT 60
      `) as Row[];
    } catch {
      rows = [];
    }
  }

  // Último job COMPLETADO por agente — alimenta el texto sutil "último: <tag>
  // hace N días" de las esferas en reposo. Es historial, NUNCA enciende la
  // esfera (no es trabajo presente).
  const lastByAgent = new Map<EsferaId, { project: string | null; since: string | null }>();
  if (url) {
    try {
      const sql = neon(url);
      const lastRows = (await sql`
        SELECT DISTINCT ON (agent) agent, source, gajo,
               completed_at, started_at, created_at
        FROM dispatch_queue
        WHERE status IN ('done','failed','error','cancelled')
        ORDER BY agent, COALESCE(completed_at, started_at, created_at) DESC
      `) as Row[];
      for (const r of lastRows) {
        const a = normalizeAgent(r.agent);
        if (!a || lastByAgent.has(a)) continue;
        const key = projectKeyOf(r);
        lastByAgent.set(a, {
          project: key ? projectLabel(key) : null,
          since: r.completed_at || r.started_at || r.created_at,
        });
      }
    } catch {
      /* best-effort: el reposo simplemente muestra "en reposo" */
    }
  }

  // Job activo (o en cola) por agente — el más prioritario/reciente gana.
  const byAgent = new Map<EsferaId, Row>();
  for (const row of rows) {
    const agent = normalizeAgent(row.agent);
    if (!agent) continue;
    const k = statusOf(row.status);
    if (k !== "working" && k !== "pending") continue;
    if (k === "working" && isStaleRunning(row)) continue; // zombie: no enciende
    const existing = byAgent.get(agent);
    if (!existing) {
      byAgent.set(agent, row);
      continue;
    }
    // working pisa a pending.
    if (statusOf(existing.status) === "pending" && k === "working") {
      byAgent.set(agent, row);
    }
  }

  const esferas: EsferaState[] = ESFERAS.map((id) => {
    const row = byAgent.get(id);
    if (!row) {
      return {
        id,
        name: LABEL[id],
        role: ROLE[id],
        status: "idle",
        project: null,
        projectKey: null,
        task: null,
        since: null,
        jobId: null,
        progress: null,
        lastProject: lastByAgent.get(id)?.project ?? null,
        lastSince: lastByAgent.get(id)?.since ?? null,
      };
    }
    const key = projectKeyOf(row);
    return {
      id,
      name: LABEL[id],
      role: ROLE[id],
      status: statusOf(row.status) === "working" ? "working" : "pending",
      project: key ? projectLabel(key) : null,
      projectKey: key,
      task: summarizePrompt(row.prompt),
      since: row.started_at || row.created_at,
      jobId: row.id,
      progress:
        typeof row.progress_pct === "number" && row.progress_pct > 0
          ? row.progress_pct
          : null,
      lastProject: null,
      lastSince: null,
    };
  });

  // MULTI-ESFERA: una esfera central por CADA job corriendo (no colapsado por
  // agente). Aquí pueden venir 2+ jobs del mismo agente en paralelo.
  const jobs: ActiveJob[] = rows
    .filter((row) => statusOf(row.status) === "working" && !isStaleRunning(row))
    .map((row) => {
      const agent = normalizeAgent(row.agent);
      const key = projectKeyOf(row);
      return {
        id: row.id,
        agent,
        agentName: agent ? LABEL[agent] : row.agent || "—",
        project: key ? projectLabel(key) : null,
        projectKey: key,
        task: summarizePrompt(row.prompt),
        since: row.started_at || row.created_at,
        progress:
          typeof row.progress_pct === "number" && row.progress_pct > 0
            ? row.progress_pct
            : null,
      };
    });

  // Proyectos activos para el selector: de los jobs corriendo + esferas en cola.
  const projMap = new Map<string, ProjectRef>();
  const bumpProject = (key: string | null, label: string | null) => {
    if (!key) return;
    const p = projMap.get(key) ?? {
      key,
      label: label || projectLabel(key),
      active: 0,
    };
    p.active += 1;
    projMap.set(key, p);
  };
  for (const j of jobs) bumpProject(j.projectKey, j.project);
  for (const e of esferas) {
    if (e.status === "pending") bumpProject(e.projectKey, e.project);
  }
  const projects = [...projMap.values()].sort((a, b) => b.active - a.active);

  // Feed: actividad reciente (lo que devolvió la query, ya ordenada).
  const feed: FeedItem[] = rows.slice(0, 16).map((row) => {
    const agent = normalizeAgent(row.agent);
    const key = projectKeyOf(row);
    return {
      id: row.id,
      agent,
      agentName: agent ? LABEL[agent] : row.agent || "—",
      project: key ? projectLabel(key) : null,
      projectKey: key,
      task: summarizePrompt(row.prompt),
      status: (row.status || "").toLowerCase(),
      ts: row.started_at || row.completed_at || row.created_at,
      grokVerdict: normalizeVerdict(row.grok_verdict),
      grokNotes: row.grok_notes ? row.grok_notes.slice(0, 280) : null,
    };
  });

  // Último veredicto Grok (el job auditado más reciente con veredicto).
  let lastVerdict: EsferasPayload["lastVerdict"] = null;
  for (const row of rows) {
    const v = normalizeVerdict(row.grok_verdict);
    if (v) {
      const key = projectKeyOf(row);
      lastVerdict = {
        id: row.id,
        verdict: v,
        notes: row.grok_notes ? row.grok_notes.slice(0, 280) : null,
        project: key ? projectLabel(key) : null,
        ts: row.completed_at || row.started_at || row.created_at,
      };
      break; // rows ya viene ordenado por recencia
    }
  }

  // running = jobs corriendo REALES (multi-esfera), no colapsado por agente.
  const running = jobs.length;
  const pending = esferas.filter((e) => e.status === "pending").length;
  const health = await readHealth(running > 0);

  return {
    source: running + pending > 0 ? "live" : "empty",
    updatedAt: new Date().toISOString(),
    queue: { running, pending, total: rows.length },
    esferas,
    jobs,
    projects,
    feed,
    lastVerdict,
    health,
  };
}
