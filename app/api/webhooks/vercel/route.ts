import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/vercel — eventos de la integración (deployment.*,
 * project.*, domain.*). Verifica x-vercel-signature (HMAC-SHA1 del body
 * con el client secret) antes de procesar.
 */
export async function POST(req: Request) {
  const secret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("x-vercel-signature") || "";

  if (secret && sig) {
    const expected = createHmac("sha1", secret).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return new Response(JSON.stringify({ error: "firma inválida" }), { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(raw) as { type?: string; payload?: { deployment?: { url?: string } } };
    console.log(`[vercel webhook] ${payload.type ?? "?"} ${payload.payload?.deployment?.url ?? ""}`);
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
