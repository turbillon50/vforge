"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconGlobe, IconCheck, IconExtLink, IconShield,
  IconFingerprint, IconActivity, IconArrowL,
} from "@/components/brand/VFIcons";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";

const TEAL  = "var(--color-cyan-400)";
const VIOLET = "var(--color-violet-400)";
const GREEN = "#22c55e";
const AMBER = "#f5a623";
const FULL_URL = "https://vulcano.vmomentum.site/";

type Instance = {
  ok?: boolean; status?: string; ready?: boolean;
  vnc_url?: string; vnc_password?: string;
  is_owner?: boolean; active_profile?: string;
};

const SERVICES = [
  { name: "Google",  host: "accounts.google.com" },
  { name: "xAI",     host: "accounts.x.ai" },
  { name: "Vercel",  host: "vercel.com" },
  { name: "Clerk",   host: "dashboard.clerk.com" },
  { name: "Stripe",  host: "dashboard.stripe.com" },
  { name: "GitHub",  host: "github.com" },
];

export function VulcanoStatus() {
  const [inst, setInst] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/navegador", { cache: "no-store" })
      .then(r => r.json()).then((d) => { setInst(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const ready = inst?.ready ?? false;
  const email = inst?.active_profile ?? "";
  const fullUrl = inst?.vnc_url
    ? `${inst.vnc_url}${inst.vnc_password
        ? `?password=${encodeURIComponent(inst.vnc_password)}&autoconnect=true&resize=remote&reconnect=true`
        : ""}`
    : FULL_URL;

  const abrir = () => window.open(fullUrl, "_blank", "noopener");

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", minHeight:"60vh", background:"var(--color-void)" }}>
      <ObsidianLoader size="lg" label="Conectando al Navegador Vulcano…" />
    </div>
  );

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100%", background:"var(--color-void)", color:"var(--color-on-surface)",
      fontFamily:"Inter,-apple-system,sans-serif", padding:"32px 18px" }}>
      <motion.div
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        style={{ width:"100%", maxWidth:560 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
          <Link href="/app" style={{ display:"flex", alignItems:"center", justifyContent:"center",
            width:34, height:34, borderRadius:10, flexShrink:0, textDecoration:"none",
            border:"1px solid rgba(127,127,170,0.18)", color:"var(--color-on-surface-variant)" }}>
            <IconArrowL size={16} />
          </Link>
          <div style={{ width:44, height:44, borderRadius:14, flexShrink:0,
            background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0e7490)`,
            boxShadow:`0 0 24px ${TEAL}55`, display:"flex", alignItems:"center",
            justifyContent:"center", color:"#001016" }}>
            <IconGlobe size={22} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:18, lineHeight:1.1 }}>Navegador Vulcano</div>
            <div style={{ fontSize:11, color:"var(--color-on-surface-variant)", textTransform:"uppercase", letterSpacing:"0.4px" }}>
              Chrome único · persistente · IA &amp; Human
            </div>
          </div>
          {/* Status pill */}
          <div style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:7,
            padding:"6px 12px", borderRadius:999, flexShrink:0,
            background:`${(ready?GREEN:AMBER)}1a`, border:`1px solid ${(ready?GREEN:AMBER)}45` }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background: ready?GREEN:AMBER,
              boxShadow:`0 0 8px ${ready?GREEN:AMBER}` }} />
            <span style={{ color: ready?GREEN:AMBER, fontSize:12, fontWeight:700 }}>
              {ready ? "Activo" : "Iniciando"}
            </span>
          </div>
        </div>

        {/* Card principal */}
        <div style={{ borderRadius:18, padding:"22px 22px 24px",
          background:"var(--color-surface)", border:"1px solid rgba(127,127,170,0.14)" }}>

          <h2 style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:800, letterSpacing:"-0.02em",
            lineHeight:1.05, margin:"0 0 10px" }}>
            Una sola ventana.<br/><span style={{ color:TEAL }}>Una sola sesión.</span>
          </h2>
          <p style={{ fontSize:13.5, color:"var(--color-on-surface-variant)", lineHeight:1.6, margin:"0 0 6px" }}>
            Inicias sesión <b>una vez</b> en el navegador completo. Las sesiones quedan
            persistentes en disco y los agentes las reutilizan por CDP — sin volver a loguear.
          </p>
          {email && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:7, marginTop:6, marginBottom:14,
              fontSize:12, color:"var(--color-on-surface-variant)" }}>
              <IconFingerprint size={14} style={{ color:VIOLET }} /> Perfil activo: <b style={{ color:"var(--color-on-surface)" }}>{email}</b>
            </div>
          )}

          {/* Servicios */}
          <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"1px",
            color:"var(--color-on-surface-variant)", margin:"10px 0 8px", fontWeight:600 }}>
            Servicios listos para login
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, marginBottom:20 }}>
            {SERVICES.map(s => (
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8,
                padding:"9px 12px", borderRadius:10, background:"var(--color-surface-low,rgba(255,255,255,0.03))",
                border:"1px solid rgba(127,127,170,0.12)" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:TEAL, flexShrink:0,
                  boxShadow:`0 0 6px ${TEAL}` }} />
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.1 }}>{s.name}</div>
                  <div style={{ fontSize:10, color:"var(--color-on-surface-variant)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.host}</div>
                </div>
              </div>
            ))}
          </div>

          {/* BOTON GRANDE */}
          <button onClick={abrir}
            style={{ width:"100%", padding:"16px 0", borderRadius:14, border:"none", cursor:"pointer",
              background:`linear-gradient(135deg, ${TEAL}, #0891b2)`, color:"#001016",
              fontSize:16, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center",
              gap:10, boxShadow:`0 0 30px ${TEAL}40` }}>
            <IconExtLink size={18} /> Abrir navegador completo
          </button>
          <div style={{ textAlign:"center", marginTop:10 }}>
            <a href={fullUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:11.5, color:"var(--color-on-surface-variant)", textDecoration:"none" }}>
              vulcano.vmomentum.site — se abre a pantalla completa en pestaña nueva
            </a>
          </div>

          {/* Guardrail */}
          <div style={{ display:"flex", gap:9, alignItems:"flex-start", marginTop:18,
            paddingTop:14, borderTop:"1px solid rgba(127,127,170,0.1)" }}>
            <span style={{ color:"var(--color-on-surface-variant)", flexShrink:0, display:"flex" }}>
              <IconShield size={15} />
            </span>
            <p style={{ margin:0, fontSize:11, color:"var(--color-on-surface-variant)", lineHeight:1.5 }}>
              Tú haces los <b>logins, captchas y pagos</b> en la ventana completa. Una vez dentro,
              la sesión persiste y los agentes la reutilizan automáticamente.
            </p>
          </div>
        </div>

        {/* Pie */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7,
          marginTop:16, fontSize:11, color:"var(--color-on-surface-variant)" }}>
          <IconActivity size={13} style={{ color:GREEN }} /> Sesión persistente · sobrevive reinicios del contenedor
        </div>
      </motion.div>
    </div>
  );
}
