export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// app/api/forge/token-refresh/route.ts
// Dispara el refresh BLINDADO del token OAuth de Claude vía el brain-relay:
// POST /brain/exec { secret, cmd: "bash /root/agents/refresh_token.sh" }.
// El script reescribe /home/brain-files/token-health.json; al terminar
// releemos ese archivo y devolvemos el estado nuevo. Owner-only. CERO MOCK.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY =
  process.env.HETZNER_URL?.replace(/\/$/, "") ||
  process.env.RELAY_BASE_URL?.replace(/\/$/, "") ||
  "http://178.105.135.26";

const SECRET = process.env.HETZNER_SECRET ?? process.env.BRAIN_SECRET ?? "";
const REFRESH_CMD = "bash /root/agents/refresh_token.sh 2>&1 | tail -n 25";
const HEALTH_URL = `${RELAY}/brain/file/brain-files/token-health.json`;

type ExecResult = { code?: number; stdout?: string; stderr?: string };

async function readHealth(signal: AbortSignal) {
  try {
    const r = await fetch(HEALTH_URL, { cache: "no-store", signal });
    if (!r.ok) return null;
    const raw = (await r.json()) as Record<string, unknown>;
    return {
      hours_left: typeof raw.hours_left === "number" ? raw.hours_left : null,
      status: typeof raw.status === "string" ? raw.status : null,
      checked_at: typeof raw.checked_at === "string" ? raw.checked_at : null,
    };
  } catch {
    return null;
  }
}

export async function POST() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 115000);
  try {
    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd: REFRESH_CMD }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.status === 401) {
      return NextResponse.json({ ok: false, error: "relay rechazó el secret" });
    }
    const exec = (await res.json()) as ExecResult;
    const health = await readHealth(controller.signal);

    // El script sale 0 cuando el token quedó sano; 1 si el refresh falló 3x.
    const ok = exec.code === 0 && health?.status !== "critico";
    return NextResponse.json({
      ok,
      exit: typeof exec.code === "number" ? exec.code : null,
      hours_left: health?.hours_left ?? null,
      status: health?.status ?? null,
      checked_at: health?.checked_at ?? null,
      log: (exec.stdout ?? exec.stderr ?? "").slice(-600),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "relay unreachable";
    return NextResponse.json({ ok: false, error: message });
  } finally {
    clearTimeout(timer);
  }
}
