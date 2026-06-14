"use client";

// components/workspace/TokenHealth.tsx
// UI de salud del token OAuth de Claude. Lee /api/forge/token-health (dato real
// del relay) y dispara /api/forge/token-refresh. Exporta:
//  · useTokenHealth        — hook compartido (poll + reconnect)
//  · TokenHealthIndicator  — puntito + horas para el header del workspace
//  · TokenReconnectCard    — tarjeta siempre visible en Configuración
//  · TokenRiskBanner       — banner sutil en el Taller si el estado es crítico
//  · TokenToastHost        — host de toasts (montar una vez en el shell)
//  · pushTokenToast        — emisor de toast desde cualquier punto
// Dark premium · VFIcons · Framer Motion · CERO MOCK.

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconRefresh, IconWarn, IconCheck, IconX } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";
import {
  type TokenHealth,
  type TokenTone,
  tokenTone,
  TONE_COLOR,
  hoursLabel,
  tooltipText,
} from "@/lib/forge/token-health";

// ───────────────────────── toast bus ─────────────────────────

type ToastTone = "ok" | "warn" | "err";
type ToastEvent = { id: number; message: string; tone: ToastTone };

export function pushTokenToast(message: string, tone: ToastTone = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastEvent>("vf-token-toast", {
      detail: { id: Date.now() + Math.random(), message, tone },
    }),
  );
}

const TOAST_HUE: Record<ToastTone, string> = {
  ok: "#34d399",
  warn: "#fbbf24",
  err: "#f87171",
};

