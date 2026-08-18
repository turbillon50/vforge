/**
 * Helper CENTRAL de acceso al portal en vivo — SERVER ONLY.
 *
 * Resuelve el acceso de un usuario (por su sesión de Clerk) a un proyecto,
 * FALLANDO CERRADO: cualquier ausencia de sesión, email, membresía, expiración
 * o error → sin acceso (null). Aplica la jerarquía owner > reviewer > observer.
 *
 * Es la ÚNICA puerta de entrada que deben usar las páginas y los handlers del
 * portal (/app/live y /api/live/*). No confía en nada del cliente.
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

export interface LiveAccess {
  projectId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: LiveRole;
  /** true si es owner de la PLATAFORMA (Luis/Jaime): acceso a cualquier proyecto. */
  isPlatformOwner: boolean;
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
 * Resuelve el acceso del usuario actual al proyecto `projectId`.
 * Devuelve el contexto de acceso o null (fail-closed).
 */
export async function resolveLiveAccess(
  projectId: string,
): Promise<LiveAccess | null> {
  if (!projectId || typeof projectId !== "string") return null;

  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    return null; // sin runtime de auth → cerrado
  }
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase();
  if (!email) return null;

  // Owner de la plataforma: acceso total a cualquier proyecto en vivo, sin
  // necesidad de membresía. Mismo bypass que el resto del portal del cliente.
  if (isOwnerEmail(email)) {
    return {
      projectId,
      clerkUserId: user.id,
      email,
      name: displayName(user, email),
      role: "owner",
      isPlatformOwner: true,
    };
  }

  // Membresía real del proyecto. resolveMembership aplica status + expiración.
  let row: MembershipRow | null = null;
  try {
    row = await queryOne<MembershipRow>(
      `SELECT role, status, expires_at
         FROM project_live_members
        WHERE project_id = $1 AND lower(email) = lower($2)
        LIMIT 1`,
      [projectId, email],
    );
  } catch {
    return null; // error de DB → cerrado
  }

  const role = resolveMembership(row, new Date());
  if (!role) return null;

  return {
    projectId,
    clerkUserId: user.id,
    email,
    name: displayName(user, email),
    role,
    isPlatformOwner: false,
  };
}

/**
 * Igual que resolveLiveAccess pero exige un rol MÍNIMO (jerárquico). Devuelve
 * null si no hay acceso o el rol no alcanza. Úsalo en handlers que requieren
 * r