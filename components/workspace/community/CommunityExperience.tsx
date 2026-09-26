"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconShare, IconActivity, IconSparkles, IconCheck, IconX,
  IconSend, IconLoader, IconPen,
} from "@/components/brand/VFIcons";

type Platform = "linkedin" | "x";
type ReviewStatus = "pending_review" | "approved" | "rejected" | "published" | "failed";

interface Post {
  id: string;
  platform: Platform;
  content: string;
  scheduled_at: string;
  review_status: ReviewStatus;
  media_url?: string | null;
  published_at?: string | null;
  error?: string | null;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return `Hace ${Math.round(-diff / 60000)} min`;
  if (diff < 3600000) return `En ${Math.round(diff / 60000)} min`;
  if (diff < 86400000) return `Hoy ${d.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" })}`;
  return d.toLocaleDateString("es-MX", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest"
      style={{
        background: platform === "linkedin" ? "rgba(10,102,194,0.12)" : "rgba(255,255,255,0.06)",
        borderColor: platform === "linkedin" ? "rgba(10,102,194,0.3)" : "rgba(255,255,255,0.12)",
        color: platform === "linkedin" ? "#60a5fa" : "#e5e5e5",
      }}>
      {platform === "linkedin" ? "in" : "𝕏"} {platform}
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const meta: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
    pending_review: { label:"Pendiente",  color:"#fbbf24", bg:"rgba(251,191,36,0.1)" },
    approved:       { label:"Aprobado",   color:"#22c55e", bg:"rgba(34,197,94,0.1)" },
    rejected:       { label:"Rechazado",  color:"#ef4444", bg:"rgba(239,68,68,0.1)" },
    published:      { label:"Publicado",  color:"#a78bfa", bg:"rgba(167,139,250,0.1)" },
    failed:         { label:"Error",      color:"#ef4444", bg:"rgba(239,68,68,0.1)" },
  };
  const m = meta[status] ?? meta.pending_review;
  return (
    <span className="rounded-full px-2 py-0.5 font-mono text-[10px]"
      style={{ background: m.bg, color: m.color, border:`1px solid ${m.color}33` }}>
      {m.label}
    </span>
  );
}

function PostCard({ post, onApprove, onReject, busy }:
  { post: Post; onApprove:(id:string)=>void; onReject:(id:string)=>void; busy:string }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = post.review_status === "pending_review";
  const isBusy = busy === post.id;
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
      className="rounded-2xl p-4 transition-all"
      style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)" }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PlatformBadge platform={post.platform} />
        <StatusBadge status={post.review_status} />
        <span className="ml-auto font-mono text-[10px]" style={{ color:"rgba(255,255,255,0.25)" }}>
          {timeLabel(post.scheduled_at)}
        </span>
      </div>
      <p className={`text-[13px] leading-relaxed whitespace-pre-line ${expanded ? "" : "line-clamp-3"}`}
        style={{ color:"rgba(255,255,255,0.7)" }}>
        {post.content}
      </p>
      {post.content.length > 200 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-1 text-[11px] transition-colors"
          style={{ color:"rgba(124,58,237,0.7)" }}>
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
      {post.error && (
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background:"rgba(239,68,68,0.08)", color:"#f87171", border:"1px solid rgba(239,68,68,0.15)" }}>
          Error: {post.error}
        </p>
      )}
      {isPending && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onApprove(post.id)} disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#86efac" }}>
            {isBusy ? <IconLoader size={12} className="animate-spin" /> : <IconCheck size={12} />}
            Aprobar
          </button>
          <button onClick={() => onReject(post.id)} disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171" }}>
            <IconX size={12} /> Rechazar
          </button>
        </div>
      )}
    </motion.div>
  );
}

type Tab = "queue" | "approved" | "published";

