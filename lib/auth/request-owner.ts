import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export interface RequestOwner {
  userId: string | null;
  isOwner: boolean;
}

/**
 * Resuelve únicamente identidad y propiedad para rutas owner-only. A diferencia
 * de resolveAccess(), no consulta ni sincroniza tokens GitHub/Vercel: intentar
 * abrir un endpoint prohibido nunca debe producir efectos laterales en vaults.
 */
export async function resolveRequestOwner(): Promise<RequestOwner> {
  const user = await currentUser().catch(() => null);
  return {
    userId: user?.id ?? null,
    isOwner: isOwnerUser(user),
  };
}
