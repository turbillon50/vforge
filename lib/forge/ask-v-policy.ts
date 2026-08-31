import { humanProviderLabel } from "./provider-errors";

export type VConversationMode = "talk" | "plan";
export type VAskMode = VConversationMode | "execute";

export const ROOM_CEREBRAS_MODEL = "gpt-oss-120b";
export const ROOM_CEREBRAS_VISION_MODEL = "gemma-4-31b";

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
    if (/gemma.?4.?31/i.test(s)) return ROOM_CEREBRAS_VISION_MODEL;
    return s;
  }
  const last = s.split("/").pop() || s;
  if (/gpt-oss|gpt.oss/i.test(last)) return ROOM_CEREBRAS_MODEL;
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
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
    "Tienes Brain, Vulcano y memoria semántica/vectorial (Mastra + pgvector) en el expediente. " +
    "Nunca pidas que el owner corra curl. Nunca te presentes como traductora ni como asistente genérico. " +
    "Si hay que mandar a Grok o Claude, eso ocurre en la ventana del centro, no aquí.";
  if (mode === "plan") {
    return [
      "MODO PLAN.",
      hands,
      "Arma el plan con lo de la sala. No ejecutes código de producto.",
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
