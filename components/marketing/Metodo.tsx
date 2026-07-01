"use client";
import { useState, useEffect } from "react";

const GitHubSVG = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const VercelSVG = () => (
  <svg width="24" height="24" viewBox="0 0 76 65" fill="currentColor">
    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
  </svg>
);

const BrainSVG = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

const RocketSVG = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const STEPS = [
  {
    id: "brain",
    label: "VForge Brain",
    sublabel: "Conversas con V",
    icon: <BrainSVG />,
    color: "#60a5fa",
    glow: "59,130,246",
    grad: "linear-gradient(135deg, #1a3a6e 0%, #0f2040 100%)",
    detail: "El agente V genera, edita y estructura tu codigo en tiempo real. Una conversacion, codigo listo.",
    tag: "MCP Agent",
    number: "01",
  },
  {
    id: "github",
    label: "GitHub",
    sublabel: "Push automatico",
    icon: <GitHubSVG />,
    color: "#a78bfa",
    glow: "167,139,250",
    grad: "linear-gradient(135deg, #3d1f6e 0%, #221040 100%)",
    detail: "VForge hace commit y push al repositorio al instante. Tus cambios versionados sin tocar la terminal.",
    tag: "Git Push",
    number: "02",
  },
  {
    id: "vercel",
    label: "Vercel",
    sublabel: "Deploy en segundos",
    icon: <VercelSVG />,
    color: "#c4b5fd",
    glow: "196,181,253",
    grad: "linear-gradient(135deg, #4a2d8e 0%, #2a1860 100%)",
    detail: "Cada push dispara un deployment automatico. Preview y produccion listos en segundos.",
    tag: "CI/CD",
    number: "03",
  },
  {
    id: "artifact",
    label: "Artifact",
    sublabel: "Producto en produccion",
    icon: <RocketSVG />,
    color: "#e9d5ff",
    glow: "233,213,255",
    grad: "linear-gradient(135deg, #5c3a9e 0%, #3a2070 100%)",
    detail: "Tu producto vive. Dominio propio, HTTPS, escala automatica. VForge recuerda todo el contexto.",
    tag: "Live",
    number: "04",
  },
];

