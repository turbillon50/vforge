import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata = {
  title: "Manifiesto — VForge",
  description: "Lo que creemos sobre el futuro del software, los agentes y la forma de construir productos.",
};

const PRINCIPLES = [
  {
    number: "01",
    title: "El software se conversa, no se teclea",
    body: "La interfaz natural con las maquinas siempre fue el lenguaje. Tardamos decadas en llegar, pero llegamos. El codigo ya no es el fin — es el medio. El fin es el producto. Y el producto nace en una conversacion.",
  },
  {
    number: "02",
    title: "El contexto es el activo mas valioso",
    body: "Un agente sin contexto es una maquina sin memoria. El verdadero valor no esta en el modelo de lenguaje — esta en quien tiene el mejor contexto: arquitectura del proyecto, historial de decisiones, integraciones vivas, estado actual del sistema. VForge existe para construir y preservar ese contexto.",
  },
  {
    number: "03",
    title: "Infraestructura sin friccion es libertad creativa",
    body: "Cada hora que un equipo pasa configurando entornos, resolviendo deploys o sincronizando herramientas es una hora que no pasan construyendo. La infraestructura debe ser invisible. El flujo debe ser continuo. Git, Vercel y VForge forman el ciclo que hace eso posible.",
  },
  {
    number: "04",
    title: "Los agentes son colaboradores, no ejecutores ciegos",
    body: "La autonomia de un agente vale segun la calidad de sus instrucciones y la claridad de su contexto. Confiamos en los agentes cuando entendemos lo que hacen. Por eso VForge no oculta — muestra. Cada accion, cada decision, cada herramienta usada es visible para quien la necesite.",
  },
  {
    number: "05",
    title: "Construir en LATAM con estandares globales",
    body: "No hay razon para que un equipo en Guadalajara, Buenos Aires o Bogota trabaje con herramientas de segunda. VForge nace en LATAM, piensa en LATAM y construye para competir en cualquier parte del mundo. La geografia no define el techo.",
  },
  {
    number: "06",
    title: "Abierto por defecto, privado cuando importa",
    body: "El codigo abierto acelera el progreso colectivo. Creemos en compartir lo que construimos cuando hacerlo no compromete la confianza de quienes dependen de nosotros. El puente MCP es publico. La memoria de tus proyectos es tuya.",
  },
  {
    number: "07",
    title: "El operador reemplaza al artesano",
    body: "El rol del desarrollador esta evolucionando. Menos escritura de lineas, mas diseno de sistemas. Menos ejecucion, mas direccion. El operador define la intencion, establece los limites y supervisa el flujo. Los agentes ejecutan. La inteligencia sigue siendo humana.",
  },
];

export default function ManifiestoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050a14 0%, #03060e 100%)" }}>
      <MarketingHeader />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px" }}>

        <div style={{ marginBottom: 80 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#334155",
            marginBottom: 24, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.4)" }}/>
            Manifiesto
          </div>
          <h1 style={{
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 300,
            letterSpacing: "-0.04em", lineHeight: 1.05, color: "#FFFFFF",
            marginBottom: 32,
          }}>
            Lo que creemos sobre el software,{" "}
            <span style={{
              background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              fontWeight: 400,
            }}>
              los agentes y el futuro
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.7, maxWidth: 560 }}>
            VForge no es solo una herramienta. Es una postura sobre como se construyen los productos digitales en la era de la inteligencia artificial.
            Esto es lo que nos mueve.
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", marginBottom: 72 }}/>

        <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.number} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 32 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: "#334155",
                letterSpacing: "0.04em", paddingTop: 6,
                fontVariantNumeric: "tabular-nums",
              }}>
                {p.number}
              </div>
              <div>
                <h2 style={{
                  fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 400,
                  letterSpacing: "-0.025em", color: "#e2e8f0",
                  marginBottom: 16, lineHeight: 1.3,
                }}>
                  {p.title}
                </h2>
                <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75 }}>
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", margin: "80px 0 48px" }}/>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#334155", marginBottom: 8 }}>
            Publicado el 1 de julio de 2026
          </p>
          <p style={{ fontSize: 13, color: "#1e293b" }}>
            All Global Holding LLC — VForge Team
          </p>
        </div>

      </main>
      <MarketingFooter />
    </div>
  );
    }
