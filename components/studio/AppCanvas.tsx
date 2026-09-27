"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconX } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

type MarkKind = "error" | "tipo" | "tamano" | "copy";

type Mark = {
  id: string;
  kind: MarkKind;
  x: number;
  y: number;
  note: string;
};

type Edit = {
  path: string;
  text?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  color?: string;
};

const KINDS: { id: MarkKind; label: string }[] = [
  { id: "error", label: "Error" },
  { id: "tipo", label: "Tipo" },
  { id: "tamano", label: "Tamaño" },
  { id: "copy", label: "Copy" },
];

const WIDTHS = [390, 768, 1280, 1440];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function elementPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.tagName.toLowerCase() !== "html") {
    const current: Element = node;
    const tag = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const index =
      Array.from(parent.children).filter((child) => child.tagName === current.tagName).indexOf(current) + 1;
    parts.unshift(`${tag}:nth-of-type(${index})`);
    if (tag === "body") break;
    node = parent;
  }
  return parts.join(" > ");
}

function proxyUrl(raw: string): string {
  return `/api/canvas-proxy?u=${encodeURIComponent(raw)}`;
}

export function AppCanvas({
  projectId,
  projectName,
  src,
  frameKey,
}: {
  projectId: string;
  projectName: string;
  src: string | null;
  frameKey: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const storageKey = `vf-canvas:${projectId || projectName}`;
  const editKey = `vf-canvas-edits:${projectId || projectName}`;
  const [kind, setKind] = useState<MarkKind>("error");
  const [tool, setTool] = useState<"editar" | "marcar">("editar");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [width, setWidth] = useState(1280);
  const [zoom, setZoom] = useState(80);
  const [draftUrl, setDraftUrl] = useState(src ?? "");
  const [url, setUrl] = useState(src ?? "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    path: string;
    tag: string;
    text: string;
    editableText: boolean;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
    color: string;
  } | null>(null);

  useEffect(() => {
    setMarks(loadJson(storageKey, []));
    setEdits(loadJson(editKey, []));
  }, [storageKey, editKey]);

  useEffect(() => {
    setDraftUrl(src ?? "");
    if (src) setUrl(src);
  }, [src]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(marks));
  }, [marks, storageKey]);

  useEffect(() => {
    localStorage.setItem(editKey, JSON.stringify(edits));
  }, [edits, editKey]);

  const frameSrc = useMemo(() => {
    if (!url || !/^https?:\/\//i.test(url)) return "";
    return proxyUrl(url);
  }, [url]);

  function onFrameLoad() {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const stored = loadJson<Edit[]>(editKey, []);
    for (const edit of stored) {
      const el = doc.querySelector(edit.path);
      if (!el || !(el instanceof HTMLElement)) continue;
      if (edit.text != null && el.children.length === 0) el.textContent = edit.text;
      if (edit.fontSize) el.style.fontSize = edit.fontSize;
      if (edit.fontWeight) el.style.fontWeight = edit.fontWeight;
      if (edit.letterSpacing) el.style.letterSpacing = edit.letterSpacing;
      if (edit.color) el.style.color = edit.color;
    }
    const onClick = (event: MouseEvent) => {
      if (tool !== "editar") return;
      event.preventDefault();
      event.stopPropagation();
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("a,button,p,h1,h2,h3,h4,span,li,label,div") ?? target;
      if (!(el instanceof HTMLElement)) return;
      if (el === doc.body || el === doc.documentElement) return;
      doc.querySelectorAll("[data-vf-sel]").forEach((node) => node.removeAttribute("data-vf-sel"));
      el.setAttribute("data-vf-sel", "1");
      const cs = doc.defaultView?.getComputedStyle(el);
      setSelected({
        path: elementPath(el),
        tag: el.tagName.toLowerCase(),
        text: el.children.length === 0 ? (el.textContent ?? "") : "",
        editableText: el.children.length === 0,
        fontSize: cs?.fontSize ?? "",
        fontWeight: cs?.fontWeight ?? "",
        letterSpacing: cs?.letterSpacing ?? "",
        color: cs?.color ?? "",
      });
    };
    doc.addEventListener("click", onClick, true);
  }

  function patchSelected(patch: Partial<Edit>) {
    if (!selected) return;
    const doc = frameRef.current?.contentDocument;
    const el = doc?.querySelector(selected.path);
    if (el instanceof HTMLElement) {
      if (patch.text != null && el.children.length === 0) el.textContent = patch.text;
      if (patch.fontSize) el.style.fontSize = patch.fontSize;
      if (patch.fontWeight) el.style.fontWeight = patch.fontWeight;
      if (patch.letterSpacing) el.style.letterSpacing = patch.letterSpacing;
      if (patch.color) el.style.color = patch.color;
    }
    setSelected((prev) => (prev ? { ...prev, ...patch, text: patch.text ?? prev.text } : prev));
    setEdits((prev) => {
      const rest = prev.filter((item) => item.path !== selected.path);
      const current = prev.find((item) => item.path === selected.path) ?? { path: selected.path };
      return [...rest, { ...current, ...patch, path: selected.path }];
    });
  }

  function addMark(event: React.MouseEvent<HTMLDivElement>) {
    if (tool !== "marcar") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    const mark: Mark = {
      id: `${Date.now()}`,
      kind,
      x,
      y,
      note: "",
    };
    setMarks((prev) => [...prev, mark]);
    setActiveId(mark.id);
  }

  const active = marks.find((mark) => mark.id === activeId) ?? null;

  return (
    <div className="flex min-h-[520px] flex-col gap-3 lg:min-h-full lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTool("editar")}
            className={cn(
              "h-8 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-[0.1em]",
              tool === "editar" ? "bg-black text-white" : "border border-[var(--border-1)] bg-white",
            )}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setTool("marcar")}
            className={cn(
              "h-8 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-[0.1em]",
              tool === "marcar" ? "bg-black text-white" : "border border-[var(--border-1)] bg-white",
            )}
          >
            Marcar
          </button>
          {tool === "marcar"
            ? KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "h-8 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                    kind === item.id ? "bg-black text-white" : "text-[var(--fg-muted)]",
                  )}
                >
                  {item.label}
                </button>
              ))
            : null}
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-[var(--fg-muted)]">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                className={w === width ? "text-black" : "hover:text-black"}
              >
                {w}
              </button>
            ))}
            <label className="flex items-center gap-1">
              {zoom}%
              <input
                type="range"
                min={40}
                max={140}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <form
          className="mb-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSelected(null);
            setUrl(draftUrl.trim());
          }}
        >
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://tu-app.vercel.app"
            className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border-1)] bg-white px-3 font-mono text-[11px]"
          />
          <button type="submit" className="btn-ghost !min-h-9 !px-3">
            Cargar
          </button>
        </form>

        <div className="overflow-auto border border-[var(--border-1)] bg-[#ecece8]">
          <div
            className="relative mx-auto origin-top bg-white"
            style={{ width, transform: `scale(${zoom / 100})`, minHeight: 640 }}
          >
            {frameSrc ? (
              <iframe
                ref={frameRef}
                key={`${frameKey}-${frameSrc}`}
                title={`canvas-${projectName}`}
                src={frameSrc}
                onLoad={onFrameLoad}
                className="h-[760px] w-full border-0 bg-white"
              />
            ) : (
              <div className="grid h-[720px] place-items-center px-6 text-center">
                <p className="max-w-sm text-[13px] text-[var(--fg-secondary)]">
                  Carga la URL de la app. VForge la pinta en su propio origen para poder
                  editar texto y tamaños.
                </p>
              </div>
            )}
            {tool === "marcar" ? (
              <div className="absolute inset-0 cursor-crosshair" onClick={addMark}>
                {marks.map((mark) => (
                  <button
                    key={mark.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveId(mark.id);
                    }}
                    style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black text-[9px] font-medium text-white"
                  >
                    {mark.kind[0]?.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 border border-[var(--border-1)] bg-white lg:w-[280px]">
        {selected ? (
          <div className="border-b border-[var(--border-1)] p-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              {selected.tag}
            </p>
            {selected.editableText ? (
              <textarea
                value={selected.text}
                rows={4}
                onChange={(e) => patchSelected({ text: e.target.value })}
                className="mt-2 w-full resize-none rounded-md border border-[var(--border-1)] p-2 text-[12px]"
              />
            ) : (
              <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
                Este bloque tiene hijos. Se edita el estilo, no el texto entero.
              </p>
            )}
            <label className="mt-2 block text-[11px]">
              Tamaño
              <input
                value={selected.fontSize}
                onChange={(e) => patchSelected({ fontSize: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-[var(--border-1)] px-2 font-mono text-[11px]"
              />
            </label>
            <label className="mt-2 block text-[11px]">
              Peso
              <input
                value={selected.fontWeight}
                onChange={(e) => patchSelected({ fontWeight: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-[var(--border-1)] px-2 font-mono text-[11px]"
              />
            </label>
            <label className="mt-2 block text-[11px]">
              Tracking
              <input
                value={selected.letterSpacing}
                onChange={(e) => patchSelected({ letterSpacing: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-[var(--border-1)] px-2 font-mono text-[11px]"
              />
            </label>
            <label className="mt-2 block text-[11px]">
              Color
              <input
                value={selected.color}
                onChange={(e) => patchSelected({ color: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-[var(--border-1)] px-2 font-mono text-[11px]"
              />
            </label>
          </div>
        ) : (
          <p className="border-b border-[var(--border-1)] px-3 py-3 text-[12px] text-[var(--fg-muted)]">
            Clic en un texto de la app. El cambio se queda en este proyecto.
          </p>
        )}
        <div className="border-b border-[var(--border-1)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Cambios · {edits.length} · marcas · {marks.length}
        </div>
        {active ? (
          <div className="border-b border-[var(--border-1)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase">{active.kind}</p>
              <button
                type="button"
                aria-label="Quitar marca"
                onClick={() => {
                  setMarks((prev) => prev.filter((mark) => mark.id !== active.id));
                  setActiveId(null);
                }}
              >
                <IconX size={12} />
              </button>
            </div>
            <textarea
              value={active.note}
              rows={3}
              onChange={(e) =>
                setMarks((prev) =>
                  prev.map((mark) => (mark.id === active.id ? { ...mark, note: e.target.value } : mark)),
                )
              }
              placeholder="Qué hay que corregir"
              className="w-full resize-none rounded-md border border-[var(--border-1)] p-2 text-[12px]"
            />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
