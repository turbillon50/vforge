/**
 * VForge — OAuth 2.0 para conectores "oficiales" (Claude.ai).
 *
 * Flujo simple (authorization_code, sin PKCE) pensado para que Claude.ai se
 * conecte al MCP de VForge como conector oficial pre-registrado:
 *
 *   1. Claude manda al usuario a  GET /api/oauth/authorize
 *   2. VForge autentica al usuario con Clerk y rebota a /api/oauth/callback
 *   3. /callback emite un authorization_code efímero (5 min) y vuelve al
 *      redirect_uri del cliente con ?code=...&state=...
 *   4. Claude canjea el code en POST /api/oauth/token por un access_token
 *      (un token vfmcp_ real que entiende /api/mcp).
 *
 * Reutiliza las tablas oauth_clients / oauth_codes que ya define
 * lib/mcp/oauth.ts (ensureOauthTables) y la emisión de tokens vfmcp_ de
 * lib/mcp/tokens.ts. Habla DIRECTO a Neon vía lib/db/client (DATABASE_URL).
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sql, queryOne } from "@/lib/db/client";
import { ensureOauthTables, getClient, type OauthClient } from "@/lib/mcp/oauth";

/** Origin público del conector. En prod: https://vforge.site */
export const OAUTH_ORIGIN = (
  process.env.MCP_PUBLIC_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://vforge.site"
).replace(/\/$/, "");

/** TTL del authorization_code efímero. */
export const CONNECTOR_CODE_TTL_SECONDS = 300; // 5 min

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/* ────────────────────────────── clientes ────────────────────────────── */

export interface NamedClientResult {
  client_id: string;
  client_secret: string;
  client_name: string | null;
  redirect_uris: string[];
}

/**
 * Registra (o actualiza) un cliente con un client_id ELEGIDO (p.ej. "claude-ai")
 * y un client_secret confidencial. Si no se pasa secret, genera uno seguro.
 * Devuelve el secret EN CLARO una sola vez (sólo se persiste su hash).
 */
export async function registerNamedClient(input: {
  client_id: string;
  client_name?: string | null;
  redirect_uris: string[];
  client_secret?: string;
}): Promise<NamedClientResult> {
  await ensureOauthTables();
  const redirect_uris = (input.redirect_uris ?? []).filter(
    (u) => typeof u === "string" && /^https?:\/\//i.test(u),
  );
  const client_secret = input.client_secret || "vfs_" + randomBytes(24).toString("hex");
  const secretHash = sha256(client_secret);
  await sql`
    INSERT INTO oauth_clients
      (client_id, client_secret_hash, client_name, redirect_uris,
       grant_types, response_types, token_endpoint_auth_method, scope)
    VALUES (
      ${input.client_id}, ${secretHash}, ${input.client_name ?? null},
      ${JSON.stringify(redirect_uris)}::jsonb,
      '["authorization_code"]'::jsonb, '["code"]'::jsonb,
      'client_secret_post', null
    )
    ON CONFLICT (client_id) DO UPDATE SET
      client_secret_hash = EXCLUDED.client_secret_hash,
      client_name        = EXCLUDED.client_name,
      redirect_uris      = EXCLUDED.redirect_uris,
      token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method
  `;
  return {
    client_id: input.client_id,
    client_secret,
    client_name: input.client_name ?? null,
    redirect_uris,
  };
}

/**
 * Asegura que el client_id existe en oauth_clients. Si no existe, lo registra
 * como cliente público (sin secret) conservando su redirect_uri — esto cubre el
 * requisito "registra el client_id si no existe" del endpoint /authorize.
 */
