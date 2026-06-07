import { handleMcp } from "@/lib/mcp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** VForge MCP Server — Streamable HTTP. Auth Bearer opcional: sin token operas
 *  como público (tools públicas); con token admin|client desbloqueas datos. */
export async function POST(req: Request) {
  return handleMcp(req, false);
}

export async function GET() {
  // Algunos clientes hacen GET para SSE; respondemos info simple.
  return new Response(
    JSON.stringify({
      name: "VForge MCP",
      transport: "streamable-http",
      auth: "Bearer (opcional para tools públicas)",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
