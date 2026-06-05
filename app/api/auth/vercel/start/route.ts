import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/vercel/start — inicia la conexión con la Vercel
 * Integration "V-Forge". Redirige a la página de instalación de la
 * integración; Vercel regresa al callback con ?code&state.
 */
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const slug = process.env.VERCEL_INTEGRATION_SLUG || "v-forge";
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("vc_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = new URL(`https://vercel.com/integrations/${slug}/new`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}
