export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = process.env.RELAY_BASE_URL ?? "http://178.105.135.26";
// El secreto del relay vive SOLO en env (BRAIN_SECRET, ya configurado en Vercel).
// Sin fallback hardcodeado: si falta, el GET degrada con gracia a su catch.
const SECRET = process.env.BRAIN_SECRET ?? "";

interface Pm2Proc {
  name: string;
  pm2_env?: { status?: string };
}

export async function GET() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ error: "no auth" }, { status: 401 });
  }

  try {
    const res = await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: SECRET,
        cmd: "pm2 jlist 2>/dev/null | head -c 4000",
      }),
      cache: "no-store",
    });

    const data = await res.json();
    const raw = typeof data?.output === "string" ? data.output : data;
    const procs = typeof raw === "string" ? JSON.parse(raw) : raw;

    const automations = (Array.isArray(procs) ? procs : []).map((p: Pm2Proc) => ({
      name: p.name,
      type: "daemon",
      status: p.pm2_env?.status || "unknown",
      detail: "",
    }));

    return NextResponse.json({ ok: true, live: true, automations });
  } catch {
    return NextResponse.json({
      ok: false,
      live: false,
      automations: [
        { name: "Daemon Vulcano", type: "daemon", status: "active", detail: "esferas" },
        { name: "Auto-refresh token", type: "cron", status: "active", detail: "cada hora" },
      ],
    });
  }
}
