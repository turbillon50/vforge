/**
 * Cifrado ENVELOPE por tenant (AES-256-GCM) para el Baúl de Esferas.
 *
 * Modelo de dos niveles:
 *   1) MASTER_KEY  — `CONTROL_PLANE_MASTER_KEY` (32 bytes hex) en env. Nunca toca DB.
 *      Fallback a `VFORGE_MASTER_PEPPER` (ya presente en prod) para no romper deploy.
 *   2) DEK por tenant — 32 bytes aleatorios, generados al crear el tenant. Se
 *      guardan ENVUELTOS (cifrados con la MASTER_KEY) en tenants.dek_wrapped.
 *   3) Credenciales — cada secreto del cliente se cifra con el DEK de SU tenant.
 *
 * Ventajas: rotar la MASTER_KEY = re-envolver N DEKs (no re-cifrar N credenciales);
 * comprometer un DEK no expone a otros tenants; las llaves de clientes nunca se
 * mezclan entre sí ni con las de Luis.
 */
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_LEN = 12; // GCM estándar
const KEY_LEN = 32; // AES-256

function masterKey(): Buffer {
  const raw =
    process.env.CONTROL_PLANE_MASTER_KEY?.trim() ||
    process.env.VFORGE_MASTER_PEPPER?.trim();
  if (!raw) throw new Error("CONTROL_PLANE_MASTER_KEY no configurada");
  if (!/^[0-9a-fA-F]+$/.test(raw)) throw new Error("CONTROL_PLANE_MASTER_KEY debe ser hex");
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== KEY_LEN) {
    throw new Error(`CONTROL_PLANE_MASTER_KEY debe decodificar a ${KEY_LEN} bytes (got ${buf.length})`);
  }
  return buf;
}

export interface Sealed {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

function seal(key: Buffer, plaintext: Buffer): Sealed {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

function open(key: Buffer, sealed: Sealed): Buffer {
  const decipher = createDecipheriv(ALGO, key, sealed.iv);
  decipher.setAuthTag(sealed.authTag);
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
}

/** Genera un DEK nuevo y lo devuelve envuelto con la MASTER_KEY. */
export function generateWrappedDek(): { wrapped: Sealed } {
  const dek = randomBytes(KEY_LEN);
  const wrapped = seal(masterKey(), dek);
  // dek se descarta del scope al volver; solo persiste su forma envuelta.
  return { wrapped };
}

/** Desenvuelve (descifra) el DEK de un tenant usando la MASTER_KEY. */
export function unwrapDek(wrapped: Sealed): Buffer {
  return open(masterKey(), wrapped);
}

/** Cifra un secreto del cliente con el DEK ya desenvuelto del tenant. */
export function encryptWithDek(dek: Buffer, plaintext: string): Sealed {
  return seal(dek, Buffer.from(plaintext, "utf8"));
}

/** Descifra un secreto del cliente con el DEK del tenant. */
export function decryptWithDek(dek: Buffer, sealed: Sealed): string {
  return open(dek, sealed).toString("utf8");
}

/** Self-test del envelope (para /api/.../health). Sin tocar DB. */
export function envelopeSelfTest(): { ok: boolean; error?: string } {
  try {
    const { wrapped } = generateWrappedDek();
    const dek = unwrapDek(wrapped);
    const probe = "vforge-esfera-selftest";
    const sealed = encryptWithDek(dek, probe);
    const back = decryptWithDek(dek, sealed);
    return back === probe ? { ok: true } : { ok: false, error: "round-trip mismatch" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
