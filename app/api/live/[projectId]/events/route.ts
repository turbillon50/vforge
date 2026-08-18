/**
 * API portal en vivo — actividad del proyecto (polling seguro).
 *
 * Lee project_events ESTRICTAMENTE acotado por project_id (aislamiento por
 * proyecto). Auth dentro del handler (requireLiveAccess, fail-closed). Soporta
 * polling incremental con `?since=<ISO>`.
 *
 * Se prefiere polling sobre SSE por robustez en el runtime serverless (una
 * conexión SSE larga se corta con la función). El cliente hace short-poll.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireLiveAccess } from "@/lib/projects/access";
import { listRecentEvents } from "@/lib/projects/live-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const since = req.nextUrl.searchParams.get("since");
  const events = await listRecentEvents({ projectId, since });
  return NextResponse.json(
    { events, serverTime: new Date().toISOString() },
    { headers: noStore },
  );
}
