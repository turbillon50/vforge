/**
 * Pase firmado (HMAC-SHA256, 60 s) que VForge le da al servidor de la casa para probar que quien pide es un owner.
 * El secreto (COLECTIVO_SECRET) lo comparten VForge y la puerta del Hetzner; el navegador nunca lo ve.
 */
import { createHmac } from "node:crypto";

const b64 = (b: Buffer) => b.toString("base64url");

export function firmarPase(email: string, segundos = 60): string | null {
  const secreto = process.env.COLECTIVO_SECRET;
  if (!secreto) return null;
  const cuerpo = b64(Buffer.from(JSON.stringify({ e: email.toLowerCase(), x: Math.floor(Date.now() / 1000) + segundos })));
  return `${cuerpo}.${b64(createHmac("sha256", secreto).update(cuerpo).digest())}`;
}

export const CASA_URL = process.env.COLECTIVO_URL || "https://glm.vforge.site";
