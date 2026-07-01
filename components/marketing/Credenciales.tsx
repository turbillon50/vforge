"use client";
import Link from "next/link";

const PROVIDERS = [
  {
    name: "GitHub",
    desc: "Repositorios, código y contexto completo de tu stack.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
    badge: "Repos & Code",
  },
  {
    name: "Vercel",
    desc: "Deployments, dominios y entornos de producción.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 76 65" fill="currentColor">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
      </svg>
    ),
    badge: "Deploy & Infra",
  },
  {
    name: "Google",
    desc: "Identidad segura y acceso con tu cuenta de Google.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    badge: "Identity",
  },
  {
    name: "X (Twitter)",
    desc: "Autenticación social y presencia en redes.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    badge: "Social",
  },
];

export function Credenciales() {
  return (
    <section style={{ background: "#000", padding: "100px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 64,
        }}>
          <div>
            <div style={{
              fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#6B6B6B",
              display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
            }}>
              <span style={{ display: "inline-block", width: 16, height: 1, background: "#6B6B6B" }}/>
              Autenticación
            </div>
            <h2 style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 400, letterSpacing: "-0.03em",
              lineHeight: 1.1, color: "#FFFFFF", maxWidth: 480,
            }}>
              Entra con las cuentas que ya tienes
            </h2>
          </div>
          <Link href="/app" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", color: "#A0A0A0",
            fontSize: 14, fontWeight: 400,
            letterSpacing: "-0.02em", textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={e => (e.currentTarget.style.color = "#A0A0A0")}
          >
            Ver todas las integraciones
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 7h10M8 3l4 4-4 4"/>
            </svg>
          </Link>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #303236", marginBottom: 0 }}/>

        {/* Providers grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}>
          {PROVIDERS.map((p, i) => (
            <div key={p.name} style={{
              padding: "32px 24px",
              borderRight: i < PROVIDERS.length - 1 ? "1px solid #303236" : "none",
              borderBottom: "1px solid #303236",
            }}>
              <div style={{
                width: 44, height: 44,
                background: "#18191B",
                border: "1px solid #303236",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFFFFF",
                marginBottom: 16,
              }}>
                {p.icon}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <h3 style={{
                  fontSize: 16, fontWeight: 500,
                  letterSpacing: "-0.02em", color: "#FFFFFF",
                }}>
                  {p.name}
                </h3>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: "#37C38F",
                  background: "rgba(55,195,143,0.08)",
                  border: "1px solid rgba(55,195,143,0.2)",
                  borderRadius: 9999, padding: "2px 8px",
                  letterSpacing: "0.02em",
                }}>
                  {p.badge}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom divider */}
        <div style={{ borderTop: "none" }}/>

      </div>
    </section>
  );
}

