# ADR-008: Zero-Knowledge Vault con Vault Master Password separado del Clerk password

- **Estado:** Accepted
- **Fecha:** 2026-05-03
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Vault real (M0 del cerebro Forge) — almacén cifrado de API keys y secrets
- **Supersede:** parcial — refina ADR-003 con el approach de derivación de master key

## Contexto

ADR-003 estableció que las API keys del usuario viven cifradas en Neon con AES-256-GCM, derivando la master key vía Argon2id desde la contraseña del usuario. La idea original era usar la **contraseña de Clerk** del usuario para derivarla.

Al implementar M0 descubrimos que **Clerk no expone el password del usuario al backend** — esa es feature de seguridad de Clerk (correcta y deseable). Por lo tanto, no podemos derivar la master key del password de Clerk.

Esto nos enfrenta a tres caminos:
1. Master key generada server-side, cifrada con derivación del session token. **NO zero-knowledge** — server puede descifrar.
2. Vault Master Password adicional (separado del de Clerk), derivado en cliente. **Zero-knowledge real** — server jamás ve el clear value.
3. PIN de 6 dígitos derivado en cliente. Más fácil de recordar pero menos seguro.

## Decisión

Adoptar el camino 2: **Vault Master Password separado del de Clerk**, derivado en cliente con Argon2id-WASM. Mismo modelo que 1Password, Bitwarden y Proton Pass.

**Flujo:**

```
1. Login normal con Clerk (Google / email + password) — flow estándar.
2. Primera vez que el usuario abre /vault y crea un secret:
   → Modal: "Crea tu Vault Master Password"
   → Modal: "Aquí están tus 3 backup codes. Guárdalos. Solo se muestran una vez."
3. Cliente deriva master_key = Argon2id(password, salt=server_pepper + user_id)
4. master_key vive en sessionStorage (encrypted con SubtleCrypto + key derivada del session token)
5. Cliente cifra el secret con AES-256-GCM antes de enviarlo
6. Backend recibe { ciphertext, iv, auth_tag }, no puede descifrar
7. Para descifrar: cliente fetcha ciphertext, descifra localmente con su master_key
8. Backup codes son hashes (Argon2id) almacenados en DB; el clear value se muestra
   solo una vez al setup. Si el usuario pierde su Vault password, usa un backup
   code para regenerar la master_key (el backup code mismo es derivable a la key).
```

**Diseño multi-user desde el inicio:**

- Cada usuario tiene su propio `vault_salt` (random per-user al setup).
- Cada usuario tiene sus propios backup codes hasheados.
- Cada secret en DB tiene su propio `iv` y `auth_tag`.
- El `server_pepper` es global (un secret en Vercel env: `VFORGE_MASTER_PEPPER`),
  agregado al input de Argon2id como contramedida adicional. Si el server_pepper
  se compromete, hay que rotar todos los Vault passwords.

## Razón

1. **Zero-knowledge real.** El server literalmente no puede descifrar los secrets ni con orden judicial. Es el contrato estándar de un password manager.
2. **Cumple con expectativas de la industria.** 1Password, Bitwarden, Proton Pass — todos hacen exactamente esto. Cualquier auditor de seguridad lo va a entender.
3. **Multi-user trivial.** Cada user trae su propio password al cliente; el server solo ve metadata. Escala a 1 o 1,000,000 usuarios sin cambiar el modelo.
4. **Recovery simple y seguro.** Backup codes son la única vía. Sin email recovery (eso añade vector — compromiso de Gmail = compromiso del Vault). El operador acepta el contrato: si pierde password Y backup codes, los secrets se pierden. Igual que 1Password.
5. **Argon2id en cliente vía WASM.** `hash-wasm` es ~30KB, carga async, no afecta initial paint. Memoria-hard, resistente a GPU/ASIC.
6. **AES-256-GCM nativo.** Web Crypto API (`crypto.subtle.encrypt`) es estándar W3C, hardware-accelerated en mayoría de browsers, no requiere lib externa.
7. **Server-side pepper como defensa adicional.** Argon2id(password + pepper, salt) significa que aunque el atacante obtenga la DB completa (con sales y hashes de backup codes), no puede hacer brute-force offline sin también comprometer el server.

## Consecuencias

**Fácil:**
- Backend trivial — solo CRUD sobre `secrets` con campos opacos (`ciphertext`, `iv`, `auth_tag`).
- Auditoría externa de seguridad pasa sin observaciones.
- Multi-tenant gratis: cada user trae su propio password.
- Cumple GDPR Art. 32 sin necesidad de medidas adicionales.

**Difícil:**
- UX: el usuario tiene que recordar 2 passwords (Clerk + Vault). Se mitiga con UX clara — el Vault password solo se pide al primer uso, después se cachea por la sesión.
- Recovery: si pierde ambos, los secrets se pierden. Se mitiga forzando backup codes al setup (no es opcional).
- Operacional: el `VFORGE_MASTER_PEPPER` no se puede rotar sin forzar a TODOS los usuarios a re-cifrar sus secrets. Se mitiga: el pepper se genera UNA VEZ al deploy del proyecto, queda fijo de por vida.

