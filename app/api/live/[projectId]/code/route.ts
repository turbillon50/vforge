import { NextRequest, NextResponse } from "next/server";
import { githubClientFromToken } from "@/lib/github/client";
import { getCurrentVForgeIdentity, fetchVForgeApi, projectApiPath } from "@/lib/api/vforge-owned";
import { getUserSecret } from "@/lib/connect/user-vault";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const maxFileBytes = 1_000_000;

type Repository = {
  repo_full_name: string;
  role: string;
  is_primary: boolean;
  default_branch: string | null;
};

type Access = {
  identity: NonNullable<Awaited<ReturnType<typeof getCurrentVForgeIdentity>>>;
  repositories: Repository[];
  canWrite: boolean;
};

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStore });
}

function safePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim().replace(/^\/+/, "");
  if (!path || path.length > 500 || path.includes("\\") || path.includes("\0")) return null;
  if (path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  return path;
}

function parseRepo(value: string): [string, string] | null {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(value);
  return match ? [match[1], match[2]] : null;
}

async function authorize(projectId: string, signal: AbortSignal): Promise<Access | Response> {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return json({ error: "not_found" }, 404);

  try {
    const upstream = await fetchVForgeApi(projectApiPath(projectId, "context"), identity, { signal });
    if (!upstream.ok) return json({ error: upstream.status === 403 ? "forbidden" : "not_found" }, upstream.status);
    const payload = (await upstream.json()) as {
      repositories?: Repository[];
      me?: { role?: string; canWrite?: boolean };
    };
    const repositories = Array.isArray(payload.repositories) ? payload.repositories : [];
    return {
      identity,
      repositories,
      canWrite: payload.me?.role === "owner",
    };
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

function selectedRepository(access: Access, requested: string | null): Repository | null {
  if (!access.repositories.length) return null;
  if (!requested) return access.repositories.find((repo) => repo.is_primary) ?? access.repositories[0];
  return access.repositories.find((repo) => repo.repo_full_name.toLowerCase() === requested.toLowerCase()) ?? null;
}

async function githubForUser(userId: string) {
  const token = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  return token ? githubClientFromToken(token) : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorize(projectId, req.signal);
  if (access instanceof Response) return access;

  const action = new URL(req.url).searchParams.get("action") || "repositories";
  if (action === "repositories") {
    return json({ repositories: access.repositories, canWrite: access.canWrite });
  }

  const url = new URL(req.url);
  const repository = selectedRepository(access, url.searchParams.get("repo"));
  if (!repository) return json({ error: "repository_not_found" }, 404);
  const parsed = parseRepo(repository.repo_full_name);
  if (!parsed) return json({ error: "invalid_repository" }, 400);
  const github = await githubForUser(access.identity.userId);
  if (!github) return json({ error: "connect_github" }, 409);
  const [owner, repo] = parsed;
  const branch = repository.default_branch || "main";

  try {
    if (action === "tree") {
      const { data: branchData } = await github.request("GET /repos/{owner}/{repo}/branches/{branch}", {
        owner,
        repo,
        branch,
      });
      const { data } = await github.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
        owner,
        repo,
        tree_sha: branchData.commit.sha,
        recursive: "true",
      });
      const files = data.tree
        .filter((item) => item.type === "blob" && item.path)
        .slice(0, 5_000)
        .map((item) => ({ path: item.path!, size: item.size ?? null, sha: item.sha ?? null }));
      return json({ repository, branch, files, truncated: Boolean(data.truncated) });
    }

    if (action === "file") {
      const path = safePath(url.searchParams.get("path"));
      if (!path) return json({ error: "invalid_path" }, 400);
      const { data } = await github.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path,
        ref: branch,
      });
      if (Array.isArray(data) || data.type !== "file") return json({ error: "not_a_file" }, 400);
      if (data.size > maxFileBytes || typeof data.content !== "string") return json({ error: "file_too_large" }, 413);
      const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
      if (content.includes("\0")) return json({ error: "binary_file" }, 415);
      return json({
        repository: repository.repo_full_name,
        branch,
        path,
        sha: data.sha,
        size: data.size,
        content,
        canWrite: access.canWrite,
      });
    }
    return json({ error: "invalid_action" }, 400);
  } catch (caught) {
    const status = typeof caught === "object" && caught && "status" in caught ? Number(caught.status) : 500;
    return json(
      { error: status === 404 ? "github_not_found" : status === 403 ? "github_forbidden" : "github_error" },
      status === 404 || status === 403 ? status : 502,
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorize(projectId, req.signal);
  if (access instanceof Response) return access;
  if (!access.canWrite) return json({ error: "forbidden" }, 403);

  const body: unknown = await req.json().catch(() => null);
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const repository = selectedRepository(access, typeof payload.repository === "string" ? payload.repository : null);
  const path = safePath(payload.path);
  const content = typeof payload.content === "string" ? payload.content : null;
  const expectedSha = typeof payload.sha === "string" ? payload.sha : null;
  if (!repository || !path || content == null || Buffer.byteLength(content, "utf8") > maxFileBytes) {
    return json({ error: "invalid_file" }, 400);
  }

  const parsed = parseRepo(repository.repo_full_name);
  const github = await githubForUser(access.identity.userId);
  if (!parsed || !github) return json({ error: github ? "invalid_repository" : "connect_github" }, 409);
  const [owner, repo] = parsed;
  const branch = repository.default_branch || "main";

  try {
    const current = await github.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ref: branch,
    });
    if (Array.isArray(current.data) || current.data.type !== "file") return json({ error: "not_a_file" }, 400);
    if (expectedSha && current.data.sha !== expectedSha) {
      return json({ error: "conflict", currentSha: current.data.sha }, 409);
    }
    const result = await github.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      branch,
      sha: current.data.sha,
      message: `VForge: actualizar ${path}`,
      content: Buffer.from(content, "utf8").toString("base64"),
    });
    const nextSha = result.data.content?.sha ?? current.data.sha;
    const commitSha = result.data.commit.sha ?? null;
    const auditPayload = JSON.stringify({
      message: `Código actualizado: ${path}`,
      repository: repository.repo_full_name,
      path,
      branch,
      commit_sha: commitSha,
      author: access.identity.email,
    });
    await Promise.allSettled([
      sql`
        INSERT INTO project_events (project_id, event_type, details, severity)
        VALUES (${projectId}, 'code.file_updated', ${auditPayload}::jsonb, 'medium')
      `,
      sql`
        INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
        VALUES (${access.identity.userId}, 'code.file.update', 'project', ${projectId}, 1, ${auditPayload}::jsonb)
      `,
    ]);
    return json({ ok: true, sha: nextSha, commitSha, branch });
  } catch (caught) {
    const status = typeof caught === "object" && caught && "status" in caught ? Number(caught.status) : 500;
    return json({ error: status === 403 ? "github_forbidden" : "github_error" }, status === 403 ? 403 : 502);
  }
}
