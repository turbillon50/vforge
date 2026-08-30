import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import {
  formatDecisionLog,
  isProjectDecisionKind,
  type ProjectDecisionKind,
} from "@/lib/live/project-memory";

export async function ensureProjectDecisionsTable(): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS project_decisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK (kind IN (
        'talk_to_plan','plan_to_task','comment_to_task','approved','published'
      )),
      summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
      source_id text,
      created_by_email text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await queryOne(
    `CREATE INDEX IF NOT EXISTS idx_project_decisions_project
       ON project_decisions (project_id, created_at DESC)`,
  );
}

export async function recordProjectDecision(input: {
  projectId: string;
  kind: ProjectDecisionKind;
  summary: string;
  sourceId?: string | null;
  email?: string | null;
}): Promise<void> {
  if (!isProjectDecisionKind(input.kind)) return;
  const summary = input.summary.trim().slice(0, 2000);
  if (!summary) return;
  await ensureProjectDecisionsTable();
  await queryOne(
    `INSERT INTO project_decisions (project_id, kind, summary, source_id, created_by_email)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      input.projectId,
      input.kind,
      summary,
      input.sourceId ?? null,
      input.email ?? null,
    ],
  );
}

export async function listProjectDecisionLog(projectId: string): Promise<string> {
  await ensureProjectDecisionsTable();
  const rows = await queryAll<{
    kind: ProjectDecisionKind;
    summary: string;
    created_at: string;
  }>(
    `SELECT kind, summary, created_at
       FROM project_decisions
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
    [projectId],
  );
  return formatDecisionLog(
    rows.map((row) => ({
      kind: row.kind,
      summary: row.summary,
      createdAt: row.created_at,
    })),
  );
}
