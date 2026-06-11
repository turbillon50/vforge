/**
 * GET /api/forja/status — estado del wizard para el tenant actual.
 * Devuelve la esfera, las 3 conexiones (github/vercel/neon) con su estado y si
 * ya se puede activar. Sin secretos.
 */
import { requireTenant } from "@/lib/control-plane/session";
import { listConnections, SERVICES } from "@/lib/control-plane/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireTenant();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });

  const connections = await listConnections(ctx.tenant.id);
  const verifiedCount = connections.filter((c) => c.status === "verified").length;
  const canActivate = SERVICES.every((s) =>
    connections.find((c) => c.service === s && c.status === "verified"),
  );

  return Response.json(
    {
      sphere: {
        id: ctx.sphere.id,
        name: ctx.sphere.name,
        status: ctx.sphere.status,
        activatedAt: ctx.sphere.activated_at,
      },
      tenant: { plan: ctx.tenant.plan },
      connections,
      verifiedCount,
      requiredCount: SERVICES.length,
      canActivate,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
