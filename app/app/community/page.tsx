"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconShare, IconCheck, IconWarn, IconActivity } from "@/components/brand/VFIcons";

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  scheduled_at: string;
  status: string;
  created_by: string | null;
}

const STATUS_TONE: Record<string, { color: string; label: string }> = {
  published: { color: "#34d399", label: "Publicado" },
  publishing: { color: "#fbbf24", label: "Publicando" },
  scheduled: { color: "#22d3ee", label: "Programado" },
  failed: { color: "#ef4444", label: "Falló" },
  pending: { color: "#a78bfa", label: "Pendiente" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000); if (d >= 1) return (ms < 0 ? "en " : "hace ") + d + "d";
  const h = Math.floor(abs / 3600000); if (h >= 1) return (ms < 0 ? "en " : "hace ") + h + "h";
  const m = Math.floor(abs / 60000); if (m >= 1) return (ms < 0 ? "en " : "hace ") + m + "m";
  return "ahora";
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? "No autorizado" : "Error " + r.status))))
      .then((d: { posts?: SocialPost[] }) => setPosts(d.posts ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Comunidad · Revisión de posts"
        description="Builders compartiendo recetas operativas, módulos y post-mortems. Revisa y agenda publicaciones a tus redes."
      />
      <div className="mx-auto max-w-2xl px-5 py-6 md:px-8">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            <IconWarn size={14} /> {error}
          </div>
        )}
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-xl border border-white/[0.04] bg-white/[0.015]" />
            ))}
          </div>
        )}
        {!loading && posts.length === 0 && !error && (
          <div className="py-16 text-center">
            <IconShare size={22} className="mx-auto text-white/20" />
            <p className="mt-3 font-display text-lg text-white/50">Sin publicaciones todavía.</p>
            <p className="mt-2 text-sm text-white/25">Cuando agendes o publiques en tus redes, aparecerán aquí para revisión.</p>
          </div>
        )}
        {!loading && posts.length > 0 && (
          <ul className="space-y-2">
            {posts.map((p) => {
              const tone = STATUS_TONE[p.status] ?? { color: "#a78bfa", label: p.status };
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#0a0a12] p-4 transition hover:border-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] font-mono text-[10px] uppercase text-white/60">
                        {p.platform.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-[13px] font-semibold capitalize text-white/80">{p.platform}</p>
                        {p.created_by && <p className="truncate font-mono text-[10px] text-white/25">{p.created_by}</p>}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]" style={{ color: tone.color }}>
                      {p.status === "published" ? <IconCheck size={11} /> : <IconActivity size={11} />}
                      {tone.label}
                    </span>
                  </div>
                  <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">{p.content}</p>
                  <p className="mt-2 font-mono text-[10px] text-white/20">{timeAgo(p.scheduled_at)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
