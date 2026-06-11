/**
 * Gate de acceso del portal del cliente: el usuario logueado debe ser miembro
 * ACTIVO del proyecto. Devuelve su identidad (email + nombre) o null.
 */
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";

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
  if (!email) return null;

  const member = await queryOne<{ role: string }>(
    `SELECT role FROM project_members
      WHERE project_id = $1
        AND lower(email) = lower($2)
        AND status = 'active'
      LIMIT 1`,
    [projectId, email],
  );
  if (!member) return null;

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    email;
  return { email, name, role: member.role };
}
