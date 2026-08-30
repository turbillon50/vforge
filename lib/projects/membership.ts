/**
 * Gate de acceso del portal del cliente: el usuario logueado debe ser miembro
 * ACTIVO del proyecto. Devuelve su identidad (email + nombre) o null.
 */
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";
import {
  membershipBelongsToUserSql,
  normalizeScopedIdentity,
} from "@/lib/projects/membership-scope";

export interface MemberContext {
  email: string;
  name: string;
  role: string;
}

export async function requireMember(
  projectId: string,
): Promise<MemberContext | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const identity = normalizeScopedIdentity(user?.id, email);
  if (!identity) return null;

  // OWNER BYPASS: Luis (owner de la plataforma) ve el baúl/PROPOSITO de
  // CUALQUIER proyecto sin necesidad de ser miembro registrado.
  if (isOwnerEmail(identity.email)) {
    const ownerName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      identity.email;
    return { email: identity.email, name: ownerName, role: "owner" };
  }

  const member = await queryOne<{ role: string }>(
    `SELECT role FROM project_members
      WHERE project_id = $1
        AND ${membershipBelongsToUserSql("project_members", "$2", "$3")}
        AND status = 'active'
      LIMIT 1`,
    [projectId, identity.clerkUserId, identity.email],
  );
  if (!member) return null;

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    identity.email;
  return { email: identity.email, name, role: member.role };
}
