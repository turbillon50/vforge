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

const FLOW = ["Registro", "Diagnóstico", "Tómbola", "Agenda", "Invitado", "Tablero", "Expediente", "Academia"];
const SCREENS = ["La app: del archivo original al último", "Los audios siguen en el ZIP"];

function LienzoEnMarco({ modules, device }: { modules: SpaceModule[]; device: Device }) {
  const desk = device === "desktop";
  const drawn = modules.some(m => m.id === "mod_roles_funcionamiento" && m.result.trim());
  return (
    <div className={desk ? "space-frame space-frame-desk" : "space-frame space-frame-phone"}>
      <div className="space-frame-bar">{desk ? "Escritorio" : "Celular"}</div>
      <div className="space-frame-screen">
        {drawn ? (
          <>
            <p className="space-draw-kicker">La app</p>
            <div className={desk ? "space-draw-flow" : "space-draw-flow space-draw-flow-stack"}>
              {FLOW.map((step, i) => (
                <span key={step}>{i > 0 && <i />}{step}</span>
              ))}
            </div>
            <p className="space-draw-kicker">Pantallas</p>
            {SCREENS.map(s => <article key={s}><strong>{s}</strong></article>)}
          </>
        ) : modules.length === 0 ? <p>El lienzo está vacío.</p> : modules.map((m) => (
          <article key={m.id}>
            <strong>{m.title}</strong>
            <span>{STATUS[m.status] || m.status}</span>
          </article>
        ))}
      </div>
    </div>
  );
}


const VEDIKA_PREVIEWS = [
  { label: "Védika A · Taller", url: "https://vedika-7634-54mdp6kpo-luisdelator-oss-projects.vercel.app/experimento", note: "Nueva pantalla experimental" },
  { label: "Védika B · Base", url: "https://vedika-7634-jb4d0ipk2-luisdelator-oss-projects.vercel.app", note: "Versión original; alternativa B pendiente" },
] as const;

function VedikaComparison({ device }: { device: Device }) {
  const mobile = device === "mobile";
  return <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", gap: 12, padding: 12, overflowX: "auto" }}>
    {VEDIKA_PREVIEWS.map((item) => <section key={item.label} style={{ minWidth: mobile ? 220 : 280, border: "1px solid #d9dce1", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div><strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong><small style={{ color: "#64748b" }}>{item.note}</small></div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, textDecoration: "underline" }}>Abrir ↗</a>
      </div>
      <div style={{ height: mobile ? 600 : 580, overflow: "auto", background: "#eeece7", display: "flex", justifyContent: "center", padding: 8 }}>
        <iframe key={device + item.label} title={item.label} src={item.url} loading="lazy" style={{ width: mobile ? 390 : "100%", minWidth: mobile ? 390 : 0, height: mobile ? 844 : 900, border: "1px solid #aaa", borderRadius: mobile ? 22 : 8, background: "#fff", transform: mobile ? "scale(.55)" : "none", transformOrigin: "top center", flexShrink: 0, marginBottom: mobile ? -380 : 0 }} />
      </div>
    </section>)}
  </div>;
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
      {projectId === "vedika77" ? <VedikaComparison device={device} /> : canRun ? <div className="space-preview-live"><VentanaDispositivo key={device} projectId={previewRepo!.split("/").pop() || projectId} nombre={projectId} urlRespaldo={{movil:url,escritorio:url}} dispositivoInicial={device === "mobile" ? "iphone" : "escritorio"} rutaInicial="/" /></div> : <LienzoEnMarco modules={modules} device={device} />}
    </div>}
  </section>;
}