export async function ensureClientRegistered(
  clientId: string,
  redirectUri: string,
): Promise<OauthClient> {
  const existing = await getClient(clientId);
  if (existing) return existing;
  await ensureOauthTables();
  const redirect_uris = /^https?:\/\//i.test(redirectUri) ? [redirectUri] : [];
  await sql`
    INSERT INTO oauth_clients
      (client_id, client_secret_hash, client_name, redirect_uris,
       grant_types, response_types, token_endpoint_auth_method, scope)
    VALUES (
      ${clientId}, null, ${clientId},
      ${JSON.stringify(redirect_uris)}::jsonb,
      '["authorization_code"]'::jsonb, '["code"]'::jsonb, 'none', null
    )
    ON CONFLICT (client_id) DO NOTHING
  `;
  const created = await getClient(clientId);
  if (!created) throw new Error("no se pudo registrar el cliente");
  return created;
}

/** Valida el client_secret presentado contra el hash guardado (clientes
 *  confidenciales). Clientes públicos (sin secret) siempre validan. */
export async function verifyConnectorSecret(
  clientId: string,
  secret: string | null | undefined,
): Promise<boolean> {
  const row = await queryOne<{ client_secret_hash: string | null }>(
    `SELECT client_secret_hash FROM oauth_clients WHERE client_id = $1 LIMIT 1`,
    [clientId],
  ).catch(() => null);
  if (!row) return false;
  if (!row.client_secret_hash) return true; // cliente público
  if (!secret) return false;
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(row.client_secret_hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Sólo permite redirect_uris exactamente registradas para el cliente. */
export function redirectUriAllowed(client: OauthClient, redirectUri: string): boolean {
  if (!redirectUri) return false;
  return client.redirect_uris.includes(redirectUri);
}

/* ────────────────────────────── auth codes ────────────────────────────── */

/** Emite un authorization_code efímero (5 min) ligado al usuario Clerk. */
export async function issueConnectorCode(args: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope?: string | null;
}): Promise<string> {
  await ensureOauthTables();
  const code = "vfoac_" + randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + CONNECTOR_CODE_TTL_SECONDS * 1000).toISOString();
  // code_challenge es NOT NULL en la tabla compartida; este flujo no usa PKCE,
  // así que guardamos cadena vacía + método "none".
  await sql`
    INSERT INTO oauth_codes
      (code_hash, client_id, clerk_user_id, redirect_uri, code_challenge,
       code_challenge_method, scope, expires_at)
    VALUES (
      ${sha256(code)}, ${args.clientId}, ${args.userId}, ${args.redirectUri},
      '', 'none', ${args.scope ?? null}, ${expires}
    )
  `;
  return code;
}

export interface RedeemedConnectorCode {
  userId: string;
  scope: string | null;
}

/**
 * Canjea (one-time) un authorization_code: valida client_id, expiración y que no
 * haya sido usado. Lo marca como usado de forma atómica.
 */
export async function redeemConnectorCode(args: {
  code: string;
  clientId: string;
}): Promise<RedeemedConnectorCode | { error: string }> {
  await ensureOauthTables();
  const codeHash = sha256(args.code);
  const row = await queryOne<{
    client_id: string;
    clerk_user_id: string;
    scope: string | null;
    used: boolean;
    expired: boolean;
  }>(
    `SELECT client_id, clerk_user_id, scope, used, (expires_at < now()) AS expired
       FROM oauth_codes WHERE code_hash = $1 LIMIT 1`,
    [codeHash],
  ).catch(() => null);

  if (!row) return { error: "invalid_grant: code no encontrado" };
  if (row.used) return { error: "invalid_grant: code ya utilizado" };
  if (row.expired) return { error: "invalid_grant: code expirado" };
  if (row.client_id !== args.clientId)
    return { error: "invalid_grant: client_id no coincide" };

  const upd = (await sql`
    UPDATE oauth_codes SET used = true
     WHERE code_hash = ${codeHash} AND used = false
     RETURNING code_hash
  `) as Array<{ code_hash: string }>;
  if (upd.length === 0) return { error: "invalid_grant: code ya utilizado" };

  return { userId: row.clerk_user_id, scope: row.scope };
}
