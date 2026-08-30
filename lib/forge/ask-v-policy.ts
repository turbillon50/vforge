import { humanProviderLabel } from "./provider-errors";

export type VConversationMode = "talk" | "plan";
export type VAskMode = VConversationMode | "execute";

export interface ProviderTarget {
  provider: "cerebras" | "mesh" | "hetzner-claude";
  model: string;
  policy?: "fast" | "auto";
}

export function cerebrasModelId(slug: string | undefined): string {
  const s = (slug ?? "").trim();
  if (!s) return "gpt-oss-120b";
  if (s.startsWith("anthropic/") || /claude/i.test(s)) return "gpt-oss-120b";
  if (!s.includes("/")) {
    if (/gpt-oss|gpt.oss/i.test(s)) return "gpt-oss-120b";
    return s;
  }
  const last = s.split("/").pop() || s;
  if (/gpt-oss|gpt.oss/i.test(last)) return "gpt-oss-120b";
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
  return last;
}

/**
 * Plática y planeación usan infraestructura propia primero.
 * Claude CLI nunca es dependencia única: queda al final.
 * Ejecución no habla por este router.
 */
export function providersForMode(
  mode: VAskMode,
  preferredModel?: string,
): ProviderTarget[] {
  if (mode === "execute") return [];
  const model = cerebrasModelId(preferredModel || "gpt-oss-120b");
  return [
    { provider: "cerebras", model },
    { provider: "mesh", model: "auto", policy: "fast" },
    { provider: "hetzner-claude", model: "claude-cli" },
  ];
}

export function fallbackNotice(from: string, to: string): string {
  return `${humanProviderLabel(from)} no disponible; continuamos con ${humanProviderLabel(to)}`;
}

export function modeSystemRules(mode: VConversationMode): string {
  if (mode === "plan") {
    return [
      "MODO PLANEACIÓN.",
      "Entrega alcance, pasos, riesgos y criterios de aceptación.",
      "No escribas código, no crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
      "El usuario podrá convertir después este plan en una tarea de Ejecución con «Usar como tarea».",
    ].join(" ");
  }
  return [
    "MODO PLÁTICA.",
    "Conversa naturalmente sobre el proyecto, haz preguntas cuando falte contexto y ayuda a pensar.",
    "No crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.",
  ].join(" ");
}
