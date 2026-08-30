import { NextRequest, NextResponse } from "next/server";
import { authorizeAgentRunAccess } from "@/lib/live/agent-runs";
import {
  listProjectDecisionLog,
  recordProjectDecision,
} from "@/lib/live/load-project-memory";
import { isProjectDecisionKind } from "@/lib/live/project-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStore });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);
  try {
    const log = await listProjectDecisionLog(projectId);
    return json({ log, canWrite: access.canWrite });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);
  if (!access.canWrite) return json({ error: "forbidden" }, 403);
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!isProjectDecisionKind(payload?.kind))
    return json({ error: "invalid_decision" }, 400);
  const summary =
    typeof payload?.summary === "string" ? payload.summary.trim().slice(0, 2000) : "";
  if (!summary) return json({ error: "invalid_decision" }, 400);
  try {
    await recordProjectDecision({
      projectId,
      kind: payload.kind,
      summary,
      sourceId:
        typeof payload?.sourceId === "string" ? payload.sourceId.slice(0, 80) : null,
      email: access.identity.email,
    });
    const log = await listProjectDecisionLog(projectId);
    return json({ ok: true, log });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}
