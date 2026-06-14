"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { IconZap, IconSend, IconUsers, IconActivity, IconClock, IconGlobe, IconCode } from "@/components/brand/VFIcons";
import type { NodeType } from "@/lib/automations/types";
import { type EditorNode, NODE_META } from "./flow-types";

const NODE_ICON: Record<NodeType, (p: { size?: number }) => React.ReactNode> = {
  trigger: IconZap,
  wa_send: IconSend,
  crm_upsert: IconUsers,
  condition: IconActivity,
  delay: IconClock,
  http: IconGlobe,
  log: IconCode,
};

const R = 46; // radio de la esfera

function center(n: EditorNode) {
  return { x: n.position.x + R, y: n.position.y + R };
}

export function FlowCanvas({
  nodes,
  selected,
  linkFrom,
  onSelect,
  onMove,
  onStartLink,
  onCompleteLink,
}: {
  nodes: EditorNode[];
  selected: string | null;
  linkFrom: string | null;
  onSelect: (key: string | null) => void;
  onMove: (key: string, pos: { x: number; y: number }) => void;
  onStartLink: (key: string) => void;
  onCompleteLink: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: string; dx: number; dy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, n: EditorNode) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const rect = ref.current?.getBoundingClientRect();
      drag.current = {
        key: n.key,
        dx: e.clientX - (rect?.left ?? 0) - n.position.x,
        dy: e.clientY - (rect?.top ?? 0) - n.position.y,
      };
      onSelect(n.key);
    },
    [onSelect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const rect = ref.current?.getBoundingClientRect();
      const x = Math.max(0, e.clientX - (rect?.left ?? 0) - drag.current.dx);
      const y = Math.max(0, e.clientY - (rect?.top ?? 0) - drag.current.dy);
      onMove(drag.current.key, { x, y });
    },
    [onMove],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => onSelect(null)}
      className="relative h-full w-full overflow-auto rounded-2xl border border-[var(--border-1)]"
      style={{
        minHeight: 520,
        background:
          "radial-gradient(circle at 30% 20%, rgba(124,58,237,0.06), transparent 60%), var(--color-surface, #0a0a0f)",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Conexiones */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ minHeight: 520 }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(148,163,184,0.7)" />
          </marker>
          <marker id="arrowAlt" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(239,68,68,0.7)" />
          </marker>
        </defs>
        {nodes.flatMap((n) => {
          const from = center(n);
          const draw = (toKey: string, alt: boolean) => {
            const t = nodes.find((m) => m.key === toKey);
            if (!t) return null;
            const to = center(t);
            const mx = (from.x + to.x) / 2;
            const d = `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`;
            return (
              <path
                key={`${n.key}-${toKey}-${alt}`}
                d={d}
                fill="none"
                stroke={alt ? "rgba(239,68,68,0.55)" : "rgba(148,163,184,0.5)"}
                strokeWidth={2}
                markerEnd={alt ? "url(#arrowAlt)" : "url(#arrow)"}
              />
            );
          };
          return [
            ...n.next.map((k) => draw(k, false)),
            ...n.next_alt.map((k) => draw(k, true)),
          ];
        })}
      </svg>

      {/* Nodos esféricos */}
      {nodes.map((n, i) => {
        const meta = NODE_META[n.type];
        const Icon = NODE_ICON[n.type];
        const isSel = selected === n.key;
        const isLinkSrc = linkFrom === n.key;
        return (
          <motion.div
            key={n.key}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}
            className="absolute select-none"
            style={{ left: n.position.x, top: n.position.y, width: R * 2 }}
            onPointerDown={(e) => onPointerDown(e, n)}
            onClick={(e) => {
              e.stopPropagation();
              if (linkFrom && linkFrom !== n.key) onCompleteLink(n.key);
              else onSelect(n.key);
            }}
          >
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: R * 2,
                height: R * 2,
                cursor: "grab",
                background: `radial-gradient(circle at 35% 30%, rgba(${meta.glow},0.9), rgba(${meta.glow},0.18) 70%, rgba(0,0,0,0.4))`,
                boxShadow: isSel
                  ? `0 0 0 2px rgba(${meta.glow},0.9), 0 0 32px rgba(${meta.glow},0.55)`
                  : isLinkSrc
                    ? `0 0 0 2px rgba(${meta.glow},0.7), 0 0 22px rgba(${meta.glow},0.4)`
                    : `0 8px 24px rgba(0,0,0,0.45), inset 0 1px 6px rgba(255,255,255,0.15)`,
              }}
            >
              <span className="text-white/95 drop-shadow">
                <Icon size={26} />
              </span>
              {n.type === "trigger" && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid rgba(${meta.glow},0.5)` }}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </div>
            <div className="mt-1.5 text-center">
              <p className="truncate text-[11px] font-semibold text-[var(--fg-primary)]">{n.label}</p>
              <p className="text-[9px] uppercase tracking-wider text-[var(--fg-tertiary)]">{meta.name}</p>
            </div>
            {/* Handle de conexión */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartLink(n.key);
              }}
              title="Conectar →"
              className="absolute -right-1 top-[38px] flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-2)] bg-black/60 text-[10px] text-[var(--fg-secondary)] hover:border-violet-400 hover:text-violet-300"
              style={{ pointerEvents: "auto" }}
            >
              →
            </button>
          </motion.div>
        );
      })}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[var(--fg-muted)]">Lienzo vacío — agrega un nodo del panel para empezar.</p>
        </div>
      )}
    </div>
  );
}
