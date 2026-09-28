export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/tablero/avisos/route.ts
// Manda al teléfono de Luis lo que no puede esperar a que abra el tablero:
// un frente que terminó, uno que se atoró, la cuenta que topó su límite, o el
// disco por debajo de 5 GB.
//
// El colector ya decide QUÉ es noticia (cada alerta trae una `clave` estable).
// Aquí solo se resuelve CUÁNDO avisar: una alerta se manda la primera vez que
// aparece y no se vuelve a mandar mientras siga ahí — si no, cada 10 minutos
// sonaría lo mismo. Cuando la alerta desaparece se borra su renglón, así que si
// el problema vuelve, vuelve a avisar.
//
// Lo dispara el cron de Vercel (vercel.json). También lo llama el tablero
// mientras está abierto, para que no dependa de una sola vía.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { sendPushToOwners } from "@/lib/push/send";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const RELAY = (
  process.env.RELAY_BASE_URL ||
  process.env.HETZNER_URL ||
  "https://brain.vforge.site"
).replace(/\/$/, "");
const SECRET = process.env.BRAIN_SECRET ?? "";

type Alerta = { nivel: string; clave: string; titulo: string; detalle: string };

// Solo estas viajan al teléfono. El resto se ve en el tablero y ya.
const AL_TELEFONO = /^(fin:|atorado:|limite$|disco$)/;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
}

async function autorizado(req: Request): Promise<boolean> {
  const cabecera = req.headers.get("authorization") ?? "";
  const esperado = process.env.CRON_SECRET || SECRET;
  if (esperado && cabecera === `Bearer ${esperado}`) return true;
  // el propio Luis con sesión abierta (el tablero lo llama al refrescar)
  return isOwnerUser(await currentUser());
}

async function leerEstado(): Promise<{ alertas?: Alerta[] } | null> {
  if (!SECRET) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd: "cat /root/tablero/estado.json" }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw: string = data?.stdout ?? data?.output ?? "";
    const i = raw.indexOf("{");
    return i < 0 ? null : JSON.parse(raw.slice(i));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  if (!(await autorizado(req))) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const estado = await leerEstado();
  if (!estado) {
    return NextResponse.json(
      { ok: false, error: "no pude leer el estado del servidor" },
      { status: 502 },
    );
  }

  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS tablero_avisos (
      clave text PRIMARY KEY,
      titulo text NOT NULL,
      enviado_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const vivas = (estado.alertas ?? []).filter((a) => AL_TELEFONO.test(a.clave));
  const clavesVivas = vivas.map((a) => a.clave);

  const yaAvisadas = new Set(
    (
      (await db`SELECT clave FROM tablero_avisos`) as { clave: string }[]
    ).map((r) => r.clave),
  );

  // lo que ya se resolvió deja de ocupar lugar: si vuelve, vuelve a sonar
  if (clavesVivas.length > 0) {
    await db`DELETE FROM tablero_avisos WHERE clave <> ALL(${clavesVivas})`;
  } else {
    await db`DELETE FROM tablero_avisos`;
  }

  const nuevas = vivas.filter((a) => !yaAvisadas.has(a.clave));
  let enviados = 0;
  for (const a of nuevas) {
    try {
      enviados += await sendPushToOwners({
        title: a.titulo,
        body: a.detalle.slice(0, 180),
        url: "/app/tablero",
      });
      await db`
        INSERT INTO tablero_avisos (clave, titulo) VALUES (${a.clave}, ${a.titulo})
        ON CONFLICT (clave) DO NOTHING
      `;
    } catch {
      // si falla el envío no se marca como avisada: se reintenta a la siguiente
    }
  }

  return NextResponse.json(
    {
      ok: true,
      vivas: clavesVivas.length,
      nuevas: nuevas.map((a) => a.clave),
      enviados,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
