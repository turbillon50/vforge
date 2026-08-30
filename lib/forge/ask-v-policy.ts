import { humanProviderLabel } from "./provider-errors";

export type VConversationMode = "talk" | "plan";
export type VAskMode = VConversationMode | "execute";

export const ROOM_CEREBRAS_MODEL = "gpt-oss-120b";

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
    return s;
  }
  const last = s.split("/").pop() || s;
  if (/gpt-oss|gpt.oss/i.test(last)) return ROOM_CEREBRAS_MODEL;
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
  return last;
}

/**
 * Plática y Planeación hablan sólo por Cerebras GPT OSS 120B.
 * Misma infra que /app/chat. Sin Mesh, Claude CLI ni OpenRouter.
 * Ejecución no habla por este router.
 */
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
      "No pidas que te reescriban lo que ya está en la sala. No afirmes que no puedes leer las URLs si su contenido viene en el contexto.",
      "Entrega alcance, pasos, riesgos y criterios de aceptación.",
      "Parte de las observaciones, referencias y contenido de la sala; no pidas que te los reescriban.",
      "No escribas código, no crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
      "El usuario podrá convertir después este plan en una tarea de Ejecución con «Usar como tarea».",
      "Toda app debe tener su MCP. Sugiérelo. Los ojos son Navegador Pro + el plugin de Chrome (vforge_project_see). No propongas n8n.",
    ].join(" ");
  }
  return [
    "MODO PLÁTICA.",
    "Eres traductora de la sala, no ejecutas. Claude, Codex y Grok sólo entran si el owner pulsa Ejecutar.",
    "Conversa naturalmente sobre el proyecto, haz preguntas cuando falte contexto y ayuda a pensar.",
    "Lee observaciones, puntos marcados, URLs de referencia y CONTENIDO.md de la sala.",
    "Si el usuario habla de «puntos» o «lo que marqué», usa esas observaciones.",
    "No crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
    "Toda app debe tener su MCP. Sugiérelo. Los ojos son Navegador Pro + el plugin de Chrome (vforge_project_see). No propongas n8n.",
  ].join(" ");
}
