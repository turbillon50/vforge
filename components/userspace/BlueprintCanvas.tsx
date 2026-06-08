
"use client";

/**
 * BlueprintCanvas — Higgsfield "Obsidian + Crystal" redesign
 * Nodos crystal con glassmorphism, glow rings, flujo de partículas animado.
 * Pan + zoom. Datos reales de WorkspaceScope.
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { WorkspaceScope } from "@/lib/workspace/db";

interface Props {
  scope: WorkspaceScope;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "center" | "feature" | "integration";
  icon?: string;
}

const W = 1400;
const H = 900;
const CX = W / 2;
const CY = H / 2;

const FEATURE_ICONS: Record<string, string> = {
  default: "◈",
  auth: "🔐",
  payment: "💳",
  notification: "🔔",
  analytics: "📊",
  storage: "🗄",
  api: "⚡",
  chat: "💬",
  map: "🗺",
};

function iconForFeature(label: string): string {
  const l = label.toLowerCase();
  for (const [k, v] of Object.entries(FEATURE_ICONS)) {
    if (l.includes(k)) return v;
  }
  return FEATURE_ICONS.default;
}

export default function BlueprintCanvas({ scope }: Props) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tick, setTick] = useState(0);

  // Animate flow dots
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const features = (scope.features ?? []).slice(0, 8);
    const integrations = (scope.integrations ?? []).filter(
      (i) => i !== "Ninguna aún",
    );
    const nodes: Node[] = [
      {
        id: "center",
        label: scope.projectName || "Tu app",
        x: CX,
        y: CY,
        kind: "center",
      },
    ];
    const rF = 260;
    features.forEach((f, i) => {
      const a = (i / Math.max(features.length, 1)) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: `f${i}`,
        label: f,
        x: CX + Math.cos(a) * rF,
        y: CY + Math.sin(a) * rF * 0.72,
        kind: "feature",
        icon: iconForFeature(f),
      });
    });
    const rI = 460;
    integrations.forEach((g, i) => {
      const a =
        (i / Math.max(integrations.length, 1)) * Math.PI * 2 -
        Math.PI / 2 +
        Math.PI / Math.max(integrations.length, 1);
      nodes.push({
        id: `g${i}`,
        label: g,
        x: CX + Math.cos(a) * rI,
        y: CY + Math.sin(a) * rI * 0.62,
        kind: "integration",
        icon: "⬡",
      });
    });
    const edges: Array<[Node, Node]> = [];
    const center = nodes[0];
    const featureNodes = nodes.filter((n) => n.kind === "feature");
    const integrationNodes = nodes.filter((n) => n.kind === "integration");
    for (const f of featureNodes) edges.push([center, f]);
    integrationNodes.forEach((g, i) => {
      const target =
        featureNodes.length > 0
          ? featureNodes[i % featureNodes.length]
          : center;
      edges.push([target, g]);
    });
    return { nodes, edges };
  }, [scope]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setView((v) => ({
      ...v,
      x: drag.current!.vx + (e.clientX - drag.current!.x),
      y: drag.current!.vy + (e.clientY - drag.current!.y),
    }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const k = Math.min(2.5, Math.max(0.35, view.k * (e.deltaY < 0 ? 1.08 : 0.93)));
    setView((v) => ({ ...v, k }));
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (pinch.current !== null) {
        const k = Math.min(2.5, Math.max(0.35, view.k * (d / pinch.current)));
        setView((v) => ({ ...v, k }));
      }
      pinch.current = d;
    }
  }
  function onTouchEnd() {
    pinch.current = null;
  }

  // Animated particle along each edge
  const flowT = (tick * 0.018) % 1;

  function getPointOnCubic(
    ax: number, ay: number,
    bx: number, by: number,
    t: number,
  ) {
    const mx = (ax + bx) / 2;
    // C ax ay, mx ay, mx by, bx by
    const t2 = t * t, t3 = t2 * t;
    const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
    return {
      x: mt3 * ax + 3 * mt2 * t * mx + 3 * mt * t2 * mx + t3 * bx,
      y: mt3 * ay + 3 * mt2 * t * ay + 3 * mt * t2 * by + t3 * by,
    };
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Header overlay */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-4"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Sistema · Blueprint
          </p>
          <p className="mt-0.5 font-display text-sm font-semibold text-on-surface">
            {scope.projectName || "Sin nombre"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="font-mono text-[10px] text-muted">
              {nodes.filter((n) => n.kind === "feature").length} features ·{" "}
              {nodes.filter((n) => n.kind === "integration").length} integraciones
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] text-cyan-400">live</span>
          </div>
        </div>
      </motion.div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="img"
        aria-label="Blueprint del sistema"
      >
        <defs>
          {/* Grid de puntos obsidian */}
          <pattern id="bp-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="#8b5cf6" opacity="0.12" />
          </pattern>
          {/* Gradientes de conexión */}
          <linearGradient id="bp-edge-violet" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
            <stop offset="40%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="bp-edge-cyan" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          {/* Centro radial */}
          <radialGradient id="bp-center-fill" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#a078ff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.85" />
          </radialGradient>
          {/* Crystal feature */}
          <linearGradient id="bp-feature-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.06" />
          </linearGradient>
          {/* Crystal integration */}
          <linearGradient id="bp-integration-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.04" />
          </linearGradient>
          {/* Sheen highlight */}
          <linearGradient id="bp-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-center" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fondo */}
        <rect width={W} height={H} fill="#0a0a0f" />
        <rect width={W} height={H} fill="url(#bp-grid)" />
        {/* Aura central sutil */}
        <radialGradient id="aura" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <ellipse cx={CX} cy={CY} rx="380" ry="260" fill="url(#aura)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* ── Edges ── */}
          {edges.map(([a, b], i) => {
            const mx = (a.x + b.x) / 2;
            const d = `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
            const isIntegration = b.kind === "integration";
            const tOffset = ((i * 0.13) + flowT) % 1;
            const pt = getPointOnCubic(a.x, a.y, b.x, b.y, tOffset);
            return (
              <g key={i}>
                {/* Static ghost */}
                <path
                  d={d}
                  fill="none"
                  stroke={isIntegration ? "#22d3ee" : "#8b5cf6"}
                  strokeOpacity="0.1"
                  strokeWidth="1.5"
                />
                {/* Animated dash */}
                <path
                  d={d}
                  fill="none"
                  stroke={isIntegration ? "#22d3ee" : "#8b5cf6"}
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="4 18"
                  style={{
                    animation: `bp-dash-${i % 3} ${1.6 + (i % 4) * 0.3}s linear infinite`,
                  }}
                />
                {/* Flow particle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill={isIntegration ? "#22d3ee" : "#a78bfa"}
                  opacity="0.9"
                  filter={isIntegration ? "url(#glow-cyan)" : "url(#glow-violet)"}
                />
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {nodes.map((n) => {
            const isHovered = hovered === n.id;
            if (n.kind === "center") {
              return (
                <g key={n.id} filter="url(#glow-center)">
                  {/* Outer pulse ring */}
                  <circle cx={n.x} cy={n.y} r="92" fill="none" stroke="#8b5cf6" strokeOpacity="0.12" strokeWidth="1" />
                  <circle cx={n.x} cy={n.y} r="80" fill="none" stroke="#8b5cf6" strokeOpacity="0.22" strokeWidth="1.5" />
                  {/* Main crystal circle */}
                  <circle cx={n.x} cy={n.y} r="66" fill="url(#bp-center-fill)" />
                  {/* Crystal sheen */}
                  <ellipse cx={n.x} cy={n.y - 18} rx="36" ry="22" fill="white" fillOpacity="0.12" />
                  {/* Border */}
                  <circle cx={n.x} cy={n.y} r="66" fill="none" stroke="#a78bfa" strokeOpacity="0.7" strokeWidth="1.5" />
                  <circle cx={n.x} cy={n.y} r="66" fill="none" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="0.75" />
                  {/* Label */}
                  <text
                    x={n.x}
                    y={n.y - 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize="13"
                    fontWeight="400"
                    fontFamily="monospace"
                    letterSpacing="0.12em"
                    textDecoration=""
                    opacity="0.6"
                  >
                    CORE
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="700"
                    letterSpacing="-0.02em"
                  >
                    {truncate(n.label, 13)}
                  </text>
                </g>
              );
            }

            const isFeature = n.kind === "feature";
            const rw = 76, rh = 30;
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                filter={isFeature ? "url(#glow-violet)" : "url(#glow-cyan)"}
              >
                {/* Hover ring */}
                {isHovered && (
                  <rect
                    x={n.x - rw - 4}
                    y={n.y - rh - 4}
                    width={(rw + 4) * 2}
                    height={(rh + 4) * 2}
                    rx="20"
                    fill="none"
                    stroke={isFeature ? "#8b5cf6" : "#22d3ee"}
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                )}
                {/* Crystal body */}
                <rect
                  x={n.x - rw}
                  y={n.y - rh}
                  width={rw * 2}
                  height={rh * 2}
                  rx="16"
                  fill={isFeature ? "url(#bp-feature-fill)" : "url(#bp-integration-fill)"}
                />
                {/* Sheen top */}
                <rect
                  x={n.x - rw + 4}
                  y={n.y - rh + 2}
                  width={(rw - 4) * 2}
                  height="10"
                  rx="8"
                  fill="white"
                  fillOpacity="0.08"
                />
                {/* Border */}
                <rect
                  x={n.x - rw}
                  y={n.y - rh}
                  width={rw * 2}
                  height={rh * 2}
                  rx="16"
                  fill="none"
                  stroke={isFeature ? "#8b5cf6" : "#22d3ee"}
                  strokeOpacity={isHovered ? 0.85 : 0.4}
                  strokeWidth="1.25"
                />
                {/* Icon */}
                <text
                  x={n.x - rw + 20}
                  y={n.y + 5}
                  fontSize="14"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {n.icon}
                </text>
                {/* Label */}
                <text
                  x={n.x + 8}
                  y={n.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12.5"
                  fontWeight="500"
                  fill={isFeature ? "#c4b5fd" : "#67e8f9"}
                  letterSpacing="0.01em"
                >
                  {truncate(n.label, 16)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/8 bg-white/4 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted backdrop-blur-sm"
      >
        Arrastra · rueda zoom
      </motion.p>

      <style jsx>{`
        @keyframes bp-dash-0 { to { stroke-dashoffset: -22; } }
        @keyframes bp-dash-1 { to { stroke-dashoffset: -22; } }
        @keyframes bp-dash-2 { to { stroke-dashoffset: -22; } }
      `}</style>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
