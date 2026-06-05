import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico público: ¿el server ve la sesión? + match de llaves Clerk.
export async function GET() {
  let userId: string | null = null;
  let err: string | null = null;
  try {
    const a = await auth();
    userId = a.userId ?? null;
  } catch (e) {
    err = String(e).slice(0, 200);
  }
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const sk = process.env.CLERK_SECRET_KEY || "";
  // pk_live_<base64url(frontendApi$)> — decodificamos el dominio FAPI.
  let pkDomain = "";
  try {
    const b64 = pk.replace(/^pk_(live|test)_/, "");
    pkDomain = Buffer.from(b64, "base64").toString("utf8").replace(/\$+$/, "");
  } catch { /* ignore */ }
  return Response.json({
    server_sees_session: !!userId,
    userId,
    error: err,
    pk_prefix: pk.slice(0, 8),
    pk_frontend_api: pkDomain,
    sk_prefix: sk.slice(0, 11),
    expected_fapi: "clerk.vforge.site",
    match: pkDomain === "clerk.vforge.site",
  });
}
