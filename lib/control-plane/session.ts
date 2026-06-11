/**
 * Puente Clerk → tenant para las rutas de Esferas. Resuelve el usuario de la
 * sesión y garantiza su tenant+esfera. Si no hay sesión, devuelve null y el
 * handler responde 401.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureTenantContext, type TenantContext } from "./tenants";

export async function requireTenant(): Promise<TenantContext | null> {
  const { userId } = await auth();
  if (!userId) return null;
  let email: string | null = null;
  let name: string | null = null;
  try {
    const u = await currentUser();
    email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? null;
    name =
      [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
      u?.username ||
      null;
  } catch {
    // currentUser puede fallar en algunos runtimes; el tenant se crea igual.
  }
  return ensureTenantContext(userId, email, name);
}
