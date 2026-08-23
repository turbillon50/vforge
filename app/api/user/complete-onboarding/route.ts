/**
 * POST /api/user/complete-onboarding — marca el onboarding del usuario actual
 * como completado en Clerk (`publicMetadata.onboardingComplete = true`).
 *
 * El middleware usa esta marca para decidir entre /onboarding y /workspace.
 * Guarda además el nombre y el conteo de servicios conectados para personalizar
 * el saludo de V en el workspace. Idempotente: llamarlo dos veces no rompe nada.
 */
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    services?: number;
  };

  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const metadata = { ...(user.publicMetadata ?? {}) } as Record<string, unknown>;
    const owner = isOwnerUser(user);
    if (!owner && metadata.role === "owner") metadata.role = "user";
    await cc.users.updateUser(userId, {
      publicMetadata: {
        ...metadata,
        onboardingComplete: true,
        onboardingName: body.name?.trim() || undefined,
        onboardingRole: owner ? "owner" : "client",
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
