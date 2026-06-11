/**
 * POST /api/forja/activate — marca la esfera como ACTIVA.
 *
 * Regla dura: solo activa si las 3 conexiones (github/vercel/neon) están
 * VERIFICADAS con ping real. Re-verifica en el momento para no activar sobre
 * credenciales que caducaron entre pasos. Cero intervención humana.
 */
import { requireTenant } from "@/lib/control-plane/session";
import {
  listConnections,
  getCredentialSecret,
  putCredential,
  SERVICES,
} from "@/lib/control-plane/credentials";
import { pingService } from "@/lib/control-plane/ping";
import { setSphereStatus } from "@/lib/control-plane/tenants";
import { recordEvent } from "@/lib/control-plane/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireTenant();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Re-verificación en vivo de cada servicio con su secreto guardado.
  const results: Record<string, { ok: boolean; error: string | null }> = {};
  for (const service of SERVICES) {
    const secret = await getCredentialSecret(ctx.tenant.id, service);
    if (!secret) {
      results[service] = { ok: false, error: "no conectado" };
      continue;
    }
    const ping = await pingService(service, secret);
    results[service] = { ok: ping.ok, error: ping.error };
    await putCredential(
      ctx.tenant.id,
      ctx.sphere.id,
      service,
      secret,
      ping.identity,
      ping.ok ? "verified" : "error",
      ping.ok ? null : ping.error,
    );
  }

  const allOk = SERVICES.every((s) => results[s]?.ok);
  if (!allOk) {
    await setSphereStatus(ctx.tenant.id, ctx.sphere.id, "degraded");
    await recordEvent(ctx.tenant.id, ctx.sphere.id, "sphere.activation_blocked", {
      level: "warn",
      message: "Activación bloqueada: hay conexiones sin verificar",
    });
    const connections = await listConnections(ctx.tenant.id);
    return Response.json(
      { ok: false, status: "degraded", results, connections, error: "faltan conexiones verificadas" },
      { status: 409 },
    );
  }

  await setSphereStatus(ctx.tenant.id, ctx.sphere.id, "active");
  await recordEvent(ctx.tenant.id, ctx.sphere.id, "sphere.activated", {
    level: "info",
    message: "Esfera activada — las 3 conexiones verificadas",
  });
  const connections = await listConnections(ctx.tenant.id);
  return Response.json({ ok: true, status: "active", results, connections });
}
