import { resolveAccess } from "@/lib/connect/resolve-token";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { readDispatchState } from "@/lib/cockpit/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estado en vivo de las ESFERAS Vulcano para el Taller. Lee dispatch_queue real
 * (DISPATCH_DATABASE_URL → ep-aged-paper). CERO MOCK: sin actividad devuelve
 * `source:"empty"`. Auth: en producción (Clerk configurado) exige owner; en
 * builds de preview (sin key de Clerk) se sirve abierto igual que el middleware.
 */
export async function GET() {
  if (hasClerkPublishableKey()) {
    const access = await resolveAccess();
    if (!access.userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await readDispatchState();
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
