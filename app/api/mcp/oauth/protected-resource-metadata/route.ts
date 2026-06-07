import { MCP_ORIGIN, RESOURCE_URL, OAUTH_SCOPES, CORS_HEADERS, corsPreflight } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Servido en /.well-known/oauth-protected-resource (vía rewrite). Le dice al
 * cliente MCP (Claude) cuál es el authorization server que protege /api/mcp.
 */
export function GET() {
  return new Response(
    JSON.stringify({
      resource: RESOURCE_URL,
      authorization_servers: [MCP_ORIGIN],
      scopes_supported: [...OAUTH_SCOPES],
      bearer_methods_supported: ["header"],
      resource_name: "VForge MCP",
      resource_documentation: RESOURCE_URL,
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
  );
}

export function OPTIONS() {
  return corsPreflight();
}
