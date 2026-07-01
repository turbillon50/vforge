"use client";

const INTEGRATIONS = [
  {
    name: "GitHub",
    color: "#e2e8f0",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  {
    name: "Vercel",
    color: "#ffffff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 76 65" fill="currentColor">
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
      </svg>
    ),
  },
  {
    name: "Anthropic",
    color: "#cc785c",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.3 3h-3.4L8.7 21h3.4l1.1-3.2h4.6l1.1 3.2H22L17.3 3zm-3.4 11.5L15.6 9l1.7 5.5h-3.4zM6.7 3H3.3L0 12l3.3 9h3.4L10 12 6.7 3z"/>
      </svg>
    ),
  },
  {
    name: "OpenAI",
    color: "#10a37f",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.28 9.28a6 6 0 00-.52-4.93 6.06 6.06 0 00-6.5-2.9A6 6 0 0010.45 0a6.06 6.06 0 00-5.78 4.2 6 6 0 00-4 2.9 6.06 6.06 0 00.74 7.1 6 6 0 00.52 4.93 6.06 6.06 0 006.5 2.9A6 6 0 0013.55 24a6.06 6.06 0 005.79-4.2 6 6 0 004-2.9 6.06 6.06 0 00-.74-7.1l-.32-.5zM9.66 12.92L7.64 11.75V6.1a4.51 4.51 0 017.39-3.46l-.14.08-4.79 2.77a.79.79 0 00-.4.69v6.74zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z"/>
      </svg>
    ),
  },
  {
    name: "Stripe",
    color: "#6772e5",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
      </svg>
    ),
  },
  {
    name: "Supabase",
    color: "#3ecf8e",
    icon: (
      <svg width="20" height="22" viewBox="0 0 109 113" fill="none">
        <path d="M63.7 6.1c-2.7-4.1-8.9-2.2-8.9 2.6V56h36.4c6.5 0 10.1-7.7 6-12.4L63.7 6.1z" fill="#3ECF8E"/>
        <path d="M45.3 106.9c2.7 4.1 8.9 2.2 8.9-2.6V57H17.8c-6.5 0-10.1 7.7-6 12.4l33.5 37.5z" fill="url(#sbf)"/>
        <defs><linearGradient id="sbf" x1="22" y1="63" x2="61" y2="107" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient></defs>
      </svg>
    ),
  },
  {
    name: "Notion",
    color: "#e2e8f0",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.222-.187z"/>
      </svg>
    ),
  },
  {
    name: "Slack",
    color: "#e01e5a",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
      </svg>
    ),
  },
  {
    name: "Docker",
    color: "#2496ed",
    icon: (
      <svg width="26" height="20" viewBox="0 0 640 512" fill="currentColor">
        <path d="M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-136h-66.1V41.6h66.1v58.7zm-263.8 82h66.1v59.4h-66.1v-59.4zm0-82h66.1v59.4H86.1V100.3zm-76 59.4H76.1v-59.4H10.1v59.4zm340.7 0h-66.1v-59.4h66.1v59.4zm76-82h-66.1v59.4h66.1V77.7zm0 82h-66.1v59.4h66.1v-59.4zm24.2 137.4c-5-18.7-23.8-28-40.6-22.5-6.5-19-23.3-28.6-39.2-24.8-9.9-20.8-28.3-28.8-44.6-20.3-8.2-10.6-19.4-14.8-30.7-14.8H260c-11.3 0-22.5 4.2-30.7 14.8-16.3-8.5-34.7-.5-44.6 20.3-15.9-3.8-32.7 5.8-39.2 24.8-16.8-5.5-35.6 3.8-40.6 22.5-5 18.6 3.5 37.9 21.6 46.4v4.1c0 35.3 28.7 64 64 64h192c35.3 0 64-28.7 64-64v-4.1c18.1-8.5 26.6-27.8 21.6-46.4z"/>
      </svg>
    ),
  },
  {
    name: "Cloudflare",
    color: "#f6821f",
    icon: (
      <svg width="28" height="18" viewBox="0 0 110 70" fill="none">
        <path d="M72 22c-.8-4.6-5-8-10-8-2.2 0-4.2.7-5.9 1.8C53.7 8.8 46.4 4 38 4 24.7 4 14 14.7 14 28c0 .7 0 1.4.1 2C7 31.4 2 37 2 44c0 7.2 5.8 13 13 13h55c7.7 0 14-6.3 14-14 0-6.8-4.8-12.4-11.4-13.7C83.3 27.8 83 24.9 82 22z" fill="#f6821f"/>
        <path d="M82 22c-.8-4.6-5-8-10-8-2.2 0-4.2.7-5.9 1.8C63.7 8.8 56.4 4 48 4c-13.3 0-24 10.7-24 24 0 .7 0 1.4.1 2C17 31.4 12 37 12 44c0 7.2 5.8 13 13 13h65c7.7 0 14-6.3 14-14 0-6.8-4.8-12.4-11.4-13.7C83.3 27.8 83 24.9 82 22z" fill="#fbad41" opacity="0.6"/>
      </svg>
    ),
  },
  {
    name: "Linear",
    color: "#5e6ad2",
    icon: (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="currentColor">
        <path d="M1.22 61.4L38.6 98.78a50 50 0 0022.82-12.96L14.18 38.58A50 50 0 001.22 61.4zM0 50c0 7.9 1.84 15.37 5.12 22.04L27.96 27.96H5.12A49.9 49.9 0 000 50zM50 0a50 50 0 00-22.04 5.12l44.08 44.08V5.12A50 50 0 0050 0zm22.04 5.12v44.08l22.84-22.84A49.9 49.9 0 0072.04 5.12zM94.88 27.96L50 72.84l22.84 22.84A50 50 0 0094.88 27.96zM61.4 98.78L38.6 75.94 16.18 98.78A49.9 49.9 0 0050 100c4.06 0 8.02-.49 11.4-1.22z"/>
      </svg>
    ),
  },
  {
    name: "Neon DB",
    color: "#00e5bf",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#00e5bf" opacity="0.15"/>
        <path d="M7 8h4l-1.5 4h4.5l-5 4 1.5-4H7V8z" fill="#00e5bf"/>
      </svg>
    ),
  },
];

