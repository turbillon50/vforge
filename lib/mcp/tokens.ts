import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";
import { isOwnerEmail } from "@/lib/auth/owner";
import { clerkClient } from "@clerk/nextjs/server";
import type { McpPrincipal, McpScope } from "./rbac";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
}

let _ensured = false;
async function ensureTable() {
  if (_ensured) return;
  await sql()`
    CREATE TABLE IF NOT EXISTS mcp_tokens (
      token_hash text PRIMARY KEY,
      clerk_user_id text NOT NULL,
      label text,
      created_at timestamptz DEFAULT now(),
      last_used_at timestamptz
    )
  `;
  // RBAC columns (idempotent — safe si la migración 012 ya corrió).
  await sql()`ALTER TABLE mcp_tokens ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'client'`;
  await sql()`ALTER TABLE mcp_tokens ADD COLUMN IF NOT EXISTS org_id text`;
  // expires_at: NULL = nunca expira (tokens manuales vfmcp_). Los emitidos por
  // OAuth llevan caducidad y se renuevan con refresh_token.
  await sql()`ALTER TABLE mcp_tokens ADD COLUMN IF NOT EXISTS expires_at timestamptz`;
  _ensured = true;
}

/** scope interno → label OAuth público. */
export function oauthScopeLabel(scope: McpScope): string {
  return scope === "admin" ? "mcp:operator" : scope === "public" ? "mcp:public" : "mcp:client";
}

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Decide el scope + org de un usuario Clerk. Owner => admin (org_id null,
 *  filtro deshabilitado). Cualquier otro => client con su propio forge como
 *  org_id (su userId). El scope public NUNCA se emite a un usuario logueado;
 *  se reserva para tokens de marketing creados explícitamente. */
async function scopeForUser(userId: string): Promise<{ scope: McpScope; orgId: string | null }> {
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    const owner = (u.emailAddresses ?? []).some((e) => isOwnerEmail(e.emailAddress));
    if (owner) return { scope: "admin", orgId: null };
  } catch {
    /* si Clerk falla, degradamos a client (fail-closed: nunca admin por error) */
  }
  return { scope: "client", orgId: userId };
}

/**
 * Crea un token MCP para un usuario logueado. Devuelve el token EN CLARO una
 * sola vez. El scope/org se derivan de la identidad: owner => admin, resto =>
 * client aislado a su propio org_id.
 */
export async function createMcpToken(userId: string, label = "VForge MCP"): Promise<string> {
  await ensureTable();
  const { scope, orgId } = await scopeForUser(userId);
  const token = "vfmcp_" + randomBytes(24).toString("hex");
  await sql()`
    INSERT INTO mcp_tokens (token_hash, clerk_user_id, label, scope, org_id)
    VALUES (${hash(token)}, ${userId}, ${label}, ${scope}, ${orgId})
  `;
  return token;
}

/**
 * Emite un access_token MCP para OAuth: mismo formato vfmcp_ (lo resuelve el
 * mismo /api/mcp), pero con caducidad. Reusa mcp_tokens ligado al userId Clerk.
 * Devuelve el token, su scope efectivo y la caducidad en segundos.
 */
export async function createOAuthAccessToken(
  userId: string,
  ttlSeconds: number,
  label = "VForge MCP (OAuth)",
): Promise<{ token: string; scope: McpScope; expiresIn: number }> {
  await ensureTable();
  const { scope, orgId } = await scopeForUser(userId);
  const token = "vfmcp_" + randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await sql()`
    INSERT INTO mcp_tokens (token_hash, clerk_user_id, label, scope, org_id, expires_at)
    VALUES (${hash(token)}, ${userId}, ${label}, ${scope}, ${orgId}, ${expiresAt})
  `;
  return { token, scope, expiresIn: ttlSeconds };
}

/**
 * Crea un token MCP PÚBLICO (marketing). No requiere usuario; scope=public,
 * sin org. Sólo sirve para las tools públicas (getting_started, vforge_method,
 * help). 401 en cualquier tool de datos.
 */
export async function createPublicMcpToken(label = "VForge MCP public"): Promise<string> {
  await ensureTable();
  const token = "vfmcp_" + randomBytes(24).toString("hex");
  await sql()`
    INSERT INTO mcp_tokens (token_hash, clerk_user_id, label, scope, org_id)
    VALUES (${hash(token)}, ${"public"}, ${label}, ${"public"}, ${null})
  `;
  return token;
}

/**
 * Resuelve un token Bearer a su McpPrincipal (userId + scope + orgId).
 * Devuelve null si el token es inválido / inexistente.
 */
export async function resolveMcpToken(token: string): Promise<McpPrincipal | null> {
  if (!token || !token.startsWith("vfmcp_")) return null;
  try {
    await ensureTable();
    const rows = (await sql()`
      SELECT clerk_user_id, scope, org_id,
             (expires_at IS NOT NULL AND expires_at < now()) AS expired
      FROM mcp_tokens WHERE token_hash = ${hash(token)} LIMIT 1
    `) as Array<{ clerk_user_id: string; scope: string | null; org_id: string | null; expired: boolean }>;
    if (rows.length === 0) return null;
    if (rows[0].expired) return null; // caducado (OAuth) ⇒ el cliente debe refrescar
    await sql()`UPDATE mcp_tokens SET last_used_at = now() WHERE token_hash = ${hash(token)}`;
    const r = rows[0];
    const scope: McpScope =
      r.scope === "admin" || r.scope === "public" ? r.scope : "client";
    return {
      userId: r.clerk_user_id === "public" ? null : r.clerk_user_id,
      scope,
      // admin: filtro deshabilitado (org null). client: su org. public: null.
      orgId: scope === "admin" ? null : r.org_id,
    };
  } catch {
    return null;
  }
}