export function CommunityExperience() {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>("queue");
  const [busy,    setBusy]    = useState("");
  const [newText, setNewText] = useState("");
  const [newPlat, setNewPlat] = useState<Platform>("linkedin");
  const [creating, setCreating] = useState(false);
  const [showNew,  setShowNew]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/social/posts", { cache:"no-store" });
      const d = r.ok ? await r.json() : { posts:[] };
      setPosts(d.posts ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/social/posts`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id, action:"approve" }),
      });
      await load();
    } finally { setBusy(""); }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, review_status:"rejected" } : p));
    } finally { setBusy(""); }
  }

  async function createPost() {
    if (!newText.trim() || creating) return;
    setCreating(true);
    try {
      await fetch("/api/social/posts", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ platform:newPlat, content:newText.trim(),
          scheduledAt: new Date(Date.now() + 86400000).toISOString() }),
      });
      setNewText(""); setShowNew(false);
      await load();
    } finally { setCreating(false); }
  }

  const filtered = posts.filter(p => {
    if (tab === "queue")     return p.review_status === "pending_review";
    if (tab === "approved")  return p.review_status === "approved";
    if (tab === "published") return p.review_status === "published" || p.review_status === "failed";
    return true;
  });

  const counts = {
    queue:     posts.filter(p => p.review_status === "pending_review").length,
    approved:  posts.filter(p => p.review_status === "approved").length,
    published: posts.filter(p => p.review_status === "published" || p.review_status === "failed").length,
  };

  const TABS: { id: Tab; label: string }[] = [
    { id:"queue",     label:`Cola (${counts.queue})` },
    { id:"approved",  label:`Aprobados (${counts.approved})` },
    { id:"published", label:`Publicados (${counts.published})` },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{ color:"rgba(124,58,237,0.7)" }}>Comunidad</p>
          <h1 className="font-display text-[1.4rem] font-bold" style={{ color:"#fff" }}>
            Social Queue
          </h1>
          <p className="text-[13px]" style={{ color:"rgba(255,255,255,0.35)" }}>
            Aprueba o rechaza los posts de V antes de publicar.
          </p>
        </div>
        <button onClick={() => setShowNew(s => !s)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all"
          style={{ background:"#fff", color:"#000" }}>
          <IconPen size={13} /> Nuevo post
        </button>
      </div>

      {/* New post form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
            exit={{ opacity:0, height:0 }} className="mb-5 overflow-hidden">
            <div className="rounded-2xl p-5"
              style={{ background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.2)" }}>
              <div className="mb-3 flex gap-2">
                {(["linkedin","x"] as Platform[]).map(p => (
                  <button key={p} onClick={() => setNewPlat(p)}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                    style={{
                      background: newPlat===p ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                      border: newPlat===p ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.08)",
                      color: newPlat===p ? "#c4b5fd" : "rgba(255,255,255,0.45)",
                    }}>
                    {p === "linkedin" ? "LinkedIn" : "X / Twitter"}
                  </button>
                ))}
              </div>
              <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={4}
                placeholder="Escribe el post... (V lo revisará antes de publicar)"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#e5e5e5" }}
                onFocus={e=>(e.currentTarget.style.borderColor="rgba(124,58,237,0.4)")}
                onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.08)")} />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color:"rgba(255,255,255,0.25)" }}>
                  {newText.length} / 280 chars
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setShowNew(false); setNewText(""); }}
                    className="rounded-lg px-3 py-1.5 text-[12px]"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)" }}>
                    Cancelar
                  </button>
                  <button onClick={createPost} disabled={creating || !newText.trim()}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
                    style={{ background:"#fff", color:"#000" }}>
                    {creating ? <IconLoader size={12} className="animate-spin" /> : <IconSend size={12} />}
                    {creating ? "Guardando…" : "Agregar a cola"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl p-1"
        style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 rounded-lg py-2 text-[12px] font-medium transition-all"
            style={{
              background: tab===t.id ? "rgba(124,58,237,0.15)" : "transparent",
              color: tab===t.id ? "#c4b5fd" : "rgba(255,255,255,0.4)",
              border: tab===t.id ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="h-[140px] animate-pulse rounded-2xl"
              style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <IconShare size={24} style={{ color:"rgba(255,255,255,0.2)" }} />
          </div>
          <p className="text-[14px]" style={{ color:"rgba(255,255,255,0.35)" }}>
            {tab === "queue" ? "No hay posts pendientes de revisión." :
             tab === "approved" ? "No hay posts aprobados." : "Aún no hay posts publicados."}
          </p>
          {tab === "queue" && (
            <button onClick={() => setShowNew(true)}
              className="rounded-xl px-4 py-2 text-[13px] font-semibold"
              style={{ background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.25)", color:"#a78bfa" }}>
              Crear primer post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <PostCard key={p.id} post={p} onApprove={approve} onReject={reject} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}
