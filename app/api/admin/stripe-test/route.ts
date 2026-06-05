import { ensurePrices } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico owner-only (middleware protege /api/admin). Temporal.
export async function GET() {
  try {
    const prices = await ensurePrices();
    return Response.json({ ok: true, prices });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
