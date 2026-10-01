"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconCopy, IconGithub, IconStar, IconX } from "@/components/brand/VFIcons";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import type { DemoProject } from "@/lib/projects/cartera";

const TZ = "America/Cancun";
const MAX_LIVE_PREVIEWS = 6;

interface UseResult {
  project?: { id: string; name: string; github_repo: string; github_url: string };
  mode?: string;
  instructions?: string[];
  copied_files?: number | null;
  skipped?: Array<{ path: string; reason: string; size?: number; message?: string }>;
  truncated?: boolean;
}

export default function DemosCatalogClient({
  initialDemos,
}: {
  initialDemos: DemoProject[];
}) {
  const [demos, setDemos] = useState(initialDemos);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<UseResult | null>(null);
  const [visiblePreviewIds, setVisiblePreviewIds] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return demos;
    return demos
      .map((demo, index) => ({
        demo,
        index,
        score: relevanceScore(demo, words),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.demo);
  }, [demos, q]);

  const setPreviewVisible = useCallback((id: string, visible: boolean) => {
    setVisiblePreviewIds((prev) => {
      const alreadyVisible = prev.has(id);
      if (alreadyVisible === visible) return prev;
      const next = new Set(prev);
      if (visible) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const activePreviewIds = useMemo(() => {
    const active = new Set<string>();
    for (const demo of filtered) {
      if (active.size >= MAX_LIVE_PREVIEWS) break;
      if (demo.public_url && visiblePreviewIds.has(demo.id)) active.add(demo.id);
    }
    return active;
  }, [filtered, visiblePreviewIds]);

  async function toggleDestacado(demo: DemoProject) {
    setBusyId(demo.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/demos/${encodeURIComponent(demo.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_destacado: !demo.demo_destacado }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { demo?: { demo_destacado: boolean }; error?: string }
        | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setDemos((prev) =>
        prev.map((item) =>
          item.id === demo.id
            ? { ...item, demo_destacado: payload?.demo?.demo_destacado ?? !item.demo_destacado }
            : item,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar destacado.");
    } finally {
      setBusyId(null);
    }
  }

  async function usarComoBase(demo: DemoProject) {
    const name = window.prompt("Slug del nuevo proyecto (minusculas y guiones)");
    if (!name?.trim()) return;
    setBusyId(demo.id);
    setMessage(null);
    setResult(null);
    try {
      const response = await fetch(`/api/demos/${encodeURIComponent(demo.id)}/usar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json().catch(() => null)) as UseResult & { error?: string };
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setResult(payload);
      const copied = typeof payload.copied_files === "number"
        ? ` - ${payload.copied_files} archivos copiados`
        : "";
      setMessage(`Proyecto creado: ${payload.project?.name ?? name}${copied}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el proyecto.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--border-1)] bg-white px-page-sm py-6 md:px-page-md xl:px-page-lg">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Stock reutilizable
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-none text-black md:text-[42px]">
              Catalogo de demos
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--fg-secondary)]">
              Demos separadas de la cartera real para encontrar bases por rubro, descripcion o modulos capturados.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-[var(--border-1)] bg-white">
            <Kpi label="Demos" value={demos.length} />
            <Kpi label="Destacadas" value={demos.filter((demo) => demo.demo_destacado).length} />
          </div>
        </div>
      </header>

      <section className="sticky top-[58px] z-10 border-b border-[var(--border-1)] bg-[var(--color-background)]/95 px-page-sm py-4 backdrop-blur md:px-page-md xl:px-page-lg">
        <BarraFiltros
          busqueda={{
            valor: q,
            onCambio: setQ,
            placeholder: "Buscar por nombre, rubro, descripcion, dominio o familia...",
            etiqueta: "Buscar demos",
          }}
          resumen={`${filtered.length} de ${demos.length} demos`}
          activos={q ? 1 : 0}
          onLimpiar={() => setQ("")}
        />
      </section>

      {message ? (
        <div className="border-b border-[var(--border-1)] bg-white px-page-sm py-3 text-[13px] text-black md:px-page-md xl:px-page-lg">
          <div className="flex items-center justify-between gap-3">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-1)]">
              <IconX size={12} />
            </button>
          </div>
          {result?.instructions?.length ? (
            <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--border-1)] bg-[var(--color-background)] p-3 text-left font-mono text-[11px] leading-5 text-[var(--fg-secondary)]">
              {result.instructions.join("\n")}
            </pre>
          ) : null}
          {result?.skipped?.length ? (
            <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--border-1)] bg-[var(--color-background)] p-3 text-left font-mono text-[11px] leading-5 text-[var(--fg-secondary)]">
              {[
                "Archivos omitidos:",
                ...result.skipped.map((item) =>
                  `${item.path} - ${item.reason}${item.size ? ` (${formatBytes(item.size)})` : ""}`,
                ),
              ].join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}

      <section className="px-page-sm py-7 md:px-page-md xl:px-page-lg">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-[var(--border-1)] bg-white px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-black">No hay demos que coincidan.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((demo) => (
              <DemoCard
                key={demo.id}
                demo={demo}
                busy={busyId === demo.id}
                previewActive={activePreviewIds.has(demo.id)}
                onToggleDestacado={() => void toggleDestacado(demo)}
                onUseAsBase={() => void usarComoBase(demo)}
                onPreviewVisibility={setPreviewVisible}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DemoCard({
  demo,
  busy,
  previewActive,
  onToggleDestacado,
  onUseAsBase,
  onPreviewVisibility,
}: {
  demo: DemoProject;
  busy: boolean;
  previewActive: boolean;
  onToggleDestacado: () => void;
  onUseAsBase: () => void;
  onPreviewVisibility: (id: string, visible: boolean) => void;
}) {
  return (
    <article className="grid min-w-0 overflow-hidden rounded-lg border border-[var(--border-1)] bg-white">
      <DemoPreview demo={demo} active={previewActive} onVisible={onPreviewVisibility} />
      <div className="grid min-w-0 gap-4 p-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold text-black">{demo.name}</h2>
              <p className="mt-1 truncate text-[12px] text-[var(--fg-muted)]">
                {demo.primary_repo ?? "sin repo principal"} - push {fecha(demo.last_push)}
              </p>
            </div>
            {demo.demo_destacado ? (
              <span className="shrink-0 rounded-full border border-black px-2 py-1 text-[11px] font-medium text-black">
                destacada
              </span>
            ) : null}
          </div>
          <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--fg-secondary)]">
            {demo.description || demo.cartera_nota || "Sin descripcion capturada."}
          </p>
        </div>

        <div className="grid gap-2 text-[12px] text-[var(--fg-secondary)]">
          <Meta label="Rubro" value={demo.rubro ? estadoHumano(demo.rubro) : "sin dato"} />
          <Meta
            label="Modulos"
            value={demo.modules.length ? demo.modules.join(", ") : "sin dato"}
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onUseAsBase}
            disabled={busy}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-black bg-black px-3 text-[13px] font-semibold text-white disabled:opacity-45"
          >
            <IconCopy size={13} />
            Usar como base
          </button>
          <button
            type="button"
            onClick={onToggleDestacado}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-3 text-[13px] font-medium text-black hover:border-black disabled:opacity-45"
          >
            <IconStar size={13} />
            {demo.demo_destacado ? "Quitar" : "Destacar"}
          </button>
          {demo.primary_repo ? (
            <a
              href={`https://github.com/${demo.primary_repo}`}
              target="_blank"
              rel="noreferrer"
              className="grid min-h-11 w-11 place-items-center rounded-md border border-[var(--border-1)] bg-white text-black hover:border-black"
              aria-label="Abrir repo en GitHub"
            >
              <IconGithub size={14} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DemoPreview({
  demo,
  active,
  onVisible,
}: {
  demo: DemoProject;
  active: boolean;
  onVisible: (id: string, visible: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!demo.public_url) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      onVisible(demo.id, true);
      return () => onVisible(demo.id, false);
    }

    const observer = new IntersectionObserver(
      ([entry]) => onVisible(demo.id, Boolean(entry?.isIntersecting)),
      { rootMargin: "0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      onVisible(demo.id, false);
    };
  }, [demo.id, demo.public_url, onVisible]);

  if (demo.cover_src) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--border-1)] bg-[var(--color-background)]">
        <img src={demo.cover_src} alt={`Captura de ${demo.name}`} className="h-full w-full object-cover object-top" />
        <PreviewLabel label={demo.cover_label} />
      </div>
    );
  }
  if (demo.public_url) {
    return (
      <div ref={ref} className="relative aspect-[16/10] overflow-hidden border-b border-[var(--border-1)] bg-[var(--color-background)]">
        {active ? (
          <iframe
            src={demo.public_url}
            title={`Vista previa de ${demo.name}`}
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0"
          />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="text-[14px] font-semibold text-black">Deploy listo</p>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                Vista previa en espera.
              </p>
            </div>
          </div>
        )}
        <PreviewLabel label={active ? "deploy en vivo" : demo.cover_label} />
      </div>
    );
  }
  return (
    <div className="grid aspect-[16/10] place-items-center border-b border-[var(--border-1)] bg-[var(--color-background)] p-6 text-center">
      <div>
        <p className="text-[14px] font-semibold text-black">{demo.name}</p>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{demo.cover_label}</p>
      </div>
    </div>
  );
}

function PreviewLabel({ label }: { label: string }) {
  return (
    <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full border border-[var(--border-1)] bg-white/95 px-2.5 py-1 text-[11px] font-medium text-black">
      {label}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-2">
      <span className="font-mono uppercase tracking-[0.12em] text-[var(--fg-muted)]">{label}</span>
      <span className="min-w-0 break-words text-black">{value}</span>
    </p>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[112px] border-r border-[var(--border-1)] px-4 py-3 last:border-r-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none text-black">{value}</p>
    </div>
  );
}

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function relevanceScore(demo: DemoProject, words: string[]) {
  const fields = [
    { value: demo.name, weight: 500 },
    { value: demo.rubro, weight: 320 },
    { value: demo.description, weight: 220 },
    { value: demo.domain, weight: 160 },
    { value: demo.vercel_url, weight: 140 },
    { value: demo.cartera_nota, weight: 100 },
    { value: demo.primary_repo, weight: 80 },
    { value: demo.modules.join(" "), weight: 60 },
  ];
  let score = 0;
  for (const word of words) {
    let matched = false;
    for (const field of fields) {
      const hay = norm(field.value ?? "");
      if (!hay.includes(word)) continue;
      matched = true;
      score += hay === word ? field.weight + 40 : field.weight;
    }
    if (!matched) return 0;
  }
  return score;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function estadoHumano(value: string) {
  return value.replace(/_/g, " ");
}

function fecha(value: string | null | undefined) {
  if (!value) return "sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin dato";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
