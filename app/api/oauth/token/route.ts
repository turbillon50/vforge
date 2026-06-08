import { getClient } from "@/lib/mcp/oauth";
import {
  verifyConnectorSecret,
  redeemConnectorCode,
} from "@/lib/oauth/connector";
import { createOAuthAccessToken, oauthScopeLabel } from "@/lib/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TTL del access_token vfmcp_ emitido por OAuth (30 días). */
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/** Lee credenciales de cliente: body (post) o cabecera Basic. */
function clientCreds(
  req: Request,
  body: URLSearchParams,
): { id: string; secret: string | null } {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Basic\s+(.+)$/i);
  if (m) {
    try {
      const [id, secret] = Buffer.from(m[1], "base64").toString("utf8").split(":");
      return { id: id ?? "", secret: secret ?? null };
    } catch {
      /* ignora */
    }
  }
  return { id: body.get("client_id") ?? "", secret: body.get("client_secret") };
}

async function parseBody(req: Request): Promise<URLSearchParams> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(j)) if (v != null) sp.set(k, String(v));
    return sp;
  }
  const text = await req.text();
  return new URLSearchParams(text);
}

/**
 * POST /api/oauth/token
 *
 * Canjea un authorization_code por un access_token (= token vfmcp_ real que
 * entiende /api/mcp). Recibe: code, client_id, client_secret, grant_type.
 * Devuelve: { access_token, token_type: "Bearer", scope, expires_in }.
 */
export async function POST(req: Request) {
  const body = await parseBody(req);
  const grant = body.get("grant_type") ?? "";
  const creds = clientCreds(req, body);

  if (grant !== "authorization_code") {
    return json(
      {
        error: "unsupported_grant_type",
        error_description: `grant_type '${grant}' no soportado`,
      },
      400,
    );
  }

  if (!creds.id)
    return json({ error: "invalid_client", error_description: "falta client_id" }, 401);
  const client = await getClient(creds.id);
  if (!client)
    return json({ error: "invalid_client", error_description: "client_id desconocido" }, 401);
  if (!(await verifyConnectorSecret(creds.id, creds.secret)))
    return json({ error: "invalid_client", error_description: "client_secret inválido" }, 401);

  const code = body.get("code") ?? "";
  if (!code)
    return json({ error: "invalid_request", error_description: "falta code" }, 400);

  const redeemed = await redeemConnectorCode({ code, clientId: creds.id });
  if ("error" in redeemed) {
    return json({ error: "invalid_grant", error_description: redeemed.error }, 400);
  }

  const access = await createOAuthAccessToken(redeemed.userId, ACCESS_TOKEN_TTL_SECONDS);
  return json({
    access_token: access.token,
    token_type: "Bearer",
    expires_in: access.expiresIn,
    scope: oauthScopeLabel(access.scope),
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
