import Link from "next/link";

const STEPS = [
  {
    number: "01",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
    title: "Conecta tu repo en GitHub",
    desc: "Autoriza VForge con tu cuenta de GitHub. Accedemos a tus repositorios para leer código, generar contexto y preparar los agentes.",
    tag: "GitHub",
    tagColor: "#FFFFFF",
  },
  {
    number: "02",
    icon: (
      <svg width="22" height="22" viewBox="0 0 76 65" fill="currentColor">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
      </svg>
    ),
    title: "Despliega con Vercel",
    desc: "Vincula tu proyecto a Vercel. Cada push al repositorio genera un deployment automático. VForge orquesta el ciclo completo.",
    tag: "Vercel",
    tagColor: "#FFFFFF",
  },
  {
    number: "03",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L22 20H2L12 2Z" fill="#37C38F" stroke="none"/>
        <path d="M9 14l3-8 3 8M10.5 11.5h3"/>
      </svg>
    ),
    title: "VForge orquesta todo",
    desc: "El Brain MCP centraliza la memoria. Los agentes leen contexto, ejecutan tareas, y el Bridge conecta cada herramienta en tiempo real.",
    tag: "VForge",
    tagColor: "#37C38F",
  },
];

export function Metodo() {
  return (
    <section style={{ background: "#000", padding: "100px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Section header */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#6B6B6B",
            marginBottom: 20,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "#6B6B6B" }}/>
            Cómo funciona
          </div>
          <h2 style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 400, letterSpacing: "-0.03em",
            lineHeight: 1.1, color: "#FFFFFF",
            maxWidth: 600, marginBottom: 16,
          }}>
            El trio que lo conecta todo
          </h2>
          <p style={{
            fontSize: 16, color: "#A0A0A0",
            lineHeight: 1.65, maxWidth: 500,
          }}>
            Git controla el código. Vercel lo despliega. VForge conecta a los agentes.
            Tres piezas, un flujo sin fricción.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #303236", marginBottom: 64 }}/>

        {/* Steps grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 0,
        }}>
          {STEPS.map((step, i) => (
            <div key={step.number} style={{
              padding: "40px 32px",
              borderRight: i < STEPS.length - 1 ? "1px solid #303236" : "none",
              borderBottom: "none",
              position: "relative",
            }}>
              {/* Step number */}
              <div style={{
                fontSize: 12, fontWeight: 500, letterSpacing: "0.05em",
                color: "#4A4A4A", marginBottom: 24,
                fontVariantNumeric: "tabular-nums",
              }}>
                {step.number}
              </div>

              {/* Icon */}
              <div style={{
                width: 44, height: 44,
                background: "#18191B",
                border: "1px solid #303236",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFFFFF",
                marginBottom: 20,
              }}>
                {step.icon}
              </div>

              {/* Content */}
              <h3 style={{
                fontSize: 18, fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#FFFFFF", marginBottom: 12,
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: 14, color: "#A0A0A0",
                lineHeight: 1.65, marginBottom: 20,
              }}>
                {step.desc}
              </p>

              {/* Tag */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent",
                border: "1px solid #303236",
                borderRadius: 9999,
                padding: "4px 12px",
                fontSize: 12, fontWeight: 500,
                color: step.tagColor,
                letterSpacing: "-0.01em",
              }}>
                {step.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Divider bottom */}
        <div style={{ borderTop: "1px solid #303236", marginTop: 0 }}/>

      </div>
    </section>
  );
}