export function TokenToastHost() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<ToastEvent>).detail;
      setToasts((prev) => [...prev, t]);
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
        4400,
      );
    };
    window.addEventListener("vf-token-toast", onToast);
    return () => window.removeEventListener("vf-token-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(92vw,340px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const hue = TOAST_HUE[t.tone];
          const Icon = t.tone === "ok" ? IconCheck : t.tone === "warn" ? IconRefresh : IconX;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-[#0b0b12]/95 px-3.5 py-2.5 backdrop-blur-xl"
              style={{ borderColor: `${hue}40`, boxShadow: `0 8px 30px -12px ${hue}66` }}
            >
              <span
                className="grid h-6 w-6 flex-none place-items-center rounded-lg"
                style={{ background: `${hue}1a`, color: hue }}
              >
                <Icon size={13} />
              </span>
              <span className="text-[12.5px] leading-snug text-[var(--fg-primary)]">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── hook ─────────────────────────

export function useTokenHealth(pollMs = 60000) {
  const [health, setHealth] = useState<TokenHealth | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/forge/token-health", { cache: "no-store" });
      const d = await r.json();
      if (d?.ok) {
        setHealth({
          hours_left: d.hours_left ?? null,
          status: d.status ?? null,
          checked_at: d.checked_at ?? null,
        });
      } else {
        setHealth(null);
      }
    } catch {
      /* conserva la última lectura buena */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void load();
    const t = setInterval(() => {
      if (alive) void load();
    }, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [load, pollMs]);

  const reconnect = useCallback(async () => {
    if (reconnecting) return;
    setReconnecting(true);
    pushTokenToast("Reconectando con Claude…", "warn");
    try {
      const r = await fetch("/api/forge/token-refresh", { method: "POST" });
      const d = await r.json();
      if (d?.hours_left != null || d?.status) {
        setHealth({
          hours_left: d.hours_left ?? null,
          status: d.status ?? null,
          checked_at: d.checked_at ?? null,
        });
      }
      void load();
      if (d?.ok) {
        const h = typeof d.hours_left === "number" ? ` · ${d.hours_left.toFixed(1)} h` : "";
        pushTokenToast(`Conexión Claude renovada${h}`, "ok");
      } else {
        pushTokenToast(
          d?.error ? `No se pudo reconectar: ${d.error}` : "El refresh no pudo completarse — revisa el server",
          "err",
        );
      }
    } catch {
      pushTokenToast("No se pudo contactar al relay", "err");
    } finally {
      setReconnecting(false);
    }
  }, [load, reconnecting]);

  return { health, tone: tokenTone(health), loaded, reconnecting, reconnect };
}

// ───────────────────────── pieces ─────────────────────────

function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span className="relative inline-flex flex-none" style={{ height: size, width: size }}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ background: color }}
        animate={{ opacity: [0.7, 0, 0.7], scale: [1, 2.4, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        className="relative inline-flex h-full w-full rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  );
}

function ReconnectButton({
  reconnecting,
  onClick,
  variant = "chip",
}: {
  reconnecting: boolean;
  onClick: () => void;
  variant?: "chip" | "full";
}) {
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={reconnecting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 text-[14px] font-medium text-white shadow-glow-violet transition active:scale-[0.98] disabled:opacity-50"
        style={{ minHeight: 44, touchAction: "manipulation" }}
      >
        <motion.span
          animate={reconnecting ? { rotate: 360 } : { rotate: 0 }}
          transition={reconnecting ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
          className="inline-flex"
        >
          <IconRefresh size={15} />
        </motion.span>
        {reconnecting ? "Reconectando…" : "Reconectar"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={reconnecting}
      className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-200 transition hover:bg-amber-400/15 active:scale-95 disabled:opacity-50"
    >
      <motion.span
        animate={reconnecting ? { rotate: 360 } : { rotate: 0 }}
        transition={reconnecting ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
        className="inline-flex"
      >
        <IconRefresh size={11} />
      </motion.span>
      {reconnecting ? "…" : "Reconectar"}
    </button>
  );
}

// ───────────────────────── indicator (header) ─────────────────────────

export function TokenHealthIndicator({ className }: { className?: string }) {
  const { health, tone, loaded, reconnecting, reconnect } = useTokenHealth();

  // Sin lectura (no-owner → 401, o relay caído) y ya cargado: no pintamos nada.
  if (!loaded || tone === "unknown") return null;

  const color = TONE_COLOR[tone];
  const showReconnect = tone === "amber" || tone === "red";

  return (
    <div className={cn("group/th relative flex items-center gap-2", className)}>
      <PulseDot color={color} />
      <span className="font-mono text-[10px] text-[var(--fg-tertiary)]">
        Token <span style={{ color }}>{hoursLabel(health)}</span>
      </span>
      {showReconnect && <ReconnectButton reconnecting={reconnecting} onClick={reconnect} />}

      {/* Tooltip premium */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[220px] rounded-lg border border-[var(--border-1)] bg-[#0b0b12]/95 px-2.5 py-1.5 opacity-0 shadow-xl backdrop-blur-xl transition-opacity duration-150 group-hover/th:opacity-100">
        <p className="text-[11px] leading-snug text-[var(--fg-primary)]">{tooltipText(health)}</p>
        {health?.checked_at && (
          <p className="mt-0.5 font-mono text-[9px] text-[var(--fg-muted)]">
            Verificado {new Date(health.checked_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── settings card ─────────────────────────

export function TokenReconnectCard() {
  const { health, tone, loaded, reconnecting, reconnect } = useTokenHealth();
  const color = TONE_COLOR[tone];

  const statusLabel =
    tone === "green"
      ? "Conexión sana"
      : tone === "amber"
        ? "Token por expirar"
        : tone === "red"
          ? "Conexión en riesgo"
          : loaded
            ? "Sin lectura del relay"
            : "Consultando…";

  return (
    <div className="mb-4 rounded-xl border border-app bg-tint-1 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-on-surface">Conexión Claude</h3>
        <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color }}>
          <PulseDot color={color} />
          {tone !== "unknown" ? hoursLabel(health) : "—"}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">
        Estado del token OAuth que mantiene vivos a los agentes Vulcano en Hetzner.{" "}
        <span style={{ color }}>{statusLabel}</span>
        {health?.checked_at && (
          <span className="text-muted">
            {" "}· verificado{" "}
            {new Date(health.checked_at).toLocaleString("es-MX", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </p>

      <div className="mt-4">
        <ReconnectButton reconnecting={reconnecting} onClick={reconnect} variant="full" />
      </div>
    </div>
  );
}

// ───────────────────────── taller banner ─────────────────────────

export function TokenRiskBanner() {
  const { health, reconnecting, reconnect } = useTokenHealth();
  const critical = (health?.status === "critico") || tokenTone(health) === "red";

  return (
    <AnimatePresence initial={false}>
      {critical && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 sm:mx-5 md:mx-8">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-rose-500/15 text-rose-300">
              <IconWarn size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-rose-200">Conexión en riesgo</p>
              <p className="text-[12px] text-rose-200/60">Los agentes pueden pausarse si el token expira.</p>
            </div>
            <button
              type="button"
              onClick={reconnect}
              disabled={reconnecting}
              className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[12px] font-medium text-rose-100 transition hover:bg-rose-400/15 active:scale-95 disabled:opacity-50"
            >
              <motion.span
                animate={reconnecting ? { rotate: 360 } : { rotate: 0 }}
                transition={reconnecting ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
                className="inline-flex"
              >
                <IconRefresh size={13} />
              </motion.span>
              {reconnecting ? "Reconectando…" : "Reconectar"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
