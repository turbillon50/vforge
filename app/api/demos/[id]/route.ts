import { queryOne } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { demo_destacado?: unknown } | null;
  if (!body || typeof body.demo_destacado !== "boolean") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await ensureProjectCarteraSchema();
  const updated = await queryOne<{ id: string; demo_destacado: boolean }>(
    `UPDATE projects
        SET demo_destacado = $1, updated_at = now()
      WHERE id = $2
        AND COALESCE(es_demo, false) = true
      RETURNING id, demo_destacado`,
    [body.demo_destacado, id],
  );
  if (!updated) return Response.json({ error: "demo_not_found" }, { status: 404 });

  return Response.json(
    { demo: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
