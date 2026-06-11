/** Tipos compartidos del estado de las esferas Vulcano (cockpit). */

export type EsferaId = "claude" | "codex" | "grok" | "shell" | "browser";

export type EsferaState = {
  id: EsferaId;
  name: string;
  role: string;
  status: "working" | "idle";
  project: string | null;
  task: string | null;
  since: string | null;
};

export type EsferasPayload = {
  source: "live" | "mock";
  updatedAt: string;
  queue: { running: number; pending: number };
  esferas: EsferaState[];
};
