import "server-only";

import { queryOne } from "@/lib/db/client";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  projectApiPath,
  type VForgeIdentity,
} from "@/lib/api/vforge-owned";
import type { LiveRole } from "@/lib/projects/roles";

export interface ReferenceAccess {
  identity: VForgeIdentity;
  role: LiveRole;
  canWrite: boolean;
}

export async function ensureProjectReferencesTable(): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS project_references (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id  text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
      url         text NOT NULL CHECK (char_length(url) BETWEEN 1 AND 2048),
      kind        text NOT NULL DEFAULT 'page'
                    CHECK (kind IN ('page', 'component', 'inspiration')),
      notes       text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
      created_by  text NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await queryOne(
    `CREATE INDEX IF NOT EXISTS idx_project_references_project
       ON project_references (project_id, created_at DESC)`,
  );
}

export async function authorizeReferenceAccess(
  projectId: string,
  signal: AbortSignal,
): Promise<ReferenceAccess | null> {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return null;

  const upstream = await fetchVForgeApi(
    projectApiPath(projectId, "context"),
    identity,
    { signal },
  );
  if (!upstream.ok) return null;
  const payload = (await upstream.json().catch(() => null)) as {
    me?: { role?: LiveRole };
  } | null;
  const role = payload?.me?.role;
  if (role !== "owner" && role !== "reviewer" && role !== "observer")
    return null;
  return { identity, role, canWrite: role === "owner" };
}

export function normalizeReferenceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      return null;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    )
      return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}
