import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { ensurePushTable } from "@/lib/push/send";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const sub = await req.json().catch(() => null) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "suscripción inválida" }, { status: 400 });
  }
  const url = process.env.DATABASE_URL;
  if (!url) return Response.json({ error: "db" }, { status: 500 });
  await ensurePushTable();
  const sql = neon(url);
  await sql`
    INSERT INTO push_subscriptions (id, clerk_user_id, endpoint, p256dh, auth)
    VALUES (${"sub_" + randomBytes(8).toString("hex")}, ${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET clerk_user_id = EXCLUDED.clerk_user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;
  return Response.json({ ok: true });
}
