import { auth } from "@clerk/nextjs/server";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/push/send — envía una push. body: { title, body, url?, toUserId? }.
 * Sin toUserId, se envía al propio usuario (prueba). Owner puede mandar a otros.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({})) as { title?: string; body?: string; url?: string; toUserId?: string };
  const target = b.toUserId || userId;
  if (!b.title || !b.body) return Response.json({ error: "title y body requeridos" }, { status: 400 });
  try {
    const sent = await sendPushToUser(target, { title: b.title, body: b.body, url: b.url });
    return Response.json({ ok: true, sent });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}
