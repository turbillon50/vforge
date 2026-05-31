"use client";

import { useEffect, useRef, useState } from "react";
import { Clipboard, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasteTextResult {
  text: string;
  capturedAt: Date;
}

interface PasteTextProps {
  onAccept: (result: PasteTextResult) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  placeholder?: string;
  /** Validate the value before allowing accept (return error message or null) */
  validate?: (value: string) => string | null;
  /** Pre-fill from clipboard on mount if permission granted */
  autoPasteOnOpen?: boolean;
}

export function PasteText({
  onAccept,
  onClose,
  title = "Pegar texto",
  hint = "Pega el contenido aquí",
  placeholder = "Pega o escribe…",
  validate,
  autoPasteOnOpen = true,
}: PasteTextProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    if (!autoPasteOnOpen) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      navigator.clipboard
        .readText()
        .then((text) => {
          if (text && !value) setValue(text);
        })
        .catch(() => {
          // Permission likely denied or focus issue. User can paste manually.
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClipboard() {
    if (!navigator.clipboard?.readText) {
      setError("Tu navegador no soporta lectura del portapapeles. Pega manualmente.");
      return;
    }
    setError(null);
    navigator.clipboard
      .readText()
      .then((text) => {
        setValue(text);
      })
      .catch(() => {
        setError("Permiso del portapapeles denegado. Pega manualmente con ⌘/Ctrl + V.");
      });
  }

  function handleAccept() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("El campo está vacío.");
      return;
    }
    if (validate) {
      const v = validate(trimmed);
      if (v) {
        setError(v);
        return;
      }
    }
    onAccept({ text: trimmed, capturedAt: new Date() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md bg-vf-bg-1 border border-vf-border rounded-xl overflow-hidden">
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

        <div className="p-4 space-y-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            rows={6}
            className={cn(
              "w-full bg-vf-bg-2 border border-vf-border-1 rounded-md",
              "px-3 py-3 text-sm text-vf-fg font-mono placeholder:text-vf-fg-2",
              "focus:outline-none focus:border-vf-border-2",
              "resize-none",
            )}
          />

          {error && (
            <p className="text-xs text-vf-error font-mono" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClipboard}
              className="flex-1 h-11 rounded-md border border-vf-border bg-vf-bg-2 text-vf-fg text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Clipboard className="w-4 h-4" />
              Del portapapeles
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 h-11 rounded-md bg-vf-green text-black text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
