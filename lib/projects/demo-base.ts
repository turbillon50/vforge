import "server-only";

import { queryOne, sql } from "@/lib/db/client";
import { getGithubClient } from "@/lib/github/client";
import { copyRepoWithGitApi, parseFullRepo, type CopyReport } from "@/lib/projects/repo-copy";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
import { type ProjectEtapa } from "@/lib/projects/etapas";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";

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

export interface UseDemoAsBaseInput {
  demoId: string;
  name: string;
  auditUserId: string;
  projectId?: string | null;
  clienteNombre?: string | null;
  clienteWhatsapp?: string | null;
  rubro?: string | null;
  initialEtapa?: ProjectEtapa;
  carteraTipo?: string[];
  carteraEstado?: string | null;
  carteraNota?: string | null;
}

export interface UseDemoAsBaseResult {
  ok: true;
  mode: "template" | "empty_repo" | "copied";
  project: { id: string; name: string; github_repo: string; github_url: string };
  instructions: string[];
  copied_files: number | null;
  skipped: CopyReport["skipped"];
  truncated: boolean;
}

export function cleanProjectName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, 100);
  return text || null;
}

export function cleanProjectText(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

export function slugifyProject(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "proyecto"
  );
}

export async function nextProjectId(base: string): Promise<string> {
  let candidate = base || "proyecto";
  let suffix = 2;
  while (await queryOne<{ id: string }>("SELECT id FROM projects WHERE id = $1 LIMIT 1", [candidate])) {
    const tail = `-${suffix}`;
    candidate = `${base.slice(0, 60 - tail.length)}${tail}`;
    suffix += 1;
  }
  return candidate;
}

export async function usarDemoComoBase({
  demoId,
  name,
  auditUserId,
  projectId,
  clienteNombre,
  clienteWhatsapp,
  rubro,
  initialEtapa = "demo_en_construccion",
  carteraTipo = ["comercializamos"],
  carteraEstado = "nuevo_desde_demo",
  carteraNota,
}: UseDemoAsBaseInput): Promise<UseDemoAsBaseResult | { ok: false; error: string; status: number }> {
  const cleanName = cleanProjectName(name);
  if (!cleanName) return { ok: false, error: "name_required", status: 400 };

  await ensureProjectCarteraSchema();
  await ensureProjectRepositoriesSchema();

  const demo = await queryOne<DemoSource>(
    `SELECT id, name, description, github_repo
       FROM projects
      WHERE id = $1
        AND COALESCE(es_demo, false) = true
      LIMIT 1`,
    [demoId],
  );
  if (!demo?.github_repo) return { ok: false, error: "demo_not_found", status: 404 };

  const source = parseFullRepo(demo.github_repo);
  if (!source) return { ok: false, error: "source_repo_invalid", status: 422 };

  const newProjectId = projectId || (await nextProjectId(slugifyProject(cleanName)));
  const repoName = slugifyProject(cleanName);
  const octokit = await getGithubClient({ auditUserId });

  let mode: "template" | "empty_repo" | "copied" = "empty_repo";
  let copyReport: CopyReport | null = null;
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
    repo = await crearOReusarRepo(octokit, repoName, demo.github_repo);
    const target = parseFullRepo(repo.full_name);
    if (target) {
      copyReport = await copyRepoWithGitApi({
        octokit,
        source,
        sourceBranch: (sourceRepo.data as { default_branch?: string }).default_branch ?? "main",
        target,
      });
      mode = "copied";
    }
  }

  const note =
    cleanProjectText(carteraNota, 1000) ??
    [
      `Creado desde demo ${demo.name} (${demo.github_repo}).`,
      rubro ? `Rubro: ${rubro}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_default_branch,
      cartera_tipo, cartera_estado, cartera_nota, es_demo,
      etapa, cliente_nombre, cliente_whatsapp
    ) VALUES (
      ${newProjectId}, ${cleanName}, ${demo.description}, 'en_revision', 'unknown',
      ${repo.full_name}, ${repo.html_url}, ${repo.private ?? true}, ${repo.default_branch ?? "main"},
      ${carteraTipo}::text[], ${carteraEstado}, ${note}, false,
      ${initialEtapa}, ${cleanProjectText(clienteNombre, 160)}, ${cleanProjectText(clienteWhatsapp, 80)}
    )
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url, pushed_at
    ) VALUES (
      ${newProjectId}, ${repo.full_name}, 'app', true,
      ${repo.default_branch ?? "main"}, ${repo.private ?? true}, NULL, ${repo.html_url}, NULL
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      is_primary = true,
      default_branch = EXCLUDED.default_branch,
      private = EXCLUDED.private,
      html_url = EXCLUDED.html_url,
      updated_at = now()
  `;
  await setProjectEtapa({
    projectId: newProjectId,
    etapa: initialEtapa,
    nota: `Alta desde demo ${demo.name}.`,
    creadoPor: auditUserId,
    insertWhenSame: true,
  });
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${auditUserId}, 'demo.use_as_base', 'project', ${newProjectId}, 1,
      ${JSON.stringify({
        demo_id: demo.id,
        source_repo: demo.github_repo,
        new_repo: repo.full_name,
        mode,
        copied_files: copyReport?.copied_files ?? null,
      })}::jsonb
    )
  `;

  return {
    ok: true,
    mode,
    project: { id: newProjectId, name: cleanName, github_repo: repo.full_name, github_url: repo.html_url },
    instructions,
    copied_files: copyReport?.copied_files ?? null,
    skipped: copyReport?.skipped ?? [],
    truncated: copyReport?.truncated ?? false,
  };
}

/**
 * Crea el repo privado del cliente con auto_init (GitHub no acepta blobs en un repo vacío).
 * Si el nombre ya existe y ningún proyecto lo usa (un alta anterior que falló a medias),
 * se reutiliza: la copia reemplaza su rama main.
 */
async function crearOReusarRepo(
  octokit: Awaited<ReturnType<typeof getGithubClient>>,
  repoName: string,
  sourceRepo: string,
): Promise<GithubRepoCreated> {
  try {
    const created = await octokit.request("POST /user/repos", {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Base creada desde ${sourceRepo}`,
    });
    return created.data as GithubRepoCreated;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 422) throw error;
    const fullName = `${GITHUB_OWNER}/${repoName}`;
    const enUso = await queryOne<{ id: string }>(
      `SELECT id FROM projects WHERE lower(github_repo) = lower($1)
       UNION ALL
       SELECT project_id FROM project_repositories WHERE lower(repo_full_name) = lower($1)
       LIMIT 1`,
      [fullName],
    );
    if (enUso) {
      throw new Error(`El repo ${fullName} ya existe y es del proyecto ${enUso.id}; usa otro nombre de proyecto.`);
    }
    const existing = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: GITHUB_OWNER,
      repo: repoName,
    });
    const tieneRama = await octokit
      .request("GET /repos/{owner}/{repo}/branches/{branch}", {
        owner: GITHUB_OWNER,
        repo: repoName,
        branch: (existing.data as { default_branch?: string }).default_branch ?? "main",
      })
      .then(() => true)
      .catch(() => false);
    if (!tieneRama) {
      // Repo vacío: la API de contenidos sí lo acepta y deja una rama para que la copia la reemplace.
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: GITHUB_OWNER,
        repo: repoName,
        path: "README.md",
        message: "init",
        content: Buffer.from(`# ${repoName}\n`).toString("base64"),
      });
    }
    return existing.data as GithubRepoCreated;
  }
}
