"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X, Check, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FacingMode = "user" | "environment";

export interface CameraCaptureResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: Date;
}

interface CameraCaptureProps {
  onCapture: (result: CameraCaptureResult) => void;
  onClose: () => void;
  preferredFacing?: FacingMode;
  title?: string;
  hint?: string;
}

export function CameraCapture({
  onCapture,
  onClose,
  preferredFacing = "environment",
  title = "Capturar foto",
  hint = "Encuadra y captura",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facing, setFacing] = useState<FacingMode>(preferredFacing);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<CameraCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  // Open the media stream
  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    async function openCamera() {
      setStarting(true);
      setError(null);
      try {
        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error("La API de cámara no está disponible en este dispositivo.");
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(
          message.includes("Permission")
            ? "Permiso de cámara denegado. Habilítalo desde la configuración del navegador."
            : message,
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    openCamera();

    return () => {
      cancelled = true;
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  // Cleanup on close
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setPreview({
          blob,
          dataUrl,
          width: w,
          height: h,
          capturedAt: new Date(),
        });
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleConfirm() {
    if (preview) {
      onCapture(preview);
      onClose();
    }
  }

  function handleRetake() {
    setPreview(null);
  }

  function handleSwitchCamera() {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }

  function handleFallbackPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        setPreview({
          blob: file,
          dataUrl,
          width: img.width,
          height: img.height,
          capturedAt: new Date(),
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md bg-vf-bg-1 border border-vf-border rounded-xl overflow-hidden flex flex-col">
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[3/4] sm:aspect-square overflow-hidden">
          {!preview && (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "w-full h-full object-cover",
                facing === "user" && "scale-x-[-1]",
              )}
            />
          )}
          {preview && (
            <img
              src={preview.dataUrl}
              alt="captura"
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" aria-hidden />

          {/* Loading / error overlay */}
          {!preview && (starting || error) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6">
              {error ? (
                <div className="space-y-3 text-center">
                  <p className="text-vf-error text-sm font-medium">{error}</p>
                  <p className="text-vf-fg-1 text-xs">
                    Puedes elegir una imagen del rollo.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-vf-green text-black text-sm font-medium"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Elegir del rollo
                  </button>
                </div>
              ) : (
                <p className="text-vf-fg-2 font-mono text-xs">Iniciando cámara…</p>
              )}
            </div>
          )}
        </div>

        {/* Hidden file input fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture={facing}
          onChange={handleFallbackPick}
          className="sr-only"
          aria-hidden
        />

        {/* Controls */}
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          {!preview ? (
            <>
              <button
                onClick={handleSwitchCamera}
                className="w-11 h-11 rounded-full border border-vf-border bg-vf-bg-2 text-vf-fg-1 flex items-center justify-center"
                aria-label="Cambiar cámara"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleCapture}
                disabled={!stream || !!error}
                className={cn(
                  "w-16 h-16 rounded-full bg-vf-green text-black",
                  "flex items-center justify-center voice-button",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
                aria-label="Capturar"
              >
                <Camera className="w-7 h-7" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-full border border-vf-border bg-vf-bg-2 text-vf-fg-1 flex items-center justify-center"
                aria-label="Elegir archivo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 h-11 rounded-md border border-vf-border bg-vf-bg-2 text-vf-fg text-sm font-medium"
              >
                Volver a tomar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-md bg-vf-green text-black text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Usar foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
