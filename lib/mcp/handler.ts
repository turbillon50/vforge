import { resolveMcpToken } from "@/lib/mcp/tokens";
import { mcpToolsForScope, runMcpTool } from "@/lib/mcp/tools";
import { ANON_PRINCIPAL, type McpPrincipal, canCallTool, toolKind } from "@/lib/mcp/rbac";

const PROTOCOL_VERSION = "2024-11-05";

/** URL de la Protected Resource Metadata (RFC 9728). El WWW-Authenticate de los
 *  401 apunta aquí para que Claude descubra el authorization server y arranque
 *  el flujo OAuth (Ajustes → Conectores → Add custom connector). */
const RESOURCE_METADATA_URL =
  (
    process.env.MCP_PUBLIC_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://vforge.site"
  ).replace(/\/$/, "") + "/.well-known/oauth-protected-resource";

const WWW_AUTH = `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`;
const WWW_AUTH_INVALID = `Bearer error="invalid_token", resource_metadata="${RESOURCE_METADATA_URL}"`;

function rpc(id: unknown, result?: unknown, error?: { code: number; message: string }) {
  const body: Record<string, unknown> = { jsonrpc: "2.0", id: id ?? null };
  if (error) body.error = error;
  else body.result = result;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized(id: unknown, message: string, wwwAuth: string = WWW_AUTH) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code: -32001, message } }),
    { status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": wwwAuth } },
  );
}

type AuthResult =
  | { kind: "ok"; principal: McpPrincipal }
  | { kind: "missing" }
  | { kind: "invalid" };

/**
 * Resuelve el principal de la request a partir del Bearer.
 *  - sin cabecera Bearer    => "missing" (401 + WWW-Authenticate → discovery OAuth)
 *  - token presente inválido => "invalid" (401 + WWW-Authenticate)
 *  - token válido            => principal (manual vfmcp_* u OAuth, mismo formato)
 */
async function principalFromRequest(req: Request): Promise<AuthResult> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return { kind: "missing" };
  const principal = await resolveMcpToken(m[1].trim());
  return principal ? { kind: "ok", principal } : { kind: "invalid" };
}

/**
 * Núcleo compartido del handler MCP (JSON-RPC sobre HTTP). `forcePublic` lo usa
 * /api/mcp/public para degradar siempre a scope público sin importar el token.
 *
 * En /api/mcp (forcePublic=false) la AUSENCIA o invalidez del token devuelve
 * 401 con WWW-Authenticate apuntando al resource metadata: así Claude descubre
 * el flujo OAuth. Los Bearer manuales (vfmcp_*) siguen funcionando igual. La
 * superficie pública sin auth vive en /api/mcp/public.
 */
export async function handleMcp(req: Request, forcePublic = false): Promise<Response> {
  // El endpoint /api/mcp/public nunca valida token: siempre scope público.
  let principal: McpPrincipal;
  if (forcePublic) {
    principal = ANON_PRINCIPAL;
  } else {
    const resolved = await principalFromRequest(req);
    if (resolved.kind === "missing") {
      return unauthorized(
        null,
        "unauthorized: autenticación requerida. Conecta vía OAuth (Add custom connector) " +
          "o presenta un Bearer vfmcp_ válido. Sin auth, usa /api/mcp/public.",
        WWW_AUTH,
      );
    }
    if (resolved.kind === "invalid") {
      return unauthorized(null, "unauthorized: token MCP inválido o expirado.", WWW_AUTH_INVALID);
    }
    principal = resolved.principal;
  }

  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return rpc(null, undefined, { code: -32700, message: "parse error" });
  }

  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return rpc(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "VForge", version: "1.0.0" },
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return new Response(null, { status: 202 });
    case "ping":
      return rpc(id, {});
    case "tools/list":
      // Sólo anunciamos las tools que el principal realmente puede llamar.
      return rpc(id, { tools: mcpToolsForScope(principal) });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      // GATE RBAC: las tools de datos exigen admin|client. public/anon => 401.
      if (!canCallTool(principal, name)) {
        return unauthorized(
          id,
          `unauthorized: la tool "${name}" (${toolKind(name)}) requiere un token MCP válido (admin o client). ` +
            `Sin token sólo están disponibles las tools públicas.`,
        );
      }
      try {
        const result = await runMcpTool(name, args, principal);
        return rpc(id, result);
      } catch (e) {
        return rpc(id, { content: [{ type: "text", text: "Error: " + String(e).slice(0, 300) }], isError: true });
      }
    }
    default:
      return rpc(id, undefined, { code: -32601, message: `method no soportado: ${method}` });
  }
}
