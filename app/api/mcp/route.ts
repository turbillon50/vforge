import { handleMcp } from "@/lib/mcp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** VForge MCP Server — Streamable HTTP. Auth Bearer opcional: sin token operas
 *  como público (tools públicas); con token admin|client desbloqueas datos. */
export async function POST(req: Request) {
  return handleMcp(req, false);
}

export async function GET() {
  // Descubrimiento: algunos clientes (Claude Desktop) hacen GET antes del
  // handshake JSON-RPC y rechazan la URL si no reconocen el servidor. Reflejamos
  // el mismo serverInfo/capabilities que devuelve `initialize` por POST.
  return new Response(
    JSON.stringify({
      name: "VForge",
      version: "1.0.0",
      protocol: "mcp",
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      transport: "streamable-http",
      auth: "Bearer (opcional para tools públicas)",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}
