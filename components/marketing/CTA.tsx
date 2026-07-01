import Link from "next/link";

export function CTA() {
  return (
    <section style={{ position: "relative", background: "linear-gradient(180deg, #050a14 0%, #03060e 100%)", padding: "100px 24px 120px", overflow: "hidden" }}>

      {/* Background glow */}
      <div style={{
        position: "absolute", bottom: "-20%", left: "50%",
        transform: "translateX(-50%)",
        width: 800, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, rgba(109,40,217,0.04) 50%, transparent 70%)",
        filter: "blur(60px)",
        zIndex: 0,
        pointerEvents: "none",
      }}/>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", marginBottom: 80 }}/>

        <div style={{ maxWidth: 680 }}>

          <div style={{
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#334155",
            display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.4)" }}/>
            Empieza hoy
          </div>

          <h2 style={{
            fontSize: "clamp(2rem, 4vw, 3.25rem)",
            fontWeight: 400, letterSpacing: "-0.03em",
            lineHeight: 1.06, color: "#FFFFFF",
            marginBottom: 24,
          }}>
            El flujo que siempre<br/>
            <span style={{
              background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              quisiste tener
            </span>
          </h2>

          <p style={{
            fontSize: 16, color: "#475569",
            lineHeight: 1.65, marginBottom: 40, maxWidth: 480,
          }}>
            Conecta Git, Vercel y tus agentes de IA en minutos.
            Sin configuraciones complejas. Sin friccion.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
              background: "rgba(255,255,255,0.04)", color: "#94a3b8",
              fontSize: 14, fontWeight: 400, letterSpacing: "-0.02em",
              padding: "11px 22px", borderRadius: 9999, textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.15s",
            }}>
              Leer docs
            </Link>
          </div>

          <p style={{
            marginTop: 32, fontSize: 12, color: "#1e293b",
            letterSpacing: "-0.01em",
          }}>
            Gratis para empezar — Sin tarjeta de credito — Beta abierta
          </p>

        </div>

      </div>
    </section>
  );
            }
