"use client";

import { useState } from "react";
import { VentanaDispositivo } from "@/components/live/VentanaDispositivo";
import type { Space } from "@/lib/spaces/model";
import { buildSpacePreview } from "@/lib/spaces/preview-html";

type Device = "mobile" | "desktop";
/** Mounts the existing VForge live device engine when the dock opens. */
export function SpacePreviewDock({ projectId, previewUrl, previewRepo, space, projectName }: { projectId: string; previewUrl: string | null; previewRepo: string | null; space: Space; projectName: string }) {
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
  const canRun = Boolean(previewRepo?.trim());
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
      {canRun ? <div className="space-preview-live"><VentanaDispositivo key={device} projectId={previewRepo!.split("/").pop() || projectId} nombre={projectId} urlRespaldo={{movil:url,escritorio:url}} dispositivoInicial={device === "mobile" ? "iphone" : "escritorio"} rutaInicial="/" /></div> : url ? <div className="space-preview-placeholder"><strong>Vista del último despliegue</strong><p>Este Space no tiene repositorio conectado al motor vivo. Abre la aplicación publicada mientras configuramos su proyecto ejecutable.</p><a href={url} target="_blank" rel="noopener noreferrer">Abrir aplicación</a></div> : <div className={`space-progressive-device ${device === "mobile" ? "space-progressive-mobile" : "space-progressive-desktop"}`}><div className="space-progressive-label">Vista HTML provisional · {device === "mobile" ? "393 × 852" : "1440 × 900"}</div><iframe title={`Prototipo HTML de ${projectName}`} sandbox="" srcDoc={buildSpacePreview(projectName, space)} /></div>}

    </div>}
  </section>;
}
