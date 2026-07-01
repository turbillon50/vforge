"use client";
import Link from "next/link";

const STACK = [
  {
    category: "Modelos de lenguaje",
    accent: "59,130,246",
    items: [
      {
        name: "Claude",
        tagline: "El agente V corre sobre Claude Sonnet 4.6. Razonamiento, codigo y contexto largo.",
        url: "https://www.anthropic.com",
        color: "#cc785c",
        logoBg: "rgba(204, 120, 92, 0.1)",
        logoBorder: "rgba(204, 120, 92, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#cc785c">
            <path d="M17.3 3h-3.4L8.7 21h3.4l1.1-3.2h4.6l1.1 3.2H22L17.3 3zm-3.4 11.5L15.6 9l1.7 5.5h-3.4zM6.7 3H3.3L0 12l3.3 9h3.4L10 12 6.7 3z"/>
          </svg>
        ),
      },
      {
        name: "Grok",
        tagline: "Modelo de xAI para razonamiento rapido e integracion con datos en tiempo real.",
        url: "https://x.ai",
        color: "#1d9bf0",
        logoBg: "rgba(29, 155, 240, 0.1)",
        logoBorder: "rgba(29, 155, 240, 0.25)",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#1d9bf0">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        ),
      },
      {
        name: "OpenAI",
        tagline: "GPT-4o y Codex para generacion de codigo, embeddings y completions.",
        url: "https://openai.com",
        color: "#10a37f",
        logoBg: "rgba(16, 163, 127, 0.1)",
        logoBorder: "rgba(16, 163, 127, 0.25)",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#10a37f">
            <path d="M22.28 9.28a6 6 0 00-.52-4.93 6.06 6.06 0 00-6.5-2.9A6 6 0 0010.45 0a6.06 6.06 0 00-5.78 4.2 6 6 0 00-4 2.9 6.06 6.06 0 00.74 7.1 6 6 0 00.52 4.93 6.06 6.06 0 006.5 2.9A6 6 0 0013.55 24a6.06 6.06 0 005.79-4.2 6 6 0 004-2.9 6.06 6.06 0 00-.74-7.1l-.32-.5zM9.66 12.92L7.64 11.75V6.1a4.51 4.51 0 017.39-3.46l-.14.08-4.79 2.77a.79.79 0 00-.4.69v6.74zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z"/>
          </svg>
        ),
      },
    ],
  },
  {
    category: "Inferencia y computo",
    accent: "249,115,22",
    items: [
      {
        name: "Cerebras",
        tagline: "Inferencia mas rapida del mundo: 1,800+ tokens/seg. Motor de velocidad de VForge.",
        url: "https://www.cerebras.ai",
        color: "#f97316",
        logoBg: "rgba(249, 115, 22, 0.1)",
        logoBorder: "rgba(249, 115, 22, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="#f97316" strokeWidth="6" fill="none"/>
            <circle cx="50" cy="50" r="20" fill="#f97316" opacity="0.9"/>
            <circle cx="50" cy="20" r="7" fill="#f97316"/>
            <circle cx="50" cy="80" r="7" fill="#f97316"/>
            <circle cx="20" cy="50" r="7" fill="#f97316"/>
            <circle cx="80" cy="50" r="7" fill="#f97316"/>
            <line x1="50" y1="27" x2="50" y2="43" stroke="#f97316" strokeWidth="4"/>
            <line x1="50" y1="57" x2="50" y2="73" stroke="#f97316" strokeWidth="4"/>
            <line x1="27" y1="50" x2="43" y2="50" stroke="#f97316" strokeWidth="4"/>
            <line x1="57" y1="50" x2="73" y2="50" stroke="#f97316" strokeWidth="4"/>
          </svg>
        ),
      },
      {
        name: "Vast.ai",
        tagline: "GPUs on-demand para entrenamiento e inferencia pesada a costo marginal.",
        url: "https://vast.ai",
        color: "#a78bfa",
        logoBg: "rgba(167, 139, 250, 0.1)",
        logoBorder: "rgba(167, 139, 250, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <rect x="10" y="25" width="80" height="50" rx="8" stroke="#a78bfa" strokeWidth="5" fill="rgba(167, 139, 250, 0.08)"/>
            <rect x="22" y="38" width="56" height="24" rx="4" fill="#a78bfa" opacity="0.6"/>
            <rect x="30" y="44" width="40" height="12" rx="3" fill="#a78bfa"/>
            <circle cx="25" cy="75" r="5" fill="#a78bfa"/>
            <circle cx="75" cy="75" r="5" fill="#a78bfa"/>
          </svg>
        ),
      },
      {
        name: "Hetzner",
        tagline: "Infraestructura europea confiable. Servidores dedicados para workloads persistentes.",
        url: "https://www.hetzner.com",
        color: "#ef4444",
        logoBg: "rgba(239, 68, 68, 0.1)",
        logoBorder: "rgba(239, 68, 68, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <rect x="15" y="15" width="70" height="70" rx="12" fill="rgba(239, 68, 68, 0.1)" stroke="#ef4444" strokeWidth="4"/>
            <path d="M30 30h40M30 50h40M30 70h40" stroke="#ef4444" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    category: "Datos y memoria",
    accent: "96,165,250",
    items: [
      {
        name: "Hugging Face",
        tagline: "Hub de modelos, datasets y Spaces. Integracion directa con el pipeline de V.",
        url: "https://huggingface.co",
        color: "#fbbf24",
        logoBg: "rgba(251, 191, 36, 0.1)",
        logoBorder: "rgba(251, 191, 36, 0.25)",
        logo: (
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="40" fill="rgba(251, 191, 36, 0.1)" stroke="#fbbf24" strokeWidth="4"/>
            <circle cx="35" cy="42" r="8" fill="#fbbf24"/>
            <circle cx="65" cy="42" r="8" fill="#fbbf24"/>
            <path d="M30 65 Q50 80 70 65" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <circle cx="35" cy="40" r="3" fill="#050a14"/>
            <circle cx="65" cy="40" r="3" fill="#050a14"/>
          </svg>
        ),
      },
      {
        name: "Mastra",
        tagline: "Framework TypeScript para orquestar agentes con memoria, tools y workflows.",
        url: "https://mastra.ai",
        color: "#60a5fa",
        logoBg: "rgba(96, 165, 250, 0.1)",
        logoBorder: "rgba(96, 165, 250, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <path d="M20 80 L50 20 L80 80" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M33 57 L67 57" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        name: "pgvector + Qdrant",
        tagline: "Base de datos vectorial semantica para memoria de largo plazo de los agentes.",
        url: "https://qdrant.tech",
        color: "#818cf8",
        logoBg: "rgba(129, 140, 248, 0.1)",
        logoBorder: "rgba(129, 140, 248, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <polygon points="50,10 90,35 90,65 50,90 10,65 10,35" stroke="#818cf8" strokeWidth="5" fill="rgba(129, 140, 248, 0.08)"/>
            <polygon points="50,30 70,42 70,58 50,70 30,58 30,42" fill="#818cf8" opacity="0.7"/>
            <circle cx="50" cy="50" r="10" fill="#818cf8"/>
          </svg>
        ),
      },
    ],
  },
  {
    category: "Plataforma y red",
    accent: "34,197,94",
    items: [
      {
        name: "NGINX",
        tagline: "Reverse proxy y balanceador. El tejido de red que une todos los servicios de VForge.",
        url: "https://nginx.org",
        color: "#22c55e",
        logoBg: "rgba(34, 197, 94, 0.1)",
        logoBorder: "rgba(34, 197, 94, 0.25)",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 95,95 5,95" stroke="#22c55e" strokeWidth="5" fill="rgba(34, 197, 94, 0.1)"/>
            <path d="M30 75 L50 35 L70 75" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        ),
      },
    ],
  },
];

