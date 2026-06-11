export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/taller/route.ts
// Proxy owner-only al brain-relay de Hetzner. Trae estado de procesos pm2 y
// métricas vivas para el panel del Taller. Nunca expone el secret al cliente.

import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "";

// Node del host (documentado en CLAUDE.md) con fallback a `node` en PATH.
// Emite JSON compacto {services, metrics} para evitar truncado de pm2 jlist.
const HOST_NODE = "/root/.nvm/versions/node/v20.20.2/bin/node";
const PROBE_CMD =
  `NODE=${HOST_NODE}; command -v "$NODE" >/dev/null 2>&1 || NODE=node; ` +
  `"$NODE" -e 'const cp=require("child_process");` +
  `function sh(c){try{return cp.execSync(c,{encoding:"utf8",timeout:8000}).trim()}catch(e){return ""}}` +
  `let svc=[];try{svc=JSON.parse(sh("pm2 jlist 2>/dev/null")||"[]").map(p=>({name:p.name,status:(p.pm2_env&&p.pm2_env.status)||"unknown"}))}catch(e){}` +
  `const online=svc.filter(s=>s.status==="online").length;` +
  `console.log(JSON.stringify({services:svc,metrics:{servicesOnline:online,servicesTotal:svc.length}}))'`;

type ExecResult = { code?: number; stdout?: string; stderr?: string };

async function brainExec(cmd: string, signal: AbortSignal): Promise<ExecResult> {
  const r = await fetch(`${RELAY}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, cmd }),
    cache: "no-store",
    signal,
  });
  return (await r.json()) as ExecResult;
}

export async function GET() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const startedAt = Date.now();

  try {
    const res = await brainExec(PROBE_CMD, controller.signal);
    const latencyMs = Date.now() - startedAt;

    let services: { name: string; status: string }[] = [];
    let servicesOnline = 0;
    let servicesTotal = 0;
    try {
      const parsed = JSON.parse((res.stdout ?? "").trim() || "{}");
      if (Array.isArray(parsed.services)) services = parsed.services;
      servicesOnline = Number(parsed.metrics?.servicesOnline ?? 0);
      servicesTotal = Number(parsed.metrics?.servicesTotal ?? services.length);
    } catch {
      // stdout no parseable → dejamos métricas vacías pero live según code.
    }

    const live = res.code === 0 || services.length > 0;

    const events = services
      .filter((s) => s.status !== "online")
      .slice(0, 3)
      .map((s) => ({ label: `${s.name} · ${s.status}`, tone: "violet" as const }));
    if (events.length === 0 && services.length > 0) {
      events.push({ label: `${servicesOnline} procesos en línea`, tone: "violet" as const });
    }

    return NextResponse.json({
      ok: true,
      live,
      services,
      events,
      metrics: { servicesOnline, servicesTotal, latencyMs },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "relay unreachable";
    return NextResponse.json({
      ok: false,
      live: false,
      services: [],
      events: [],
      metrics: {},
      error: message,
    });
  } finally {
    clearTimeout(timer);
  }
}
