import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { queryAll } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const PLAN_PRICE_USD: Record<string, number> = {
  studio: 20,
  forge: 100,
  payg: 0,
  free: 0,
};

interface SubRow {
  clerk_user_id: string;
  plan: string;
  status: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  updated_at: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Panel del owner: quién pagó qué. Gating en middleware (/app es ownerOnly).
 */
export default async function AdminBillingPage() {
  let rows: Array<SubRow & { email: string; name: string }> = [];
  let error: string | null = null;

  try {
    const subs = await queryAll<SubRow>(
      `SELECT clerk_user_id, plan, status, stripe_customer_id, current_period_end, updated_at
         FROM vforge_subscriptions
        ORDER BY updated_at DESC NULLS LAST`,
    );
    const cc = await clerkClient();
    rows = await Promise.all(
      subs.map(async (s) => {
        try {
          const u = await cc.users.getUser(s.clerk_user_id);
          return {
            ...s,
            name:
              [u.firstName, u.lastName].filter(Boolean).join(" ") ||
              u.username ||
              "—",
            email: u.emailAddresses[0]?.emailAddress ?? "—",
          };
        } catch {
          return { ...s, name: "—", email: "—" };
        }
      }),
    );
  } catch (e) {
    error =
      e instanceof Error && e.message.includes("vforge_subscriptions")
        ? "Aún no hay tabla de suscripciones — se crea con el primer checkout."
        : "No pude leer las suscripciones. Revisa DATABASE_URL y CLERK_SECRET_KEY.";
  }

  const active = rows.filter(
    (r) => r.status === "active" || r.status === "trialing",
  );
  const mrr = active.reduce((sum, r) => sum + (PLAN_PRICE_USD[r.plan] ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-10 md:px-8 md:pt-14">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-300">
          Administración · Billing
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-on-surface md:text-5xl">
          Quién pagó qué
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Suscripciones de VForge sincronizadas desde Stripe.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 md:max-w-md">
        <div className="rounded-xl border border-app bg-tint-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Suscriptores activos
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-on-surface">
            {active.length}
          </p>
        </div>
        <div className="rounded-xl border border-app bg-tint-1 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            MRR estimado
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-on-surface">
            ${mrr}
            <span className="text-sm text-on-surface-variant"> USD</span>
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-10 rounded-xl border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-app bg-tint-1 px-4 py-6 text-center text-sm text-on-surface-variant">
          Todavía nadie ha pagado. Cuando llegue el primer checkout, aparece aquí.
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-app bg-[var(--color-surface-low)] backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]">Usuario</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]">Plan</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]">Estado</th>
                <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] md:table-cell">Próximo cobro</th>
                <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] lg:table-cell">Customer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clerk_user_id} className="border-b border-app/40 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{r.name}</p>
                    <p className="text-[12px] text-muted">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300 ring-1 ring-violet-500/30">
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{r.status ?? "—"}</td>
                  <td className="hidden px-4 py-3 tabular-nums text-on-surface-variant md:table-cell">
                    {fmtDate(r.current_period_end)}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-[11px] text-muted lg:table-cell">
                    {r.stripe_customer_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8">
        <Link href="/app/admin" className="text-sm text-violet-400 hover:underline">
          ← Volver a usuarios
        </Link>
      </p>
    </main>
  );
}
