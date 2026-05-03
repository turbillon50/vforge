import { listAllUserRepos } from "@/lib/github/client";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/github/repos?max=200
 *
 * Returns the live list of repos visible to the GitHub PAT in the
 * vault. Replaces the static lib/mock-data PROJECTS or db-only views
 * when freshness matters (last commit, archived flag, etc.).
 *
 * Anillo 0 (read-only) but still requires operator auth — we don't
 * want to leak the repo inventory of a private GitHub account.
 */
export async function GET(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const { searchParams } = new URL(req.url);
  const max = Math.min(
    Math.max(parseInt(searchParams.get("max") ?? "200", 10) || 200, 1),
    500,
  );

  try {
    const repos = await listAllUserRepos({
      max,
      auditUserId: auth.userId,
    });
    return new Response(JSON.stringify({ repos, total: repos.length }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
