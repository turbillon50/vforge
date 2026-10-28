"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

export type ZipManifest = {
  filename: string;
  sha256: string;
  entries: { name: string; size: number; compressed: number }[];
  totalBytes: number;
  checkedAt: string;
  blobUrl?: string;
  blobPathname?: string;
  assetId?: string;
  note?: string;
};

export function ZipReceiver({ onManifest, projectId }: { onManifest: (m: ZipManifest) => void; projectId: string }) {
  const [picked, setPicked] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<string | null>(null);

  function take(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setPicked(file);
    setError("");
    setStored(null);
  }

  async function send() {
    if (!picked) return;
    setBusy(true); setError("");
    try {
      if (picked.size > 200_000_000) throw Error("Pasa de 200 MB.");
      if (!picked.name.toLowerCase().endsWith(".zip")) throw Error("Tiene que ser un archivo .zip");
      const safe = picked.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const blob = await upload(`spaces/${projectId}/zips/${Date.now()}-${safe}`, picked, {
        access: "public",
        handleUploadUrl: `/api/projects/${encodeURIComponent(projectId)}/space/zip`,
        contentType: "application/zip",
        multipart: picked.size > 4_000_000,
      });
      setStored(blob.url);
      onManifest({
        filename: picked.name,
        sha256: "",
        entries: [],
        totalBytes: picked.size,
        checkedAt: new Date().toISOString(),
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        assetId: blob.pathname,
        note: "Subido desde el celular. El inventario se hace después, no en el teléfono.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir");
    } finally {
      setBusy(false);
    }
  }

  const mb = picked ? `${(picked.size / 1048576).toFixed(1)} MB` : "";

  return (
    <div className="zip-receiver">
      <strong>01 · Entrada de ZIP</strong>
      <p>En el celular, elegir el archivo solo lo marca. Después toca subir.</p>
      <label className="zip-drop">
        Elegir ZIP
        <input type="file" accept="application/zip,.zip" onChange={e => take(e.target.files)} />
      </label>
      {picked && <p className="zip-picked">{picked.name} · {mb}</p>}
      <button type="button" className="zip-send" disabled={!picked || busy} onClick={() => void send()}>
        {busy ? "Subiendo… no cierres esta pantalla" : "Subir este ZIP"}
      </button>
      {error && <p className="zip-error" role="alert">{error}</p>}
      {stored && <p className="zip-ok">Listo. Quedó guardado.</p>}
    </div>
  );
}
