import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne, sql } from "@/lib/db/client";
import { getProject, listProjectDomains, pickCustomDomain } from "@/lib/vercel/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liga el expediente con su proyecto de Vercel (el que tiene el mismo nombre que el repo
 * principal, o el que se indique) y guarda vercel_project_id / vercel_url / domain.
 * Así cada demo "reporta" a VForge: código en GitHub + despliegue en Vercel en el mismo expediente.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { vercel_project?: unknown };
  const project = await queryOne<{ id: string; github_repo: string | null }>(
    "SELECT id, github_repo FROM projects WHERE id = $1 LIMIT 1",
    [id],
  );
  if (!project) return Response.json({ error: "project_not_found" }, { status: 404 });

  const wanted =
    typeof body.vercel_project === "string" && body.vercel_project.trim()
      ? body.vercel_project.trim()
      : project.github_repo?.split("/").pop() ?? project.id;

  let vp;
  try {
    vp = await getProject(wanted, { auditUserId: access.userId });
  } catch {
    return Response.json({ error: "vercel_project_not_found", buscado: wanted }, { status: 404 });
  }

  let custom: string | null = null;
  try {
    custom = pickCustomDomain(await listProjectDomains(vp.id, { auditUserId: access.userId }));
  } catch {
    custom = null;
  }
  const domain = custom ?? `${vp.name}.vercel.app`;
  await sql`
    UPDATE projects
       SET vercel_project_id = ${vp.id},
           vercel_url = ${`https://${vp.name}.vercel.app`},
           domain = ${domain},
           updated_at = now()
     WHERE id = ${project.id}
  `;
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (${access.userId}, 'project.vercel.link', 'project', ${project.id}, 1,
            ${JSON.stringify({ vercel_project_id: vp.id, domain })}::jsonb)
  `;
  return Response.json({ ok: true, vercel_project_id: vp.id, vercel_url: `https://${vp.name}.vercel.app`, domain });
}
