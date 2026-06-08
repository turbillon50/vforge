import { auth } from "@clerk/nextjs/server";
import { getClient } from "@/lib/mcp/oauth";
import { redirectUriAllowed, issueConnectorCode } from "@/lib/oauth/connector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/callback
 *
 * Vuelta tras autenticar en Clerk. Lee la sesión Clerk (cookie) para conocer al
 * usuario, emite un authorization_code efímero (5 min) y redirige al
 * redirect_uri del cliente con ?code=...&state=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id") ?? "";
  const redirect_uri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const scope = url.searchParams.get("scope") ?? "";

  if (!client_id || !redirect_uri) return htmlError("Solicitud inválida.");

  const client = await getClient(client_id);
  if (!client) return htmlError("client_id desconocido.");
  if (client.redirect_uris.length && !redirectUriAllowed(client, redirect_uri)) {
    return htmlError("redirect_uri no registrada para este cliente.");
  }

  const { userId } = await auth();
  if (!userId) {
    // No hay sesión (el usuario llegó sin autenticarse o expiró): rebota a
    // login devolviéndolo exactamente aquí.
    const signIn = new URL("/sign-in", url.origin);
    signIn.searchParams.set("redirect_url", url.pathname + url.search);
    return Response.redirect(signIn.toString(), 302);
  }

  const code = await issueConnectorCode({
    clientId: client_id,
    userId,
    redirectUri: redirect_uri,
    scope: scope || null,
  });

  const out = new URL(redirect_uri);
  out.searchParams.set("code", code);
  if (state) out.searchParams.set("state", state);
  return Response.redirect(out.toString(), 302);
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
