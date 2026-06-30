import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";
import { listUserApps } from "@/lib/connect/user-apps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauth" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const app = (await listUserApps(userId)).find((a) => a.id === String(b.app || ""));
  if (!app || !app.repo_url) return Response.json({ error: "no_repo" }, { status: 404 });

  const gh = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  const vc = await getUserSecret(userId, "VERCEL_USER_TOKEN");
  const team = await getUserSecret(userId, "VERCEL_TEAM_ID");
  if (!gh) return Response.json({ error: "connect_github" }, { status: 400 });
  if (!vc) return Response.json({ error: "connect_vercel" }, { status: 400 });

  const mm = app.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!mm) return Response.json({ error: "bad_repo" }, { status: 400 });
  const owner = mm[1];
  const repo = mm[2].replace(/\.git$/, "");

  try {
    const fr = await fetch(
      "https://api.github.com/repos/" + owner + "/" + repo + "/contents/index.html",
      { headers: { Authorization: "Bearer " + gh, Accept: "application/vnd.github+json", "User-Agent": "vforge" } }
    );
    if (!fr.ok) return Response.json({ error: "no_index" }, { status: 400 });
    const fj = await fr.json();
    const html = Buffer.from(fj.content, "base64").toString("utf8");

    const q = team ? "?teamId=" + encodeURIComponent(team) + "&forceNew=1" : "?forceNew=1";
    const dep = await fetch("https://api.vercel.com/v13/deployments" + q, {
      method: "POST",
      headers: { Authorization: "Bearer " + vc, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repo,
        target: "production",
        projectSettings: { framework: null },
        files: [{ file: "index.html", data: html }],
      }),
    });
    const dd = await dep.json();
    if (!dep.ok) return Response.json({ error: "deploy", detail: dd?.error || dd }, { status: 400 });
    return Response.json({ ok: true, url: dd.url ? "https://" + dd.url : null });
  } catch (e) {
    return Response.json({ error: "exception", detail: String(e) }, { status: 500 });
  }
}
