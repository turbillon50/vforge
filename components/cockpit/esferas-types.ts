/** Tipos compartidos del estado de las esferas Vulcano (cockpit / taller). */

export type EsferaId = "claude" | "codex" | "grok" | "shell" | "browser";

/** working = job corriendo · pending = job en cola · idle = sin trabajo. */
export type EsferaStatus = "working" | "pending" | "idle";

export type EsferaState = {
  id: EsferaId;
  name: string;
  role: string;
  status: EsferaStatus;
  /** Etiqueta legible del proyecto del job activo (gajo/source). */
  project: string | null;
  /** Clave estable del proyecto para filtrar/seleccionar. */
  projectKey: string | null;
  /** Resumen del prompt del job activo. */
  task: string | null;
  /** ISO del inicio del job activo (started_at/created_at). */
  since: string | null;
  /** Id del job activo en dispatch_queue. */
  jobId: number | null;
  /** Avance reportado por el daemon (0-100) si existe. */
  progress: number | null;
};

export type ProjectRef = {
  key: string;
  label: string;
  /** Cuántas esferas/jobs activos pertenecen a este proyecto. */
  active: number;
};

export type FeedItem = {
  id: number;
  agent: EsferaId | null;
  agentName: string;
  project: string | null;
  projectKey: string | null;
  task: string | null;
  status: string;
  /** ISO del timestamp más relevante del job (started/completed/created). */
  ts: string | null;
};

export type DaemonProc = { alive: boolean; count: number };

export type HealthState = {
  /** El relay de Hetzner respondió. */
  relayUp: boolean;
  /** Procesos daemon clave (claude_loop.py, vulcano_daemon.py). */
  daemons: {
    claude_loop: DaemonProc;
    vulcano_daemon: DaemonProc;
  } | null;
  /** Métricas vivas del servidor (status.json, refresco 5s). */
  server: {
    loadPct: number;
    memPct: number;
    cores: number;
    uptime: number;
  } | null;
  /** Conteo de procesos por agente en el server. */
  agents: { key: string; name: string; count: number }[] | null;
  /** Salud global: daemons vivos o hay jobs corriendo ahora. */
  healthy: boolean;
  checkedAt: string;
};

export type EsferasPayload = {
  /** "live" = datos reales de dispatch_queue · "empty" = sin actividad (honesto). */
  source: "live" | "empty";
  updatedAt: string;
  queue: { running: number; pending: number; total: number };
  esferas: EsferaState[];
  projects: ProjectRef[];
  feed: FeedItem[];
  health: HealthState;
};
