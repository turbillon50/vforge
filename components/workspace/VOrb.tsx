"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconChats, IconCpu, IconMic, IconGlobe, IconWorkflow } from "@/components/brand/VFIcons";
import { ForgeMark } from "@/components/brand/ForgeMark";

// Accesos FIJOS del botón flotante de V — iguales en toda la app.
// Taller (sala de máquinas) y Blueprint (editor de flujos) siempre primero.
const ITEMS = [
  { label: "Taller", Icon: IconCpu, href: "/app/taller", primary: true },
  { label: "Blueprint", Icon: IconWorkflow, href: "/app/blueprint" },
  { label: "Hablar con V", Icon: IconMic, href: "/app/chat?voice=1" },
  { label: "Conversación", Icon: IconChats, href: "/app/chat" },
  { label: "Navegador", Icon: IconGlobe, href: "/app/vulcano" },
];

const BOTON = 56;
const GAP = 12;
const LONG_PRESS_MS = 400;

function avoidCollision(p: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === "undefined") return p;
  let { x, y } = p;
  // Clamp dentro del viewport
  x = Math.max(8, Math.min(window.innerWidth - BOTON - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - BOTON - 8, y));
  // Solo evitar elementos visibles que realmente colisionan (ej: MobileNav, composer del chat)
  const els = document.querySelectorAll<HTMLElement>("[data-vorb-avoid]");
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Solo evitar si el centro del botón está dentro del elemento
    const cx = x + BOTON / 2, cy = y + BOTON / 2;
    const inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
    if (inside) y = Math.max(8, r.top - BOTON - GAP);
  }
  return { x, y };
}

export function VOrb() {
  const router = useRouter();
  const pathname = usePathname();
  const [_isMobile, setIsMobile] = useState(false);
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
    // En el chat SIEMPRE pegado a la franja inferior, encima del composer (nunca sobre el texto).
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const onChat = window.location.pathname.startsWith("/app/chat");
    const bottomGap = onChat ? 96 : mobile ? 90 : 28; // chat: arriba del composer; móvil: sobre el nav
    const bottomLockedY = window.innerHeight - BOTON - bottomGap;
    const defaultPos = { x: window.innerWidth - 76, y: bottomLockedY };
    try {
      const s = localStorage.getItem("vorb_pos_v3");
      if (s) {
        const saved = JSON.parse(s);
        // Validar que la posición guardada esté dentro del viewport actual
        if (saved.x >= 0 && saved.x < window.innerWidth && saved.y >= 0 && saved.y < window.innerHeight) {
          // Respetar la posicion libre donde el usuario dejo el boton (tambien en el
          // chat). avoidCollision solo evita que tape el composer/nav, no lo clava.
          setPos(avoidCollision(saved));
          return;
        }
      }
    } catch {}
    setPos(defaultPos);
  }, []);

  // Al entrar/cambiar a /app/chat, anclar el botón a la franja inferior (nunca sobre el texto).
  // Se monta una vez en el shell, así que este efecto reactiva el anclaje al navegar.
  useEffect(() => {
    const onChat = pathname?.startsWith("/app/chat") ?? false;
    if (!onChat) return;
    // Al entrar al chat NO clavamos el boton abajo: respetamos su posicion libre,
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
          x: Math.max(8, Math.min(window.innerWidth - BOTON - 8, pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - BOTON - 8, pos.y)),
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

  // ── Gestos del botón: tap = menú · long-press = dictado · drag = mover ──
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
    // Mientras graba, el boton no se arrastra (el dedo se mueve poco al hablar)
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
      // Caso 3: arrastre → el boton se queda LIBRE donde el usuario lo solto.
      // Sin snap a esquinas ni franja inferior forzada. avoidCollision solo hace
      // clamp al viewport y lo sube si justo cae sobre el composer/nav.
      const np = avoidCollision({ x: pos.x, y: pos.y });
      setPos(np);
      try { localStorage.setItem("vorb_pos_v3", JSON.stringify(np)); } catch {}
    }
    drag.current = null;
  }

  // El botón de V se queda visible en TODA la app, incluido /app/chat.
  // Solo se oculta en el home (/app/home) y la raíz (/app), donde V ya es la
  // protagonista del hero y un flotante sería redundante.
  const HIDE_ON = ["/app/home"];
  if (pathname === "/app" || HIDE_ON.some((p) => pathname?.startsWith(p))) return null;
  if (pos.x < 0) return null;
  const onLeft = pos.x + 28 < (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
  // Solo en el chat el botón se encoge al scrollear/leer; nunca mientras graba.
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
            className="fixed inset-0 z-[60] bg-black/30"
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
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{ transformOrigin: onLeft ? "bottom left" : "bottom right" }}
              className={
                "absolute bottom-[72px] flex w-64 flex-col gap-1 rounded-2xl border border-[var(--border-1)] bg-white p-2.5 " +
                (onLeft ? "left-0" : "right-0")
              }
            >
              {/* Header del menú */}
              <div className="mb-1 flex items-center gap-2 px-2.5 py-1.5">
                <ForgeMark size={12} className="text-[var(--vf-violet)]" />
                <span className="text-[12px] font-semibold text-[var(--fg-muted)]">V — Menú</span>
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
                    style={
                      active
                        ? {
                            borderColor: "var(--vf-violet)",
                            background: "var(--vf-violet-soft)",
                          }
                        : undefined
                    }
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-[var(--fg-primary)] transition-colors hover:border-[var(--border-1)] hover:bg-[var(--surface-1)]"
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]"
                    >
                      <it.Icon
                        size={15}
                        style={{ color: active ? "var(--vf-violet-ink)" : "var(--fg-secondary)" }}
                      />
                    </span>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.primary && (
                      <span
                        className="rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase"
                        style={{ borderColor: "#15803d", color: "#15803d" }}
                      >
                        Live
                      </span>
                    )}
                    {active && !it.primary && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--vf-violet)" }}
                      />
                    )}
                  </motion.button>
                );
              })}
              {/* Divider + compartir */}
              <div className="mt-1.5 border-t border-[var(--border-1)] pt-1.5">
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
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-1)] hover:bg-[var(--surface-1)] hover:text-[var(--fg-primary)]"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)]"
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
              className={
                "absolute bottom-[72px] whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold " +
                (onLeft ? "left-0" : "right-0")
              }
              style={{
                borderColor: recording ? "#b91c1c" : "var(--vf-violet)",
                color: recording ? "#b91c1c" : "var(--vf-violet-ink)",
              }}
            >
              {recording ? "● Grabando… suelta para enviar" : "Transcribiendo…"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón de V — morado plano, el único acento. Sin efectos decorativos. */}
        <button
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label={recording ? "Grabando voz — suelta para enviar" : "V"}
          style={{
            touchAction: "none",
            // En el chat: al scrollear/leer el botón se aparta discreto (40%).
            // Al grabar/transcribir nunca se encoge.
            transform: recording ? "scale(1.12)" : shrink ? "scale(0.4)" : open ? "scale(1.08)" : "scale(1)",
            opacity: shrink ? 0.4 : 1,
            transition: "transform .3s cubic-bezier(.22,1,.36,1), opacity .3s ease",
            background: recording ? "#b91c1c" : "var(--vf-violet)",
          }}
          className="grid h-14 w-14 cursor-grab place-items-center rounded-full border-2 border-white text-white active:scale-95"
        >
          {recording ? (
            <IconMic size={20} />
          ) : (
            <ForgeMark size={20} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
}
