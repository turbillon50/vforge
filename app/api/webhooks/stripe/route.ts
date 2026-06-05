import { createHmac, timingSafeEqual } from "node:crypto";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { setSubscription, findByCustomerId, type Plan } from "@/lib/billing/plan";
import { stripeFetch, planFromLookupKey } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOLERANCE_S = 5 * 60;

function verifySignature(raw: string, header: string, secret: string): boolean {
  const parts = new Map(
    header.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1) return false;
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_S) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${t}.${raw}`)
    .digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface SubObject {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  metadata?: { clerk_user_id?: string };
  items?: { data?: Array<{ price?: { lookup_key?: string | null } }> };
}

function periodEnd(epoch?: number): Date | null {
  return epoch ? new Date(epoch * 1000) : null;
}

/**
 * POST /api/webhooks/stripe — eventos de suscripción.
 * Verifica firma (t=...,v1=...) y responde 200 rápido.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  const secret =
    process.env.STRIPE_WEBHOOK_SECRET ??
    (await getOperatorSecret("STRIPE_WEBHOOK_SECRET").catch(() => null));

  if (secret && !verifySignature(raw, sig, secret)) {
    return Response.json({ error: "firma inválida" }, { status: 401 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }

  try {
    const type = event.type ?? "";
    const obj = (event.data?.object ?? {}) as Record<string, unknown>;

    if (type === "checkout.session.completed") {
      const userId = (obj.metadata as { clerk_user_id?: string } | undefined)
        ?.clerk_user_id;
      const customer = obj.customer as string | undefined;
      const subscriptionId = obj.subscription as string | undefined;
      if (userId && subscriptionId) {
        const sub = await stripeFetch<SubObject>(
          `/v1/subscriptions/${subscriptionId}`,
          undefined,
          "GET",
        );
        const lookup = sub.items?.data?.[0]?.price?.lookup_key ?? null;
        const plan: Plan = planFromLookupKey(lookup) ?? "studio";
        await setSubscription({
          clerkUserId: userId,
          plan,
          status: sub.status,
          stripeCustomerId: customer ?? sub.customer,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEnd(sub.current_period_end),
        });
      }
    } else if (
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      const sub = obj as unknown as SubObject;
      const userId =
        sub.metadata?.clerk_user_id ??
        (await findByCustomerId(sub.customer))?.clerk_user_id;
      if (userId) {
        const canceled =
          type === "customer.subscription.deleted" || sub.status === "canceled";
        const lookup = sub.items?.data?.[0]?.price?.lookup_key ?? null;
        const plan: Plan = canceled
          ? "free"
          : planFromLookupKey(lookup) ?? "free";
        await setSubscription({
          clerkUserId: userId,
          plan,
          status: canceled ? "canceled" : sub.status,
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEnd(sub.current_period_end),
        });
      }
    }
  } catch (e) {
    // Nunca bloquear el 200: Stripe reintenta solo en errores.
    console.error("[stripe webhook]", e);
  }

  return Response.json({ ok: true });
}
