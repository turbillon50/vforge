export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/tablero/route.ts
// Tablero de agentes (owner-only). Lee /root/tablero/estado.json del Hetzner
// por el relay /brain/exec. Ese JSON lo genera /root/tablero/estado.py cada
// 5 min (cron) y solo LEE: worktrees, crons, procesos claude y sesiones.
// ?refrescar=1 regenera la foto en el momento. CERO MOCK: si el relay no
// responde, se devuelve el error tal cual y la pantalla lo muestra.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = (
  process.env.HETZNER_URL ||
  process.env.RELAY_BASE_URL ||
  "https://brain.vforge.site"
).replace(/\/$/, "");
const SECRET = process.env.BRAIN_SECRET ?? "";

const LEER = "cat /root/tablero/estado.json";
const REGENERAR = "cd /root/tablero && python3 estado.py";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json({ ok: false, error: "solo dueños" }, { status: 401 });
  }
  if (!SECRET) {
    return NextResponse.json(
      { ok: false, error: "falta BRAIN_SECRET en el entorno" },
      { status: 500 },
    );
  }

  const refrescar = new URL(req.url).searchParams.get("refrescar") === "1";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), refrescar ? 45000 : 12000);

  try {
    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd: refrescar ? REGENERAR : LEER }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `relay respondió ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    const raw: string =
      typeof data?.output === "string"
        ? data.output
        : typeof data?.stdout === "string"
          ? data.stdout
          : "";
    const inicio = raw.indexOf("{");
    if (inicio < 0) {
      return NextResponse.json(
        { ok: false, error: "el servidor no devolvió el estado", detalle: raw.slice(0, 200) },
        { status: 502 },
      );
    }
    const estado = JSON.parse(raw.slice(inicio));
    return NextResponse.json(
      { ok: true, estado },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg.includes("abort") ? "el servidor tardó demasiado" : msg },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }
}
