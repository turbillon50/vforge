import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import {
  membershipBelongsToUserSql,
  normalizeScopedIdentity,
} from "@/lib/projects/membership-scope";

export interface ScopedProject {
  id: string;
  project_id: string;
  name: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain: string | null;
  member_role: string;
  access_kind: "live" | "workspace";
}

/**
 * Catálogo fail-closed para clientes. Sólo reúne membresías activas ligadas
 * al Clerk user id (email legacy sólo si la fila aún no tiene clerk_user_id).
 * Sin identidad o sin membresías → lista vacía. Nunca el catálogo del owner.
 */
export async function listScopedProjects(input: {
  clerkUserId: string;
  email: string;
}): Promise<ScopedProject[]> {
  const identity = normalizeScopedIdentity(input.clerkUserId, input.email);
  if (!identity) return [];
  const normalized = identity.email;

  const tables = await queryOne<{
    has_workspace_members: boolean;
    has_live_members: boolean;
  }>(
    `SELECT to_regclass('public.project_members') IS NOT NULL
              AS has_workspace_members,
            to_regclass('public.project_live_members') IS NOT NULL
              AS has_live_members`,
  );

  const sources: string[] = [];
  if (tables?.has_workspace_members) {
    sources.push(
      `SELECT pm.project_id,
              pm.role::text AS member_role,
              'workspace'::text AS access_kind,
              1 AS priority
         FROM project_members pm
        WHERE ${membershipBelongsToUserSql("pm", "$1", "$2")}
          AND pm.status = 'active'`,
    );
  }
  if (tables?.has_live_members) {
    sources.push(
      `SELECT plm.project_id,
              plm.role::text AS member_role,
              'live'::text AS access_kind,
              2 AS priority
         FROM project_live_members plm
        WHERE ${membershipBelongsToUserSql("plm", "$1", "$2")}
          AND plm.status = 'active'
          AND (plm.expires_at IS NULL OR plm.expires_at > now())`,
    );
  }
  if (sources.length === 0) return [];

  return queryAll<ScopedProject>(
    `WITH memberships AS (
       ${sources.join("\nUNION ALL\n")}
     ), scoped AS (
       SELECT DISTINCT ON (project_id)
              project_id, member_role, access_kind
         FROM memberships
        ORDER BY project_id, priority DESC
     )
     SELECT p.id,
            p.id AS project_id,
            p.name,
            p.status,
            p.github_repo,
            p.vercel_url,
            p.domain,
            scoped.member_role,
            scoped.access_kind
       FROM scoped
       JOIN projects p ON p.id = scoped.project_id
      ORDER BY p.name ASC`,
    [identity.clerkUserId, normalized],
  );
}
