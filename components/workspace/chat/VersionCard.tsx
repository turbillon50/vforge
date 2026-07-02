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

const SHIP_ERRORS: Record<string, string> = {
  connect_github: "Conecta tu GitHub en Integraciones para publicar.",
  connect_vercel: "Conecta tu Vercel en Integraciones para publicar.",
  no_files: "Esta versión no tiene archivos para publicar.",
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
  const [shipping, setShipping] = useState(false);
  const [shipped, setShipped] = useState<{ repoUrl: string; deployUrl: string | null } | null>(null);
  const [shipError, setShipError] = useState<string | null>(null);
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
    setShipping(true);
    setShipError(null);
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", versionId: active.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShipped({ repoUrl: data.repo?.url ?? null, deployUrl: data.deploy?.url ?? null });
      } else {
        setShipError(SHIP_ERRORS[data.error] ?? "No se pudo publicar. Intenta de nuevo.");
      }
    } catch {
      setShipError("No se pudo publicar. Intenta de nuevo.");
    } finally {
      setShipping(false);
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
                    ? "bg-gradient-to-r from-violet-500/35 to-violet-500/25 text-white ring-1 ring-violet-400/40"
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
        {shipped ? (
          <div className="flex w-full animate-[fadeIn_0.4s_ease-out] flex-wrap items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2 text-[13px] shadow-[0_0_24px_-8px_rgba(52,211,153,0.5)]">
            <span className="text-emerald-300">✦ Publicado</span>
            {shipped.deployUrl && (
              <a
                href={shipped.deployUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 font-medium text-emerald-200 transition hover:bg-emerald-500/30"
              >
                Ver sitio en vivo ↗
              </a>
            )}
            <a
              href={shipped.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-on-surface-variant transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
            >
              Ver repo ↗
            </a>
          </div>
        ) : confirmShip ? (
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
        ) : shipping ? (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-1)] px-3 py-2 text-[13px] text-on-surface-variant">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
            </span>
            Empujando a tu GitHub y desplegando en tu Vercel…
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
              label="Publicar"
              onClick={() => setConfirmShip(true)}
            />
          </>
        )}
        {shipError && (
          <p className="w-full text-[12px] text-red-300">{shipError}</p>
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
          ? "text-violet-300"
          : "text-on-surface-variant hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
