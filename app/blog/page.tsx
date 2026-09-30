import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata = {
  title: "Blog",
  description: "Perspectivas sobre MCP, agentes de IA, desarrollo de software y el futuro de los productos digitales.",
};

const POSTS = [
  {
    slug: "mcp-el-protocolo-que-cambia-todo",
    date: "18 jun 2026",
    tag: "MCP",
    title: "MCP: el protocolo que cambia la forma de construir software",
    excerpt: "El Model Context Protocol no es una moda. Es la infraestructura que hace posible que los agentes de IA accedan a herramientas reales, memoria persistente y contexto compartido. Esto es lo que significa para los developers.",
  },
  {
    slug: "por-que-el-contexto-es-el-nuevo-codigo",
    date: "10 jun 2026",
    tag: "Visión",
    title: "Por qué el contexto es el nuevo código",
    excerpt: "Durante décadas, el valor estaba en el código. Ahora el código se genera. El nuevo diferencial es quién tiene el mejor contexto: estructura, memoria, historial de decisiones. VForge está construido sobre esta premisa.",
  },
  {
    slug: "git-vercel-vforge-el-trio-perfecto",
    date: "2 jun 2026",
    tag: "Producto",
    title: "Git + Vercel + VForge: el trío que completa el ciclo",
    excerpt: "GitHub controla versiones. Vercel despliega. VForge conecta los agentes, lee el contexto y orquesta el ciclo completo. No es integración superficial: es un flujo unificado desde la idea hasta producción.",
  },
  {
    slug: "el-desarrollador-del-futuro-es-un-operador",
    date: "25 may 2026",
    tag: "Comunidad",
    title: "El desarrollador del futuro es un operador",
    excerpt: "No un artesano del código, sino un director de orquesta. El rol está evolucionando: de escribir líneas a definir arquitectura, intenciones y sistemas. Las herramientas cambian. La mentalidad también.",
  },
  {
    slug: "construir-con-ia-sin-perder-el-control",
    date: "15 may 2026",
    tag: "Desarrollo",
    title: "Construir con IA sin perder el control de tu stack",
    excerpt: "La autonomía de los agentes es poderosa y peligrosa a la vez. Cómo mantener visibilidad, auditoría y ownership de cada decisión cuando una IA está ejecutando código en tu nombre.",
  },
];

export default function BlogPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050a14 0%, #03060e 100%)" }}>
      <MarketingHeader />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 80px" }}>

        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#334155",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.4)" }}/>
            Blog
          </div>
          <h1 style={{
            fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.08, color: "#FFFFFF",
            marginBottom: 16,
          }}>
            Perspectivas sobre{" "}
            <span style={{
              background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              el futuro del desarrollo
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.65, maxWidth: 500 }}>
            MCP, agentes, infraestructura y la mentalidad detrás de construir productos con IA.
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", marginBottom: 48 }}/>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {POSTS.map((post, _i) => (
            <article
              key={post.slug}
              style={{
                borderBottom: "1px solid rgba(59,130,246,0.06)",
                padding: "36px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "#3b82f6",
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: 9999, padding: "2px 10px",
                }}>
                  {post.tag}
                </span>
                <span style={{ fontSize: 12, color: "#334155" }}>{post.date}</span>
              </div>
              <h2 style={{
                fontSize: "clamp(1.1rem, 2vw, 1.35rem)", fontWeight: 400,
                letterSpacing: "-0.02em", color: "#e2e8f0", marginBottom: 10,
                lineHeight: 1.3,
              }}>
                {post.title}
              </h2>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, marginBottom: 16, maxWidth: 640 }}>
                {post.excerpt}
              </p>
              <span style={{ fontSize: 13, color: "#60a5fa" }}>
                Próximamente
              </span>
            </article>
          ))}
        </div>

      </main>
      <MarketingFooter />
    </div>
  );
    }
