/**
 * V·Admin contract guard (contrato-va-v1).
 *
 * Toda ruta /api/va/v1/* es server-to-server y exige:
 *   Authorization: Bearer <VA_API_KEY>   ==   process.env.VA_API_KEY
 *
 * Si falta la env o el header no cuadra -> 401. Read-only en v1.
 * Este módulo NO toca nada existente: solo lo consumen las rutas /api/va/*.
 */

/** Devuelve true si el Bearer del request cuadra con VA_API_KEY. */
export function checkVaAuth(req: Request): boolean {
  const key = process.env.VA_API_KEY;
  if (!key) return false;
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Comparación de longitud constante para no filtrar por timing.
  const provided = match[1].trim();
  if (provided.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) {
    diff |= provided.charCodeAt(i) ^ key.charCodeAt(i);
  }
  return diff === 0;
}

/** Respuesta 401 estándar del contrato. */
export function vaUnauthorized(): Response {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
