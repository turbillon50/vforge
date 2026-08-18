/**
 * Tokens de invitación del portal en vivo.
 *
 * Solo el HASH (SHA-256 hex) se guarda en DB (project_live_invitations.token_hash).
 * El token en claro se entrega UNA vez al owner y jamás se persiste. Al aceptar,
 * se rehashea el token presentado y se busca por hash — nunca se compara el
 * token en claro contra la base.
 *
 * Nota: usa `node:crypto`, así que estos handlers deben correr en el runtime
 * Node (no Edge). No importa "server-only" a propósito, para poder probar la
 * lógica con `node --test` sin el runtime de Next.
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** Longitud en bytes del token aleatorio (32 bytes = 256 bits de entropía). */
const TOKEN_BYTES = 32;

/** Formato base64url sin padding — seguro para URLs. */
function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** SHA-256 hex de un token en claro. Determinista. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface GeneratedInvite {
  /** Token en claro — se muestra UNA vez, no se guarda. */
  token: string;
  /** Hash a persistir en token_hash. */
  tokenHash: string;
}

/** Genera un token nuevo aleatorio + su hash. */
export function generateInviteToken(): GeneratedInvite {
  const token = toBase64Url(randomBytes(TOKEN_BYTES));
  return { token, tokenHash: hashInviteToken(token) };
}

/**
 * ¿El token presentado corresponde al hash guardado? Comparación en tiempo
 * constante sobre los hashes (ambos de longitud fija), para no filtrar por
 * temporización. Fail-closed ante cualquier entrada inválida.
 */
export function verifyInviteToken(
  presentedToken: string,
  storedHash: string,
): boolean {
  if (typeof presentedToken !== "string" || typeof storedHash !== "string") {
    return false;
  }
  const presentedHash = hashInviteToken(presentedToken);
  if (presentedHash.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(presentedHash, "utf8"),
      Buffer.from(storedHash, "utf8"),
    );
  } catch {
    return false;
  }
}

/** Sanea un token que llega por request. Devuelve null si es obviamente inválido. */
export function sanitizeToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  // base64url razonable: 20..200 chars, solo alfabeto url-safe.
  if (t.length < 20 || t.length > 200) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}
