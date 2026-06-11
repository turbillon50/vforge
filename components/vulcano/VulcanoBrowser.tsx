"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { IconArrowL, IconShield, IconActivity } from "@/components/brand/VFIcons";

// URLs reales — el iframe carga el KasmVNC autenticado via nginx proxy
const VNC_URL  = "https://vulcano.vmomentum.site/";
const API_BASE = "https://vulcano.vmomentum.site/api";
const TEAL  = "#14b8a6";
const AMBER = "#f5a623";
const POLL  = 3500; // ms

type LogLine = { type: "ok"|"need"|"ia"; msg: string; ts: number };
type HandoffState = { driver: "vulcano"|"human"; handoff: { active: boolean; reason: string }; log: LogLine[] };

export function VulcanoBrowser() {
  const { user } = useUser();
  const [state, setState]   = useState<HandoffState | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Poll handoff API cada 3.5s
  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/handoff`, { cache: "no-store" });
      if (!r.ok) throw new Error(`API ${r.status}`);
      const d: HandoffState = await r.json();
      setState(d);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL);
    return () => clearInterval(id);
  }, [poll]);

  const takeControl = async () => {
    setTaking(true);
    await fetch(`${API_BASE}/handoff/take`, { method: "POST" }).catch(() => {});
    await poll();
    setTaking(false);
  };

  const returnControl = async () => {
    setTaking(true);
    await fetch(`${API_BASE}/handoff/done`, { method: "POST" }).catch(() => {});
    await poll();
    setTaking(false);
  };

  const isHuman  = state?.driver === "human";
  const needsYou = state?.handoff?.active ?? false;
  const accent   = isHuman ? AMBER : TEAL;
  const logs     = [...(state?.log ?? [])].reverse().slice(0, 10);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 360px",
      height: "100dvh",
      background: "#07070d",
      color: "#e7ecf2",
      fontFamily: "Inter, -apple-system, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── LEFT: iframe KasmVNC ── */}
      <div style={{ position: "relative", background: "#000", borderRight: "1px solid rgba(127,127,170,0.1)" }}>

        {/* Top pill — quien conduce */}
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 10,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 999,
          background: accent + "18", border: `1px solid ${accent}40`,
          fontSize: 12, fontWeight: 600, color: accent,
          pointerEvents: "none",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: accent, boxShadow: `0 0 10px ${accent}`,
            animation: "pulse 2s infinite",
          }}/>
          {isHuman ? "Tu turno" : "Vulcano conduciendo"}
        </div>

        {/* Banner ámbar cuando Vulcano pide tu turno */}
        {needsYou && (
          <div style={{
            position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
            zIndex: 10, padding: "8px 18px", borderRadius: 10,
            background: "rgba(133,79,11,0.22)", border: `1px solid ${AMBER}50`,
            color: "#f2c879", fontSize: 13, fontWeight: 600,
            backdropFilter: "blur(8px)", whiteSpace: "nowrap",
          }}>
            ⚠ Vulcano se detuvo — {state?.handoff?.reason || "tu acción requerida"}
          </div>
        )}

        {/* El iframe REAL del KasmVNC */}
        <iframe
          ref={iframeRef}
          src={VNC_URL}
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          allow="clipboard-read; clipboard-write"
          title="Navegador Vulcano"
        />

        {/* Overlay cuando no hay sesión */}
        {error && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(7,7,13,0.92)", gap: 12,
          }}>
            <span style={{ fontSize: 40 }}>🔌</span>
            <p style={{ color: "#8a95a3", fontSize: 14 }}>Reconectando al navegador…</p>
            <p style={{ color: "#444", fontSize: 12 }}>{error}</p>
          </div>
        )}
      </div>

      {/* ── RIGHT: panel VForge branded ── */}
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflowY: "auto" }}>

        {/* Header VForge */}
        <div style={{
          padding: "16px 20px 14px",
          borderBottom: "1px solid rgba(127,127,170,0.1)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Link href="/app" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 10,
            border: "1px solid rgba(127,127,170,0.18)",
            color: "#8a95a3", textDecoration: "none", fontSize: 14,
          }}>←</Link>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: `radial-gradient(circle at 30% 30%, ${TEAL}, #0f6e56)`,
                boxShadow: `0 0 12px ${TEAL}60`,
              }}/>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.2 }}>Navegador Vulcano</span>
            </div>
            <span style={{ fontSize: 11, color: "#8a95a3", letterSpacing: "0.4px", textTransform: "uppercase" }}>
              IA &amp; Human · VForge
            </span>
          </div>

          {/* User avatar */}
          {user && (
            <div style={{
              marginLeft: "auto", width: 30, height: 30, borderRadius: "50%",
              background: accent + "30", border: `1.5px solid ${accent}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: accent,
            }}>
              {user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>

        {/* Status row */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(127,127,170,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%",
              background: accent, boxShadow: `0 0 8px ${accent}`,
            }}/>
            <span style={{ color: accent }}>{isHuman ? "Tu turno" : "Vulcano conduciendo"}</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8a95a3" }}>
            {isHuman
              ? "Estás al control. Haz lo que necesitas y devuelve cuando termines."
              : "La IA opera el navegador. Tú entras cuando hay un login, captcha o pago."}
          </p>
        </div>

        {/* Handoff card — solo aparece cuando Vulcano pide tu turno */}
        {needsYou && !isHuman && (
          <div style={{
            margin: "14px 16px", padding: 16, borderRadius: 14,
            background: "rgba(133,79,11,0.15)", border: `1px solid ${AMBER}40`,
          }}>
            <h4 style={{ margin: "0 0 6px", fontSize: 15, color: "#f4ce83", fontWeight: 700 }}>
              🟠 Tu turno — acción requerida
            </h4>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#d9c7a6", lineHeight: 1.5 }}>
              {state?.handoff?.reason || "Vulcano necesita tu intervención para continuar."}
            </p>
            <button onClick={takeControl} disabled={taking} style={{
              width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
              background: AMBER, color: "#1a0f00", fontSize: 13, fontWeight: 700,
              cursor: "pointer", opacity: taking ? 0.6 : 1,
            }}>
              {taking ? "Conectando…" : "Tomar control"}
            </button>
          </div>
        )}

        {/* Devolver control — solo cuando el humano tiene el control */}
        {isHuman && (
          <div style={{ margin: "14px 16px" }}>
            <button onClick={returnControl} disabled={taking} style={{
              width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
              background: TEAL, color: "#001a14", fontSize: 13, fontWeight: 700,
              cursor: "pointer", opacity: taking ? 0.6 : 1,
            }}>
              {taking ? "Transfiriendo…" : "✓ Terminé — devolver a Vulcano"}
            </button>
          </div>
        )}

        {/* Log en tiempo real */}
        <div style={{ flex: 1, padding: "0 16px 16px", overflowY: "auto" }}>
          <div style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "1px",
            color: "#8a95a3", marginBottom: 10, marginTop: 4,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <IconActivity size={11}/> Log en tiempo real
          </div>
          {logs.length === 0 ? (
            <p style={{ fontSize: 12, color: "#444" }}>Conectando…</p>
          ) : logs.map((ev, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, padding: "6px 0",
              borderBottom: "1px solid rgba(127,127,170,0.06)",
              fontSize: 12,
            }}>
              <span style={{ color: ev.type === "need" ? AMBER : ev.type === "ia" ? TEAL : "#6fe0bb", flexShrink: 0 }}>
                {ev.type === "need" ? "⚠" : "✓"}
              </span>
              <span style={{ flex: 1, color: ev.type === "need" ? "#f2c879" : "#c9d5e0", lineHeight: 1.4 }}>
                {ev.msg}
              </span>
              <span style={{ color: "#444", fontSize: 10, flexShrink: 0 }}>
                {new Date(ev.ts).toLocaleTimeString("es-MX", { hour12: false })}
              </span>
            </div>
          ))}
        </div>

        {/* Guardrails footer */}
        <div style={{
          padding: "12px 16px", borderTop: "1px solid rgba(127,127,170,0.08)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <IconShield size={13} style={{ color: "#8a95a3", flexShrink: 0, marginTop: 2 }}/>
          <p style={{ margin: 0, fontSize: 11, color: "#8a95a3", lineHeight: 1.5 }}>
            La IA <b>nunca</b> hace logins, registros, captchas ni pagos.
            Eres responsable de lo que realices cuando tomas el control.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
