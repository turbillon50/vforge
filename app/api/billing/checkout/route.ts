import { auth, currentUser } from "@clerk/nextjs/server";
import { ensurePrices, stripeFetch, type PaidPlan } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://vforge.site";

/**
 * POST /api/billing/checkout — crea una Stripe Checkout Session
 * para el plan solicitado y devuelve { url }.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let plan: PaidPlan;
  try {
    const body = (await req.json()) as { plan?: string };
    if (body.plan !== "studio" && body.plan !== "forge" && body.plan !== "payg") {
      return Response.json({ error: "plan inválido" }, { status: 400 });
    }
    plan = body.plan;
  } catch {
    return Response.json({ error: "body inválido" }, { status: 400 });
  }

  try {
    const prices = await ensurePrices();
    const priceId = prices[plan];

    const params: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      success_url: `${SITE}/app/settings?billing=success`,
      cancel_url: `${SITE}/pricing?billing=cancel`,
      "metadata[clerk_user_id]": userId,
      "subscription_data[metadata][clerk_user_id]": userId,
    };
    // Los precios metered NO admiten quantity.
    if (plan !== "payg") params["line_items[0][quantity]"] = "1";

    const user = await currentUser().catch(() => null);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (email) params.customer_email = email;

    if (process.env.STRIPE_ENABLE_MX === "1") {
      params["payment_method_types[0]"] = "card";
      params["payment_method_types[1]"] = "oxxo";
      params["payment_method_types[2]"] = "customer_balance";
    } else {
      params["payment_method_types[0]"] = "card";
    }

    const session = await stripeFetch<{ url: string }>(
      "/v1/checkout/sessions",
      params,
    );
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[billing/checkout]", e);
    return Response.json(
      { error: "No pude crear la sesión de pago" },
      { status: 500 },
    );
  }
}
