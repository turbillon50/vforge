/** Cola global de tareas del owner (todos los proyectos). */
import { NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { listGlobalOpenTasks } from "@/lib/live/comment-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentVForgeIdentity();
  if (!identity || !isOwnerEmail(identity.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tasks = await listGlobalOpenTasks(100);
  return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
}
