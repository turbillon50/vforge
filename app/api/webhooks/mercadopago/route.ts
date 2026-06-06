export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mercadopago — recibe notificaciones de pago (IPN/Webhook).
 * MVP: registra el evento y responde 200 para que MP no reintente. La lógica
 * de conciliación (marcar orden pagada, registrar comisión) se engancha aquí.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[mp webhook]", JSON.stringify(body).slice(0, 500));
    // TODO: si body.type === 'payment', consultar /v1/payments/{id} con el
    // access_token del vendedor y conciliar la orden + comisión de plataforma.
  } catch (e) {
    console.error("[mp webhook] error:", e);
  }
  return new Response("ok", { status: 200 });
}

export async function GET() {
  return new Response("ok", { status: 200 });
}
