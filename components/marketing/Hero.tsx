"use client";
import Link from "next/link";

const AUTH_PROVIDERS = [
  { name: "GitHub", href: "/app", svg: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z", vb: "0 0 24 24" },
  { name: "Vercel", href: "/app", svg: "M37.5274 0L75.0548 65H0L37.5274 0Z", vb: "0 0 76 65" },
];

const PILLS = ["MCP Bridge", "Git + Vercel + VForge", "Multi-Agent", "Brain Memory"];

export function Hero() {
  return (
    <section style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "120px 24px 80px",
      overflow: "hidden",
    }}>
      {/* Background image — developer pain point */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/hero/hero-pain.png)",
        backgroundSize: "cover",
        backgroundPosition: "right center",
        zIndex: 0,
      }}/>
      {/* Heavy dark overlay so our text dominates */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, rgba(5,10,20,0.97) 0%, rgba(5,10,20,0.93) 55%, rgba(5,10,20,0.7) 100%)",
        zIndex: 1,
      }}/>
      {/* Blue mesh orbs */}
      <div style={{
        position: "absolute", top: "-15%", right: "-5%",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 45%, transparent 70%)",
        filter: "blur(60px)", animation: "vf-orb1 14s ease-in-out infinite alternate", zIndex: 1,
      }}/>
      <div style={{
        position: "absolute", bottom: "-10%", left: "-10%",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(109,40,217,0.05) 45%, transparent 70%)",
        filter: "blur(80px)", animation: "vf-orb2 18s ease-in-out infinite alternate", zIndex: 1,
      }}/>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)",
        backgroundSize: "64px 64px", zIndex: 1,
      }}/>

      <style>{`
        @keyframes vf-orb1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,40px) scale(1.12)} 100%{transform:translate(40px,-30px) scale(0.92)} }
        @keyframes vf-orb2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(80px,-50px) scale(1.08)} 100%{transform:translate(-40px,60px) scale(0.95)} }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", position: "relative", zIndex: 2 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(59,130,246,0.12)", color: "#60a5fa",
            border: "1px solid rgba(59,130,246,0.3)", borderRadius: 9999,
            padding: "4px 14px", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span style={{ width: 6, height: 6, background: "#3b82f6", borderRadius: "50%", display: "inline-block" }}/>
            Plataforma MCP — Beta abierta
          </span>
        </div>

        <h1 style={{
          fontSize: "clamp(3rem, 6.5vw, 5rem)", fontWeight: 700,
          letterSpacing: "-0.04em", lineHeight: 1.0, color: "#FFFFFF",
          maxWidth: 760, marginBottom: 28,
          textShadow: "0 2px 40px rgba(0,0,0,0.6)",
        }}>
          La conexion vital entre<br/>
          <span style={{
            background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Git, Vercel y tus agentes
          </span>
        </h1>

        <p style={{
          fontSize: "clamp(1.05rem, 1.6vw, 1.2rem)", color: "#cbd5e1",
          lineHeight: 1.65, maxWidth: 520, marginBottom: 44,
          textShadow: "0 1px 12px rgba(0,0,0,0.5)",
        }}>
          VForge conecta tus repositorios, deployments y modelos de IA en un solo flujo.
          Construye, despliega y automatiza con el poder del protocolo MCP.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 60 }}>
          <Link href="/app" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #3b82f6, #6d28d9)", color: "#ffffff",
            fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em",
            padding: "14px 28px", borderRadius: 9999, textDecoration: "none",
            boxShadow: "0 0 32px rgba(59,130,246,0.45), 0 0 80px rgba(109,40,217,0.2)",
          }}>
            Empieza gratis
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h10M8 3l4 4-4 4"/>
            </svg>
          </Link>
          <Link href="/pricing" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)", color: "#e2e8f0",
            fontSize: 15, fontWeight: 400, letterSpacing: "-0.02em",
            padding: "13px 24px", borderRadius: 9999, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
          }}>
            Ver precios
          </Link>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 56 }}>
          {PILLS.map(label => (
            <span key={label} style={{
              display: "inline-flex", alignItems: "center",
              background: "rgba(15,23,42,0.75)", border: "1px solid rgba(59,130,246,0.18)",
              borderRadius: 9999, padding: "6px 16px", fontSize: 13, color: "#94a3b8",
              backdropFilter: "blur(10px)",
            }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 36 }}/>

        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
            Accede con
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {AUTH_PROVIDERS.map(p => (
              <Link key={p.name} href={p.href} title={p.name} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(255,255,255,0.10)", borderRadius: 9,
                color: "#64748b", textDecoration: "none", backdropFilter: "blur(8px)",
              }}>
                <svg width="18" height="18" viewBox={p.vb} fill="currentColor">
                  <path d={p.svg}/>
                </svg>
              </Link>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "#334155" }}>
            GitHub — Vercel — Google — X
          </span>
        </div>

      </div>
    </section>
  );
            }
