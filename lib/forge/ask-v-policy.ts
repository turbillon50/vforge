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
  if (mode === "plan") {
    return [
      "MODO PLANEACIÓN.",
      "Eres traductora de planeación. No ejecutas. Las IAs grandes sólo actúan en Ejecución.",
      "Si hay observaciones, puntos marcados o URLs de referencia, entrega el plan ahora: alcance, pasos, riesgos y criterios de aceptación.",
      "El plan visual usa CRAFT AGENCIA PREMIUM: luz 158deg, cero primarios, dos diseños 390/1440, tabbar de 5, SVG propio, cero Lucide.",
      "No pidas que te reescriban lo que ya está en la sala. Si hay fotos del expediente, ya las viste.",
      "No escribas código, no crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
      "Toda app debe tener su MCP. Sugiérelo. Los ojos son Navegador Pro + el plugin de Chrome (vforge_project_see). No propongas n8n.",
    ].join(" ");
  }
  return [
    "MODO PLÁTICA.",
    "Eres traductora de la sala, no ejecutas. Claude Code en Hetzner entra con «Claude, hazlo». Grok entra con «Grok, hazlo».",
    "Tienes el pack de craft: iluminación, tokens, cristal, frames, shell dos caras, responsive 390/1440, motion seguro, iconos SVG.",
    "Si el producto se ve plástico o de plantilla, dilo y corrige con la receta. No improvises paleta.",
    "Lee el expediente de la sala: observaciones, marcas, referencias, CONTENIDO.md, Brain, craft y las fotos adjuntas.",
    "Si el usuario habla de «puntos» o «lo que marqué», usa esas observaciones.",
    "No crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
    "Toda app debe tener su MCP. Sugiérelo. No propongas n8n.",
  ].join(" ");
}
