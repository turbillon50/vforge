import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/forja/connect-vercel { token, teamId? }
 * Valida un Personal Access Token de Vercel del usuario contra la API y lo
 * guarda cifrado en SU boveda. Con esto el motor puede desplegar y comprar
 * dominios en la cuenta del usuario. Reemplaza el OAuth (que era una app de
 * "Sign in with Vercel", solo identidad, sin permiso de deploy).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const token = String(b.token || "").trim();
  const teamId = String(b.teamId || "").trim();
  if (token.length < 20) return Response.json({ ok: false, error: "token_corto" }, { status: 400 });

  try {
    const r = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok) {
      return Response.json(
        { ok: false, error: "Vercel rechazo el token (" + r.status + ")" },
        { status: 400 }
      );
    }
    const u = (await r.json()) as { user?: { username?: string; email?: string } };

    // Si dieron teamId, validar que el token tenga acceso a ese team.
    if (teamId) {
      const tr = await fetch(
        "https://api.vercel.com/v2/teams/" + encodeURIComponent(teamId),
        { headers: { Authorization: "Bearer " + token } }
      );
      if (!tr.ok) {
        return Response.json(
          { ok: false, error: "El token no tiene acceso a ese team (" + tr.status + ")" },
          { status: 400 }
        );
      }
    }

    await saveUserSecret(userId, "VERCEL_USER_TOKEN", token, "vercel");
    if (teamId) await saveUserSecret(userId, "VERCEL_TEAM_ID", teamId, "vercel");

    return Response.json({
      ok: true,
      username: u.user?.username || u.user?.email || "vercel",
      team: teamId || null,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
