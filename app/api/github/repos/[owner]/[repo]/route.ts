import { getRepo, listRecentCommits } from "@/lib/github/client";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/github/repos/{owner}/{repo}
 *
 * Detailed repo metadata + last 20 commits. Used by V's Repo Audit
 * tool and by the project detail page when it needs live GitHub data.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const { owner, repo } = await params;

  try {
    const [detail, commits] = await Promise.all([
      getRepo(owner, repo, { auditUserId: auth.userId }),
      listRecentCommits(owner, repo, { limit: 20, auditUserId: auth.userId }).catch(() => []),
    ]);

    return new Response(JSON.stringify({ repo: detail, commits }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Not Found") ? 404 : 502;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
