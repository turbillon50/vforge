"use client";
/* eslint-disable @next/next/no-img-element -- Private authenticated photos and local previews. */
import { useRef, useState, useCallback, useEffect } from "react";
export interface ChatPhoto {
  name: string;
  data?: string;
  id?: string;
}
async function compress(file: File): Promise<ChatPhoto> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20000000
  )
    throw Error("Usa JPG, PNG o WebP de hasta 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("No pude abrir la foto.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.85);
    if (data.length > 1000000) data = canvas.toDataURL("image/jpeg", 0.6);
    if (data.length > 1400000)
      throw Error("La imagen sigue siendo demasiado grande.");
    return { name: file.name.slice(0, 180), data };
  } finally {
    bitmap.close();
  }
}
export function PhotoList({ photos }: { photos: ChatPhoto[] }) {
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {photos.map((p, i) => (
        <a
          key={p.id || i}
          href={p.id ? `/api/v/canonical/images/${p.id}` : p.data}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={p.id ? `/api/v/canonical/images/${p.id}` : p.data}
            alt={p.name || `Foto ${i + 1}`}
            className="max-h-48 max-w-full rounded-lg border object-contain"
          />
        </a>
      ))}
    </div>
  );
}
export function PhotoAttachments({
  photos,
  onChange,
  onBusy,
  disabled,
}: {
  photos: ChatPhoto[];
  onChange: (p: ChatPhoto[]) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const addFiles = useCallback(async (files: File[]) => {
    if (disabled || !files.length) return;
          setError("");
          if (files.length + photos.length > 3) {
            setError("Puedes adjuntar hasta 3 fotos por mensaje.");
            return;
          }
          setBusy(true);
          onBusy(true);
          try {
            const prepared = [
              ...photos,
              ...(await Promise.all(files.map(compress))),
            ];
            onChange([...new Map(prepared.map((p) => [p.data, p])).values()]);
          } catch (e) {
            setError(e instanceof Error ? e.message : "No pude abrir la foto.");
          } finally {
            setBusy(false);
            onBusy(false);
          }
  }, [disabled, photos, onChange, onBusy]);
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (disabled) return;
      const files = Array.from(event.clipboardData?.items || [])
        .filter(item => item.kind === "file" && item.type.startsWith("image/"))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (!files.length) return;
      event.preventDefault();
      void addFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles, disabled]);
  return (
    <div className="mt-2 shrink-0">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label="Seleccionar fotos"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          void addFiles(files);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy || photos.length >= 3}
        onClick={() => input.current?.click()}
        className="rounded-xl border border-black/20 bg-white px-3 py-2 text-sm text-black disabled:opacity-50"
      >
        {busy ? "Preparando fotos…" : "＋ Adjuntar fotos"}
      </button>
      <span className="ml-2 text-xs text-black/60">
        Pega con Ctrl+V o adjunta · hasta 3 fotos
      </span>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img
                src={p.data}
                alt={p.name}
                className="h-24 w-24 rounded-lg border object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                aria-label={`Quitar ${p.name}`}
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute right-0 top-0 h-7 w-7 rounded-full bg-black text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
