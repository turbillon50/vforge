/**
 * /api/builder — owner-only (el middleware protege /api/builder en
 * isProtected + isOwnerOnly; aquí confiamos en él).
 *
 * GET  ?buildId=...           → { build, versions }
 * POST { action, ... }        → feedback | like | approve
 *
 * approve publica de verdad: push del snapshot de archivos al GitHub del
 * usuario (repo nuevo o commit encima del existente) + deploy directo a
 * su Vercel. Ver lib/builder/ship.ts.
 */
import { auth } from "@clerk/nextjs/server";
import {
  createBuild,
  setBuildStatus,
  getBuild,
  listVersions,
  getVersion,
  setFeedback,
  approveVersion,
} from "@/lib/builder/db";
import { shipBuildVersion } from "@/lib/builder/ship";
import { saveUserMemory } from "@/lib/forge/user-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";

async function memoryUserId(): Promise<string> {
  try {
    const a = await auth();
    if (a?.userId) return a.userId;
  } catch {
    /* sin Clerk -> operador */
  }
  return OPERATOR_USER_ID;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buildId = searchParams.get("buildId");
  if (!buildId) return jsonError("buildId required", 400);
  const build = await getBuild(buildId);
  if (!build) return jsonError("build not found", 404);
  const versions = await listVersions(buildId);
  return Response.json({ build, versions });
}

interface BuilderAction {
  action:
    | "feedback"
    | "like"
    | "approve"
    | "scaffold-request"
    | "deploy-request";
  versionId?: string;
  buildId?: string;
  n?: number;
  feedback?: string;
  /** scaffold-request: nombre del repo; deploy-request: opcional */
  name?: string | null;
  /** scope del chat desde el que se pidió (proyecto o "general") */
  scope?: string | null;
}

export async function POST(req: Request) {
  let body: BuilderAction;
  try {
    body = (await req.json()) as BuilderAction;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const uid = await memoryUserId();

  switch (body.action) {
    case "feedback": {
      if (!body.versionId || typeof body.feedback !== "string") {
        return jsonError("versionId + feedback required", 400);
      }
      const v = await setFeedback(body.versionId, body.feedback);
      if (!v) return jsonError("version not found", 404);
      // Memoria estética: la nota de gusto vive también en v_user_memory
      // para que V la recuerde entre builds.
      await saveUserMemory(uid, "estetica.nota", body.feedback.slice(0, 2000));
      return Response.json({ ok: true, version: v });
    }
    case "like": {
      if (!body.versionId) return jsonError("versionId required", 400);
      const v = await setFeedback(body.versionId, null, true);
      if (!v) return jsonError("version not found", 404);
      await saveUserMemory(
        uid,
        `estetica.like.${v.build_id}.v${v.n}`,
        v.summary ?? "",
      );
      return Response.json({ ok: true, version: v });
    }
    case "approve": {
      let version = body.versionId ? await getVersion(body.versionId) : null;
      const buildId = body.buildId ?? version?.build_id;
      const n = body.n ?? version?.n;
      if (!buildId || typeof n !== "number") {
        return jsonError("buildId + n (o versionId) required", 400);
      }
      if (!version) {
        version = (await listVersions(buildId)).find((v) => v.n === n) ?? null;
      }
      const build = await approveVersion(buildId, n);
      if (!build) return jsonError("build not found", 404);
      if (!version?.files?.length) {
        return Response.json({ ok: false, build, error: "no_files" }, { status: 400 });
      }
      // Publica de verdad: push a GitHub del usuario + deploy a su Vercel.
      const ship = await shipBuildVersion(uid, build, version.files);
      if (!ship.ok) {
        return Response.json({ ok: false, build, error: ship.error, detail: ship.detail }, { status: 400 });
      }
      return Response.json({ ok: true, build, repo: ship.repo, deploy: ship.deploy });
    }
    case "scaffold-request":
    case "deploy-request": {
      // Plumbing del pipeline: registramos la intención en vforge_builds
      // con status queued-* y devolvemos { queued: true }. Cuando el
      // pipeline repo+vercel exista, estos rows se procesan.
      const isScaffold = body.action === "scaffold-request";
      const projectName =
        (typeof body.name === "string" && body.name.trim()) ||
        (typeof body.scope === "string" && body.scope !== "general" && body.scope) ||
        "sin-nombre";
      const build = await createBuild(uid, projectName);
      await setBuildStatus(
        build.id,
        isScaffold ? "queued-scaffold" : "queued-deploy",
      );
      return Response.json({ queued: true, buildId: build.id });
    }
    default:
      return jsonError("unknown action", 400);
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
