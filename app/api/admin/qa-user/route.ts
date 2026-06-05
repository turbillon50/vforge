import { auth, clerkClient } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/qa-user — owner-only. Crea (o reutiliza) un usuario de
 * prueba sin rol owner y genera N sign-in tokens de un solo uso para que
 * un auditor externo recorra /app sin contraseña ni captcha.
 *
 * Endpoint temporal de QA. Retirar tras la auditoría.
 */
const QA_EMAIL = "qa-auditor@vforge.site";
// Con body {fresh:true} genera un usuario nuevo val-test+<ts>@vforge.site (cliente desde cero).

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { fresh?: boolean };
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const cc = await clerkClient();
  const me = await cc.users.getUser(userId).catch(() => null);
  if (!isOwnerUser(me)) return Response.json({ error: "forbidden" }, { status: 403 });

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return Response.json({ error: "CLERK_SECRET_KEY ausente" }, { status: 500 });

  // 1) Buscar o crear el usuario QA (rol normal, NO owner).
  const email = body.fresh
    ? `val-test+${Date.now().toString(36)}@vforge.site`
    : QA_EMAIL;
  let qa = body.fresh
    ? undefined
    : (await cc.users.getUserList({ emailAddress: [email], limit: 1 })).data[0];
  if (!qa) {
    qa = await cc.users.createUser({
      emailAddress: [email],
      firstName: "QA",
      lastName: "Auditor",
      skipPasswordRequirement: true,
      publicMetadata: { role: "user", qa: true },
    });
  }

  // 2) Generar 3 sign-in tokens (la SDK no expone sign_in_tokens; usamos la
  //    Backend API REST directamente con el secret del server).
  const tokens: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: qa.id, expires_in_seconds: 86400 }),
    });
    const data = (await r.json().catch(() => null)) as { token?: string } | null;
    if (r.ok && data?.token) tokens.push(data.token);
  }

  const origin = "https://vforge.site";
  const urls = tokens.map(
    (t) => `${origin}/sign-in#/?__clerk_ticket=${t}`,
  );

  return Response.json({
    ok: true,
    qa_user_id: qa.id,
    email,
    urls,
    note: "URLs de un solo uso. Caducan en 24h. Llevan al auditor directo a /app como usuario normal.",
  });
}
