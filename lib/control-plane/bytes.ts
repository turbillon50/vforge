/**
 * Helpers de bytea ↔ Buffer para el driver neon-serverless (HTTP).
 * neon devuelve bytea como string hex con prefijo `\x`; al escribir aceptamos
 * un Buffer directo. Centralizado aquí para que cifrado y persistencia no
 * diverjan.
 */
export function toBuf(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (Array.isArray(v)) return Buffer.from(v as number[]);
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return Buffer.from(v.slice(2), "hex");
    return Buffer.from(v, "utf8");
  }
  throw new Error("valor bytea no reconocido");
}
