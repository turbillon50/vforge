import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/github — recibe eventos de la GitHub App
 * (push, installation, deployment, etc.). Verifica la firma HMAC-SHA256
 * con GITHUB_WEBHOOK_SECRET antes de procesar.
 */
export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") || "";
  const event = req.headers.get("x-github-event") || "unknown";

  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return new Response(JSON.stringify({ error: "firma inválida" }), { status: 401 });
    }
  }

  // Por ahora registramos el evento; los handlers (sync de repos, deploys)
  // se enganchan después. Responder 200 rápido para no reintentos.
  try {
    const payload = JSON.parse(raw) as { action?: string; repository?: { full_name?: string } };
    console.log(`[gh webhook] ${event} ${payload.action ?? ""} ${payload.repository?.full_name ?? ""}`);
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ ok: true, event }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
