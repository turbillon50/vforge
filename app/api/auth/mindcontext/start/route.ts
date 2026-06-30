import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);
  const base = process.env.MINDCONTEXT_BASE || "https://mindcontextia.one";
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("mci_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const url = new URL(base + "/api/oauth/authorize");
  url.searchParams.set("client_id", "vforge");
  url.searchParams.set("redirect_uri", `${site}/api/auth/mindcontext/callback`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}
