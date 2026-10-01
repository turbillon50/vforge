import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { useDemoAsBase } from "@/lib/projects/demo-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const { id } = await params;
  const result = await useDemoAsBase({
    demoId: id,
    name: typeof body?.name === "string" ? body.name : "",
    auditUserId: access.userId,
    initialEtapa: "demo_en_construccion",
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
