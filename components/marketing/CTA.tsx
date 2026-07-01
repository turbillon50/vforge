"use client";
import Link from "next/link";

const STATS = [
  { value: "< 1 min", label: "de idea a primer deploy" },
  { value: "80%", label: "menos tokens repetidos" },
  { value: "1", label: "conversacion para produccion" },
];

export function CTA() {
  return (
    <section style={{ position:"relative", background:"linear-gradient(180deg, #050a14 0%, #03060e 100%)", padding:"100px 24px 120px", overflow:"hidden" }}>
      <div style={{ position:"absolute", bottom:"-20%", left:"50%", transform:"translateX(-50%)", width:900, height:450, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(59, 130, 246, 0.09) 0%, rgba(109, 40, 217, 0.05) 50%, transparent 70%)", filter:"blur(60px)", zIndex:0, pointerEvents:"none" }}/>
      <div style={{ maxWidth:1200, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ borderTop:"1px solid rgba(59, 130, 246, 0.08)", marginBottom:80 }}/>
        <div style={{ display:"flex", gap:0, marginBottom:80, background:"rgba(8,13,26,0.7)", border:"1px solid rgba(59, 130, 246, 0.08)", borderRadius:16, overflow:"hidden" }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{ flex:1, padding:"32px 28px", borderRight:i < STATS.length - 1 ? "1px solid rgba(59, 130, 246, 0.08)" : "none", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(1.6rem, 3vw, 2.4rem)", fontWeight:700, letterSpacing:"-0.04em", color:"#60a5fa", marginBottom:6 }}>{stat.value}</div>
              <div style={{ fontSize:13, color:"#94a3b8", letterSpacing:"-0.01em" }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth:680 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"#94a3b8", display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
            <span style={{ display:"inline-block", width:16, height:1, background:"rgba(59, 130, 246, 0.4)" }}/>
            Empieza hoy
          </div>
          <h2 style={{ fontSize:"clamp(2.2rem, 4.5vw, 3.5rem)", fontWeight:700, letterSpacing:"-0.04em", lineHeight:1.04, color:"#FFFFFF", marginBottom:24 }}>
            Menos tokens.<br/>
            Menos tiempo.<br/>
            <span style={{ background:"linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              Control total.
            </span>
          </h2>
          <p style={{ fontSize:17, color:"#94a3b8", lineHeight:1.7, marginBottom:44, maxWidth:480 }}>
            Tu codigo en produccion sin perder el hilo. VForge recuerda el contexto, orquesta los agentes y conecta cada herramienta.
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <Link href="/sign-up" style={{ display:"inline-flex", alignItems:"center", gap:10, background:"linear-gradient(135deg, #3b82f6, #6d28d9)", color:"#ffffff", fontSize:15, fontWeight:600, letterSpacing:"-0.02em", padding:"14px 28px", borderRadius:9999, textDecoration:"none", boxShadow:"0 0 32px rgba(59, 130, 246, 0.4), 0 0 80px rgba(109, 40, 217, 0.15)" }}>
              Empieza gratis
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
            </Link>
            <Link href="/pricing" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255, 255, 255, 0.05)", color:"#94a3b8", fontSize:15, fontWeight:400, letterSpacing:"-0.02em", padding:"13px 24px", borderRadius:9999, textDecoration:"none", border:"1px solid rgba(255, 255, 255, 0.08)", backdropFilter:"blur(8px)" }}>
              Ver precios
            </Link>
          </div>
          <p style={{ marginTop:28, fontSize:12, color:"#475569", letterSpacing:"-0.01em" }}>
            Gratis para empezar - Sin tarjeta de credito - Beta abierta
          </p>
        </div>
      </div>
    </section>
  );
}
export default CTA;
