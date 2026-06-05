import { auth } from "@clerk/nextjs/server";
import { getSubscription, getUserPlan } from "@/lib/billing/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/billing/me — plan vigente del usuario autenticado. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [plan, sub] = await Promise.all([
      getUserPlan(userId),
      getSubscription(userId),
    ]);
    return Response.json({
      plan,
      status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
    });
  } catch (e) {
    console.error("[billing/me]", e);
    return Response.json({ plan: "free", status: null, current_period_end: null });
  }
}
