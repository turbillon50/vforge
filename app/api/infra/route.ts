import { NextResponse } from "next/server";
import { requireDueno } from "@/lib/auth/tablero-gate";
import { isInfraSnapshot } from "@/lib/infra/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireDueno(req)).ok) {
    return NextResponse.json({ error: "Acceso de propietario requerido" }, { status: 401 });
  }
  const secret = process.env.BRAIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Fuente de infraestructura sin configurar" }, { status: 503 });
  const relay = (process.env.HETZNER_URL || process.env.RELAY_BASE_URL || "https://brain.vforge.site").replace(/\/$/, "");
  try {
    const response = await fetch(`${relay}/brain/exec`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, cmd: "cat /root/tablero/infra.json" }),
    });
    if (!response.ok) throw new Error("source_unavailable");
    const payload = await response.json();
    const raw = typeof payload.output === "string" ? payload.output : payload.stdout;
    if (typeof raw !== "string" || raw.length > 2_000_000) throw new Error("invalid_source");
    const snapshot: unknown = JSON.parse(raw);
    if (!isInfraSnapshot(snapshot)) throw new Error("invalid_snapshot");
    const age = Date.now() - Date.parse(snapshot.generatedAt);
    return NextResponse.json({ snapshot, stale: age > 300_000 || age < -60_000 },
      { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar la fuente. No hay datos de ejemplo." },
      { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
