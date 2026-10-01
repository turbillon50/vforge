import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne, sql } from "@/lib/db/client";
import {
  cleanProjectName,
  cleanProjectText,
  nextProjectId,
  slugifyProject,
  usarDemoComoBase,
} from "@/lib/projects/demo-base";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  cliente_nombre?: unknown;
  project_name?: unknown;
  cliente_whatsapp?: unknown;
  rubro?: unknown;
  demo_id?: unknown;
}

export async function POST(req: Request) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  const clienteNombre = cleanProjectName(body.cliente_nombre);
  const projectName = cleanProjectName(body.project_name);
  const clienteWhatsapp = cleanProjectText(body.cliente_whatsapp, 80);
  const rubro = cleanProjectText(body.rubro, 120);
  const demoId = cleanProjectText(body.demo_id, 160);

  if (!clienteNombre) return Response.json({ error: "cliente_nombre_required" }, { status: 400 });
  if (!projectName) return Response.json({ error: "project_name_required" }, { status: 400 });
  if (!rubro) return Response.json({ error: "rubro_required" }, { status: 400 });

  await ensureProjectCarteraSchema();
  await ensureProjectRepositoriesSchema();

  const projectId = await nextProjectId(slugifyProject(projectName));
  const carteraNota = `Cliente: ${clienteNombre}. Rubro: ${rubro}.`;

  if (demoId) {
    const result = await usarDemoComoBase({
      demoId,
      name: projectName,
      auditUserId: access.userId,
      projectId,
      clienteNombre,
      clienteWhatsapp,
      rubro,
      initialEtapa: "prospecto",
      carteraTipo: ["cliente"],
      carteraEstado: "prospecto",
      carteraNota,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      {
        ok: true,
        project: result.project,
        mode: result.mode,
        instructions: result.instructions,
        open_chats: true,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  }

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      cartera_tipo, cartera_estado, cartera_nota, es_demo,
      etapa, cliente_nombre, cliente_whatsapp
    ) VALUES (
      ${projectId}, ${projectName}, ${`Rubro: ${rubro}`}, 'en_revision', 'unknown',
      ${["cliente"]}::text[], 'prospecto', ${carteraNota}, false,
      'prospecto', ${clienteNombre}, ${clienteWhatsapp}
    )
  `;

  await setProjectEtapa({
    projectId,
    etapa: "prospecto",
    nota: "Alta de cliente nuevo.",
    creadoPor: access.userId,
    insertWhenSame: true,
  });

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'project.client.create', 'project', ${projectId}, 1,
      ${JSON.stringify({
        cliente_nombre: clienteNombre,
        cliente_whatsapp: clienteWhatsapp,
        rubro,
      })}::jsonb
    )
  `;

  const project = await queryOne<{ id: string; name: string; github_repo: string | null; github_url: string | null }>(
    `SELECT id, name, github_repo, github_url FROM projects WHERE id = $1`,
    [projectId],
  );

  return Response.json(
    {
      ok: true,
      project: project ?? { id: projectId, name: projectName, github_repo: null, github_url: null },
      mode: "sin_demo",
      instructions: [],
      open_chats: true,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
