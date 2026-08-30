/**
 * VForge MCP — capa de OPERADOR de la fragua (Vulcano).
 *
 * Da soporte a las 4 tools de operador del MCP (vulcano_taller_status,
 * vulcano_dispatch, vulcano_brain_module, vulcano_salud). Todas estas tools
 * están gated a rol Owner/Associate en lib/mcp/rbac.ts — NUNCA public.
 *
 * Tres fuentes de verdad, ninguna mockeada:
 *  1. `dispatch_queue` en la DB del DAEMON Vulcano (env DISPATCH_DATABASE_URL),
 *     distinta de la DB principal de la app y de la del brain. Es la cola real
 *     de trabajo de la fábrica: qué corre, qué está en cola, qué cerró y con
 *     qué veredicto de Grok.
 *  2. El relay de Hetzner (HETZNER_URL / RELAY_BASE_URL) para los módulos de
 *     doctrina del Brain y los archivos de salud (token-health, daemon-health).
 *
 * CERO MOCK: si una fuente no responde, se devuelve null/estado vacío honesto.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/* ------------------------------- dispatch DB ------------------------------- */

let _dispatch: NeonQueryFunction<false, false> | null = null;

function getDispatch(): NeonQueryFunction<false, false> {
  if (_dispatch) return _dispatch;
  const url = process.env.DISPATCH_DATABASE_URL;
  if (!url) throw new Error("DISPATCH_DATABASE_URL no está configurada");
  _dispatch = neon(url);
  return _dispatch;
}

/* --------------------------------- relay ---------------------------------- */

const RELAY_BASE = (
  process.env.HETZNER_URL ??
  process.env.RELAY_BASE_URL ??
  "http://178.105.135.26"
).replace(/\/$/, "");

