"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { IconUpload, IconFile, IconX, IconCheck } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

export interface FileDropResult {
  file: File;
  text?: string;
  capturedAt: Date;
}

interface FileDropZoneProps {
  onAccept: (result: FileDropResult) => void;
  onClose?: () => void;
  /** Acept attribute for the picker (e.g. ".env,text/plain,image/*") */
  accept?: string;
  /** If true, also read the file as text and include it in the result */
  readAsText?: boolean;
  maxSizeBytes?: number;
  title?: string;
  hint?: string;
  /** Render inline (no modal chrome) */
  inline?: boolean;
}

const DEFAULT_MAX = 5 * 1024 * 1024; // 5 MB

export function FileDropZone({
  onAccept,
  onClose,
  accept,
  readAsText = false,
  maxSizeBytes = DEFAULT_MAX,
  title = "Subir archivo",
  hint = "Arrastra, pega o selecciona",
  inline = false,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<FileDropResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for paste events globally while mounted
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (accepted) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFile(file);
            return;
          }
        }
      }
      // Fallback: pasted text → wrap in a synthetic .txt File
      const text = e.clipboardData?.getData("text/plain");
      if (text && readAsText) {
        e.preventDefault();
        const file = new File([text], "pasted.txt", { type: "text/plain" });
        void handleFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted, readAsText]);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > maxSizeBytes) {
      setError(
        `Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${(
          maxSizeBytes /
          1024 /
          1024
        ).toFixed(0)} MB.`,
      );
      return;
    }
    let text: string | undefined;
    if (readAsText) {
      try {
        text = await file.text();
      } catch {
        text = undefined;
      }
    }
    setAccepted({ file, text, capturedAt: new Date() });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function handleConfirm() {
    if (accepted) {
      onAccept(accepted);
      onClose?.();
    }
  }

  const card = (
    <div
      className={cn(
        "w-full bg-vf-bg-1 border border-vf-border rounded-xl overflow-hidden",
        !inline && "max-w-md",
      )}
    >
      {/* Header */}
      {!inline && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-vf-border">
          <div>
            <h2 className="text-sm font-semibold text-vf-fg">{title}</h2>
            <p className="text-xs text-vf-fg-2 mt-0.5">{hint}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 flex items-center justify-center rounded-md text-vf-fg-1 hover:bg-vf-bg-2"
            >
              <IconX className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div className="p-4">
        {!accepted ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center text-center",
              "rounded-lg border-2 border-dashed cursor-pointer",
              "px-6 py-10 transition-colors duration-150",
              dragOver
                ? "border-vf-green bg-vf-green-soft"
                : "border-vf-border-1 bg-vf-bg-2 hover:border-vf-border-2",
            )}
            aria-label={`${title}. ${hint}`}
          >
            <IconUpload className="w-8 h-8 text-vf-green-quiet mb-3" />
            <p className="text-sm font-medium text-vf-fg">{hint}</p>
            <p className="text-xs text-vf-fg-2 mt-1 font-mono">
              Drag · Drop · Paste · Pick
            </p>
          </div>
        ) : (
          <div className="bg-vf-bg-2 border border-vf-border rounded-lg p-4 flex items-start gap-3">
            <IconFile className="w-5 h-5 text-vf-green flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-vf-fg truncate">
                {accepted.file.name || "Archivo pegado"}
              </p>
              <p className="text-xs text-vf-fg-2 mt-0.5 font-mono">
                {(accepted.file.size / 1024).toFixed(1)} KB ·{" "}
                {accepted.file.type || "binario"}
              </p>
              {accepted.text && (
                <pre className="mt-3 text-[11px] font-mono text-vf-fg-1 max-h-24 overflow-auto whitespace-pre-wrap break-all bg-vf-bg rounded p-2 border border-vf-border">
                  {accepted.text.slice(0, 500)}
                  {accepted.text.length > 500 && "\n…"}
                </pre>
              )}
            </div>
            <button
              onClick={() => setAccepted(null)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-vf-fg-1 hover:bg-vf-bg"
              aria-label="Quitar archivo"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-vf-error font-mono" role="alert">
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handlePickerChange}
          className="sr-only"
          aria-hidden
        />
      </div>

      {/* Confirm */}
      {!inline && accepted && (
        <div className="px-4 pb-4">
          <button
            onClick={handleConfirm}
            className="w-full h-11 rounded-md bg-vf-green text-black text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <IconCheck className="w-4 h-4" />
            Usar archivo
          </button>
        </div>
      )}
    </div>
  );

  if (inline) return card;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {card}
    </div>
  );
}
