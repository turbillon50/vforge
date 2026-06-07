import { auth } from "@clerk/nextjs/server";
import {
  getClient,
  redirectUriAllowed,
  issueAuthCode,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuthorizeParams {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  scope: string;
  resource: string;
}

function readParams(src: URLSearchParams): AuthorizeParams {
  return {
    response_type: src.get("response_type") ?? "",
    client_id: src.get("client_id") ?? "",
    redirect_uri: src.get("redirect_uri") ?? "",
    code_challenge: src.get("code_challenge") ?? "",
    code_challenge_method: src.get("code_challenge_method") ?? "S256",
    state: src.get("state") ?? "",
    scope: src.get("scope") ?? "",
    resource: src.get("resource") ?? "",
  };
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

function redirectError(redirectUri: string, state: string, error: string, desc?: string): Response {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (desc) u.searchParams.set("error_description", desc);
  if (state) u.searchParams.set("state", state);
  return Response.redirect(u.toString(), 302);
}

/** Valida los parámetros comunes y resuelve el cliente. */
async function validate(p: AuthorizeParams) {
  if (p.response_type !== "code")
    return { ok: false as const, hard: "response_type debe ser 'code'." };
  if (!p.client_id) return { ok: false as const, hard: "Falta client_id." };
  const client = await getClient(p.client_id);
  if (!client) return { ok: false as const, hard: "client_id desconocido. Regístrate primero." };
  if (!redirectUriAllowed(client, p.redirect_uri))
    return { ok: false as const, hard: "redirect_uri no registrada para este cliente." };
  // redirect_uri válida ⇒ a partir de aquí los errores se devuelven por redirect.
  if (!p.code_challenge)
    return { ok: false as const, soft: "invalid_request", desc: "PKCE requerido (code_challenge)." };
  if ((p.code_challenge_method || "S256").toUpperCase() !== "S256")
    return { ok: false as const, soft: "invalid_request", desc: "code_challenge_method debe ser S256." };
  return { ok: true as const, client };
}

function consentHtml(p: AuthorizeParams, clientName: string, email: string): string {
  const hidden = (
    [
      ["response_type", p.response_type],
      ["client_id", p.client_id],
      ["redirect_uri", p.redirect_uri],
      ["code_challenge", p.code_challenge],
      ["code_challenge_method", p.code_challenge_method],
      ["state", p.state],
      ["scope", p.scope],
      ["resource", p.resource],
    ] as const
  )
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`)
    .join("");
  const who = clientName ? escapeHtml(clientName) : "Claude";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VForge — Autorizar acceso</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;background:radial-gradient(120% 80% at 50% 0%,#1a1030 0%,#0b0b12 60%);color:#f5f5fa;min-height:100vh;display:grid;place-items:center">
<form method="POST" style="width:min(440px,92vw);background:rgba(20,18,32,.85);border:1px solid rgba(140,110,255,.25);border-radius:18px;padding:32px;backdrop-filter:blur(12px)">
  ${hidden}
  <div style="font-family:monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9b8cff;margin-bottom:18px">VForge · MCP</div>
  <h1 style="font-size:21px;line-height:1.3;margin:0 0 10px">${who} quiere acceder a tu VForge</h1>
  <p style="color:#b8b3c8;font-size:14px;line-height:1.55;margin:0 0 8px">
    Estás como <strong style="color:#fff">${escapeHtml(email)}</strong>. Si autorizas, ${who} podrá
    consultar y operar tu forge (proyectos, pagos, salud de apps, memoria y método) con tu mismo nivel de acceso.
  </p>
  <p style="color:#7d7890;font-size:12px;line-height:1.5;margin:0 0 22px">
    Puedes revocar el acceso en cualquier momento desde VForge. El acceso respeta tus scopes: el operador ve todo, un cliente sólo su organización.
  </p>
  <div style="display:flex;gap:10px">
    <button name="decision" value="deny" style="flex:1;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#ddd;font-size:15px;cursor:pointer">Cancelar</button>
    <button name="decision" value="allow" style="flex:2;height:46px;border-radius:12px;border:0;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;font-size:15px;font-weight:600;cursor:pointer">Permitir</button>
  </div>
</form>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** GET: si no hay sesión Clerk → manda a /sign-in y regresa. Si hay sesión →
 *  pantalla de consentimiento. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = readParams(url.searchParams);

  const v = await validate(p);
  if (!v.ok) {
    if ("hard" in v && v.hard) return htmlError(v.hard);
    if ("soft" in v && v.soft) return redirectError(p.redirect_uri, p.state, v.soft, v.desc);
    return htmlError("Solicitud inválida.");
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    // Sin sesión: a la página propia de login, que regresa exactamente aquí.
    const returnTo = url.pathname + url.search;
    const signIn = new URL("/sign-in", url.origin);
    signIn.searchParams.set("redirect_url", returnTo);
    return Response.redirect(signIn.toString(), 302);
  }

  const email =
    (sessionClaims as { email?: string } | undefined)?.email ??
    (sessionClaims as { primaryEmail?: string } | undefined)?.primaryEmail ??
    "tu cuenta";
  return new Response(consentHtml(p, v.client.client_name ?? "", email), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** POST: el usuario decidió en la pantalla de consentimiento. */
export async function POST(req: Request) {
  const form = await req.formData();
  const sp = new URLSearchParams();
  for (const [k, val] of form.entries()) sp.set(k, String(val));
  const p = readParams(sp);
  const decision = sp.get("decision") ?? "deny";

  const v = await validate(p);
  if (!v.ok) {
    if ("hard" in v && v.hard) return htmlError(v.hard);
    if ("soft" in v && v.soft) return redirectError(p.redirect_uri, p.state, v.soft, v.desc);
    return htmlError("Solicitud inválida.");
  }

  const { userId } = await auth();
  if (!userId) {
    // La sesión expiró entre el GET y el POST: rebota a login.
    const signIn = new URL("/sign-in", new URL(req.url).origin);
    const returnTo = "/api/mcp/oauth/authorize?" + sp.toString();
    signIn.searchParams.set("redirect_url", returnTo);
    return Response.redirect(signIn.toString(), 302);
  }

  if (decision !== "allow") {
    return redirectError(p.redirect_uri, p.state, "access_denied", "El usuario canceló el acceso.");
  }

  const code = await issueAuthCode({
    clientId: p.client_id,
    clerkUserId: userId,
    redirectUri: p.redirect_uri,
    codeChallenge: p.code_challenge,
    codeChallengeMethod: p.code_challenge_method,
    scope: p.scope || null,
    resource: p.resource || null,
  });

  const out = new URL(p.redirect_uri);
  out.searchParams.set("code", code);
  if (p.state) out.searchParams.set("state", p.state);
  return Response.redirect(out.toString(), 302);
}
