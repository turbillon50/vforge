/**
 * Ingesta de fidelidad en vivo — multi-repo / multi-deploy.
 *
 * Los webhooks de GitHub y Vercel llaman estas funciones para volcar la
 * actividad REAL (commits, PRs, deploys) a la DB del proyecto. Un proyecto
 * puede tener VARIOS repos y VARIOS deploys: todo se agrega por project_id.
 *
 * Todo es best-effort: cualquier error se traga (el webhook responde 200).
 */
import { queryOne } from "@/lib/db/client";
import { addTimelineEvent } from "@/lib/projects/timeline";

/** Registra el evento crudo (auditoría) y devuelve si se asoció a un proyecto. */
export async function logWebhook(
  source: "github" | "vercel",
  event: string,
  projectId: string | null,
  payload: unknown,
): Promise<void> {
  try {
    await queryOne(
      `INSERT INTO webhook_events (source, event, project_id, matched, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [source, event, projectId, Boolean(projectId), JSON.stringify(payload ?? {})],
    );
  } catch {
    /* ignore */
  }
}

/** Resuelve el project_id de un repo (project_repos primero, luego projects). */
export async function resolveProjectByRepo(
  repoFullName: string,
): Promise<string | null> {
  const viaRepos = await queryOne<{ project_id: string }>(
    `SELECT project_id FROM project_repos
      WHERE provider = 'github' AND lower(repo_full_name) = lower($1) LIMIT 1`,
    [repoFullName],
  );
  if (viaRepos?.project_id) return viaRepos.project_id;

  const viaProjects = await queryOne<{ id: string; github_default_branch: string | null }>(
    `SELECT id, github_default_branch FROM projects
      WHERE lower(github_repo) = lower($1) LIMIT 1`,
    [repoFullName],
  );
  if (viaProjects?.id) {
    // Auto-siembra el repo primario en project_repos.
    await upsertRepo(viaProjects.id, repoFullName, viaProjects.github_default_branch, true);
    return viaProjects.id;
  }
  return null;
}

/** Resuelve el project_id de un deploy de Vercel (por vercel id, nombre o slug). */
export async function resolveProjectByVercel(
  vercelProjectId: string | null,
  name: string | null,
): Promise<string | null> {
  if (vercelProjectId) {
    const a = await queryOne<{ id: string }>(
      `SELECT id FROM projects WHERE vercel_project_id = $1 LIMIT 1`,
      [vercelProjectId],
    );
    if (a?.id) return a.id;
    const d = await queryOne<{ project_id: string }>(
      `SELECT project_id FROM project_deploys
        WHERE vercel_project_id = $1 LIMIT 1`,
      [vercelProjectId],
    );
    if (d?.project_id) return d.project_id;
  }
  if (name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const b = await queryOne<{ id: string }>(
      `SELECT id FROM projects WHERE id = $1 OR lower(name) = lower($2) LIMIT 1`,
      [slug, name],
    );
    if (b?.id) return b.id;
  }
  return null;
}

async function upsertRepo(
  projectId: string,
  repoFullName: string,
  branch: string | null,
  isPrimary: boolean,
  lastSha?: string | null,
): Promise<void> {
  await queryOne(
    `INSERT INTO project_repos
        (project_id, provider, repo_full_name, default_branch, is_primary, last_push_at, last_commit_sha)
     VALUES ($1, 'github', $2, $3, $4, now(), $5)
     ON CONFLICT (provider, lower(repo_full_name)) DO UPDATE
        SET last_push_at = now(),
            last_commit_sha = COALESCE($5, project_repos.last_commit_sha),
            default_branch = COALESCE($3, project_repos.default_branch),
            updated_at = now()`,
    [projectId, repoFullName, branch, isPrimary, lastSha ?? null],
  );
}

/** Upsert del estado de una integración (github/vercel/etc) del proyecto. */
export async function upsertIntegration(
  projectId: string,
  kind: string,
  label: string,
  status: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM project_integrations WHERE project_id = $1 AND kind = $2 LIMIT 1`,
    [projectId, kind],
  );
  if (existing?.id) {
    await queryOne(
      `UPDATE project_integrations
          SET status = $1, label = $2, meta = $3::jsonb
        WHERE id = $4`,
      [status, label, JSON.stringify(meta), existing.id],
    );
  } else {
    await queryOne(
      `INSERT INTO project_integrations (project_id, kind, label, status, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [projectId, kind, label, status, JSON.stringify(meta)],
    );
  }
}

export interface PushCommit { message: string; sha?: string }

/** Webhook push de GitHub → repo + timeline + integración. */
export async function recordGithubPush(
  repoFullName: string,
  branch: string,
  commits: PushCommit[],
  headSha: string | null,
): Promise<boolean> {
  const projectId = await resolveProjectByRepo(repoFullName);
  if (!projectId) return false;
  await upsertRepo(projectId, repoFullName, branch, false, headSha);
  await upsertIntegration(projectId, "github", repoFullName, "connected", {
    last_branch: branch,
    last_push_at: new Date().toISOString(),
    last_commit_sha: headSha,
  });
  const n = commits.length;
  if (n > 0) {
    const detail = commits.slice(0, 8).map((c) => `• ${c.message.split("\n")[0]}`).join("\n");
    await addTimelineEvent(projectId, {
      stage: "dev",
      status: "in_progress",
      title: `${n} commit${n > 1 ? "s" : ""} → ${repoFullName} (${branch})`,
      detail,
    });
  }
  return true;
}

/** Webhook pull_request de GitHub → timeline. */
export async function recordGithubPR(
  repoFullName: string,
  action: string,
  title: string,
  merged: boolean,
  num: number,
): Promise<boolean> {
  const projectId = await resolveProjectByRepo(repoFullName);
  if (!projectId) return false;
  const verb = merged ? "PR mergeado" : `PR ${action}`;
  await addTimelineEvent(projectId, {
    stage: "dev",
    status: merged ? "done" : "in_progress",
    title: `${verb} #${num} — ${repoFullName}`,
    detail: title,
  });
  return true;
}

export interface DeployInfo {
  vercelProjectId: string | null;
  name: string | null;
  url: string | null;
  state: string; // ready|building|error|canceled
  deploymentId: string | null;
  commitSha: string | null;
  branch: string | null;
}

/** Webhook de Vercel → project_deploys + timeline + integración. */
export async function recordVercelDeploy(d: DeployInfo): Promise<boolean> {
  const projectId = await resolveProjectByVercel(d.vercelProjectId, d.name);
  if (!projectId) return false;

  // Idempotente por deployment_id.
  await queryOne(
    `INSERT INTO project_deploys
        (project_id, provider, vercel_project_id, deployment_id, name, url, state, commit_sha, meta)
     VALUES ($1, 'vercel', $2, $3, $4, $5, $6, $7, $8::jsonb)
     ON CONFLICT (provider, deployment_id) WHERE deployment_id IS NOT NULL
     DO UPDATE SET state = EXCLUDED.state, url = COALESCE(EXCLUDED.url, project_deploys.url)`,
    [projectId, d.vercelProjectId, d.deploymentId, d.name, d.url, d.state, d.commitSha, JSON.stringify({ branch: d.branch })],
  );

  if (d.branch && d.url) {
    const previewUrl = d.url.startsWith("http://") || d.url.startsWith("https://") ? d.url : `https://${d.url}`;
    await queryOne(
      `UPDATE project_agent_runs
          SET preview_url = $1,
              status = CASE WHEN status IN ('awaiting_preview','awaiting_approval','preview_ready') AND $2 IN ('ready','succeeded')
                            THEN 'preview_ready' ELSE status END,
              updated_at = now()
        WHERE project_id = $3 AND work_branch = $4 AND status NOT IN ('published','cancelled','failed')`,
      [previewUrl, d.state, projectId, d.branch],
    ).catch(() => null);
  }

  const ok = d.state === "ready" || d.state === "succeeded";
  const err = d.state === "error" || d.state === "canceled";
  await upsertIntegration(projectId, "vercel", d.name ?? "vercel", ok ? "connected" : err ? "error" : "building", {
    last_url: d.url,
    last_state: d.state,
    last_deploy_at: new Date().toISOString(),
  });

  if (ok || err) {
    await addTimelineEvent(projectId, {
      stage: "deploy",
      status: ok ? "done" : "blocked",
      title: ok ? `Deploy listo — ${d.name ?? "vercel"}` : `Deploy falló — ${d.name ?? "vercel"}`,
      detail: d.url ? `https://${d.url.replace(/^https?:\/\//, "")}` : null,
    });
  }
  return true;
}
