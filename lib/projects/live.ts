/**
 * Ingesta de fidelidad en vivo — multi-repo / multi-deploy.
 *
 * Los webhooks de GitHub y Vercel llaman estas funciones para volcar la
 * actividad REAL (commits, PRs, deploys) a la DB del proyecto. Un proyecto
 * puede tener VARIOS repos y VARIOS deploys: todo se agrega por project_id.
 *
 * Todo es best-effort: cualquier error se traga (el webhook responde 200),
 * pero un fallo en un efecto secundario (integración/timeline) NUNCA debe
 * borrar el hecho de que el evento SÍ matcheó con un proyecto.
 */
import { queryOne } from "@/lib/db/client";
import { addTimelineEvent } from "@/lib/projects/timeline";

/**
 * Registra el evento crudo (auditoría). `matched` refleja el resultado REAL
 * del matcheo (antes se calculaba de un projectId que siempre llegaba null).
 */
export async function logWebhook(
  source: "github" | "vercel",
  event: string,
  projectId: string | null,
  payload: unknown,
  matched?: boolean,
): Promise<void> {
  try {
    await queryOne(
      `INSERT INTO webhook_events (source, event, project_id, matched, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [source, event, projectId, matched ?? Boolean(projectId), JSON.stringify(payload ?? {})],
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
    // Auto-siembra el repo primario en project_repos (best-effort).
    await upsertRepo(viaProjects.id, repoFullName, viaProjects.github_default_branch, true).catch(() => null);
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

/**
 * Upsert del estado de una integración (github/vercel/etc) del proyecto.
 * Atómico: el viejo SELECT→INSERT chocaba con el unique (project_id, kind)
 * cuando dos webhooks del mismo proyecto llegaban a la vez (p.ej. vforge y
 * vforge-engine deployean el mismo repo) y el 23505 tumbaba todo el record.
 */
export async function upsertIntegration(
  projectId: string,
  kind: string,
  label: string,
  status: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await queryOne(
    `INSERT INTO project_integrations (project_id, kind, label, status, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (project_id, kind) DO UPDATE
        SET status = EXCLUDED.status,
            label = EXCLUDED.label,
            meta = EXCLUDED.meta`,
    [projectId, kind, label, status, JSON.stringify(meta)],
  );
}

export interface PushCommit { message: string; sha?: string }

/** Webhook push de GitHub → repo + timeline + integración. Devuelve el project_id matcheado (o null). */
export async function recordGithubPush(
  repoFullName: string,
  branch: string,
  commits: PushCommit[],
  headSha: string | null,
): Promise<string | null> {
  const projectId = await resolveProjectByRepo(repoFullName);
  if (!projectId) return null;
  await upsertRepo(projectId, repoFullName, branch, false, headSha).catch(() => null);
  await upsertIntegration(projectId, "github", repoFullName, "connected", {
    last_branch: branch,
    last_push_at: new Date().toISOString(),
    last_commit_sha: headSha,
  }).catch(() => null);
  const n = commits.length;
  if (n > 0) {
    const detail = commits.slice(0, 8).map((c) => `• ${c.message.split("\n")[0]}`).join("\n");
    await addTimelineEvent(projectId, {
      stage: "dev",
      status: "in_progress",
      title: `${n} commit${n > 1 ? "s" : ""} → ${repoFullName} (${branch})`,
      detail,
    }).catch(() => null);
  }
  return projectId;
}

/** Webhook pull_request de GitHub → timeline. Devuelve el project_id matcheado (o null). */
export async function recordGithubPR(
  repoFullName: string,
  action: string,
  title: string,
  merged: boolean,
  num: number,
): Promise<string | null> {
  const projectId = await resolveProjectByRepo(repoFullName);
  if (!projectId) return null;
  const verb = merged ? "PR mergeado" : `PR ${action}`;
  await addTimelineEvent(projectId, {
    stage: "dev",
    status: merged ? "done" : "in_progress",
    title: `${verb} #${num} — ${repoFullName}`,
    detail: title,
  }).catch(() => null);
  return projectId;
}

export interface DeployInfo {
  vercelProjectId: string | null;
  name: string | null;
  url: string | null;
  /** ready|building|error|canceled — null = evento sin cambio de estado (no pisar). */
  state: string | null;
  deploymentId: string | null;
  commitSha: string | null;
  branch: string | null;
}

/** Webhook de Vercel → project_deploys + timeline + integración. Devuelve el project_id matcheado (o null). */
export async function recordVercelDeploy(d: DeployInfo): Promise<string | null> {
  const projectId = await resolveProjectByVercel(d.vercelProjectId, d.name);
  if (!projectId) return null;

  // Estado previo (para no duplicar timeline en re-entregas/promoted).
  const prev = d.deploymentId
    ? await queryOne<{ state: string }>(
        `SELECT state FROM project_deploys
          WHERE provider = 'vercel' AND deployment_id = $1 LIMIT 1`,
        [d.deploymentId],
      ).catch(() => null)
    : null;

  // Idempotente por deployment_id. Un estado terminal (ready/error/canceled)
  // nunca se degrada a 'building' por eventos tardíos o fuera de orden
  // (deployment.promoted llega DESPUÉS de succeeded y antes caía al default
  // 'building', dejando deploys READY como 'building' eterno en la sala live).
  await queryOne(
    `INSERT INTO project_deploys
        (project_id, provider, vercel_project_id, deployment_id, name, url, state, commit_sha, meta)
     VALUES ($1, 'vercel', $2, $3, $4, $5, COALESCE($6, 'building'), $7, $8::jsonb)
     ON CONFLICT (provider, deployment_id) WHERE deployment_id IS NOT NULL
     DO UPDATE SET
        state = CASE
                  WHEN $6 IS NULL THEN project_deploys.state
                  WHEN $6 = 'building' AND project_deploys.state IN ('ready', 'error', 'canceled')
                       THEN project_deploys.state
                  ELSE $6
                END,
        url = COALESCE(EXCLUDED.url, project_deploys.url)`,
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
  if (ok || err) {
    await upsertIntegration(projectId, "vercel", d.name ?? "vercel", ok ? "connected" : "error", {
      last_url: d.url,
      last_state: d.state,
      last_deploy_at: new Date().toISOString(),
    }).catch(() => null);
  } else if (d.state === "building") {
    await upsertIntegration(projectId, "vercel", d.name ?? "vercel", "building", {
      last_url: d.url,
      last_state: d.state,
      last_deploy_at: new Date().toISOString(),
    }).catch(() => null);
  }

  // El proyecto cobra vida cuando un deploy queda READY (antes nada tocaba
  // projects.status y los 249 proyectos se quedaban en 'unknown' eterno).
  if (ok) {
    await queryOne(
      `UPDATE projects SET status = 'live', updated_at = now()
        WHERE id = $1 AND status IS DISTINCT FROM 'live'`,
      [projectId],
    ).catch(() => null);
  }

  const transitioned = (prev?.state ?? null) !== d.state;
  if ((ok || err) && transitioned) {
    await addTimelineEvent(projectId, {
      stage: "deploy",
      status: ok ? "done" : "blocked",
      title: ok ? `Deploy listo — ${d.name ?? "vercel"}` : `Deploy falló — ${d.name ?? "vercel"}`,
      detail: d.url ? `https://${d.url.replace(/^https?:\/\//, "")}` : null,
    }).catch(() => null);
  }
  return projectId;
}
