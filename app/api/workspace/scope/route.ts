/**
 * GET/POST /api/workspace/scope — alcance de la app del usuario.
 * Solo requiere sesión Clerk (NO owner-only).
 */
import { auth } from "@clerk/nextjs/server";
import { getScope, saveScope, type WorkspaceScope } from "@/lib/workspace/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return json({ error: "unauthorized" }, 401);
  try {
    const row = await getScope(userId);
    return json({ scope: row?.scope ?? null, status: row?.status ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: { scope?: WorkspaceScope };
  try {
    body = (await req.json()) as { scope?: WorkspaceScope };
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const scope = body.scope;
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) {
    return json({ error: "scope (objeto) requerido" }, 400);
  }
  try {
    await saveScope(userId, scope);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
}
