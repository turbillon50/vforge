import { listAllUserRepos } from "@/lib/github/client";
import { resolveAccess } from "@/lib/connect/resolve-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AISLAMIENTO: cada usuario ve SOLO sus repos (su token GitHub). El owner
 * usa el token del operador. Sin token conectado → lista vacía + needsConnect.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const max = Math.min(
    Math.max(parseInt(searchParams.get("max") ?? "200", 10) || 200, 1),
    500,
  );
  const access = await resolveAccess();
  if (!access.userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!access.githubToken) {
    return new Response(
      JSON.stringify({ repos: [], total: 0, needsConnect: "github" }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
  try {
    const repos = await listAllUserRepos({ max, token: access.isOwner ? undefined : access.githubToken });
    return new Response(JSON.stringify({ repos, total: repos.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
