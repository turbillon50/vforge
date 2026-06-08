import { auth } from "@clerk/nextjs/server";
import { syncClerkOAuthTokens } from "@/lib/connect/clerk-oauth-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/clerk-sync
 *
 * Espeja a user_vault los tokens OAuth que el usuario ya tenga conectados como
 * social connections de Clerk (GitHub/Vercel). Lo llama el onboarding /
 * integraciones tras el login para no volver a pedir tokens que Clerk ya tiene.
 *
 * Devuelve qué proveedores quedaron disponibles:
 *   { ok: true, github: boolean, vercel: boolean }
 */
export async function POST() {
  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a?.userId ?? null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await syncClerkOAuthTokens(userId);
  return Response.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
