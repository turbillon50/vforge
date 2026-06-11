/**
 * GET /api/esfera — datos del dashboard de la esfera del cliente.
 * Estado por conexión (verde/rojo), métrica de ahorro vs infra tradicional y
 * eventos recientes. Sin secretos, sin mock: si no hay conexiones, todo en 0 y
 * la UI muestra estado vacío real.
 */
import { requireTenant } from "@/lib/control-plane/session";
import { listConnections } from "@/lib/control-plane/credentials";
import { computeSavings } from "@/lib/control-plane/savings";
import { recentEvents } from "@/lib/control-plane/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireTenant();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });

  const connections = await listConnections(ctx.tenant.id);
  const savings = computeSavings(connections);
  const events = await recentEvents(ctx.tenant.id, 12);

  const verified = connections.filter((c) => c.status === "verified").length;
  const health: "active" | "degraded" | "forging" =
    ctx.sphere.status === "active"
      ? verified === connections.filter((c) => c.status !== "missing").length && verified > 0
        ? "active"
        : "degraded"
      : (ctx.sphere.status as "degraded" | "forging");

  return Response.json(
    {
      sphere: {
        id: ctx.sphere.id,
        name: ctx.sphere.name,
        status: ctx.sphere.status,
        activatedAt: ctx.sphere.activated_at,
        health,
      },
      tenant: { plan: ctx.tenant.plan },
      connections,
      savings,
      events,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
