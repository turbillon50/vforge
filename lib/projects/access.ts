/**
 * Helper CENTRAL de acceso al portal en vivo — SERVER ONLY.
 *
 * Resuelve el acceso de un usuario a un proyecto, FALLANDO CERRADO ante
 * cualquier ausencia de identidad, membresía, expiración o error.
 */
import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";
import {
  type LiveRole,
  type MembershipRow,
  resolveMembership,
  roleAtLeast,
} from "@/lib/projects/roles";
import {
  membershipBelongsToUserSql,
  normalizeScopedIdentity,
} from "@/lib/projects/membership-scope";

export interface LiveAccess {
  projectId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: LiveRole;
  /** true si es owner de la PLATAFORMA (Luis/Jaime). */
  isPlatformOwner: boolean;
}

export interface LiveIdentity {
  userId: string;
  email: string;
  name?: string | null;
}

function displayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}, fallback: string): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || fallback;
}

/**
 * Variante server-to-server. La identidad solo debe llegar después de validar
 * VFORGE_API_INTERNAL_TOKEN; esta función vuelve a resolver el rol en la DB.
 */
export async function resolveLiveAccessForIdentity(
  projectId: string,
  identity: LiveIdentity,
): Promise<LiveAccess | null> {
  const cleanProjectId = projectId?.trim();
  const scoped = normalizeScopedIdentity(identity.userId, identity.email);
  if (!cleanProjectId || !scoped) return null;
  const userId = scoped.clerkUserId;
  const email = scoped.email;
  const name = identity.name?.trim().slice(0, 160) || email;

  if (isOwnerEmail(email)) {
    return {
      projectId: cleanProjectId,
      clerkUserId: userId,
      email,
      name,
      role: "owner",
      isPlatformOwner: true,
    };
  }

  let row: MembershipRow | null = null;
  try {
    row = await queryOne<MembershipRow>(
      `SELECT role, status, expires_at
         FROM project_live_members
        WHERE project_id = $1
          AND ${membershipBelongsToUserSql("project_live_members", "$2", "$3")}
        LIMIT 1`,
      [cleanProjectId, userId, email],
    );
  } catch {
    return null;
  }

  const role = resolveMembership(row, new Date());
  if (!role) return null;

  return {
    projectId: cleanProjectId,
    clerkUserId: userId,
    email,
    name,
    role,
    isPlatformOwner: false,
  };
}

/** Resuelve el acceso del usuario Clerk actual. */
export async function resolveLiveAccess(
  projectId: string,
): Promise<LiveAccess | null> {
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    return null;
  }
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  return resolveLiveAccessForIdentity(projectId, {
    userId: user.id,
    email,
    name: displayName(user, email),
  });
}

/** Igual que resolveLiveAccess pero exige un rol mínimo. */
export async function requireLiveAccess(
  projectId: string,
  minRole: LiveRole = "observer",
): Promise<LiveAccess | null> {
  const access = await resolveLiveAccess(projectId);
  if (!access || !roleAtLeast(access.role, minRole)) return null;
  return access;
}
