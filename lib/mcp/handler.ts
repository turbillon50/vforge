import { resolveMcpToken } from "@/lib/mcp/tokens";
import { mcpToolsForScope, runMcpTool } from "@/lib/mcp/tools";
import { ANON_PRINCIPAL, type McpPrincipal, canCallTool, toolKind } from "@/lib/mcp/rbac";

const PROTOCOL_VERSION = "2024-11-05";

function rpc(id: unknown, result?: unknown, error?: { code: number; message: string }) {
  const body: Record<string, unknown> = { jsonrpc: "2.0", id: id ?? null };
  if (error) body.error = error;
  else body.result = result;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized(id: unknown, message: string) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code: -32001, message } }),
    { status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" } },
  );
}

/**
 * Resuelve el principal de la request. Sin token => principal público anónimo
 * (puede usar tools públicas, 401 en datos). Token presentado pero inválido
 * => null (401 duro).
 */
async function principalFromRequest(req: Request): Promise<McpPrincipal | null> {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return ANON_PRINCIPAL; // sin token = público (no es 401: las públicas responden)
  return resolveMcpToken(m[1].trim()); // null si el token es inválido
}

/**
 * Núcleo compartido del handler MCP (JSON-RPC sobre HTTP). `forcePublic` lo usa
 * /api/mcp/public para degradar siempre a scope público sin importar el token.
 */
export async function handleMcp(req: Request, forcePublic = false): Promise<Response> {
  // El endpoint /api/mcp/public nunca valida token: siempre scope público.
  let principal: McpPrincipal;
  if (forcePublic) {
    principal = ANON_PRINCIPAL;
  } else {
    const resolved = await principalFromRequest(req);
    if (!resolved) {
      // Token presentado pero inválido/inexistente => 401 duro.
      return unauthorized(null, "unauthorized: token MCP inválido");
    }
    principal = resolved;
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