**Deuda técnica asumida:**
- WASM blob (~30KB) en cliente.
- Lógica de cifrado en cliente requiere tests E2E que validen el round-trip (encrypt en browser X → decrypt en browser Y) en al menos Chrome iOS, Safari iOS, Chrome Android, Firefox.
- Cambio de Vault password requiere descifrar todos los secrets, re-cifrar con la nueva, atómicamente. Necesita transacción optimista.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Master key derivada del password de Clerk** | Imposible — Clerk no expone el password al backend (feature de seguridad) |
| **Master key generada server-side, cifrada con session token** | NO zero-knowledge — server tiene la key disponible, lo cual rompe el contrato |
| **PIN de 6 dígitos** | Brute-forceable con 1M intentos; no aceptable para vault de production secrets |
| **WebAuthn / passkey como master** | Excelente UX pero la key derivada está atada al device — perder el device = perder el vault sin sync. Posible v2.0. |
| **Email recovery firmado** | Añade vector — compromiso de Gmail compromete el vault. Operador lo descartó explícitamente. |
| **Master key en localStorage cifrada con PIN** | Vector: cliente comprometido (XSS) descifra el localStorage. Backup codes en DB son más seguros. |

## Implementación

**Stack:**

```
hash-wasm                  Argon2id en browser (~30KB)
@noble/ciphers              AES-256-GCM (nativo Web Crypto API también funciona)
zod                         validación de inputs
```

**Schema mínimo:**

```sql
CREATE TABLE users (
  id              text PRIMARY KEY,                 -- = clerk user_id
  email           text NOT NULL,
  vault_setup_at  timestamptz,                      -- NULL hasta primer uso del Vault
  vault_salt      bytea,                            -- 16 bytes random per-user
  vault_backup_codes_hashed bytea[],                -- array de hashes Argon2id de los 3 backup codes
  role            text NOT NULL DEFAULT 'operator',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE secrets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      text,                             -- NULL = global
  name            text NOT NULL,
  scope           text NOT NULL CHECK (scope IN ('client', 'platform', 'platform-global')),
  ciphertext      bytea NOT NULL,
  iv              bytea NOT NULL,
  auth_tag        bytea NOT NULL,
  injected_to     text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz,
  UNIQUE (user_id, project_id, name)
);

CREATE TABLE audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  resource_id     text,
  ring            int NOT NULL CHECK (ring BETWEEN 0 AND 3),
  ip              inet,
  user_agent      text,
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_user_created ON audit_events (user_id, created_at DESC);
```

**Server-side pepper:**

```bash
# Una vez al setup del proyecto
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
# Guardar en Vercel env como VFORGE_MASTER_PEPPER (encrypted)
```

**Client-side derivation:**

```ts
// lib/vault/client-crypto.ts
import { argon2id } from 'hash-wasm';

export async function deriveMasterKey(
  password: string,
  salt: Uint8Array,           // user.vault_salt from DB
  pepper: string,             // VFORGE_MASTER_PEPPER from env (sent to client at session start)
): Promise<CryptoKey> {
  const combined = password + pepper;
  const hashBytes = await argon2id({
    password: combined,
    salt,
    parallelism: 4,
    iterations: 3,
    memorySize: 64 * 1024,    // 64 MB
    hashLength: 32,           // 256 bits
    outputType: 'binary',
  });
  return crypto.subtle.importKey(
    'raw',
    hashBytes,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSecret(plain: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

export async function decryptSecret(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey,
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plain);
}
```

**Backup codes:**

```ts
// Generar al setup
function generateBackupCodes(): string[] {
  return Array.from({ length: 3 }, () =>
    Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 12)
      .toUpperCase()
      .match(/.{4}/g)!.join('-'),  // formato: XXXX-XXXX-XXXX
  );
}
// Hash con Argon2id, guardar hashes en user.vault_backup_codes_hashed
// Mostrar clear values al usuario UNA vez, cliente debe descargar
```

**Recovery flow:**

```
1. User clic "Olvidé mi Vault password"
2. Modal pide un backup code
3. Cliente Argon2id(backup_code) → compara con cada hash en vault_backup_codes_hashed
4. Si match: cliente puede regenerar master_key porque el backup code ES derivable a la key
   (estrategia: al setup, además de hashearlos, cifrar la master_key con cada backup code
   y guardar los 3 ciphertexts en user.master_key_recovery_blobs)
5. Marcar ese backup code como consumed
6. Forzar al user a generar 3 nuevos backup codes
```

## Esto significa para el operador

- En cada nuevo proyecto del catálogo, ejecutar `node -e '...randomBytes(32)...'` una vez para generar el `VFORGE_MASTER_PEPPER`, agregarlo a Vercel env como encrypted.
- Documentar para el usuario final que perder Vault password Y backup codes = secrets perdidos (claramente, en el modal de setup).
- Auditar logs de `audit_events` periódicamente para detectar accesos sospechosos.

## Referencias

- Argon2id RFC: https://datatracker.ietf.org/doc/html/rfc9106
- Web Crypto API spec: https://www.w3.org/TR/WebCryptoAPI/
- 1Password Security Design: https://1password.com/files/1Password-White-Paper.pdf (referencia de modelo)
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- hash-wasm: https://github.com/Daninet/hash-wasm
