import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const ENDPOINTS = [
  { method: "POST", path: "/v1/chat", desc: "Envia un mensaje al agente V y recibe respuesta en streaming.", auth: true },
  { method: "GET", path: "/v1/projects", desc: "Lista todos los proyectos del workspace con estado de deploy.", auth: true },
  { method: "POST", path: "/v1/deploy", desc: "Dispara un deploy en Vercel desde cualquier rama.", auth: true },
  { method: "GET", path: "/v1/repos", desc: "Obtén la estructura y ramas de todos tus repositorios.", auth: true },
  { method: "POST", path: "/v1/mcp/tools/call", desc: "Ejecuta cualquier herramienta MCP registrada en tu Brain.", auth: true },
];

const SDKS = [
  { lang: "TypeScript", install: "npm install @vforge/sdk", color: "#3b82f6" },
  { lang: "Python", install: "pip install vforge", color: "#a855f7" },
  { lang: "cURL", install: "nativo - sin instalacion", color: "#10b981" },
];

const PILLARS = [
  { icon: "MCP", title: "MCP-nativo", desc: "Cada herramienta es un tool MCP. Conecta tu propio agente al Brain de VForge con una URL y un token." },
  { icon: "RT", title: "Webhooks en tiempo real", desc: "Recibe eventos de deploy, builds y commits al instante. Cero polling, cero latencia." },
  { icon: "Auth", title: "Auth con Bearer token", desc: "Un token por workspace. Scope granular por recurso. Rotacion sin downtime." },
  { icon: "SDK", title: "SDK tipado", desc: "TypeScript-first. Inferencia completa en cada respuesta. Sin any, sin sorpresas." },
];

export const metadata = {
  title: "Developers — VForge",
  description: "API, SDK y protocolo MCP para integrar VForge en tus propios agentes y flujos.",
};

export default function DevelopersPage() {
  return (
    <div style={{ background:"#020408", minHeight:"100vh", color:"#e2e8f0" }}>
      <MarketingHeader />

      <section style={{ padding:"140px 24px 96px", maxWidth:960, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:999, padding:"5px 14px", marginBottom:28 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#818cf8", display:"inline-block" }} />
          <span style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"#818cf8" }}>API publica · Beta</span>
        </div>
        <h1 style={{ fontSize:"clamp(40px, 6vw, 72px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05, margin:"0 0 24px", color:"#ffffff" }}>
          Construye sobre<br />
          <span style={{ background:"linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #60a5fa 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>el stack de VForge.</span>
        </h1>
        <p style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7, maxWidth:560, margin:"0 0 40px" }}>
          REST API completa, protocolo MCP y SDKs con tipos. Integra tu agente, tu CI/CD o tu producto directamente con el Brain de VForge.
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <Link href="/sign-up" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:10, background:"linear-gradient(135deg, #6366f1, #8b5cf6)", color:"#fff", fontWeight:700, fontSize:15, textDecoration:"none" }}>
            Obtener API key
          </Link>
          <a href="#endpoints" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", fontWeight:500, fontSize:15, textDecoration:"none" }}>
            Ver endpoints
          </a>
        </div>
      </section>

      <section style={{ borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.015)", padding:"64px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>Quickstart</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 32px" }}>Tres lineas para empezar</h2>
          <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", opacity:0.7 }} />
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#f59e0b", opacity:0.7 }} />
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e", opacity:0.7 }} />
              <span style={{ marginLeft:8, fontSize:12, color:"#8695aa", fontFamily:"monospace" }}>terminal</span>
            </div>
            <div style={{ padding:"24px 28px", fontFamily:"monospace", fontSize:14, lineHeight:2 }}>
              <div style={{ color:"#8695aa", marginBottom:2 }}># 1. Instala el SDK</div>
              <div style={{ color:"#e2e8f0", marginBottom:16 }}><span style={{ color:"#818cf8" }}>npm</span> install @vforge/sdk</div>
              <div style={{ color:"#8695aa", marginBottom:2 }}># 2. Configura tu token</div>
              <div style={{ color:"#e2e8f0", marginBottom:16 }}><span style={{ color:"#818cf8" }}>export</span> VFORGE_TOKEN=<span style={{ color:"#34d399" }}>vf_live_xxxxxxxxxxxxx</span></div>
              <div style={{ color:"#8695aa", marginBottom:2 }}># 3. Conecta al Brain</div>
              <div style={{ color:"#e2e8f0" }}><span style={{ color:"#818cf8" }}>npx</span> @vforge/cli mcp connect <span style={{ color:"#34d399" }}>--workspace my-org</span></div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding:"96px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>Disenado para builders</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 48px" }}>Sin friccion. Sin boilerplate.</h2>
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

      <section id="endpoints" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"96px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>REST API</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 8px" }}>Endpoints principales</h2>
          <p style={{ fontSize:14, color:"#8695aa", margin:"0 0 40px" }}>Base URL: <code style={{ color:"#818cf8", background:"rgba(99,102,241,0.08)", padding:"2px 8px", borderRadius:4, fontSize:13 }}>https://api.vforge.site</code></p>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:1 }}>
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} style={{ display:"flex", alignItems:"flex-start", gap:20, padding:"20px 24px", background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:10, flexWrap:"wrap" as const }}>
                <span style={{ flexShrink:0, fontFamily:"monospace", fontSize:11, fontWeight:700, letterSpacing:"0.06em", padding:"3px 10px", borderRadius:6, background: ep.method === "GET" ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.12)", color: ep.method === "GET" ? "#34d399" : "#818cf8", border: ep.method === "GET" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(99,102,241,0.2)", minWidth:52, textAlign:"center" as const }}>
                  {ep.method}
                </span>
                <code style={{ fontFamily:"monospace", fontSize:14, color:"#e2e8f0", flexShrink:0, minWidth:180 }}>{ep.path}</code>
                <span style={{ fontSize:13, color:"#94a3b8", flex:1 }}>{ep.desc}</span>
                {ep.auth && <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" as const, color:"#a78bfa", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.15)", padding:"2px 8px", borderRadius:999 }}>Bearer</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.01)", padding:"96px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"#8695aa", marginBottom:12 }}>SDKs</p>
          <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.03em", color:"#f1f5f9", margin:"0 0 40px" }}>Tu lenguaje, tu stack.</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 }}>
            {SDKS.map((sdk) => (
              <div key={sdk.lang} style={{ background:"#080d18", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"28px 24px" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:sdk.color, marginBottom:20 }} />
                <h3 style={{ fontSize:15, fontWeight:700, color:"#f1f5f9", margin:"0 0 12px", letterSpacing:"-0.02em" }}>{sdk.lang}</h3>
                <code style={{ fontFamily:"monospace", fontSize:13, color:"#cbd5e1", background:"rgba(255,255,255,0.07)", padding:"8px 12px", borderRadius:6, display:"block" }}>{sdk.install}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"96px 24px 120px" }}>
        <div style={{ maxWidth:640, margin:"0 auto", textAlign:"center" as const }}>
          <h2 style={{ fontSize:"clamp(28px, 4vw, 44px)", fontWeight:800, letterSpacing:"-0.04em", color:"#ffffff", margin:"0 0 16px", lineHeight:1.1 }}>
            Listo para integrar.
          </h2>
          <p style={{ fontSize:16, color:"#94a3b8", margin:"0 0 36px", lineHeight:1.7 }}>
            Empieza con el plan gratuito. Sin tarjeta de credito. API key en segundos.
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
