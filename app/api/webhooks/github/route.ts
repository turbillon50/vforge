import { createHmac, timingSafeEqual } from "node:crypto";
import {
  recordGithubPush,
  recordGithubPR,
  logWebhook,
  type PushCommit,
} from "@/lib/projects/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/github — eventos de la GitHub App (push, pull_request,
 * deployment_status…). Verifica firma HMAC-SHA256 y vuelca actividad REAL al
 * baúl del proyecto (multi-repo). Responde 200 rápido siempre.
 */
export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") || "";
  const event = req.headers.get("x-github-event") || "unknown";

  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return json({ error: "firma inválida" }, 401);
    }
  }

  let matched = false;
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
    const repo = (payload.repository as { full_name?: string } | undefined)?.full_name ?? null;

    if (repo && event === "push") {
      const ref = String(payload.ref ?? "");
      const branch = ref.replace("refs/heads/", "") || "main";
      const commitsRaw = Array.isArray(payload.commits) ? payload.commits : [];
      const commits: PushCommit[] = commitsRaw.map((c) => ({
        message: String((c as { message?: string }).message ?? ""),
        sha: (c as { id?: string }).id,
      }));
      const headSha = String((payload.after as string) ?? "") || null;
      matched = await recordGithubPush(repo, branch, commits, headSha);
    } else if (repo && event === "pull_request") {
      const action = String(payload.action ?? "");
      const pr = (payload.pull_request as
        | { title?: string; number?: number; merged?: boolean }
        | undefined) ?? {};
      matched = await recordGithubPR(
        repo,
        action,
        String(pr.title ?? ""),
        Boolean(pr.merged),
        Number(pr.number ?? 0),
      );
    }
  } catch {
    /* ignore parse errors */
  }

  logWebhook("github", event, null, { matched }).catch(() => null);
  return json({ ok: true, event, matched }, 200);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