export default function Labs() {
  return (
    <section style={{ background:"linear-gradient(180deg, #050a14 0%, #06080f 100%)", padding:"100px 24px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:64, flexWrap:"wrap", gap:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#a78bfa", marginBottom:16 }}>
              <span style={{ display:"inline-block", width:24, height:1, background:"linear-gradient(90deg,#a78bfa,transparent)" }}/>
              VForge Labs
            </div>
            <h2 style={{ fontSize:"clamp(2rem, 4vw, 3rem)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05, color:"#f0f4ff", marginBottom:12 }}>
              El stack que lo hace posible
            </h2>
            <p style={{ fontSize:16, color:"rgba(200, 215, 255, 0.72)", lineHeight:1.65, maxWidth:480 }}>
              Cada herramienta elegida para maximizar velocidad, control y ahorro. Sin vendor lock-in.
            </p>
          </div>
          <Link href="/labs" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px", borderRadius:10, border:"1px solid rgba(167, 139, 250, 0.25)", background:"rgba(109, 40, 217, 0.08)", color:"#c4b5fd", fontWeight:500, fontSize:14, textDecoration:"none" }}>
            Ver Labs completo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {STACK.map((group) => (
          <div key={group.category} style={{ marginBottom:48 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:`rgb(${group.accent})`, boxShadow:`0 0 8px rgba(${group.accent},0.8)` }}/>
              <h3 style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:`rgba(${group.accent},0.7)`, margin:0 }}>
                {group.category}
              </h3>
              <div style={{ flex:1, height:1, background:`linear-gradient(90deg, rgba(${group.accent},0.15), transparent)` }}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
              {group.items.map((item) => (
                <Link key={item.name} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <div style={{
                    padding:"24px", borderRadius:16,
                    border: item.logoBorder ? `1px solid ${item.logoBorder}` : "1px solid rgba(255, 255, 255, 0.06)",
                    background: item.logoBg || "rgba(255, 255, 255, 0.02)",
                    transition:"transform 0.2s, box-shadow 0.2s",
                    cursor:"pointer",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                      <div style={{
                        width:48, height:48, borderRadius:12,
                        background: item.logoBg,
                        border: `1px solid ${item.logoBorder}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0,
                        boxShadow:`0 0 16px ${item.logoBg}`,
                      }}>
                        {item.logo}
                      </div>
                      <div>
                        <div style={{ fontSize:16, fontWeight:700, color:"#f0f4ff", letterSpacing:"-0.02em" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize:12, color:item.color, marginTop:2, fontWeight:500 }}>
                          {item.url.replace("https://www.","").replace("https://","")}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="2" style={{ marginLeft:"auto", flexShrink:0 }}>
                        <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p style={{ color:"rgba(200, 215, 255, 0.75)", fontSize:14, lineHeight:1.65, margin:0 }}>
                      {item.tagline}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
    }
