"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessagesSquare, LayoutDashboard, GitBranch, Workflow, Cpu, Boxes } from "lucide-react";

const ITEMS = [
  { label: "Hablar con V", Icon: MessagesSquare, href: "/app/chat", primary: true },
  { label: "Centro de Mando", Icon: LayoutDashboard, href: "/app/cockpit" },
  { label: "RepoVision", Icon: GitBranch, href: "/app/repovision" },
  { label: "Blueprint", Icon: Workflow, href: "/app/blueprint" },
  { label: "Conexiones", Icon: Cpu, href: "/app/integrations" },
  { label: "Proyectos", Icon: Boxes, href: "/app/projects" },
];

const ORB = 56;
const GAP = 12;

function avoidCollision(p: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === "undefined") return p;
  let { x, y } = p;
  x = Math.max(8, Math.min(window.innerWidth - ORB - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - ORB - 8, y));
  const els = document.querySelectorAll<HTMLElement>("[data-vorb-avoid]");
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const overlaps =
      x < r.right + GAP && x + ORB > r.left - GAP &&
      y < r.bottom + GAP && y + ORB > r.top - GAP;
    if (overlaps) y = Math.max(8, r.top - ORB - GAP);
  }
  return { x, y };
}

export function VOrb() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const drag = useRef<{ moved: boolean; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("vorb_pos");
      if (s) { setPos(avoidCollision(JSON.parse(s))); return; }
    } catch {}
    setPos(avoidCollision({ x: window.innerWidth - 78, y: window.innerHeight - 120 }));
  }, []);

  // Auto-reposición: si el orb tapa un [data-vorb-avoid] (composer del chat),
  // se sube solo. No pelea con el usuario mientras arrastra.
  useEffect(() => {
    if (pos.x < 0) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (drag.current) return;
        const np = avoidCollision(pos);
        if (np.x !== pos.x || np.y !== pos.y) setPos(np);
      });
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [pos]);

  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 64, d.ox + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 64, d.oy + dy)),
    });
  }
  function up() {
    const d = drag.current; if (!d) return;
    if (!d.moved) { setOpen((o) => !o); }
    else {
      const snapX = pos.x + 28 < window.innerWidth / 2 ? 12 : window.innerWidth - 68;
      const np = avoidCollision({ x: snapX, y: pos.y });
      setPos(np);
      try { localStorage.setItem("vorb_pos", JSON.stringify(np)); } catch {}
    }
    drag.current = null;
  }

  // El manifiesto: la conversación manda. Dentro del chat el orb no
  // aparece (la V ya vive ahí); en el resto de la app vive con su menú.
  if (pathname?.startsWith("/app/chat")) return null;
  if (pos.x < 0) return null;
  const onLeft = pos.x + 28 < (typeof window !== "undefined" ? window.innerWidth / 2 : 200);

  return (
    <>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" aria-hidden />}
      <div style={{ left: pos.x, top: pos.y }} className="fixed z-[61] select-none">
        {open && (
          <div className={"absolute bottom-[72px] flex w-60 flex-col gap-1.5 rounded-2xl border border-white/15 bg-[#0b0716]/80 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl " + (onLeft ? "left-0" : "right-0")}>
            {ITEMS.map((it, i) => (
              <button
                key={it.label}
                onClick={() => { setOpen(false); router.push(it.href); }}
                style={{ animation: "vorbIn .22s " + i * 0.03 + "s both" }}
                className={"flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition " + (it.primary ? "border-violet-400/50 bg-violet-500/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "border-transparent bg-white/[0.06] text-white/90 hover:bg-white/[0.14] hover:text-white")}
              >
                <it.Icon size={16} className={it.primary ? "text-cyan-300" : "text-violet-300"} />
                {it.label}
              </button>
            ))}
          </div>
        )}

        {/* Esfera de energia de V: gradiente conico animado + capas de glow */}
        <button
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label="V"
          style={{ touchAction: "none" }}
          className={"vorb-sphere relative h-14 w-14 cursor-grab rounded-full transition active:scale-95 " + (open ? "vorb-open" : "")}
        >
          <span aria-hidden className="vorb-halo" />
          <span aria-hidden className="vorb-ring" />
          <span aria-hidden className="vorb-core" />
          <span aria-hidden className="vorb-flare" />
          <span aria-hidden className="vorb-spark" />
        </button>
      </div>
      <style>{`
@keyframes vorbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes vorbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes vorbBreath{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.25);opacity:.9}}
@keyframes vorbHue{0%,100%{filter:hue-rotate(0deg) saturate(1.1)}40%{filter:hue-rotate(-28deg) saturate(1.35)}70%{filter:hue-rotate(18deg) saturate(1.2)}}
@keyframes vorbFlare{0%,100%{opacity:.15;transform:translate(-18%,-18%) scale(.8)}45%{opacity:.75;transform:translate(-8%,-10%) scale(1.05)}60%{opacity:.35}}
@keyframes vorbSpark{0%,86%,100%{opacity:0;transform:scale(.6) rotate(0deg)}90%{opacity:.95;transform:scale(1.15) rotate(20deg)}94%{opacity:.2;transform:scale(.9) rotate(35deg)}}
.vorb-sphere{box-shadow:0 10px 40px rgba(124,58,237,.55),0 0 0 1px rgba(255,255,255,.08) inset}
.vorb-halo{position:absolute;inset:-10px;border-radius:9999px;background:radial-gradient(circle,rgba(124,58,237,.45),rgba(34,211,238,.18) 55%,transparent 72%);filter:blur(8px);animation:vorbBreath 3.2s ease-in-out infinite;pointer-events:none}
.vorb-ring{position:absolute;inset:0;border-radius:9999px;background:conic-gradient(from 0deg,#7c3aed,#22d3ee,#a78bfa,#ffffff,#7c3aed);animation:vorbSpin 6s linear infinite,vorbHue 7s ease-in-out infinite;pointer-events:none}
.vorb-core{position:absolute;inset:3px;border-radius:9999px;background:radial-gradient(circle at 35% 30%,#c4b5fd 0%,#7c3aed 38%,#3b0f7e 75%,#150528 100%);animation:vorbHue 9s ease-in-out infinite;pointer-events:none}
.vorb-flare{position:absolute;inset:6px;border-radius:9999px;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.95),rgba(165,243,252,.35) 35%,transparent 60%);mix-blend-mode:screen;animation:vorbFlare 4.5s ease-in-out infinite;pointer-events:none}
.vorb-spark{position:absolute;inset:10px;border-radius:9999px;background:radial-gradient(circle at 68% 62%,rgba(255,255,255,.9),rgba(34,211,238,.4) 30%,transparent 55%);mix-blend-mode:screen;animation:vorbSpark 5.8s ease-in-out infinite;pointer-events:none}
.vorb-open .vorb-ring{animation-duration:2.2s,7s}
.vorb-open .vorb-halo{animation-duration:1.6s}
      `}</style>
    </>
  );
}
