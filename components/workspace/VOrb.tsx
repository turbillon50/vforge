"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconChats, IconCpu, IconMic, IconGlobe, IconWorkflow } from "@/components/brand/VFIcons";

// Accesos FIJOS de la burbuja de V — iguales en toda la app.
// Taller (sala de máquinas) y Blueprint (editor de flujos) siempre primero.
const ITEMS = [
  { label: "Taller", Icon: IconCpu, href: "/app/taller", primary: true },
  { label: "Blueprint", Icon: IconWorkflow, href: "/app/blueprint" },
  { label: "Hablar con V", Icon: IconMic, href: "/app/chat?voice=1" },
  { label: "Conversación", Icon: IconChats, href: "/app/chat" },
  { label: "Navegador", Icon: IconGlobe, href: "/app/vulcano" },
];

const ORB = 56;
const GAP = 12;
const LONG_PRESS_MS = 400;

function avoidCollision(p: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === "undefined") return p;
  let { x, y } = p;
  // Clamp dentro del viewport
  x = Math.max(8, Math.min(window.innerWidth - ORB - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - ORB - 8, y));
  // Solo evitar elementos visibles que realmente colisionan (ej: MobileNav, composer del chat)
  const els = document.querySelectorAll<HTMLElement>("[data-vorb-avoid]");
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Solo evitar si el centro de la esfera está dentro del elemento
    const cx = x + ORB / 2, cy = y + ORB / 2;
    const inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
    if (inside) y = Math.max(8, r.top - ORB - GAP);
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

  // ── Dictado por voz (long-press) ──────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const recordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Posición inicial: esquina inferior derecha, con espacio para el MobileNav en móvil.
    // En el chat SIEMPRE pegada a la franja inferior, encima del composer (nunca sobre el texto).
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const onChat = window.location.pathname.startsWith("/app/chat");
    const bottomGap = onChat ? 96 : mobile ? 90 : 28; // chat: arriba del composer; móvil: sobre el nav
    const bottomLockedY = window.innerHeight - ORB - bottomGap;
    const defaultPos = { x: window.innerWidth - 76, y: bottomLockedY };
    try {
      const s = localStorage.getItem("vorb_pos_v3");
      if (s) {
        const saved = JSON.parse(s);
        // Validar que la posición guardada esté dentro del viewport actual
        if (saved.x >= 0 && saved.x < window.innerWidth && saved.y >= 0 && saved.y < window.innerHeight) {
          // Respetar la posicion libre donde el usuario dejo la esfera (tambien en el
          // chat). avoidCollision solo evita que tape el composer/nav, no la clava.
          setPos(avoidCollision(saved));
          return;
        }
      }
    } catch {}
    setPos(defaultPos);
  }, []);

  // Al entrar/cambiar a /app/chat, anclar la esfera a la franja inferior (nunca sobre el texto).
  // El VOrb se monta una vez en el shell, así que este efecto reactiva el anclaje al navegar.
  useEffect(() => {
    const onChat = pathname?.startsWith("/app/chat") ?? false;
    if (!onChat) return;
    // Al entrar al chat NO clavamos la esfera abajo: respetamos su posicion libre,
    // solo evitamos que tape el composer/nav si justo cae encima.
    setPos((p) => (p.x < 0 ? p : avoidCollision(p)));
  }, [pathname]);

  useEffect(() => {
    if (pos.x < 0) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (drag.current) return;
        // Solo re-clamp en resize, sin perseguir cambios de DOM (evita el salto)
        const clamped = {
          x: Math.max(8, Math.min(window.innerWidth - ORB - 8, pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - ORB - 8, pos.y)),
        };
        if (clamped.x !== pos.x || clamped.y !== pos.y) setPos(clamped);
      });
    };
    window.addEventListener("resize", check);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", check); };
  }, [pos]);

  // Limpieza del micrófono al desmontar
  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Captura de voz con la mejor calidad disponible ────────────────────
  async function startVoiceCapture() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // El usuario pudo soltar antes de que llegara el permiso → no quedó armado
      if (!longPressFired.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 0) await transcribeAndDeliver(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      recordingRef.current = true;
      setRecording(true);
      try { navigator.vibrate?.(15); } catch {}
    } catch {
      longPressFired.current = false;
      recordingRef.current = false;
      setRecording(false);
    }
  }

  function stopVoiceCapture() {
    recordingRef.current = false;
    setRecording(false);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      setTranscribing(true);
      try { mr.stop(); } catch { setTranscribing(false); }
    } else {
      // micrófono no llegó a arrancar (permiso pendiente / denegado)
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function transcribeAndDeliver(blob: Blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/forge/transcribe", { method: "POST", body: form });
      if (!res.ok) return;
      const data = (await res.json()) as { text?: string };
      const text = (data?.text || "").trim();
      if (text) deliverDictation(text);
    } catch {
      /* noop — fallo de red/STT, el usuario puede reintentar */
    } finally {
      setTranscribing(false);
    }
  }

  // Entrega el texto transcrito al input del chat. En el chat inyecta directo
  // en el textarea; fuera del chat lo guarda y navega allá.
  function deliverDictation(text: string) {
    const onChat = pathname?.startsWith("/app/chat") ?? false;
    if (onChat) {
      const el = document.querySelector<HTMLTextAreaElement>("textarea[data-chat-input]");
      if (el) {
        const existing = el.value;
        const next = existing ? `${existing} ${text}` : text;
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(el, next);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.focus();
        return;
      }
    }
    try { sessionStorage.setItem("vorb_dictation", text); } catch {}
    router.push("/app/chat");
  }

  // ── Gestos del orbe: tap = menú · long-press = dictado · drag = mover ──
  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    longPressFired.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      // Solo dispara si no se convirtió en arrastre
      if (drag.current && !drag.current.moved) {
        longPressFired.current = true;
        if (open) setOpen(false);
        startVoiceCapture();
      }
    }, LONG_PRESS_MS) as unknown as number;
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    // Mientras graba, el orbe no se arrastra (el dedo se mueve poco al hablar)
    if (recordingRef.current || longPressFired.current) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      d.moved = true;
      if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    }
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 64, d.ox + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 64, d.oy + dy)),
    });
  }
  function up() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    const d = drag.current;
    // Caso 1: fue un long-press → cerrar dictado y transcribir
    if (longPressFired.current) {
      longPressFired.current = false;
      stopVoiceCapture();
      drag.current = null;
      return;
    }
    if (!d) return;
    // Caso 2: tap simple → menú
    if (!d.moved) {
      setOpen((o) => !o);
    } else {
      // Caso 3: arrastre → la esfera se queda LIBRE donde el usuario la solto.
      // Sin snap a esquinas ni franja inferior forzada. avoidCollision solo hace
      // clamp al viewport y la sube si justo cae sobre el composer/nav.
      const np = avoidCollision({ x: pos.x, y: pos.y });
      setPos(np);
      try { localStorage.setItem("vorb_pos_v3", JSON.stringify(np)); } catch {}
    }
    drag.current = null;
  }

  // El VOrb se queda visible en TODA la app, incluido /app/chat.
  // Solo se oculta en el home (/app/home) y la raíz (/app), donde la esfera de V
  // ya es la protagonista del hero y un flotante sería redundante.
  const HIDE_ON = ["/app/home"];
  if (pathname === "/app" || HIDE_ON.some((p) => pathname?.startsWith(p))) return null;
  if (pos.x < 0) return null;
  const onLeft = pos.x + 28 < (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
  // Solo en el chat la esfera se encoge al scrollear/leer; nunca mientras graba.
  const inChat = pathname?.startsWith("/app/chat") ?? false;
  const shrink = inChat && scrolling && !open && !recording && !transcribing;

  const go = (href: string) => { setOpen(false); router.push(href); };
  const activeBase = (href: string) => href.split("?")[0];
  const isActive = (href: string) => {
    const base = activeBase(href);
    if (base === "/app/chat") return pathname === "/app/chat"; // no marcar "Hablar con V" y "Conversación" juntos por la query
    return pathname === base || (pathname?.startsWith(base + "/") ?? false);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="vorb-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            aria-hidden
          />
        )}
      </AnimatePresence>
      <div style={{ left: pos.x, top: pos.y }} className="fixed z-[61] select-none">
        <AnimatePresence>
          {open && (
            <motion.div
              key="vorb-menu"
              role="menu"
              aria-label="V — Menú"
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{
                transformOrigin: onLeft ? "bottom left" : "bottom right",
                background: "rgba(10,8,20,0.85)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                boxShadow:
                  "0 28px 90px rgba(0,0,0,0.72), 0 0 0 1px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
              }}
              className={"absolute bottom-[72px] flex w-64 flex-col gap-1 p-2.5 " + (onLeft ? "left-0" : "right-0")}
            >
              {/* Header del menú */}
              <div className="mb-1 flex items-center gap-2 px-2.5 py-1.5">
                <div className="vorb-menu-dot" />
                <span className="text-[11px] font-semibold tracking-widest text-violet-300/60 uppercase">V — Menú</span>
              </div>
              {ITEMS.map((it, i) => {
                const active = isActive(it.href);
                return (
                  <motion.button
                    key={it.label}
                    role="menuitem"
                    onClick={() => go(it.href)}
                    initial={{ opacity: 0, x: onLeft ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, type: "spring", stiffness: 480, damping: 30 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      borderRadius: 14,
                      border: active
                        ? "1px solid rgba(124,58,237,0.55)"
                        : "1px solid rgba(255,255,255,0.06)",
                      background: active
                        ? "linear-gradient(90deg, rgba(124,58,237,0.28), rgba(34,211,238,0.10))"
                        : "rgba(255,255,255,0.025)",
                    }}
                    className="group flex items-center gap-3 px-2.5 py-2 text-sm font-medium text-[var(--fg-primary)] transition-colors hover:bg-white/[0.07]"
                  >
                    {/* Ícono en círculo con glow violeta */}
                    <span
                      aria-hidden
                      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: active
                          ? "radial-gradient(circle at 50% 40%, rgba(124,58,237,0.55), rgba(34,211,238,0.18))"
                          : "radial-gradient(circle at 50% 40%, rgba(124,58,237,0.30), rgba(20,12,40,0.5))",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: active
                          ? "0 0 14px rgba(124,58,237,0.55), inset 0 1px 0 rgba(255,255,255,0.14)"
                          : "0 0 10px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                      }}
                    >
                      <it.Icon size={15} className={active ? "text-cyan-200" : "text-violet-200/85"} />
                    </span>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.primary && (
                      <span className="rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                        Live
                      </span>
                    )}
                    {active && !it.primary && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(124,58,237,0.9)]" />
                    )}
                  </motion.button>
                );
              })}
              {/* Divider + share */}
              <div className="mt-1.5 border-t border-white/[0.07] pt-1.5">
                <motion.button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "VForge", text: "La fábrica de apps con IA más potente. Únete.", url: "https://vforge.site" });
                    } else {
                      navigator.clipboard?.writeText("https://vforge.site");
                    }
                    setOpen(false);
                  }}
                  initial={{ opacity: 0, x: onLeft ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + ITEMS.length * 0.05, type: "spring", stiffness: 480, damping: 30 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" }}
                  className="group flex w-full items-center gap-3 px-2.5 py-2 text-sm font-medium text-[var(--fg-secondary)] transition-colors hover:bg-white/[0.07] hover:text-[var(--fg-primary)]"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cyan-300"
                    style={{
                      background: "radial-gradient(circle at 50% 40%, rgba(34,211,238,0.28), rgba(20,12,40,0.5))",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "0 0 10px rgba(34,211,238,0.20), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    ⇧
                  </span>
                  <span className="flex-1 text-left">Compartir VForge</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pista de uso mientras graba */}
        <AnimatePresence>
          {(recording || transcribing) && (
            <motion.div
              key="vorb-rec-hint"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={"absolute bottom-[72px] whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide " + (onLeft ? "left-0" : "right-0")}
              style={{
                background: "rgba(10,8,20,0.9)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: recording ? "#fca5a5" : "#67e8f9",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {recording ? "● Grabando… suelta para enviar" : "Transcribiendo…"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ESFERA V — cristal con Higgsfield */}
        <button
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label={recording ? "Grabando voz — suelta para enviar" : "V"}
          style={{
            touchAction: "none",
            // En el chat: al scrollear/leer la esfera se aparta discreta (40%).
            // Al grabar/transcribir nunca se encoge.
            transform: recording ? "scale(1.12)" : shrink ? "scale(0.4)" : open ? "scale(1.08)" : "scale(1)",
            opacity: shrink ? 0.4 : 1,
            transition: "transform .3s cubic-bezier(.22,1,.36,1), opacity .3s ease",
          }}
          className={
            "vorb-crystal relative h-14 w-14 cursor-grab rounded-full active:scale-95 " +
            (open ? "vorb-open " : "") +
            (recording ? "vorb-recording " : "") +
            (transcribing ? "vorb-transcribing " : "")
          }
        >
          {/* Ondas de grabación */}
          {recording && (
            <>
              <span aria-hidden className="vorb-wave" />
              <span aria-hidden className="vorb-wave vorb-wave-2" />
            </>
          )}
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
          {/* Núcleo de micrófono mientras graba */}
          {recording && (
            <span aria-hidden className="vorb-mic-core">
              <IconMic size={18} className="text-white drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
            </span>
          )}
        </button>
      </div>

      <style>{`
@keyframes vorbIn{from{opacity:0;transform:translateY(10px) scale(0.96)}to{opacity:1;transform:none}}
@keyframes vorbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes vorbBreath{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.3);opacity:.9}}
@keyframes vorbHue{0%,100%{filter:hue-rotate(0deg) saturate(1.2)}40%{filter:hue-rotate(-30deg) saturate(1.5)}70%{filter:hue-rotate(20deg) saturate(1.3)}}
@keyframes vorbGloss{0%,100%{opacity:.4;transform:translate(-20%,-20%) scale(.85)}50%{opacity:.85;transform:translate(-12%,-14%) scale(1.1)}}
@keyframes vorbSpark{0%,85%,100%{opacity:0;transform:scale(.5)}90%{opacity:.9;transform:scale(1.2)}95%{opacity:.2}}
@keyframes vorbRec{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55),0 12px 40px rgba(239,68,68,.4),0 0 60px rgba(124,58,237,.35)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0),0 12px 40px rgba(239,68,68,.55),0 0 80px rgba(124,58,237,.6)}}
@keyframes vorbWave{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.1);opacity:0}}

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

/* Estado grabando: pulso rojo/violeta + ondas + giro acelerado */
.vorb-recording{animation:vorbRec 1.1s ease-out infinite}
.vorb-recording .vorb-crystal-ring{animation-duration:0.9s}
.vorb-recording .vorb-crystal-halo{animation-duration:0.9s;background:radial-gradient(circle,rgba(239,68,68,0.5),rgba(124,58,237,0.3) 50%,transparent 70%)}
.vorb-transcribing .vorb-crystal-ring{animation-duration:0.6s}
.vorb-wave{
  position:absolute;inset:0;border-radius:9999px;pointer-events:none;
  border:2px solid rgba(239,68,68,0.5);
  animation:vorbWave 1.4s ease-out infinite;
}
.vorb-wave-2{animation-delay:0.7s;border-color:rgba(124,58,237,0.5)}
.vorb-mic-core{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  z-index:2;pointer-events:none;
}
`}</style>
    </>
  );
}
