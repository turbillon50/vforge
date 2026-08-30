"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconExtLink,
  IconLayout,
  IconLoader,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@/components/brand/VFIcons";

type ReferenceKind = "page" | "component" | "inspiration";
type ViewportKind = "desktop" | "mobile";

interface ProjectReference {
  id: string;
  label: string;
  url: string;
  kind: ReferenceKind;
  notes: string;
  created_by: string;
  created_at: string;
}

const KIND_LABELS: Record<ReferenceKind, string> = {
  page: "Página",
  component: "Componente",
  inspiration: "Inspiración",
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, label: "1440 × 900" },
  mobile: { width: 390, height: 844, label: "390 × 844" },
} satisfies Record<
  ViewportKind,
  { width: number; height: number; label: string }
>;

function referenceHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function ReferencesPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportKind>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<ReferenceKind>("page");

  const selected = useMemo(
    () =>
      references.find((reference) => reference.id === selectedId) ??
      references[0] ??
      null,
    [references, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/live/${encodeURIComponent(projectId)}/references`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          references?: ProjectReference[];
          canWrite?: boolean;
        } | null;
        if (!response.ok)
          throw new Error("No fue posible cargar las referencias.");
        const next = Array.isArray(payload?.references)
          ? payload.references
          : [];
        setReferences(next);
        setSelectedId((current) =>
          current && next.some((item) => item.id === current)
            ? current
            : (next[0]?.id ?? null),
        );
        setCanWrite(Boolean(payload?.canWrite));
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar las referencias.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId]);

  async function createReference(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/references`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, url, kind, notes }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        reference?: ProjectReference;
      } | null;
      if (!response.ok || !payload?.reference) {
        throw new Error(
          response.status === 400
            ? "Usa una URL pública válida con https://"
            : "No fue posible guardar la referencia.",
        );
      }
      setReferences((current) => [payload.reference!, ...current]);
      setSelectedId(payload.reference.id);
      setLabel("");
      setUrl("");
      setNotes("");
      setKind("page");
      setShowForm(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la referencia.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeReference(reference: ProjectReference) {
    if (!window.confirm(`¿Eliminar la referencia “${reference.label}”?`))
      return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/references/${encodeURIComponent(reference.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw new Error("No fue posible eliminar la referencia.");
      setReferences((current) =>
        current.filter((item) => item.id !== reference.id),
      );
      setSelectedId((current) => (current === reference.id ? null : current));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible eliminar la referencia.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconLayout size={12} />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
            Referencias
          </span>
          <span className="hidden truncate text-[10px] text-[var(--fg-muted)] sm:block">
            Páginas, componentes y look &amp; feel del proyecto
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canWrite ? (
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[8px] uppercase tracking-[0.08em]",
                showForm
                  ? "border-black bg-black text-white"
                  : "border-[var(--border-1)] hover:border-black",
              )}
            >
              {showForm ? <IconX size={10} /> : <IconPlus size={10} />}
              {showForm ? "Cancelar" : "Agregar"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-background)]"
            aria-label="Cerrar referencias"
          >
            <IconX size={11} />
          </button>
        </div>
      </header>

      {showForm ? (
        <form
          onSubmit={createReference}
          className="grid shrink-0 gap-2 border-b border-[var(--border-1)] bg-[var(--color-background)] p-3 md:grid-cols-[1fr_1.5fr_auto]"
        >
          <label className="grid gap-1">
            <span className="mono-label">Nombre</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={120}
              placeholder="Checkout que nos gusta"
              className="min-h-10 rounded-md border border-[var(--border-1)] bg-white px-3 text-[12px] outline-none focus:border-black"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="mono-label">URL pública</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              maxLength={2048}
              placeholder="https://ejemplo.com/componente"
              className="min-h-10 rounded-md border border-[var(--border-1)] bg-white px-3 text-[12px] outline-none focus:border-black"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="mono-label">Tipo</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ReferenceKind)}
              className="min-h-10 rounded-md border border-[var(--border-1)] bg-white px-3 text-[12px] outline-none focus:border-black"
            >
              {Object.entries(KIND_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="mono-label">Nota opcional</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Qué tomar de esta referencia"
              className="min-h-10 rounded-md border border-[var(--border-1)] bg-white px-3 text-[12px] outline-none focus:border-black"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !label.trim() || !url.trim()}
            className="btn-primary min-h-10 self-end disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <IconLoader size={11} className="animate-spin" />
            ) : (
              <IconPlus size={11} />
            )}{" "}
            Guardar
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="shrink-0 border-b border-[var(--border-1)] px-3 py-2 text-[11px] text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--border-1)] bg-white md:border-b-0 md:border-r">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-[11px] text-[var(--fg-muted)]">
              <IconLoader size={12} className="animate-spin" /> Cargando
              referencias…
            </div>
          ) : references.length ? (
            <div className="divide-y divide-[var(--border-1)]">
              {references.map((reference) => (
                <button
                  key={reference.id}
                  type="button"
                  onClick={() => setSelectedId(reference.id)}
                  className={cn(
                    "w-full px-3 py-3 text-left hover:bg-[var(--color-background)]",
                    selected?.id === reference.id &&
                      "bg-black text-white hover:bg-black",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-[12px] font-medium">
                      {reference.label}
                    </strong>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[8px] uppercase tracking-[0.08em]",
                        selected?.id === reference.id
                          ? "text-white/60"
                          : "text-[var(--fg-muted)]",
                      )}
                    >
                      {KIND_LABELS[reference.kind]}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 block truncate text-[9px]",
                      selected?.id === reference.id
                        ? "text-white/65"
                        : "text-[var(--fg-muted)]",
                    )}
                  >
                    {referenceHostname(reference.url)}
                  </span>
                  {reference.notes ? (
                    <span
                      className={cn(
                        "mt-2 line-clamp-2 block text-[10px] leading-4",
                        selected?.id === reference.id
                          ? "text-white/75"
                          : "text-[var(--fg-muted)]",
                      )}
                    >
                      {reference.notes}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-[11px] leading-5 text-[var(--fg-muted)]">
              Aún no hay referencias. Guarda una URL de inspiración, una página
              o un componente para verla aquí.
            </div>
          )}
        </aside>

        <div className="flex min-h-[420px] min-w-0 flex-col bg-[var(--color-background)]">
          {selected ? (
            <>
              <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-1)] bg-white px-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium">
                    {selected.label}
                  </p>
                  <p className="truncate font-mono text-[8px] text-[var(--fg-muted)]">
                    {selected.url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(["desktop", "mobile"] as ViewportKind[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setViewport(item)}
                      className={cn(
                        "h-7 rounded-md border px-2 font-mono text-[8px] uppercase",
                        viewport === item
                          ? "border-black bg-black text-white"
                          : "border-[var(--border-1)] bg-white",
                      )}
                    >
                      {item === "desktop" ? "Escritorio" : "Móvil"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRefreshKey((current) => current + 1)}
                    className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]"
                    aria-label="Actualizar referencia"
                  >
                    <IconRefresh size={10} />
                  </button>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]"
                    aria-label="Abrir referencia en otra pestaña"
                  >
                    <IconExtLink size={10} />
                  </a>
                  {canWrite ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeReference(selected)}
                      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)] disabled:opacity-40"
                      aria-label="Eliminar referencia"
                    >
                      <IconTrash size={10} />
                    </button>
                  ) : null}
                </div>
              </div>
              <ReferenceStage
                key={`${selected.id}:${refreshKey}`}
                reference={selected}
                viewport={viewport}
              />
              <p className="shrink-0 border-t border-[var(--border-1)] bg-white px-3 py-2 text-[9px] text-[var(--fg-muted)]">
                {VIEWPORTS[viewport].label} · Si el sitio bloquea iframes,
                ábrelo con el botón externo.
              </p>
            </>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <IconLayout size={22} className="mx-auto" />
                <p className="mt-3 text-[12px] font-medium">
                  Selecciona o agrega una referencia
                </p>
                <p className="mt-2 text-[10px] text-[var(--fg-muted)]">
                  Aquí podrás compararla en escritorio y móvil sin salir de la
                  sala.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReferenceStage({
  reference,
  viewport,
}: {
  reference: ProjectReference;
  viewport: ViewportKind;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const spec = VIEWPORTS[viewport];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(stage);
    setSize({ width: stage.clientWidth, height: stage.clientHeight });
    return () => observer.disconnect();
  }, []);

  const padding = viewport === "mobile" ? 24 : 12;
  const scale =
    size.width && size.height
      ? Math.min(
          (size.width - padding * 2) / spec.width,
          (size.height - padding * 2) / spec.height,
          1,
        )
      : 0;

  return (
    <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className={cn(
          "absolute left-1/2 top-1/2 overflow-hidden bg-white shadow-lg",
          viewport === "mobile"
            ? "rounded-[28px] border-[6px] border-black"
            : "border border-[var(--border-1)]",
        )}
        style={{
          width: spec.width,
          height: spec.height,
          transform: `translate(-50%, -50%) scale(${Math.max(scale, 0.01)})`,
        }}
      >
        <iframe
          src={reference.url}
          title={`Referencia ${reference.label}`}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
