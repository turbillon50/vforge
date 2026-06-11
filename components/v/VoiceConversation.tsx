"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconMic, IconX } from "@/components/brand/VFIcons";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "error";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

const GREETING = "Ey, hermano. Soy V. ¿Qué traemos hoy?";

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

export function VoiceConversation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const sessionId = useRef("voice-" + Math.random().toString(36).slice(2, 9));
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // ── Pulso del orbe accionado por amplitud (escucha y habla) ────────────────
  const drivePulse = useCallback(() => {
    const analyser = analyserRef.current;
    const orb = orbRef.current;
    if (!analyser || !orb) {
      rafRef.current = requestAnimationFrame(drivePulse);
      return;
    }
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length); // 0..~1
    const active = phaseRef.current === "listening" || phaseRef.current === "speaking";
    const scale = active ? 1 + Math.min(rms * 2.2, 0.55) : 1;
    orb.style.setProperty("--pulse", scale.toFixed(3));
    rafRef.current = requestAnimationFrame(drivePulse);
  }, []);

  function ensureAudioContext(): AudioContext {
    if (!acRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      acRef.current = new Ctor();
    }
    if (acRef.current.state === "suspended") acRef.current.resume();
    return acRef.current;
  }

  // ── Reproducir audio de V (TTS) con pulso por amplitud ─────────────────────
  const speak = useCallback(
    async (text: string) => {
      setPhase("speaking");
      try {
        const res = await fetch("/api/v/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("TTS " + res.status);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const ac = ensureAudioContext();
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        audioElRef.current = audio;

        try {
          const srcNode = ac.createMediaElementSource(audio);
          const analyser = ac.createAnalyser();
          analyser.fftSize = 512;
          srcNode.connect(analyser);
          analyser.connect(ac.destination);
          analyserRef.current = analyser;
        } catch {
          // Si el nodo ya está conectado en algún navegador, igual suena.
        }

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        analyserRef.current = null;
      } catch {
        setError("No pude reproducir la voz de V.");
      } finally {
        if (orbRef.current) orbRef.current.style.setProperty("--pulse", "1");
        setPhase("idle");
      }
    },
    [],
  );

  // ── Pipeline: audio grabado → STT → chat (voz) → TTS ───────────────────────
  const handleRecorded = useCallback(
    async (blob: Blob) => {
      setPhase("thinking");
      setError(null);
      try {
        // 1) STT
        const fd = new FormData();
        const ext = mimeRef.current.includes("mp4") ? "mp4" : "webm";
        fd.append("file", blob, `clip.${ext}`);
        const sttRes = await fetch("/api/v/voice/stt", { method: "POST", body: fd });
        const sttData = await sttRes.json();
        const userText = (sttData.text || "").trim();
        if (!userText) {
          setError("No te escuché bien, hermano. Intenta de nuevo.");
          setPhase("idle");
          return;
        }
        setTurns((t) => [...t, { role: "user", text: userText }]);

        // 2) Cerebro hablado de V
        const history = turns.map((t) => ({ role: t.role, content: t.text }));
        const chatRes = await fetch("/api/v/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history,
            mode: "voice",
            session_id: sessionId.current,
          }),
        });
        const chatData = await chatRes.json();
        const reply = (chatData.reply || chatData.error || "Perdón, me trabé.").trim();
        setTurns((t) => [...t, { role: "assistant", text: reply }]);

        // 3) TTS
        await speak(reply);
      } catch {
        setError("Falló el pipeline de voz. Revisa la conexión.");
        setPhase("idle");
      }
    },
    [turns, speak],
  );

  // ── Grabación (push-to-talk) ───────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (phaseRef.current === "listening" || phaseRef.current === "thinking") return;
    // Cortar a V si está hablando (barge-in).
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
    }
    setError(null);
    try {
      ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Analyser sobre el micro → pulso al escuchar.
      const ac = ensureAudioContext();
      const micSrc = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      micSrc.connect(analyser);
      analyserRef.current = analyser;

      const mime = pickMime();
      mimeRef.current = mime;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        analyserRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
        if (blob.size > 0) handleRecorded(blob);
        else setPhase("idle");
      };
      recorderRef.current = rec;
      rec.start();
      setPhase("listening");
    } catch {
      setError("No me diste permiso del micrófono. Actívalo para hablar con V.");
      setPhase("error");
    }
  }, [handleRecorded]);

  const stopListening = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  // ── Arranque (gesto del usuario → habilita audio + saluda) ─────────────────
  const begin = useCallback(async () => {
    setStarted(true);
    ensureAudioContext();
    rafRef.current = requestAnimationFrame(drivePulse);
    setTurns([{ role: "assistant", text: GREETING }]);
    await speak(GREETING);
  }, [drivePulse, speak]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      acRef.current?.close().catch(() => {});
    };
  }, []);

  const statusLabel: Record<Phase, string> = {
    idle: "Mantén pulsado para hablar",
    listening: "Te escucho…",
    thinking: "V está pensando…",
    speaking: "V está hablando…",
    error: "Toca el micrófono para reintentar",
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-between gap-4 px-4 py-6">
      {/* Transcript */}
      <div className="w-full max-w-md flex-1 min-h-0 overflow-y-auto space-y-3 pt-2">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                t.role === "user"
                  ? "bg-violet-600/30 text-white border border-violet-400/30"
                  : "bg-white/[0.06] text-white/90 border border-white/10"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        <div ref={turnsEndRef} />
      </div>

      {error && (
        <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Orbe + control */}
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="relative flex h-44 w-44 items-center justify-center">
          {/* Halo */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.55), rgba(34,211,238,0.25) 55%, transparent 72%)",
              opacity: phase === "idle" ? 0.4 : 0.9,
              transform: "scale(var(--pulse,1))",
            }}
          />
          <button
            ref={orbRef}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!started) return;
              startListening();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (!started) return;
              stopListening();
            }}
            onPointerLeave={() => {
              if (phaseRef.current === "listening") stopListening();
            }}
            onClick={() => {
              if (!started) begin();
            }}
            aria-label={started ? "Mantén pulsado para hablar con V" : "Activar a V"}
            className="vvoice-orb relative h-28 w-28 cursor-pointer rounded-full active:scale-95"
            style={{
              touchAction: "none",
              transform: "scale(var(--pulse,1))",
              transition: "transform .08s linear",
            }}
          >
            <span aria-hidden className="vvoice-bg" />
            <span aria-hidden className="vvoice-ring" />
            <span aria-hidden className="vvoice-gloss" />
            <span className="relative z-10 flex h-full w-full items-center justify-center text-white">
              {started ? <IconMic size={30} /> : <span className="text-lg font-semibold tracking-wide">V</span>}
            </span>
          </button>
        </div>

        <p className="text-center text-sm font-medium text-white/70">
          {started ? statusLabel[phase] : "Toca el orbe para despertar a V"}
        </p>

        {started && (
          <button
            onClick={() => {
              audioElRef.current?.pause();
              setStarted(false);
              setPhase("idle");
              setTurns([]);
              cancelAnimationFrame(rafRef.current);
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white/80"
          >
            <IconX size={13} /> Terminar
          </button>
        )}
      </div>

      <style>{`
        .vvoice-orb{
          box-shadow:0 0 0 1px rgba(255,255,255,0.12) inset,0 14px 50px rgba(124,58,237,0.6),0 0 90px rgba(124,58,237,0.3);
        }
        .vvoice-bg{
          position:absolute;inset:0;border-radius:9999px;overflow:hidden;
          background:radial-gradient(circle at 35% 30%, #a78bfa, #7c3aed 45%, #1e1b4b 100%);
        }
        .vvoice-ring{
          position:absolute;inset:-3px;border-radius:9999px;
          background:conic-gradient(from 0deg,rgba(124,58,237,0.9),rgba(34,211,238,0.85),rgba(167,139,250,0.7),rgba(255,255,255,0.5),rgba(124,58,237,0.9));
          animation:vvoiceSpin 4s linear infinite;
          mask:radial-gradient(circle,transparent 86%,black 100%);
          -webkit-mask:radial-gradient(circle,transparent 86%,black 100%);
        }
        .vvoice-gloss{
          position:absolute;inset:6px;border-radius:9999px;
          background:radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.85) 0%, rgba(200,180,255,0.35) 25%, transparent 55%);
          mix-blend-mode:screen;
        }
        @keyframes vvoiceSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
