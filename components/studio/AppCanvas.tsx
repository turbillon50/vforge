"use client";

import { useEffect, useMemo, useState } from "react";
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

const KINDS: { id: MarkKind; label: string }[] = [
  { id: "error", label: "Error" },
  { id: "tipo", label: "Tipo" },
  { id: "tamano", label: "Tamaño" },
  { id: "copy", label: "Copy" },
];

const WIDTHS = [390, 768, 1280, 1440];

function loadMarks(key: string): Mark[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Mark[]) : [];
  } catch {
    return [];
  }
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
  const storageKey = `vf-canvas:${projectId || projectName}`;
  const [kind, setKind] = useState<MarkKind>("error");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [width, setWidth] = useState(1280);
  const [zoom, setZoom] = useState(100);
  const [draftUrl, setDraftUrl] = useState(src ?? "");
  const [url, setUrl] = useState(src ?? "");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setMarks(loadMarks(storageKey));
  }, [storageKey]);

  useEffect(() => {
    setDraftUrl(src ?? "");
    if (src) setUrl(src);
  }, [src]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(marks));
  }, [marks, storageKey]);

  const active = useMemo(
    () => marks.find((m) => m.id === activeId) ?? null,
    [marks, activeId],
  );

  function addMark(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    const mark: Mark = {
      id: `${Date.now()}-${Math.round(x)}${Math.round(y)}`,
      kind,
      x,
      y,
      note: "",
    };
    setMarks((prev) => [...prev, mark]);
    setActiveId(mark.id);
  }

  return (
    <div className="flex min-h-[520px] flex-col gap-3 lg:min-h-full lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={cn(
                "h-8 rounded-md px-2.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                kind === item.id
                  ? "bg-black text-white"
                  : "border border-[var(--border-1)] bg-white text-[var(--fg-secondary)]",
              )}
            >
              {item.label}
            </button>
          ))}
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
                min={50}
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
            setUrl(draftUrl.trim());
          }}
        >
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://app.en.prod"
            className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border-1)] bg-white px-3 font-mono text-[11px]"
          />
          <button type="submit" className="btn-ghost !min-h-9 !px-3">
            Cargar
          </button>
        </form>

        <div className="overflow-auto border border-[var(--border-1)] bg-[#ecece8]">
          <div
            className="relative mx-auto origin-top bg-white"
            style={{
              width,
              transform: `scale(${zoom / 100})`,
              minHeight: 640,
            }}
          >
            {url ? (
              <iframe
                key={`${frameKey}-${url}`}
                title={`canvas-${projectName}`}
                src={url}
                className="h-[720px] w-full border-0 bg-white"
              />
            ) : (
              <div className="grid h-[720px] place-items-center text-center">
                <p className="max-w-sm text-[13px] text-[var(--fg-secondary)]">
                  Carga la URL viva de la app. El iframe no deja editar el DOM ajeno;
                  las marcas quedan encima y se guardan en este proyecto.
                </p>
              </div>
            )}
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
                  className={cn(
                    "absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white text-[9px] font-medium text-white",
                    mark.kind === "error" && "bg-black",
                    mark.kind === "tipo" && "bg-[#3d3d3a]",
                    mark.kind === "tamano" && "bg-[#6b6b66]",
                    mark.kind === "copy" && "bg-[#8a8a84]",
                  )}
                >
                  {mark.kind[0]!.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 border border-[var(--border-1)] bg-white lg:w-[280px]">
        <div className="border-b border-[var(--border-1)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Marcas · {marks.length}
        </div>
        {active ? (
          <div className="border-b border-[var(--border-1)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase">{active.kind}</p>
              <button
                type="button"
                onClick={() => {
                  setMarks((prev) => prev.filter((m) => m.id !== active.id));
                  setActiveId(null);
                }}
                aria-label="Quitar marca"
              >
                <IconX size={12} />
              </button>
            </div>
            <textarea
              value={active.note}
              onChange={(e) =>
                setMarks((prev) =>
                  prev.map((m) => (m.id === active.id ? { ...m, note: e.target.value } : m)),
                )
              }
              rows={5}
              placeholder="Qué está mal: 12px, copy flojo, botón que se sale…"
              className="w-full resize-none rounded-md border border-[var(--border-1)] p-2 text-[12px]"
            />
          </div>
        ) : (
          <p className="px-3 py-3 text-[12px] text-[var(--fg-muted)]">
            Clic sobre la app para clavar una marca.
          </p>
        )}
        <ul className="max-h-[280px] overflow-y-auto">
          {marks.map((mark) => (
            <li key={mark.id}>
              <button
                type="button"
                onClick={() => setActiveId(mark.id)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] hover:bg-[#f7f7f5]",
                  mark.id === activeId && "bg-[#f2f2f0]",
                )}
              >
                <span className="font-mono text-[9px] uppercase text-[var(--fg-muted)]">
                  {mark.kind}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {mark.note || "Sin nota"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
