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

export function Hero() {
  return (
    <>
      {/* ── PAIN SECTION ── */}
      <section style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}>
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/hero/hero-pain.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}/>
        {/* Dark overlay for readability */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, rgba(5,10,20,0.97) 0%, rgba(5,10,20,0.92) 50%, rgba(5,10,20,0.7) 100%)",
          zIndex: 1,
        }}/>

        {/* Mesh orbs */}
        <div style={{
          position: "absolute", top: "-10%", right: "5%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "vf-orb1 14s ease-in-out infinite alternate",
          zIndex: 1,
        }}/>
        <div style={{
          position: "absolute", bottom: "-10%", left: "20%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "vf-orb2 18s ease-in-out infinite alternate",
          zIndex: 1,
        }}/>

        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          zIndex: 1,
        }}/>

        <style>{`
          @keyframes vf-orb1 {
            0% { transform: translate(0,0) scale(1); }
            50% { transform: translate(-40px,30px) scale(1.1); }
            100% { transform: translate(30px,-20px) scale(0.93); }
          }
          @keyframes vf-orb2 {
            0% { transform: translate(0,0) scale(1); }
            50% { transform: translate(60px,-40px) scale(1.08); }
            100% { transform: translate(-30px,50px) scale(0.95); }
          }
          @keyframes vf-fade-in {
            from { opacity:0; transform: translateY(16px); }
            to { opacity:1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 80px", width: "100%", position: "relative", zIndex: 2 }}>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, animation: "vf-fade-in 0.6s ease both" }}>
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

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(3rem, 6.5vw, 5rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
            color: "#FFFFFF",
            maxWidth: 760,
            marginBottom: 28,
            animation: "vf-fade-in 0.7s 0.1s ease both",
            textShadow: "0 2px 40px rgba(0,0,0,0.5)",
          }}>
            La conexion vital entre<br/>
            <span style={{
              background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Git, Vercel y tus agentes
            </span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: "clamp(1.05rem, 1.6vw, 1.2rem)",
            color: "#cbd5e1",
            lineHeight: 1.65,
            maxWidth: 520,
            marginBottom: 44,
            animation: "vf-fade-in 0.7s 0.2s ease both",
            textShadow: "0 1px 12px rgba(0,0,0,0.4)",
          }}>
            VForge conecta tus repositorios, deployments y modelos de IA en un solo flujo.
            Construye, despliega y automatiza con el poder del protocolo MCP.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 60, animation: "vf-fade-in 0.7s 0.3s ease both" }}>
            <Link href="/app" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg, #3b82f6, #6d28d9)", color: "#ffffff",
              fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em",
              padding: "14px 28px", borderRadius: 9999, textDecoration: "none",
              boxShadow: "0 0 32px rgba(59,130,246,0.45), 0 0 80px rgba(109,40,217,0.2)",
              transition: "box-shadow 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 48px rgba(59,130,246,0.6), 0 0 100px rgba(109,40,217,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 32px rgba(59,130,246,0.45), 0 0 80px rgba(109,40,217,0.2)"; }}
            >
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
              border: "1px solid rgba(255,255,255,0.15)", transition: "all 0.15s",
              backdropFilter: "blur(8px)",
            }}>
              Ver precios
            </Link>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 56, animation: "vf-fade-in 0.7s 0.4s ease both" }}>
            {["MCP Bridge","Git + Vercel + VForge","Multi-Agent","Brain Memory"].map(label => (
              <span key={label} style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(15,23,42,0.7)", border: "1px solid rgba(59,130,246,0.18)",
                borderRadius: 9999, padding: "6px 16px", fontSize: 13, color: "#94a3b8",
                letterSpacing: "-0.01em", backdropFilter: "blur(10px)",
              }}>
                {label}
              </span>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 36 }}/>

          {/* Auth row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", animation: "vf-fade-in 0.7s 0.5s ease both" }}>
            <span style={{ fontSize: 12, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
              Accede con
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {AUTH_PROVIDERS.map(provider => (
                <Link key={provider.name} href={provider.href} title={provider.name} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40,
                  background: "rgba(15,23,42,0.85)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 9, color: "#64748b",
                  textDecoration: "none", transition: "all 0.15s ease",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.5)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = "0 0 14px rgba(59,130,246,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {provider.icon}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── HUB SECTION ── */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #050a14 0%, #080d1a 100%)",
        padding: "0",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "60vh",
        }}>
          {/* Left — image */}
          <div style={{
            position: "relative",
            backgroundImage: "url(/hero/hero-hub.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: 480,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 60%, rgba(8,13,26,1) 100%)",
            }}/>
          </div>

          {/* Right — copy */}
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "64px 48px 64px 40px",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#3b82f6",
              marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.5)" }}/>
              Un solo lugar
            </div>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              fontWeight: 600, letterSpacing: "-0.04em",
              lineHeight: 1.08, color: "#FFFFFF", marginBottom: 20,
            }}>
              Crea, deploya<br/>
              <span style={{
                background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                y cobra. Todo junto.
              </span>
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.7, marginBottom: 32, maxWidth: 400 }}>
              GitHub, Vercel, Stripe, y tu modelo de IA favorito — orquestados por VForge en una sola conversacion. Sin abrir 8 tabs. Sin perder el contexto. Sin repetir tokens.
            </p>
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { num: "80%", label: "menos friccion en el flujo" },
                { num: "1", label: "conversacion para produccion" },
                { num: "0", label: "configuracion manual" },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 700, color: "#60a5fa", letterSpacing: "-0.04em" }}>
                    {stat.num}
                  </div>
                  <div style={{ fontSize: 12, color: "#334155", letterSpacing: "-0.01em", marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .vf-hub-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ── FLOW STEPS ── */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #080d1a 0%, #050a14 100%)",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "50vh",
        }}>
          {/* Left — copy */}
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "64px 40px 64px 48px",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#a78bfa",
              marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(167,139,250,0.5)" }}/>
              El flujo completo
            </div>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              fontWeight: 600, letterSpacing: "-0.04em",
              lineHeight: 1.08, color: "#FFFFFF", marginBottom: 20,
            }}>
              Cuatro pasos.<br/>
              <span style={{
                background: "linear-gradient(90deg, #a78bfa 0%, #60a5fa 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                Un producto en produccion.
              </span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { n: "01", t: "Conecta tus tools", d: "GitHub, Vercel, Stripe y tu modelo de IA en minutos." },
                { n: "02", t: "Crea con V", d: "El agente genera codigo, estructura y arquitectura en tu repo." },
                { n: "03", t: "Deploya", d: "Cada push genera un deployment automatico en Vercel." },
                { n: "04", t: "Cobra", d: "Stripe integrado. Tu producto vive y genera ingresos." },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: "0.04em", paddingTop: 3, flexShrink: 0, width: 24 }}>
                    {step.n}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{step.t}</div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — image */}
          <div style={{
            position: "relative",
            backgroundImage: "url(/hero/hero-flow.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: 420,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(270deg, transparent 60%, rgba(8,13,26,1) 100%)",
            }}/>
          </div>
        </div>
      </section>
    </>
  );
        }
