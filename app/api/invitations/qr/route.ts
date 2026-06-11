/**
 * GET /api/invitations/qr?data=<texto>  (owner)
 *
 * Devuelve un PNG con el código QR del texto recibido (normalmente el link de
 * unión del cliente). Se usa como <img src> en el modal de invitación.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isOwnerEmail(email)) {
    return new Response("forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");
  if (!data) return new Response("data requerido", { status: 400 });

  const png = await QRCode.toBuffer(data, {
    type: "png",
    width: 320,
    margin: 1,
    color: { dark: "#0a0a12", light: "#ffffff" },
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