async function relayJson(path: string, ms = 3000): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(`${RELAY_BASE}${path}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function relayText(path: string, ms = 3000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(`${RELAY_BASE}${path}`, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/* ------------------------------ módulos Brain ------------------------------ */

/** Módulos de arranque del Brain — la doctrina completa de la fábrica. */
export const BRAIN_MODULES = [
  "proposito",
  "contexto-minimo",
  "marco-legal-entrega",
  "publicidad",
  "tipos-de-diseno",
  "catalogo-forks",
  "anatomia-arte",
  "onboarding-operador",
] as const;

export type BrainModule = (typeof BRAIN_MODULES)[number];

export function isBrainModule(name: string): name is BrainModule {
  return (BRAIN_MODULES as readonly string[]).includes(name);
}

/** Lee un módulo de doctrina del Brain: GET /brain/file/modulos/<n>.md */
export async function readBrainModule(name: BrainModule): Promise<string | null> {
  return relayText(`/brain/file/modulos/${name}.md`);
}

/* ------------------------------ taller status ------------------------------ */

export interface TallerJob {
  id: number;
  status: string;
  agent: string | null;
  source: string | null;
  task: string | null;
  progress: number | null;
  logTail: string | null;
  grokVerdict: string | null;
  grokNotes: string | null;
  since: string | null;
}

export interface TallerStatus {
  running: TallerJob[];
  pending: TallerJob[];
  recent: TallerJob[];
  counts: { running: number; pending: number; total: number };
}

type Row = {
  id: number;
  status: string | null;
  agent: string | null;
  prompt: string | null;
  source: string | null;
  priority: number | null;
  progress_pct: number | null;
  log_tail: string | null;
  started_at: string | null;
  created_at: string | null;
  completed_at: string | null;
  grok_verdict: string | null;
  grok_notes: string | null;
};

function normalizeVerdict(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s.includes("APROB")) return "APROBADO";
  if (s.includes("RECHAZ")) return "RECHAZADO";
  if (s.includes("REVIS")) return "REVISION";
  return null;
}

function summarize(prompt: string | null, max = 110): string | null {
  if (!prompt) return null;
  const s = prompt.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function cleanLogTail(raw: string | null): string | null {
  if (!raw) return null;
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  if (!lines.length) return null;
  return lines.slice(-4).join("\n").slice(0, 600);
}

function toJob(row: Row): TallerJob {
  return {
    id: row.id,
    status: (row.status || "").toLowerCase(),
    agent: row.agent,
    source: row.source,
    task: summarize(row.prompt),
    progress:
      typeof row.progress_pct === "number" && row.progress_pct > 0 ? row.progress_pct : null,
    logTail: cleanLogTail(row.log_tail),
    grokVerdict: normalizeVerdict(row.grok_verdict),
    grokNotes: row.grok_notes ? row.grok_notes.slice(0, 240) : null,
    since: row.started_at || row.created_at,
  };
}

/**
 * Estado vivo de la fragua: jobs corriendo, en cola y cerrados recientemente
 * (con su veredicto Grok). Es "qué está pasando ahora en la empresa".
 */
export async function tallerStatus(): Promise<TallerStatus> {
  const sql = getDispatch();

  // Activos: corriendo + en cola, prioridad/recencia primero.
  const active = (await sql`
    SELECT id, status, agent, prompt, source, priority, progress_pct, log_tail,
           started_at, created_at, completed_at, grok_verdict, grok_notes
    FROM dispatch_queue
    WHERE status IN ('running','in_progress','active','pending','queued')
    ORDER BY
      CASE WHEN status IN ('running','in_progress','active') THEN 0 ELSE 1 END,
      priority DESC,
      COALESCE(started_at, created_at) DESC
    LIMIT 40
  `) as Row[];

  // Recientes: últimos cierres (2h) con su sello Grok. Historial, no presente.
  const recent = (await sql`
    SELECT id, status, agent, prompt, source, priority, progress_pct, log_tail,
           started_at, created_at, completed_at, grok_verdict, grok_notes
    FROM dispatch_queue
    WHERE status IN ('done','failed','error','cancelled')
      AND COALESCE(completed_at, started_at, created_at) > NOW() - INTERVAL '2 hours'
    ORDER BY COALESCE(completed_at, started_at, created_at) DESC
    LIMIT 8
  `) as Row[];

  const RUNNING = new Set(["running", "in_progress", "active"]);
  const running = active.filter((r) => RUNNING.has((r.status || "").toLowerCase())).map(toJob);
  const pending = active.filter((r) => !RUNNING.has((r.status || "").toLowerCase())).map(toJob);

  return {
    running,
    pending,
    recent: recent.map(toJob),
    counts: { running: running.length, pending: pending.length, total: active.length },
  };
}

/* -------------------------------- dispatch -------------------------------- */

export interface DispatchInput {
  agent: string;
  prompt: string;
  priority: number;
  /** Auditoría: SIEMPRE "mcp:<clerkUserId>" — quién ordenó el trabajo. */
  source: string;
}

/** Encola un trabajo real en la fragua. Devuelve el id asignado por la cola. */
export async function dispatchJob(p: DispatchInput): Promise<{ id: number }> {
  const sql = getDispatch();
  const rows = (await sql`
    INSERT INTO dispatch_queue (agent, prompt, priority, source, status)
    VALUES (${p.agent}, ${p.prompt}, ${p.priority}, ${p.source}, 'pending')
    RETURNING id
  `) as { id: number }[];
  return { id: rows[0].id };
}

export interface DispatchJobSnapshot {
  id: number;
  agent: string | null;
  status: string;
  progress: number | null;
  result: string | null;
  logTail: string | null;
  verdict: string | null;
  updatedAt: string | null;
}

/** Lee sólo los jobs indicados; se usa para sincronizar runs de una sala. */
export async function getDispatchJobs(jobIds: number[]): Promise<DispatchJobSnapshot[]> {
  const unique = Array.from(new Set(jobIds.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 100);
  if (!unique.length) return [];
  const sql = getDispatch();
  const rows = await Promise.all(
    unique.map(async (id) => {
      const result = (await sql`
        SELECT id, agent, status, progress_pct, result, log_tail, grok_verdict,
               COALESCE(completed_at, started_at, created_at) AS updated_at
          FROM dispatch_queue WHERE id = ${id} LIMIT 1
      `) as Array<{
        id: number;
        agent: string | null;
        status: string;
        progress_pct: number | null;
        result: string | null;
        log_tail: string | null;
        grok_verdict: string | null;
        updated_at: string | null;
      }>;
      return result[0] ?? null;
    }),
  );
  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row)).map((row) => ({
    id: Number(row.id),
    agent: row.agent,
    status: row.status,
    progress: row.progress_pct == null ? null : Number(row.progress_pct),
    result: row.result,
    logTail: row.log_tail,
    verdict: normalizeVerdict(row.grok_verdict),
    updatedAt: row.updated_at,
  }));
}

/* ---------------------------------- salud --------------------------------- */

export interface SaludFabrica {
  tokenHealth: { hoursLeft: number | null; status: string | null; checkedAt: string | null } | null;
  daemon: { vulcanoAlive: boolean; claudeLoopAlive: boolean } | null;
  queue: { running: number; pending: number; total: number };
  relayUp: boolean;
}

/** El pulso de la fábrica en una sola llamada: token, daemon y cola. */
export async function saludFabrica(): Promise<SaludFabrica> {
  const [tokenRaw, daemonRaw, counts] = await Promise.all([
    relayJson("/brain/file/token-health.json"),
    relayJson("/brain/file/vagent/daemon-health.json"),
    (async () => {
      try {
        const sql = getDispatch();
        const r = (await sql`
          SELECT
            COUNT(*) FILTER (WHERE status IN ('running','in_progress','active'))::int AS running,
            COUNT(*) FILTER (WHERE status IN ('pending','queued'))::int AS pending,
            COUNT(*)::int AS total
          FROM dispatch_queue
          WHERE status IN ('running','in_progress','active','pending','queued')
        `) as { running: number; pending: number; total: number }[];
        return r[0] ?? { running: 0, pending: 0, total: 0 };
      } catch {
        return { running: 0, pending: 0, total: 0 };
      }
    })(),
  ]);

  const th = tokenRaw as { hours_left?: number; status?: string; checked_at?: string } | null;
  const tokenHealth = th
    ? {
        hoursLeft: typeof th.hours_left === "number" ? th.hours_left : null,
        status: th.status ?? null,
        checkedAt: th.checked_at ?? null,
      }
    : null;

  const dh = daemonRaw as
    | { processes?: { claude_loop?: { alive?: boolean }; vulcano_daemon?: { alive?: boolean } } }
    | null;
  const daemon = dh?.processes
    ? {
        vulcanoAlive: Boolean(dh.processes.vulcano_daemon?.alive),
        claudeLoopAlive: Boolean(dh.processes.claude_loop?.alive),
      }
    : null;

  return {
    tokenHealth,
    daemon,
    queue: counts,
    relayUp: Boolean(tokenRaw || daemonRaw),
  };
}
