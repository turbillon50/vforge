"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/AppProviders";

interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  pushed_at: string | null;
  html_url: string;
  archived?: boolean;
  open_issues_count?: number;
  fork?: boolean;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "sin datos";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return `hace ${Math.floor(days / 30)}mo`;
}

function RepoInitials({ name }: { name: string }) {
  const initials = name.replace(/[-_]/g, " ").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const hue = (name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: `hsl(${hue},35%,20%)`,
      border: `1px solid hsl(${hue},30%,28%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700,
      color: `hsl(${hue},60%,70%)`,
      fontFamily: "monospace",
    }}>
      {initials || name[0]?.toUpperCase()}
    </div>
  );
}

function StatusDot({ pushed_at, archived }: { pushed_at: string | null; archived?: boolean }) {
  if (archived) return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />;
  const days = pushed_at ? Math.floor((Date.now() - new Date(pushed_at).getTime()) / 86400000) : 999;
  const color = days < 7 ? "#22c55e" : days < 60 ? "#a78bfa" : "rgba(255,255,255,0.2)";
  const glow = days < 7 ? "0 0 6px #22c55e88" : days < 60 ? "0 0 6px #a78bfa44" : "none";
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0,
      background: color, boxShadow: glow,
    }} />
  );
}

type TabId = "recents" | "live" | "archived";
const TABS: { id: TabId; label: string }[] = [
  { id: "recents", label: "Recientes" },
  { id: "live",    label: "Activos"   },
  { id: "archived",label: "Archivados"},
];

export default function RepoVisionPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [tab, setTab] = useState<TabId>("recents");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/github/repos", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: { repos: Repo[]; needsConnect?: string }) => {
        if (d.needsConnect) { setNeedsConnect(true); return; }
        setRepos(d.repos ?? []);
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    let list = [...repos];
    if (tab === "live")     list = list.filter(r => !r.archived && (Date.now() - new Date(r.pushed_at ?? 0).getTime()) < 60 * 86400000);
    if (tab === "archived") list = list.filter(r => r.archived);
    if (query.trim())       list = list.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    list.sort((a, b) => new Date(b.pushed_at ?? 0).getTime() - new Date(a.pushed_at ?? 0).getTime());
    return list;
  }, [repos, tab, query]);

  // ── Connect prompt ──────────────────────────────────────────────────────
  if (needsConnect) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:"0 20px" }}>
      <div style={{ maxWidth:360, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:13, fontWeight:600, color:"rgba(168,85,247,0.8)", marginBottom:8, letterSpacing:"0.1em", fontFamily:"monospace" }}>REPOVISION</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:8 }}>Conecta GitHub</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:24 }}>Para ver tus repos necesitas autorizar tu cuenta de GitHub.</div>
        <a href="/api/auth/github/start" style={{
          display:"block", padding:"11px 0", borderRadius:10,
          background:"#fff", color:"#000", fontWeight:600, fontSize:14, textDecoration:"none",
        }}>Conectar GitHub →</a>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"0 0 64px" }}>
      {/* Header */}
      <div style={{ padding:"28px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>Repositorios</div>
            {!loading && <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{repos.length} repos conectados</div>}
          </div>
        </div>
        {/* Search */}
        <div style={{ position:"relative", maxWidth:240 }}>
          <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:0.35 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar…"
            style={{
              height:34, paddingLeft:32, paddingRight:12, borderRadius:8,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#fff", fontSize:13, outline:"none", width:200,
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"20px 28px 0", display:"flex", gap:4, borderBottom:"1px solid rgba(255,255,255,0.06)", marginBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"8px 14px", fontSize:13, fontWeight:500, borderRadius:"8px 8px 0 0",
            background: tab === t.id ? "rgba(255,255,255,0.07)" : "transparent",
            color: tab === t.id ? "#fff" : "rgba(255,255,255,0.4)",
            border: "none", cursor:"pointer",
            borderBottom: tab === t.id ? "2px solid #a855f7" : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin:"16px 28px 0", padding:"10px 14px", borderRadius:8, fontSize:13,
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171" }}>
          {error}
        </div>
      )}

      {/* List */}
      <div style={{ padding:"0 28px" }}>
        {loading ? (
          // Skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14, padding:"16px 0",
              borderBottom:"1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,0.05)" }} />
              <div style={{ flex:1 }}>
                <div style={{ height:13, width:"30%", borderRadius:4, background:"rgba(255,255,255,0.06)", marginBottom:8 }} />
                <div style={{ height:11, width:"60%", borderRadius:4, background:"rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <div style={{ padding:"60px 0", textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
            No hay repositorios{query ? ` que coincidan con "${query}"` : ""}
          </div>
        ) : visible.map(repo => (
          <a key={repo.full_name} href={repo.html_url} target="_blank" rel="noreferrer"
            style={{
              display:"flex", alignItems:"center", gap:14, padding:"14px 0",
              borderBottom:"1px solid rgba(255,255,255,0.05)",
              textDecoration:"none", cursor:"pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <RepoInitials name={repo.name} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{repo.name}</span>
                {repo.private && (
                  <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:4,
                    background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)", fontFamily:"monospace" }}>
                    privado
                  </span>
                )}
                {repo.archived && (
                  <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:4,
                    background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>
                    archivado
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {repo.description ?? repo.full_name}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <StatusDot pushed_at={repo.pushed_at} archived={repo.archived} />
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", minWidth:64, textAlign:"right" }}>
                {timeAgo(repo.pushed_at)}
              </span>
              <svg style={{ opacity:0.2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
