import { registerClient, jsonCors, corsPreflight, type RegisterClientInput } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 7591 — Dynamic Client Registration. Acepta cualquier cliente MCP que se
 * registre (Claude lo hace automáticamente al añadir el conector). Devuelve un
 * client_id (cliente público PKCE por defecto, sin secret).
 */
export async function POST(req: Request) {
  let body: RegisterClientInput;
  try {
    body = (await req.json()) as RegisterClientInput;
  } catch {
    return jsonCors({ error: "invalid_client_metadata", error_description: "body JSON inválido" }, 400);
  }

  const { client, client_secret, issued_at } = await registerClient(body);

  // Respuesta RFC 7591: refleja la metadata registrada + client_id emitido.
  const res: Record<string, unknown> = {
    client_id: client.client_id,
    client_id_issued_at: issued_at,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    grant_types: client.grant_types,
    response_types: client.response_types,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    scope: client.scope ?? undefined,
  };
  if (client_secret) {
    res.client_secret = client_secret;
    res.client_secret_expires_at = 0; // no expira
  }
  return jsonCors(res, 201);
}

export function OPTIONS() {
  return corsPreflight();
}
