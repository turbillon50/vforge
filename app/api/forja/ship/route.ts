import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";
import { saveUserApp } from "@/lib/connect/user-apps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/forja/ship  { name }
 * EL MOTOR: con los tokens conectados del usuario (GitHub + Vercel),
 *  1) crea un repo en SU GitHub,
 *  2) empuja una app inicial,
 *  3) la deploya en SU Vercel (archivos directos, robusto).
 * Devuelve { ok, repo:{url}, deploy:{url} }.
 */
function slugify(s: string): string {
  return (s || "mi-app")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "mi-app";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

const TEMPLATES: Record<string, { sub: string; accent: string }> = {
  landing:    { sub: "Tu landing esta viva. Cuentale al mundo que haces.", accent: "#7c3aed" },
  tienda:     { sub: "Tu tienda esta lista. Conecta Stripe y empieza a vender.", accent: "#16a34a" },
  portafolio: { sub: "Tu portafolio esta en linea. Muestra tu trabajo.", accent: "#0ea5e9" },
  blanco:     { sub: "Lienzo en blanco listo. Construye lo que imagines.", accent: "#a78bfa" },
};
function starter(name: string, template: string, description?: string): string {
  const t = TEMPLATES[template] || TEMPLATES.blanco;
  const safeName = escapeHtml(name);
  const safeSub = escapeHtml(
    description && description.trim() ? description.trim() : t.sub,
  );
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeName}</title>
<style>:root{color-scheme:dark}*{margin:0;box-sizing:border-box}
body{min-height:100vh;display:grid;place-items:center;background:#0a0a0f;color:#f5f5f7;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif}
.card{text-align:center;padding:48px 32px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 20px 60px -20px rgba(0,0,0,.7);max-width:520px}
h1{font-size:2rem;letter-spacing:-.03em;margin-bottom:12px}p{color:rgba(255,255,255,.5);line-height:1.5}
.b{display:inline-block;margin-bottom:20px;padding:6px 14px;border-radius:999px;border:1px solid ${t.accent};color:${t.accent};font-size:12px;font-weight:600}
.d{display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.accent};box-shadow:0 0 10px ${t.accent};margin-right:6px}</style></head>
<body><div class="card"><span class="b"><span class="d"></span>En produccion</span>
<h1>${safeName}</h1><p>${safeSub}</p></div></body></html>`;
}

function gh(path: string, token: string, init: RequestInit = {}) {
  return fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "vforge",
      "X-GitHub-Api-Version": "2026-03-10",
      ...(init.headers || {}),
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = (String(body.name || "Mi app").trim() || "Mi app").slice(0, 60);
  const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
  const template = String(body.template || "blanco").toLowerCase();
  const description = String(body.description || "").trim().slice(0, 600);
  const isPrivate = !!body.isPrivate;
  const modules = Array.isArray(body.modules) ? (body.modules as string[]).slice(0, 12).map(String) : [];

  const ghToken = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!ghToken) return Response.json({ ok: false, error: "connect_github" }, { status: 400 });
  const vcToken = await getUserSecret(userId, "VERCEL_USER_TOKEN");
  if (!vcToken) return Response.json({ ok: false, error: "connect_vercel" }, { status: 400 });
  const vcTeam = await getUserSecret(userId, "VERCEL_TEAM_ID");

  const out: Record<string, unknown> = { name, slug };
  try {
    const meRes = await gh("/user", ghToken);
    if (!meRes.ok) return Response.json({ ok: false, error: "github_auth", detail: await meRes.text() }, { status: 400 });
    const owner = (await meRes.json()).login as string;

    const repoRes = await gh("/user/repos", ghToken, {
      method: "POST",
      body: JSON.stringify({ name: slug, description: (description || name) + " — creada con VForge", private: isPrivate, auto_init: true }),
    });
    if (!repoRes.ok) {
      const detail = await repoRes.text();
      const acceptedPermissions =
        repoRes.headers.get("x-accepted-github-permissions") || "";
      const permissionDenied =
        repoRes.status === 403 &&
        (detail.includes("Resource not accessible by integration") ||
          acceptedPermissions.includes("administration=write"));

      console.error("[forja/ship] repo_create_failed", {
        status: repoRes.status,
        acceptedPermissions,
        detail: detail.slice(0, 500),
      });

      return Response.json(
        {
          ok: false,
          error: permissionDenied
            ? "github_repo_permission"
            : "repo_create",
          detail,
          acceptedPermissions,
        },
        { status: 400 },
      );
    }
    const repo = await repoRes.json();
    out.repo = { url: repo.html_url, full: repo.full_name };

    const content = Buffer.from(starter(name, template, description), "utf8").toString("base64");
    const indexRes = await gh(`/repos/${owner}/${slug}/contents/index.html`, ghToken, {
      method: "PUT",
      body: JSON.stringify({ message: "VForge: app inicial", content }),
    });
    if (!indexRes.ok) {
      return Response.json(
        { ok: false, error: "repo_content", detail: await indexRes.text(), repo: out.repo },
        { status: 400 },
      );
    }
    const readme = `# ${name}\n\n${description || "App creada con VForge."}\n\n**Plantilla:** ${template}\n\n**Módulos solicitados:**\n${modules.length ? modules.map((m) => "- " + m).join("\n") : "- (ninguno)"}\n\n---\nGenerada con VForge.`;
    const currentReadmeRes = await gh(
      `/repos/${owner}/${slug}/contents/README.md`,
      ghToken,
    );
    const currentReadme = currentReadmeRes.ok
      ? ((await currentReadmeRes.json()) as { sha?: string })
      : null;
    const readmeRes = await gh(
      `/repos/${owner}/${slug}/contents/README.md`,
      ghToken,
      {
        method: "PUT",
        body: JSON.stringify({
          message: "VForge: README/spec",
          content: Buffer.from(readme, "utf8").toString("base64"),
          ...(currentReadme?.sha ? { sha: currentReadme.sha } : {}),
        }),
      },
    );
    if (!readmeRes.ok) {
      return Response.json(
        {
          ok: false,
          error: "repo_readme",
          detail: await readmeRes.text(),
          repo: out.repo,
        },
        { status: 400 },
      );
    }


    const q = vcTeam ? `?teamId=${encodeURIComponent(vcTeam)}&forceNew=1` : `?forceNew=1`;
    const depRes = await fetch("https://api.vercel.com/v13/deployments" + q, {
      method: "POST",
      headers: { Authorization: `Bearer ${vcToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: slug,
        target: "production",
        projectSettings: { framework: null },
        files: [{ file: "index.html", data: starter(name, template, description) }],
      }),
    });
    const dep = await depRes.json();
    if (!depRes.ok) return Response.json({ ok: false, error: "deploy", detail: dep, repo: out.repo }, { status: 400 });
    out.deploy = { url: dep.url ? `https://${dep.url}` : null, id: dep.id, state: dep.readyState || dep.status };
    try { await saveUserApp(userId, { name, repo_url: (out.repo as { url?: string })?.url ?? null, deploy_url: (out.deploy as { url?: string | null })?.url ?? null, template }); } catch { /* best-effort */ }

    return Response.json({ ok: true, ...out });
  } catch (e) {
    return Response.json({ ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e), partial: out }, { status: 500 });
  }
}
