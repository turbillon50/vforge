"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare, LayoutDashboard, GitBranch, Workflow, Cpu, Boxes, X } from "lucide-react";

const ITEMS = [
  { label: "Hablar con V", Icon: MessagesSquare, href: "/app/chat", primary: true },
  { label: "Centro de Mando", Icon: LayoutDashboard, href: "/app/cockpit" },
  { label: "RepoVision", Icon: GitBranch, href: "/app/repovision" },
  { label: "Blueprint", Icon: Workflow, href: "/app/blueprint" },
  { label: "Conexiones", Icon: Cpu, href: "/app/integrations" },
  { label: "Proyectos", Icon: Boxes, href: "/app/projects" },
];

export function VOrb() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const drag = useRef<{ moved: boolean; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("vorb_pos");
      if (s) { setPos(JSON.parse(s)); return; }
    } catch {}
    setPos({ x: window.innerWidth - 78, y: window.innerHeight - 120 });
  }, []);

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
      const np = { x: snapX, y: pos.y };
      setPos(np);
      try { localStorage.setItem("vorb_pos", JSON.stringify(np)); } catch {}
    }
    drag.current = null;
  }

  if (pos.x < 0) return null;
  const onLeft = pos.x + 28 < (typeof window !== "undefined" ? window.innerWidth / 2 : 200);

  return (
    <>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-[60]" aria-hidden />}
      <div style={{ left: pos.x, top: pos.y }} className="fixed z-[61] select-none">
        {open && (
          <div className={"absolute bottom-[68px] flex w-56 flex-col gap-2 " + (onLeft ? "left-0" : "right-0")}>
            {ITEMS.map((it, i) => (
              <button
                key={it.label}
                onClick={() => { setOpen(false); router.push(it.href); }}
                style={{ animation: "vorbIn .2s " + i * 0.03 + "s both" }}
                className={"flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm backdrop-blur-xl transition " + (it.primary ? "border-violet-400/40 bg-violet-500/20 text-white" : "border-white/10 bg-white/10 text-on-surface hover:bg-white/20")}
              >
                <it.Icon size={16} className={it.primary ? "text-cyan-300" : "text-violet-300"} />
                {it.label}
              </button>
            ))}
          </div>
        )}
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400" style={{ animation: "vorbPulse 2.4s ease-in-out infinite" }} />
        <button
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label="V"
          style={{ touchAction: "none" }}
          className="relative flex h-14 w-14 cursor-grab items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_8px_30px_rgba(139,92,246,0.5)] transition active:scale-95"
        >
          {open ? <X size={22} /> : <span className="font-display text-2xl font-bold">V</span>}
        </button>
      </div>
      <style>{"@keyframes vorbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes vorbPulse{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.5);opacity:0}}"}</style>
    </>
  );
}
