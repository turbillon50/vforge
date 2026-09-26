import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";
import { listUserApps } from "@/lib/connect/user-apps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lee el repo del usuario (GitHub) para el Estudio: lista archivos o devuelve contenido.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauth" }, { status: 401 });
  const url = new URL(req.url);
  const appId = url.searchParams.get("app");
  const path = url.searchParams.get("path");
  const token = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!token) return Response.json({ error: "connect_github" }, { status: 400 });
  const apps = await listUserApps(userId);
  const app = apps.find((a) => a.id === appId);
  if (!app?.repo_url) return Response.json({ error: "no_repo" }, { status: 404 });
  const m = app.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return Response.json({ error: "bad_repo" }, { status: 400 });
  const owner = m[1], repo = m[2].replace(/\.git$/, "");
  const gh = (p: string) => fetch("https://api.github.com/repos/" + owner + "/" + repo + p, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "vforge" } });
  try {
    if (path) {
      const r = await gh("/contents/" + path.split("/").map(encodeURIComponent).join("/"));
      if (!r.ok) return Response.json({ error: "file" }, { status: 400 });
      const d = await r.json();
      const content = d.content ? Buffer.from(d.content, "base64").toString("utf8") : "";
      return Response.json({ path, content });
    }
    const r = await gh("/contents/");
    if (!r.ok) return Response.json({ error: "list" }, { status: 400 });
    const d = await r.json();
    const files = Array.isArray(d) ? d.map((f: { name: string; path: string; type: string }) => ({ name: f.name, path: f.path, type: f.type })) : [];
    return Response.json({ files });
  } catch (e) {
    return Response.json({ error: "exception", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauth" }, { status: 401 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const path = String(b.path || "");
  const content = String(b.content ?? "");
  if (!path) return Response.json({ error: "no_path" }, { status: 400 });
  const token = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!token) return Response.json({ error: "connect_github" }, { status: 400 });
  const apps = await listUserApps(userId);
  const app = apps.find((a) => a.id === String(b.app || ""));
  const mm = app && app.repo_url ? app.repo_url.match(/github[.]com[/]([^/]+)[/]([^/]+)/) : null;
  if (!mm) return Response.json({ error: "no_repo" }, { status: 404 });
  const owner = mm[1], repo = mm[2].replace(/[.]git$/, "");
  const ep = "/contents/" + path.split("/").map(encodeURIComponent).join("/");
  const ghh = (init?: RequestInit) => fetch("https://api.github.com/repos/" + owner + "/" + repo + ep, Object.assign({}, init, { headers: Object.assign({ Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "vforge" }, (init && init.headers) || {}) }));
  try {
    let sha;
    const cur = await ghh(undefined);
    if (cur.ok) { const d = await cur.json(); sha = d.sha; }
    const put = await ghh({ method: "PUT", body: JSON.stringify({ message: "VForge: edit " + path, content: Buffer.from(content, "utf8").toString("base64"), sha }) });
    if (!put.ok) return Response.json({ error: "save", detail: await put.text() }, { status: 400 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "exception" }, { status: 500 });
  }
}
