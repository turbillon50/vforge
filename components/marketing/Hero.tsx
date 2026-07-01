"use client";
import Link from "next/link";

const AUTH_PROVIDERS = [
  {
    name: "GitHub",
    href: "/app",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  {
    name: "Vercel",
    href: "/app",
    icon: (
      <svg width="18" height="18" viewBox="0 0 76 65" fill="currentColor">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
      </svg>
    ),
  },
  {
    name: "Google",
    href: "/app",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    name: "X",
    href: "/app",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
];

const FEATURE_PILLS = [
  { label: "MCP Bridge" },
  { label: "Git + Vercel + VForge" },
  { label: "Multi-Agent" },
  { label: "Brain Memory" },
];

export function Hero() {
  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #050a14 0%, #080d1a 40%, #0a0f22 70%, #060b18 100%)", zIndex: 0 }}/>

      <div style={{
        position: "absolute", top: "-15%", right: "-5%",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.08) 45%, transparent 70%)",
        filter: "blur(60px)",
        animation: "vf-orb1 14s ease-in-out infinite alternate",
        zIndex: 1,
      }}/>

      <div style={{
        position: "absolute", bottom: "-10%", left: "-10%",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, rgba(109,40,217,0.06) 45%, transparent 70%)",
        filter: "blur(80px)",
        animation: "vf-orb2 18s ease-in-out infinite alternate",
        zIndex: 1,
      }}/>

      <div style={{
        position: "absolute", top: "40%", left: "30%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(14,165,233,0.10) 0%, rgba(2,132,199,0.04) 50%, transparent 70%)",
        filter: "blur(50px)",
        animation: "vf-orb3 22s ease-in-out infinite alternate",
        zIndex: 1,
      }}/>

      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        zIndex: 1,
      }}/>

      <style>{`
        @keyframes vf-orb1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, 40px) scale(1.12); }
          100% { transform: translate(40px, -30px) scale(0.92); }
        }
        @keyframes vf-orb2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, -50px) scale(1.08); }
          100% { transform: translate(-40px, 60px) scale(0.95); }
        }
        @keyframes vf-orb3 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, 30px) scale(1.15); }
          66% { transform: translate(60px, -40px) scale(0.88); }
          100% { transform: translate(-20px, 60px) scale(1.05); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", position: "relative", zIndex: 2 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(59,130,246,0.1)", color: "#60a5fa",
            border: "1px solid rgba(59,130,246,0.25)", borderRadius: 9999,
            padding: "4px 12px", fontSize: 12, fontWeight: 500,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            <span style={{ width: 6, height: 6, background: "#3b82f6", borderRadius: "50%", display: "inline-block" }}/>
            Plataforma MCP — Beta abierta
          </span>
        </div>

        <h1 style={{
          fontSize: "clamp(2.8rem, 6vw, 4.5rem)", fontWeight: 400,
          letterSpacing: "-0.03em", lineHeight: 1.05, color: "#FFFFFF",
          maxWidth: 900, marginBottom: 24,
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
          fontSize: "clamp(1rem, 1.5vw, 1.125rem)", color: "#94a3b8",
          lineHeight: 1.65, maxWidth: 560, marginBottom: 40, letterSpacing: "-0.01em",
        }}>
          VForge conecta tus repositorios, deployments y modelos de IA en un solo flujo.
          Construye, despliega y automatiza con el poder del protocolo MCP.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 56 }}>
          <Link href="/app" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #3b82f6, #6d28d9)", color: "#ffffff",
            fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em",
            padding: "12px 22px", borderRadius: 9999, textDecoration: "none",
            boxShadow: "0 0 24px rgba(59,130,246,0.35), 0 0 60px rgba(109,40,217,0.15)",
            transition: "box-shadow 0.2s",
          }}>
            Empieza gratis
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 7h10M8 3l4 4-4 4"/>
            </svg>
          </Link>
          <Link href="/developers" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.04)", color: "#e2e8f0",
            fontSize: 14, fontWeight: 400, letterSpacing: "-0.02em",
            padding: "11px 22px", borderRadius: 9999, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.10)", transition: "border-color 0.15s",
          }}>
            Ver documentacion
          </Link>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 64 }}>
          {FEATURE_PILLS.map(pill => (
            <span key={pill.label} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(15,23,42,0.7)", border: "1px solid rgba(59,130,246,0.15)",
              borderRadius: 9999, padding: "6px 14px", fontSize: 13, color: "#94a3b8",
              letterSpacing: "-0.01em", backdropFilter: "blur(8px)",
            }}>
              {pill.label}
            </span>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.12)", marginBottom: 40 }}/>

        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
            Accede con
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {AUTH_PROVIDERS.map(provider => (
              <Link
                key={provider.name}
                href={provider.href}
                title={provider.name}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 38, background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8,
                  color: "#64748b", textDecoration: "none",
                  transition: "all 0.15s ease", backdropFilter: "blur(8px)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(99,102,241,0.2)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.15)";
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {provider.icon}
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
