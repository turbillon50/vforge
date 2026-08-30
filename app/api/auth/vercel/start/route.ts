import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  firmarState,
  normalizarOAuthReturnPath,
} from "@/lib/connect/oauth-state";
import { registrarIntento } from "@/lib/connect/attempt-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/vercel/start — inicia la conexion con la Vercel
 * Integration "V-Forge". El state va FIRMADO y carga el userId, para que
 * el callback no dependa de que la cookie de Clerk sobreviva el regreso
 * desde vercel.com. Ese era el motivo real de que nunca se guardara token.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const slug = process.env.VERCEL_INTEGRATION_SLUG || "v-forge";
  const returnPath = normalizarOAuthReturnPath(
    new URL(req.url).searchParams.get("return_to"),
  );
  const state = firmarState(userId, returnPath);

  // La cookie se conserva como segundo cinturon, pero ya no es indispensable.
  const jar = await cookies();
  jar.set("vc_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 900,
    path: "/",
  });

  await registrarIntento(
    "vercel",
    "iniciado",
    `slug=${slug} return=${returnPath}`,
    userId,
  );

  const url = new URL(`https://vercel.com/integrations/${slug}/new`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}
