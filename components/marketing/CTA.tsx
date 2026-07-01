import Link from "next/link";

export function CTA() {
  return (
    <section style={{ background: "#000", padding: "100px 24px 120px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #303236", marginBottom: 80 }}/>

        <div style={{ maxWidth: 680 }}>
          {/* Eyebrow */}
          <div style={{
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#6B6B6B",
            display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "#6B6B6B" }}/>
            Empieza hoy
          </div>

          <h2 style={{
            fontSize: "clamp(2rem, 4vw, 3.25rem)",
            fontWeight: 400, letterSpacing: "-0.03em",
            lineHeight: 1.06, color: "#FFFFFF",
            marginBottom: 24,
          }}>
            El flujo que siempre<br/>
            <span style={{ color: "#37C38F" }}>quisiste tener</span>
          </h2>

          <p style={{
            fontSize: 16, color: "#A0A0A0",
            lineHeight: 1.65, marginBottom: 40, maxWidth: 480,
          }}>
            Conecta Git, Vercel y tus agentes de IA en minutos.
            Sin configuraciones complejas. Sin fricción.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/app" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#FFFFFF", color: "#000000",
              fontSize: 14, fontWeight: 500,
              letterSpacing: "-0.02em",
              padding: "12px 22px", borderRadius: 9999,
              textDecoration: "none",
              border: "1px solid #FFFFFF",
              transition: "background 0.15s",
            }}>
              Empieza gratis
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7h10M8 3l4 4-4 4"/>
              </svg>
            </Link>
            <Link href="/developers" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: "#A0A0A0",
              fontSize: 14, fontWeight: 400,
              letterSpacing: "-0.02em",
              padding: "11px 22px", borderRadius: 9999,
              textDecoration: "none",
              border: "1px solid #4A4A4A",
              transition: "all 0.15s",
            }}>
              Leer docs
            </Link>
          </div>

          {/* Trust line */}
          <p style={{
            marginTop: 32, fontSize: 12, color: "#4A4A4A",
            letterSpacing: "-0.01em",
          }}>
            Gratis para empezar · Sin tarjeta de crédito · Beta abierta
          </p>
        </div>

      </div>
    </section>
  );
}

