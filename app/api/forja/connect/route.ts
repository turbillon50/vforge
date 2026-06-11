/**
 * POST /api/forja/connect — conecta UN servicio de la esfera del cliente.
 *
 * Flujo (self-serve, cero intervención humana):
 *   1) recibe { service, secret }
 *   2) PING REAL al servicio con esa credencial
 *   3) si responde OK → cifra con el DEK del tenant y guarda como 'verified'
 *      si falla → guarda estado 'error' con el motivo (sin secreto)
 *
 * El secreto NUNCA se devuelve ni se loguea. La respuesta solo trae identidad
 * pública (login/usuario) y estado.
 */
import { requireTenant } from "@/lib/control-plane/session";
import { putCredential, SERVICES, type Service } from "@/lib/control-plane/credentials";
import { pingService } from "@/lib/control-plane/ping";
import { recordEvent } from "@/lib/control-plane/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireTenant();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { service?: string; secret?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }

  const service = body.service as Service;
  const secret = (body.secret ?? "").trim();
  if (!SERVICES.includes(service)) {
    return Response.json({ error: "servicio no soportado" }, { status: 400 });
  }
  if (!secret) {
    return Response.json({ error: "credencial vacía" }, { status: 400 });
  }

  // 1) verificación real
  const ping = await pingService(service, secret);

  // 2) persistencia cifrada (verified u error — siempre guardamos el último intento
  //    de credencial solo si el ping fue OK; si falló, no guardamos el secreto malo)
  if (ping.ok) {
    await putCredential(ctx.tenant.id, ctx.sphere.id, service, secret, ping.identity, "verified", null);
    await recordEvent(ctx.tenant.id, ctx.sphere.id, "connection.verified", {
      service,
      level: "info",
      message: `Conexión ${service} verificada (${ping.identity ?? "ok"})`,
    });
    return Response.json({
      ok: true,
      service,
      status: "verified",
      identity: ping.identity,
    });
  }

  await recordEvent(ctx.tenant.id, ctx.sphere.id, "connection.failed", {
    service,
    level: "warn",
    message: `Falló verificación de ${service}: ${ping.error ?? "error"}`,
  });
  return Response.json(
    { ok: false, service, status: "error", error: ping.error ?? "verificación fallida" },
    { status: 422 },
  );
}
