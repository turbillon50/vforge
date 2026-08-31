import { humanProviderLabel } from "./provider-errors";

export type VConversationMode = "talk" | "plan";
export type VAskMode = VConversationMode | "execute";

export const ROOM_CEREBRAS_MODEL = "gpt-oss-120b";

/**
 * Modelo multimodal de Cerebras. El id vive en env porque el catálogo de
 * Cerebras cambia; el default es el multimodal público.
 * NUNCA poner aquí slugs de OpenRouter (google/…, meta-llama/…): Cerebras
 * responde 404 y la sala se queda sin V en cuanto alguien manda una foto.
 */
export const ROOM_CEREBRAS_VISION_MODEL =
  process.env.CEREBRAS_VISION_MODEL?.trim() || "llama-4-scout-17b-16e-instruct";

export function cerebrasTalkModel(hasExpedientePhotos: boolean): string {
  return hasExpedientePhotos ? ROOM_CEREBRAS_VISION_MODEL : ROOM_CEREBRAS_MODEL;
}

export interface ProviderTarget {
  provider: "cerebras";
  model: string;
}

export function cerebrasModelId(slug: string | undefined): string {
  const s = (slug ?? "").trim();
  if (!s) return ROOM_CEREBRAS_MODEL;
  if (s.startsWith("anthropic/") || /claude/i.test(s)) return ROOM_CEREBRAS_MODEL;
  if (!s.includes("/")) {
    if (/gpt-oss|gpt.oss/i.test(s)) return ROOM_CEREBRAS_MODEL;
    if (/scout|maverick|llama.?4/i.test(s)) return ROOM_CEREBRAS_VISION_MODEL;
    return s;
  }
  const last = s.split("/").pop() || s;
  if (/gpt-oss|gpt.oss/i.test(last)) return ROOM_CEREBRAS_MODEL;
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
  if (/scout|maverick/i.test(last)) return ROOM_CEREBRAS_VISION_MODEL;
  return last;
}

export function providersForMode(
  mode: VAskMode,
  _preferredModel?: string,
): ProviderTarget[] {
  if (mode === "execute") return [];
  return [{ provider: "cerebras", model: ROOM_CEREBRAS_MODEL }];
}

export function fallbackNotice(from: string, to: string): string {
  return `${humanProviderLabel(from)} no disponible; continuamos con ${humanProviderLabel(to)}`;
}

export function modeSystemRules(mode: VConversationMode): string {
  const hands =
    "Eres V, la hermana de Luis. El chat de la sala es tuyo y está siempre abierto. Recuerdas. " +
    "La sala te da: expediente del proyecto, comentarios, referencias, fotos y memoria. " +
    "Con eso sola ya eres útil, aunque Hetzner esté caído. " +
    "Lee las observaciones de la sala. Nunca pidas que el owner corra curl ni que entre por SSH. " +
    "Nunca te presentes como traductora ni como asistente genérico. " +
    "La sala es chat + expediente. No hay terminal, no hay consola negra, no hay panel de la derecha: no los menciones. " +
    "No crees ramas, commits ni PRs por tu cuenta ni digas que lo hiciste: eso lo encola la fábrica cuando Luis lo ordena con todas sus letras.";
  if (mode === "plan") {
    return [
      "MODO PLAN.",
      hands,
      "Arma el plan con las observaciones y URLs de la sala. No ejecutes código de producto.",
      "En este turno entrega el plan ahora, con pasos y criterios de aceptación verificables.",
      "Toda app debe tener su MCP. No propongas n8n.",
    ].join(" ");
  }
  return [
    "MODO HERMANA.",
    hands,
    "Habla natural. Lee observaciones, marcas, Brain, recuerdos y fotos.",
    "Toda app debe tener su MCP. No propongas n8n.",
  ].join(" ");
}
