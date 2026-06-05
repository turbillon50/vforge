/**
 * /api/v/bridge — proxy autenticado al hub de agentes V.
 *
 * SOLO el owner (Luis) puede usarlo. El token del hub vive únicamente
 * en el servidor (lib/forge/bridge.ts); el cliente jamás lo ve.
 *
 *   GET  -> estado del puente (/v/status)
 *   POST { action: "approve", id }
 *   POST { action: "reject", id, motivo }
 *   POST { action: "task", agent, task, context?, projectId? }
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import {
  getBridgeStatus,
  approvePending,
  rejectPending,
  dispatchBridgeTask,
  bridgeConfigured,
} from "@/lib/forge/bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwner(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }
  const user = await currentUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "solo el owner" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  if (!bridgeConfigured()) {
    return NextResponse.json(
      { error: "puente no configurado" },
      { status: 503 },
    );
  }
  try {
    const status = await getBridgeStatus();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  if (!bridgeConfigured()) {
    return NextResponse.json(
      { error: "puente no configurado" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "approve": {
        if (typeof body.id !== "string" || !body.id) {
          return NextResponse.json({ error: "id requerido" }, { status: 400 });
        }
        return NextResponse.json(await approvePending(body.id));
      }
      case "reject": {
        if (typeof body.id !== "string" || !body.id) {
          return NextResponse.json({ error: "id requerido" }, { status: 400 });
        }
        return NextResponse.json(
          await rejectPending(
            body.id,
            typeof body.motivo === "string" ? body.motivo : "sin motivo",
          ),
        );
      }
      case "task": {
        if (
          typeof body.agent !== "string" ||
          typeof body.task !== "string" ||
          !body.agent ||
          !body.task
        ) {
          return NextResponse.json(
            { error: "agent y task requeridos" },
            { status: 400 },
          );
        }
        return NextResponse.json(
          await dispatchBridgeTask({
            agent: body.agent,
            task: body.task,
            context:
              typeof body.context === "string" ? body.context : undefined,
            projectId:
              typeof body.projectId === "string" ? body.projectId : undefined,
          }),
        );
      }
      default:
        return NextResponse.json(
          { error: "action inválida (approve | reject | task)" },
          { status: 400 },
        );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
