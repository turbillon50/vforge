import { queryOne, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { getGithubClient } from "@/lib/github/client";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GITHUB_OWNER = "turbillon50";

interface DemoSource {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
}

interface GithubRepoCreated {
  full_name: string;
  html_url: string;
  clone_url?: string | null;
  private?: boolean;
  default_branch?: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = cleanName(body?.name);
  if (!name) return Response.json({ error: "name_required" }, { status: 400 });

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
  const repoName = slugify(name);
  const octokit = await getGithubClient({ auditUserId: access.userId });

  let mode: "template" | "empty_repo" = "empty_repo";
  let repo: GithubRepoCreated;
  let instructions: string[] = [];

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
      auto_init: true,
      description: `Repo vacio para copiar base desde ${demo.github_repo}`,
    });
    repo = created.data as GithubRepoCreated;
    instructions = [
      `git clone https://github.com/${demo.github_repo}.git`,
      `cd ${source.repo}`,
      `git remote set-url origin ${repo.clone_url ?? `https://github.com/${repo.full_name}.git`}`,
      "git push -u origin HEAD:main",
    ];
  }

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_default_branch,
      cartera_tipo, cartera_estado, cartera_nota, es_demo
    ) VALUES (
      ${projectId}, ${name}, ${demo.description}, 'en_revision', 'unknown',
      ${repo.full_name}, ${repo.html_url}, ${repo.private ?? true}, ${repo.default_branch ?? "main"},
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
      ${repo.default_branch ?? "main"}, ${repo.private ?? true}, NULL, ${repo.html_url}, NULL
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
      })}::jsonb
    )
  `;

  return Response.json(
    {
      ok: true,
      mode,
      project: { id: projectId, name, github_repo: repo.full_name, github_url: repo.html_url },
      instructions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, 100);
  return text || null;
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
