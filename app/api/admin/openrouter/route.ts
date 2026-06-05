import { getOperatorSecret } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/openrouter — salud de la cuenta OpenRouter (owner-only
 * vía middleware). Devuelve saldo/uso para el cockpit y diagnóstico.
 */
export async function GET() {
  const key = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: "operator_luis",
  });
  if (!key) {
    return Response.json({ ok: false, error: "OPENROUTER_API_KEY no configurada" }, { status: 500 });
  }
  try {
    const r = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = (await r.json().catch(() => null)) as
      | { data?: { total_credits?: number; total_usage?: number } }
      | null;
    if (!r.ok) {
      return Response.json(
        { ok: false, status: r.status, error: "OpenRouter rechazó la key", detail: data },
        { status: 502 },
      );
    }
    const total = data?.data?.total_credits ?? 0;
    const used = data?.data?.total_usage ?? 0;
    return Response.json({
      ok: true,
      total_credits: total,
      total_usage: used,
      remaining: Math.round((total - used) * 100) / 100,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
