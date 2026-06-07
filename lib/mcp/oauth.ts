/**
 * VForge MCP — OAuth 2.1 (RFC 6749 + PKCE RFC 7636 + DCR RFC 7591 +
 * Protected Resource Metadata RFC 9728 + AS Metadata RFC 8414).
 *
 * Da soporte al flujo "Add custom connector" estilo Sumsub: el cliente (Claude)
 * descubre el authorization server por el WWW-Authenticate / .well-known del
 * recurso, se registra dinámicamente, manda al usuario a /authorize (sesión
 * Clerk + consentimiento), intercambia el code por un access_token y refresca.
 *
 * IMPORTANTE (independencia de Hetzner): todo este módulo habla DIRECTO a Neon
 * vía lib/db/client (DATABASE_URL). No toca el relay http de Hetzner.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { queryAll, queryOne, sql } from "@/lib/db/client";

/** Origin público del MCP. En prod: https://vforge.site */
export const MCP_ORIGIN = (
  process.env.MCP_PUBLIC_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://vforge.site"
).replace(/\/$/, "");

export const RESOURCE_URL = `${MCP_ORIGIN}/api/mcp`;
export const RESOURCE_METADATA_URL = `${MCP_ORIGIN}/.well-known/oauth-protected-resource`;

export const OAUTH_SCOPES = ["mcp:operator", "mcp:client", "mcp:public"] as const;

/** TTL del access_token emitido por OAuth (los manuales vfmcp_ no expiran). */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días
const CODE_TTL_SECONDS = 600; // 10 min

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sha256b64url = (s: string) =>
  createHash("sha256").update(s).digest("base64url");

/* ────────────────────────────── schema ────────────────────────────── */

