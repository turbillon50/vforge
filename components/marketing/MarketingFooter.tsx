"use client";
import Link from "next/link";
import { useState } from "react";

function VForgeLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v-metal-ftr" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor="#c8c8d8"/>
          <stop offset="70%" stopColor="#888898"/>
          <stop offset="100%" stopColor="#e4e4f0"/>
        </linearGradient>
      </defs>
      <path d="M6 6 L32 58 L58 6" fill="none" stroke="url(#v-metal-ftr)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const SOCIAL_LINKS = [
  { name: "TikTok", href: "#", icon: <TikTokIcon /> },
  { name: "LinkedIn", href: "#", icon: <LinkedInIcon /> },
  { name: "X", href: "#", icon: <XIcon /> },
  { name: "GitHub", href: "https://github.com/turbillon50/vforge", icon: <GitHubIcon /> },
];

const ECOSYSTEM = [
  { name: "vMomentum", url: "https://vmomentum.site", desc: "Agencia de crecimiento digital. Estrategia, contenido y distribucion potenciada por IA." },
  { name: "MindContextia", url: "https://mindcontextia.one", desc: "Plataforma de contexto inteligente. La memoria persistente que conecta tus agentes y productos." },
  { name: "Goossip", url: "#", desc: "Agencia de marketing creativo 100% potenciada por IA. Campanas, branding y presencia digital." },
];

function ContactForm({ type }: { type: "partners" | "asociados" }) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const isPartner = type === "partners";

  if (sent) {
    return <div style={{ padding:"24px", textAlign:"center", color:"#60a5fa", fontSize:14 }}>Mensaje recibido. Te contactamos pronto.</div>;
  }

  const inputStyle = { background:"rgba(15,23,42,0.8)", border:"1px solid rgba(59,130,246,0.12)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#e2e8f0", outline:"none", width:"100%", boxSizing:"border-box" as const };

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input type="text" placeholder={isPartner ? "Empresa o proyecto" : "Nombre"} value={name} onChange={e=>setName(e.target.value)} required style={inputStyle} />
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle} />
      <textarea placeholder={isPartner ? "Cuentanos sobre tu proyecto o integracion" : "Como quieres colaborar con VForge"} value={message} onChange={e=>setMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit" }} />
      <button type="submit" style={{ background:"linear-gradient(135deg, #3b82f6, #6d28d9)", color:"#ffffff", fontSize:13, fontWeight:500, padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer" }}>
        Enviar
      </button>
    </form>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ background:"linear-gradient(180deg, #03060e 0%, #020408 100%)", borderTop:"1px solid rgba(59,130,246,0.08)" }}>

      <div style={{ borderBottom:"1px solid rgba(59,130,246,0.06)", padding:"64px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontSize:12, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"#475569", marginBottom:32, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", width:16, height:1, background:"rgba(59,130,246,0.4)" }}/>
            Ecosistema
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:24 }}>
            {ECOSYSTEM.map(item => (
              <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", background:"rgba(8,13,26,0.7)", border:"1px solid rgba(59,130,246,0.08)", borderRadius:12, padding:"24px", textDecoration:"none" }}>
                <div style={{ fontSize:15, fontWeight:500, color:"#e2e8f0", marginBottom:8, letterSpacing:"-0.02em" }}>{item.name}</div>
                <div style={{ fontSize:13, color:"#64748b", lineHeight:1.6 }}>{item.desc}</div>
                <div style={{ marginTop:12, fontSize:12, color:"#60a5fa", letterSpacing:"0.02em" }}>{item.url.replace("https://", "")} &#8594;</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderBottom:"1px solid rgba(59,130,246,0.06)", padding:"64px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:48 }}>
            <div>
              <h3 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", color:"#e2e8f0", marginBottom:8 }}>Partners</h3>
              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.6, marginBottom:20 }}>Integraciones tecnicas, alianzas de producto o distribuciones conjuntas. Construyamos juntos.</p>
              <ContactForm type="partners" />
            </div>
            <div>
              <h3 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", color:"#e2e8f0", marginBottom:8 }}>Asociados</h3>
              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.6, marginBottom:20 }}>Comunidad, embajadores, early adopters y colaboradores estrategicos del ecosistema VForge.</p>
              <ContactForm type="asociados" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"64px 24px 40px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:48, marginBottom:64 }}>
            <div>
              <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", marginBottom:16 }}>
                <VForgeLogo size={22} />
                <span style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.03em", color:"#FFFFFF" }}>VForge</span>
              </Link>
              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.65, maxWidth:280, marginBottom:24 }}>
                La plataforma MCP que conecta Git, Vercel y tus agentes de IA en un solo flujo.
              </p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {SOCIAL_LINKS.map(link => (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" title={link.name}
                    style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:34, height:34, background:"rgba(15,23,42,0.8)", border:"1px solid rgba(59,130,246,0.1)", borderRadius:8, color:"#475569", textDecoration:"none" }}>
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#475569", marginBottom:16 }}>Producto</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Blog", href:"/blog" }, { label:"Manifiesto", href:"/manifiesto" }, { label:"Labs", href:"/labs" }, { label:"Precios", href:"/pricing" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#64748b", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#475569", marginBottom:16 }}>Plataforma</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Integraciones", href:"/labs" }, { label:"API", href:"#" }, { label:"Blog", href:"/blog" }, { label:"Status", href:"#" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#64748b", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#475569", marginBottom:16 }}>Legal</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Privacidad", href:"/privacy" }, { label:"Terminos", href:"/terms" }, { label:"Manifiesto", href:"/manifiesto" }, { label:"Contacto", href:"#" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#64748b", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop:"1px solid rgba(59,130,246,0.06)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <p style={{ fontSize:12, color:"#334155" }}>2026 VForge. Todos los derechos reservados.</p>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, background:"#3b82f6", borderRadius:"50%" }}/>
              <span style={{ fontSize:12, color:"#334155" }}>Todos los sistemas operativos</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default MarketingFooter;
