import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity, loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { queryAll, queryOne, sql } from "@/lib/db/client";
import { createMcpToken } from "@/lib/mcp/tokens";
import {
  buildIntegrationCatalog,
  isSafeDomain,
  isSafeSecretName,
  mcpClientConfig,
  parseGithubRepo,
  secretLooksLike,
  VERCEL_TOOL_ACTIONS,
  type VaultSecretMeta,
} from "@/lib/live/project-tools";
import { encryptOperatorSecret } from "@/lib/vault/operator-crypto";
import { invalidateSecretCache } from "@/lib/vault/get-secret";
import {
  addDomain,
  assignAlias,
  getProject,
  listDeployments,
  listProjectDomains,
  listProjectEnvVars,
  pickCustomDomain,
  setEnvVar,
  triggerDeployment,
  type EnvTarget,
} from "@/lib/vercel/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: noStore });
}

function ownerOnly(live: { me: { role: string; isPlatformOwner: boolean } }) {
  return live.me.role === "owner" || live.me.isPlatformOwner;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const live = await loadVForgeLiveProject(projectId).catch(() => null);
  if (!live) return jsonError("not_found", 404);

  const project = await queryOne<ProjectRow>(
    `SELECT id, name, github_repo, github_url, vercel_project_id, vercel_url, domain, status
       FROM projects
      WHERE id = $1
      LIMIT 1`,
    [projectId],
  );
  if (!project) return jsonError("not_found", 404);

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
  const github = parseGithubRepo(project.github_repo) || parseGithubRepo(project.github_url);
  const integrations = buildIntegrationCatalog({
    github: Boolean(github),
    vercel: Boolean(project.vercel_project_id || project.vercel_url),
    neon: secretNames.some((name) => secretLooksLike(name, "NEON") || secretLooksLike(name, "DATABASE")),
    clerk: secretNames.some((name) => secretLooksLike(name, "CLERK")),
    stripe: secretNames.some((name) => secretLooksLike(name, "STRIPE")),
    resend: secretNames.some((name) => secretLooksLike(name, "RESEND")),
    blob: secretNames.some((name) => secretLooksLike(name, "BLOB")),
    mercadopago: secretNames.some((name) => secretLooksLike(name, "MERCADOPAGO") || secretLooksLike(name, "MERCADO_PAGO")),
    namecom: secretNames.some((name) => secretLooksLike(name, "NAMECOM") || secretLooksLike(name, "NAME_COM")),
    hetzner: secretNames.some((name) => secretLooksLike(name, "HETZNER")),
    rows: integrationRows,
  });

  let vercel: Record<string, unknown> = {
    connected: Boolean(project.vercel_project_id || project.vercel_url),
    projectId: project.vercel_project_id,
    url: project.vercel_url,
    domain: project.domain,
    github,
    actions: VERCEL_TOOL_ACTIONS,
    deployments: [],
    domains: [],
    env: [],
  };
  if (project.vercel_project_id) {
    try {
      const [deployments, domains, env, details] = await Promise.all([
        listDeployments(project.vercel_project_id, { limit: 8 }),
        listProjectDomains(project.vercel_project_id),
        listProjectEnvVars(project.vercel_project_id),
        getProject(project.vercel_project_id).catch(() => null),
      ]);
      vercel = {
        connected: true,
        projectId: project.vercel_project_id,
        url: project.vercel_url,
        domain: project.domain || pickCustomDomain(domains),
        github,
        actions: VERCEL_TOOL_ACTIONS,
        framework: details?.framework ?? null,
        rootDirectory: details?.rootDirectory ?? null,
        name: details?.name ?? project.name,
        deployments: deployments.map((item) => ({
          uid: item.uid,
          url: item.url,
          state: item.readyState || item.state || "unknown",
          target: item.target || "preview",
          createdAt: item.createdAt,
          commit: item.meta?.githubCommitSha?.slice(0, 7) || null,
          ref: item.meta?.githubCommitRef || null,
          message: (item.meta?.githubCommitMessage || "").split("\n")[0]?.slice(0, 80) || null,
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

  const mcpName = `VForge · ${live.project.name}`;
  const mcpUrl = "https://vforge.site/api/mcp";

  return NextResponse.json(
    {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        github,
      },
      canWrite: ownerOnly(live),
      vercel,
      integrations,
      vault: {
        secrets: secrets.map((item) => ({
          ...item,
          preview: "••••••••",
        })),
      },
      mcp: {
        url: mcpUrl,
        projectId,
        hint: "Toda app debe tener su MCP. vforge_project_see fotografía cada visor y lo guarda en documentos. No usamos n8n.",
        config: mcpClientConfig({ name: mcpName, url: mcpUrl }),
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
  if (!identity || !live) return jsonError("not_found", 404);
  if (live.me.role === "observer") return jsonError("forbidden", 403);

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : "";

  if (action === "mcp-token") {
    const token = await createMcpToken(identity.userId, `VForge MCP · ${projectId}`);
    const url = "https://vforge.site/api/mcp";
    return NextResponse.json(
      {
        token,
        url,
        config: {
          name: `VForge · ${live.project.name}`,
          url,
          auth: "Bearer",
          token,
          clients: mcpClientConfig({ name: `VForge · ${live.project.name}`, url }),
        },
      },
      { headers: noStore },
    );
  }

  if (action === "photograph-viewports") {
    try {
      const { photographAndStoreVisors } = await import("@/lib/live/photograph-visors");
      const result = await photographAndStoreVisors({
        projectId,
        preferCdp: live.me.isPlatformOwner,
      });
      return NextResponse.json(
        {
          ok: result.shots.length > 0,
          shots: result.shots.map((shot) => ({
            viewport: shot.viewport,
            label: shot.label,
            url: shot.url,
            engine: shot.engine,
          })),
          failures: result.failures,
        },
        { headers: noStore },
      );
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "No se pudieron fotografiar los visores",
        502,
      );
    }
  }

  if (action === "secret") {
    if (!ownerOnly(live)) return jsonError("forbidden", 403);
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    const value = typeof payload?.value === "string" ? payload.value : "";
    const provider = typeof payload?.provider === "string" ? payload.provider.trim() : null;
    if (!isSafeSecretName(name) || !value || value.length > 8192) {
      return jsonError("invalid_secret", 400);
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
      return jsonError("vault_unavailable", 503, { notice: "La bóveda no pudo cifrar el secreto." });
    }
  }

  if (
    action === "vercel-redeploy" ||
    action === "vercel-domain" ||
    action === "vercel-env" ||
    action === "vercel-promote"
  ) {
    if (!ownerOnly(live)) return jsonError("forbidden", 403);
    const project = await queryOne<ProjectRow>(
      `SELECT id, name, github_repo, github_url, vercel_project_id, vercel_url, domain, status
         FROM projects
        WHERE id = $1
        LIMIT 1`,
      [projectId],
    );
    if (!project?.vercel_project_id) return jsonError("vercel_unlinked", 409);

    try {
      if (action === "vercel-redeploy") {
        const github = parseGithubRepo(project.github_repo) || parseGithubRepo(project.github_url);
        if (!github) return jsonError("github_unlinked", 409);
        const branch = typeof payload?.branch === "string" && payload.branch.trim() ? payload.branch.trim() : "main";
        const result = await triggerDeployment({
          projectId: project.vercel_project_id,
          name: project.name,
          ghRepoFullName: github,
          branch,
          target: "production",
        });
        return NextResponse.json({ ok: true, deployment: result }, { headers: noStore });
      }

      if (action === "vercel-domain") {
        const domain = typeof payload?.domain === "string" ? payload.domain.trim().toLowerCase() : "";
        if (!isSafeDomain(domain)) return jsonError("invalid_domain", 400);
        const result = await addDomain(project.vercel_project_id, domain);
        return NextResponse.json({ ok: true, domain: result }, { headers: noStore });
      }

      if (action === "vercel-env") {
        const key = typeof payload?.key === "string" ? payload.key.trim() : "";
        const value = typeof payload?.value === "string" ? payload.value : "";
        const targetRaw = Array.isArray(payload?.target)
          ? payload.target.filter((item): item is string => typeof item === "string")
          : ["production", "preview"];
        const target = targetRaw.filter((item): item is EnvTarget =>
          item === "production" || item === "preview" || item === "development",
        );
        if (!isSafeSecretName(key) || !value || value.length > 8192 || target.length === 0) {
          return jsonError("invalid_env", 400);
        }
        await setEnvVar(project.vercel_project_id, { key, value, target });
        return NextResponse.json({ ok: true, key, target, preview: "••••••••" }, { headers: noStore });
      }

      const deploymentId = typeof payload?.deploymentId === "string" ? payload.deploymentId.trim() : "";
      if (!deploymentId) return jsonError("invalid_deployment", 400);
      const domains = await listProjectDomains(project.vercel_project_id);
      const alias =
        (typeof payload?.alias === "string" && isSafeDomain(payload.alias) ? payload.alias.trim() : null) ||
        project.domain ||
        pickCustomDomain(domains) ||
        (project.vercel_url || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!alias) return jsonError("no_production_alias", 409);
      const result = await assignAlias(deploymentId, alias);
      return NextResponse.json({ ok: true, alias: result.alias, deploymentId }, { headers: noStore });
    } catch (error) {
      return jsonError("vercel_unavailable", 503, {
        notice: error instanceof Error ? error.message : "Vercel no respondió.",
      });
    }
  }

  return jsonError("unknown_action", 400);
}
