/**
 * Estado seguro de la tela de agentes e integraciones.
 * Sólo expone booleanos de configuración; nunca valores ni identificadores
 * secretos. El middleware ya limita esta ruta a una sesión autenticada y aquí
 * además exigimos owner para no revelar topología a clientes.
 */
import { resolveAccess } from "@/lib/connect/resolve-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await resolveAccess();
  if (!access.userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!access.isOwner) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  return Response.json(
    {
      mcp: {
        configured: true,
        transport: "streamable-http",
        endpoint: "/api/mcp",
      },
      metamcp: {
        configured: Boolean(process.env.OJO_TOKEN),
        endpoint: "server-side",
      },
      composio: {
        configured: Boolean(process.env.COMPOSIO_API_KEY),
        mode: "sessions",
      },
      models: {
        configured: Boolean(
          process.env.HETZNER_SECRET ||
            process.env.OPENROUTER_API_KEY ||
            process.env.GEMINI_API_KEY ||
            process.env.ANTHROPIC_API_KEY,
        ),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
