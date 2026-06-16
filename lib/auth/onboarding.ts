/**
 * Gate de onboarding — distingue a un cliente recién registrado (debe pasar
 * por /onboarding) de uno que ya completó el flujo (va directo a /workspace).
 *
 * Fuente de verdad: Clerk `publicMetadata.onboardingComplete === true`.
 * Se marca con POST /api/user/complete-onboarding al cerrar el flujo.
 *
 * Lectura en dos niveles, igual que el owner-gate:
 *  1. claim del JWT de sesión (rápido, sin pegarle a Clerk), y
 *  2. fallback a la Backend API de Clerk cuando el claim aún no propaga.
 *
 * Solo se cachean los resultados POSITIVOS (ya completó): cachear un "todavía
 * no" dejaría al usuario recién onboardeado rebotando a /onboarding hasta que
 * expire el TTL. El set de usuarios sin onboarding es pequeño y transitorio,
 * así que re-consultarlos en cada navegación es barato.
 */
import { clerkClient } from "@clerk/nextjs/server";

const doneCache = new Map<string, number>(); // userId -> timestamp (solo completados)
const TTL_MS = 10 * 60 * 1000;

/**
 * @param claimComplete  valor de `publicMetadata.onboardingComplete` leído del
 *   JWT de sesión por el caller (`undefined` si el claim aún no propaga).
 */
export async function resolveOnboardingComplete(
  userId: string,
  claimComplete: boolean | undefined,
): Promise<boolean> {
  if (claimComplete === true) return true;

  const cachedAt = doneCache.get(userId);
  if (cachedAt && Date.now() - cachedAt < TTL_MS) return true;

  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const done =
      (user.publicMetadata as { onboardingComplete?: boolean } | null)
        ?.onboardingComplete === true;
    if (done) doneCache.set(userId, Date.now());
    return done;
  } catch {
    // Sin red / Clerk caído: no bloqueamos al usuario en un loop de onboarding.
    return true;
  }
}
