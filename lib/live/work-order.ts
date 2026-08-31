/**
 * ¿El owner está PIDIENDO que el trabajo salga a la fábrica (Hetzner/Grok)?
 *
 * Regla de Luis: la sala es para hablar con V. Un mensaje largo NO es una orden
 * de trabajo. Antes bastaba con escribir 40 caracteres para que la sala creara
 * una rama en GitHub y encolara un job sin que nadie lo pidiera. Ahora sólo
 * dispara cuando el owner lo dice con todas sus letras.
 */

const QUEUE_VERB =
  /\b(enc[oó]la(?:lo|la|los|las|melo)?|enc[oó]lalo|pon(?:er)?(?:lo|la|los|las)?\s+en\s+cola|mandar?(?:lo|la)?\s+a\s+la\s+cola)\b/;

const SEND_VERB =
  /\b(manda(?:lo|la|los|las|selo)?|m[aá]ndalo|m[aá]ndala|env[ií]a(?:lo|la)?|mandar|enviar|dispara(?:lo)?|lanza(?:lo)?|arranca(?:lo)?|ejecuta(?:lo)?|corre(?:lo)?|ponlo\s+a\s+trabajar|que\s+lo\s+haga|que\s+lo\s+trabaje)\b/;

const TARGET = /\b(hetzner|hertzner|f[aá]brica|grok|runner|daemon|vulcano|servidor)\b/;

const SMALL_TALK =
  /^(di |dec[ií] |responde )?(listo|hola|ok|okay|va|ping|s[ií]|gracias|buenas|adi[oó]s|prueba|test)([.!?]*)$/;

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function looksLikeWorkOrder(text: string): boolean {
  const t = normalize(text);
  if (t.length < 10) return false;
  if (SMALL_TALK.test(t)) return false;
  if (QUEUE_VERB.test(t)) return true;
  return SEND_VERB.test(t) && TARGET.test(t);
}
