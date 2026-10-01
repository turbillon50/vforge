import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { loadDemoProjects } from "@/lib/projects/cartera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const demos = await loadDemoProjects();
  return Response.json(
    { demos },
    { headers: { "Cache-Control": "no-store" } },
  );
}
