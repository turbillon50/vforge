"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconGlobe, IconActivity, IconCheck, IconFingerprint,
  IconRefresh, IconExtLink, IconShield, IconWarn, IconArrowL,
  IconRocket, IconArrowR,
} from "@/components/brand/VFIcons";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";

const TEAL  = "var(--color-cyan-400)";   // #22d3ee — conectado / Vulcano
const VIOLET = "var(--color-violet-400)"; // #a78bfa — acento marca
const AMBER = "#f5a623";                  // tu turno / intervención
const GREEN = "#22c55e";                  // badge "Conectado"
const POLL  = 4000;

type Profile = { name: string; email: string; color: string; avatar: string };
type Instance = {
  ok: boolean; status: string; ready: boolean;
  vnc_url?: string; handoff_url?: string; username?: string;
  vnc_password?: string; is_owner?: boolean;
  profiles?: Profile[]; active_profile?: string; eta_seconds?: number;
};
type HandoffState = {
  driver: "vulcano" | "human";
  handoff: { active: boolean; reason: string };
  log: Array<{ type: string; msg: string; ts: number }>;
};

export function VulcanoBrowser() {
  const [inst, setInst]     = useState<Instance | null>(null);
  const [hs, setHs]         = useState<HandoffState | null>(null);
  const [loading, setLoad]  = useState(true);
  const [prov, setProv]     = useState(false);
  const [taking, setTaking] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  // ── Barra de control: Luis le dicta a la IA a dónde navegar ──
  const [cmdUrl, setCmdUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [aiGoal, setAiGoal] = useState("");
  const [aiSending, setAiSending] = useState(false);
  // Responsive: en celular apilamos en vez de columnas
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchInst = useCallback(async () => {
    try {
      const r = await fetch("/api/navegador", { cache: "no-store" });
      const d: Instance = await r.json();
      setInst(d); setLoad(false);
    } catch { setLoad(false); }
  }, []);

  useEffect(() => { fetchInst(); }, [fetchInst]);

  const pollHs = useCallback(async () => {
    if (!inst?.ready || !inst.handoff_url) return;
    try {
      const r = await fetch(inst.handoff_url, { cache: "no-store" });
      if (r.ok) setHs(await r.json());
    } catch {}
  }, [inst?.ready, inst?.handoff_url]);

  useEffect(() => {
    if (!inst?.ready) return;
    pollHs();
    const id = setInterval(pollHs, POLL);
    return () => clearInterval(id);
  }, [inst?.ready, pollHs]);

  // Fallback: si onLoad del iframe no dispara (cross-origin), quita el overlay igual.
  useEffect(() => {
    if (!inst?.ready) return;
    const t = setTimeout(() => setIframeLoaded(true), 6000);
    return () => clearTimeout(t);
  }, [inst?.ready, iframeKey]);

  const provision = async () => {
    setProv(true);
    const r = await fetch("/api/navegador", { method: "POST" });
    const d = await r.json();
    if (d.ok) {
      const check = setInterval(async () => {
        const r2 = await fetch("/api/navegador", { cache: "no-store" });
        const d2: Instance = await r2.json();
        setInst(d2);
        if (d2.ready) { clearInterval(check); setProv(false); }
      }, 4000);
    } else setProv(false);
  };

  const apiCall = async (path: string) => {
    if (!inst?.handoff_url) return;
    setTaking(true);
    await fetch(inst.handoff_url.replace("/handoff", path), { method: "POST" }).catch(() => {});
    await pollHs();
    setTaking(false);
  };

  // Dicta a la IA a dónde ir → POST /api/navegador/control (action:navigate)
  const navega = async (url: string) => {
    const target = url.trim();
    if (!target || sending) return;
    const full = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    setSending(true);
    setLastResult(null);
    try {
      const r = await fetch("/api/navegador/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "navigate", url: full }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Refresca el VNC para que se vea el cambio en el Chrome visible
      setIframeLoaded(false);
      setIframeKey(k => k + 1);
      let host = full;
      try { host = new URL(full).hostname.replace(/^www\./, ""); } catch {}
      setLastResult(`La IA navegó a ${host}`);
      setCmdUrl("");
    } catch {
      setLastResult("No se pudo enviar la orden — reintenta");
    } finally {
      setSending(false);
    }
  };

  // Modo IA: Luis dicta una meta en lenguaje natural, la IA la planea y navega sola
  const pideALaIA = async (goal: string) => {
    const g = goal.trim();
    if (!g || aiSending) return;
    setAiSending(true);
    setLastResult(null);
    try {
      const r = await fetch("/api/navegador/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: g }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLastResult("Vulcano esta planeando \u2014 mira el panel y el navegador");
      setAiGoal("");
      // refresca el VNC un par de veces para ir viendo el progreso
      setTimeout(() => setIframeKey(k => k + 1), 4000);
      setTimeout(() => setIframeKey(k => k + 1), 12000);
    } catch {
      setLastResult("No se pudo enviar la orden a la IA");
    } finally {
      setAiSending(false);
    }
  };

  // El indicador de resultado desaparece a los 3s
  useEffect(() => {
    if (!lastResult) return;
    const t = setTimeout(() => setLastResult(null), 3000);
    return () => clearTimeout(t);
  }, [lastResult]);

  const isHuman  = hs?.driver === "human";
  const needsYou = hs?.handoff?.active ?? false;
  const accent   = isHuman ? AMBER : TEAL;
  const logs     = [...(hs?.log ?? [])].reverse().slice(0, 12);
  const profiles = inst?.profiles ?? [];
  const ownerEmail = inst?.active_profile ?? "";
  const activeProfile = profiles.find(p => p.email === ownerEmail);

  // URL del iframe KasmVNC con auto-login (password) + ajuste remoto
  const vncSrc = inst?.vnc_url
    ? `${inst.vnc_url}${inst.vnc_password
        ? `?password=${encodeURIComponent(inst.vnc_password)}&autoconnect=true&resize=${isMobile ? "scale" : "remote"}&reconnect=true`
        : ""}`
    : "";

  // ─── LOADING ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", minHeight:0, background:"var(--color-void)" }}>
      <ObsidianLoader size="lg" label="Conectando al Navegador Vulcano…" />
    </div>
  );

  // ─── NO PROVISIONADO (solo para usuarios sin instancia, no owner) ──
  if (!inst?.ready && inst?.status !== "provisioning") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", minHeight:0, background:"var(--color-void)", color:"var(--color-on-surface)",
      fontFamily:"Inter,-apple-system,sans-serif" }}>
      <motion.div
        initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        style={{ maxWidth:460, textAlign:"center", padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:14,
            background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0e7490)`,
            boxShadow:`0 0 24px ${TEAL}55`, display:"flex", alignItems:"center",
            justifyContent:"center", color:"#001016" }}>
            <IconGlobe size={22} />
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontWeight:800, fontSize:18 }}>Navegador Vulcano</div>
            <div style={{ fontSize:11, color:"var(--color-on-surface-variant)", textTransform:"uppercase" }}>IA &amp; Human · VForge</div>
          </div>
        </div>
        <h2 style={{ fontSize:"clamp(1.6rem,5vw,2.4rem)", fontWeight:800,
          letterSpacing:"-0.03em", lineHeight:1, marginBottom:16 }}>
          Tu navegador<br/><span style={{ color:TEAL }}>en la nube.</span>
        </h2>
        <p style={{ fontSize:14, color:"var(--color-on-surface-variant)", lineHeight:1.6, marginBottom:28 }}>
          Chrome remoto operado por Vulcano. Cuando hay un{" "}
          <b style={{ color:AMBER }}>login, captcha o pago</b> — tú tomas el control.
        </p>
        {[
          { I:IconActivity,    t:"Vulcano conduce", d:"La IA navega automáticamente", c:TEAL },
          { I:IconWarn,        t:"Tú intervienes",  d:"Solo logins, captchas y pagos", c:AMBER },
          { I:IconFingerprint, t:"Multi-perfil",    d:"Tus cuentas al estilo Chrome", c:VIOLET },
          { I:IconShield,      t:"Aislado",         d:"Tu sesión separada de los demás", c:GREEN },
        ].map(f => (
          <div key={f.t} style={{ display:"flex", gap:12, textAlign:"left", marginBottom:10,
            padding:"10px 14px", borderRadius:12, alignItems:"center",
            background:"var(--color-surface)", border:"1px solid rgba(127,127,170,0.12)" }}>
            <span style={{ color:f.c, flexShrink:0, display:"flex" }}><f.I size={18} /></span>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{f.t}</div>
              <div style={{ fontSize:12, color:"var(--color-on-surface-variant)" }}>{f.d}</div>
            </div>
          </div>
        ))}
        <button onClick={provision} disabled={prov}
          style={{ marginTop:20, width:"100%", padding:"14px 0", borderRadius:14,
            border:"none", background:`linear-gradient(135deg, ${TEAL}, #0891b2)`,
            color:"#001016", fontSize:15, fontWeight:800, cursor:"pointer",
            opacity:prov?0.7:1, boxShadow:`0 0 30px ${TEAL}40` }}>
          {prov ? "⏳ Activando (~30s)…" : "⚡ Activar mi Navegador Vulcano"}
        </button>
        <Link href="/app" style={{ display:"block", marginTop:12, fontSize:12, color:"var(--color-on-surface-variant)", textDecoration:"none" }}>
          ← Volver al workspace
        </Link>
      </motion.div>
    </div>
  );

  // ─── PROVISIONANDO ─────────────────────────────────────────────
  if (inst?.status === "provisioning") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", minHeight:0, background:"var(--color-void)" }}>
      <ObsidianLoader size="lg" label="Activando tu Chrome privado… (~30s)" />
    </div>
  );

  // ─── ACTIVO: conectado ─────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column",
      height:"100%", minHeight:0, background:"var(--color-void)", color:"var(--color-on-surface)",
      fontFamily:"Inter,-apple-system,sans-serif", overflow:"hidden" }}>

      {/* ── TOPBAR: estado de conexión ── */}
      <div style={{ display:"flex", alignItems:"center", gap: isMobile ? 8 : 12,
        padding: isMobile ? "10px 12px" : "10px 16px", borderBottom:"1px solid rgba(127,127,170,0.12)",
        background:"var(--color-surface)", flexShrink:0 }}>

        <Link href="/app" style={{ display:"flex", alignItems:"center", justifyContent:"center",
          width:32, height:32, borderRadius:9, flexShrink:0,
          border:"1px solid rgba(127,127,170,0.18)", color:"var(--color-on-surface-variant)",
          textDecoration:"none" }}>
          <IconArrowL size={16} />
        </Link>

        <div style={{ width:30, height:30, borderRadius:9, flexShrink:0,
          background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0e7490)`,
          boxShadow:`0 0 14px ${TEAL}55`, display:"flex", alignItems:"center",
          justifyContent:"center", color:"#001016" }}>
          <IconGlobe size={17} />
        </div>

        <div style={{ minWidth:0, flex: isMobile ? "0 1 auto" : "0 0 auto" }}>
          <div style={{ fontWeight:800, fontSize: isMobile ? 13 : 14, letterSpacing:0.2, lineHeight:1.1,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Navegador Vulcano</div>
          {!isMobile && (
            <div style={{ fontSize:10, color:"var(--color-on-surface-variant)", textTransform:"uppercase", letterSpacing:"0.4px" }}>
              Chrome en la nube · VForge
            </div>
          )}
        </div>

        {/* Badge CONECTADO con tu cuenta */}
        <motion.div
          initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap: isMobile ? 5 : 8,
            padding: isMobile ? "5px 9px" : "6px 12px", borderRadius:999, flexShrink:0,
            background:`${GREEN}1a`, border:`1px solid ${GREEN}45` }}>
          <span style={{ position:"relative", display:"flex", width:8, height:8 }}>
            <motion.span
              animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:2, repeat:Infinity }}
              style={{ position:"absolute", inset:0, borderRadius:"50%", background:GREEN,
                boxShadow:`0 0 8px ${GREEN}` }} />
          </span>
          <span style={{ color:GREEN, fontSize: isMobile ? 11 : 12, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <IconCheck size={13} /> Conectado
          </span>
          {ownerEmail && !isMobile && (
            <span style={{ color:"var(--color-on-surface-variant)", fontSize:11, fontWeight:500,
              maxWidth: 200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              borderLeft:"1px solid rgba(127,127,170,0.2)", paddingLeft:8 }}>
              {ownerEmail}
            </span>
          )}
        </motion.div>

        {/* Refrescar VNC */}
        <button onClick={() => { setIframeLoaded(false); setIframeKey(k => k+1); }}
          title="Reconectar"
          style={{ display:"flex", alignItems:"center", justifyContent:"center",
            width:32, height:32, borderRadius:9, cursor:"pointer", flexShrink:0,
            background:"var(--color-surface-low)", color:"var(--color-on-surface-variant)",
            border:"1px solid rgba(127,127,170,0.18)" }}>
          <IconRefresh size={15} />
        </button>

        {/* Abrir en pestaña */}
        {vncSrc && (
          <a href={vncSrc} target="_blank" rel="noreferrer" title="Abrir en pestaña"
            style={{ display:"flex", alignItems:"center", justifyContent:"center",
              width:32, height:32, borderRadius:9, flexShrink:0, textDecoration:"none",
              background:"var(--color-surface-low)", color:VIOLET,
              border:"1px solid rgba(139,92,246,0.3)" }}>
            <IconExtLink size={15} />
          </a>
        )}

        {/* Selector de perfiles (Chrome-style) */}
        {profiles.length > 0 && (
          <div style={{ position:"relative", flexShrink:0 }}>
            <button onClick={() => setShowProfiles(v => !v)} title="Mis cuentas"
              style={{ width:32, height:32, borderRadius:"50%", border:"none", cursor:"pointer",
                background:`${activeProfile?.color ?? VIOLET}30`,
                color: activeProfile?.color ?? VIOLET, fontSize:12, fontWeight:800,
                outline: showProfiles ? `2px solid ${activeProfile?.color ?? VIOLET}` : "none",
                outlineOffset:2 }}>
              {activeProfile?.avatar ?? (ownerEmail[0]?.toUpperCase() ?? "L")}
            </button>

            <AnimatePresence>
              {showProfiles && (
                <>
                  <div onClick={() => setShowProfiles(false)}
                    style={{ position:"fixed", inset:0, zIndex:30 }} />
                  <motion.div
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                    style={{ position:"absolute", right:0, top:40, zIndex:40, width:240,
                      background:"var(--color-surface-elev)", border:"1px solid rgba(139,92,246,0.25)",
                      borderRadius:14, padding:8, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                    <div style={{ fontSize:10, color:"var(--color-on-surface-variant)", textTransform:"uppercase",
                      letterSpacing:"0.8px", padding:"4px 10px 6px", fontWeight:600 }}>
                      Conectado como
                    </div>
                    {profiles.map(p => (
                      <div key={p.email}
                        style={{ display:"flex", alignItems:"center", gap:10,
                          padding:"8px 10px", borderRadius:8, cursor:"pointer",
                          background: p.email === ownerEmail ? `${p.color}1f` : "transparent" }}>
                        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                          background:`${p.color}25`, border:`1.5px solid ${p.color}55`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, fontWeight:800, color:p.color }}>
                          {p.avatar}
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--color-on-surface)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize:10, color:"var(--color-on-surface-variant)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {p.email}
                          </div>
                        </div>
                        {p.email === ownerEmail && (
                          <span style={{ color:GREEN, flexShrink:0, display:"flex" }}><IconCheck size={15} /></span>
                        )}
                      </div>
                    ))}
                    <div style={{ height:1, background:"rgba(127,127,170,0.1)", margin:"6px 0" }} />
                    <div style={{ fontSize:11, color:"var(--color-on-surface-variant)", padding:"4px 10px",
                      display:"flex", alignItems:"center", gap:6 }}>
                      <IconFingerprint size={13} /> Todas comparten este Chrome
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── BARRA DE CONTROL: Luis le dicta a la IA a donde ir ── */}
      {inst?.ready && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, padding: isMobile ? "10px 12px" : "10px 14px",
          borderTop:"1px solid rgba(127,127,170,0.12)",
          borderBottom:"1px solid rgba(127,127,170,0.12)",
          background:"rgba(15,12,30,0.6)", backdropFilter:"blur(8px)", flexShrink:0 }}>

          {/* Fila 1: input URL + boton Ir */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0,
              padding:"7px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)",
              border:`1px solid ${VIOLET}33` }}>
              <IconGlobe size={15} style={{ color:VIOLET, flexShrink:0 }} />
              <input
                value={cmdUrl}
                onChange={(e) => setCmdUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") navega(cmdUrl); }}
                placeholder={isMobile ? "URL: dashboard.clerk.com..." : "Dile a la IA a donde ir: dashboard.clerk.com..."}
                style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none",
                  color:"var(--color-on-surface)", fontSize:13 }}
              />
            </div>
            <button
              onClick={() => navega(cmdUrl)}
              disabled={sending || !cmdUrl.trim()}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px",
                borderRadius:8, border:"none", cursor: sending || !cmdUrl.trim() ? "default" : "pointer",
                background: sending || !cmdUrl.trim() ? "rgba(167,139,250,0.25)" : VIOLET,
                color:"#0a0a0f", fontSize:12, fontWeight:700, flexShrink:0,
                opacity: sending ? 0.6 : 1 }}>
              <IconRocket size={13} /> {sending ? "..." : "Ir"}
            </button>
          </div>

          {/* Fila 2: chips de destinos (scroll horizontal en movil) */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2,
            WebkitOverflowScrolling:"touch" }}>
            {[
              { label:"Clerk",  url:"https://dashboard.clerk.com" },
              { label:"Vercel", url:"https://vercel.com/dashboard" },
              { label:"Neon",   url:"https://console.neon.tech" },
              { label:"GitHub", url:"https://github.com/turbillon50" },
            ].map((d) => (
              <button key={d.label} onClick={() => navega(d.url)} disabled={sending}
                style={{ padding:"6px 14px", borderRadius:999, cursor: sending ? "default" : "pointer",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(127,127,170,0.18)",
                  color:"var(--color-muted)", fontSize:11.5, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Fila 3: input IA lenguaje natural + boton */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0,
              padding:"7px 12px", borderRadius:10, background:"rgba(167,139,250,0.06)",
              border:`1px solid ${VIOLET}40` }}>
              <span style={{ fontSize:11, fontWeight:700, color:VIOLET, flexShrink:0,
                display:"inline-flex", alignItems:"center", gap:5 }}>
                <IconActivity size={13} /> IA
              </span>
              <input
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") pideALaIA(aiGoal); }}
                placeholder={isMobile ? "Busca vuelos a Cancun..." : "Dile en tus palabras: busca vuelos a Cancun, abre mis apps de Clerk..."}
                style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none",
                  color:"var(--color-on-surface)", fontSize:13 }}
              />
            </div>
            <button
              onClick={() => pideALaIA(aiGoal)}
              disabled={aiSending || !aiGoal.trim()}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px",
                borderRadius:8, border:`1px solid ${VIOLET}`, flexShrink:0,
                cursor: aiSending || !aiGoal.trim() ? "default" : "pointer",
                background: aiSending ? "rgba(167,139,250,0.15)" : "transparent",
                color: VIOLET, fontSize:12, fontWeight:700, opacity: aiSending ? 0.7 : 1, whiteSpace:"nowrap" }}>
              <IconActivity size={13} /> {aiSending ? "..." : (isMobile ? "IA" : "Que lo haga la IA")}
            </button>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                style={{ display:"inline-flex", alignItems:"center", gap:6,
                  fontSize:11.5, fontWeight:600,
                  color: lastResult.startsWith("No se") ? AMBER : GREEN }}>
                <IconCheck size={13} /> {lastResult}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── CUERPO: VNC + panel ── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(280px,340px)", minHeight:0, overflowY:"auto" }}>

        {/* iframe Chrome */}
        <div style={{ position:"relative", background:"#0a0a0f",
          borderRight:"1px solid rgba(127,127,170,0.12)", overflow:"hidden",
          minHeight: isMobile ? "60vh" : 0 }}>

          {/* Pill driver */}
          <div style={{ position:"absolute", top:12, left:12, zIndex:20, pointerEvents:"none",
            display:"inline-flex", alignItems:"center", gap:7, padding:"5px 12px",
            borderRadius:999, background:accent+"22", border:`1px solid ${accent}45`,
            fontSize:11, fontWeight:600, color:accent, backdropFilter:"blur(6px)" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:accent,
              boxShadow:`0 0 8px ${accent}`, animation:"vpulse 2s infinite" }} />
            {isHuman ? "Tu turno — tú controlas" : "Vulcano conduciendo"}
          </div>

          {/* Banner intervención */}
          <AnimatePresence>
            {needsYou && !isHuman && (
              <motion.div
                initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                style={{ position:"absolute", top:50, left:"50%", transform:"translateX(-50%)",
                  zIndex:20, padding:"8px 18px", borderRadius:10, whiteSpace:"nowrap",
                  display:"flex", alignItems:"center", gap:7,
                  background:"rgba(133,79,11,0.35)", border:`1px solid ${AMBER}60`,
                  color:"#f2c879", fontSize:12, fontWeight:600, backdropFilter:"blur(8px)" }}>
                <IconWarn size={14} /> {hs?.handoff?.reason || "Intervención requerida"}
              </motion.div>
            )}
          </AnimatePresence>

          {vncSrc ? (
            <>
              {/* Overlay mientras carga el VNC */}
              <AnimatePresence>
                {!iframeLoaded && (
                  <motion.div
                    initial={{ opacity:1 }} exit={{ opacity:0 }}
                    style={{ position:"absolute", inset:0, zIndex:10, display:"flex",
                      alignItems:"center", justifyContent:"center", background:"var(--color-void)" }}>
                    <ObsidianLoader size="md" label="Cargando escritorio remoto…" />
                  </motion.div>
                )}
              </AnimatePresence>
              <iframe
                key={`${iframeKey}-${isMobile ? "m" : "d"}`}
                src={vncSrc}
                onLoad={() => setIframeLoaded(true)}
                style={{ width:"100%", height:"100%", border:0, display:"block" }}
                allow="clipboard-read; clipboard-write; fullscreen"
                title="Navegador Vulcano"
              />
            </>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              height:"100%", color:"var(--color-on-surface-variant)", flexDirection:"column", gap:10 }}>
              <IconGlobe size={34} />
              <span style={{ fontSize:13 }}>Iniciando conexión…</span>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div style={{ display:"flex", flexDirection:"column", minHeight: isMobile ? "auto" : 0,
          maxHeight: isMobile ? "40vh" : "none", overflowY:"auto",
          borderTop: isMobile ? "1px solid rgba(127,127,170,0.12)" : "none",
          background:"var(--color-surface)" }}>

          {/* Estado driver */}
          <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(127,127,170,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8,
              fontSize:13, fontWeight:700, color:accent }}>
              <span style={{ display:"flex" }}>
                {isHuman ? <IconFingerprint size={15} /> : <IconActivity size={15} />}
              </span>
              {isHuman ? "Tu turno — tú tienes el control" : "Vulcano conduciendo"}
            </div>
            <p style={{ margin:"4px 0 0", fontSize:11, color:"var(--color-on-surface-variant)", lineHeight:1.5 }}>
              {isHuman
                ? "Haz lo que necesitas y devuelve cuando termines."
                : "La IA opera el navegador. Entra cuando haya login, captcha o pago."}
            </p>
          </div>

          {/* Handoff card */}
          {needsYou && !isHuman && (
            <div style={{ margin:"12px 14px", padding:14, borderRadius:12,
              background:"rgba(133,79,11,0.15)", border:`1px solid ${AMBER}45` }}>
              <div style={{ fontSize:13, color:"#f4ce83", fontWeight:700, marginBottom:6,
                display:"flex", alignItems:"center", gap:6 }}>
                <IconWarn size={15} /> Tu turno — acción requerida
              </div>
              <p style={{ margin:"0 0 12px", fontSize:12, color:"#d9c7a6", lineHeight:1.5 }}>
                {hs?.handoff?.reason || "Vulcano necesita tu intervención."}
              </p>
              <button onClick={() => apiCall("/handoff/take")} disabled={taking}
                style={{ width:"100%", padding:"9px 0", borderRadius:9, border:"none",
                  background:AMBER, color:"#1a0f00", fontSize:12, fontWeight:700,
                  cursor:"pointer", opacity:taking?0.6:1 }}>
                {taking ? "Conectando…" : "Tomar control"}
              </button>
            </div>
          )}

          {isHuman && (
            <div style={{ margin:"12px 14px" }}>
              <button onClick={() => apiCall("/handoff/done")} disabled={taking}
                style={{ width:"100%", padding:"9px 0", borderRadius:9, border:"none",
                  background:TEAL, color:"#001016", fontSize:12, fontWeight:700,
                  cursor:"pointer", opacity:taking?0.6:1, display:"flex",
                  alignItems:"center", justifyContent:"center", gap:6 }}>
                <IconCheck size={14} /> {taking ? "Transfiriendo…" : "Terminé — devolver a Vulcano"}
              </button>
            </div>
          )}

          {/* Log */}
          <div style={{ flex:1, padding:"4px 14px 14px", overflowY:"auto", minHeight:0 }}>
            <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"1px",
              color:"var(--color-on-surface-variant)", margin:"12px 0 8px",
              display:"flex", alignItems:"center", gap:6 }}>
              <IconActivity size={11} /> Log en tiempo real
            </div>
            {logs.length === 0 ? (
              <p style={{ fontSize:11, color:"var(--fg-muted)" }}>Sin actividad aún…</p>
            ) : logs.map((ev, i) => (
              <div key={i} style={{ display:"flex", gap:7, padding:"5px 0",
                borderBottom:"1px solid rgba(127,127,170,0.06)", fontSize:11 }}>
                <span style={{ color:ev.type === "need" ? AMBER : TEAL, flexShrink:0, display:"flex" }}>
                  {ev.type === "need" ? <IconWarn size={12} /> : <IconCheck size={12} />}
                </span>
                <span style={{ flex:1, color:ev.type === "need" ? "#f2c879" : "var(--color-on-surface-variant)",
                  lineHeight:1.4 }}>{ev.msg}</span>
                <span style={{ color:"var(--fg-muted)", fontSize:9, flexShrink:0 }}>
                  {new Date(ev.ts).toLocaleTimeString("es-MX", { hour12:false })}
                </span>
              </div>
            ))}
          </div>

          {/* Guardrails */}
          <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(127,127,170,0.08)",
            display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ color:"var(--color-on-surface-variant)", flexShrink:0, display:"flex" }}>
              <IconShield size={14} />
            </span>
            <p style={{ margin:0, fontSize:10, color:"var(--color-on-surface-variant)", lineHeight:1.5 }}>
              Vulcano <b>nunca</b> hace logins, registros, captchas ni pagos. Siempre los haces tú.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes vpulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
