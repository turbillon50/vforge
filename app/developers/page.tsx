import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const PUBLIC_TOOLS_CURL = `curl -s https://vforge.site/api/mcp/public \\
  -H 'content-type: application/json' \\
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

const MCP_SURFACES = [
  {
    label: "Privado",
    endpoint: "https://vforge.site/api/mcp",
    auth: "Bearer vfmcp_... u OAuth",
    body: "Para clientes MCP conectados a una cuenta de VForge. Las tools privadas dependen del token y sus permisos.",
  },
  {
    label: "Público",
    endpoint: "https://vforge.site/api/mcp/public",
    auth: "Sin autenticación",
    body: "Para probar el servidor sin credenciales. Solo expone getting_started, vforge_method y help.",
  },
];

const PILLARS = [
  {
    icon: "MCP",
    title: "MCP real",
    desc: "El servidor responde JSON-RPC sobre HTTP y anuncia únicamente las tools que el scope puede usar.",
  },
  {
    icon: "Auth",
    title: "Bearer u OAuth",
    desc: "Puedes presentar un token vfmcp_ o conectar un cliente compatible con OAuth mediante la metadata pública.",
  },
  {
    icon: "Pub",
    title: "Superficie pública",
    desc: "El endpoint público sirve para descubrir y probar VForge sin tocar datos de cuentas privadas.",
  },
];

export const metadata: Metadata = {
  title: "Developers",
  description: "MCP real de VForge para integrar agentes y clientes compatibles.",
};

export default function DevelopersPage() {
  return (
    <div style={{ background:"#020408", minHeight:"100vh", color:"#e2e8f0" }}>
      <MarketingHeader />

      <section style={{ padding:"140px 24px 96px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:999, padding:"5px 14px", marginBottom:28 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#818cf8", display:"inline-block" }} />
          <span style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"#818cf8" }}>API PÚBLICA · Beta</span>
        </div>
        <h1 style={{ fontSize:"clamp(40px, 6vw, 72px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05, margin:"0 0 24px", color:"#ffffff" }}>
          Integra VForge<br />
          <span style={{ background:"linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #60a5fa 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>por MCP.</span>
        </h1>
        <p style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7, maxWidth:620, margin:"0 0 40px" }}>
          Hoy la superficie pública real de VForge es su servidor MCP. No hay SDK npm, CLI pública ni paquete Python oficial: conecta un cliente compatible por HTTP, con token Bearer u OAuth cuando necesites acceso privado.
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <Link href="/mcp" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:10, background:"linear-gradient(135deg, #6366f1, #8b5cf6)", color:"#fff", fontWeight:700, fontSize:15, textDecoration:"none" }}>
            Ver guía MCP
          </Link>
          <a href="#quickstart" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", fontWeight:500, fontSize:15, textDecoration:"none" }}>
            Probar público
          </a>
        </div>
      </section>

      <section id="quickstart" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.015)", padding:"64px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>Quickstart</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 32px" }}>Lista las tools públicas</h2>
          <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", opacity:0.7 }} />
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#f59e0b", opacity:0.7 }} />
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e", opacity:0.7 }} />
              <span style={{ marginLeft:8, fontSize:12, color:"#8695aa", fontFamily:"monospace" }}>terminal</span>
            </div>
            <pre style={{ margin:0, padding:"24px 28px", overflowX:"auto", color:"#e2e8f0", fontFamily:"monospace", fontSize:14, lineHeight:1.8 }}>
              {PUBLIC_TOOLS_CURL}
            </pre>
          </div>
        </div>
      </section>

      <section style={{ padding:"96px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>DISEÑADO para agentes</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 48px" }}>Sin paquetes fantasma.</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:1, border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, overflow:"hidden" }}>
            {PILLARS.map((p) => (
              <div key={p.title} style={{ background:"#080d18", padding:"32px 28px", borderRight:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"#3b82f6", marginBottom:16, padding:"4px 10px", background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:6, display:"inline-block" }}>{p.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", margin:"0 0 10px", letterSpacing:"-0.02em" }}>{p.title}</h3>
                <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7, margin:0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"96px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>Endpoints MCP</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 40px" }}>Lo que existe hoy</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:16 }}>
            {MCP_SURFACES.map((surface) => (
              <div key={surface.endpoint} style={{ background:"#080d18", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"28px 24px" }}>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"#818cf8", margin:"0 0 12px" }}>{surface.label}</p>
                <code style={{ display:"block", fontFamily:"monospace", fontSize:13, color:"#cbd5e1", background:"rgba(255,255,255,0.07)", padding:"8px 12px", borderRadius:6, wordBreak:"break-all" }}>{surface.endpoint}</code>
                <p style={{ fontSize:12, color:"#a78bfa", margin:"14px 0 8px" }}>{surface.auth}</p>
                <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7, margin:0 }}>{surface.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"96px 24px 120px" }}>
        <div style={{ maxWidth:640, margin:"0 auto", textAlign:"center" as const }}>
          <h2 style={{ fontSize:"clamp(28px, 4vw, 44px)", fontWeight:800, letterSpacing:"-0.04em", color:"#ffffff", margin:"0 0 16px", lineHeight:1.1 }}>
            Conecta tu agente con VForge.
          </h2>
          <p style={{ fontSize:16, color:"#94a3b8", margin:"0 0 36px", lineHeight:1.7 }}>
            Crea una cuenta para obtener un token MCP privado o usa la ruta pública para explorar el protocolo.
          </p>
          <Link href="/sign-up" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"14px 32px", borderRadius:12, background:"linear-gradient(135deg, #6366f1, #8b5cf6)", color:"#fff", fontWeight:700, fontSize:16, textDecoration:"none" }}>
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
