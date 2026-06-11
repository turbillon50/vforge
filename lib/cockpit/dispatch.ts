import { neon } from "@neondatabase/serverless";
import type {
  EsferaId,
  EsferaState,
  EsferasPayload,
  FeedItem,
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

const RUNNING = new Set(["running", "in_progress", "active"]);
const PENDING = new Set(["pending", "queued"]);

function statusOf(raw: string | null): "working" | "pending" | "done" | "other" {
  const s = (raw || "").toLowerCase();
  if (RUNNING.has(s)) return "working";
  if (PENDING.has(s)) return "pending";
  if (s === "done") return "done";
  return "other";
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
               started_at, created_at, completed_at
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

  // Job activo (o en cola) por agente — el más prioritario/reciente gana.
  const byAgent = new Map<EsferaId, Row>();
  for (const row of rows) {
    const agent = normalizeAgent(row.agent);
    if (!agent) continue;
    const k = statusOf(row.status);
    if (k !== "working" && k !== "pending") continue;
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
    };
  });

  // Proyectos activos (de esferas working/pending) para el selector.
  const projMap = new Map<string, ProjectRef>();
  for (const e of esferas) {
    if (e.projectKey && e.status !== "idle") {
      const p = projMap.get(e.projectKey) ?? {
        key: e.projectKey,
        label: e.project || projectLabel(e.projectKey),
        active: 0,
      };
      p.active += 1;
      projMap.set(e.projectKey, p);
    }
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
    };
  });

  const running = esferas.filter((e) => e.status === "working").length;
  const pending = esferas.filter((e) => e.status === "pending").length;
  const health = await readHealth(running > 0);

  return {
    source: running + pending > 0 ? "live" : "empty",
    updatedAt: new Date().toISOString(),
    queue: { running, pending, total: rows.length },
    esferas,
    projects,
    feed,
    health,
  };
}
