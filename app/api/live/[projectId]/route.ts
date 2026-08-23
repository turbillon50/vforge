/**
 * BFF de la ficha del portal en vivo.
 *
 * Devuelve únicamente las URLs que la API propia autoriza para el rol actual.
 * El browser nunca recibe el token interno de Hetzner ni consulta Neon directo.
 */
import { NextResponse } from "next/server";
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  try {
    const payload = await loadVForgeLiveProject(projectId);
    if (!payload) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    return NextResponse.json(payload, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
