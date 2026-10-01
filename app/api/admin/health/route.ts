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
 *     cerebras: { status, latency_ms?, error? },
 *     mesh: { status, latency_ms?, error? }
 *   }
 *
 * No auth in the operator MVP. Lock down behind Clerk when M11 lands.
 */
import { sql } from "@/lib/db/client";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { vaultSelfTest } from "@/lib/vault/operator-crypto";
import { meshAdapter } from "@/lib/forge/adapters/mesh";

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

interface ProviderHealth {
  status: "ok" | "missing-key" | "degraded" | "error";
  latency_ms?: number;
  key?: string;
  error?: string;
  reason?: string;
}

export async function GET() {
  const ts = new Date().toISOString();

  const [db, vault, cerebras, mesh] = await Promise.all([
    checkDb(),
    Promise.resolve(checkVault()),
    checkCerebras(),
    checkMesh(),
  ]);

  const ok =
    db.status === "ok" &&
    vault.status === "ok" &&
    isNonFatalProvider(cerebras) &&
    isNonFatalProvider(mesh);

  return new Response(
    JSON.stringify({ ts, ok, db, vault, cerebras, mesh }),
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

function isNonFatalProvider(provider: ProviderHealth): boolean {
  return provider.status === "ok" || provider.status === "missing-key";
}

async function checkCerebras(): Promise<ProviderHealth> {
  const apiKey = await getOperatorSecret("CEREBRAS_API_KEY", {
    auditUserId: "health-check",
  }).catch(() => null);
  if (!apiKey) return { status: "missing-key", key: "CEREBRAS_API_KEY" };

  const start = Date.now();
  try {
    const base =
      process.env.CEREBRAS_BASE_URL?.replace(/\/$/, "") ??
      "https://api.cerebras.ai/v1";
    const resp = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const latency = Date.now() - start;
    if (!resp.ok) {
      return {
        status: "error",
        latency_ms: latency,
        error: `${resp.status} ${resp.statusText}`,
      };
    }
    return {
      status: "ok",
      latency_ms: latency,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkMesh(): Promise<ProviderHealth> {
  const start = Date.now();
  try {
    const health = await meshAdapter.health({
      vault: {
        async getOperatorSecret(name) {
          return getOperatorSecret(name, { auditUserId: "health-check" });
        },
        async getProjectSecret(projectId, name) {
          return getOperatorSecret(name, {
            auditUserId: "health-check",
            projectId,
          });
        },
      },
    });
    return { ...health, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
