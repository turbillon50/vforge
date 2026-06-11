export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/forge/token-health/route.ts
// Proxy owner-only que lee el estado del token OAuth de Claude desde el
// brain-relay de Hetzner. El relay sirve /home/brain-files/token-health.json
// en GET /brain/file/brain-files/token-health.json (sin secret de lectura).
// Devuelve { ok, hours_left, status, checked_at }. CERO MOCK.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY =
  process.env.HETZNER_URL?.replace(/\/$/, "") ||
  process.env.RELAY_BASE_URL?.replace(/\/$/, "") ||
  "http://178.105.135.26";

const HEALTH_URL = `${RELAY}/brain/file/brain-files/token-health.json`;

export async function GET() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(HEALTH_URL, { cache: "no-store", signal: controller.signal });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `relay ${r.status}` });
    }
    const raw = (await r.json()) as Record<string, unknown>;
    const hours_left = typeof raw.hours_left === "number" ? raw.hours_left : null;
    const status = typeof raw.status === "string" ? raw.status : null;
    const checked_at = typeof raw.checked_at === "string" ? raw.checked_at : null;
    return NextResponse.json({ ok: true, hours_left, status, checked_at });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "relay unreachable";
    return NextResponse.json({ ok: false, error: message });
  } finally {
    clearTimeout(timer);
  }
}
