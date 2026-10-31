import { NextResponse } from "next/server";
import { requireDueno } from "@/lib/auth/tablero-gate";
import { loadInfrastructure } from "@/lib/infra/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireDueno(req)).ok) {
    return NextResponse.json({ error: "Acceso de propietario requerido" }, { status: 401 });
  }
  try {
    const data = await loadInfrastructure();
    return NextResponse.json(data,
      { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la fuente. No hay datos de ejemplo." },
      { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