export function Metodo() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % STEPS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const step = STEPS[active];

  return (
    <section style={{ background:"linear-gradient(180deg, #050a14 0%, #06080f 100%)", padding:"100px 24px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        <div style={{ marginBottom:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#3b82f6", marginBottom:16 }}>
            <span style={{ display:"inline-block", width:24, height:1, background:"linear-gradient(90deg,#3b82f6,transparent)" }}/>
            Como funciona
          </div>
          <h2 style={{ fontSize:"clamp(2rem, 4vw, 3rem)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05, color:"#f0f4ff", marginBottom:12 }}>
            Un flujo. Cero friccion.
          </h2>
          <p style={{ fontSize:17, color:"rgba(200,215,255,0.55)", lineHeight:1.65, maxWidth:480 }}>
            De idea a produccion en una conversacion. VForge orquesta cada herramienta por ti.
          </p>
        </div>

        {/* Pipeline — todos los cards siempre encendidos */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, marginBottom:3, borderRadius:"20px 20px 0 0", overflow:"hidden" }}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActive(i)}
              style={{
                padding:"28px 32px",
                background: s.grad,
                cursor:"pointer",
                position:"relative",
                overflow:"hidden",
                transition:"filter 0.3s",
                filter: i === active ? "brightness(1.15)" : "brightness(0.75)",
              }}
            >
              {/* Glow radial siempre visible */}
              <div style={{
                position:"absolute", inset:0,
                background: `radial-gradient(ellipse at 20% 50%, rgba(${s.glow},0.2) 0%, transparent 65%)`,
                pointerEvents:"none",
                opacity: i === active ? 1 : 0.5,
                transition:"opacity 0.3s",
              }}/>
              {/* Top border glow */}
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:1,
                background: `linear-gradient(90deg, transparent, rgba(${s.glow},0.6), transparent)`,
                opacity: i === active ? 1 : 0.4,
                transition:"opacity 0.3s",
              }}/>
              <div style={{ display:"flex", alignItems:"center", gap:16, position:"relative", zIndex:1 }}>
                <div style={{
                  width:54, height:54, borderRadius:14,
                  background: `radial-gradient(circle, rgba(${s.glow},0.3) 0%, rgba(${s.glow},0.08) 100%)`,
                  border: `1px solid rgba(${s.glow},0.5)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color: s.color,
                  boxShadow: `0 0 24px rgba(${s.glow},0.4), 0 0 60px rgba(${s.glow},0.15)`,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.02em", color:"#f0f4ff" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize:12, color: `rgba(${s.glow},0.9)`, marginTop:2 }}>
                    {s.sublabel}
                  </div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:11, fontWeight:700, letterSpacing:"0.06em", color: `rgba(${s.glow},0.6)`, fontFamily:"monospace" }}>
                  {s.number}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail card */}
        <div style={{
          background: `linear-gradient(135deg, ${step.grad.includes("1a3a") ? "rgba(15,23,42,0.98)" : "rgba(15,23,42,0.98)"}, rgba(8,13,26,0.98))`,
          borderRadius:"0 0 20px 20px",
          padding:"32px 40px",
          borderTop: `1px solid rgba(${step.glow},0.25)`,
          position:"relative",
          overflow:"hidden",
          minHeight:100,
          boxShadow: `inset 0 1px 0 rgba(${step.glow},0.15)`,
        }}>
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:1,
            background: `linear-gradient(90deg, transparent, rgba(${step.glow},0.6), transparent)`,
          }}/>
          <div style={{
            position:"absolute", top:"-60%", right:"-5%",
            width:500, height:400, borderRadius:"50%",
            background: `radial-gradient(circle, rgba(${step.glow},0.07) 0%, transparent 65%)`,
            pointerEvents:"none",
          }}/>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:32, position:"relative" }}>
            <div style={{ flex:1 }}>
              <span style={{
                display:"inline-flex", alignItems:"center", gap:6,
                padding:"4px 12px", borderRadius:999,
                background: `rgba(${step.glow},0.12)`,
                border: `1px solid rgba(${step.glow},0.3)`,
                color: step.color, fontSize:11, fontWeight:700, letterSpacing:"0.08em",
                textTransform:"uppercase", marginBottom:14,
                boxShadow: `0 0 12px rgba(${step.glow},0.2)`,
              }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:step.color, display:"inline-block", boxShadow:`0 0 6px ${step.color}` }}/>
                {step.tag}
              </span>
              <p style={{ fontSize:16, color:"rgba(200,215,255,0.8)", lineHeight:1.7, margin:0, maxWidth:600 }}>
                {step.detail}
              </p>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0, paddingTop:4 }}>
              {STEPS.map((_, i) => (
                <div key={i} onClick={() => setActive(i)} style={{
                  width: i === active ? 24 : 6, height:6, borderRadius:3,
                  background: i === active ? step.color : "rgba(255,255,255,0.1)",
                  cursor:"pointer", transition:"all 0.3s ease",
                  boxShadow: i === active ? `0 0 8px ${step.color}` : "none",
                }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:0, marginTop:3, borderRadius:16, overflow:"hidden", border:"1px solid rgba(59,130,246,0.1)" }}>
          {[
            { title:"Conecta tu repo", desc:"Autoriza VForge con tu GitHub. Leemos tu codigo, generamos contexto y preparamos los agentes.", tag:"GitHub", c:"59,130,246" },
            { title:"Deploy automatico", desc:"Cada push genera un deployment en Vercel. Preview y produccion en segundos, sin CI manual.", tag:"Vercel", c:"167,139,250" },
            { title:"V orquesta todo", desc:"El Brain MCP centraliza la memoria. Agentes que leen contexto y ejecutan tareas en tiempo real.", tag:"MCP Bridge", c:"196,181,253" },
          ].map((card, i) => (
            <div key={i} style={{
              padding:"32px 28px",
              background:"rgba(8,13,26,0.8)",
              borderRight: i < 2 ? "1px solid rgba(59,130,246,0.08)" : "none",
              position:"relative",
            }}>
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:1,
                background: `linear-gradient(90deg, transparent, rgba(${card.c},0.3), transparent)`,
              }}/>
              <div style={{ fontSize:11, fontWeight:700, color:`rgba(${card.c},0.9)`, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                {card.tag}
              </div>
              <h3 style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.02em", color:"#e2e8f0", marginBottom:8 }}>
                {card.title}
              </h3>
              <p style={{ fontSize:13, color:"rgba(148,163,184,0.65)", lineHeight:1.65, margin:0 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
export default Metodo;
