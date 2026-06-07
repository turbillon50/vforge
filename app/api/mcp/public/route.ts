import { handleMcp } from "@/lib/mcp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/mcp/public — endpoint MCP de marketing. SIEMPRE opera en scope público
 * sin importar qué token (o ninguno) se presente: sólo expone getting_started,
 * vforge_method y help. Cualquier tool de datos responde 401. Es la superficie
 * segura para anunciar VForge sin riesgo de filtrar datos privados.
 */
export async function POST(req: Request) {
  return handleMcp(req, true);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      name: "VForge MCP (public)",
      transport: "streamable-http",
      auth: "none",
      tools: ["getting_started", "vforge_method", "help"],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
