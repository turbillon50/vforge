import { queryOne, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { getGithubClient } from "@/lib/github/client";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GITHUB_OWNER = "turbillon50";
const TARGET_BRANCH = "main";
const MAX_FILE_BYTES = 50 * 1024 * 1024;

interface DemoSource {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
}

interface GithubRepoCreated {
  full_name: string;
  html_url: string;
  private?: boolean;
  default_branch?: string | null;
}

interface SkippedCopyItem {
  path: string;
  reason: string;
  size?: number;
  message?: string;
}

interface CopyReport {
  copied_files: number;
  skipped: SkippedCopyItem[];
  truncated: boolean;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = cleanRepoName(body?.name);
  if (!name) {
    return Response.json(
      { error: "name_must_be_lowercase_kebab" },
      { status: 400 },
    );
  }

  await ensureProjectCarteraSchema();
  await ensureProjectRepositoriesSchema();

  const { id } = await params;
  const demo = await queryOne<DemoSource>(
    `SELECT id, name, description, github_repo
       FROM projects
      WHERE id = $1
        AND COALESCE(es_demo, false) = true
      LIMIT 1`,
    [id],
  );
  if (!demo?.github_repo) return Response.json({ error: "demo_not_found" }, { status: 404 });

  const source = parseFullRepo(demo.github_repo);
  if (!source) return Response.json({ error: "source_repo_invalid" }, { status: 422 });

  const projectId = await nextProjectId(slugify(name));
  const repoName = name;
  const octokit = await getGithubClient({ auditUserId: access.userId });

  let mode: "template" | "git_api_copy" = "git_api_copy";
  let repo: GithubRepoCreated;
  let copyReport: CopyReport | null = null;

  const sourceRepo = await octokit.request("GET /repos/{owner}/{repo}", {
    owner: source.owner,
    repo: source.repo,
  });

  if ((sourceRepo.data as { is_template?: boolean }).is_template) {
    const generated = await octokit.request(
      "POST /repos/{template_owner}/{template_repo}/generate",
      {
        template_owner: source.owner,
        template_repo: source.repo,
        owner: GITHUB_OWNER,
        name: repoName,
        private: true,
        include_all_branches: false,
        description: `Base creada desde ${demo.github_repo}`,
      },
    );
    mode = "template";
    repo = generated.data as GithubRepoCreated;
  } else {
    const created = await octokit.request("POST /user/repos", {
      name: repoName,
      private: true,
      auto_init: false,
      description: `Base creada desde ${demo.github_repo}`,
    });
    repo = created.data as GithubRepoCreated;
    const target = parseFullRepo(repo.full_name);
    if (!target) return Response.json({ error: "target_repo_invalid" }, { status: 500 });
    copyReport = await copyRepoWithGitApi({
      octokit,
      source,
      sourceBranch: sourceRepo.data.default_branch ?? "main",
      target,
    });
  }

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_default_branch,
      cartera_tipo, cartera_estado, cartera_nota, es_demo
    ) VALUES (
      ${projectId}, ${name}, ${demo.description}, 'en_revision', 'unknown',
      ${repo.full_name}, ${repo.html_url}, ${repo.private ?? true}, ${repo.default_branch ?? TARGET_BRANCH},
      ${["comercializamos"]}::text[], 'nuevo_desde_demo',
      ${`Creado desde demo ${demo.name} (${demo.github_repo}).`}, false
    )
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url, pushed_at
    ) VALUES (
      ${projectId}, ${repo.full_name}, 'app', true,
      ${repo.default_branch ?? TARGET_BRANCH}, ${repo.private ?? true}, NULL, ${repo.html_url}, NULL
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      is_primary = true,
      default_branch = EXCLUDED.default_branch,
      private = EXCLUDED.private,
      html_url = EXCLUDED.html_url,
      updated_at = now()
  `;
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'demo.use_as_base', 'project', ${projectId}, 1,
      ${JSON.stringify({
        demo_id: demo.id,
        source_repo: demo.github_repo,
        new_repo: repo.full_name,
        mode,
        copied_files: copyReport?.copied_files ?? null,
        skipped: copyReport?.skipped ?? [],
        truncated: copyReport?.truncated ?? false,
      })}::jsonb
    )
  `;

  return Response.json(
    {
      ok: true,
      mode,
      project: { id: projectId, name, github_repo: repo.full_name, github_url: repo.html_url },
      copied_files: copyReport?.copied_files ?? null,
      skipped: copyReport?.skipped ?? [],
      truncated: copyReport?.truncated ?? false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function cleanRepoName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > 60) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) return null;
  return text;
}

