import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
}

async function ensureTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS mcp_tokens (
      token_hash text PRIMARY KEY,
      clerk_user_id text NOT NULL,
      label text,
      created_at timestamptz DEFAULT now(),
      last_used_at timestamptz
    )
  `;
}

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Crea un token MCP para un usuario. Devuelve el token EN CLARO una sola vez. */
export async function createMcpToken(userId: string, label = "VForge MCP"): Promise<string> {
  await ensureTable();
  const token = "vfmcp_" + randomBytes(24).toString("hex");
  await sql()`
    INSERT INTO mcp_tokens (token_hash, clerk_user_id, label)
    VALUES (${hash(token)}, ${userId}, ${label})
  `;
  return token;
}

/** Resuelve un token Bearer a su userId. null si inválido. */
export async function resolveMcpToken(token: string): Promise<string | null> {
  if (!token || !token.startsWith("vfmcp_")) return null;
  try {
    await ensureTable();
    const rows = (await sql()`
      SELECT clerk_user_id FROM mcp_tokens WHERE token_hash = ${hash(token)} LIMIT 1
    `) as Array<{ clerk_user_id: string }>;
    if (rows.length === 0) return null;
    await sql()`UPDATE mcp_tokens SET last_used_at = now() WHERE token_hash = ${hash(token)}`;
    return rows[0].clerk_user_id;
  } catch {
    return null;
  }
}
