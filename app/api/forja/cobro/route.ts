import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/forja/cobro  { name, amount (MXN), currency? }
 * MOTOR DE COBROS: con el Stripe Connect del usuario crea producto + precio +
 * payment link EN SU CUENTA. Aplica la comisión de plataforma (1.5% en Free).
 * Devuelve { ok, url }.
 */
const FEE_PERCENT_FREE = 0.015;

async function stripe(path: string, key: string, account: string, params: Record<string, string | number>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  return fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Account": account,
    },
    body,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = (String(b.name || "").trim()).slice(0, 80);
  const amountMxn = Math.round(Number(b.amount || 0) * 100); // a centavos
  const currency = (String(b.currency || "mxn")).toLowerCase();
  if (!name) return Response.json({ ok: false, error: "falta_nombre" }, { status: 400 });
  if (!amountMxn || amountMxn < 1000) return Response.json({ ok: false, error: "monto_minimo" }, { status: 400 });

  const account = await getUserSecret(userId, "STRIPE_CONNECTED_ACCOUNT");
  if (!account) return Response.json({ ok: false, error: "connect_stripe" }, { status: 400 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ ok: false, error: "no_platform_key" }, { status: 500 });

  try {
    const pRes = await stripe("products", key, account, { name });
    const product = await pRes.json();
    if (!pRes.ok) return Response.json({ ok: false, error: "product", detail: product }, { status: 400 });

    const prRes = await stripe("prices", key, account, { product: product.id, unit_amount: amountMxn, currency });
    const price = await prRes.json();
    if (!prRes.ok) return Response.json({ ok: false, error: "price", detail: price }, { status: 400 });

    const fee = Math.max(0, Math.round(amountMxn * FEE_PERCENT_FREE));
    const plRes = await stripe("payment_links", key, account, {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": 1,
      application_fee_amount: fee,
    });
    const link = await plRes.json();
    if (!plRes.ok) return Response.json({ ok: false, error: "payment_link", detail: link }, { status: 400 });

    return Response.json({ ok: true, name, amount: amountMxn / 100, currency, url: link.url, fee: fee / 100 });
  } catch (e) {
    return Response.json({ ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
