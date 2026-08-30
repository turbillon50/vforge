import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("mci_oauth_state")?.value;
  jar.delete("mci_oauth_state");
  const back = (s: string) => Response.redirect(`${site}/app/integrations?mindcontext=${s}`, 302);
  if (!code) return back("error_no_code");
  if (state && expected && state !== expected) return back("error_state");
  const base = process.env.MINDCONTEXT_BASE || "https://mindcontextia.one";
  const secret = process.env.MCI_VFORGE_CLIENT_SECRET;
  if (!secret) return back("error_no_secret");
  try {
    const r = await fetch(base + "/api/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, client_id: "vforge", client_secret: secret }),
    });
    const d = await r.json();
    if (!d.access_token) return back("error_token");
    await saveUserSecret(userId, "MINDCONTEXT_TOKEN", d.access_token, "mindcontext");
    if (d.account) await saveUserSecret(userId, "MINDCONTEXT_ACCOUNT", String(d.account), "mindcontext");
    return back("connected");
  } catch {
    return back("error_exception");
  }
}
