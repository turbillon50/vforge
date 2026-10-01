import { loadHiloDashboardData } from "@/lib/hilo/server";
import { resolveRequestOwner } from "@/lib/auth/request-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveRequestOwner();
  if (!access.userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!access.isOwner) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project");
  const data = await loadHiloDashboardData(project);
  return Response.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
