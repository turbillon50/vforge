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
