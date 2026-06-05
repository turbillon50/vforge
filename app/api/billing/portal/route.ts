import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/billing/plan";
import { stripeFetch } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/portal — redirige (302) al Billing Portal de Stripe
 * del usuario autenticado.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sub = await getSubscription(userId);
  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/pricing", req.url), 302);
  }

  try {
    const session = await stripeFetch<{ url: string }>(
      "/v1/billing_portal/sessions",
      {
        customer: sub.stripe_customer_id,
        return_url: "https://vforge.site/app/settings",
      },
    );
    return NextResponse.redirect(session.url, 302);
  } catch (e) {
    console.error("[billing/portal]", e);
    return NextResponse.json(
      { error: "No pude abrir el portal de facturación" },
      { status: 500 },
    );
  }
}
