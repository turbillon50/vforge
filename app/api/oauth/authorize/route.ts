import { auth } from "@clerk/nextjs/server";
import {
  ensureClientRegistered,
  redirectUriAllowed,
  OAUTH_ORIGIN,
} from "@/lib/oauth/connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/authorize
 *
 * Entrada del flujo OAuth 2.0 para conectores oficiales (Claude.ai).
 * Recibe: client_id, redirect_uri, state, scope.
 *  - Registra el client_id en oauth_clients si no existe.
 *  - Autentica al usuario con Clerk (si no hay sesión → /sign-in).
 *  - Una vez autenticado, rebota a /api/oauth/callback que emite el code.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id") ?? "";
  const redirect_uri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const scope = url.searchParams.get("scope") ?? "";

  if (!client_id) return htmlError("Falta client_id.");
  if (!redirect_uri) return htmlError("Falta redirect_uri.");

  // Registra el cliente si no existe (conserva su redirect_uri).
  const client = await ensureClientRegistered(client_id, redirect_uri).catch(
    () => null,
  );
  if (!client) return htmlError("No se pudo resolver el cliente.", 500);

  // Si el cliente ya estaba registrado con redirect_uris, exige coincidencia
  // exacta (anti open-redirect).
  if (client.redirect_uris.length && !redirectUriAllowed(client, redirect_uri)) {
    return htmlError("redirect_uri no registrada para este cliente.");
  }

  // Parámetros originales que viajan hasta el callback.
  const callback = new URL("/api/oauth/callback", OAUTH_ORIGIN);
  callback.searchParams.set("client_id", client_id);
  callback.searchParams.set("redirect_uri", redirect_uri);
  if (state) callback.searchParams.set("state", state);
  if (scope) callback.searchParams.set("scope", scope);

  const { userId } = await auth();
  if (!userId) {
    // Sin sesión: a la página de login propia, que regresa al callback ya
    // autenticado ("Clerk redirige a /api/oauth/callback").
    const signIn = new URL("/sign-in", url.origin);
    signIn.searchParams.set(
      "redirect_url",
      callback.pathname + callback.search,
    );
    return Response.redirect(signIn.toString(), 302);
  }

  // Ya autenticado: directo al callback.
  return Response.redirect(callback.toString(), 302);
}

function htmlError(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>VForge — error</title>` +
      `<body style="font-family:system-ui;background:#0b0b12;color:#eee;display:grid;place-items:center;height:100vh;margin:0">` +
      `<div style="max-width:420px;text-align:center"><h1 style="font-size:18px">No se pudo autorizar</h1>` +
      `<p style="color:#aaa">${message}</p></div></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
