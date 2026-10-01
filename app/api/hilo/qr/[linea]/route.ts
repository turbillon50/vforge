import { fetchHiloQr } from "@/lib/hilo/server";
import { resolveRequestOwner } from "@/lib/auth/request-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ linea: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!access.isOwner) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { linea } = await params;
  const upstream = await fetchHiloQr(linea);
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || "qr no disponible", {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/plain",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
