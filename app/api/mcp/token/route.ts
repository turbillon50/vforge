import { auth } from "@clerk/nextjs/server";
import { createMcpToken } from "@/lib/mcp/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mcp/token — genera un token MCP para el usuario logueado.
// Se muestra UNA sola vez. Auth Clerk (cualquier usuario).
export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const token = await createMcpToken(userId);
  return Response.json({
    ok: true,
    token,
    url: "https://vforge.site/api/mcp",
    config: { name: "VForge", url: "https://vforge.site/api/mcp", auth: "Bearer", token },
  });
}
