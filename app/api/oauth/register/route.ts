import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";
import { registerNamedClient } from "@/lib/oauth/connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registra un nuevo cliente OAuth. SÓLO owner (Bearer VFORGE_OPERATOR_TOKEN).
 *
 * Acepta:
 *   - GET  /api/oauth/register?client_id=...&name=...&redirect_uris=a,b
 *   - POST /api/oauth/register  { name, client_id, redirect_uris[] }
 *
 * Devuelve el client_id y el client_secret EN CLARO (sólo se guarda el hash).
 */
export async function GET(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id") ?? "";
  const name = url.searchParams.get("name") ?? undefined;
  const raw = url.searchParams.getAll("redirect_uris");
  const redirect_uris = (
    raw.length ? raw : (url.searchParams.get("redirect_uris") ?? "").split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);

  return handle({ client_id, name, redirect_uris });
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

  return handle({
    client_id: body.client_id ?? "",
    name: body.name,
    client_secret: body.client_secret,
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
  });
}

async function handle(input: {
  client_id: string;
  name?: string;
  client_secret?: string;
  redirect_uris: string[];
}): Promise<Response> {
  if (!input.client_id)
    return json({ error: "invalid_request", error_description: "falta client_id" }, 400);
  if (!input.redirect_uris.length)
    return json({ error: "invalid_request", error_description: "falta redirect_uris" }, 400);

  const res = await registerNamedClient({
    client_id: input.client_id,
    client_name: input.name ?? null,
    client_secret: input.client_secret,
    redirect_uris: input.redirect_uris,
  });

  return json(
    {
      client_id: res.client_id,
      client_secret: res.client_secret,
      client_name: res.client_name,
      redirect_uris: res.redirect_uris,
    },
    201,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
