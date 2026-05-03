/**
 * Operator Vault — Class 1 secrets (server-side encrypted).
 *
 * Per ADR-008 §Class 1: API keys that vForge needs to power V
 * (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.) live encrypted with
 * AES-256-GCM. The key is derived from the server-only environment
 * variable VFORGE_MASTER_PEPPER (32 bytes hex). The server CAN
 * decrypt these — they're not zero-knowledge — but they're never
 * stored as plaintext.
 *
 * Class 2 (zero-knowledge end-user secrets) is implemented separately
 * in lib/vault/user-crypto.ts when M0 Phase B lands; that one derives
 * its key in the BROWSER via Argon2id-WASM from the Vault Master
 * Password and the server cannot decrypt it.
 */
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_LENGTH = 12; // GCM standard
const KEY_LENGTH = 32; // AES-256

function getMasterKey(): Buffer {
  const pepper = process.env.VFORGE_MASTER_PEPPER;
  if (!pepper) {
    throw new Error("VFORGE_MASTER_PEPPER is not configured");
  }
  // Pepper is a 32-byte (64 hex char) random string we generate once
  // at project setup and store as a Vercel encrypted env var. We use
  // it directly as the AES key — no extra KDF since it's already
  // a high-entropy random.
  if (!/^[0-9a-fA-F]+$/.test(pepper)) {
    throw new Error("VFORGE_MASTER_PEPPER must be a hex string");
  }
  const buf = Buffer.from(pepper, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `VFORGE_MASTER_PEPPER must decode to ${KEY_LENGTH} bytes (got ${buf.length})`,
    );
  }
  return buf;
}

export interface EncryptedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypts a plain-text secret value using AES-256-GCM. The result
 * is three opaque buffers that go into the operator_secrets row's
 * ciphertext / iv / auth_tag columns respectively.
 */
export function encryptOperatorSecret(plaintext: string): EncryptedSecret {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

/**
 * Decrypts a ciphertext fetched from operator_secrets back to the
 * plaintext value. Throws if the auth tag doesn't verify (= ciphertext
 * was tampered with or master key is wrong).
 */
export function decryptOperatorSecret(input: EncryptedSecret): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGO, key, input.iv);
  decipher.setAuthTag(input.authTag);
  const plaintext = Buffer.concat([
    decipher.update(input.ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Quick self-test that the pepper is present and round-trip works.
 * Useful for /api/health endpoints.
 */
export function vaultSelfTest(): { ok: boolean; error?: string } {
  try {
    const probe = "vforge-vault-selftest-" + Date.now();
    const enc = encryptOperatorSecret(probe);
    const dec = decryptOperatorSecret(enc);
    if (dec !== probe) {
      return { ok: false, error: "round-trip mismatch" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
