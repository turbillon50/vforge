"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  IconShare, IconActivity, IconBell, IconSparkles,
  IconUsers, IconPen, IconCheck, IconX, IconArrowR,
  IconSend, IconRefresh, IconZap,
} from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

/* ── TYPES ── */
type Platform = "linkedin" | "x";
type ReviewStatus = "pending_review" | "approved" | "rejected";

interface Post {
  id: number;
  platform: Platform;
  content: string;
  date: string;
  review_status: ReviewStatus;
  image?: string | null;
}

/* ── MOCK DATA ── */
const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    platform: "linkedin",
    content: "¿Cuánto tarda en levantarse una app de verdad?\n\nCon nosotros: 7 días.\n\nNo es magia. Es un sistema:\n→ Stack validado (Next.js + Neon + Vercel + Clerk)\n→ Componentes reutilizables\n→ IA que genera y documenta\n→ Deploy automático\n\n¿Cuál es tu mayor cuello de botella al desarrollar?\n\n#PWA #DesarrolloMX #VMomentum",
    date: "Mañana · 9:00 AM",
    review_status: "pending_review",
  },
  {
    id: 2,
    platform: "x",
    content: "Construir una app en MX ya no cuesta $500k ni tarda 6 meses.\n\nCuesta $12k MXN y tarda 1 semana.\n\nEl mundo cambió. La mayoría no lo sabe todavía.\n\n#VMomentum #PWA",
    date: "Mañana · 6:00 PM",
    review_status: "pending_review",
  },
  {
    id: 3,
    platform: "linkedin",
    content: "El MCP no es hype. Ya lo estamos usando en producción.\n\nEn lugar de copiar y pegar contexto entre herramientas, el agente lee tu base de datos, tu repo y tu historial — y actúa.\n\nEstamos documentando todo el proceso.\n\n¿Ya lo conoces?\n\n#MCP #IAAgentes #VMomentum",
    date: "Pasado mañana · 9:00 AM",
    review_status: "pending_review",
  },
];

type Tab = "queue" | "approved" | "rejected";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── PLATFORM BADGE ── */
function PlatformBadge({ platform }: { platform: Platform }) {
  const isLi = platform === "linkedin";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
        isLi
          ? "border-[#5da7df]/20 bg-[#5da7df]/10 text-[#5da7df]"
          : "border-white/10 bg-white/5 text-white/60"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLi ? "bg-[#5da7df] shadow-[0_0_6px_rgba(93,167,223,0.6)]" : "bg-white/40"
        )}
      />
      {isLi ? "LinkedIn" : "𝕏 Twitter"}
    </span>
  );
}