function parseFullRepo(value: string) {
  const [owner, repo, extra] = value.split("/");
  if (!owner || !repo || extra) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "proyecto";
}

async function copyRepoWithGitApi({
  octokit,
  source,
  sourceBranch,
  target,
}: {
  octokit: Awaited<ReturnType<typeof getGithubClient>>;
  source: { owner: string; repo: string };
  sourceBranch: string;
  target: { owner: string; repo: string };
}): Promise<CopyReport> {
  const branch = await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
    owner: source.owner,
    repo: source.repo,
    branch: sourceBranch,
  });
  const tree = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: source.owner,
      repo: source.repo,
      tree_sha: branch.data.commit.sha,
      recursive: "true",
    },
  );

  const skipped: SkippedCopyItem[] = [];
  const targetTree: Array<{
    path: string;
    mode: "100644" | "100755" | "120000";
    type: "blob";
    sha: string;
  }> = [];

  // Copia en paralelo (8 a la vez): una demo de cientos de archivos cabe en el tiempo límite.
  const copiar = async (item: (typeof tree.data.tree)[number]) => {
    if (!item.path) return;

    if (item.type === "commit") {
      skipped.push({ path: item.path, reason: "submodule" });
      return;
    }
    if (item.type !== "blob") return;

    const size = typeof item.size === "number" ? item.size : undefined;
    if (size !== undefined && size > MAX_FILE_BYTES) {
      skipped.push({ path: item.path, reason: "too_large", size });
      return;
    }
    if (!item.sha) {
      skipped.push({ path: item.path, reason: "missing_blob_sha" });
      return;
    }

    try {
      const sourceBlob = await octokit.request(
        "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
        {
          owner: source.owner,
          repo: source.repo,
          file_sha: item.sha,
        },
      );
      const createdBlob = await octokit.request(
        "POST /repos/{owner}/{repo}/git/blobs",
        {
          owner: target.owner,
          repo: target.repo,
          content: sourceBlob.data.content,
          encoding: "base64",
        },
      );
      targetTree.push({
        path: item.path,
        mode: copyableBlobMode(item.mode),
        type: "blob",
        sha: createdBlob.data.sha,
      });
    } catch (error) {
      skipped.push({
        path: item.path,
        reason: "copy_failed",
        size,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const cola = [...tree.data.tree];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let item = cola.shift(); item; item = cola.shift()) await copiar(item);
    }),
  );

  if (tree.data.truncated) {
    skipped.push({
      path: "/",
      reason: "tree_truncated",
      message: "GitHub devolvio el arbol truncado; copia parcial.",
    });
  }

  const newTree = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
    owner: target.owner,
    repo: target.repo,
    tree: targetTree,
  });
  const commit = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
    owner: target.owner,
    repo: target.repo,
    message: `Crear base desde ${source.owner}/${source.repo}`,
    tree: newTree.data.sha,
    parents: [],
  });
  await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
    owner: target.owner,
    repo: target.repo,
    ref: `refs/heads/${TARGET_BRANCH}`,
    sha: commit.data.sha,
  });
  await octokit.request("PATCH /repos/{owner}/{repo}", {
    owner: target.owner,
    repo: target.repo,
    default_branch: TARGET_BRANCH,
  });

  return {
    copied_files: targetTree.length,
    skipped,
    truncated: Boolean(tree.data.truncated),
  };
}

function copyableBlobMode(mode: string | undefined): "100644" | "100755" | "120000" {
  return mode === "100755" || mode === "120000" ? mode : "100644";
}

async function nextProjectId(base: string): Promise<string> {
  let candidate = base || "proyecto";
  let suffix = 2;
  while (await queryOne<{ id: string }>("SELECT id FROM projects WHERE id = $1 LIMIT 1", [candidate])) {
    const tail = `-${suffix}`;
    candidate = `${base.slice(0, 60 - tail.length)}${tail}`;
    suffix += 1;
  }
  return candidate;
}
