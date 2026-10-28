"use client";

import { useState } from "react";
import { VentanaDispositivo } from "@/components/live/VentanaDispositivo";
import type { SpaceModule } from "@/lib/spaces/model";

type Device = "mobile" | "desktop";

const STATUS: Record<string, string> = {
  pending: "Pendiente",
  working: "Trabajando",
  blocked: "Bloqueado",
  review: "En revisión",
  done: "Completado",
};

function LienzoEnMarco({ modules, device }: { modules: SpaceModule[]; device: Device }) {
  const desk = device === "desktop";
  return (
    <div className={desk ? "space-frame space-frame-desk" : "space-frame space-frame-phone"}>
      <div className="space-frame-bar">{desk ? "Escritorio" : "Celular"}</div>
      <div className="space-frame-screen">
        {modules.length === 0 ? <p>El lienzo está vacío.</p> : modules.map((m) => (
          <article key={m.id}>
            <strong>{m.title}</strong>
            <span>{STATUS[m.status] || m.status}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function SpacePreviewDock({ projectId, previewUrl, previewRepo, modules }: { projectId: string; previewUrl: string | null; previewRepo: string | null; modules: SpaceModule[] }) {
  const [open, setOpen] = useState(true);
  const [device, setDevice] = useState<Device>("desktop");
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
      {canRun ? <div className="space-preview-live"><VentanaDispositivo key={device} projectId={previewRepo!.split("/").pop() || projectId} nombre={projectId} urlRespaldo={{movil:url,escritorio:url}} dispositivoInicial={device === "mobile" ? "iphone" : "escritorio"} rutaInicial="/" /></div> : <LienzoEnMarco modules={modules} device={device} />}
    </div>}
  </section>;
}
