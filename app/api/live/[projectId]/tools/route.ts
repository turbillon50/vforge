import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity, loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { queryAll, queryOne, sql } from "@/lib/db/client";
import { createMcpToken } from "@/lib/mcp/tokens";
import {
  buildIntegrationCatalog,
  isSafeSecretName,
  secretLooksLike,
  type VaultSecretMeta,
} from "@/lib/live/project-tools";
import { encryptOperatorSecret } from "@/lib/vault/operator-crypto";
import { invalidateSecretCache } from "@/lib/vault/get-secret";
import {
  listDeployments,
  listProjectDomains,
  listProjectEnvVars,
} from "@/lib/vercel/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

interface ProjectRow {
  id: string;
  name: string;
  github_repo: string | null;
  github_url: string | null;
  vercel_project_id: string | null;
  vercel_url: string | null;
  domain: string | null;
  status: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const live = await loadVForgeLiveProject(projectId).catch(() => null);
  if (!live) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });

  const project = await queryOne<ProjectRow>(
    `SELECT id, name, github_repo, github_url, vercel_project_id, vercel_url, domain, status
       FROM projects
      WHERE id = $1
      LIMIT 1`,
    [projectId],
  );
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });

  const [integrationRows, secrets] = await Promise.all([
    queryAll<{ kind: string; label: string; status: string }>(
      `SELECT kind, label, status FROM project_integrations WHERE project_id = $1`,
      [projectId],
    ).catch(() => []),
    queryAll<VaultSecretMeta>(
      `SELECT id::text, name, provider, created_at::text, rotated_at::text, last_used_at::text
         FROM project_secrets
        WHERE project_id = $1
        ORDER BY name`,
      [projectId],
    ).catch(() => []),
  ]);

  const secretNames = secrets.map((item) => item.name);
  const integrations = buildIntegrationCatalog({
    github: Boolean(project.github_repo || project.github_url),
    vercel: Boolean(project.vercel_project_id || project.vercel_url),
    neon: secretNames.some((name) => secretLooksLike(name, "NEON") || secretLooksLike(name, "DATABASE")),
    clerk: secretNames.some((name) => secretLooksLike(name, "CLERK")),
    stripe: secretNames.some((name) => secretLooksLike(name, "STRIPE")),
    resend: secretNames.some((name) => secretLooksLike(name, "RESEND")),
    blob: secretNames.some((name) => secretLooksLike(name, "BLOB")),
    rows: integrationRows,
  });

  let vercel: Record<string, unknown> = {
    connected: Boolean(project.vercel_project_id || project.vercel_url),
    projectId: project.vercel_project_id,
    url: project.vercel_url,
    domain: project.domain,
    deployments: [],
    domains: [],
    env: [],
  };
  if (project.vercel_project_id) {
    try {
      const [deployments, domains, env] = await Promise.all([
        listDeployments(project.vercel_project_id, { limit: 8 }),
        listProjectDomains(project.vercel_project_id),
        listProjectEnvVars(project.vercel_project_id),
      ]);
      vercel = {
        connected: true,
        projectId: project.vercel_project_id,
        url: project.vercel_url,
        domain: project.domain,
        deployments: deployments.map((item) => ({
          uid: item.uid,
          url: item.url,
          state: item.readyState || item.state || "unknown",
          target: item.target || "preview",
          createdAt: item.createdAt,
        })),
        domains: domains.map((item) => ({
          name: item.name,
          verified: item.verified !== false,
        })),
        env: env.map((item) => ({
          key: item.key,
          type: item.type,
          target: item.target,
        })),
      };
    } catch (error) {
      vercel = {
        ...vercel,
        error: error instanceof Error ? error.message : "No se pudo leer Vercel",
      };
    }
  }

  return NextResponse.json(
    {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        github: project.github_repo || project.github_url,
      },
      vercel,
      integrations,
      vault: {
        secrets: secrets.map((item) => ({
          ...item,
          preview: "••••••••",
        })),
      },
      mcp: {
        url: "https://vforge.site/api/mcp",
        projectId,
        hint: "Cada app tiene su MCP. Genéralo y pégalo en tu IA.",
      },
    },
    { headers: noStore },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const identity = await getCurrentVForgeIdentity();
  const live = await loadVForgeLiveProject(projectId).catch(() => null);
  if (!identity || !live) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  if (live.me.role === "observer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : "";

  if (action === "mcp-token") {
    const token = await createMcpToken(identity.userId, `VForge MCP · ${projectId}`);
    return NextResponse.json(
      {
        token,
        url: "https://vforge.site/api/mcp",
        config: {
          name: `VForge · ${live.project.name}`,
          url: "https://vforge.site/api/mcp",
          auth: "Bearer",
          token,
        },
      },
      { headers: noStore },
    );
  }

  if (action === "secret") {
    if (live.me.role !== "owner" && !live.me.isPlatformOwner) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
    }
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const value = typeof payload?.value === "string" ? payload.value : "";
    const provider = typeof payload?.provider === "string" ? payload.provider.trim() : null;
    if (!isSafeSecretName(name) || !value || value.length > 8192) {
      return NextResponse.json({ error: "invalid_secret" }, { status: 400, headers: noStore });
    }
    try {
      const enc = encryptOperatorSecret(value);
      const ciphertextHex = enc.ciphertext.toString("hex");
      const ivHex = enc.iv.toString("hex");
      const authTagHex = enc.authTag.toString("hex");
      await sql`
        INSERT INTO project_secrets (
          project_id, name, provider, ciphertext, iv, auth_tag
        ) VALUES (
          ${projectId}, ${name}, ${provider},
          decode(${ciphertextHex}, 'hex'),
          decode(${ivHex}, 'hex'),
          decode(${authTagHex}, 'hex')
        )
        ON CONFLICT (project_id, name) DO UPDATE SET
          provider = COALESCE(EXCLUDED.provider, project_secrets.provider),
          ciphertext = EXCLUDED.ciphertext,
          iv = EXCLUDED.iv,
          auth_tag = EXCLUDED.auth_tag,
          rotated_at = now()
      `;
      invalidateSecretCache(name, projectId);
      return NextResponse.json({ ok: true, name, preview: "••••••••" }, { headers: noStore });
    } catch {
      return NextResponse.json(
        { error: "vault_unavailable", notice: "La bóveda no pudo cifrar el secreto." },
        { status: 503, headers: noStore },
      );
    }
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400, headers: noStore });
}
