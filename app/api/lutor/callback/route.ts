import { createHmac, timingSafeEqual } from "node:crypto";
import { setProjectEtapa } from "@/lib/projects/etapas-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** LUTOR avisa cuando el cliente acepta el contrato → el expediente pasa a "Firmado". */
export async function POST(req: Request) {
  const secret = process.env.LUTOR_API_TOKEN;
  if (!secret) return new Response("unconfigured", { status: 503 });
  const raw = await req.text();
  const time = req.headers.get("x-lutor-time") ?? "";
  const sig = req.headers.get("x-lutor-signature") ?? "";
  if (
    !/^\d{10}$/.test(time) ||
    Math.abs(Date.now() / 1000 - Number(time)) > 300 ||
    !/^[a-f0-9]{64}$/.test(sig) ||
    !timingSafeEqual(Buffer.from(sig, "hex"), createHmac("sha256", secret).update(`${time}.${raw}`).digest())
  ) {
    return new Response("Forbidden", { status: 403 });
  }
  const body = JSON.parse(raw) as {
    id?: string;
    external_ref?: string;
    status?: string;
    accepted_at?: string;
    accepted_name?: string;
  };
  if (!body.external_ref || body.status !== "aceptado") return Response.json({ ok: true, ignorado: true });
  const result = await setProjectEtapa({
    projectId: body.external_ref,
    etapa: "firmado",
    nota: `Contrato aceptado en LUTOR por ${body.accepted_name ?? "el cliente"} (${body.accepted_at ?? "sin fecha"})`,
    creadoPor: "lutor",
  });
  return Response.json({ ok: true, etapa: result ? "firmado" : null });
}
