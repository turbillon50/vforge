"use client";

import { useState } from "react";
import { VentanaDispositivo } from "@/components/live/VentanaDispositivo";

type Device = "mobile" | "desktop";
/** Mounts the existing VForge live device engine when the dock opens. */
export function SpacePreviewDock({ projectId, previewUrl }: { projectId: string; previewUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("mobile");
  const [expanded, setExpanded] = useState(false);

  let url: string | null = null;
  try {
    if (previewUrl) {
      const normalized = previewUrl.startsWith("https://") ? previewUrl : `https://${previewUrl}`;
      const parsed = new URL(normalized);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) url = parsed.href;
    }
  } catch { /* Unusable preview URLs are not rendered. */ }
  return <section className={`space-preview-dock${expanded ? " space-preview-expanded" : ""}`} aria-label="Vista previa del proyecto">
    <div className="space-preview-bar">
      <button type="button" className="space-preview-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>▣ Vista previa {open ? "⌄" : "⌃"}</button>
      <div className="space-preview-actions">
        <button type="button" aria-pressed={device === "mobile"} onClick={() => {setDevice("mobile");setOpen(true);}}>Celular</button>
        <button type="button" aria-pressed={device === "desktop"} onClick={() => {setDevice("desktop");setOpen(true);}}>Computadora</button>
        <button type="button" aria-label={expanded ? "Restaurar panel" : "Expandir panel"} onClick={() => {setExpanded(v => !v);setOpen(true);}}>{expanded ? "Restaurar" : "Expandir"}</button>
      </div>
    </div>
    {open && <div className="space-preview-body">
      <div className="space-preview-live"><VentanaDispositivo key={device} projectId={projectId} nombre={projectId} urlRespaldo={{movil:url,escritorio:url}} dispositivoInicial={device === "mobile" ? "iphone" : "escritorio"} rutaInicial="/" /></div>

    </div>}
  </section>;
}
