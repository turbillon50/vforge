/**
 * Ship real de un build del ensamblador: toma los archivos generados por V
 * (vforge_build_versions.files) y los publica en la cuenta DEL USUARIO —
 * su GitHub, su Vercel. Nada se queda en VForge (a diferencia de Replit).
 *
 * - Repo nuevo: crea el repo, sube todos los archivos en un solo commit
 *   (Git Data API: blobs → tree → commit → ref), evitando el límite de
 *   PUT /contents por archivo y las condiciones de carrera de conflictos.
 * - Repo existente: agrega un commit encima del HEAD actual con el mismo
 *   snapshot completo de archivos (los builds representan el estado final,
 *   no un diff).
 * - Deploy: sube los mismos archivos directo a Vercel (sin vincular git),
 *   igual que /api/forja/ship — deploy inmediato sin esperar un webhook.
 */
import { getUserSecret } from "@/lib/connect/user-vault";
import { saveUserApp } from "@/lib/connect/user-apps";
import type { Build, BuildFile } from "@/lib/builder/db";
import { markBuildShipped } from "@/lib/builder/db";

export type ShipResult =
  | { ok: true; repo: { url: string; full: string }; deploy: { url: string | null; id?: string } }
  | { ok: false; error: string; detail?: unknown };

function slugify(s: string): string {
  return (
    (s || "mi-app")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "mi-app"
  );
}

function gh(path: string, token: string, init: RequestInit = {}) {
  return fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "vforge",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/** Sube `files` como UN commit al branch por defecto de owner/repo. */
async function pushFilesAsCommit(
  owner: string,
  repo: string,
  token: string,
  files: BuildFile[],
  message: string,
): Promise<{ ok: true } | { ok: false; error: string; detail?: unknown }> {
  const repoRes = await gh(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) return { ok: false, error: "repo_not_found", detail: await repoRes.text() };
  const repoInfo = await repoRes.json();
  const branch = repoInfo.default_branch || "main";

  const refRes = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  if (!refRes.ok) return { ok: false, error: "ref_not_found", detail: await refRes.text() };
  const baseCommitSha = (await refRes.json()).object.sha as string;

  const commitRes = await gh(`/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, token);
  if (!commitRes.ok) return { ok: false, error: "commit_not_found", detail: await commitRes.text() };
  const baseTreeSha = (await commitRes.json()).tree.sha as string;

  // Blobs en paralelo — cada archivo se sube como blob independiente del tree.
  const blobs = await Promise.all(
    files.map(async (f) => {
      const b64 = Buffer.from(f.content ?? "", "utf8").toString("base64");
      const r = await gh(`/repos/${owner}/${repo}/git/blobs`, token, {
        method: "POST",
        body: JSON.stringify({ content: b64, encoding: "base64" }),
      });
      if (!r.ok) throw new Error(`blob_failed:${f.path}`);
      const j = await r.json();
      return { path: f.path.replace(/^\/+/, ""), mode: "100644", type: "blob", sha: j.sha as string };
    }),
  );

  const treeRes = await gh(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
  });
  if (!treeRes.ok) return { ok: false, error: "tree_failed", detail: await treeRes.text() };
  const newTreeSha = (await treeRes.json()).sha as string;

  const newCommitRes = await gh(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTreeSha, parents: [baseCommitSha] }),
  });
  if (!newCommitRes.ok) return { ok: false, error: "commit_create_failed", detail: await newCommitRes.text() };
  const newCommitSha = (await newCommitRes.json()).sha as string;

  const updateRefRes = await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommitSha }),
  });
  if (!updateRefRes.ok) return { ok: false, error: "ref_update_failed", detail: await updateRefRes.text() };

  return { ok: true };
}

async function deployToVercel(
  slug: string,
  files: BuildFile[],
  vcToken: string,
  vcTeam: string | null,
): Promise<{ ok: true; url: string | null; id: string } | { ok: false; error: string; detail?: unknown }> {
  const q = vcTeam ? `?teamId=${encodeURIComponent(vcTeam)}&forceNew=1` : `?forceNew=1`;
  const res = await fetch("https://api.vercel.com/v13/deployments" + q, {
    method: "POST",
    headers: { Authorization: `Bearer ${vcToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: slug,
      target: "production",
      projectSettings: { framework: null },
      files: files.map((f) => ({ file: f.path.replace(/^\/+/, ""), data: f.content ?? "" })),
    }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: "deploy_failed", detail: data };
  return { ok: true, url: data.url ? `https://${data.url}` : null, id: data.id };
}

export async function shipBuildVersion(
  userId: string,
  build: Build,
  files: BuildFile[],
): Promise<ShipResult> {
  if (!files.length) return { ok: false, error: "no_files" };

  const ghToken = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!ghToken) return { ok: false, error: "connect_github" };
  const vcToken = await getUserSecret(userId, "VERCEL_USER_TOKEN");
  if (!vcToken) return { ok: false, error: "connect_vercel" };
  const vcTeam = await getUserSecret(userId, "VERCEL_TEAM_ID");

  try {
    let owner: string;
    let repoName: string;
    let repoUrl: string;

    if (build.repo_full_name) {
      [owner, repoName] = build.repo_full_name.split("/");
      const push = await pushFilesAsCommit(owner, repoName, ghToken, files, `VForge: publicar versión aprobada`);
      if (!push.ok) return { ok: false, error: push.error, detail: push.detail };
      repoUrl = `https://github.com/${build.repo_full_name}`;
    } else {
      const meRes = await gh("/user", ghToken);
      if (!meRes.ok) return { ok: false, error: "github_auth", detail: await meRes.text() };
      owner = (await meRes.json()).login as string;
      repoName = slugify(build.project_name) + "-" + Math.random().toString(36).slice(2, 6);

      const createRes = await gh("/user/repos", ghToken, {
        method: "POST",
        body: JSON.stringify({
          name: repoName,
          description: `${build.project_name} — creada con VForge`,
          private: false,
          auto_init: true,
        }),
      });
      if (!createRes.ok) return { ok: false, error: "repo_create", detail: await createRes.text() };
      const created = await createRes.json();
      repoUrl = created.html_url;

      const push = await pushFilesAsCommit(owner, repoName, ghToken, files, "VForge: primera versión publicada");
      if (!push.ok) return { ok: false, error: push.error, detail: push.detail };
    }

    const deploy = await deployToVercel(repoName, files, vcToken, vcTeam);
    if (!deploy.ok) return { ok: false, error: deploy.error, detail: deploy.detail };

    await markBuildShipped(build.id, {
      repo_full_name: `${owner}/${repoName}`,
      vercel_project_id: repoName,
    });
    try {
      await saveUserApp(userId, {
        name: build.project_name,
        repo_url: repoUrl,
        deploy_url: deploy.url,
        template: "ensamblador",
      });
    } catch {
      /* best-effort */
    }

    return {
      ok: true,
      repo: { url: repoUrl, full: `${owner}/${repoName}` },
      deploy: { url: deploy.url, id: deploy.id },
    };
  } catch (e) {
    return { ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e) };
  }
}
