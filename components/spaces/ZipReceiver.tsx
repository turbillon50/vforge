"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

type ZipEntry = { name: string; size: number; compressed: number };
export type ZipManifest = {
  filename: string;
  sha256: string;
  entries: ZipEntry[];
  totalBytes: number;
  checkedAt: string;
  blobUrl?: string;
  blobPathname?: string;
  assetId?: string;
  note?: string;
};

const MAX = 200_000_000;

export function ZipReceiver({ onManifest, projectId }: { onManifest: (m: ZipManifest) => void; projectId: string }) {
  const [error, setError] = useState("");
  const [files, setFiles] = useState<ZipEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<string | null>(null);

  async function inspect(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setFiles([]); setStored(null);
    try {
      if (file.size > MAX) throw Error("Pasa de 200 MB. En el celular no cabe por aquí.");
      const heavy = file.size > 20_000_000;
      let sha256 = "";
      let entries: ZipEntry[] = [];
      let total = file.size;
      if (!heavy) {
        const b = await file.arrayBuffer();
        const d = new DataView(b);
        const bytes = new Uint8Array(b);
        if (d.byteLength < 22 || d.getUint32(0, true) !== 0x04034b50) throw Error("No es un ZIP válido.");
        let end = -1;
        for (let i = b.byteLength - 22; i >= Math.max(0, b.byteLength - 65557); i--) {
          if (d.getUint32(i, true) === 0x06054b50) { end = i; break; }
        }
        if (end < 0) throw Error("Directorio ZIP no encontrado.");
        const count = d.getUint16(end + 10, true);
        const start = d.getUint32(end + 16, true);
        const size = d.getUint32(end + 12, true);
        if (count > 500 || start + size > b.byteLength || count === 65535) throw Error("ZIP demasiado grande para inventariar aquí.");
        let at = start; total = 0;
        for (let i = 0; i < count; i++) {
          if (at + 46 > b.byteLength || d.getUint32(at, true) !== 0x02014b50) throw Error("Directorio ZIP corrupto.");
          const compressed = d.getUint32(at + 20, true);
          const length = d.getUint32(at + 24, true);
          const n = d.getUint16(at + 28, true);
          const extra = d.getUint16(at + 30, true);
          const comment = d.getUint16(at + 32, true);
          const name = new TextDecoder().decode(bytes.slice(at + 46, at + 46 + n));
          if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) throw Error("Ruta peligrosa en ZIP.");
          total += length;
          if (!name.endsWith("/")) entries.push({ name, size: length, compressed });
          at += 46 + n + extra + comment;
        }
        const digest = await crypto.subtle.digest("SHA-256", b);
        sha256 = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join("");
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const blob = await upload(`spaces/${projectId}/zips/${Date.now()}-${safe}`, file, {
        access: "public",
        handleUploadUrl: `/api/projects/${encodeURIComponent(projectId)}/space/zip`,
        contentType: "application/zip",
        multipart: file.size > 4_000_000,
      });
      setFiles(entries);
      setStored(blob.url);
      onManifest({
        filename: file.name,
        sha256,
        entries,
        totalBytes: total,
        checkedAt: new Date().toISOString(),
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        assetId: blob.pathname,
        note: heavy ? "Archivo grande: se guardó el ZIP y el inventario queda pendiente." : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el ZIP");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zip-receiver">
      <strong>01 · Entrada de ZIP</strong>
      <p>Súbelo desde el celular. El archivo se guarda solo. Hasta 200 MB.</p>
      <label className="zip-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void inspect(e.dataTransfer.files[0]); }}>
        Seleccionar o arrastrar ZIP
        <input type="file" accept=".zip,application/zip" onChange={e => void inspect(e.target.files?.[0])} />
      </label>
      {busy && <p>Subiendo desde el celular… no cierres esta pantalla.</p>}
      {error && <p role="alert">{error}</p>}
      {stored && <p>Listo. Quedó guardado.</p>}
      {files.length > 0 && (
        <div>
          <p>{files.length} archivos identificados</p>
          <ul>{files.slice(0, 30).map((f, i) => <li key={i}>{f.name} · {f.size} B</li>)}</ul>
        </div>
      )}
    </div>
  );
}
