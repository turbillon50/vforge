"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { IconArrowL, IconCpu, IconDatabase, IconActivity, IconBoxes, IconClock } from "@/components/brand/VFIcons";

const SRC = "https://vulcano.vmomentum.site/status.json";
const TEAL = "#14b8a6";

type Status = {
  iso: string; uptime: number;
  cpu: { cores: number; load1: number; loadPct: number };
  mem: { totalMB: number; usedMB: number; usedPct: number };
  agents: { name: string; count: number }[];
  top: { cpu: number; mem: number; cmd: string }[];
  projects: { id: string; name: string; phase: string; domain: string | null }[];
};

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + "d " : "") + h + "h " + m + "m";
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--color-muted) 25%, transparent)" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: Math.min(100, pct) + "%", background: color, boxShadow: "0 0 12px " + color }} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl p-5" style={{ border: "1px solid rgba(127,127,170,0.16)", background: "color-mix(in srgb, var(--color-surface) 70%, transparent)", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
      {children}
    </div>
  );
}

export function TallerDashboard() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState(false);
  const [age, setAge] = useState(0);
  const lastRef = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(SRC + "?t=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        if (alive) { setS(j); setErr(false); lastRef.current = Date.now(); }
      } catch { if (alive) setErr(true); }
    };
    pull();
    const id = setInterval(pull, 5000);
    const ageId = setInterval(() => setAge(Math.round((Date.now() - lastRef.current) / 1000)), 1000);
    return () => { alive = false; clearInterval(id); clearInterval(ageId); };
  }, []);

  const load = s?.cpu.loadPct ?? 0;
  const pulse = 1 + Math.min(0.5, load / 140);

  return (
    <main style={{ minHeight: "100dvh", background: "var(--color-void)", color: "var(--color-on-surface)" }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 backdrop-blur-xl"
        style={{ borderBottom: "1px solid rgba(127,127,170,0.14)", background: "color-mix(in srgb, var(--color-void) 78%, transparent)" }}>
        <Link href="/" aria-label="Volver al inicio" className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ border: "1px solid rgba(127,127,170,0.18)", color: "var(--color-on-surface-variant)" }}><IconArrowL size={15} /></Link>
        <span className="text-sm font-semibold tracking-tight">VForge</span>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>/ Taller Vulcano</span>
        <div className="ml-auto"><ThemeToggle compact /></div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pb-24 pt-9">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full" style={{ background: err ? "#ef4444" : TEAL, opacity: 0.6 }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: err ? "#ef4444" : TEAL }} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: err ? "#ef4444" : TEAL }}>
            {err ? "Sin señal" : "En vivo"}</span>
          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>· actualizado hace {age}s</span>
        </div>
        <h1 className="mt-2 text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-[-0.03em]">Taller Vulcano</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--color-on-surface-variant)" }}>El reflujo de actividad del taller, en tiempo real — procesos IA, carga y esferas del Brain.</p>

        {/* ORBE que late segun carga */}
        <div className="my-9 flex flex-col items-center">
          <div className="relative flex items-center justify-center" style={{ height: 180, width: 180 }}>
            <div className="absolute rounded-full" style={{ height: 150, width: 150, background: "radial-gradient(circle at 35% 30%, " + TEAL + ", #0f6e56 60%, transparent 72%)", filter: "blur(2px)", transform: "scale(" + pulse + ")", transition: "transform 1.2s ease", boxShadow: "0 0 60px " + TEAL + "66, inset 0 0 40px rgba(0,0,0,0.4)" }} />
            <div className="absolute rounded-full" style={{ height: 178, width: 178, border: "1px solid " + TEAL + "40", animation: "vfping 2.6s ease-out infinite" }} />
            <div className="relative text-center">
              <p className="text-3xl font-bold" style={{ color: "#04241b" }}>{load}%</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#04241b" }}>carga</p>
            </div>
          </div>
        </div>

        {/* Cards CPU / RAM / Uptime */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}><IconCpu size={13} /> CPU</div>
            <p className="mt-2 text-2xl font-bold">{s?.cpu.cores ?? "—"} <span className="text-sm font-normal" style={{ color: "var(--color-muted)" }}>vCPU</span></p>
            <p className="text-[12px]" style={{ color: "var(--color-on-surface-variant)" }}>load {s?.cpu.load1 ?? "—"}</p>
            <Bar pct={load} color={TEAL} />
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}><IconDatabase size={13} /> RAM</div>
            <p className="mt-2 text-2xl font-bold">{s ? (s.mem.usedMB / 1024).toFixed(1) : "—"}<span className="text-sm font-normal" style={{ color: "var(--color-muted)" }}> / {s ? (s.mem.totalMB / 1024).toFixed(0) : "—"} GB</span></p>
            <p className="text-[12px]" style={{ color: "var(--color-on-surface-variant)" }}>{s?.mem.usedPct ?? "—"}% en uso</p>
            <Bar pct={s?.mem.usedPct ?? 0} color="#a78bfa" />
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}><IconClock size={13} /> Uptime</div>
            <p className="mt-2 text-2xl font-bold">{s ? fmtUptime(s.uptime) : "—"}</p>
            <p className="text-[12px]" style={{ color: "var(--color-on-surface-variant)" }}>taller-vulcano</p>
          </Card>
        </div>

        {/* Agentes IA activos */}
        <h2 className="mt-9 mb-3 flex items-center gap-2 text-sm font-semibold"><IconActivity size={15} style={{ color: TEAL }} /> Procesos IA activos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(s?.agents ?? []).map((a) => {
            const on = a.count > 0;
            return (
              <div key={a.name} className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ border: "1px solid " + (on ? TEAL + "40" : "rgba(127,127,170,0.14)"), background: on ? TEAL + "10" : "transparent" }}>
                <span className="text-[13px] font-medium" style={{ color: on ? "var(--color-on-surface)" : "var(--color-muted)" }}>{a.name.trim()}</span>
                <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: on ? TEAL : "var(--color-muted)" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? TEAL : "var(--color-muted)", boxShadow: on ? "0 0 8px " + TEAL : "none" }} />{a.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Esferas / proyectos del Brain */}
        <h2 className="mt-9 mb-3 flex items-center gap-2 text-sm font-semibold"><IconBoxes size={15} style={{ color: TEAL }} /> Esferas del Brain</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(s?.projects ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ border: "1px solid rgba(127,127,170,0.16)", background: "color-mix(in srgb, var(--color-surface) 60%, transparent)" }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold" style={{ background: TEAL + "1f", color: TEAL }}>{p.name.slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.name}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--color-muted)" }}>{p.domain || p.id}</p>
              </div>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "color-mix(in srgb, var(--color-muted) 18%, transparent)", color: "var(--color-on-surface-variant)" }}>{p.phase}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{"@keyframes vfping{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.25);opacity:0}}"}</style>
    </main>
  );
}