let _ensured = false;
export async function ensureOauthTables(): Promise<void> {
  if (_ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id text PRIMARY KEY,
      client_secret_hash text,
      client_name text,
      redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
      grant_types jsonb NOT NULL DEFAULT '["authorization_code","refresh_token"]'::jsonb,
      response_types jsonb NOT NULL DEFAULT '["code"]'::jsonb,
      token_endpoint_auth_method text NOT NULL DEFAULT 'none',
      scope text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code_hash text PRIMARY KEY,
      client_id text NOT NULL,
      clerk_user_id text NOT NULL,
      redirect_uri text NOT NULL,
      code_challenge text NOT NULL,
      code_challenge_method text NOT NULL DEFAULT 'S256',
      scope text,
      resource text,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      used boolean NOT NULL DEFAULT false
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token_hash text PRIMARY KEY,
      clerk_user_id text NOT NULL,
      client_id text,
      scope text,
      created_at timestamptz NOT NULL DEFAULT now(),
      revoked boolean NOT NULL DEFAULT false
    )
  `;
  _ensured = true;
}

/* ────────────────────────────── clients (DCR) ────────────────────────────── */

export interface OauthClient {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string | null;
}

export interface RegisterClientInput {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
}

/** Registro dinámico (RFC 7591). Acepta cualquier cliente. Cliente público
 *  (PKCE, sin secret) por defecto; emite secret sólo si pide auth distinta a
 *  "none". */
export async function registerClient(
  input: RegisterClientInput,
): Promise<{ client: OauthClient; client_secret?: string; issued_at: number }> {
  await ensureOauthTables();
  const client_id = "vfc_" + randomBytes(16).toString("hex");
  const redirect_uris = Array.isArray(input.redirect_uris)
    ? input.redirect_uris.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
    : [];
  const authMethod =
    input.token_endpoint_auth_method === "client_secret_basic" ||
    input.token_endpoint_auth_method === "client_secret_post"
      ? input.token_endpoint_auth_method
      : "none";
  const grant_types =
    Array.isArray(input.grant_types) && input.grant_types.length
      ? input.grant_types
      : ["authorization_code", "refresh_token"];
  const response_types =
    Array.isArray(input.response_types) && input.response_types.length
      ? input.response_types
      : ["code"];

  let client_secret: string | undefined;
  let secretHash: string | null = null;
  if (authMethod !== "none") {
    client_secret = "vfs_" + randomBytes(24).toString("hex");
    secretHash = sha256(client_secret);
  }

  await sql`
    INSERT INTO oauth_clients
      (client_id, client_secret_hash, client_name, redirect_uris,
       grant_types, response_types, token_endpoint_auth_method, scope)
    VALUES (
      ${client_id}, ${secretHash}, ${input.client_name ?? null},
      ${JSON.stringify(redirect_uris)}::jsonb,
      ${JSON.stringify(grant_types)}::jsonb,
      ${JSON.stringify(response_types)}::jsonb,
      ${authMethod}, ${input.scope ?? null}
    )
  `;

  return {
    client: {
      client_id,
      client_name: input.client_name ?? null,
      redirect_uris,
      grant_types,
      response_types,
      token_endpoint_auth_method: authMethod,
      scope: input.scope ?? null,
    },
    client_secret,
    issued_at: Math.floor(Date.now() / 1000),
  };
}

export async function getClient(clientId: string): Promise<OauthClient | null> {
  if (!clientId) return null;
  await ensureOauthTables();
  const row = await queryOne<{
    client_id: string;
    client_name: string | null;
    redirect_uris: string[] | string;
    grant_types: string[] | string;
    response_types: string[] | string;
    token_endpoint_auth_method: string;
    scope: string | null;
  }>(
    `SELECT client_id, client_name, redirect_uris, grant_types, response_types,
            token_endpoint_auth_method, scope
       FROM oauth_clients WHERE client_id = $1 LIMIT 1`,
    [clientId],
  ).catch(() => null);
  if (!row) return null;
  const arr = (v: string[] | string): string[] =>
    Array.isArray(v) ? v : (() => { try { return JSON.parse(v); } catch { return []; } })();
  return {
    client_id: row.client_id,
    client_name: row.client_name,
    redirect_uris: arr(row.redirect_uris),
    grant_types: arr(row.grant_types),
    response_types: arr(row.response_types),
    token_endpoint_auth_method: row.token_endpoint_auth_method,
    scope: row.scope,
  };
}

/** Valida el client_secret presentado (sólo clientes confidenciales). */
export async function verifyClientSecret(
  clientId: string,
  secret: string | null | undefined,
): Promise<boolean> {
  const row = await queryOne<{ client_secret_hash: string | null; token_endpoint_auth_method: string }>(
    `SELECT client_secret_hash, token_endpoint_auth_method FROM oauth_clients WHERE client_id = $1 LIMIT 1`,
    [clientId],
  ).catch(() => null);
  if (!row) return false;
  if (row.token_endpoint_auth_method === "none" || !row.client_secret_hash) return true; // público
  if (!secret) return false;
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(row.client_secret_hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ────────────────────────────── auth codes ────────────────────────────── */

export async function issueAuthCode(args: {
  clientId: string;
  clerkUserId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string | null;
  resource?: string | null;
}): Promise<string> {
  await ensureOauthTables();
  const code = "vfac_" + randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  await sql`
    INSERT INTO oauth_codes
      (code_hash, client_id, clerk_user_id, redirect_uri, code_challenge,
       code_challenge_method, scope, resource, expires_at)
    VALUES (
      ${sha256(code)}, ${args.clientId}, ${args.clerkUserId}, ${args.redirectUri},
      ${args.codeChallenge}, ${args.codeChallengeMethod || "S256"},
      ${args.scope ?? null}, ${args.resource ?? null}, ${expires}
    )
  `;
  return code;
}

export interface RedeemedCode {
  clerk_user_id: string;
  client_id: string;
  redirect_uri: string;
  scope: string | null;
}

/**
 * Canjea (one-time) un authorization code validando PKCE S256, client_id,
 * redirect_uri y expiración. Marca el code como usado de forma atómica.
 */
export async function redeemAuthCode(args: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<RedeemedCode | { error: string }> {
  await ensureOauthTables();
  const codeHash = sha256(args.code);
  const row = await queryOne<{
    client_id: string;
    clerk_user_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    scope: string | null;
    used: boolean;
    expired: boolean;
  }>(
    `SELECT client_id, clerk_user_id, redirect_uri, code_challenge,
            code_challenge_method, scope, used,
            (expires_at < now()) AS expired
       FROM oauth_codes WHERE code_hash = $1 LIMIT 1`,
    [codeHash],
  ).catch(() => null);

  if (!row) return { error: "invalid_grant: code no encontrado" };
  if (row.used) return { error: "invalid_grant: code ya utilizado" };
  if (row.expired) return { error: "invalid_grant: code expirado" };
  if (row.client_id !== args.clientId)
    return { error: "invalid_grant: client_id no coincide" };
  if (row.redirect_uri !== args.redirectUri)
    return { error: "invalid_grant: redirect_uri no coincide" };

  // PKCE S256
  if (!args.codeVerifier) return { error: "invalid_request: falta code_verifier" };
  const expected = row.code_challenge;
  const got =
    (row.code_challenge_method || "S256").toUpperCase() === "PLAIN"
      ? args.codeVerifier
      : sha256b64url(args.codeVerifier);
  if (got !== expected) return { error: "invalid_grant: PKCE no verifica" };

  // marca usado (atómico: sólo si seguía sin usar)
  const upd = (await sql`
    UPDATE oauth_codes SET used = true
     WHERE code_hash = ${codeHash} AND used = false
     RETURNING code_hash
  `) as Array<{ code_hash: string }>;
  if (upd.length === 0) return { error: "invalid_grant: code ya utilizado" };

  return {
    clerk_user_id: row.clerk_user_id,
    client_id: row.client_id,
    redirect_uri: row.redirect_uri,
    scope: row.scope,
  };
}

/* ────────────────────────────── refresh tokens ────────────────────────────── */

export async function issueRefreshToken(args: {
  clerkUserId: string;
  clientId: string;
  scope?: string | null;
}): Promise<string> {
  await ensureOauthTables();
  const token = "vfrt_" + randomBytes(32).toString("hex");
  await sql`
    INSERT INTO oauth_refresh_tokens (token_hash, clerk_user_id, client_id, scope)
    VALUES (${sha256(token)}, ${args.clerkUserId}, ${args.clientId}, ${args.scope ?? null})
  `;
  return token;
}

export interface RefreshRecord {
  clerk_user_id: string;
  client_id: string | null;
  scope: string | null;
}

/** Consume (rota) un refresh token: lo revoca y devuelve su dueño. */
export async function rotateRefreshToken(
  token: string,
  clientId: string,
): Promise<RefreshRecord | { error: string }> {
  await ensureOauthTables();
  const h = sha256(token);
  const row = await queryOne<{
    clerk_user_id: string;
    client_id: string | null;
    scope: string | null;
    revoked: boolean;
  }>(
    `SELECT clerk_user_id, client_id, scope, revoked
       FROM oauth_refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [h],
  ).catch(() => null);
  if (!row) return { error: "invalid_grant: refresh token desconocido" };
  if (row.revoked) return { error: "invalid_grant: refresh token revocado" };
  if (row.client_id && clientId && row.client_id !== clientId)
    return { error: "invalid_grant: client_id no coincide" };
  await sql`UPDATE oauth_refresh_tokens SET revoked = true WHERE token_hash = ${h}`;
  return { clerk_user_id: row.clerk_user_id, client_id: row.client_id, scope: row.scope };
}

/* ────────────────────────────── helpers ────────────────────────────── */

/** Sólo permite redirect_uris exactamente registradas para el cliente. */
export function redirectUriAllowed(client: OauthClient, redirectUri: string): boolean {
  if (!redirectUri) return false;
  return client.redirect_uris.includes(redirectUri);
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

export function jsonCors(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
