"use client";

/**
 * VersionCard — la tarjeta de versión que V deja en la conversación
 * cuando genera/itera una app (modo v0-sin-v0). Se siente parte del
 * chat, no un widget pegado: borde suave, highlight 1px, preview en
 * iframe propio (/api/builder/preview/:id, cero builds de Vercel),
 * strip de versiones y acciones discretas.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconThumb, IconPen, IconRocket, IconMaximize, IconX, IconCheck } from "@/components/brand/VFIcons";

type VersionMeta = {
  id: string;
  n: number;
  summary: string;
  liked?: boolean | null;
};

export default function VersionCard({
  buildId,
  versionId,
  n,
  summary,
  onChangeRequest,
}: {
  buildId: string;
  versionId: string;
  n: number;
  summary: string;
  /** Lleva el texto al composer (prefijo "Sobre la versión {n}: ") */
  onChangeRequest?: (prefix: string) => void;
}) {
  const [versions, setVersions] = useState<VersionMeta[]>([
    { id: versionId, n, summary },
  ]);
  const [active, setActive] = useState<VersionMeta>({ id: versionId, n, summary });
  const [liked, setLiked] = useState(false);
  const [confirmShip, setConfirmShip] = useState(false);
  const [shipped, setShipped] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState(false);
  const frameHostRef = useRef<HTMLDivElement>(null);

  // Lazy: el iframe carga cuando la tarjeta entra al viewport.
  useEffect(() => {
    const el = frameHostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Trae las hermanas del build para el strip v1·v2·v3.
  useEffect(() => {
    let alive = true;
    fetch(`/api/builder?buildId=${encodeURIComponent(buildId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { versions?: VersionMeta[] } | null) => {
        if (!alive || !data?.versions?.length) return;
        setVersions(
          data.versions.map((v) => ({
            id: v.id,
            n: v.n,
            summary: v.summary,
            liked: v.liked,
          })),
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [buildId, versionId]);

  const like = useCallback(async () => {
    setLiked(true);
    try {
      await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", versionId: active.id }),
      });
    } catch {
      /* best-effort */
    }
  }, [active.id]);

  const ship = useCallback(async () => {
    setConfirmShip(false);
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", versionId: active.id }),
      });
      if (res.ok) setShipped(true);
    } catch {
      /* best-effort */
    }
  }, [active.id]);

  const previewSrc = `/api/builder/preview/${active.id}`;
  const shortSummary =
    (active.summary ?? "").length > 72
      ? `${active.summary.slice(0, 72)}…`
      : active.summary;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-400/20 bg-[var(--color-surface-low)] shadow-[0_1px_0_rgba(255,255,255,0.07)_inset,0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <p className="min-w-0 truncate text-[13.5px] text-on-surface">
          <span className="font-display font-semibold text-white">
            Versión {active.n}
          </span>
          {shortSummary && (
            <span className="text-on-surface-variant"> — {shortSummary}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Expandir preview"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-on-surface-variant transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)] md:h-9 md:w-9"
        >
          <IconMaximize size={15} />
        </button>
      </div>

      {/* Preview */}
      <div ref={frameHostRef} className="px-4 pt-2.5">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-[var(--border-1)] bg-[#0b0716]">
          {visible ? (
            <iframe
              key={active.id}
              src={previewSrc}
              sandbox="allow-scripts"
              loading="lazy"
              title={`Preview versión ${active.n}`}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-on-surface-variant">
              Cargando preview…
            </div>
          )}
        </div>
      </div>

      {/* Strip de versiones */}
      {versions.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-3">
          {versions.map((v) => {
            const isActive = v.id === active.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(v)}
                className={`flex h-11 min-w-[44px] flex-none items-center justify-center rounded-full px-3.5 text-[12.5px] transition md:h-8 ${
                  isActive
                    ? "bg-gradient-to-r from-violet-500/35 to-cyan-500/25 text-white ring-1 ring-violet-400/40"
                    : "bg-[var(--surface-1)] text-on-surface-variant hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
                }`}
              >
                v{v.n}
              </button>
            );
          })}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
        {confirmShip ? (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] px-3 py-1.5 text-[13px] text-on-surface">
            ¿Publico la versión {active.n}?
            <button
              type="button"
              onClick={ship}
              className="flex h-11 items-center gap-1 rounded-lg bg-violet-500/30 px-3 text-white transition hover:bg-violet-500/45 md:h-8"
            >
              <IconCheck size={13} /> Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirmShip(false)}
              className="flex h-11 items-center rounded-lg px-3 text-on-surface-variant transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)] md:h-8"
            >
              No
            </button>
          </div>
        ) : (
          <>
            <CardAction
              icon={<IconThumb size={14} />}
              label={liked ? "Te gusta" : "Me gusta"}
              active={liked}
              onClick={like}
            />
            <CardAction
              icon={<IconPen size={14} />}
              label="Cambia esto"
              onClick={() =>
                onChangeRequest?.(`Sobre la versión ${active.n}: `)
              }
            />
            <CardAction
              icon={<IconRocket size={14} />}
              label={shipped ? "Lista para publicar" : "Publicar"}
              active={shipped}
              onClick={() => !shipped && setConfirmShip(true)}
            />
          </>
        )}
      </div>

      {/* Fullscreen overlay (móvil y escritorio) */}
      {fullscreen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#0b0716]/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-display text-sm font-semibold text-white">
              Versión {active.n}
            </p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Cerrar preview"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--fg-primary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
            >
              <IconX size={17} />
            </button>
          </div>
          <iframe
            src={previewSrc}
            sandbox="allow-scripts"
            title={`Preview completo versión ${active.n}`}
            className="m-3 mt-0 flex-1 rounded-2xl border border-[var(--border-1)] bg-white"
          />
        </div>
      )}
    </div>
  );
}

function CardAction({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] transition md:h-9 ${
        active
          ? "text-cyan-300"
          : "text-on-surface-variant hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
