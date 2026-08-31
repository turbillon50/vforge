export function looksLikeWorkOrder(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (/^(di |dec[ií] )?(listo|hola|ok|ping)([.!]*)?$/i.test(t)) return false;
  return /(haz|arregla|cambia|implementa|construye|monta|sube|merge|deploy|hero|lutor|diseño|codigo|código|pantalla|app)/i.test(
    t,
  );
}
