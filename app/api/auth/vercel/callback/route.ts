import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";
import {
  leerStateCompleto,
  resolverOAuthCallbackIdentity,
} from "@/lib/connect/oauth-state";
import { registrarIntento } from "@/lib/connect/attempt-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/vercel/callback — Vercel regresa con ?code&state (y
 * configurationId, teamId). Intercambia code -> access token y lo guarda
 * cifrado en el vault del usuario.
 *
 * COMO SE IDENTIFICA AL USUARIO (y por que importa):
 * Primero se intenta la sesion de Clerk. Si no viaja -- que es lo que
 * pasaba y tiraba el codigo a la basura -- se cae al userId firmado dentro
 * del state. Antes, sin sesion, esta ruta redirigia a /sign-in y perdia el
 * code en silencio: por eso llevaba meses sin guardar un solo token.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const configurationId = url.searchParams.get("configurationId");
  const teamId = url.searchParams.get("teamId");

  const stateData = leerStateCompleto(state);
  const back = (status: string) => {
    const destination = new URL(stateData?.returnPath ?? "/app/integrations", site);
    destination.searchParams.set("vercel", status);
    return Response.redirect(destination, 302);
  };

  // 1) Sesion de Clerk si existe; 2) si no, el userId firmado en el state.
  let sessionUserId: string | null = null;
  try {
    sessionUserId = (await auth()).userId ?? null;
  } catch {
    sessionUserId = null;
  }
  const identity = resolverOAuthCallbackIdentity(
    sessionUserId,
    stateData?.userId,
  );
  if (identity.mismatch) {
    await registrarIntento(
      "vercel",
      "state_invalido",
      "sesion != state",
      identity.userId,
    );
    return back("error_state");
  }
  const userId = identity.userId;

  const jar = await cookies();
  jar.delete("vc_oauth_state");

  if (!code) {
    await registrarIntento("vercel", "sin_code", url.search.slice(0, 200), userId);
    return back("error_no_code");
  }
  if (!userId) {
    await registrarIntento("vercel", "sin_usuario", "sin sesion y state ilegible");
    return back("error_sin_sesion");
  }

  const clientId = process.env.VERCEL_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    await registrarIntento("vercel", "sin_credenciales", "faltan CLIENT_ID/SECRET", userId);
    return back("error_no_secret");
  }

  try {
    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${site}/api/auth/vercel/callback`,
      }),
    });
    const data = (await tokenRes.json()) as {
      access_token?: string;
      team_id?: string | null;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      await registrarIntento(
        "vercel",
        "rechazo_proveedor",
        `http=${tokenRes.status} ${JSON.stringify(data).slice(0, 300)}`,
        userId,
      );
      return back("err:" + encodeURIComponent(JSON.stringify(data)).slice(0, 400));
    }

    await saveUserSecret(userId, "VERCEL_USER_TOKEN", data.access_token, "vercel");
    const tid = data.team_id || teamId;
    if (tid) await saveUserSecret(userId, "VERCEL_TEAM_ID", tid, "vercel");
    if (configurationId)
      await saveUserSecret(userId, "VERCEL_CONFIGURATION_ID", configurationId, "vercel");

    await registrarIntento("vercel", "ok", tid ? `team=${tid}` : "personal", userId);
    return back("connected");
  } catch (e) {
    await registrarIntento("vercel", "excepcion", String(e).slice(0, 300), userId);
    console.error("[vercel oauth] fallo:", e);
    return back("err:exc:" + encodeURIComponent(String(e)).slice(0, 200));
  }
}
