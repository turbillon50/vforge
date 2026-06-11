/**
 * API Portal Cliente — detalle de UN proyecto (read-only).
 *
 * GET — valida que el usuario actual sea miembro ACTIVO del proyecto.
 *   Si no lo es → 403. Si lo es, devuelve TODO lo que el cliente ve en su
 *   portal:
 *     - project: datos del proyecto
 *     - status:  client_project_status (estado + avance de cobro real)
 *     - timeline: project_timeline ordenado (avance EN VIVO)
 *     - contracts: contratos del proyecto con su esquema de pagos
 *     - evidence: evidencias subidas (fotos/archivos/notas)
 *     - feedback: comentarios y sugerencias del cliente
 *     - integrations: project_integrations del proyecto
 */
import { NextResponse } from "next/server";
import { queryAll, queryOne } from "@/lib/db/client";
import { requireMember } from "@/lib/projects/membership";
import { listContractsForProject } from "@/lib/contracts/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const member = await requireMember(id);
  if (!member) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: noStore },
    );
  }

  const project = await queryOne<{
    id: string;
    name: string;
    status: string;
    github_repo: string | null;
    vercel_url: string | null;
    domain: string | null;
  }>(
    `SELECT id, name, status, github_repo, vercel_url, domain
       FROM projects WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!project) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: noStore },
    );
  }

  const [status, timeline, integrations, evidence, feedback, contracts] =
    await Promise.all([
      queryOne(
        `SELECT client_name, status, total_mxn, paid_mxn, next_milestone, updated_at
           FROM client_project_status WHERE project_id = $1`,
        [id],
      ),
      queryAll(
        `SELECT id, stage, status, title, detail, position, created_at, updated_at
           FROM project_timeline WHERE project_id = $1
          ORDER BY position ASC, created_at ASC`,
        [id],
      ),
      queryAll(
        `SELECT id, kind, label, status, meta, created_at
           FROM project_integrations WHERE project_id = $1
          ORDER BY created_at ASC`,
        [id],
      ),
      queryAll(
        `SELECT id, kind, raw_url, transcript, interpretation, created_by, created_at
           FROM evidence_vault WHERE project_slug = $1
          ORDER BY created_at DESC LIMIT 50`,
        [id],
      ),
      queryAll(
        `SELECT id, author_email, author_name, kind, body, created_at
           FROM project_feedback WHERE project_id = $1
          ORDER BY created_at DESC LIMIT 50`,
        [id],
      ),
      listContractsForProject(id),
    ]);

  return NextResponse.json(
    {
      project,
      status,
      timeline,
      integrations,
      evidence,
      feedback,
      contracts,
      me: { email: member.email, name: member.name, role: member.role },
    },
    { status: 200, headers: noStore },
  );
}
