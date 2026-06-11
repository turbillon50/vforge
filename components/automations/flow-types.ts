import type { NodeType } from "@/lib/automations/types";

export interface EditorNode {
  key: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  next: string[];
  next_alt: string[];
}

export const NODE_META: Record<
  NodeType,
  { name: string; color: string; glow: string; hint: string }
> = {
  trigger: { name: "Disparador", color: "#7c3aed", glow: "124,58,237", hint: "Punto de arranque" },
  wa_send: { name: "WhatsApp", color: "#22c55e", glow: "34,197,94", hint: "Enviar mensaje" },
  crm_upsert: { name: "CRM", color: "#3b82f6", glow: "59,130,246", hint: "Crear/actualizar contacto" },
  condition: { name: "Condición", color: "#f59e0b", glow: "245,158,11", hint: "Ramifica el flujo" },
  delay: { name: "Espera", color: "#06b6d4", glow: "6,182,212", hint: "Pausa" },
  http: { name: "HTTP", color: "#a855f7", glow: "168,85,247", hint: "Llamada a API" },
  log: { name: "Log", color: "#64748b", glow: "100,116,139", hint: "Registrar" },
};

export const PALETTE: NodeType[] = ["wa_send", "crm_upsert", "condition", "delay", "http", "log"];
