import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne } from "@/lib/db/client";
import {
  PROJECT_ETAPA_LATERAL,
  isProjectEtapa,
  nextProjectEtapa,
  previousProjectEtapa,
  type ProjectEtapa,
} from "@/lib/projects/etapas";
import {
  cleanUrl,
  listProjectEtapas,
  setProjectEtapa,
} from "@/lib/projects/etapas-server";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  action?: unknown;
  etapa?: unknown;
  nota?: unknown;
  demo_url?: unknown;
  contrato_url?: unknown;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return Response.json({ error: "missing_id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  await ensureProjectCarteraSchema();
  const current = await queryOne<{ id: string; etapa: ProjectEtapa | null }>(
    `SELECT id, etapa
       FROM projects
      WHERE id = $1
        AND COALESCE(es_demo, false) = false
      LIMIT 1`,
    [id],
  );
  if (!current) return Response.json({ error: "project_not_found" }, { status: 404 });

  const target = await resolveTarget(id, current.etapa, body);
  if (!target) return Response.json({ error: "invalid_transition" }, { status: 400 });

  const demoUrl =
    target === "demo_entregada" && typeof body.demo_url === "string"
      ? cleanUrl(body.demo_url)
      : undefined;
  const contratoUrl =
    target === "contrato_enviado" && typeof body.contrato_url === "string"
      ? cleanUrl(body.contrato_url)
      : undefined;

  if (target === "demo_entregada" && !demoUrl) {
    return Response.json({ error: "demo_url_required" }, { status: 400 });
  }
  if (target === "contrato_enviado" && !contratoUrl) {
    return Response.json({ error: "contrato_url_required" }, { status: 400 });
  }

  const result = await setProjectEtapa({
    projectId: id,
    etapa: target,
    nota: typeof body.nota === "string" ? body.nota : null,
    demoUrl,
    contratoUrl,
    creadoPor: access.userId,
  });
  if (!result) return Response.json({ error: "not_found" }, { status: 404 });

  const history = await listProjectEtapas(id);
  return Response.json(
    { ok: true, project: result.project, previous: result.previous, history },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveTarget(
  projectId: string,
  current: ProjectEtapa | null,
  body: Body,
): Promise<ProjectEtapa | null> {
  if (isProjectEtapa(body.etapa)) return body.etapa;

  const action = typeof body.action === "string" ? body.action : "";
  if (action === "perdido") return PROJECT_ETAPA_LATERAL;

  const safeCurrent = current ?? "prospecto";
  if (action === "avanzar") return nextProjectEtapa(safeCurrent);
  if (action === "regresar") {
    if (safeCurrent === PROJECT_ETAPA_LATERAL) {
      const previous = await queryOne<{ etapa: ProjectEtapa }>(
        `SELECT etapa
           FROM project_etapas
          WHERE project_id = $1
            AND etapa <> 'perdido'
          ORDER BY creado_en DESC, id DESC
          LIMIT 1`,
        [projectId],
      );
      return previous?.etapa ?? "prospecto";
    }
    return previousProjectEtapa(safeCurrent);
  }

  return null;
}
