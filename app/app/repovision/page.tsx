"use client";

import { useEffect, useMemo, useState } from "react";
import { useT as _useT } from "@/i18n/AppProviders";

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
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: "var(--surface-1)",
      border: "1px solid var(--border-1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700,
      color: "var(--fg-secondary)",
      fontFamily: "monospace",
    }}>
      {initials || name[0]?.toUpperCase()}
    </div>
  );
}

function StatusDot({ pushed_at, archived }: { pushed_at: string | null; archived?: boolean }) {
  if (archived) return <span title="Archivado" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-2)", display: "inline-block" }} />;
  const days = pushed_at ? Math.floor((Date.now() - new Date(pushed_at).getTime()) / 86400000) : 999;
  const color = days < 7 ? "#15803d" : days < 60 ? "var(--vf-violet)" : "var(--border-2)";
  const titulo = days < 7 ? "Movido esta semana" : days < 60 ? "Movido en los últimos 2 meses" : "Sin movimiento reciente";
  return (
    <span title={titulo} style={{
      width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0,
      background: color,
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
        <div style={{ fontSize:13, fontWeight:600, color:"var(--vf-violet-ink)", marginBottom:8, letterSpacing:"0.1em", fontFamily:"monospace" }}>REPOSITORIOS</div>
        <div style={{ fontSize:20, fontWeight:700, color:"var(--fg-primary)", marginBottom:8 }}>Conecta GitHub</div>
        <div style={{ fontSize:13, color:"var(--fg-secondary)", marginBottom:24 }}>Para ver tus repos necesitas autorizar tu cuenta de GitHub.</div>
        <a href="/api/auth/github/start" style={{
          display:"block", padding:"13px 0", borderRadius:10,
          background:"var(--vf-violet)", color:"#ffffff", fontWeight:600, fontSize:14, textDecoration:"none",
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
            <div style={{ fontSize:18, fontWeight:700, color:"var(--fg-primary)", letterSpacing:"-0.02em" }}>Repositorios</div>
            {!loading && <div style={{ fontSize:12, color:"var(--fg-muted)", marginTop:2 }}>{repos.length} repos conectados</div>}
          </div>
        </div>
        {/* Search */}
        <div style={{ position:"relative", maxWidth:240 }}>
          <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--fg-muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar…"
            style={{
              height:38, paddingLeft:32, paddingRight:12, borderRadius:8,
              background:"#ffffff", border:"1px solid var(--border-1)",
              color:"var(--fg-primary)", fontSize:13, outline:"none", width:200,
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"20px 28px 0", display:"flex", gap:4, borderBottom:"1px solid var(--border-1)", marginBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id} style={{
            minHeight:40, padding:"8px 14px", fontSize:13, fontWeight: tab === t.id ? 600 : 500, borderRadius:"8px 8px 0 0",
            background: "transparent",
            color: tab === t.id ? "var(--vf-violet-ink)" : "var(--fg-secondary)",
            border: "none", cursor:"pointer",
            borderBottom: tab === t.id ? "2px solid var(--vf-violet)" : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin:"16px 28px 0", padding:"10px 14px", borderRadius:8, fontSize:13,
          background:"#fef2f2", border:"1px solid #b91c1c", color:"#b91c1c" }}>
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
              borderBottom:"1px solid var(--border-1)",
            }}>
              <div style={{ width:36, height:36, borderRadius:8, background:"var(--surface-2)" }} />
              <div style={{ flex:1 }}>
                <div style={{ height:13, width:"30%", borderRadius:4, background:"var(--surface-2)", marginBottom:8 }} />
                <div style={{ height:11, width:"60%", borderRadius:4, background:"var(--surface-2)" }} />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <div style={{ padding:"60px 0", textAlign:"center", color:"var(--fg-secondary)", fontSize:13 }}>
            No hay repositorios{query ? ` que coincidan con "${query}"` : ""}
          </div>
        ) : visible.map(repo => (
          <a key={repo.full_name} href={repo.html_url} target="_blank" rel="noreferrer"
            style={{
              display:"flex", alignItems:"center", gap:14, padding:"14px 0",
              borderBottom:"1px solid var(--border-1)",
              textDecoration:"none", cursor:"pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <RepoInitials name={repo.name} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:14, fontWeight:600, color:"var(--fg-primary)" }}>{repo.name}</span>
                {repo.private && (
                  <span style={{ fontSize:12, fontWeight:600, padding:"1px 6px", borderRadius:4,
                    border:"1px solid var(--border-1)", color:"var(--fg-secondary)", fontFamily:"monospace" }}>
                    privado
                  </span>
                )}
                {repo.archived && (
                  <span style={{ fontSize:12, fontWeight:600, padding:"1px 6px", borderRadius:4,
                    border:"1px solid var(--border-1)", color:"var(--fg-muted)", fontFamily:"monospace" }}>
                    archivado
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:"var(--fg-secondary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {repo.description ?? repo.full_name}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <StatusDot pushed_at={repo.pushed_at} archived={repo.archived} />
              <span style={{ fontSize:12, color:"var(--fg-muted)", minWidth:64, textAlign:"right" }}>
                {timeAgo(repo.pushed_at)}
              </span>
              <svg style={{ color:"var(--fg-muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
