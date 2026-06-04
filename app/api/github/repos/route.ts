import { listAllUserRepos } from "@/lib/github/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protegido por Clerk en middleware.ts (solo usuarios logueados llegan aqui).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const max = Math.min(
    Math.max(parseInt(searchParams.get("max") ?? "200", 10) || 200, 1),
    500,
  );
  try {
    const repos = await listAllUserRepos({ max });
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
