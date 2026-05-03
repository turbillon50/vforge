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

interface ComposerAttachment {
  id: string;
  kind: "image" | "file" | "audio";
  label: string;
  meta: string;
  previewUrl?: string;
}

interface ComposerProps {
  onSend: (message: string, attachments?: ComposerAttachment[]) => void;
  disabled?: boolean;
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
            handleFileAttach(file);
            return;
          }
        }
      }
    }
    const composer = textareaRef.current;
    composer?.addEventListener("paste", onPaste);
    return () => composer?.removeEventListener("paste", onPaste);
  }, []);

  function handleFileAttach(file: File) {
    const isImage = file.type.startsWith("image/");
    const att: ComposerAttachment = {
      id: makeId(),
      kind: isImage ? "image" : "file",
      label: file.name || (isImage ? "imagen pegada" : "archivo"),
      meta: `${(file.size / 1024).toFixed(1)} KB · ${file.type || "binario"}`,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    };
    setAttachments((prev) => [...prev, att]);
  }

  function handleCameraCapture(r: CameraCaptureResult) {
    const att: ComposerAttachment = {
      id: makeId(),
      kind: "image",
      label: `Foto ${r.width}×${r.height}`,
      meta: `${(r.blob.size / 1024).toFixed(0)} KB · cámara`,
      previewUrl: r.dataUrl,
    };
    setAttachments((prev) => [...prev, att]);
  }

  function handleVoiceCapture(r: VoiceRecorderResult) {
    const att: ComposerAttachment = {
      id: makeId(),
      kind: "audio",
      label: `Audio ${r.durationSec.toFixed(1)}s`,
      meta: r.mimeType.split(";")[0],
    };
    setAttachments((prev) => [...prev, att]);
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
    <div className="sticky bottom-0 bg-vf-bg-1 border-t border-vf-border p-3 pb-safe">
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

      <div className="flex items-end gap-2">
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
                Array.from(files).forEach(handleFileAttach);
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
            placeholder="Dile a V qué hacer…  ·  ⌘/Ctrl + Enter para enviar"
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
            disabled={disabled}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full",
              "bg-vf-bg-2 border border-vf-border-1 text-vf-fg-1",
              "hover:bg-vf-bg-3 hover:text-vf-fg transition-colors duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Grabar voz"
            title="Grabar audio"
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
          title="Dictar a Forge"
          hint="Tu mensaje en audio se adjunta como archivo"
          maxDurationSec={120}
          onCapture={handleVoiceCapture}
          onClose={() => setShowVoice(false)}
        />
      )}
    </div>
  );
}
