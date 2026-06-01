"use client";

/**
 * ProjectGraph
 * 3-D canvas graph — Vercel + GitHub projects.
 *
 * Calls /api/graph/data with the operator token from localStorage.
 * Drop-in anywhere inside the /app layout.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink, Github, Triangle, Trash2, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NodeData {
  dbId: string | null;
  name: string;
  framework: string | null;
  status: string;
  category: string | null;
  domain: string | null;
  vercelUrl: string | null;
  ghRepo: string | null;
  ghUrl: string | null;
  lang: string | null;
  private: boolean;
  desc: string;
  updatedAt: string | null;
}

interface GraphNode {
  id: string;
  label: string;
  type: "vercel" | "github";
  cat: string;
  dead: boolean;
  data: NodeData;
  // 3-D position (fibonacci sphere)
  ox: number; oy: number; oz: number;
  // projected
  _sx: number; _sy: number; _d: number; _sr: number; _rz: number;
  // visual
  r: number;
  color: string;
  glow: string;
}

interface GraphEdge { s: string; t: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const FOV = 680;
const SPHERE_IN  = 200;
const SPHERE_OUT = 360;

const CAT_RING: Record<string, string> = {
  api:      "#1e88ff",
  saas:     "#3355cc",
  fintech:  "#22aadd",
  pwa:      "#4499ff",
  platform: "#6677cc",
  static:   "#445588",
  other:    "#334455",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fibonacci3D(i: number, total: number, R: number) {
  const phi   = Math.acos(1 - 2 * (i + .5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return { x: R * Math.sin(phi) * Math.cos(theta), y: R * Math.sin(phi) * Math.sin(theta), z: R * Math.cos(phi) };
}

function rotMat(rx: number, ry: number) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  return { m00: cy, m01: sx*sy, m02: cx*sy, m10: 0, m11: cx, m12: -sx, m20: -sy, m21: sx*cy, m22: cx*cy };
}

type Mat = ReturnType<typeof rotMat>;

function rot3(x: number, y: number, z: number, m: Mat) {
  return { x: m.m00*x+m.m01*y+m.m02*z, y: m.m10*x+m.m11*y+m.m12*z, z: m.m20*x+m.m21*y+m.m22*z };
}

function project(x: number, y: number, z: number, camZ: number, W: number, H: number) {
  const d = FOV / (FOV + z + camZ);
  return { sx: x * d + W / 2, sy: y * d + H / 2, d };
}

function nodeColor(n: Pick<GraphNode, "dead" | "type" | "data">) {
  if (n.dead)                           return "#ff8822";
  if (n.type === "github")              return "#7755cc";
  if (n.data.status === "ERROR")        return "#ee3344";
  if (n.data.ghRepo)                    return "#22cc66";
  return "#1e6fff";
}

function nodeGlow(n: Pick<GraphNode, "dead" | "type" | "data">) {
  if (n.dead)                           return "#662200";
  if (n.type === "github")              return "#2a1566";
  if (n.data.status === "ERROR")        return "#660011";
  if (n.data.ghRepo)                    return "#0a3320";
  return "#06195e";
}

function healthScore(n: GraphNode): number {
  if (n.type === "github") return n.dead ? 0 : 40;
  let s = 0;
  if (n.data.status === "READY") s += 40;
  if (n.data.ghRepo)             s += 25;
  if (n.data.domain)             s += 20;
  if (n.data.lang)               s += 10;
  if (n.dead)                    s  = Math.min(s, 15);
  return s;
}

function healthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excelente", color: "#22cc66" };
  if (score >= 55) return { label: "Bueno",     color: "#4499ff" };
  if (score >= 30) return { label: "Incompleto",color: "#ffcc22" };
  return             { label: "Crítico",         color: "#ee3344" };
}

// Build nodes with positions from raw API data
function buildNodes(rawNodes: Omit<GraphNode, "ox"|"oy"|"oz"|"_sx"|"_sy"|"_d"|"_sr"|"_rz"|"r"|"color"|"glow">[]) {
  const vercelRaw = rawNodes.filter(n => n.type === "vercel");
  const githubRaw = rawNodes.filter(n => n.type === "github");

  const nodes: GraphNode[] = [];

  vercelRaw.forEach((n, i) => {
    const { x: ox, y: oy, z: oz } = fibonacci3D(i, vercelRaw.length, SPHERE_IN);
    const node: GraphNode = {
      ...n, ox, oy, oz,
      _sx: 0, _sy: 0, _d: 1, _sr: 8, _rz: 0,
      r: n.data.ghRepo ? 9 : 7,
      color: nodeColor(n),
      glow:  nodeGlow(n),
    };
    nodes.push(node);
  });

  githubRaw.forEach((n, i) => {
    const { x: ox, y: oy, z: oz } = fibonacci3D(i, githubRaw.length, SPHERE_OUT);
    const node: GraphNode = {
      ...n, ox, oy, oz,
      _sx: 0, _sy: 0, _d: 1, _sr: 6, _rz: 0,
      r: 5.5,
      color: nodeColor(n),
      glow:  nodeGlow(n),
    };
    nodes.push(node);
  });

  return nodes;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProjectGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  // Mutable 3-D state (never triggers re-renders)
  const state = useRef({
    rotX: 0.25, rotY: 0.15, camZ: 580,
    drag: false, lx: 0, ly: 0, moved: false,
    autoRot: false, time: 0,
    hovered: null as GraphNode | null,
    selected: null as GraphNode | null,
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    nodeById: {} as Record<string, GraphNode>,
    adj: {} as Record<string, string[]>,
    search: "",
    filter: "all",
  });

  // React state (drives UI re-renders)
  const [loading,   setLoading]   = useState(true);
  const [loadMsg,   setLoadMsg]   = useState("Conectando con Vercel y GitHub…");
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<GraphNode | null>(null);
  const [autoRot,   setAutoRot]   = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [stats,     setStats]     = useState({ vercel: 0, github: 0, edges: 0, dead: 0 });
  const [deleting,  setDeleting]  = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadMsg("Cargando proyectos…");

    fetch("/api/graph/data", { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — revisa que el operator token esté configurado`);
        return r.json() as Promise<{ nodes: typeof state.current.nodes; edges: GraphEdge[]; stats: typeof stats }>;
      })
      .then(({ nodes: rawNodes, edges, stats: s }) => {
        const nodes = buildNodes(rawNodes);
        const nodeById: Record<string, GraphNode> = {};
        const adj: Record<string, string[]> = {};
        nodes.forEach(n => { nodeById[n.id] = n; adj[n.id] = []; });
        edges.forEach(e => { adj[e.s]?.push(e.t); adj[e.t]?.push(e.s); });

        state.current.nodes    = nodes;
        state.current.edges    = edges;
        state.current.nodeById = nodeById;
        state.current.adj      = adj;
        setStats(s);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // ── Canvas engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onDown = (e: MouseEvent) => {
      const s = state.current;
      s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.moved = false;
    };

    const onMove = (e: MouseEvent) => {
      const s = state.current;
      if (s.drag) {
        s.rotY += (e.clientX - s.lx) * 0.006;
        s.rotX += (e.clientY - s.ly) * 0.006;
        s.lx = e.clientX; s.ly = e.clientY; s.moved = true;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best: GraphNode | null = null, bd = Infinity;
      s.nodes.forEach(n => {
        const d = Math.hypot(n._sx - mx, n._sy - my);
        if (d < n._sr + 8 && d < bd) { bd = d; best = n; }
      });
      s.hovered = best;
      canvas.style.cursor = best ? "pointer" : (s.drag ? "grabbing" : "grab");
    };

    const onUp = (e: MouseEvent) => {
      const s = state.current;
      s.drag = false;
      if (!s.moved) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let best: GraphNode | null = null, bd = Infinity;
        s.nodes.forEach(n => {
          const d = Math.hypot(n._sx - mx, n._sy - my);
          if (d < n._sr + 8 && d < bd) { bd = d; best = n; }
        });
        s.selected = best;
        setSelected(best);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.current.camZ = Math.max(80, Math.min(1400, state.current.camZ + e.deltaY * 1.2));
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup",   onUp);
    canvas.addEventListener("wheel",     onWheel, { passive: false });

    // Touch support for mobile
    const toMouse = (t: Touch, rect: DOMRect) => ({ clientX: t.clientX, clientY: t.clientY });
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]; if (!t) return;
      onDown({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]; if (!t) return;
      onMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.changedTouches[0]; if (!t) return;
      onUp({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    };
    canvas.addEventListener("touchstart",  onTouchStart,  { passive: false });
    canvas.addEventListener("touchmove",   onTouchMove,   { passive: false });
    canvas.addEventListener("touchend",    onTouchEnd,    { passive: false });

    const draw = () => {
      const s     = state.current;
      const W     = canvas.width, H = canvas.height;
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return; }
      s.time++;
      if (s.autoRot) s.rotY += 0.0022;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#02020d"; ctx.fillRect(0, 0, W, H);

      const ag = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*0.5);
      ag.addColorStop(0,"rgba(10,30,80,0.28)"); ag.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = ag; ctx.fillRect(0,0,W,H);

      const m = rotMat(s.rotX, s.rotY);

      s.nodes.forEach(n => {
        const r = rot3(n.ox, n.oy, n.oz, m);
        const p = project(r.x, r.y, r.z, s.camZ, W, H);
        n._sx = p.sx; n._sy = p.sy; n._d = p.d; n._rz = r.z;
        n._sr = n.r * p.d * 1.4;
      });

      const hasSel   = !!s.selected;
      const vis = (n: GraphNode) => {
        if (s.search && !n.label.toLowerCase().includes(s.search)) return false;
        if (s.filter === "all")     return true;
        if (s.filter === "dead")    return n.dead;
        if (s.filter === "novercel")return n.type === "github";
        if (s.filter === "norepo")  return n.type === "vercel" && !n.data.ghRepo;
        if (s.filter === "error")   return n.data.status === "ERROR";
        return n.cat === s.filter;
      };
      const isConn = (n: GraphNode) =>
        hasSel && (s.adj[s.selected!.id] ?? []).includes(n.id);

      // Edges
      s.edges.forEach(e => {
        const a = s.nodeById[e.s], b = s.nodeById[e.t];
        if (!a || !b) return;
        const isSel  = hasSel && (e.s === s.selected?.id || e.t === s.selected?.id);
        if (!vis(a) && !vis(b) && !isSel) return;
        const alpha  = isSel ? 0.9 : hasSel ? 0.04 : 0.3;
        const w      = (a._d + b._d) * 0.5 * (isSel ? 2.8 : 1.2);
        const col    = isSel ? "rgba(80,180,255," : "rgba(30,111,255,";
        const grd    = ctx.createLinearGradient(a._sx,a._sy,b._sx,b._sy);
        grd.addColorStop(0, col+alpha+")");
        grd.addColorStop(.5, col+(alpha*.6)+")");
        grd.addColorStop(1, col+(alpha*.15)+")");
        ctx.beginPath(); ctx.moveTo(a._sx,a._sy); ctx.lineTo(b._sx,b._sy);
        ctx.strokeStyle = grd; ctx.lineWidth = w; ctx.stroke();
      });

      // Nodes
      ([...s.nodes] as GraphNode[]).sort((a,b) => a._rz - b._rz).forEach(n => {
        const isVis  = vis(n);
        const isSel  = n === s.selected;
        const isCon  = isConn(n);
        const isHov  = n === s.hovered;
        const dim    = hasSel && !isSel && !isCon;
        const pulse  = 1 + Math.sin(s.time*.035 + n.ox*.018 + n.oy*.012) * .1;
        const bR     = n._sr * (isHov || isSel ? 1.4 : 1);
        const alpha  = !isVis ? .05 : dim ? .07 : 1;

        if (alpha > .08) {
          const glR = bR * (isSel ? 6.5 : (isCon||isHov) ? 4.5 : 2.8) * pulse;
          const gr  = ctx.createRadialGradient(n._sx,n._sy,0,n._sx,n._sy,glR);
          gr.addColorStop(0,n.glow+"66"); gr.addColorStop(.5,n.glow+"22"); gr.addColorStop(1,n.glow+"00");
          ctx.beginPath(); ctx.arc(n._sx,n._sy,glR,0,Math.PI*2);
          ctx.fillStyle = gr; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
        }

        // Category ring
        if (alpha > .08) {
          ctx.beginPath(); ctx.arc(n._sx,n._sy,bR+2.5*n._d,0,Math.PI*2);
          ctx.strokeStyle = (CAT_RING[n.cat]??"#334455") + (dim?"20":isSel||isCon?"cc":"55");
          ctx.lineWidth = 1.2*n._d; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;
        }

        // Body
        const bg = ctx.createRadialGradient(n._sx-bR*.32,n._sy-bR*.35,0,n._sx,n._sy,bR);
        bg.addColorStop(0, n.color+(alpha>.5?"ff":"22"));
        bg.addColorStop(.65, n.color+(alpha>.5?"bb":"18"));
        bg.addColorStop(1, n.glow+(alpha>.5?"88":"0a"));
        ctx.beginPath(); ctx.arc(n._sx,n._sy,bR,0,Math.PI*2);
        ctx.fillStyle = bg; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;

        // Specular
        if (alpha > .5) {
          const hl = ctx.createRadialGradient(n._sx-bR*.38,n._sy-bR*.42,0,n._sx-bR*.2,n._sy-bR*.2,bR*.75);
          hl.addColorStop(0,"rgba(255,255,255,0.3)"); hl.addColorStop(1,"rgba(255,255,255,0)");
          ctx.beginPath(); ctx.arc(n._sx,n._sy,bR,0,Math.PI*2); ctx.fillStyle = hl; ctx.fill();
        }

        // Rim
        ctx.beginPath(); ctx.arc(n._sx,n._sy,bR,0,Math.PI*2);
        ctx.strokeStyle = n.color+(dim?"18":(isSel||isCon)?"ee":"66");
        ctx.lineWidth = (isSel ? 2.5 : 1.2)*n._d;
        ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;

        // Dead marker (×)
        if (n.dead && alpha > .4) {
          const xs = bR*.5;
          ctx.strokeStyle = "#ff882299"; ctx.lineWidth = 1.5*n._d;
          ctx.beginPath(); ctx.moveTo(n._sx-xs,n._sy-xs); ctx.lineTo(n._sx+xs,n._sy+xs); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(n._sx+xs,n._sy-xs); ctx.lineTo(n._sx-xs,n._sy+xs); ctx.stroke();
        }

        // Label
        if (alpha > .4 && (n._d > .55 || isSel || isCon || isHov)) {
          const fs = Math.max(9, Math.min(13, 11.5*n._d));
          ctx.font = `${(isSel||isCon)?600:400} ${fs}px Inter,sans-serif`;
          ctx.textAlign = "center";
          const lbl = n.label.length > 22 ? n.label.slice(0,20)+"…" : n.label;
          const ly  = n._sy + bR + fs + 3;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillText(lbl,n._sx+.5,ly+.5);
          ctx.fillStyle = isSel?"#fff":isCon?"#aaccff":"rgba(168,188,212,0.75)";
          ctx.fillText(lbl,n._sx,ly);
          ctx.globalAlpha = 1;
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown",  onDown);
      canvas.removeEventListener("mousemove",  onMove);
      canvas.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("wheel",      onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [loading]);

  // Sync reactive state → mutable ref
  useEffect(() => { state.current.filter  = filter;  }, [filter]);
  useEffect(() => { state.current.search  = search;  }, [search]);
  useEffect(() => { state.current.autoRot = autoRot; }, [autoRot]);

  // ── Delete action ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!selected || selected.type !== "vercel" || !selected.data.dbId) return;
    if (!window.confirm(`¿Eliminar "${selected.data.name}" de Vercel? No se puede deshacer.`)) return;
    setDeleting(true);
    const token = window.localStorage.getItem(OPERATOR_TOKEN_KEY) ?? "";
    try {
      const res = await fetch(`/api/projects/${selected.data.dbId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setToast({ msg: `"${selected.data.name}" eliminado`, ok: true });
        state.current.nodes = state.current.nodes.filter(n => n.id !== selected.id);
        state.current.selected = null;
        setSelected(null);
        setTimeout(() => setToast(null), 3500);
      } else {
        setToast({ msg: "Error al eliminar", ok: false });
        setTimeout(() => setToast(null), 3500);
      }
    } catch {
      setToast({ msg: "Error de red", ok: false });
      setTimeout(() => setToast(null), 3500);
    }
    setDeleting(false);
  }, [selected]);

  // ── Info panel data ───────────────────────────────────────────────────────
  const score  = selected ? healthScore(selected) : 0;
  const health = healthLabel(score);

  const FILTERS = [
    { key: "all",      label: "Todos" },
    { key: "api",      label: "⚙ APIs" },
    { key: "saas",     label: "🚀 SaaS" },
    { key: "pwa",      label: "📱 PWAs" },
    { key: "fintech",  label: "💳 Fintech" },
    { key: "platform", label: "🌐 Plataformas" },
    { key: "static",   label: "📄 Estáticos" },
    { key: "error",    label: "❌ Error" },
    { key: "dead",     label: "💀 Inservibles" },
    { key: "novercel", label: "🐙 Sin Vercel" },
    { key: "norepo",   label: "⚠ Sin GitHub" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#02020d" }}>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-50"
             style={{ background: "rgba(2,2,13,0.95)" }}>
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-display text-xl font-semibold tracking-widest text-on-surface mb-2">V Momentum</p>
            <p className="text-sm text-muted font-mono tracking-wider">{loadMsg}</p>
            {error && <p className="mt-3 text-sm text-error-crimson max-w-xs">{error}</p>}
          </div>
        </div>
      )}

      {/* Controls top-right */}
      {!loading && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <CtrlBtn onClick={() => { state.current.camZ = Math.max(80, state.current.camZ / 1.15); }}>+</CtrlBtn>
          <CtrlBtn onClick={() => { state.current.camZ = Math.min(1400, state.current.camZ * 1.15); }}>−</CtrlBtn>
          <CtrlBtn onClick={() => { state.current.rotX=.25; state.current.rotY=.15; state.current.camZ=580; }}>⊙</CtrlBtn>
          <CtrlBtn active={autoRot} onClick={() => setAutoRot(v => !v)}>↻</CtrlBtn>
        </div>
      )}

      {/* Info panel */}
      {selected && (
        <div className="absolute top-4 right-4 mt-12 w-72 z-20 rounded-xl overflow-hidden"
             style={{ background:"rgba(6,6,22,0.97)", border:"1px solid rgba(30,111,255,0.28)",
                      boxShadow:"0 0 40px rgba(30,111,255,0.16)", maxHeight:"calc(100vh - 80px)", overflowY:"auto" }}>

          {/* Header */}
          <div className="p-4 pb-3" style={{ borderBottom:"1px solid rgba(30,111,255,0.1)" }}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selected.type === "vercel" && <Chip color="#1e6fff">▲ VERCEL</Chip>}
              {selected.type === "github" && <Chip color="#9966ff">🐙 GITHUB</Chip>}
              {selected.data.ghRepo       && <Chip color="#22cc66">🔗 LINKED</Chip>}
              {selected.data.status === "READY" && selected.type === "vercel" && <Chip color="#22cc66">● LIVE</Chip>}
              {selected.data.status === "ERROR"  && <Chip color="#ee3344">● ERROR</Chip>}
              {selected.dead              && <Chip color="#ff8822">⚠ REVISAR</Chip>}
            </div>
            <p className="font-display font-bold text-on-surface text-sm break-all pr-5">{selected.label}</p>
            <p className="text-xs text-muted mt-1">{selected.data.desc}</p>
            <button onClick={() => { state.current.selected=null; setSelected(null); }}
                    className="absolute top-3 right-3 text-muted hover:text-on-surface transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Health bar */}
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom:"1px solid rgba(30,111,255,0.08)" }}>
            <div className="flex-1 h-1.5 rounded-full" style={{ background:"#0a0a1a" }}>
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: score+"%", background: health.color }} />
            </div>
            <span className="text-xs font-semibold font-mono shrink-0" style={{ color: health.color }}>
              {health.label} {score}%
            </span>
          </div>

          {/* Rows */}
          <div className="px-4 py-2">
            {selected.type === "vercel" ? (
              <>
                <InfoRow label="Framework" value={selected.data.framework ?? "—"} />
                <InfoRow label="Deploy"    value={selected.data.status} color={selected.data.status==="READY"?"#22cc66":"#ee3344"} />
                <InfoRow label="GitHub"    value={selected.data.ghRepo ?? "Sin repo"} color={selected.data.ghRepo?"#22cc66":"#ee3344"} />
                <InfoRow label="Dominio"   value={selected.data.domain ?? ".vercel.app"} color={selected.data.domain?"#22cc66":"#4477aa"} />
                <InfoRow label="Lenguaje"  value={selected.data.lang ?? "—"} />
                <InfoRow label="Categoría" value={selected.data.category ?? "—"} />
              </>
            ) : (
              <>
                <InfoRow label="Lenguaje"    value={selected.data.lang ?? "Sin lenguaje"} color={selected.data.lang?undefined:"#ee3344"} />
                <InfoRow label="Visibilidad" value={selected.data.private?"🔒 Privado":"🌐 Público"} />
                <InfoRow label="Deploy"      value="Sin deploy Vercel" color="#ee3344" />
              </>
            )}
          </div>

          {/* Alerts */}
          <div className="px-4 pb-3 flex flex-col gap-2">
            {selected.dead && <Alert type="err">⚠ Candidato a eliminar — duplicado o sin propósito claro</Alert>}
            {selected.type==="vercel" && !selected.data.ghRepo && <Alert type="warn">Sin repositorio GitHub vinculado</Alert>}
            {!selected.data.lang && selected.type==="github" && <Alert type="err">Sin lenguaje — posible repo vacío</Alert>}
            {!selected.dead && selected.data.ghRepo && selected.data.status==="READY" && <Alert type="ok">✅ Sin problemas detectados</Alert>}
          </div>

          {/* Connections */}
          {(state.current.adj[selected.id]?.length ?? 0) > 0 && (
            <div className="px-4 pb-3" style={{ borderTop:"1px solid rgba(30,111,255,0.08)", paddingTop:10 }}>
              <p className="font-mono text-[9px] tracking-[2px] uppercase mb-2" style={{ color:"#334455" }}>Conexiones</p>
              <div className="flex flex-col gap-1">
                {(state.current.adj[selected.id] ?? []).map(id => {
                  const cn = state.current.nodeById[id];
                  if (!cn) return null;
                  const col = cn.dead?"#ff8822":cn.type==="github"?"#9966ff":"#22cc66";
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background:col }} />
                      <span className="flex-1 text-[11px] text-muted truncate">{cn.label}</span>
                      <span className="font-mono text-[9px]" style={{ color:col }}>{cn.dead?"⚠":cn.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="p-4" style={{ borderTop:"1px solid rgba(30,111,255,0.08)" }}>
            <div className="flex flex-col gap-2">
              {selected.data.vercelUrl && selected.type === "vercel" && (
                <ExtLink href={selected.data.vercelUrl} icon={<Triangle size={11} />} label="Ver en Vercel" sub="Deploy live" />
              )}
              {selected.data.ghUrl && (
                <ExtLink href={selected.data.ghUrl} icon={<Github size={11} />} label="Ver en GitHub" sub="Repositorio" />
              )}
              {selected.type === "vercel" && selected.data.ghRepo && (
                <ExtLink
                  href={`https://vercel.com/luis-projects-48b011f9/${selected.data.name}`}
                  icon={<ExternalLink size={11} />}
                  label="Vercel Dashboard"
                  sub="Configuración y env vars"
                />
              )}
              {selected.type === "vercel" && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left disabled:opacity-50"
                  style={{ border:"1px solid rgba(238,51,68,0.25)", background:"rgba(238,51,68,0.07)", color:"#cc4444" }}>
                  <Trash2 size={12} />
                  <span className="flex-1">Eliminar de Vercel</span>
                  {deleting && <span className="text-[10px]">…</span>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 flex-wrap justify-center max-w-[90vw]">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap"
              style={{
                background: filter===f.key ? "rgba(30,111,255,0.18)" : "rgba(6,6,22,0.9)",
                border: filter===f.key ? "1px solid #1e6fff" : "1px solid rgba(30,111,255,0.15)",
                color: filter===f.key ? "#4499ff" : "#445566",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      {!loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Buscar proyecto…"
            className="px-5 py-2 rounded-full text-xs text-center outline-none w-56 transition-all"
            style={{ background:"rgba(6,6,22,0.92)", border:"1px solid rgba(30,111,255,0.22)",
                     color:"#c8d8ee", fontFamily:"inherit" }}
          />
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="absolute bottom-4 right-4 z-20 text-right flex flex-col gap-1">
          <p className="font-mono text-[10px]" style={{ color:"#223344" }}>Vercel <b style={{ color:"#334466" }}>{stats.vercel}</b></p>
          <p className="font-mono text-[10px]" style={{ color:"#223344" }}>GitHub <b style={{ color:"#334466" }}>{stats.github}</b></p>
          <p className="font-mono text-[10px]" style={{ color:"#223344" }}>Inservibles <b style={{ color:"#ff6633" }}>{stats.dead}</b></p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap"
             style={{ background: toast.ok ? "rgba(34,204,102,0.12)" : "rgba(238,51,68,0.12)",
                      border: `1px solid ${toast.ok ? "#22cc66" : "#ee3344"}`,
                      color: toast.ok ? "#44dd88" : "#ff6677",
                      boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────
function CtrlBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all"
            style={{ background: active ? "rgba(30,111,255,0.18)" : "rgba(2,2,13,0.9)",
                     border: active ? "1px solid #1e6fff" : "1px solid rgba(30,111,255,0.2)",
                     color: active ? "#4499ff" : "#6688aa" }}>
      {children}
    </button>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="font-mono text-[9px] tracking-widest px-2 py-0.5 rounded"
          style={{ background: color+"22", color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center py-1.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
      <span className="font-mono text-[9.5px] tracking-wider uppercase w-20 shrink-0" style={{ color:"#334455" }}>{label}</span>
      <span className="text-xs font-semibold truncate" style={{ color: color ?? "#c8d8ee" }}>{value}</span>
    </div>
  );
}

function Alert({ children, type }: { children: React.ReactNode; type: "err"|"warn"|"ok" }) {
  const styles = {
    err:  { bg:"rgba(238,51,68,0.1)",  col:"#ff6677", border:"#ee3344" },
    warn: { bg:"rgba(255,136,34,0.1)", col:"#ffaa55", border:"#ff8822" },
    ok:   { bg:"rgba(34,204,102,0.08)",col:"#44dd88", border:"#22cc66" },
  }[type];
  return (
    <div className="text-xs px-3 py-1.5 rounded-md font-medium leading-snug"
         style={{ background: styles.bg, color: styles.col, borderLeft:`3px solid ${styles.border}` }}>
      {children}
    </div>
  );
}

function ExtLink({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-on-surface transition-all group"
       style={{ border:"1px solid rgba(30,111,255,0.14)" }}
       onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(30,111,255,0.4)")}
       onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(30,111,255,0.14)")}>
      <span className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ background:"rgba(30,111,255,0.1)", color:"#4499ff" }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-on-surface">{label}</span>
        <span className="block text-[10px] text-muted">{sub}</span>
      </span>
      <ExternalLink size={11} className="text-muted group-hover:text-on-surface-variant shrink-0" />
    </a>
  );
}
