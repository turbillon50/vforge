import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";
import { listClients, registerNamedClient } from "@/lib/oauth/connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gestión de clientes OAuth — SÓLO owner (Bearer VFORGE_OPERATOR_TOKEN).
 *
 *   GET  /api/oauth/clients   → lista los clientes (sin el secret).
 *   POST /api/oauth/clients   → crea/registra uno { name, client_id, redirect_uris[] }
 *                               y devuelve el client_secret EN CLARO una vez.
 *
 * Para rotar el secret o borrar un cliente: /api/oauth/clients/[clientId].
 */
export async function GET(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);
  const clients = await listClients();
  return json({ clients });
}

export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  let body: {
    client_id?: string;
    name?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request", error_description: "body JSON inválido" }, 400);
  }

  if (!body.client_id)
    return json({ error: "invalid_request", error_description: "falta client_id" }, 400);
  if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0)
    return json({ error: "invalid_request", error_description: "falta redirect_uris" }, 400);

  const res = await registerNamedClient({
    client_id: body.client_id,
    client_name: body.name ?? null,
    client_secret: body.client_secret,
    redirect_uris: body.redirect_uris,
  });
  return json(res, 201);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
