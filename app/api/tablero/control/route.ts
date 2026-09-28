export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/tablero/control/route.ts
// El mando del tablero: pausar / reanudar / detener / relanzar un frente.
//
// Tres candados, en este orden:
//  1. Solo dueños (Luis / Jaime). Cualquier otro: 401 y no se llama al relay.
//  2. Solo los cuatro verbos de VERBOS. Nada de comandos libres.
//  3. El tag se valida aquí Y el servidor lo vuelve a validar contra su lista
//     blanca en vl-control. El navegador nunca ve BRAIN_SECRET ni arma comandos:
//     esto corre en el servidor de Next y el shell real es vl-control, que solo
//     sabe hacer cuatro cosas.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = (
  process.env.RELAY_BASE_URL ||
  process.env.HETZNER_URL ||
  "https://brain.vforge.site"
).replace(/\/$/, "");
const SECRET = process.env.BRAIN_SECRET ?? "";

const VERBOS = ["pausar", "reanudar", "detener", "relanzar"] as const;
type Verbo = (typeof VERBOS)[number];

// mismo molde que RE_TAG en vl-control
const TAG_OK = /^[A-Za-z0-9][A-Za-z0-9._-]{0,48}$/;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json(
      { ok: false, error: "estos controles son solo tuyos" },
      { status: 401 },
    );
  }
  if (!SECRET) {
    return NextResponse.json(
      { ok: false, error: "falta BRAIN_SECRET en el entorno" },
      { status: 500 },
    );
  }

  let cuerpo: { accion?: string; tag?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "cuerpo inválido" }, { status: 400 });
  }

  const accion = String(cuerpo.accion ?? "") as Verbo;
  const tag = String(cuerpo.tag ?? "");
  if (!VERBOS.includes(accion)) {
    return NextResponse.json(
      { ok: false, error: `acción no permitida. Solo: ${VERBOS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!TAG_OK.test(tag)) {
    return NextResponse.json(
      { ok: false, error: "ese tag no tiene forma de tag" },
      { status: 400 },
    );
  }

  const quien =
    user?.emailAddresses?.[0]?.emailAddress?.replace(/[^\w@.+-]/g, "") ??
    "dueño";
  // accion y tag ya pasaron por lista blanca y regex; quien va saneado.
  const cmd = `VL_QUIEN=${quien} /usr/local/sbin/vl-control ${accion} ${tag}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `el servidor respondió ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    const raw: string =
      typeof data?.stdout === "string"
        ? data.stdout
        : typeof data?.output === "string"
          ? data.output
          : "";
    // vl-control siempre contesta una línea JSON: no se adivina nada
    const inicio = raw.lastIndexOf("{");
    if (inicio < 0) {
      return NextResponse.json(
        { ok: false, error: "el servidor no contestó nada legible", detalle: raw.slice(0, 200) },
        { status: 502 },
      );
    }
    const r = JSON.parse(raw.slice(inicio)) as {
      ok: boolean;
      mensaje: string;
      detalle?: string[];
    };
    return NextResponse.json(r, {
      status: r.ok ? 200 : 409,
      headers: { "Cache-Control": "no-store" },
    });
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
