import {
  getClient,
  verifyClientSecret,
  redeemAuthCode,
  issueRefreshToken,
  rotateRefreshToken,
  jsonCors,
  corsPreflight,
  ACCESS_TOKEN_TTL_SECONDS,
} from "@/lib/mcp/oauth";
import { createOAuthAccessToken, oauthScopeLabel } from "@/lib/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lee credenciales de cliente: body (post) o cabecera Basic. */
function clientCreds(req: Request, body: URLSearchParams): { id: string; secret: string | null } {
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
 * RFC 6749 token endpoint. Soporta authorization_code (con PKCE) y
 * refresh_token. Emite un access_token vfmcp_ (con caducidad) + refresh_token.
 */
export async function POST(req: Request) {
  const body = await parseBody(req);
  const grant = body.get("grant_type") ?? "";
  const creds = clientCreds(req, body);

  if (!creds.id) return jsonCors({ error: "invalid_client", error_description: "falta client_id" }, 401);
  const client = await getClient(creds.id);
  if (!client) return jsonCors({ error: "invalid_client", error_description: "client_id desconocido" }, 401);
  if (!(await verifyClientSecret(creds.id, creds.secret)))
    return jsonCors({ error: "invalid_client", error_description: "client_secret inválido" }, 401);

  if (grant === "authorization_code") {
    const code = body.get("code") ?? "";
    const redirectUri = body.get("redirect_uri") ?? "";
    const codeVerifier = body.get("code_verifier") ?? "";
    if (!code) return jsonCors({ error: "invalid_request", error_description: "falta code" }, 400);

    const redeemed = await redeemAuthCode({ code, clientId: creds.id, redirectUri, codeVerifier });
    if ("error" in redeemed) {
      const isClientErr = redeemed.error.startsWith("invalid_request");
      return jsonCors(
        { error: isClientErr ? "invalid_request" : "invalid_grant", error_description: redeemed.error },
        400,
      );
    }

    const access = await createOAuthAccessToken(redeemed.clerk_user_id, ACCESS_TOKEN_TTL_SECONDS);
    const refresh = await issueRefreshToken({
      clerkUserId: redeemed.clerk_user_id,
      clientId: creds.id,
      scope: oauthScopeLabel(access.scope),
    });
    return jsonCors({
      access_token: access.token,
      token_type: "Bearer",
      expires_in: access.expiresIn,
      refresh_token: refresh,
      scope: oauthScopeLabel(access.scope),
    });
  }

  if (grant === "refresh_token") {
    const refreshToken = body.get("refresh_token") ?? "";
    if (!refreshToken) return jsonCors({ error: "invalid_request", error_description: "falta refresh_token" }, 400);

    const rec = await rotateRefreshToken(refreshToken, creds.id);
    if ("error" in rec) return jsonCors({ error: "invalid_grant", error_description: rec.error }, 400);

    const access = await createOAuthAccessToken(rec.clerk_user_id, ACCESS_TOKEN_TTL_SECONDS);
    const newRefresh = await issueRefreshToken({
      clerkUserId: rec.clerk_user_id,
      clientId: creds.id,
      scope: oauthScopeLabel(access.scope),
    });
    return jsonCors({
      access_token: access.token,
      token_type: "Bearer",
      expires_in: access.expiresIn,
      refresh_token: newRefresh,
      scope: oauthScopeLabel(access.scope),
    });
  }

  return jsonCors({ error: "unsupported_grant_type", error_description: `grant_type '${grant}' no soportado` }, 400);
}

export function OPTIONS() {
  return corsPreflight();
}
