"use client";

import { useEffect, useRef, useState } from "react";
import { IconMic, IconStop, IconX, IconCheck, IconPlay, IconPause } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

export interface VoiceRecorderResult {
  blob: Blob;
  durationSec: number;
  mimeType: string;
  capturedAt: Date;
}

interface VoiceRecorderProps {
  onCapture: (result: VoiceRecorderResult) => void;
  onClose: () => void;
  maxDurationSec?: number;
  title?: string;
  hint?: string;
}

const DEFAULT_MAX = 60;

export function VoiceRecorder({
  onCapture,
  onClose,
  maxDurationSec = DEFAULT_MAX,
  title = "Grabar audio",
  hint = "Habla cerca del micrófono",
}: VoiceRecorderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<VoiceRecorderResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup helper
  function teardown() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  // teardown reads refs only; runs once on unmount
  useEffect(() => {
    return teardown;
  }, []);

  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error("La grabación no está disponible en este dispositivo.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MediaRecorder
      const mimeType = pickMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const durationSec = (Date.now() - startedAtRef.current) / 1000;
        const r: VoiceRecorderResult = {
          blob,
          durationSec,
          mimeType: blob.type,
          capturedAt: new Date(),
        };
        setResult(r);
        setPhase("review");
      };

      // Audio analysis for waveform
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      startedAtRef.current = Date.now();
      recorder.start(250);
      setPhase("recording");
      setElapsedMs(0);
      tick();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("Permission")
          ? "Permiso de micrófono denegado. Habilítalo desde la configuración del navegador."
          : message,
      );
    }
  }

  function pickMime(): string | null {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return null;
  }

  function tick() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, w, h);
      const bars = 32;
      const step = Math.floor(data.length / bars);
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const slice = data.slice(i * step, (i + 1) * step);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length / 255;
        const barH = Math.max(2, avg * h * 0.85);
        ctx.fillStyle = "var(--green)";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(
          i * barW + barW * 0.2,
          (h - barH) / 2,
          barW * 0.6,
          barH,
        );
      }

      // Update elapsed
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= maxDurationSec * 1000) {
        stopRecording();
        return;
      }

      if (recorderRef.current?.state === "recording") {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
  }

  function stopRecording() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleConfirm() {
    if (result) {
      onCapture(result);
      onClose();
    }
  }

  function handleRetake() {
    setResult(null);
    setPhase("idle");
    setElapsedMs(0);
    setIsPlaying(false);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }

  const remaining = Math.max(0, maxDurationSec - Math.floor(elapsedMs / 1000));
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md bg-vf-bg-1 border border-vf-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vf-border">
          <div>
            <h2 className="text-sm font-semibold text-vf-fg">{title}</h2>
            <p className="text-xs text-vf-fg-2 mt-0.5">{hint}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-md text-vf-fg-1 hover:bg-vf-bg-2"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer */}
        <div className="px-4 pt-6 pb-4 bg-vf-bg">
          <canvas
            ref={canvasRef}
            className="w-full h-24 block"
            aria-hidden
          />
          <div className="mt-3 flex items-baseline justify-between font-mono">
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                phase === "recording" ? "text-vf-error" : "text-vf-fg",
              )}
            >
              {elapsedSec}s
            </span>
            <span className="text-xs text-vf-fg-2">
              {phase === "recording"
                ? `restan ${remaining}s`
                : `máx ${maxDurationSec}s`}
            </span>
          </div>
          {phase === "recording" && (
            <div className="mt-1 flex items-center gap-2 text-xs text-vf-fg-2 font-mono">
              <span className="dot-live w-2 h-2 rounded-full" />
              GRABANDO
            </div>
          )}
        </div>

        {error && (
          <p className="px-4 py-3 text-xs text-vf-error font-mono" role="alert">
            {error}
          </p>
        )}

        {/* Review audio playback */}
        {phase === "review" && result && (
          <audio
            ref={audioRef}
            src={URL.createObjectURL(result.blob)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Controls */}
        <div className="px-4 pb-4 pt-2 flex items-center justify-center gap-3">
          {phase === "idle" && (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-vf-green text-black flex items-center justify-center voice-button"
              aria-label="Iniciar grabación"
            >
              <IconMic className="w-7 h-7" />
            </button>
          )}
          {phase === "recording" && (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-vf-error text-white flex items-center justify-center"
              aria-label="Detener grabación"
            >
              <IconStop className="w-6 h-6 fill-current" />
            </button>
          )}
          {phase === "review" && (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 h-11 rounded-md border border-vf-border bg-vf-bg-2 text-vf-fg text-sm font-medium"
              >
                Volver a grabar
              </button>
              <button
                onClick={togglePlayback}
                className="w-11 h-11 rounded-full border border-vf-border bg-vf-bg-2 text-vf-fg-1 flex items-center justify-center"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5" />}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-md bg-vf-green text-black text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <IconCheck className="w-4 h-4" />
                Usar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
