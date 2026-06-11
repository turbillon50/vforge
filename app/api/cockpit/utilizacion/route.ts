import { resolveAccess } from "@/lib/connect/resolve-token";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { readUtilizacion } from "@/lib/cockpit/utilizacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Panel de utilización del Taller: ocupación por agente (24h) + trabajo útil,
 * calculado de dispatch_queue real (DISPATCH_DATABASE_URL). CERO MOCK. Auth igual
 * que /api/cockpit/esferas: en producción exige owner; en preview sin Clerk, abierto.
 */
export async function GET() {
  if (hasClerkPublishableKey()) {
    const access = await resolveAccess();
    if (!access.userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await readUtilizacion();
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
