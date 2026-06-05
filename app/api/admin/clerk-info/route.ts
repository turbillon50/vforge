export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico owner-only (middleware protege /api/admin). Identifica la
// instancia Clerk de la secret key e intenta configurar Google por API.
export async function GET() {
  const sk = process.env.CLERK_SECRET_KEY;
  if (!sk) return Response.json({ ok: false, error: "CLERK_SECRET_KEY ausente" });

  const out: Record<string, unknown> = { secret_prefix: sk.slice(0, 11) };
  const h = { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" };

  // 1) Dominios de la instancia (confirma a qué app pertenece la key).
  try {
    const r = await fetch("https://api.clerk.com/v1/domains", { headers: h });
    out.domains_status = r.status;
    out.domains = await r.json().catch(() => null);
  } catch (e) { out.domains_err = String(e); }

  // 2) Intentar leer/configurar el provider Google por Backend API.
  // Probamos varias rutas posibles para saber si la API lo soporta.
  for (const path of ["/v1/oauth_applications", "/v1/instance"]) {
    try {
      const r = await fetch(`https://api.clerk.com${path}`, { headers: h });
      out[`probe_${path}`] = r.status;
    } catch { /* ignore */ }
  }

  return Response.json({ ok: true, ...out });
}
