import "server-only";

import { queryOne } from "@/lib/db/client";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";

export type PedirContratoInput = {
  projectId: string;
  montoTotal?: number | null;
  anticipo?: number | null;
  notas?: string | null;
  modulos?: string[];
  ciudad?: string | null;
  creadoPor: string;
};

export type PedirContratoResult =
  | { ok: true; contrato: { id: string; url: string; status: string; faltantes?: string[] } }
  | { ok: false; status: number; error: string };

export function montoDe(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Pide a LUTOR el contrato de desarrollo del proyecto y deja el expediente en "Contrato enviado". */
export async function pedirContratoLutor(input: PedirContratoInput): Promise<PedirContratoResult> {
  const base = process.env.LUTOR_URL?.replace(/\/+$/, "");
  const token = process.env.LUTOR_API_TOKEN;
  if (!base || !token) return { ok: false, status: 503, error: "LUTOR no está configurado en VForge" };

  await ensureProjectCarteraSchema();
  const project = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    cliente_nombre: string | null;
    cliente_whatsapp: string | null;
    demo_url: string | null;
  }>(
    `SELECT id, name, description, cliente_nombre, cliente_whatsapp, demo_url FROM projects WHERE id = $1 LIMIT 1`,
    [input.projectId],
  );
  if (!project) return { ok: false, status: 404, error: "proyecto no encontrado" };

  const total = input.montoTotal ?? null;
  const anticipo = input.anticipo ?? (total ? Math.round(total * 0.5) : null);
  const cliente = (project.cliente_nombre ?? "").split("—")[0].trim() || project.cliente_nombre || null;

  let res: Response;
  try {
    res = await fetch(`${base}/api/contratos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        external_ref: project.id,
        callback_url: "https://vforge.site/api/lutor/callback",
        cliente: { nombre: cliente, whatsapp: project.cliente_whatsapp },
        app: { nombre: project.name, descripcion: project.description, demo_url: project.demo_url, modulos: input.modulos },
        monto_total: total,
        pagos:
          total && anticipo
            ? [
                { concepto: "Anticipo a la firma", monto: anticipo, cuando: "a la firma" },
                { concepto: "Saldo a la entrega", monto: total - anticipo, cuando: "contra entrega en producción" },
              ]
            : undefined,
        ciudad: input.ciudad ?? undefined,
        notas: input.notas?.slice(0, 2000) ?? undefined,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    return { ok: false, status: 502, error: `LUTOR no respondió: ${error instanceof Error ? error.message : error}` };
  }
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    return { ok: false, status: 502, error: `LUTOR respondió ${res.status}: ${detalle.slice(0, 200)}` };
  }
  const contrato = (await res.json()) as { id: string; url: string; status: string; faltantes?: string[] };
  await setProjectEtapa({
    projectId: project.id,
    etapa: "contrato_enviado",
    nota: `Contrato generado por LUTOR (${contrato.id})${contrato.faltantes?.length ? ` · faltan: ${contrato.faltantes.join(", ")}` : ""}`,
    creadoPor: input.creadoPor,
    contratoUrl: contrato.url,
  });
  return { ok: true, contrato };
}
