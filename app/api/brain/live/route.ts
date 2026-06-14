import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRAIN_URL = process.env.HETZNER_URL ?? "http://178.105.135.26";
const BRAIN_SECRET = process.env.BRAIN_SECRET ?? "superclaude2025";

/**
 * GET /api/brain/live
 *
 * Proxies live tenant stats from the Hetzner brain-relay so the
 * BrainLivePanel can poll without exposing the brain secret client-side.
 */
export async function GET() {
  try {
    const r = await fetch(`${BRAIN_URL}/brain/tenant/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: BRAIN_SECRET, tenant_id: "vulcano" }),
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: `brain responded ${r.status}`, ts: Date.now() },
        { status: 502 },
      );
    }

    const data = await r.json();
    return NextResponse.json({ ok: true, data, ts: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, ts: Date.now() },
      { status: 502 },
    );
  }
}
