"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, Camera, Mic, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CameraCapture,
  VoiceRecorder,
  type CameraCaptureResult,
  type VoiceRecorderResult,
} from "@/components/web-apis";

export interface ComposerAttachment {
  id: string;
  kind: "image" | "file" | "audio";
  label: string;
  meta: string;
  previewUrl?: string;
  /** base64 data URL — required for images so V can actually see them */
  dataUrl?: string;
  /** image MIME type (image/jpeg | image/png | image/webp | image/gif) */
  mediaType?: string;
}

interface ComposerProps {
  onSend: (message: string, attachments?: ComposerAttachment[]) => void;
  disabled?: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

let attachmentCounter = 0;

function makeId() {
  attachmentCounter += 1;
  return `att-${Date.now()}-${attachmentCounter}`;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Listen for paste events to capture pasted images / files
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFileAttach(file);
            return;
          }
        }
      }
    }
    const composer = textareaRef.current;
    composer?.addEventListener("paste", onPaste);
    return () => composer?.removeEventListener("paste", onPaste);
  }, []);

  async function handleFileAttach(file: File) {
    const isImage = file.type.startsWith("image/");
    const dataUrl = isImage ? await readFileAsDataUrl(file) : undefined;
    const att: ComposerAttachment = {
      id: makeId(),
      kind: isImage ? "image" : "file",
      label: file.name || (isImage ? "imagen pegada" : "archivo"),
      meta: `${(file.size / 1024).toFixed(1)} KB · ${file.type || "binario"}`,
      previewUrl: isImage ? dataUrl ?? URL.createObjectURL(file) : undefined,
      dataUrl,
      mediaType: isImage ? file.type : undefined,
    };
    setAttachments((prev) => [...prev, att]);
  }

  function handleCameraCapture(r: CameraCaptureResult) {
    const mediaType = r.dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    const att: ComposerAttachment = {
      id: makeId(),
      kind: "image",
      label: `Foto ${r.width}×${r.height}`,
      meta: `${(r.blob.size / 1024).toFixed(0)} KB · cámara`,
      previewUrl: r.dataUrl,
      dataUrl: r.dataUrl,
      mediaType,
    };
    setAttachments((prev) => [...prev, att]);
  }

  async function handleVoiceCapture(r: VoiceRecorderResult) {
    setVoiceError(null);
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", r.blob, `voice.${guessExt(r.mimeType)}`);
      form.append("language", "es");
      const res = await fetch("/api/forge/transcribe", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "fail" }));
        setVoiceError(body.error || `Transcripción falló (${res.status})`);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      const trimmed = text.trim();
      if (!trimmed) {
        setVoiceError("No se detectó voz. Intenta de nuevo.");
        return;
      }
      setValue((v) => (v ? `${v} ${trimmed}` : trimmed));
      // Focus the textarea so the user can edit before sending
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVoiceError(`Error de red: ${message}`);
    } finally {
      setTranscribing(false);
    }
  }

  function guessExt(mime: string): string {
    if (mime.includes("webm")) return "webm";
    if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
    if (mime.includes("mpeg")) return "mp3";
    if (mime.includes("wav")) return "wav";
    return "webm";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  const handleSubmit = () => {
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    onSend(value.trim(), attachments.length > 0 ? attachments : undefined);
    setValue("");
    // Revoke preview URLs to free memory
    attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter always submits (works on both desktop and mobile
    // hardware keyboards). Plain Enter inserts a newline so users can
    // multi-line freely on mobile virtual keyboards. The explicit Send
    // button is the canonical submit affordance.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const iconButtonClass = cn(
    "w-10 h-10 flex items-center justify-center rounded-lg",
    "text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2",
    "transition-colors duration-150",
  );

  return (
    <div className="flex-shrink-0 border-t border-vf-border bg-vf-bg-1/95 p-3 pb-safe backdrop-blur">
      {/* Voice transcription status / error banner */}
      {(transcribing || voiceError) && (
        <div
          className={cn(
            "mb-2 px-3 py-2 rounded-md text-xs font-mono flex items-center gap-2",
            transcribing
              ? "bg-vf-bg-2 border border-vf-border-1 text-vf-fg-1"
              : "bg-vf-bg-2 border border-vf-error/40 text-vf-error",
          )}
          role="status"
        >
          {transcribing ? (
            <>
              <span className="dot-live w-2 h-2 rounded-full bg-vf-green" />
              Transcribiendo audio…
            </>
          ) : (
            <>
              <span>⚠</span>
              {voiceError}
              <button
                onClick={() => setVoiceError(null)}
                className="ml-auto text-vf-fg-2 hover:text-vf-fg"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-vf-bg-2 border border-vf-border rounded-md pr-1 pl-2 py-1"
            >
              {att.previewUrl && att.kind === "image" ? (
                <img
                  src={att.previewUrl}
                  alt=""
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <span
                  className="font-mono text-[10px] uppercase text-vf-fg-2"
                  aria-hidden
                >
                  {att.kind === "audio" ? "♪" : "📄"}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-vf-fg truncate max-w-[140px]">
                  {att.label}
                </span>
                <span className="font-mono text-[10px] text-vf-fg-2 truncate max-w-[140px]">
                  {att.meta}
                </span>
              </div>
              <button
                onClick={() => removeAttachment(att.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg"
                aria-label={`Quitar ${att.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
        {/* Icon buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={iconButtonClass}
            aria-label="Adjuntar archivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className={iconButtonClass}
            aria-label="Tomar foto"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach((f) => void handleFileAttach(f));
                e.target.value = "";
              }
            }}
            aria-hidden
          />
        </div>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Dile a V que hacer...  Ctrl/Command + Enter para enviar"
            disabled={disabled}
            rows={1}
            enterKeyHint="enter"
            className={cn(
              "w-full bg-vf-bg-2 border border-vf-border-1 rounded-md",
              "px-4 py-3 text-sm text-vf-fg placeholder:text-vf-fg-2",
              "focus:outline-none focus:border-vf-border-2",
              "resize-none transition-colors duration-150",
              "min-h-[44px] max-h-[120px]",
            )}
          />
        </div>

        {/* Voice + Send buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowVoice(true)}
            disabled={disabled || transcribing}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full",
              "bg-vf-bg-2 border border-vf-border-1 text-vf-fg-1",
              "hover:bg-vf-bg-3 hover:text-vf-fg transition-colors duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Grabar voz"
            title="Grabar audio (Whisper transcribe a texto)"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full",
              "bg-vf-green text-black",
              "hover:bg-vf-green/90 transition-colors duration-150",
              "voice-button green-glow-sm",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-vf-green",
            )}
            aria-label="Enviar mensaje"
            title="Enviar (⌘/Ctrl + Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCamera && (
        <CameraCapture
          title="Adjuntar foto"
          hint="Forge la procesará cuando llegue el backend"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showVoice && (
        <VoiceRecorder
          title="Dictar a V"
          hint="Tu voz se transcribe con Whisper y aparece en el cuadro de texto para que la edites antes de enviar"
          maxDurationSec={120}
          onCapture={handleVoiceCapture}
          onClose={() => setShowVoice(false)}
        />
      )}
    </div>
  );
}
