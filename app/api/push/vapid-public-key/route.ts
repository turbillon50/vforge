import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = vapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: "vapid_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { publicKey: key },
    { headers: { "Cache-Control": "no-store" } },
  );
}
