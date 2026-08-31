/**
 * ¿El owner está PIDIENDO que el trabajo salga a la fábrica, y a quién?
 *
 * Regla de Luis: la sala es para hablar con V. Un mensaje largo NO es una orden
 * de trabajo. Antes bastaba con escribir 40 caracteres para que la sala creara
 * una rama en GitHub y encolara un job sin que nadie lo pidiera. Ahora sólo
 * dispara cuando el owner lo dice con todas sus letras, y si nombra al agente
 * (Claude Code, Codex, Grok) el trabajo se va con ese.
 */

export type WorkOrderExecutor = "claude" | "codex" | "grok";

export interface WorkOrder {
  /** true = hay orden explícita de mandar el trabajo a la fábrica. */
  dispatch: boolean;
  /** Agente que pidió el owner; null = que decida la política del repo. */
  executor: WorkOrderExecutor | null;
}

const QUEUE_VERB =
  /\b(enc[oó]la(?:lo|la|los|las|melo)?|enc[oó]lalo|pon(?:er)?(?:lo|la|los|las)?\s+en\s+cola|mandar?(?:lo|la)?\s+a\s+la\s+cola)\b/;

const SEND_VERB =
  /\b(manda(?:lo|la|los|las|selo|le)?|m[aá]ndalo|m[aá]ndala|m[aá]ndaselo|env[ií]a(?:lo|la|selo)?|mandar|enviar|dispara(?:lo)?|lanza(?:lo)?|arranca(?:lo)?|ejecuta(?:lo)?|corre(?:lo)?|ponlo\s+a\s+trabajar|que\s+lo\s+haga|que\s+lo\s+trabaje|que\s+le\s+entre)\b/;

/** A quién puede ir el trabajo. "cloude" está a propósito: Luis lo escribe así. */
const AGENTS: Array<{ executor: WorkOrderExecutor; pattern: RegExp }> = [
  { executor: "claude", pattern: /\b(claude|clude|cloude|claud)\b/ },
  { executor: "codex", pattern: /\bcodex\b/ },
  { executor: "grok", pattern: /\bgrok\b/ },
];

const TARGET =
  /\b(hetzner|hertzner|f[aá]brica|grok|claude|clude|cloude|claud|codex|runner|daemon|vulcano|servidor)\b/;

const SMALL_TALK =
  /^(di |dec[ií] |responde )?(listo|hola|ok|okay|va|ping|s[ií]|gracias|buenas|adi[oó]s|prueba|test)([.!?]*)$/;

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseWorkOrder(text: string): WorkOrder {
  const t = normalize(text);
  const executor = AGENTS.find((agent) => agent.pattern.test(t))?.executor ?? null;
  if (t.length < 10) return { dispatch: false, executor };
  if (SMALL_TALK.test(t)) return { dispatch: false, executor };
  if (QUEUE_VERB.test(t)) return { dispatch: true, executor };
  return { dispatch: SEND_VERB.test(t) && TARGET.test(t), executor };
}

export function looksLikeWorkOrder(text: string): boolean {
  return parseWorkOrder(text).dispatch;
}
