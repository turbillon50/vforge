/** Tipos compartidos del motor de Automatizaciones + CRM. */

export type FlowStatus = "draft" | "active" | "paused";

export type NodeType =
  | "trigger"
  | "wa_send"
  | "crm_upsert"
  | "condition"
  | "delay"
  | "http"
  | "log";

export type TriggerType = "cron" | "webhook" | "wa_incoming" | "crm_event";

export type BridgeId = "personal" | "goossip";

export interface FlowNode {
  id: string;
  flow_id: string;
  node_key: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  next: string[];
  next_alt: string[];
}

export interface FlowTrigger {
  id: string;
  flow_id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  active: boolean;
  last_fired_at: string | null;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  status: FlowStatus;
  graph: { nodes: unknown[]; edges: unknown[] };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunLogEntry {
  ts: string;
  nodeKey: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export type RunStatus = "running" | "success" | "error";

export interface FlowRun {
  id: string;
  flow_id: string;
  trigger_id: string | null;
  trigger_type: string;
  status: RunStatus;
  context: Record<string, unknown>;
  logs: RunLogEntry[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface CrmContact {
  id: string;
  wa_number: string | null;
  name: string | null;
  push_name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  source: string;
  opt_in: boolean;
  meta: Record<string, unknown>;
  first_seen: string;
  last_seen: string;
}
