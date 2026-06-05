"use client";

/**
 * Blueprint visual estilo Make: nodos redondeados conectados por
 * curvas bezier con flujo animado, sobre grid de puntos.
 * Pan con drag, zoom con rueda/pinch básico (transform de un <g>).
 */
import { useMemo, useRef, useState } from "react";
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
}

const W = 1200;
const H = 800;
const CX = W / 2;
const CY = H / 2;

export default function BlueprintCanvas({ scope }: Props) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    const rF = 240;
    features.forEach((f, i) => {
      const a = (i / Math.max(features.length, 1)) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: `f${i}`,
        label: f,
        x: CX + Math.cos(a) * rF,
        y: CY + Math.sin(a) * rF * 0.72,
        kind: "feature",
      });
    });
    const rI = 420;
    integrations.forEach((g, i) => {
      const a =
        (i / Math.max(integrations.length, 1)) * Math.PI * 2 -
        Math.PI / 2 +
        Math.PI / integrations.length;
      nodes.push({
        id: `g${i}`,
        label: g,
        x: CX + Math.cos(a) * rI,
        y: CY + Math.sin(a) * rI * 0.62,
        kind: "integration",
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
    const k = Math.min(2.5, Math.max(0.4, view.k * (e.deltaY < 0 ? 1.08 : 0.92)));
    setView((v) => ({ ...v, k }));
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (pinch.current !== null) {
        const k = Math.min(2.5, Math.max(0.4, view.k * (d / pinch.current)));
        setView((v) => ({ ...v, k }));
      }
      pinch.current = d;
    }
  }
  function onTouchEnd() {
    pinch.current = null;
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
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
          <pattern id="bp-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" opacity="0.14" />
          </pattern>
          <linearGradient id="bp-flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id="bp-center" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="url(#bp-dots)" className="text-on-surface" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {edges.map(([a, b], i) => {
            const mx = (a.x + b.x) / 2;
            const d = `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="url(#bp-flow)" strokeOpacity="0.25" strokeWidth="2.5" />
                <path
                  d={d}
                  fill="none"
                  stroke="url(#bp-flow)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="6 14"
                  className="bp-flow-anim"
                />
              </g>
            );
          })}

          {nodes.map((n) => (
            <g key={n.id}>
              {n.kind === "center" ? (
                <>
                  <circle cx={n.x} cy={n.y} r="64" fill="url(#bp-center)" opacity="0.95" />
                  <circle cx={n.x} cy={n.y} r="64" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeWidth="1.5" />
                  <circle cx={n.x} cy={n.y} r="78" fill="none" stroke="#8b5cf6" strokeOpacity="0.2" strokeWidth="1" />
                  <text
                    x={n.x}
                    y={n.y + 5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="16"
                    fontWeight="600"
                  >
                    {truncate(n.label, 14)}
                  </text>
                </>
              ) : (
                <>
                  <rect
                    x={n.x - 72}
                    y={n.y - 26}
                    width="144"
                    height="52"
                    rx="16"
                    className="text-on-surface"
                    fill={n.kind === "feature" ? "rgba(139,92,246,0.12)" : "rgba(34,211,238,0.1)"}
                    stroke={n.kind === "feature" ? "rgba(139,92,246,0.55)" : "rgba(34,211,238,0.55)"}
                    strokeWidth="1.25"
                  />
                  <text
                    x={n.x}
                    y={n.y + 4.5}
                    textAnchor="middle"
                    fontSize="13.5"
                    fontWeight="500"
                    fill="currentColor"
                    className="text-on-surface"
                  >
                    {truncate(n.label, 18)}
                  </text>
                </>
              )}
            </g>
          ))}
        </g>
      </svg>

      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-app bg-tint-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted backdrop-blur">
        Arrastra para mover · rueda para zoom
      </p>

      <style jsx>{`
        .bp-flow-anim {
          animation: bp-dash 1.4s linear infinite;
        }
        @keyframes bp-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
