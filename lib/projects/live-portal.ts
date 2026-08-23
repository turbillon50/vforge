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
import { resolveProjectViewportUrls } from "@/lib/projects/viewport-url";

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
  const project = await queryOne<ProjectViewports>(
    `SELECT id, name, status, desktop_url, mobile_url, admin_url, vercel_url, domain
       FROM projects WHERE id = $1 LIMIT 1`,
    [projectId],
  );
  if (!project) return null;

  return {
    ...project,
    ...resolveProjectViewportUrls(project),
  };
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
    [args.projectId, email, args.role, tokenHash, args.invitedBy, String(ttl)],
  );
  if (!invitation) {
    throw new Error("invitation insert failed");
  }
  return { invitation, token };
}

export type AcceptResult =
  | { ok: true; projectId: string; role: LiveRole }
  | { ok: false; reason: "expired" | "used" | "revoked" | "email_mismatch" | "invalid" };

/**
 * Acepta una invitación por token en claro para `sessionEmail` / `clerkUserId`.
 *
 * ATÓMICO: el claim de la invitación (uso único) y el upsert de la membresía
 * ocurren en UNA sola sentencia SQL (CTE data-modifying). El `UPDATE` valida en
 * el mismo WHERE: hash, sin aceptar, sin revocar, no expirada y que el email de
 * la invitación coincida con el de la sesión. Si no reclama fila, el `INSERT`
 * no ve nada y la sentencia no devuelve fila → `invalid` genérico.
 *
 * No se usan transacciones multi-request del driver HTTP: es un único statement.
 */
export async function acceptInvitation(args: {
  token: string;
  sessionEmail: string;
  clerkUserId: string;
}): Promise<AcceptResult> {
  const tokenHash = hashInviteToken(args.token);
  const email = args.sessionEmail.trim().toLowerCase();

  const row = await queryOne<{ project_id: string; role: string }>(
    `WITH claimed AS (
        UPDATE project_live_invitations
           SET accepted_at = now(), accepted_by = $3
         WHERE token_hash = $1
           AND accepted_at IS NULL
           AND revoked_at IS NULL
           AND expires_at > now()
           AND lower(email) = $2
        RETURNING project_id, role, invited_by
     ),
     membership AS (
        INSERT INTO project_live_members
            (project_id, clerk_user_id, email, role, status, invited_by)
        SELECT project_id, $3, $2, role, 'active', invited_by FROM claimed
        ON CONFLICT (project_id, lower(email)) DO UPDATE
           SET role = EXCLUDED.role,
               status = 'active',
               clerk_user_id = EXCLUDED.clerk_user_id,
               expires_at = NULL
        RETURNING project_id, role
     )
     SELECT project_id, role FROM membership`,
    [tokenHash, email, args.clerkUserId],
  );

  // Sin fila (token inválido, ya usada/revocada, expirada o email distinto) o
  // rol corrupto en la fila → rechazo opaco.
  if (!row || !isLiveRole(row.role)) return { ok: false, reason: "invalid" };

  return { ok: true, projectId: row.project_id, role: row.role };
}

export interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

/** Lista comentarios del proyecto (más recientes primero). */
export async function listComments(
  projectId: string,
  limit = 100,
): Promise<CommentRow[]> {
  const lim = Math.min(200, Math.max(1, Math.floor(limit)));
  return queryAll<CommentRow>(
    `SELECT id, author_email, author_name, body, created_at
       FROM project_comments
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [projectId, lim],
  );
}

/** Crea un comentario. `body` se valida/recorta a COMMENT_MAX_LEN. */
export async function createComment(args: {
  projectId: string;
  authorEmail: string;
  authorName: string | null;
  authorClerkId: string | null;
  body: string;
}): Promise<CommentRow | null> {
  const body = args.body.trim().slice(0, COMMENT_MAX_LEN);
  if (!body) return null;
  return queryOne<CommentRow>(
    `INSERT INTO project_comments
        (project_id, author_clerk_id, author_email, author_name, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, author_email, author_name, body, created_at`,
    [args.projectId, args.authorClerkId, args.authorEmail, args.authorName, body],
  );
}

export interface LiveEventRow {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  severity: string;
  ts: string;
}

/**
 * Actividad reciente del proyecto desde project_events, ESTRICTAMENTE acotada
 * por project_id. `since` (ISO) permite polling incremental.
 */
export async function listRecentEvents(args: {
  projectId: string;
  since?: string | null;
  limit?: number;
}): Promise<LiveEventRow[]> {
  const lim = Math.min(100, Math.max(1, Math.floor(args.limit ?? 40)));
  if (args.since) {
    const since = new Date(args.since);
    if (!Number.isNaN(since.getTime())) {
      return queryAll<LiveEventRow>(
        `SELECT id, event_type, details, severity, ts
           FROM project_events
          WHERE project_id = $1 AND ts > $2
          ORDER BY ts DESC
          LIMIT $3`,
        [args.projectId, since.toISOString(), lim],
      );
    }
  }
  return queryAll<LiveEventRow>(
    `SELECT id, event_type, details, severity, ts
       FROM project_events
      WHERE project_id = $1
      ORDER BY ts DESC
      LIMIT $2`,
    [args.projectId, lim],
  );
}
