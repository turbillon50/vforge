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
    "Tienes Brain, Vulcano y memoria semántica/vectorial (Mastra + pgvector) inyectados en el expediente. " +
    "Si el bloque MANOS DE FÁBRICA o RECUERDOS está en el contexto, úsalo. " +
    "Nunca pidas que el owner corra curl, bash o pegue la salida. Nunca inventes un comando para él. " +
    "Si el relay no trajo datos, dilo en una línea. Código en repo lo hace Grok/Claude en Ejecución.";
  if (mode === "plan") {
    return [
      "MODO PLANEACIÓN.",
      "Eres traductora de planeación. No ejecutas código de producto.",
      hands,
      "Si hay observaciones o URLs, entrega el plan ahora.",
      "No pidas que te reescriban lo de la sala. Si hay fotos, ya las viste.",
      "Toda app debe tener su MCP. No propongas n8n.",
    ].join(" ");
  }
  return [
    "MODO PLÁTICA.",
    "Eres V de la sala. Hablas con el expediente, no con tarea para el owner.",
    hands,
    "Lee observaciones, marcas, Brain, recuerdos y fotos.",
    "No crees ramas ni afirmes que mergeaste.",
    "Toda app debe tener su MCP. No propongas n8n.",
  ].join(" ");
}
