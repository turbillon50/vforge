import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/qa-noowner?secret=... — TEMPORAL. Crea un usuario NO-owner
 * de prueba (correo random) + sign-in ticket, para DEMOSTRAR el aislamiento
 * de datos. Protegido por secret en query (no por sesión, porque el QA aún
 * no tiene sesión). RETIRAR tras la prueba.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== "vforge-qa-isolation-2026") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return Response.json({ error: "no clerk key" }, { status: 500 });

  const email = `qa-noowner+${Date.now().toString(36)}@example.com`;
  const cc = await clerkClient();
  const u = await cc.users.createUser({
    emailAddress: [email],
    firstName: "QA",
    lastName: "NoOwner",
    skipPasswordRequirement: true,
    publicMetadata: { role: "user", qa: true },
  });

  const r = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: u.id, expires_in_seconds: 3600 }),
  });
  const data = (await r.json()) as { token?: string };
  return Response.json({
    ok: true,
    email,
    user_id: u.id,
    url: data.token ? `https://vforge.site/sign-in#/?__clerk_ticket=${data.token}` : null,
  });
}
