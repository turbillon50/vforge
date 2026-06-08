import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";
import { getClient } from "@/lib/mcp/oauth";
import { rotateClientSecret, deleteClient } from "@/lib/oauth/connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gestión de UN cliente OAuth — SÓLO owner (Bearer VFORGE_OPERATOR_TOKEN).
 *
 *   GET    /api/oauth/clients/:clientId  → detalle (sin secret).
 *   POST   /api/oauth/clients/:clientId  → ROTA el secret: genera uno nuevo y lo
 *                                          devuelve en claro (una sola vez).
 *   DELETE /api/oauth/clients/:clientId  → borra el cliente y sus codes.
 */

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);
  const { clientId } = await params;
  const c = await getClient(clientId);
  if (!c) return json({ error: "not_found", error_description: "client_id desconocido" }, 404);
  return json({
    client_id: c.client_id,
    client_name: c.client_name,
    redirect_uris: c.redirect_uris,
    token_endpoint_auth_method: c.token_endpoint_auth_method,
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);
  const { clientId } = await params;
  const res = await rotateClientSecret(clientId);
  if (!res) return json({ error: "not_found", error_description: "client_id desconocido" }, 404);
  return json({ rotated: true, client_id: res.client_id, client_secret: res.client_secret });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);
  const { clientId } = await params;
  const ok = await deleteClient(clientId);
  if (!ok) return json({ error: "not_found", error_description: "client_id desconocido" }, 404);
  return json({ deleted: true, client_id: clientId });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
