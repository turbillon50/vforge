import { resolveAccess } from "@/lib/connect/resolve-token";
import { sql } from "@/lib/db/client";
import { normalizeProjectSlug } from "@/lib/vault/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EvidenceRow {
  id: string;
  project_slug: string;
  kind: "screenshot" | "text" | "voice";
  raw_url: string | null;
  transcript: string;
  interpretation: string;
  linked_process: string | null;
  created_by: string;
  created_at: string;
}

interface ProcessStatusRow {
  id: string;
  project_slug: string;
  process_name: string;
  state: "listo" | "falta" | "sugerencia";
  note: string;
  updated_at: string;
}

export async function GET(req: Request) {
  const access = await resolveAccess();
  if (!access.userId) return jsonError("unauthorized", 401);
  if (!access.isOwner) {
    return json({ evidence: [], statuses: [] });
  }

  const { searchParams } = new URL(req.url);
  const project = normalizeProjectSlug(searchParams.get("project"));
  if (!project) {
    return jsonError("project query param required", 400);
  }

  const [evidenceRows, statusRows] = await Promise.all([
    sql`
      SELECT id, project_slug, kind, raw_url, transcript, interpretation,
             linked_process, created_by, created_at
        FROM evidence_vault
       WHERE project_slug = ${project}
       ORDER BY created_at DESC
       LIMIT 200
    `,
    sql`
      SELECT id, project_slug, process_name, state, note, updated_at
        FROM process_status
       WHERE project_slug = ${project}
       ORDER BY process_name ASC
    `,
  ]);

  const evidence = evidenceRows as EvidenceRow[];
  const statuses = statusRows as ProcessStatusRow[];

  return json({ evidence, statuses });
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
