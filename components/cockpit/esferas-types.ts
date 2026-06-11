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
  /** Cola de actividad en vivo (log_tail del daemon): qué hace AHORA mismo. */
  logTail: string | null;
  /** Estado crudo del job activo (running/pending/…) para el popup de detalle. */
  status_raw: string | null;
  /** `source` crudo del job activo (de dónde vino: chat, daemon, etc.). */
  source: string | null;
  /** `gajo` crudo del job activo (sub-tarea del worktree) si aplica. */
  gajo: string | null;
  /** Veredicto Grok del job activo, si ya fue auditado. */
  grokVerdict: GrokVerdict | null;
  /** Notas del auditor Grok del job activo (recortadas). */
  grokNotes: string | null;
  /** Proyecto del último job COMPLETADO de este agente (solo se muestra en reposo). */
  lastProject: string | null;
  /** ISO del último job completado, para el texto "último: <tag> hace N días". */
  lastSince: string | null;
};

export type ProjectRef = {
  key: string;
  label: string;
  /** Cuántas esferas/jobs activos pertenecen a este proyecto. */
  active: number;
};

/** Veredicto del auditor Grok sobre un job. */
export type GrokVerdict = "APROBADO" | "RECHAZADO" | "REVISION";

/**
 * Un JOB corriendo (status running) en dispatch_queue. El Taller renderiza UNA
 * esfera por cada uno de estos en el centro del núcleo, conectada por un haz a
 * la esfera del agente que lo ejecuta. A diferencia de EsferaState (1 por
 * agente), aquí puede haber varios jobs del MISMO agente en paralelo.
 */
export type ActiveJob = {
  id: number;
  agent: EsferaId | null;
  agentName: string;
  /** Etiqueta legible del proyecto (gajo/source). */
  project: string | null;
  projectKey: string | null;
  /** Resumen del prompt. */
  task: string | null;
  /** ISO del inicio (started_at/created_at). */
  since: string | null;
  /** Avance 0-100 si el daemon lo reporta. */
  progress: number | null;
  /** Cola de actividad en vivo (log_tail del daemon): qué hace AHORA mismo. */
  logTail: string | null;
  /** Estado crudo del row (running/in_progress/…) para el popup de detalle. */
  status_raw: string;
  /** `source` crudo del job (de dónde vino: chat, daemon, etc.). */
  source: string | null;
  /** `gajo` crudo del job (sub-tarea del worktree) si aplica. */
  gajo: string | null;
  /** Veredicto Grok del job, si ya fue auditado. */
  grokVerdict: GrokVerdict | null;
  /** Notas del auditor Grok del job (recortadas). */
  grokNotes: string | null;
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
  /** Veredicto Grok del job (si ya fue auditado). */
  grokVerdict: GrokVerdict | null;
  /** Notas del auditor Grok (recortadas). */
  grokNotes: string | null;
};

export type DaemonProc = { alive: boolean; count: number };

export type HealthState = {
  /** El relay de Hetzner respondió. */
  relayUp: boolean;
  /**
   * Proceso del daemon Vulcano: true = vivo · false = caído · null = sin lectura
   * (relay sin señal). El banner "núcleo pausado" se enciende SOLO cuando es
   * `false` (caído confirmado), nunca por desconocido.
   */
  daemonAlive: boolean | null;
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
  /** Jobs corriendo ahora — una esfera central por cada uno (multi-esfera). */
  jobs: ActiveJob[];
  projects: ProjectRef[];
  feed: FeedItem[];
  /** Último veredicto Grok emitido (para el feed del Taller). */
  lastVerdict: { id: number; verdict: GrokVerdict; notes: string | null; project: string | null; ts: string | null } | null;
  health: HealthState;
};
