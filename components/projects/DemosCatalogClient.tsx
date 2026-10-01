"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconGithub, IconStar, IconX } from "@/components/brand/VFIcons";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import type { DemoProject } from "@/lib/projects/cartera";

const TZ = "America/Cancun";

interface UseResult {
  project?: { id: string; name: string; github_repo: string; github_url: string };
  mode?: string;
  instructions?: string[];
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

  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return demos;
    return demos.filter((demo) => {
      const hay = norm([
        demo.name,
        demo.description,
        demo.rubro,
        demo.cartera_nota,
        demo.primary_repo,
        ...demo.modules,
      ].filter(Boolean).join(" "));
      return words.every((word) => hay.includes(word));
    });
  }, [demos, q]);

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

  async function useAsBase(demo: DemoProject) {
    const name = window.prompt("Nombre del nuevo proyecto");
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
      setMessage(`Proyecto creado: ${payload.project?.name ?? name}`);
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
            placeholder: "Buscar por nombre, descripcion, rubro o modulos...",
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
                onToggleDestacado={() => void toggleDestacado(demo)}
                onUseAsBase={() => void useAsBase(demo)}
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
  onToggleDestacado,
  onUseAsBase,
}: {
  demo: DemoProject;
  busy: boolean;
  onToggleDestacado: () => void;
  onUseAsBase: () => void;
}) {
  return (
    <article className="grid min-w-0 overflow-hidden rounded-lg border border-[var(--border-1)] bg-white">
      <DemoPreview demo={demo} />
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

function DemoPreview({ demo }: { demo: DemoProject }) {
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
      <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--border-1)] bg-[var(--color-background)]">
        <iframe
          src={demo.public_url}
          title={`Vista previa de ${demo.name}`}
          loading="lazy"
          className="h-[200%] w-[200%] origin-top-left scale-50 border-0"
        />
        <PreviewLabel label="iframe del dominio" />
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
