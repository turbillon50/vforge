"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EMPTY_SPACE, KINDS, STATUSES, spaceSchema, type Space, type SpaceModule } from "@/lib/spaces/model";
import "./spaces.css";
import { SpacePreviewDock } from "./SpacePreviewDock";
import { ZipReceiver } from "./ZipReceiver";

export function SpaceEditor({ projectId }: { projectId: string }) {
  const [space, setSpace] = useState<Space>(EMPTY_SPACE);
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState(projectId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRepo, setPreviewRepo] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "canvas">("canvas");
  const [zoom, setZoom] = useState(1);
  const [filesOpen, setFilesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const drag = useRef<{ id: string; x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null);
  const base = `/app/projects/${encodeURIComponent(projectId)}`;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [a, b] = await Promise.all([fetch(`/api/projects/${encodeURIComponent(projectId)}/space`, { cache: "no-store" }), fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" })]);
        const data = await a.json(); const project = await b.json();
        if (!a.ok || !b.ok) throw new Error(data.error || project.error || "No se pudo abrir el proyecto");
        if (active) { setSpace(data.document); setRevision(data.revision); setName(project.project.name); setPreviewUrl(project.project.domain || project.project.vercel_url || null); setPreviewRepo(project.project.github_repo || null); setLoaded(true); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Error de conexión"); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [projectId]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    const guard = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener("click", guard, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guard, true); };
  }, [dirty]);
  function edit(next: Space) { setSpace(next); setDirty(true); setSaved(""); }
  function update(id: string, patch: Partial<SpaceModule>) {
    setSpace(current => ({ ...current, modules: current.modules.map(m => m.id === id ? { ...m, ...patch } : m) })); setDirty(true); setSaved("");
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/space`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: space, revision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se guardó");
      setRevision(result.revision); setDirty(false); setSaved("Guardado en el proyecto");
    } catch (e) { setError(e instanceof Error ? e.message : "No se guardó"); }
    finally { setBusy(false); }
  }
  function add(kind: SpaceModule["kind"]) {
    const id = crypto.randomUUID(); const index = space.modules.length;
    edit({ ...space, modules: [...space.modules, { id, kind, title: KINDS[kind], status: "pending", responsible: "", prompt: "", result: "", evidence: "", dependsOn: [], x: 32 + (index % 3) * 280, y: 32 + Math.floor(index / 3) * 180 }] }); setSelected(id);
  }
  function connect(sourceId: string, targetId: string) {
    setLinkSource(null);
    if (sourceId === targetId) { setError("Un módulo no puede conectarse consigo mismo."); return; }
    const target = space.modules.find(m => m.id === targetId);
    if (!target || target.dependsOn.includes(sourceId)) return;
    const next = { ...space, modules: space.modules.map(m => m.id === targetId ? { ...m, dependsOn: [...m.dependsOn, sourceId] } : m) };
    // Reuse the existing schema: rejects circular links and invalid dependencies.
    if (!spaceSchema.safeParse(next).success) { setError("Conexión inválida: produciría un ciclo o incumpliría una dependencia."); return; }
    setError(""); void persist(next);
  }
  async function persist(next: Space) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/space`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: next, revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se guardó la conexión");
      setSpace(next); setRevision(result.revision); setDirty(false); setSaved("Conexión guardada");
    } catch (e) { setError(e instanceof Error ? e.message : "No se guardó la conexión"); }
    finally { setBusy(false); }
  }
  function disconnect(sourceId: string, targetId: string) {
    const next = { ...space, modules: space.modules.map(m => m.id === targetId ? { ...m, dependsOn: m.dependsOn.filter(id => id !== sourceId) } : m) };
    if (!spaceSchema.safeParse(next).success) { setError("No se pudo soltar esa conexión."); return; }
    setLinkSource(null); void persist(next);
  }
  function removeModule(id: string) {
    const target = space.modules.find(m => m.id === id);
    if (!target) return;
    const consumers = space.modules.filter(m => m.dependsOn.includes(id));
    const message = `¿Eliminar el módulo «${target.title}» del lienzo?` +
      (consumers.length ? `\nSe quitarán también ${consumers.length} conexión(es) con otros módulos, sin borrar esos módulos.` : "") +
      "\nLos archivos externos y el contexto del proyecto no se eliminarán. Esta acción se aplicará al guardar cambios.";
    if (!window.confirm(message)) return;
    const next = { ...space, modules: space.modules.filter(m => m.id !== id).map(m => ({ ...m, dependsOn: m.dependsOn.filter(dep => dep !== id) })) };
    if (!spaceSchema.safeParse(next).success) { setError("No se puede eliminar: revisa el estado y las dependencias de los demás módulos."); return; }
    edit(next); setSelected(null); setLinkSource(source => source === id ? null : source);
  }
  const current = space.modules.find(m => m.id === selected);
  const width = Math.max(1000, ...space.modules.map(m => m.x + 300));
  const height = Math.max(600, ...space.modules.map(m => m.y + 200));
  return <section className="vf-space">
    <header className="space-head">
      <div className="space-project-identity"><Link className="space-back-link" href="/app/projects">← Todos los proyectos</Link><h1>{name}</h1><p>Construcción modular</p></div>
      <nav aria-label="Vistas del proyecto">
        <button type="button" aria-expanded={toolsOpen} onClick={() => setToolsOpen(v => !v)}>{toolsOpen ? "Ocultar herramientas" : "Herramientas"}</button>
        <button disabled={busy || loading || !dirty} onClick={() => void save()}>{busy ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}</button>
      </nav>
    </header>
    <div aria-live="polite">{error && <p role="alert" className="space-message">{error}</p>}{saved && <p className="space-message">{saved}</p>}</div>
    {loading ? <p>Cargando el proyecto…</p> : loaded ? <>
      {toolsOpen && <nav className="space-extra-links"><Link href={`/app/live/${encodeURIComponent(projectId)}`}>Sala</Link><Link href={`${base}/expediente`}>Expediente</Link></nav>}
      {toolsOpen && <details className="space-context"><summary>Contexto del proyecto</summary><label>Acuerdos, objetivo y referencias<textarea disabled={busy} value={space.context} onChange={e => edit({ ...space, context: e.target.value })} placeholder="Qué necesita el proyecto y dónde están sus fuentes. Puedes cargar archivos desde la sala." /></label><Link href={`/app/live/${encodeURIComponent(projectId)}`}>Abrir archivos y herramientas en la sala →</Link></details>}
      {toolsOpen && <section className="space-file-entry" aria-label="Archivos del proyecto">
        <div><strong>Archivos del proyecto</strong><p>Una entrada para documentos y conversaciones. Sin duplicar importadores.</p></div>
        <button type="button" aria-expanded={filesOpen} onClick={() => setFilesOpen(v => !v)}>{filesOpen ? "Cerrar" : "+ Agregar archivos"}</button>
      </section>}
      {toolsOpen && filesOpen && <div className="space-file-options">
        <div><strong>ZIP y documentos</strong><p>Analiza un ZIP desde el módulo Receptor ZIP y guarda su inventario en el expediente.</p><button type="button" onClick={() => { const existing = space.modules.find(m => m.kind === "zip_receiver"); if (existing) {setSelected(existing.id);setView("canvas");} else add("zip_receiver"); setFilesOpen(false); }}>Abrir Receptor ZIP</button></div>
        <div><strong>Conversaciones WhatsApp</strong><p>Usa el importador de chats existente, sin crear otra copia.</p><Link href={`${base}/expediente`}>Ir a chats del expediente</Link></div>
      </div>}
      <div className="space-toolbar space-toolbar-primary">
        <div className="space-toolbar-label"><strong>Construir</strong><span>{space.modules.length} {space.modules.length === 1 ? "módulo" : "módulos"}</span></div>
        <div className="space-toolbar-actions">
          <button className="space-list-toggle" type="button" aria-pressed={view === "list"} onClick={() => setView(view === "list" ? "canvas" : "list")}>{view === "list" ? "Volver al lienzo" : "Ver lista"}</button>
          <div className="space-add-wrap"><button className="space-add-primary" type="button" aria-expanded={modulePickerOpen} onClick={() => setModulePickerOpen(v => !v)}>+ Agregar módulo</button>
            {modulePickerOpen && <div className="space-module-menu" role="group" aria-label="Tipos de módulo">{Object.entries(KINDS).map(([key,label]) => <button key={key} type="button" disabled={busy || space.modules.length >= 100} onClick={() => { add(key as SpaceModule["kind"]); setModulePickerOpen(false); setView("canvas"); }}>{label}</button>)}</div>}
          </div>
        </div>
      </div>
      <SpacePreviewDock projectId={projectId} previewUrl={previewUrl} previewRepo={previewRepo} modules={space.modules} />
      <div className="space-work">
        <div className="space-board" aria-label="Módulos del proyecto">
          {view === "canvas" && <div className="space-zoom-floating" aria-label="Zoom del lienzo"><button type="button" aria-label="Alejar" onClick={() => setZoom(Math.max(.4, zoom - .1))}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Acercar" onClick={() => setZoom(Math.min(1.8, zoom + .1))}>+</button></div>}
          {!space.modules.length && <div className="space-empty"><h2>Tu lienzo está listo</h2><p>Agrega tu primer módulo para comenzar.</p></div>}
          {view === "list" ? <div className="space-list">{space.modules.map(m => <button key={m.id} className="space-card" aria-pressed={selected === m.id} onClick={() => setSelected(m.id)}><small>{KINDS[m.kind]} · {STATUSES[m.status]}</small><strong>{m.title}</strong><span>{m.responsible || "Sin asignar"}</span><small>{m.dependsOn.length} dependencias</small></button>)}</div> : <div className="space-scroll"><div style={{ width: width * zoom, height: height * zoom }}><div className="space-plane" style={{ width, height, transform: `scale(${zoom})` }}>
            <svg width={width} height={height}>{space.modules.flatMap(m => m.dependsOn.map(id => { const source = space.modules.find(n => n.id === id); const d = source ? `M ${source.x + 148} ${source.y + 74} L ${m.x} ${m.y + 74}` : ""; return source ? <g key={`${id}-${m.id}`}><path d={d} fill="none" stroke="currentColor" strokeWidth="3" /><path className="space-link-hit" d={d} fill="none" stroke="transparent" strokeWidth="18" onClick={() => disconnect(id, m.id)}><title>Soltar esta conexión</title></path></g> : null; }))}</svg>
            {linkSource && <div className="space-link-hint" role="status">Conectando desde {space.modules.find(m => m.id === linkSource)?.title}. Pulsa la entrada del módulo destino. <button type="button" onClick={() => setLinkSource(null)}>Cancelar</button></div>}
            {space.modules.map(m => <article key={m.id} className={`space-node ${m.kind === "zip_receiver" ? "space-node-zip" : ""}`} style={{ left: m.x, top: m.y }} onPointerDown={e => { if ((e.target as HTMLElement).closest(".space-port")) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: m.id, x: e.clientX, y: e.clientY, originX: m.x, originY: m.y, moved: false }; }} onPointerMove={e => { const d = drag.current; if (d?.id !== m.id) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 5) return; d.moved = true; update(m.id, { x: Math.min(20000, Math.max(0, d.originX + dx / zoom)), y: Math.min(20000, Math.max(0, d.originY + dy / zoom)) }); }} onPointerUp={e => { const d = drag.current; drag.current = null; if (d?.id === m.id && !d.moved && !(e.target as HTMLElement).closest(".space-port")) setSelected(m.id); }} onPointerCancel={() => { drag.current = null; }}><button type="button" className="space-port space-port-in" title={`Conectar entrada de ${m.title}`} aria-label={`Conectar entrada de ${m.title}`} onClick={() => linkSource ? connect(linkSource,m.id) : setError("Selecciona primero la salida de un módulo.")}>●</button><button className="space-card" aria-pressed={selected === m.id} onClick={() => setSelected(m.id)}><small>{KINDS[m.kind]}</small><strong>{m.title}</strong><span>{STATUSES[m.status]}</span></button><button type="button" className="space-port space-port-out" title={`Iniciar conexión desde ${m.title}`} aria-label={`Iniciar conexión desde ${m.title}`} onClick={() => {setLinkSource(m.id);setError("");}}>●</button></article>)}
          </div></div></div>}
        </div>
        {current && <aside className="space-inspector"><div className="space-toolbar"><h2>Editar módulo</h2><button onClick={() => setSelected(null)} aria-label="Cerrar editor">×</button></div><fieldset disabled={busy}>
          <div className="space-links"><strong>Conexiones</strong>{current.dependsOn.map(id => { const src = space.modules.find(n => n.id === id); return src ? <button type="button" key={`in-${id}`} onClick={() => disconnect(id, current.id)}>Soltar desde {src.title}</button> : null; })}{space.modules.filter(n => n.dependsOn.includes(current.id)).map(n => <button type="button" key={`out-${n.id}`} onClick={() => disconnect(current.id, n.id)}>Soltar hacia {n.title}</button>)}{current.dependsOn.length === 0 && !space.modules.some(n => n.dependsOn.includes(current.id)) && <p>Sin conexiones. Toca el punto de la derecha y luego el punto de la izquierda del otro módulo.</p>}</div>{current.kind === "zip_receiver" && <ZipReceiver projectId={projectId} onManifest={manifest => { const next = { ...space, modules: space.modules.map(m => m.id === current.id ? { ...m, result: JSON.stringify(manifest, null, 2), evidence: `blob:${manifest.blobPathname || ""} sha256:${manifest.sha256}`, status: "review" as const } : m) }; setSpace(next); setDirty(true); void fetch(`/api/projects/${encodeURIComponent(projectId)}/space`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: next, revision }) }).then(async r => { const d = await r.json(); if (r.ok) { setRevision(d.revision); setDirty(false); setSaved("ZIP guardado en el proyecto"); } else setError(d.error || "No se guardó el ZIP"); }); }} />}
          <label>Nombre<input value={current.title} maxLength={120} onChange={e => update(current.id, { title: e.target.value })} /></label>
          <label>Responsable<input value={current.responsible} maxLength={200} placeholder="Persona o agente asignado" onChange={e => update(current.id, { responsible: e.target.value })} /></label>
          <label>Estado<select value={current.status} onChange={e => update(current.id, { status: e.target.value as SpaceModule["status"] })}>{Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Instrucción y criterio de aceptación<textarea value={current.prompt} onChange={e => update(current.id, { prompt: e.target.value })} /></label>
          <label>Depende de<select multiple value={current.dependsOn} onChange={e => update(current.id, { dependsOn: Array.from(e.target.selectedOptions, o => o.value) })}>{space.modules.filter(m => m.id !== current.id).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
          <label>Resultado<textarea value={current.result} onChange={e => update(current.id, { result: e.target.value })} /></label>
          <label>Evidencia<textarea value={current.evidence} placeholder="Pruebas, archivo, commit o enlace verificado" onChange={e => update(current.id, { evidence: e.target.value })} /></label>
          <button type="button" className="space-remove-module" onClick={() => removeModule(current.id)}>Eliminar módulo del lienzo</button>
          <p>Asignar un responsable no inicia una ejecución. Usa las herramientas de la sala y registra aquí el resultado comprobado.</p>
          <button onClick={() => { void navigator.clipboard.writeText(`Proyecto: ${name}\nMódulo: ${current.id}\nContexto: ${space.context}\nEncargo: ${current.prompt}\nDevuelve resultado y evidencia para revisión.`).then(() => setSaved("Encargo copiado"), () => setError("No se pudo copiar; selecciona la instrucción manualmente")); }}>Copiar encargo</button>
        </fieldset></aside>}
      </div>
    </> : <p>No se cargó el Space. Recarga la página para volver a intentar.</p>}
  </section>;
}
