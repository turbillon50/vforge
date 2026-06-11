"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const TEAL  = "#14b8a6";
const AMBER = "#f5a623";
const POLL  = 3500;

type Instance = {
  ok: boolean; status: string; ready: boolean;
  vnc_url?: string; console_url?: string; handoff_url?: string;
  username?: string; eta_seconds?: number;
};
type HandoffState = {
  driver: "vulcano"|"human";
  handoff: { active: boolean; reason: string };
  log: Array<{ type: string; msg: string; ts: number }>;
};

function s(style: React.CSSProperties): React.CSSProperties { return style; }

export function VulcanoBrowser() {
  const { user } = useUser();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [handoff, setHandoff]   = useState<HandoffState | null>(null);
  const [loading, setLoading]   = useState(true);
  const [provisioning, setProv] = useState(false);
  const [taking, setTaking]     = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // 1. Obtener/crear instancia del usuario
  const fetchInstance = useCallback(async () => {
    const r = await fetch("/api/navegador", { cache: "no-store" });
    const d: Instance = await r.json();
    setInstance(d);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInstance(); }, [fetchInstance]);

  // 2. Poll handoff cuando hay instancia activa
  const pollHandoff = useCallback(async () => {
    if (!instance?.ready || !instance.handoff_url) return;
    try {
      const r = await fetch(instance.handoff_url, { cache: "no-store" });
      if (r.ok) setHandoff(await r.json());
    } catch {}
  }, [instance]);

  useEffect(() => {
    if (!instance?.ready) return;
    pollHandoff();
    const id = setInterval(pollHandoff, POLL);
    return () => clearInterval(id);
  }, [instance?.ready, pollHandoff]);

  // 3. Provisionar
  const provision = async () => {
    setProv(true);
    const r = await fetch("/api/navegador", { method: "POST" });
    const d = await r.json();
    if (d.ok) {
      // Poll hasta que esté activo
      const check = setInterval(async () => {
        const r2 = await fetch("/api/navegador", { cache: "no-store" });
        const d2: Instance = await r2.json();
        setInstance(d2);
        if (d2.ready) { clearInterval(check); setProv(false); }
      }, 4000);
    } else {
      setProv(false);
    }
  };

  const takeControl = async () => {
    if (!instance?.handoff_url) return;
    setTaking(true);
    await fetch(instance.handoff_url.replace("/handoff","/handoff/take"), { method: "POST" }).catch(() => {});
    await pollHandoff(); setTaking(false);
  };

  const returnControl = async () => {
    if (!instance?.handoff_url) return;
    setTaking(true);
    await fetch(instance.handoff_url.replace("/handoff","/handoff/done"), { method: "POST" }).catch(() => {});
    await pollHandoff(); setTaking(false);
  };

  const isHuman  = handoff?.driver === "human";
  const needsYou = handoff?.handoff?.active ?? false;
  const accent   = isHuman ? AMBER : TEAL;
  const logs     = [...(handoff?.log ?? [])].reverse().slice(0, 12);

  // ── LOADING ──
  if (loading) return (
    <div style={s({ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#8a95a3", flexDirection:"column", gap:12 })}>
      <div style={s({ width:32, height:32, border:`2px solid ${TEAL}`, borderTopColor:"transparent",
        borderRadius:"50%", animation:"spin 0.8s linear infinite" })} />
      <span style={s({ fontSize:13 })}>Cargando Navegador Vulcano…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── NO PROVISIONADO ──
  if (!instance?.ready && instance?.status !== "provisioning") return (
    <div style={s({ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,-apple-system,sans-serif" })}>
      <div style={s({ maxWidth:460, textAlign:"center", padding:"0 24px" })}>
        {/* Brand header */}
        <div style={s({ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:24 })}>
          <div style={s({ width:44, height:44, borderRadius:14,
            background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0f6e56)`,
            boxShadow:`0 0 24px ${TEAL}50`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 })}>
            🌐
          </div>
          <div style={s({ textAlign:"left" })}>
            <div style={s({ fontWeight:800, fontSize:18, letterSpacing:0.2 })}>Navegador Vulcano</div>
            <div style={s({ fontSize:11, color:"#8a95a3", textTransform:"uppercase", letterSpacing:"0.4px" })}>
              IA &amp; Human · VForge
            </div>
          </div>
        </div>

        <h2 style={s({ fontSize:"clamp(1.6rem,5vw,2.4rem)", fontWeight:800,
          letterSpacing:"-0.03em", lineHeight:1, marginBottom:16 })}>
          Tu navegador<br/>
          <span style={s({ color:TEAL })}>en la nube.</span>
        </h2>
        <p style={s({ fontSize:14, color:"#8a95a3", lineHeight:1.6, marginBottom:28 })}>
          Un Chrome remoto operado por Vulcano. La IA navega, llena formularios y ejecuta tareas.
          Cuando hay un <b style={s({color:AMBER})}>login, captcha o pago</b> — tú tomas el control.
          La IA nunca hace logins ni pagos, eso siempre es tuyo.
        </p>

        {/* Features */}
        {[
          { i:"🟢", t:"Vulcano conduce", d:"La IA navega por ti de forma automática" },
          { i:"🟠", t:"Tú intervienes", d:"Solo cuando hay captchas, logins o pagos" },
          { i:"🔒", t:"Tu sesión, aislada", d:"Perfil propio, cero cruce con otros usuarios" },
        ].map(f => (
          <div key={f.t} style={s({ display:"flex", gap:12, textAlign:"left", marginBottom:12,
            padding:"10px 14px", borderRadius:12,
            background:"rgba(127,127,170,0.06)", border:"1px solid rgba(127,127,170,0.1)" })}>
            <span style={s({ fontSize:20 })}>{f.i}</span>
            <div>
              <div style={s({ fontWeight:600, fontSize:13 })}>{f.t}</div>
              <div style={s({ fontSize:12, color:"#8a95a3" })}>{f.d}</div>
            </div>
          </div>
        ))}

        <button onClick={provision} disabled={provisioning}
          style={s({ marginTop:20, width:"100%", padding:"14px 0", borderRadius:14,
            border:"none", background:`linear-gradient(135deg, ${TEAL}, #0f9068)`,
            color:"#001a14", fontSize:15, fontWeight:800, cursor:"pointer",
            opacity: provisioning ? 0.7 : 1,
            boxShadow:`0 0 30px ${TEAL}40` })}>
          {provisioning ? "⏳ Activando tu navegador (~30s)…" : "⚡ Activar mi Navegador Vulcano"}
        </button>
        <p style={s({ fontSize:11, color:"#444", marginTop:12 })}>
          Se crea tu instancia personal. Solo se hace una vez.
        </p>
        <Link href="/app" style={s({ display:"block", marginTop:8, fontSize:12, color:"#8a95a3", textDecoration:"none" })}>
          ← Volver al workspace
        </Link>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── PROVISIONANDO ──
  if (instance?.status === "provisioning") return (
    <div style={s({ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,-apple-system,sans-serif", flexDirection:"column", gap:16 })}>
      <div style={s({ width:48, height:48, border:`3px solid ${TEAL}`,
        borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" })}/>
      <div style={s({ textAlign:"center" })}>
        <div style={s({ fontWeight:700, fontSize:16, marginBottom:6 })}>Activando tu Navegador Vulcano</div>
        <div style={s({ fontSize:13, color:"#8a95a3" })}>Creando tu Chrome privado en la nube… (~30s)</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── ACTIVO: layout 2 columnas ──
  const vncUrl = instance?.vnc_url ?? "https://vulcano.vmomentum.site/";

  return (
    <div style={s({ display:"grid", gridTemplateColumns:"1fr 360px",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,-apple-system,sans-serif", overflow:"hidden" })}>

      {/* ── LEFT: iframe Chrome ── */}
      <div style={s({ position:"relative", background:"#000",
        borderRight:"1px solid rgba(127,127,170,0.1)" })}>

        {/* Pill quién conduce */}
        <div style={s({ position:"absolute", top:12, left:12, zIndex:10, pointerEvents:"none",
          display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px",
          borderRadius:999, background:accent+"18", border:`1px solid ${accent}40`,
          fontSize:12, fontWeight:600, color:accent })}>
          <span style={s({ width:8, height:8, borderRadius:"50%", background:accent,
            boxShadow:`0 0 10px ${accent}`, animation:"pulse 2s infinite" })}/>
          {isHuman ? "Tu turno" : "Vulcano conduciendo"}
        </div>

        {/* Banner ámbar si Vulcano necesita al humano */}
        {needsYou && !isHuman && (
          <div style={s({ position:"absolute", top:52, left:"50%", transform:"translateX(-50%)",
            zIndex:10, padding:"8px 20px", borderRadius:10, whiteSpace:"nowrap",
            background:"rgba(133,79,11,0.22)", border:`1px solid ${AMBER}50`,
            color:"#f2c879", fontSize:13, fontWeight:600, backdropFilter:"blur(8px)" })}>
            ⚠ {handoff?.handoff?.reason || "Tu intervención requerida"}
          </div>
        )}

        <iframe
          key={iframeKey}
          src={vncUrl}
          style={s({ width:"100%", height:"100%", border:0, display:"block" })}
          allow="clipboard-read; clipboard-write"
          title="Navegador Vulcano"
        />
      </div>

      {/* ── RIGHT: panel ── */}
      <div style={s({ display:"flex", flexDirection:"column", height:"100dvh", overflowY:"auto" })}>

        {/* Header */}
        <div style={s({ padding:"16px 20px 14px",
          borderBottom:"1px solid rgba(127,127,170,0.1)",
          display:"flex", alignItems:"center", gap:12 })}>
          <Link href="/app" style={s({ display:"flex", alignItems:"center", justifyContent:"center",
            width:34, height:34, borderRadius:10,
            border:"1px solid rgba(127,127,170,0.18)",
            color:"#8a95a3", textDecoration:"none", fontSize:14 })}>←</Link>
          <div>
            <div style={s({ display:"flex", alignItems:"center", gap:8 })}>
              <div style={s({ width:20, height:20, borderRadius:6,
                background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0f6e56)`,
                boxShadow:`0 0 12px ${TEAL}60` })}/>
              <span style={s({ fontWeight:800, fontSize:15 })}>Navegador Vulcano</span>
            </div>
            <span style={s({ fontSize:11, color:"#8a95a3", textTransform:"uppercase", letterSpacing:"0.4px" })}>
              {instance?.username ?? "usuario"} · VForge
            </span>
          </div>
          {user && (
            <div style={s({ marginLeft:"auto", width:30, height:30, borderRadius:"50%",
              background:accent+"30", border:`1.5px solid ${accent}50`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:700, color:accent })}>
              {user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>

        {/* Status */}
        <div style={s({ padding:"14px 20px",
          borderBottom:"1px solid rgba(127,127,170,0.08)" })}>
          <div style={s({ display:"flex", alignItems:"center", gap:8,
            fontSize:14, fontWeight:600, color:accent })}>
            <span style={s({ width:9, height:9, borderRadius:"50%",
              background:accent, boxShadow:`0 0 8px ${accent}` })}/>
            {isHuman ? "Tu turno" : "Vulcano conduciendo"}
          </div>
          <p style={s({ margin:"4px 0 0", fontSize:12, color:"#8a95a3" })}>
            {isHuman
              ? "Estás al control. Haz lo que necesitas y devuelve cuando termines."
              : "La IA opera el navegador. Tú entras cuando hay login, captcha o pago."}
          </p>
        </div>

        {/* Handoff card — Vulcano pide al humano */}
        {needsYou && !isHuman && (
          <div style={s({ margin:"14px 16px", padding:16, borderRadius:14,
            background:"rgba(133,79,11,0.15)", border:`1px solid ${AMBER}40` })}>
            <h4 style={s({ margin:"0 0 6px", fontSize:15, color:"#f4ce83", fontWeight:700 })}>
              🟠 Tu turno — acción requerida
            </h4>
            <p style={s({ margin:"0 0 14px", fontSize:13, color:"#d9c7a6", lineHeight:1.5 })}>
              {handoff?.handoff?.reason || "Vulcano necesita tu intervención."}
            </p>
            <button onClick={takeControl} disabled={taking}
              style={s({ width:"100%", padding:"10px 0", borderRadius:10,
                border:"none", background:AMBER, color:"#1a0f00",
                fontSize:13, fontWeight:700, cursor:"pointer", opacity:taking?0.6:1 })}>
              {taking ? "Conectando…" : "Tomar control"}
            </button>
          </div>
        )}

        {/* Devolver control */}
        {isHuman && (
          <div style={s({ margin:"14px 16px" })}>
            <button onClick={returnControl} disabled={taking}
              style={s({ width:"100%", padding:"10px 0", borderRadius:10,
                border:"none", background:TEAL, color:"#001a14",
                fontSize:13, fontWeight:700, cursor:"pointer", opacity:taking?0.6:1 })}>
              {taking ? "Transfiriendo…" : "✓ Terminé — devolver a Vulcano"}
            </button>
          </div>
        )}

        {/* Log tiempo real */}
        <div style={s({ flex:1, padding:"0 16px 16px", overflowY:"auto" })}>
          <div style={s({ fontSize:10, textTransform:"uppercase", letterSpacing:"1px",
            color:"#8a95a3", marginBottom:10, marginTop:4 })}>
            ◎ Log en tiempo real
          </div>
          {logs.length === 0 ? (
            <p style={s({ fontSize:12, color:"#444" })}>Sin actividad aún…</p>
          ) : logs.map((ev, i) => (
            <div key={i} style={s({ display:"flex", gap:8, padding:"6px 0",
              borderBottom:"1px solid rgba(127,127,170,0.06)", fontSize:12 })}>
              <span style={s({ color: ev.type==="need" ? AMBER : TEAL, flexShrink:0 })}>
                {ev.type==="need" ? "⚠" : "✓"}
              </span>
              <span style={s({ flex:1, color: ev.type==="need" ? "#f2c879" : "#c9d5e0", lineHeight:1.4 })}>
                {ev.msg}
              </span>
              <span style={s({ color:"#444", fontSize:10, flexShrink:0 })}>
                {new Date(ev.ts).toLocaleTimeString("es-MX",{hour12:false})}
              </span>
            </div>
          ))}
        </div>

        {/* Guardrails */}
        <div style={s({ padding:"12px 16px", borderTop:"1px solid rgba(127,127,170,0.08)",
          display:"flex", gap:8, alignItems:"flex-start" })}>
          <span style={s({ color:"#8a95a3", flexShrink:0, marginTop:2 })}>🛡</span>
          <p style={s({ margin:0, fontSize:11, color:"#8a95a3", lineHeight:1.5 })}>
            La IA <b>nunca</b> hace logins, registros, captchas ni pagos.
            Eres responsable de lo que realices al tomar el control.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
