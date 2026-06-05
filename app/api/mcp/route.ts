import { resolveMcpToken } from "@/lib/mcp/tokens";
import { MCP_TOOLS, runMcpTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/** VForge MCP Server — Streamable HTTP, auth Bearer por usuario. */
export async function POST(req: Request) {
  // Auth: Authorization: Bearer vfmcp_...
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  const userId = m ? await resolveMcpToken(m[1].trim()) : null;
  if (!userId) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "unauthorized: token MCP inválido" } }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" },
    });
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
      return rpc(id, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await runMcpTool(name, args, userId);
        return rpc(id, result);
      } catch (e) {
        return rpc(id, { content: [{ type: "text", text: "Error: " + String(e).slice(0, 300) }], isError: true });
      }
    }
    default:
      return rpc(id, undefined, { code: -32601, message: `method no soportado: ${method}` });
  }
}

export async function GET() {
  // Algunos clientes hacen GET para SSE; respondemos info simple.
  return new Response(JSON.stringify({ name: "VForge MCP", transport: "streamable-http", auth: "Bearer" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
