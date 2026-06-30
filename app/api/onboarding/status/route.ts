import { auth } from "@clerk/nextjs/server";
import { listUserConnections } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/onboarding/status — qué servicios conectó este usuario (sin secretos). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ connected: [] }, { status: 401 });
  const connected = await listUserConnections(userId);
  return Response.json({ connected }, { headers: { "Cache-Control": "no-store" } });
}
