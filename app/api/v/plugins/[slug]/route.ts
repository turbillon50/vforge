/**
 * Endpoint HTTP de cada plugin NATIVO.
 *
 *   POST /api/v/plugins/<slug>   body: { message, match?, args? }
 *
 * Es la cara HTTP de los handlers nativos (higgsfield, deploy, whatsapp,
 * analisis, propuesta) — útil para invocación externa, pruebas, o para que otro
 * agente del ecosistema dispare la capacidad. El chat de V los ejecuta en
 * proceso (sin pasar por aquí), así que esta superficie va gateada al owner.
 */
import { resolveAccess } from "@/lib/connect/resolve-token";
import { NATIVE_HANDLERS } from "@/lib/v/plugins/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const access = await resolveAccess();
  if (!access.isOwner) return json({ ok: false, error: "unauthorized" }, 401);

  const { slug } = await params;
  const handler = NATIVE_HANDLERS[slug];
  if (!handler) return json({ ok: false, error: "unknown_plugin", slug }, 404);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* sin body → message vacío, el handler responde lo que toque */
  }

  const message = String(body.message ?? "");
  const rawMatch = body.match;
  const match = Array.isArray(rawMatch)
    ? (rawMatch as unknown as RegExpMatchArray)
    : null;

  const result = await handler({
    message,
    match,
    userId: access.userId ?? undefined,
    args: (body.args as Record<string, unknown>) ?? {},
  });
  return json(result, result.ok ? 200 : 422);
}