/* ── POST CARD ── */
function PostCard({
  post,
  onApprove,
  onReject,
  onUndo,
}: {
  post: Post;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onUndo: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const isPending = post.review_status === "pending_review";
  const limit = post.platform === "x" ? 280 : 3000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-[0_1px_0_rgba(139,92,246,.08)_inset,0_0_0_1px_rgba(139,92,246,.12),0_16px_40px_rgba(0,0,0,.4)]",
        post.review_status === "approved" && "border-l-2 border-l-success-emerald border-[rgba(139,92,246,.14)]",
        post.review_status === "rejected" && "border-l-2 border-l-error-crimson border-[rgba(139,92,246,.14)]",
        post.review_status === "pending_review" && "border-[rgba(139,92,246,.14)]"
      )}
    >
      {/* HEAD */}
      <div className="flex items-center justify-between border-b border-[rgba(139,92,246,.1)] px-4 py-3">
        <PlatformBadge platform={post.platform} />
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/30">
          <IconActivity size={11} className="text-white/20" />
          {post.date}
        </span>
      </div>

      {/* BODY */}
      <div className="px-4 py-4">
        {!editing ? (
          <p className="whitespace-pre-wrap text-[14px] font-light leading-[1.75] text-on-surface-variant">
            {post.content}
          </p>
        ) : (
          <textarea
            className="w-full resize-y rounded-xl border border-violet-500/40 bg-surface-low px-3.5 py-3 text-[14px] font-light leading-[1.75] text-on-surface shadow-[0_0_20px_rgba(124,58,237,.2)] outline-none transition placeholder:text-white/20"
            defaultValue={post.content}
            rows={6}
          />
        )}
        {editing && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="¿Qué mejorar? ej: más directo, agrega un caso real…"
            className="mt-2.5 w-full rounded-lg border border-[rgba(251,191,36,.25)] bg-surface-low px-3 py-2 text-[12px] font-light text-on-surface-variant outline-none placeholder:text-white/20 shadow-[0_0_16px_rgba(251,191,36,.1)]"
          />
        )}
      </div>

      {/* STATUS STRIPE */}
      {!isPending && (
        <div
          className={cn(
            "flex items-center gap-2 border-t px-4 py-2.5 text-[12px] font-semibold",
            post.review_status === "approved"
              ? "border-success-emerald/20 bg-success-emerald/8 text-success-emerald"
              : "border-error-crimson/20 bg-error-crimson/6 text-error-crimson"
          )}
        >
          {post.review_status === "approved" ? (
            <><IconCheck size={13} /> Aprobado — se publicará en la fecha programada</>
          ) : (
            <><IconX size={13} /> Rechazado — no se publicará</>
          )}
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center gap-2 border-t border-[rgba(139,92,246,.08)] px-4 py-3">
        {isPending ? (
          <>
            <button
              onClick={() => onApprove(post.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-success-emerald/25 bg-success-emerald/12 px-3.5 py-2 text-[12px] font-semibold text-success-emerald transition hover:bg-success-emerald/20 hover:shadow-[0_0_12px_rgba(16,185,129,.2)] active:scale-95"
            >
              <IconCheck size={12} /> Aprobar
            </button>
            <button
              onClick={() => onReject(post.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-error-crimson/22 bg-error-crimson/10 px-3.5 py-2 text-[12px] font-semibold text-error-crimson transition hover:bg-error-crimson/18 active:scale-95"
            >
              <IconX size={12} /> Rechazar
            </button>
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(251,191,36,.22)] bg-[rgba(251,191,36,.1)] px-3.5 py-2 text-[12px] font-semibold text-[#fbbf24] transition hover:bg-[rgba(251,191,36,.18)] active:scale-95"
            >
              <IconPen size={12} /> {editing ? "Cancelar" : "Mejorar"}
            </button>
            {editing && (
              <button className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-[#5b21b6] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,.4)] transition hover:opacity-88 active:scale-95">
                <IconSend size={12} /> Enviar
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onUndo(post.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(139,92,246,.18)] bg-transparent px-3.5 py-2 text-[11px] font-semibold text-white/35 transition hover:border-[rgba(139,92,246,.3)] hover:text-white/60 active:scale-95"
          >
            <IconRefresh size={11} /> Deshacer
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── MAIN EXPERIENCE ── */
export function CommunityExperience() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [tab, setTab] = useState<Tab>("queue");
  const [generating, setGenerating] = useState(false);

  const approve = (id: number) => setPosts((p) => p.map((x) => x.id === id ? { ...x, review_status: "approved" } : x));
  const reject  = (id: number) => setPosts((p) => p.map((x) => x.id === id ? { ...x, review_status: "rejected" } : x));
  const undo    = (id: number) => setPosts((p) => p.map((x) => x.id === id ? { ...x, review_status: "pending_review" } : x));

  const filtered = posts.filter((p) => {
    if (tab === "queue")    return p.review_status === "pending_review";
    if (tab === "approved") return p.review_status === "approved";
    if (tab === "rejected") return p.review_status === "rejected";
    return true;
  });

  const counts = {
    queue:    posts.filter((p) => p.review_status === "pending_review").length,
    approved: posts.filter((p) => p.review_status === "approved").length,
    rejected: posts.filter((p) => p.review_status === "rejected").length,
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setPosts((prev) => [
        ...prev,
        {
          id: Date.now(),
          platform: "x",
          content: "Los agentes de IA no reemplazan devs.\n\nLos multiplican.\n\nUn dev con agentes = equipo de 5.\n\n#MCP #IAAgentes #VMomentum",
          date: "Lun · 9:00 AM",
          review_status: "pending_review",
        },
        {
          id: Date.now() + 1,
          platform: "linkedin",
          content: "Hace 3 años, un negocio pequeño no podía pagar una app decente.\n\nHoy puede tener una PWA premium por $12,000 MXN en 7 días.\n\nNo porque bajaron los precios — porque el proceso cambió radicalmente.\n\n#PWA #DesarrolloMX #VMomentum",
          date: "Lun · 6:00 PM",
          review_status: "pending_review",
        },
      ]);
      setTab("queue");
      setGenerating(false);
    }, 3000);
  };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "queue",    label: "Por revisar", count: counts.queue },
    { key: "approved", label: "Aprobados",   count: counts.approved },
    { key: "rejected", label: "Rechazados",  count: counts.rejected },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-void">
      {/* HEADER */}
      <div className="sticky top-0 z-10 border-b border-[rgba(139,92,246,.14)] bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/15 shadow-[0_0_20px_rgba(124,58,237,.3)]">
              <IconShare size={17} className="text-violet-300" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-on-surface">Community</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Social Review · V Momentum</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden items-center gap-4 sm:flex">
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-[#fbbf24]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,.6)]" />
                {counts.queue} pendientes
              </span>
              <span className="font-mono text-[12px] text-success-emerald">{counts.approved} aprobados</span>
            </div>

            {/* Generate btn */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-500 to-[#5b21b6] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,.35)] transition hover:opacity-88 disabled:opacity-50 active:scale-95"
            >
              {generating ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Generando…</>
              ) : (
                <><IconSparkles size={14} /> Generar plan</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">

        {/* TABS */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-[rgba(139,92,246,.12)] bg-surface p-1 w-fit">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "relative rounded-xl px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-widest transition",
                tab === key
                  ? "bg-surface-elev text-violet-300 shadow-[0_0_12px_rgba(124,58,237,.2)]"
                  : "text-white/30 hover:text-white/60"
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  "ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  tab === key
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/8 text-white/30"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* POSTS LIST */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(139,92,246,.15)] bg-surface opacity-40">
              <IconSparkles size={22} className="text-violet-300" />
            </div>
            <p className="text-[15px] font-semibold text-white/25">Sin posts aquí</p>
            <p className="mt-1 text-[13px] text-white/15">Genera un plan semanal o cambia el filtro</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onApprove={approve}
                onReject={reject}
                onUndo={undo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
