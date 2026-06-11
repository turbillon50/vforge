"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const TEAL  = "#14b8a6";
const AMBER = "#f5a623";
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

  const isHuman  = hs?.driver === "human";
  const needsYou = hs?.handoff?.active ?? false;
  const accent   = isHuman ? AMBER : TEAL;
  const logs     = [...(hs?.log ?? [])].reverse().slice(0, 10);
  const profiles = inst?.profiles ?? [];

  // URL del iframe con password auto-inyectado en query param
  const vncSrc = inst?.vnc_url
    ? `${inst.vnc_url}${inst.vnc_password ? `?password=${encodeURIComponent(inst.vnc_password)}&autoconnect=true&reconnect=true` : ""}`
    : "";

  // ─── LOADING ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#8a95a3",
      flexDirection:"column", gap:12, fontFamily:"Inter,sans-serif" }}>
      <div style={{ width:32, height:32, border:`2px solid ${TEAL}`,
        borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13 }}>Conectando al Navegador Vulcano…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─── NO PROVISIONADO ───────────────────────────────────────────
  if (!inst?.ready && inst?.status !== "provisioning") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,-apple-system,sans-serif" }}>
      <div style={{ maxWidth:460, textAlign:"center", padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:14,
            background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0f6e56)`,
            boxShadow:`0 0 24px ${TEAL}50`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:22 }}>🌐</div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontWeight:800, fontSize:18 }}>Navegador Vulcano</div>
            <div style={{ fontSize:11, color:"#8a95a3", textTransform:"uppercase" }}>IA & Human · VForge</div>
          </div>
        </div>
        <h2 style={{ fontSize:"clamp(1.6rem,5vw,2.4rem)", fontWeight:800,
          letterSpacing:"-0.03em", lineHeight:1, marginBottom:16 }}>
          Tu navegador<br/><span style={{ color:TEAL }}>en la nube.</span>
        </h2>
        <p style={{ fontSize:14, color:"#8a95a3", lineHeight:1.6, marginBottom:28 }}>
          Chrome remoto operado por Vulcano. Cuando hay un{" "}
          <b style={{ color:AMBER }}>login, captcha o pago</b> — tú tomas el control.
        </p>
        {[
          { i:"🟢", t:"Vulcano conduce", d:"La IA navega automáticamente" },
          { i:"🟠", t:"Tú intervienes",  d:"Solo logins, captchas y pagos" },
          { i:"👤", t:"Multi-perfil",    d:"Tus cuentas al estilo Chrome" },
          { i:"🔒", t:"Aislado",         d:"Tu sesión separada de los demás" },
        ].map(f => (
          <div key={f.t} style={{ display:"flex", gap:12, textAlign:"left", marginBottom:10,
            padding:"10px 14px", borderRadius:12,
            background:"rgba(127,127,170,0.06)", border:"1px solid rgba(127,127,170,0.1)" }}>
            <span style={{ fontSize:18 }}>{f.i}</span>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{f.t}</div>
              <div style={{ fontSize:12, color:"#8a95a3" }}>{f.d}</div>
            </div>
          </div>
        ))}
        <button onClick={provision} disabled={prov}
          style={{ marginTop:20, width:"100%", padding:"14px 0", borderRadius:14,
            border:"none", background:`linear-gradient(135deg, ${TEAL}, #0f9068)`,
            color:"#001a14", fontSize:15, fontWeight:800, cursor:"pointer",
            opacity:prov?0.7:1, boxShadow:`0 0 30px ${TEAL}40` }}>
          {prov ? "⏳ Activando (~30s)…" : "⚡ Activar mi Navegador Vulcano"}
        </button>
        <Link href="/app" style={{ display:"block", marginTop:12, fontSize:12, color:"#8a95a3", textDecoration:"none" }}>
          ← Volver al workspace
        </Link>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─── PROVISIONANDO ─────────────────────────────────────────────
  if (inst?.status === "provisioning") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,sans-serif", flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:`3px solid ${TEAL}`,
        borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <div style={{ textAlign:"center" }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Activando tu Navegador Vulcano</div>
        <div style={{ fontSize:13, color:"#8a95a3" }}>Creando tu Chrome privado… (~30s)</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─── ACTIVO: layout 2 columnas ─────────────────────────────────
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px",
      height:"100dvh", background:"#07070d", color:"#e7ecf2",
      fontFamily:"Inter,-apple-system,sans-serif", overflow:"hidden",
      position:"relative" }}>

      {/* ── iframe Chrome ── */}
      <div style={{ position:"relative", background:"#111", borderRight:"1px solid rgba(127,127,170,0.12)" }}>

        {/* Pill estado */}
        <div style={{ position:"absolute", top:12, left:12, zIndex:20, pointerEvents:"none",
          display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px",
          borderRadius:999, background:accent+"22", border:`1px solid ${accent}40`,
          fontSize:11, fontWeight:600, color:accent }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:accent,
            boxShadow:`0 0 8px ${accent}`, animation:"pulse 2s infinite" }} />
          {isHuman ? "Tu turno" : "Vulcano conduciendo"}
        </div>

        {/* Banner Vulcano necesita humano */}
        {needsYou && !isHuman && (
          <div style={{ position:"absolute", top:50, left:"50%", transform:"translateX(-50%)",
            zIndex:20, padding:"8px 18px", borderRadius:10, whiteSpace:"nowrap",
            background:"rgba(133,79,11,0.3)", border:`1px solid ${AMBER}60`,
            color:"#f2c879", fontSize:12, fontWeight:600, backdropFilter:"blur(8px)" }}>
            ⚠ {hs?.handoff?.reason || "Intervención requerida"}
          </div>
        )}

        {vncSrc ? (
          <>
            <iframe
              key={iframeKey}
              src={vncSrc}
              style={{ width:"100%", height:"100%", border:0, display:"block" }}
              allow="clipboard-read; clipboard-write; fullscreen"
              title="Navegador Vulcano"
            />
            {/* Botones flotantes para mobile o si el iframe falla */}
            <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
              zIndex:20, display:"flex", gap:8, pointerEvents:"auto" }}>
              <a href={vncSrc} target="_blank" rel="noreferrer"
                style={{ padding:"7px 14px", borderRadius:8, fontSize:12,
                  fontWeight:600, cursor:"pointer", textDecoration:"none",
                  background:"rgba(13,11,26,0.88)", color:"#a78bfa",
                  border:"1px solid rgba(139,92,246,0.35)", backdropFilter:"blur(8px)" }}>
                ↗ Abrir en pestaña
              </a>
              <button onClick={() => setIframeKey((k: number) => k+1)}
                style={{ padding:"7px 14px", borderRadius:8, fontSize:12, cursor:"pointer",
                  background:"rgba(13,11,26,0.88)", color:"#6b628f",
                  border:"1px solid rgba(127,127,170,0.2)", backdropFilter:"blur(8px)" }}>
                ↺
              </button>
            </div>
          </>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            height:"100%", color:"#444", flexDirection:"column", gap:8 }}>
            <span style={{ fontSize:32 }}>🔌</span>
            <span style={{ fontSize:13 }}>Iniciando conexión…</span>
          </div>
        )}
      </div>

      {/* ── Panel derecho ── */}
      <div style={{ display:"flex", flexDirection:"column", height:"100dvh", overflowY:"auto",
        background:"#0d0b1a" }}>

        {/* Header con selector de perfil */}
        <div style={{ padding:"14px 16px 12px",
          borderBottom:"1px solid rgba(127,127,170,0.1)",
          display:"flex", alignItems:"center", gap:10 }}>
          <Link href="/app" style={{ display:"flex", alignItems:"center", justifyContent:"center",
            width:32, height:32, borderRadius:8, flexShrink:0,
            border:"1px solid rgba(127,127,170,0.18)", color:"#8a95a3",
            textDecoration:"none", fontSize:14 }}>←</Link>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:18, height:18, borderRadius:5,
                background:`radial-gradient(circle at 30% 30%, ${TEAL}, #0f6e56)`,
                boxShadow:`0 0 10px ${TEAL}50`, flexShrink:0 }} />
              <span style={{ fontWeight:800, fontSize:14, letterSpacing:0.2 }}>Navegador Vulcano</span>
            </div>
            <span style={{ fontSize:10, color:"#8a95a3", textTransform:"uppercase", letterSpacing:"0.4px" }}>
              {inst?.username ?? "usuario"} · VForge
            </span>
          </div>

          {/* Botón selector de perfiles (Chrome-style) */}
          {profiles.length > 0 && (
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowProfiles(v => !v)}
                style={{ width:32, height:32, borderRadius:"50%", border:"none",
                  background:`${profiles.find(p => p.email === inst?.active_profile)?.color ?? TEAL}30`,
                  color: profiles.find(p => p.email === inst?.active_profile)?.color ?? TEAL,
                  fontSize:12, fontWeight:800, cursor:"pointer",
                  outline: showProfiles ? `2px solid ${TEAL}` : "none" }}>
                {profiles.find(p => p.email === inst?.active_profile)?.avatar ?? "L"}
              </button>

              {showProfiles && (
                <>
                  <div onClick={() => setShowProfiles(false)}
                    style={{ position:"fixed", inset:0, zIndex:30 }} />
                  <div style={{ position:"absolute", right:0, top:38, zIndex:40, width:220,
                    background:"#16142a", border:"1px solid rgba(139,92,246,0.25)",
                    borderRadius:14, padding:8, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                    <div style={{ fontSize:10, color:"#8a95a3", textTransform:"uppercase",
                      letterSpacing:"0.8px", padding:"4px 10px 6px", fontWeight:600 }}>
                      Mis cuentas
                    </div>
                    {profiles.map(p => (
                      <div key={p.email}
                        style={{ display:"flex", alignItems:"center", gap:10,
                          padding:"8px 10px", borderRadius:8, cursor:"pointer",
                          background: p.email === inst?.active_profile ? `${p.color}15` : "transparent",
                          transition:"background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${p.color}10`)}
                        onMouseLeave={e => (e.currentTarget.style.background = p.email === inst?.active_profile ? `${p.color}15` : "transparent")}>
                        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                          background:`${p.color}25`, border:`1.5px solid ${p.color}50`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, fontWeight:800, color:p.color }}>
                          {p.avatar}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#e8e4ff",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize:10, color:"#8a95a3",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {p.email}
                          </div>
                        </div>
                        {p.email === inst?.active_profile && (
                          <span style={{ color:TEAL, fontSize:14, marginLeft:"auto" }}>✓</span>
                        )}
                      </div>
                    ))}
                    <div style={{ height:1, background:"rgba(127,127,170,0.1)", margin:"6px 0" }} />
                    <div style={{ fontSize:11, color:"#8a95a3", padding:"4px 10px" }}>
                      Todas comparten este Chrome
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(127,127,170,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8,
            fontSize:13, fontWeight:600, color:accent }}>
            <span style={{ width:8, height:8, borderRadius:"50%",
              background:accent, boxShadow:`0 0 7px ${accent}` }} />
            {isHuman ? "Tu turno — tú tienes el control" : "Vulcano conduciendo"}
          </div>
          <p style={{ margin:"3px 0 0", fontSize:11, color:"#8a95a3" }}>
            {isHuman
              ? "Haz lo que necesitas y devuelve cuando termines."
              : "La IA opera el navegador. Entra cuando haya login, captcha o pago."}
          </p>
        </div>

        {/* Handoff card */}
        {needsYou && !isHuman && (
          <div style={{ margin:"12px 14px", padding:14, borderRadius:12,
            background:"rgba(133,79,11,0.15)", border:`1px solid ${AMBER}40` }}>
            <div style={{ fontSize:14, color:"#f4ce83", fontWeight:700, marginBottom:6 }}>
              🟠 Tu turno — acción requerida
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
                background:TEAL, color:"#001a14", fontSize:12, fontWeight:700,
                cursor:"pointer", opacity:taking?0.6:1 }}>
              {taking ? "Transfiriendo…" : "✓ Terminé — devolver a Vulcano"}
            </button>
          </div>
        )}

        {/* Log */}
        <div style={{ flex:1, padding:"0 14px 14px", overflowY:"auto" }}>
          <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"1px",
            color:"#6b628f", marginBottom:8, marginTop:4 }}>◎ Log en tiempo real</div>
          {logs.length === 0 ? (
            <p style={{ fontSize:11, color:"#333" }}>Sin actividad aún…</p>
          ) : logs.map((ev, i) => (
            <div key={i} style={{ display:"flex", gap:7, padding:"5px 0",
              borderBottom:"1px solid rgba(127,127,170,0.05)", fontSize:11 }}>
              <span style={{ color:ev.type === "need" ? AMBER : TEAL, flexShrink:0 }}>
                {ev.type === "need" ? "⚠" : "✓"}
              </span>
              <span style={{ flex:1, color:ev.type === "need" ? "#f2c879" : "#a89fd4",
                lineHeight:1.4 }}>{ev.msg}</span>
              <span style={{ color:"#3d3555", fontSize:9, flexShrink:0 }}>
                {new Date(ev.ts).toLocaleTimeString("es-MX", { hour12:false })}
              </span>
            </div>
          ))}
        </div>

        {/* Guardrails */}
        <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(127,127,170,0.08)",
          display:"flex", gap:8, alignItems:"flex-start" }}>
          <span style={{ color:"#6b628f", flexShrink:0 }}>🛡</span>
          <p style={{ margin:0, fontSize:10, color:"#6b628f", lineHeight:1.5 }}>
            Vulcano <b>nunca</b> hace logins, registros, captchas ni pagos. Siempre los haces tú.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
