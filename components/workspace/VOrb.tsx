"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconChats, IconLayout, IconBranch, IconWorkflow, IconCpu, IconBoxes } from "@/components/brand/VFIcons";

const ITEMS_DEFAULT = [
  { label: "Hablar con V", Icon: IconChats, href: "/app/chat", primary: true },
  { label: "Centro de Mando", Icon: IconLayout, href: "/app/cockpit" },
  { label: "RepoVision", Icon: IconBranch, href: "/app/repovision" },
  { label: "Blueprint", Icon: IconWorkflow, href: "/app/blueprint" },
  { label: "Conexiones", Icon: IconCpu, href: "/app/integrations" },
  { label: "Proyectos", Icon: IconBoxes, href: "/app/projects" },
];

const ITEMS_CHAT = [
  { label: "Nuevo Chat", Icon: IconChats, href: "/app/chat/new", primary: true },
  { label: "Proyectos", Icon: IconBoxes, href: "/app/projects" },
  { label: "Deploy", Icon: IconLayout, href: "/app/deployments" },
  { label: "RepoVision", Icon: IconBranch, href: "/app/repovision" },
  { label: "Blueprint", Icon: IconWorkflow, href: "/app/blueprint" },
  { label: "Inicio", Icon: IconCpu, href: "/app" },
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

  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    const scroller: EventTarget = document.querySelector("[data-app-scroll]") || window;
    let t = 0;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = window.setTimeout(() => setScrolling(false), 550) as unknown as number;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); scroller.removeEventListener("scroll", onScroll); };
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
    return () => { cancelAnimationFrame(raf); obs.disconnect(); window.removeEventListener("resize", check); };
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

  const HIDE_ON = ["/app/home"];
  if (pathname === "/app" || HIDE_ON.some((p) => pathname?.startsWith(p))) return null;
  if (pos.x < 0) return null;
  const onLeft = pos.x + 28 < (typeof window !== "undefined" ? window.innerWidth / 2 : 200);

  return (
    <>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" aria-hidden />}
      <div style={{ left: pos.x, top: pos.y }} className="fixed z-[61] select-none">
        {open && (
          <div className={"absolute bottom-[72px] flex w-64 flex-col gap-1 rounded-2xl border border-white/10 bg-[#06040f]/85 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(124,58,237,0.15)] backdrop-blur-3xl " + (onLeft ? "left-0" : "right-0")}>
            {/* Header del menú */}
            <div className="mb-1 flex items-center gap-2 px-3 py-2">
              <div className="vorb-menu-dot" />
              <span className="text-[11px] font-semibold tracking-widest text-violet-300/60 uppercase">V — Menú</span>
            </div>
            {(pathname?.startsWith("/app/chat") ? ITEMS_CHAT : ITEMS_DEFAULT).map((it, i) => (
              <button
                key={it.label}
                onClick={() => { setOpen(false); router.push(it.href); }}
                style={{ animation: "vorbIn .2s " + i * 0.035 + "s both" }}
                className={"group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all " + (it.primary ? "border-violet-400/40 bg-gradient-to-r from-violet-600/30 to-cyan-500/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:from-violet-600/45 hover:to-cyan-500/25" : "border-white/[0.05] bg-white/[0.04] text-white/80 hover:bg-white/[0.1] hover:text-white hover:border-violet-400/20")}
              >
                <it.Icon size={15} className={it.primary ? "text-cyan-300" : "text-violet-300/70 group-hover:text-violet-300"} />
                <span className="flex-1 text-left">{it.label}</span>
                <span className="text-white/20 group-hover:text-white/40 transition-colors">→</span>
              </button>
            ))}
            {/* Divider + share */}
            <div className="mt-1 border-t border-white/[0.06] pt-1">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "VForge", text: "La fábrica de apps con IA más potente. Únete.", url: "https://vforge.site" });
                  } else {
                    navigator.clipboard?.writeText("https://vforge.site");
                  }
                  setOpen(false);
                }}
                style={{ animation: "vorbIn .2s " + ITEMS.length * 0.035 + "s both" }}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/90"
              >
                <span className="text-cyan-400/60 group-hover:text-cyan-400">⇧</span>
                <span>Compartir VForge</span>
              </button>
            </div>
          </div>
        )}

        {/* ESFERA V — cristal con Higgsfield */}
        <button
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label="V"
          style={{
            touchAction: "none",
            transform: scrolling && !open ? "scale(0.62)" : open ? "scale(1.08)" : "scale(1)",
            opacity: scrolling && !open ? 0.7 : 1,
            transition: "transform .3s cubic-bezier(.22,1,.36,1), opacity .3s ease",
          }}
          className={"vorb-crystal relative h-14 w-14 cursor-grab rounded-full active:scale-95 " + (open ? "vorb-open" : "")}
        >
          {/* Capa base: imagen Higgsfield como textura de cristal */}
          <span aria-hidden className="vorb-crystal-bg" />
          {/* Anillo exterior giratorio */}
          <span aria-hidden className="vorb-crystal-ring" />
          {/* Capa glassmorphism encima */}
          <span aria-hidden className="vorb-crystal-glass" />
          {/* Reflejo especular */}
          <span aria-hidden className="vorb-crystal-gloss" />
          {/* Halo de energía */}
          <span aria-hidden className="vorb-crystal-halo" />
          {/* Chispa */}
          <span aria-hidden className="vorb-crystal-spark" />
        </button>
      </div>

      <style>{`
@keyframes vorbIn{from{opacity:0;transform:translateY(10px) scale(0.96)}to{opacity:1;transform:none}}
@keyframes vorbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes vorbBreath{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.3);opacity:.9}}
@keyframes vorbHue{0%,100%{filter:hue-rotate(0deg) saturate(1.2)}40%{filter:hue-rotate(-30deg) saturate(1.5)}70%{filter:hue-rotate(20deg) saturate(1.3)}}
@keyframes vorbGloss{0%,100%{opacity:.4;transform:translate(-20%,-20%) scale(.85)}50%{opacity:.85;transform:translate(-12%,-14%) scale(1.1)}}
@keyframes vorbSpark{0%,85%,100%{opacity:0;transform:scale(.5)}90%{opacity:.9;transform:scale(1.2)}95%{opacity:.2}}

.vorb-menu-dot{width:6px;height:6px;border-radius:9999px;background:radial-gradient(circle,#22d3ee,#7c3aed);box-shadow:0 0 8px #22d3ee80}

.vorb-crystal{
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.12) inset,
    0 12px 40px rgba(124,58,237,0.6),
    0 0 80px rgba(124,58,237,0.25),
    0 2px 8px rgba(0,0,0,0.8);
}
.vorb-crystal-bg{
  position:absolute;inset:0;border-radius:9999px;overflow:hidden;
  background-image:url('https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_063c8411-35b1-4eb4-a5b3-bc7c5bd62f50.png');
  background-size:300%;
  background-position:35% 30%;
  animation:vorbHue 8s ease-in-out infinite;
}
.vorb-crystal-ring{
  position:absolute;inset:-3px;border-radius:9999px;
  background:conic-gradient(from 0deg,rgba(124,58,237,0.9),rgba(34,211,238,0.8),rgba(167,139,250,0.7),rgba(255,255,255,0.5),rgba(124,58,237,0.9));
  animation:vorbSpin 4s linear infinite;
  mask:radial-gradient(circle,transparent 88%,black 100%);
  -webkit-mask:radial-gradient(circle,transparent 88%,black 100%);
}
.vorb-crystal-glass{
  position:absolute;inset:2px;border-radius:9999px;
  background:radial-gradient(circle at 50% 50%, rgba(124,58,237,0.15) 0%, rgba(20,10,40,0.3) 60%, rgba(0,0,0,0.1) 100%);
  backdrop-filter:blur(2px);
  border:1px solid rgba(255,255,255,0.08);
}
.vorb-crystal-gloss{
  position:absolute;inset:5px;border-radius:9999px;
  background:radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.4) 25%, transparent 55%);
  mix-blend-mode:screen;
  animation:vorbGloss 4s ease-in-out infinite;
}
.vorb-crystal-halo{
  position:absolute;inset:-12px;border-radius:9999px;
  background:radial-gradient(circle,rgba(124,58,237,0.5),rgba(34,211,238,0.2) 50%,transparent 70%);
  filter:blur(10px);
  animation:vorbBreath 3s ease-in-out infinite;
  pointer-events:none;
}
.vorb-crystal-spark{
  position:absolute;inset:8px;border-radius:9999px;
  background:radial-gradient(circle at 65% 65%, rgba(255,255,255,0.95), rgba(34,211,238,0.5) 30%, transparent 55%);
  mix-blend-mode:screen;
  animation:vorbSpark 6s ease-in-out infinite;
}
.vorb-open .vorb-crystal-ring{animation-duration:1.5s}
.vorb-open .vorb-crystal-halo{animation-duration:1.2s;opacity:1.2}
`}</style>
    </>
  );
}
