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

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const SOCIAL_LINKS = [
  { name: "GitHub", href: "https://github.com/turbillon50/vforge", icon: <GitHubIcon /> },
];

const ECOSYSTEM = [
  { name: "vMomentum", url: "https://vmomentum.site", desc: "Agencia de crecimiento digital. Estrategia, contenido y distribución potenciada por IA." },
  { name: "MindContextia", url: "https://mindcontextia.one", desc: "Plataforma de contexto inteligente. La memoria persistente que conecta tus agentes y productos." },
  { name: "Goossip", url: "https://goossip.vercel.app", desc: "Agencia de marketing creativo 100% potenciada por IA. Campañas, branding y presencia digital." },
];

/** El mismo correo que ya usan el aviso sin JavaScript y el resto del pie. */
const CONTACTO = "luisdelator@vmomentums.info";

function ContactForm({ type }: { type: "partners" | "asociados" }) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const isPartner = type === "partners";

  // Antes esto sólo hacía setSent(true) y decía "Mensaje recibido. Te contactamos
  // pronto." sin una sola petición de red: el mensaje se perdía y la promesa era
  // falsa (SANIDAD §0.2: toda acción tiene una consecuencia observable). No hay
  // endpoint público de contacto, así que el envío se hace por correo, que sí
  // llega. [LUIS]: si quieres un formulario con backend propio, se construye.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asunto = isPartner
      ? `VForge · Partner: ${name}`
      : `VForge · Asociado: ${name}`;
    const cuerpo = [
      isPartner ? `Empresa o proyecto: ${name}` : `Nombre: ${name}`,
      `Correo: ${email}`,
      "",
      message,
    ].join("\n");
    window.location.href =
      `mailto:${CONTACTO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#cbd5e1", fontSize: 14 }}>
        <p>Te abrimos tu app de correo con el mensaje listo para enviar.</p>
        <p style={{ marginTop: 8, color: "#94a3b8" }}>
          Si no se abrió, escríbenos a{" "}
          <a href={`mailto:${CONTACTO}`} style={{ color: "#e2e8f0", textDecoration: "underline" }}>
            {CONTACTO}
          </a>
        </p>
      </div>
    );
  }

  const inputStyle = { background:"rgba(15,23,42,0.8)", border:"1px solid rgba(59, 130, 246, 0.12)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#e2e8f0", outline:"none", width:"100%", boxSizing:"border-box" as const };

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input type="text" placeholder={isPartner ? "Empresa o proyecto" : "Nombre"} value={name} onChange={e=>setName(e.target.value)} required style={inputStyle} />
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle} />
      <textarea placeholder={isPartner ? "Cuéntanos sobre tu proyecto o integración" : "Cómo quieres colaborar con VForge"} value={message} onChange={e=>setMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit" }} />
      <button type="submit" style={{ background:"linear-gradient(135deg, #3b82f6, #6d28d9)", color:"#ffffff", fontSize:13, fontWeight:500, padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer" }}>
        Enviar
      </button>
    </form>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ background:"linear-gradient(180deg, #03060e 0%, #020408 100%)", borderTop:"1px solid rgba(59, 130, 246, 0.08)" }}>

      <div style={{ borderBottom:"1px solid rgba(59, 130, 246, 0.06)", padding:"64px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontSize:12, fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:"#8695aa", marginBottom:32, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", width:16, height:1, background:"rgba(59, 130, 246, 0.4)" }}/>
            Ecosistema
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:24 }}>
            {ECOSYSTEM.map(item => (
              <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", background:"rgba(8,13,26,0.7)", border:"1px solid rgba(59, 130, 246, 0.08)", borderRadius:12, padding:"24px", textDecoration:"none" }}>
                <div style={{ fontSize:15, fontWeight:500, color:"#e2e8f0", marginBottom:8, letterSpacing:"-0.02em" }}>{item.name}</div>
                <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6 }}>{item.desc}</div>
                <div style={{ marginTop:12, fontSize:12, color:"#60a5fa", letterSpacing:"0.02em" }}>{item.url.replace("https://", "")} &#8594;</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderBottom:"1px solid rgba(59, 130, 246, 0.06)", padding:"64px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:48 }}>
            <div>
              <h3 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", color:"#e2e8f0", marginBottom:8 }}>Partners</h3>
              <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6, marginBottom:20 }}>Integraciones técnicas, alianzas de producto o distribuciones conjuntas. Construyamos juntos.</p>
              <ContactForm type="partners" />
            </div>
            <div>
              <h3 style={{ fontSize:18, fontWeight:400, letterSpacing:"-0.02em", color:"#e2e8f0", marginBottom:8 }}>Asociados</h3>
              <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.6, marginBottom:20 }}>Comunidad, embajadores, early adopters y colaboradores estratégicos del ecosistema VForge.</p>
              <ContactForm type="asociados" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"64px 24px 40px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="vf-mf-cols">
            <div className="vf-mf-marca">
              <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", marginBottom:16 }}>
                <VForgeLogo size={22} />
                <span style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.03em", color:"#FFFFFF" }}>VForge</span>
              </Link>
              <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.65, maxWidth:280, marginBottom:24 }}>
                La plataforma MCP que conecta Git, Vercel y tus agentes de IA en un solo flujo.
              </p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {SOCIAL_LINKS.map(link => (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" title={link.name}
                    style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:34, height:34, background:"rgba(15,23,42,0.8)", border:"1px solid rgba(59, 130, 246, 0.1)", borderRadius:8, color:"#8695aa", textDecoration:"none" }}>
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8695aa", marginBottom:16 }}>Producto</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Blog", href:"/blog" }, { label:"Manifiesto", href:"/manifiesto" }, { label:"Labs", href:"/labs" }, { label:"Precios", href:"/#precios" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#94a3b8", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8695aa", marginBottom:16 }}>Plataforma</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Integraciones", href:"/labs" }, { label:"API", href:"/developers" }, { label:"Estado", href:"/status" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#94a3b8", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize:12, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8695aa", marginBottom:16 }}>Legal</h4>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:10 }}>
                {[{ label:"Privacidad", href:"/privacy" }, { label:"Términos", href:"/terms" }, { label:"Manifiesto", href:"/manifiesto" }, { label:"Contacto", href:"/support" }].map(item => (
                  <li key={item.label}><Link href={item.href} style={{ fontSize:13, color:"#94a3b8", textDecoration:"none" }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop:"1px solid rgba(59, 130, 246, 0.06)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <p style={{ fontSize:12, color:"#94a3b8" }}>{new Date().getFullYear()} VForge. Todos los derechos reservados.</p>
            {/* Antes decia "Todos los sistemas operativos" (mala traduccion de
                "all systems operational") afirmando un estado que nadie medía.
                Ahora es un enlace a la pagina que sí lo mide. */}
            <Link href="/status" style={{ display:"flex", alignItems:"center", gap:6, textDecoration:"none" }}>
              <div style={{ width:6, height:6, background:"#3b82f6", borderRadius:"50%" }}/>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Estado del sistema</span>
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        .vf-mf-cols { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:64px; }
        @media (max-width: 899px) {
          .vf-mf-cols { grid-template-columns:1fr 1fr; gap:32px; margin-bottom:40px; }
          .vf-mf-marca { grid-column:1 / -1; }
        }
      `}</style>
    </footer>
  );
}
export default MarketingFooter;
