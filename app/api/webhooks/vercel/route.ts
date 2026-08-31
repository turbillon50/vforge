import { createHmac, timingSafeEqual } from "node:crypto";
import { recordVercelDeploy, logWebhook, type DeployInfo } from "@/lib/projects/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mapa explícito de tipo de evento → estado del deploy.
 *  null = evento que NO cambia el estado (checks, alias, etc.).
 *  OJO: deployment.promoted llega después de succeeded en producción; antes
 *  caía al default 'building' y pisaba el 'ready' para siempre. */
function stateForType(type: string): string | null {
  if (type.endsWith(".succeeded") || type.endsWith(".ready") || type.endsWith(".promoted")) return "ready";
  if (type.endsWith(".error")) return "error";
  if (type.endsWith(".canceled")) return "canceled";
  if (type.endsWith(".created")) return "building";
  return null;
}

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

  let projectId: string | null = null;
  let type = "deployment";
  let info: DeployInfo | null = null;
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
    type = body.type || "deployment";
    const p = body.payload ?? {};
    const dep = p.deployment ?? {};
    const sha =
      (dep.meta?.githubCommitSha as string | undefined) ??
      (dep.meta?.gitCommitSha as string | undefined) ??
      null;
    const branch =
      (dep.meta?.githubCommitRef as string | undefined) ??
      (dep.meta?.gitCommitRef as string | undefined) ??
      null;
    info = {
      vercelProjectId: p.project?.id ?? null,
      name: dep.name ?? p.name ?? null,
      url: dep.url ?? p.url ?? null,
      state: stateForType(type),
      deploymentId: dep.id ?? p.deploymentId ?? null,
      commitSha: sha,
      branch,
    };
    projectId = await recordVercelDeploy(info);
  } catch {
    /* ignore */
  }

  const matched = Boolean(projectId);
  // Auditable: identidad del evento, no solo {matched} (antes se tiraba el
  // payload y era imposible re-matchear ni depurar).
  logWebhook("vercel", type, projectId, {
    matched,
    type,
    vercelProjectId: info?.vercelProjectId ?? null,
    deploymentId: info?.deploymentId ?? null,
    name: info?.name ?? null,
    state: info?.state ?? null,
    url: info?.url ?? null,
    commitSha: info?.commitSha ?? null,
    branch: info?.branch ?? null,
  }, matched).catch(() => null);
  return json({ ok: true, matched }, 200);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
