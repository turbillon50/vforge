/**
 * Planes de VForge + tabla vforge_subscriptions (creada on-demand).
 * Los límites aquí son DATOS; la aplicación de límites llega después.
 */
import { sql, queryOne } from "@/lib/db/client";

export type Plan = "free" | "studio" | "forge" | "payg";

export interface PlanLimits {
  workspaces: number; // -1 = ilimitado
  assistant_msgs_per_day: number; // -1 = ilimitado
  builds: boolean;
  priority?: boolean;
  metered?: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { workspaces: 1, assistant_msgs_per_day: 20, builds: false },
  studio: { workspaces: 5, assistant_msgs_per_day: 200, builds: true },
  forge: { workspaces: -1, assistant_msgs_per_day: -1, builds: true, priority: true },
  payg: { workspaces: 5, assistant_msgs_per_day: 200, builds: true, metered: true },
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

let _tableReady = false;
async function ensureTable(): Promise<void> {
  if (_tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_subscriptions (
      clerk_user_id text PRIMARY KEY,
      plan text NOT NULL DEFAULT 'free',
      status text,
      stripe_customer_id text,
      stripe_subscription_id text,
      current_period_end timestamptz,
      updated_at timestamptz DEFAULT now()
    )
  `;
  _tableReady = true;
}

export interface SubscriptionRow {
  clerk_user_id: string;
  plan: Plan;
  status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export async function getSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  await ensureTable();
  return queryOne<SubscriptionRow>(
    "SELECT clerk_user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end FROM vforge_subscriptions WHERE clerk_user_id = $1",
    [userId],
  );
}

/** Devuelve 'free' si no hay fila o el status no es activo. */
export async function getUserPlan(userId: string): Promise<Plan> {
  const row = await getSubscription(userId);
  if (!row || !row.status || !ACTIVE_STATUSES.has(row.status)) return "free";
  return (["studio", "forge", "payg"] as Plan[]).includes(row.plan)
    ? row.plan
    : "free";
}

export async function setSubscription(input: {
  clerkUserId: string;
  plan: Plan;
  status: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  await ensureTable();
  await sql`
    INSERT INTO vforge_subscriptions
      (clerk_user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
    VALUES
      (${input.clerkUserId}, ${input.plan}, ${input.status},
       ${input.stripeCustomerId ?? null}, ${input.stripeSubscriptionId ?? null},
       ${input.currentPeriodEnd ?? null}, now())
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, vforge_subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, vforge_subscriptions.stripe_subscription_id),
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now()
  `;
}

/** Para webhooks: localizar al usuario por su customer de Stripe. */
export async function findByCustomerId(
  customerId: string,
): Promise<SubscriptionRow | null> {
  await ensureTable();
  return queryOne<SubscriptionRow>(
    "SELECT clerk_user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end FROM vforge_subscriptions WHERE stripe_customer_id = $1",
    [customerId],
  );
}
