/**
 * POST /api/user/complete-onboarding — marca el onboarding del usuario actual
 * como completado en Clerk (`publicMetadata.onboardingComplete = true`).
 *
 * El middleware usa esta marca para decidir entre /onboarding y /workspace.
 * Guarda además el nombre y el conteo de servicios conectados para personalizar
 * el saludo de V en el workspace. Idempotente: llamarlo dos veces no rompe nada.
 */
import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    services?: number;
  };

  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    await cc.users.updateUser(userId, {
      publicMetadata: {
        ...(user.publicMetadata ?? {}),
        onboardingComplete: true,
        onboardingName: body.name?.trim() || undefined,
        onboardingRole: body.role || undefined,
        servicesConnected:
          typeof body.services === "number" ? body.services : undefined,
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
