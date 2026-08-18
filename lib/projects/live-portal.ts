/**
 * Acceso a datos del portal en vivo — SERVER ONLY.
 *
 * Todas las consultas están acotadas por project_id (aislamiento por proyecto).
 * Reusa el cliente Neon (`queryOne`/`queryAll`) y el esquema de la migración
 * 024 (project_live_members, project_live_invitations, project_comments) y
 * project_events (actividad).
 */
import "server-only";
import { queryOne, queryAll } from "@/lib/db/client";
import {
  type LiveRole,
  isLiveRole,
} from "@/lib/projects/roles";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/lib/projects/invite-token";

const INVITE_DEFAULT_TTL_HOURS = 168; // 7 días
const INVITE_MAX_TTL_HOURS = 24 * 30; // 30 días
const COMMENT_MAX_LEN = 4000;

export interface ProjectViewports {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  vercel_url: string | null;
  domain: string | null;
}

/** Metadatos + URLs de los 3 viewports. null si el proyecto no existe. */
export async function getProjectViewports(
  projectId: string,
): Promise<ProjectViewports | null> {
  return queryOne<ProjectViewports>(
    `SELECT id, name, status, desktop_url, mobile_url, admin_url, vercel_url, domain
       FROM projects WHERE id = $1 LIMIT 1`,
    [projectId],
  );
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

/** Lista invitaciones de un proyecto — SIN token ni hash (opaco). */
export async function listInvitations(
  projectId: string,
): Promise<InvitationSummary[]> {
  return queryAll<InvitationSummary>(
    `SELECT id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at
       FROM project_live_invitations
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [projectId],
  );
}

export interface CreatedInvitation {
  invitation: InvitationSummary;
  /** Token en claro — se devuelve UNA sola vez. */
  token: string;
}

/**
 * Crea una invitación segura (token hasheado, expiración, uso único).
 * `ttlHours` se clampa a [1, 720]. Devuelve el token en claro una única vez.
 */
export async function createInvitation(args: {
  projectId: string;
  email: string;
  role: LiveRole;
  invitedBy: string | null;
  ttlHours?: number;
}): Promise<CreatedInvitation> {
  const ttl = Math.min(
    INVITE_MAX_TTL_HOURS,
    Math.max(1, Math.floor(args.ttlHours ?? INVITE_DEFAULT_TTL_HOURS)),
  );
  const { token, tokenHash } = generateInviteToken();
  const email = args.email.trim().toLowerCase();

  const invitation = await queryOne<InvitationSummary>(
    `INSERT INTO project_live_invitations
        (project_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)
     RETURNING id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at`,
    [args.proj