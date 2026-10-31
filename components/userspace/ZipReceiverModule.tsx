"use client";

import { useRef, useState } from "react";
import { unzipSync } from "fflate";

type Entry = { path: string; bytes: number; type: string };
type Manifest = { moduleId: string; filename: string; sha256: string; bytes: number; entries: Entry[]; createdAt: string };
const MAX_ZIP = 15 * 1024 * 1024;
const MAX_ENTRIES = 300;
const MAX_TOTAL = 60 * 1024 * 1024;
const typeOf = (s: string) => /\.(png|jpe?g|webp)$/i.test(s) ? "imagen" : /\.(mp3|m4a|wav|ogg)$/i.test(s) ? "audio" : /\.pdf$/i.test(s) ? "pdf" : /\.(txt|md|csv|json)$/i.test(s) ? "texto" : "otro";

/** Prototype of the reusable machihembrado ZIP module. No network calls or uploads. */
export function ZipReceiverModule() {
  const picker = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"esperando" | "validando" | "listo" | "error">("esperando");
  const [error, setError] = useState("");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function receive(file?: File) {
    if (!file) return;
    setState("validando"); setError(""); setManifest(null);
    try {
      if (file.size > MAX_ZIP) throw new Error("ZIP demasiado grande para el prototipo (máximo 15 MB).");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && [3,5,7].includes(bytes[2]))) throw new Error("El archivo no tiene firma ZIP válida.");
      const files = unzipSync(bytes, { filter: (entry) => {
        if (entry.originalSize > MAX_TOTAL) throw new Error("Entrada ZIP demasiado grande.");
        return true;
      }});
      const entries = Object.entries(files).filter(([path]) => !path.endsWith("/"));
      if (entries.length > MAX_ENTRIES) throw new Error("Demasiados archivos en el ZIP.");
      let total = 0;
      const inventory = entries.map(([path, content]) => {
        if (path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.split(/[\\/]/).includes("..") || path.includes("\\")) throw new Error("Ruta peligrosa detectada.");
        total += content.byteLength;
        if (total > MAX_TOTAL) throw new Error("Contenido expandido supera 60 MB.");
        return { path, bytes: content.byteLength, type: typeOf(path) };
      });
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      setManifest({ moduleId: "receptor_zip_v1", filename: file.name, sha256, bytes: file.size, entries: inventory, createdAt: new Date().toISOString() });
      setState("listo");
    } catch (e) { setState("error"); setError(e instanceof Error ? e.message : "No se pudo leer el ZIP"); }
  }
  function exportManifest() {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "receptor-zip-manifiesto.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Módulo Receptor ZIP" className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
    <div className="text-xs font-semibold tracking-[.2em] text-slate-500">VEDIKA2 · MÓDULO 001</div>
    <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-[9px] border-sky-200 bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-950 shadow-[0_16px_50px_rgba(30,80,200,.28)]">
      <span aria-hidden="true" className="absolute -left-4 top-[70px] h-7 w-7 rounded-full border-4 border-white bg-sky-500 shadow-md" />
      <span aria-hidden="true" className="absolute -right-4 top-[70px] h-7 w-7 rounded-full border-4 border-white bg-indigo-500 shadow-md" />
      <button type="button" onClick={() => picker.current?.click()} className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" aria-label="Seleccionar archivo ZIP">
        <span className="text-4xl" aria-hidden="true">⇧</span><span className="text-sm font-bold">RECEPTOR ZIP</span><span className="text-[11px] opacity-80">{state}</span>
      </button>
    </div>
    <input ref={picker} type="file" accept=".zip,application/zip" className="sr-only" onChange={e => void receive(e.target.files?.[0])} />
    <div onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); void receive(e.dataTransfer.files[0]);}} className="w-full rounded-xl border-2 border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">Arrastra un ZIP aquí o pulsa el módulo circular.</div>
    {state === "error" && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {manifest && <div className="w-full space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
      <div className="flex items-center justify-between gap-2"><strong className="break-all">{manifest.filename}</strong><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">Validado</span></div>
      <p>{manifest.entries.length} archivos · {(manifest.bytes/1024).toFixed(1)} KB</p>
      <p className="break-all font-mono text-[11px] text-slate-500">SHA-256: {manifest.sha256}</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-white" onClick={() => setExpanded(v => !v)}>{expanded ? "Ocultar inventario" : "Ver inventario"}</button><button type="button" className="rounded-lg border border-slate-300 px-3 py-2" onClick={exportManifest}>Exportar manifiesto</button></div>
      {expanded && <ul className="max-h-48 space-y-1 overflow-auto">{manifest.entries.map((f,i) => <li key={i} className="break-all border-b py-1">{f.path} · {f.type} · {f.bytes} B</li>)}</ul>}
    </div>}
    <p className="text-center text-xs text-slate-500">Prototipo local: no envía archivos al servidor ni los registra todavía en el expediente.</p>
  </section>;
}