// Card style — UNIFORME para todos: mismo fondo oscuro, mismo borde, solo el icono con color de marca
const CARD_STYLE = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  gap: 12,
  background: "rgba(10,15,28,0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  padding: "13px 20px",
  whiteSpace: "nowrap" as const,
  flexShrink: 0,
  backdropFilter: "blur(12px)",
};

export function Integraciones() {
  return (
    <section style={{ background:"linear-gradient(180deg, #06080f 0%, #050a14 100%)", padding:"80px 0", overflow:"hidden" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", marginBottom:48 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#3b82f6", marginBottom:16 }}>
          <span style={{ display:"inline-block", width:24, height:1, background:"linear-gradient(90deg,#3b82f6,transparent)" }}/>
          Integraciones
        </div>
        <h2 style={{ fontSize:"clamp(2rem, 4vw, 3rem)", fontWeight:800, letterSpacing:"-0.04em", color:"#f0f4ff", maxWidth:520 }}>
          Conecta con las herramientas que ya usas
        </h2>
        <p style={{ fontSize:16, color:"rgba(200, 215, 255, 0.45)", lineHeight:1.65, maxWidth:420, marginTop:12 }}>
          Cada integracion nativa. Sin webhooks manuales. Sin configuracion extra.
        </p>
      </div>

      <div style={{ position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:180, background:"linear-gradient(to right, #06080f, transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:180, background:"linear-gradient(to left, #06080f, transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ display:"flex", gap:12, width:"max-content", animation:"vf-scroll-a 35s linear infinite" }}>
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
            <div key={i} style={CARD_STYLE}>
              <span style={{ color:item.color, display:"flex", alignItems:"center", flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:14, fontWeight:500, color:"#c8d7ff", letterSpacing:"-0.01em" }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:"relative", overflow:"hidden", marginTop:12 }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:180, background:"linear-gradient(to right, #06080f, transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:180, background:"linear-gradient(to left, #06080f, transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ display:"flex", gap:12, width:"max-content", animation:"vf-scroll-b 42s linear infinite" }}>
          {[...INTEGRATIONS.slice(5), ...INTEGRATIONS.slice(0,5), ...INTEGRATIONS.slice(5), ...INTEGRATIONS.slice(0,5)].map((item, i) => (
            <div key={i} style={CARD_STYLE}>
              <span style={{ color:item.color, display:"flex", alignItems:"center", flexShrink:0 }}>{item.icon}</span>
              <span style={{ fontSize:14, fontWeight:500, color:"#c8d7ff", letterSpacing:"-0.01em" }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: "@keyframes vf-scroll-a{from{transform:translateX(0)}to{transform:translateX(-50%)}} @keyframes vf-scroll-b{from{transform:translateX(-50%)}to{transform:translateX(0)}}" }} />
    </section>
  );
}
export default Integraciones;
