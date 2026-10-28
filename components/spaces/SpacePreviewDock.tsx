"use client";

import { useState } from "react";

type Device = "mobile" | "desktop";
/** Preview-only dock; reuses the same viewport dimensions as VentanaDispositivo.
 * Does not start the live engine or deploy anything. */
export function SpacePreviewDock({ projectId, previewUrl }: { projectId: string; previewUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("mobile");
  const [expanded, setExpanded] = useState(false);
  const [reload, setReload] = useState(0);
  let url: string | null = null;
  try {
    if (previewUrl) {
      const normalized = previewUrl.startsWith("https://") ? previewUrl : `https://${previewUrl}`;
      const parsed = new URL(normalized);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) url = parsed.href;
    }
  } catch { /* Unusable preview URLs are not rendered. */ }
  const dimensions = device === "mobile" ? { width: 393, height: 852 } : { width: 1440, height: 900 };
  return <section className={`space-preview-dock${expanded ? " space-preview-expanded" : ""}`} aria-label="Vista previa del proyecto">
    <div className="space-preview-bar">
      <button type="button" className="space-preview-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>▣ Vista previa {open ? "⌄" : "⌃"}</button>
      <div className="space-preview-actions">
        <button type="button" aria-pressed={device === "mobile"} onClick={() => {setDevice("mobile");setOpen(true);}}>Celular</button>
        <button type="button" aria-pressed={device === "desktop"} onClick={() => {setDevice("desktop");setOpen(true);}}>Computadora</button>
        {open && <button type="button" onClick={() => setReload(v => v + 1)} aria-label="Recargar vista previa">↻</button>}
        <button type="button" aria-label={expanded ? "Restaurar panel" : "Expandir panel"} onClick={() => {setExpanded(v => !v);setOpen(true);}}>{expanded ? "Restaurar" : "Expandir"}</button>
      </div>
    </div>
    {open && <div className="space-preview-body">
      {url ? <div className="space-preview-frame-wrap"><iframe key={`${device}-${reload}`} title={`Vista ${device} de ${projectId}`} src={url} style={{ width: dimensions.width, height: dimensions.height, maxWidth: "none" }} sandbox="allow-forms allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer" /></div>
        : <div className="space-preview-placeholder"><strong>Aún no hay una aplicación conectada</strong><p>Cuando este proyecto tenga una URL de despliegue, podrás verla aquí en celular o computadora.</p></div>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer">Abrir vista en otra ventana</a>}
    </div>}
  </section>;
}
