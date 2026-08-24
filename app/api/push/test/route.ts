import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Solo owners: envía un push de prueba a la sesión actual. */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress;
  if (!isOwnerEmail(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const sent = await sendPushToUser(userId, {
      title: "VForge",
      body: "Notificaciones activas. Te avisaremos cuando un cliente escriba.",
      url: "/app",
    });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[push] test failed", e);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}
