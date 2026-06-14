import { createHmac, timingSafeEqual } from "node:crypto";
import { recordVercelDeploy, logWebhook, type DeployInfo } from "@/lib/projects/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/vercel — eventos de Vercel (deployment.succeeded,
 * deployment.error, deployment.created…). Verifica x-vercel-signature
 * (HMAC-SHA1) y vuelca el deploy REAL al baúl (multi-deploy). 200 rápido.
 */
export async function POST(req: Request) {
  const secret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("x-vercel-signature") || "";

  if (secret && sig) {
    const expected = createHmac("sha1", secret).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return json({ error: "firma inválida" }, 401);
    }
  }

  let matched = false;
  try {
    const body = JSON.parse(raw) as {
      type?: string;
      payload?: {
        deployment?: { id?: string; url?: string; name?: string; meta?: Record<string, unknown> };
        project?: { id?: string };
        name?: string;
        url?: string;
        deploymentId?: string;
      };
    };
    const type = body.type ?? "";
    const p = body.payload ?? {};
    const dep = p.deployment ?? {};
    const state =
      type.endsWith(".succeeded") || type.endsWith(".ready")
        ? "ready"
        : type.endsWith(".error")
          ? "error"
          : type.endsWith(".canceled")
            ? "canceled"
            : "building";
    const sha =
      (dep.meta?.githubCommitSha as string | undefined) ??
      (dep.meta?.gitCommitSha as string | undefined) ??
      null;
    const info: DeployInfo = {
      vercelProjectId: p.project?.id ?? null,
      name: dep.name ?? p.name ?? null,
      url: dep.url ?? p.url ?? null,
      state,
      deploymentId: dep.id ?? p.deploymentId ?? null,
      commitSha: sha,
    };
    matched = await recordVercelDeploy(info);
  } catch {
    /* ignore */
  }

  logWebhook("vercel", "deployment", null, { matched }).catch(() => null);
  return json({ ok: true, matched }, 200);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
