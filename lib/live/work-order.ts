export function looksLikeWorkOrder(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (/^(di |dec[ií] )?(listo|hola|ok|ping|gracias|buenas)([.!]*)?$/i.test(t)) {
    return false;
  }
  if (t.length >= 40) return true;
  return /(haz|arregla|cambia|implementa|construye|monta|sube|merge|deploy|hero|lutor|diseño|codigo|código|pantalla|app|trabajo|grok|hetzner)/i.test(
    t,
  );
}
