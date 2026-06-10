"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { IconArrowL, IconBot, IconShield, IconExtLink, IconActivity } from "@/components/brand/VFIcons";

const REMOTE = "https://vulcano.vmomentum.site/vulcano";
const TEAL = "#14b8a6";
const AMBER = "#f5a623";

const LOG_SEED = [
  { t: "ia", m: "Abriendo sesión remota en la nube de VForge…" },
  { t: "ia", m: "Navegando al portal solicitado" },
  { t: "ia", m: "Rellenando formulario (campos no sensibles)" },
  { t: "human", m: "Login detectado → control devuelto al humano" },
  { t: "ia", m: "Esperando tu toque humano para continuar" },
];

export function VulcanoBrowser() {
  const [mode, setMode] = useState<"ia" | "human">("ia");
  const [lines, setLines] = useState<{ t: string; m: string; ts: string }[]>([]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      const s = LOG_SEED[i % LOG_SEED.length];
      const ts = new Date().toLocaleTimeString("es-MX", { hour12: false });
      setLines((p) => [...p.slice(-6), { ...s, ts }]);
      i++;
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const accent = mode === "ia" ? TEAL : AMBER;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--color-void)", color: "var(--color-on-surface)" }}>
      {/* ── BACK BAR ── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 backdrop-blur-xl"
        style={{ borderBottom: "1px solid rgba(127,127,170,0.14)", background: "color-mix(in srgb, var(--color-void) 78%, transparent)" }}>
        <Link href="/" aria-label="Volver al inicio"
          className="flex h-9 w-9 items-center justify-center rounded-xl transition"
          style={{ border: "1px solid rgba(127,127,170,0.18)", color: "var(--color-on-surface-variant)" }}>
          <IconArrowL size={15} />
        </Link>
        <span className="text-sm font-semibold tracking-tight">VForge</span>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>/ Navegador Vulcano</span>
        <div className="ml-auto"><ThemeToggle compact /></div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        {/* ── HERO ── */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1"
          style={{ border: '1px solid ' + accent + '40', background: accent + '12' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: '0 0 10px ' + accent }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>IA &amp; Human</span>
        </div>
        <h1 className="text-[clamp(2rem,6vw,3.4rem)] font-bold leading-[0.95] tracking-[-0.03em]">Navegador Vulcano</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
          Un navegador remoto en la nube de VForge. <b style={{ color: TEAL }}>La IA conduce</b> en verde;
          cuando aparece un login, registro, captcha o pago, <b style={{ color: AMBER }}>tú tomas el control</b> en ámbar.
          La IA nunca hace logins ni pagos — eso siempre lo haces tú.
        </p>
        <p className="mt-5 text-lg font-medium" style={{ color: "var(--color-on-surface)" }}>
          Tú das el toque humano. <span style={{ color: TEAL }}>Vulcano hace el resto.</span>
        </p>

        {/* ── GLASS PANEL: estado + log ── */}
        <div className="mt-8 overflow-hidden rounded-3xl"
          style={{ border: "1px solid rgba(127,127,170,0.16)", background: "color-mix(in srgb, var(--color-surface) 70%, transparent)", boxShadow: "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4" style={{ borderColor: "rgba(127,127,170,0.14)" }}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: accent + '1f', color: accent }}>
                {mode === "ia" ? <IconBot size={16} /> : <IconShield size={16} />}
              </span>
              <div>
                <p className="text-[13px] font-semibold">{mode === "ia" ? "IA conduce" : "Humano en control"}</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{mode === "ia" ? "Vulcano opera el navegador" : "Login / pago / captcha — tú decides"}</p>
              </div>
            </div>
            <button onClick={() => setMode(mode === "ia" ? "human" : "ia")}
              className="ml-auto rounded-xl px-4 py-2 text-[12px] font-semibold transition active:scale-95"
              style={{ background: AMBER, color: "#1a1205" }}>
              {mode === "ia" ? "Tomar control" : "Devolver a la IA"}
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
              <IconActivity size={12} /> Log en vivo
            </div>
            <div className="space-y-1.5 font-mono text-[12px]">
              {lines.length === 0 && <p style={{ color: "var(--color-muted)" }}>Conectando…</p>}
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-muted)" }}>{l.ts}</span>
                  <span style={{ color: l.t === "ia" ? TEAL : AMBER }}>{l.t === "ia" ? "IA" : "YOU"}</span>
                  <span style={{ color: "var(--color-on-surface-variant)" }}>{l.m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <a href={REMOTE} target="_blank" rel="noopener noreferrer"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[15px] font-semibold transition active:scale-[0.99]"
          style={{ background: "linear-gradient(180deg,#27B98A,#0F6E56)", color: "#04241b", boxShadow: "0 10px 40px rgba(20,184,166,0.35)" }}>
          Abrir mi Navegador Vulcano <IconExtLink size={15} />
        </a>
        <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Cada usuario tendrá su propia instancia aislada bajo su responsabilidad. Esta es la instancia owner (Luis), con acceso protegido.
        </p>
      </div>
    </main>
  );
}
