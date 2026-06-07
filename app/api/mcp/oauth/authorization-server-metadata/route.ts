import { MCP_ORIGIN, OAUTH_SCOPES, CORS_HEADERS, corsPreflight } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 * Servido en /.well-known/oauth-authorization-server (vía rewrite). Publica los
 * endpoints del flujo: authorize, token, register (DCR) y PKCE S256.
 */
export function GET() {
  return new Response(
    JSON.stringify({
      issuer: MCP_ORIGIN,
      authorization_endpoint: `${MCP_ORIGIN}/api/mcp/oauth/authorize`,
      token_endpoint: `${MCP_ORIGIN}/api/mcp/oauth/token`,
      registration_endpoint: `${MCP_ORIGIN}/api/mcp/oauth/register`,
      scopes_supported: [...OAUTH_SCOPES],
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      code_challenge_methods_supported: ["S256"],
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
  );
}

export function OPTIONS() {
  return corsPreflight();
}
