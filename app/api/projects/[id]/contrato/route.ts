import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne } from "@/lib/db/client";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  monto_total?: unknown;
  anticipo?: unknown;
  notas?: unknown;
  modulos?: unknown;
  ciudad?: unknown;
};

function num(value: unknown) {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Pide a LUTOR el contrato de desarrollo del proyecto y deja el expediente en "Contrato enviado". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const base = process.env.LUTOR_URL?.replace(/\/+$/, "");
  const token = process.env.LUTOR_API_TOKEN;
  if (!base || !token) return Response.json({ error: "LUTOR no está configurado en VForge" }, { status: 503 });

  const { id } = await params;
  await ensureProjectCarteraSchema();
  const project = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    cliente_nombre: string | null;
    cliente_whatsapp: string | null;
    demo_url: string | null;
    contrato_url: string | null;
  }>(
    `SELECT id, name, description, cliente_nombre, cliente_whatsapp, demo_url, contrato_url
       FROM projects WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!project) return Response.json({ error: "proyecto no encontrado" }, { status: 404 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const total = num(body.monto_total);
  const anticipo = num(body.anticipo) ?? (total ? Math.round(total * 0.5) : null);
  const modulos = Array.isArray(body.modulos)
    ? body.modulos.filter((m): m is string => typeof m === "string" && m.trim().length > 0).slice(0, 30)
    : undefined;
  const cliente = (project.cliente_nombre ?? "").split("—")[0].trim() || project.cliente_nombre || null;

  const res = await fetch(`${base}/api/contratos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_ref: project.id,
      callback_url: "https://vforge.site/api/lutor/callback",
      cliente: { nombre: cliente, whatsapp: project.cliente_whatsapp },
      app: {
        nombre: project.name,
        descripcion: project.description,
        demo_url: project.demo_url,
        modulos,
      },
      monto_total: total,
      pagos:
        total && anticipo
          ? [
              { concepto: "Anticipo a la firma", monto: anticipo, cuando: "a la firma" },
              { concepto: "Saldo a la entrega", monto: total - anticipo, cuando: "contra entrega en producción" },
            ]
          : undefined,
      ciudad: typeof body.ciudad === "string" ? body.ciudad : undefined,
      notas: typeof body.notas === "string" ? body.notas.slice(0, 2000) : undefined,
    }),
    signal: AbortSignal.timeout(45_000),
  }).catch((error: unknown) => ({ ok: false, status: 0, error }) as const);

  if (!("json" in res) || !res.ok) {
    const detalle = "json" in res ? await res.text().catch(() => "") : String((res as { error?: unknown }).error);
    return Response.json({ error: `LUTOR respondió ${res.status}`, detalle: detalle.slice(0, 300) }, { status: 502 });
  }
  const contrato = (await res.json()) as { id: string; url: string; status: string; faltantes?: string[] };

  const etapa = await setProjectEtapa({
    projectId: project.id,
    etapa: "contrato_enviado",
    nota: `Contrato generado por LUTOR (${contrato.id})${contrato.faltantes?.length ? ` · faltan: ${contrato.faltantes.join(", ")}` : ""}`,
    creadoPor: access.userId,
    contratoUrl: contrato.url,
  });
  return Response.json({ ok: true, contrato, etapa: etapa ?? null });
}
