import { queryOne, sql } from "@/lib/db/client";
import { spaceSchema, EMPTY_SPACE, type Space, type SpaceModule } from "@/lib/spaces/model";
import type { McpPrincipal } from "./rbac";

function text(t: string) {
  return { content: [{ type: "text", text: t }] };
}
function err(t: string) {
  return { ...text(t), isError: true };
}

async function authorizeProject(projectId: string, principal: McpPrincipal) {
  if (principal.scope === "admin") {
    return queryOne<{ id: string }>("SELECT id FROM projects WHERE id = $1", [projectId]);
  }
  if (!principal.userId) return null;
  return queryOne<{ id: string }>(
    `SELECT p.id FROM projects p WHERE p.id = $1 AND (p.org_id = $2 OR EXISTS (
      SELECT 1 FROM project_live_members m WHERE m.project_id = p.id AND m.clerk_user_id = $3 AND m.status = 'active'
    )) LIMIT 1`,
    [projectId, principal.orgId, principal.userId]
  );
}

export async function spaceGet(args: { project_id: string }, principal: McpPrincipal) {
  const projectId = args.project_id;
  if (!projectId) return err("project_id requerido");
  const auth = await authorizeProject(projectId, principal);
  if (!auth) return err("no autorizado o proyecto no existe");

  await sql`CREATE TABLE IF NOT EXISTS project_spaces (
    project_id text PRIMARY KEY REFERENCES projects(id),
    document jsonb NOT NULL, revision integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by text NOT NULL
  )`;

  const row = await queryOne<{ document: Space; revision: number; updated_at: string }>(
    "SELECT document, revision, updated_at FROM project_spaces WHERE project_id = $1",
    [projectId]
  );
  const space = row?.document ?? EMPTY_SPACE;
  return text(JSON.stringify({
    project_id: projectId,
    revision: row?.revision ?? 0,
    updated_at: row?.updated_at ?? null,
    context: space.context,
    modules: space.modules,
    module_count: space.modules.length
  }, null, 2));
}

export async function spaceUpdate(args: { project_id: string; document: Space; revision: number }, principal: McpPrincipal) {
  const { project_id, document, revision } = args;
  if (!project_id) return err("project_id requerido");
  const parsed = spaceSchema.safeParse(document);
  if (!parsed.success) return err("document inválido: " + parsed.error.issues[0]?.message);
  if (!Number.isInteger(revision) || revision < 0) return err("revision inválida");

  const auth = await authorizeProject(project_id, principal);
  if (!auth) return err("no autorizado o proyecto no existe");

  const updated = await queryOne(`WITH saved AS (
    INSERT INTO project_spaces(project_id,document,revision,updated_by)
    SELECT $1,$2::jsonb,1,$3 WHERE $4=0 OR EXISTS (SELECT 1 FROM project_spaces WHERE project_id=$1 AND revision=$4)
    ON CONFLICT(project_id) DO UPDATE SET document=EXCLUDED.document,
      revision=project_spaces.revision+1,updated_at=now(),updated_by=EXCLUDED.updated_by
    WHERE project_spaces.revision=$4
    RETURNING revision,updated_at
  ) SELECT * FROM saved`, [project_id, JSON.stringify(parsed.data), principal.userId ?? "mcp", revision]);

  if (!updated) return err("conflicto de revisión. Recarga el Space y reintenta.");
  return text(JSON.stringify({ ok: true, revision: updated.revision, updated_at: updated.updated_at }));
}

export async function moduleCreate(args: { project_id: string; module: Partial<SpaceModule> }, principal: McpPrincipal) {
  const { project_id, module } = args;
  if (!project_id || !module?.title) return err("project_id y module.title requeridos");

  const current = await spaceGet({ project_id }, principal);
  if ("isError" in current if (current.isError) return current;if (current.isError) return current; current.isError) return current;

  const data = JSON.parse(current.content[0].text);
  const newModule: SpaceModule = {
    id: module.id || `mod_${Date.now()}`,
    title: module.title,
    kind: module.kind || "context",
    status: module.status || "pending",
    responsible: module.responsible || "",
    prompt: module.prompt || "",
    result: module.result || "",
    evidence: module.evidence || "",
    dependsOn: module.dependsOn || [],
    x: module.x ?? 100,
    y: module.y ?? 100,
  };

  const space: Space = { context: data.context, modules: [...data.modules, newModule] };
  return spaceUpdate({ project_id, document: space, revision: data.revision }, principal);
}

export const SPACE_TOOL_NAMES = new Set(["space_get", "space_update", "module_create"]);
