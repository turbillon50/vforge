import { resolveAccess } from "@/lib/connect/resolve-token";
import { sql } from "@/lib/db/client";
import {
  normalizeProcessName,
  normalizeProjectSlug,
  parseProcessState,
  type ProcessState,
} from "@/lib/vault/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatusBody {
  project?: unknown;
  projectSlug?: unknown;
  processName?: unknown;
  process_name?: unknown;
  state?: unknown;
  note?: unknown;
}

interface ProcessStatusRow {
  id: string;
  project_slug: string;
  process_name: string;
  state: ProcessState;
  note: string;
  updated_at: string;
}

export async function POST(req: Request) {
  const access = await resolveAccess();
  if (!access.userId) return jsonError("unauthorized", 401);
  if (!access.isOwner) return jsonError("forbidden", 403);

  const body = (await req.json().catch(() => null)) as StatusBody | null;
  if (!body) return jsonError("Invalid JSON body", 400);

  const project = normalizeProjectSlug(body.project ?? body.projectSlug);
  if (!project) return jsonError("project is required", 400);

  const processName = normalizeProcessName(body.processName ?? body.process_name);
  if (!processName) return jsonError("processName is required", 400);

  const state = parseProcessState(body.state);
  if (!state) return jsonError("state must be listo, falta, or sugerencia", 400);

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const rows = (await sql`
    INSERT INTO process_status (project_slug, process_name, state, note)
    VALUES (${project}, ${processName}, ${state}, ${note})
    ON CONFLICT (project_slug, process_name) DO UPDATE SET
      state = EXCLUDED.state,
      note = EXCLUDED.note,
      updated_at = now()
    RETURNING id, project_slug, process_name, state, note, updated_at
  `) as ProcessStatusRow[];

  const status = rows[0];

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'vault.process_status.upsert', 'process_status',
      ${status.id}, 1,
      ${JSON.stringify({
        project_slug: project,
        process_name: processName,
        state,
      })}::jsonb
    )
  `;

  return json({ status });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}
