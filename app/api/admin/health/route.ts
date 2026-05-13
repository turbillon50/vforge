/**
 * GET /api/admin/health
 *
 * Liveness check for the brain's dependencies. Returns whatever
 * passes (best-effort — never throws). Used by:
 *   - /activity UI for status pill
 *   - V's forge_cost_report flow when it wants to confirm provider OK
 *   - Future Trigger.dev cron alert (M9.5)
 *
 * Response shape:
 *   {
 *     ts: ISO,
 *     ok: boolean,
 *     db: { status, latency_ms? },
 *     vault: { status, error? },
 *     openrouter: { status, balance_usd?, usage_usd?, latency_ms?, error? }
 *   }
 *
 * No auth in the operator MVP. Lock down behind Clerk when M11 lands.
 */
import { sql } from "@/lib/db/client";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { vaultSelfTest } from "@/lib/vault/operator-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DbHealth {
  status: "ok" | "error";
  latency_ms?: number;
  error?: string;
}

interface VaultHealth {
  status: "ok" | "error";
  error?: string;
}

interface OpenRouterHealth {
  status: "ok" | "missing-key" | "error";
  balance_usd?: number;
  usage_usd?: number;
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const ts = new Date().toISOString();

  const [db, vault, openrouter] = await Promise.all([
    checkDb(),
    Promise.resolve(checkVault()),
    checkOpenRouter(),
  ]);

  const ok =
    db.status === "ok" &&
    vault.status === "ok" &&
    (openrouter.status === "ok" || openrouter.status === "missing-key");

  return new Response(
    JSON.stringify({ ts, ok, db, vault, openrouter }),
    {
      status: ok ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function checkDb(): Promise<DbHealth> {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkVault(): VaultHealth {
  const probe = vaultSelfTest();
  if (probe.ok) return { status: "ok" };
  return { status: "error", error: probe.error };
}

async function checkOpenRouter(): Promise<OpenRouterHealth> {
  const apiKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: "health-check",
  }).catch(() => null);
  if (!apiKey) return { status: "missing-key" };

  const start = Date.now();
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    if (!resp.ok) {
      return {
        status: "error",
        latency_ms: latency,
        error: `${resp.status} ${resp.statusText}`,
      };
    }
    const json = (await resp.json()) as {
      data?: { total_credits?: number; total_usage?: number };
    };
    return {
      status: "ok",
      latency_ms: latency,
      balance_usd: json.data?.total_credits ?? 0,
      usage_usd: json.data?.total_usage ?? 0,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
