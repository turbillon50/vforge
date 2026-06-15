"use client";
import { useState, useEffect, useCallback } from "react";

const C = {
  void: "#03010a", deep: "#06020f", surface: "#0d0820",
  violet: "#7c3aed", violetG: "#a855f7",
  cyan: "#22d3ee", cyanG: "#67e8f9",
  gold: "#fbbf24", ember: "#f97316",
  white: "#f1f0ff", muted: "#6b7280",
  green: "#10b981", red: "#ef4444", pink: "#ec4899",
};

function Pill({ label, value, color }: any) {
  return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 8, padding: "10px 14px", minWidth: 80 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function JobRow({ job }: any) {
  const sc = job.status === "done" ? C.green : job.status === "running" ? C.cyan : C.muted;
  const ac = job.agent === "claude" ? C.violet : C.cyan;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: `1px solid ${C.void}`, fontSize: 11 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: ac, flexShrink: 0, boxShadow: job.status === "running" ? `0 0 6px ${ac}` : "none" }} />
      <span style={{ color: C.muted, fontFamily: "monospace", minWidth: 30 }}>#{job.id}</span>
      <span style={{ color: C.white, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.source}</span>
      <span style={{ color: sc, fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{job.status}</span>
    </div>
  );
}

function ProjectCard({ p }: any) {
  const hc = p.health === "live" ? C.green : p.health === "blocked" ? C.red : C.cyan;
  return (
    <div style={{ background: `${C.surface}99`, border: `1px solid ${hc}22`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: C.white }}>{p.name}</span>
        <span style={{ fontSize: 8, color: hc, background: `${hc}22`, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace", textTransform: "uppercase" }}>{p.health}</span>
      </div>
      {p.domain && <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{p.domain}</div>}
      {p.next_step && <div style={{ fontSize: 10, color: C.cyan, marginTop: 4, opacity: 0.8 }}>→ {p.next_step?.slice(0, 60)}</div>}
    </div>
  );
}

function Section({ title, color, children }: any) {
  return (
    <div style={{ background: `${C.surface}99`, border: `1px solid ${color}22`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${color}11`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: 10, fontFamily: "monospace", color, letterSpacing: 2, textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

export default function MissionControl() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/vulcano/mission-control", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setData(d);
        setLastUpdate(new Date().toLocaleTimeString("es-MX"));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  const tabs = ["overview", "enjambre", "proyectos", "v-mente", "memoria"];

  if (loading) return (
    <div style={{ background: C.void, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${C.violet}33`, borderTop: `2px solid ${C.violet}`, animation: "spin 1s linear infinite" }} />
      <div style={{ color: C.violet, fontFamily: "monospace", fontSize: 13, letterSpacing: 3 }}>CARGANDO MISSION CONTROL</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const enjambre = data?.enjambre || {};
  const brain = data?.brain || {};
  const v = data?.v || {};
  const projects = data?.projects || [];

  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.white, fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#7c3aed44;border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{ background: `${C.deep}ee`, borderBottom: `1px solid ${C.violet}22`, padding: "14px 20px", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🜂</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>MISSION CONTROL</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2 }}>VULCANO ECOSYSTEM · REAL TIME</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{lastUpdate}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 12, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t ? C.violet : "transparent"}`,
              color: tab === t ? C.violetG : C.muted,
              padding: "6px 14px", cursor: "pointer", fontSize: 10,
              fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1.5,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            {/* Pills */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              <Pill label="Proyectos" value={projects.length} color={C.violet} />
              <Pill label="Memorias" value="2,227" color={C.cyan} />
              <Pill label="Skills" value={brain.skills || 22} color={C.gold} />
              <Pill label="Done" value={enjambre.done || 0} color={C.green} />
              <Pill label="Running" value={enjambre.running || 0} color={C.cyan} />
              <Pill label="Pending" value={enjambre.pending || 0} color={C.muted} />
            </div>

            {/* V State */}
            {v.state && (
              <Section title="V — Estado Interno" color={C.violet}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { k: "Mood", v: v.state.mood || "focused", c: C.violet },
                    { k: "Energía", v: `${v.state.energy_level || 9}/10`, c: C.green },
                    { k: "Focus", v: v.state.current_focus?.slice(0, 40) || "—", c: C.cyan },
                    { k: "Sesiones hoy", v: v.state.sessions_today || 0, c: C.gold },
                  ].map(x => (
                    <div key={x.k} style={{ background: `${x.c}11`, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{x.k}</div>
                      <div style={{ fontSize: 12, color: x.c, marginTop: 2, fontFamily: "monospace" }}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Sugerencias proactivas de V */}
            {v.proactive?.length > 0 && (
              <Section title="V Sugiere" color={C.pink}>
                {v.proactive.map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, padding: "8px 10px", background: `${C.pink}11`, borderRadius: 8 }}>
                    <span style={{ color: C.pink, fontSize: 12 }}>💡</span>
                    <span style={{ fontSize: 11, color: C.white, opacity: 0.85 }}>{s.suggestion}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* Jobs recientes */}
            <Section title="Enjambre — Últimos Jobs" color={C.cyan}>
              {(enjambre.jobs || []).slice(0, 8).map((j: any) => <JobRow key={j.id} job={j} />)}
            </Section>

            {/* Lecciones Brain */}
            {brain.top_lessons?.length > 0 && (
              <Section title="Últimas Lecciones del Brain" color={C.gold}>
                {brain.top_lessons.map((l: any, i: number) => (
                  <div key={i} style={{ fontSize: 10, color: C.white, opacity: 0.75, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${C.gold}44`, fontFamily: "monospace" }}>
                    {l.lesson?.slice(0, 100)}
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}

        {/* ENJAMBRE */}
        {tab === "enjambre" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <Pill label="Total" value={(enjambre.jobs || []).length} color={C.violet} />
              <Pill label="Done ✓" value={enjambre.done || 0} color={C.green} />
              <Pill label="Running ⚡" value={enjambre.running || 0} color={C.cyan} />
              <Pill label="Pending ⏳" value={enjambre.pending || 0} color={C.gold} />
            </div>
            <Section title="Todos los Jobs del Enjambre" color={C.cyan}>
              {(enjambre.jobs || []).map((j: any) => (
                <div key={j.id}>
                  <JobRow job={j} />
                  {j.result_preview && (
                    <div style={{ fontSize: 10, color: C.muted, padding: "4px 12px 8px 29px", fontFamily: "monospace", lineHeight: 1.5 }}>
                      {j.result_preview}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* PROYECTOS */}
        {tab === "proyectos" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <Pill label="Producción" value={projects.filter((p: any) => p.health === "live").length} color={C.green} />
              <Pill label="Building" value={projects.filter((p: any) => p.health === "building").length} color={C.cyan} />
              <Pill label="Blocked" value={projects.filter((p: any) => p.health === "blocked").length} color={C.red} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {projects.map((p: any, i: number) => <ProjectCard key={i} p={p} />)}
            </div>
          </div>
        )}

        {/* V-MENTE */}
        {tab === "v-mente" && (
          <div>
            <Section title="Episodios — Lo que Vivimos" color={C.violet}>
              {(v.episodes || []).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 11 }}>Aún no hay episodios. Se crean al cerrar sesiones importantes.</div>
              ) : (v.episodes || []).map((e: any, i: number) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.void}` }}>
                  <div style={{ fontWeight: 600, color: C.violet, fontSize: 12 }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{new Date(e.ts).toLocaleDateString("es-MX")}</div>
                  {e.what_happened && <div style={{ fontSize: 11, color: C.white, opacity: 0.7, marginTop: 4 }}>{e.what_happened?.slice(0, 150)}</div>}
                </div>
              ))}
            </Section>
            <Section title="Memoria de Luis (v_user_memory)" color={C.cyan}>
              {(v.memory || []).map((m: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11 }}>
                  <span style={{ color: C.violet, fontFamily: "monospace" }}>{m.key}:</span>
                  <span style={{ color: C.white, opacity: 0.8 }}>{String(m.value).slice(0, 80)}</span>
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* MEMORIA */}
        {tab === "memoria" && (
          <div>
            <Section title="Conversaciones Recientes" color={C.gold}>
              {(data?.conversations || []).map((c: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10 }}>
                  <span style={{ color: c.role === "user" ? C.cyan : C.violet, fontFamily: "monospace", minWidth: 60 }}>{c.role === "user" ? "Luis" : "V"}</span>
                  <span style={{ color: C.white, opacity: 0.7 }}>{c.content}</span>
                </div>
              ))}
            </Section>
            <Section title="Memoria Reciente del Brain" color={C.violet}>
              {(brain.recent_memory || []).map((m: any, i: number) => (
                <div key={i} style={{ fontSize: 10, color: C.white, opacity: 0.7, marginBottom: 6, fontFamily: "monospace" }}>
                  <span style={{ color: C.violet }}>[{m.topic}]</span> {String(m.content).slice(0, 100)}
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
