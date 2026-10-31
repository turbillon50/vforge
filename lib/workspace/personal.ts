import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { queryAll, queryOne } from "@/lib/db/client";
import { canAccessPersonalSpace, type PersonalActor, type PersonalSpace } from "./personal-policy";

export async function currentPersonalActor(): Promise<PersonalActor | null> {
  const user = await currentUser().catch(() => null);
  if (!user) return null;
  const address = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  if (!address || address.verification?.status !== "verified") return null;
  return { userId: user.id, email: address.emailAddress.toLowerCase(), isPlatformOwner: isOwnerUser(user) };
}

export async function listPersonalSpaces(actor: PersonalActor): Promise<PersonalSpace[]> {
  return queryAll<PersonalSpace>(
    `SELECT id,name,owner_clerk_user_id,owner_email,assistant_name,infra_house,
            memory_provider,memory_status,memory_reference
       FROM vforge_personal_spaces
      WHERE $1::boolean OR owner_clerk_user_id=$2 ORDER BY name`,
    [actor.isPlatformOwner, actor.userId],
  );
}

export async function resolvePersonalSpace(actor: PersonalActor, requested?: string | null): Promise<PersonalSpace | null> {
  if (requested && !/^[a-z][a-z0-9_-]{0,63}$/.test(requested)) return null;
  const space = requested
    ? await queryOne<PersonalSpace>("SELECT * FROM vforge_personal_spaces WHERE id=$1", [requested])
    : await queryOne<PersonalSpace>("SELECT * FROM vforge_personal_spaces WHERE owner_clerk_user_id=$1", [actor.userId]);
  return space && canAccessPersonalSpace(actor, space) ? space : null;
}
