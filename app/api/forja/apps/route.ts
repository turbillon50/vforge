import { auth } from "@clerk/nextjs/server";
import { listUserApps } from "@/lib/connect/user-apps";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ apps: [] }, { status: 401 });
  const apps = await listUserApps(userId);
  return Response.json({ apps }, { headers: { "Cache-Control": "no-store" } });
}
