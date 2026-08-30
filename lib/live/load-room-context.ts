import "server-only";

import { queryAll } from "@/lib/db/client";
import {
  fetchVForgeApi,
  projectApiPath,
  type VForgeIdentity,
} from "@/lib/api/vforge-owned";
import {
  formatRoomContext,
  type RoomComment,
  type RoomProjectInfo,
  type RoomReference,
} from "@/lib/live/room-context";
import { listProjectDecisionLog } from "@/lib/live/load-project-memory";
import { ensureProjectReferencesTable } from "@/lib/live/project-references";

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return payload && typeof payload === "object" ? payload : null;
}

export async function loadRoomContextBrief(
  projectId: string,
  identity: VForgeIdentity,
  signal: AbortSignal,
): Promise<string> {
  const [commentsRes, contextRes, references, decisions] = await Promise.all([
    fetchVForgeApi(`${projectApiPath(projectId, "comments")}?limit=80`, identity, {
      signal,
    }).then(readJson).catch(() => null),
    fetchVForgeApi(projectApiPath(projectId, "context"), identity, {
      signal,
    }).then(readJson).catch(() => null),
    (async () => {
      await ensureProjectReferencesTable();
      return queryAll<RoomReference>(
        `SELECT label, url, kind, notes
           FROM project_references
          WHERE project_id = $1
          ORDER BY created_at DESC
          LIMIT 20`,
        [projectId],
      );
    })().catch(() => [] as RoomReference[]),
    listProjectDecisionLog(projectId).catch(() => "DECISIONES: ninguna todavía."),
  ]);

  const comments = Array.isArray(commentsRes?.comments)
    ? (commentsRes.comments as RoomComment[])
    : [];
  const project = (contextRes?.project ?? null) as RoomProjectInfo | null;
  const document =
    contextRes?.document &&
    typeof contextRes.document === "object" &&
    typeof (contextRes.document as { content?: unknown }).content === "string"
      ? (contextRes.document as { content: string }).content
      : "";
  const assets = Array.isArray(contextRes?.assets)
    ? (contextRes.assets as Array<{ filename?: string }>)
        .filter((asset) => typeof asset.filename === "string")
        .map((asset) => ({ filename: asset.filename as string }))
    : [];

  const repositories = Array.isArray(contextRes?.repositories)
    ? (contextRes.repositories as Array<{
        repo_full_name?: string;
        role?: string;
        is_primary?: boolean;
      }>)
        .filter((repo) => typeof repo.repo_full_name === "string")
        .map((repo) => ({
          repo_full_name: repo.repo_full_name as string,
          role: repo.role ?? "app",
          is_primary: Boolean(repo.is_primary),
        }))
    : [];

  return formatRoomContext({
    projectId,
    project,
    comments,
    references,
    document,
    assets,
    repositories,
    decisions,
  });
}
