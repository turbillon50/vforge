import { sql } from "@/lib/db/client";
import {
  encryptOperatorSecret,
  vaultSelfTest,
} from "@/lib/vault/operator-crypto";
import { invalidateSecretCache } from "@/lib/vault/get-secret";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectSecretRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  provider: string | null;
  created_at: string;
  rotated_at: string | null;
  last_used_at: string | null;
}

/**
 * GET  /api/vault/project-secrets?projectId=...
 * POST /api/vault/project-secrets
 *
 * Per-project sibling of /api/vault/operator-secrets. Same crypto,
 * scoped by project_id. GET returns metadata only (never plaintext).
 * POST upserts (project_id, name) — encrypts value with the same
 * AES-256-GCM master pepper used for operator_secrets.
 */
export async function GET(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return jsonError("projectId query param required", 400);

  const rows = (await sql`
    SELECT id, project_id, name, description, provider,
           created_at, rotated_at, last_used_at
      FROM project_secrets
     WHERE project_id = ${projectId}
     ORDER BY name
  `) as ProjectSecretRow[];

  const vault_health = vaultSelfTest();

  return new Response(
    JSON.stringify({
      project_id: projectId,
      secrets: rows,
      vault_health,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}

export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  let body: {
    projectId?: string;
    name?: string;
    value?: string;
    description?: string | null;
    provider?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const projectId = body.projectId?.trim();
  const name = body.name?.trim();
  const value = body.value;
  if (!projectId) return jsonError("projectId is required", 400);
  if (!name || !/^[A-Z][A-Z0-9_]{0,63}$/.test(name)) {
    return jsonError(
      "name must be UPPER_SNAKE_CASE (max 64 chars, [A-Z][A-Z0-9_]*)",
      400,
    );
  }
  if (typeof value !== "string" || value.length === 0) {
    return jsonError("value must be a non-empty string", 400);
  }
  if (value.length > 8192) {
    return jsonError("value too large (max 8192 chars)", 413);
  }

  const projExists = (await sql`SELECT id FROM projects WHERE id = ${projectId}`) as Array<{ id: string }>;
  if (projExists.length === 0) {
    return jsonError(`project '${projectId}' not found`, 404);
  }

  const enc = encryptOperatorSecret(value);

  const ciphertextHex = enc.ciphertext.toString("hex");
  const ivHex = enc.iv.toString("hex");
  const authTagHex = enc.authTag.toString("hex");

  const upsert = (await sql`
    INSERT INTO project_secrets (
      project_id, name, description, provider,
      ciphertext, iv, auth_tag
    ) VALUES (
      ${projectId}, ${name},
      ${body.description ?? null}, ${body.provider ?? null},
      decode(${ciphertextHex}, 'hex'),
      decode(${ivHex}, 'hex'),
      decode(${authTagHex}, 'hex')
    )
    ON CONFLICT (project_id, name) DO UPDATE SET
      description = COALESCE(EXCLUDED.description, project_secrets.description),
      provider = COALESCE(EXCLUDED.provider, project_secrets.provider),
      ciphertext = EXCLUDED.ciphertext,
      iv = EXCLUDED.iv,
      auth_tag = EXCLUDED.auth_tag,
      rotated_at = now()
    RETURNING id, project_id, name, created_at, rotated_at
  `) as Array<{
    id: string;
    project_id: string;
    name: string;
    created_at: string;
    rotated_at: string | null;
  }>;

  invalidateSecretCache(name, projectId);

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${auth.userId}, 'vault.project.write', 'project_secret', ${upsert[0].id}, 2,
      ${JSON.stringify({ name, project_id: projectId, rotated: !!upsert[0].rotated_at })}::jsonb
    )
  `;

  return new Response(JSON.stringify({ secret: upsert[0] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
