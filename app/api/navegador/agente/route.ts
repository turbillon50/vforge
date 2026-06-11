export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/navegador/agente/route.ts
// Encola una meta en lenguaje natural para el agente navegador (browser_nl)
// que corre en Hetzner. NO bloquea: el agente tarda 1-2 min y el usuario
// ve el progreso en el VNC + el log del panel handoff (que se actualiza solo).
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "superclaude2025";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    if (!user || !isOwnerEmail(email)) {
      return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const goal = body?.goal;

    if (typeof goal !== "string" || goal.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "goal requerido (string no vacio)" },
        { status: 400 },
      );
    }
    if (goal.length > 500) {
      return NextResponse.json(
        { ok: false, error: "goal demasiado largo (max 500 chars)" },
        { status: 400 },
      );
    }

    // base64 para evitar inyeccion shell: el goal nunca toca la linea de comando crudo
    const b64 = Buffer.from(goal).toString("base64");

    // Ejecuta el agente NL en background (nohup &) — no bloquear.
    const cmd =
      `echo '${b64}' | base64 -d > /tmp/goal.txt && ` +
      `cd /root/agents && ` +
      `nohup python3 nl_browser_agent.py "$(cat /tmp/goal.txt)" > /tmp/nl_last.txt 2>&1 &`;

    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `relay respondio ${res.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      goal,
      status: "ejecutando",
      msg: "La IA esta planeando y navegara en el VNC. Mira el panel Vulcano conduciendo.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "error desconocido" },
      { status: 500 },
    );
  }
}
