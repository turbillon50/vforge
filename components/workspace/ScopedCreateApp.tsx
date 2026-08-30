"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArrowR,
  IconCheck,
  IconGithub,
  IconLoader,
  IconRocket,
} from "@/components/brand/VFIcons";

interface GeneratedApp {
  id: string;
  name: string;
  repo_url: string | null;
  deploy_url: string | null;
  template: string | null;
  created_at: string;
}

interface ShipResponse {
  ok?: boolean;
  error?: string;
  detail?: unknown;
  acceptedPermissions?: string;
  repo?: { url?: string };
  deploy?: { url?: string | null };
}

interface BuilderError {
  title: string;
  message: string;
  permission?: boolean;
}

const templates = [
  {
    value: "landing",
    label: "Landing",
    eyebrow: "Presentar",
    description: "Una página enfocada en comunicar y convertir.",
  },
  {
    value: "tienda",
    label: "Tienda",
    eyebrow: "Vender",
    description: "Catálogo y estructura inicial para comercio.",
  },
  {
    value: "portafolio",
    label: "Portafolio",
    eyebrow: "Mostrar",
    description: "Proyectos, casos y contacto en primer plano.",
  },
  {
    value: "blanco",
    label: "Desde cero",
    eyebrow: "Explorar",
    description: "Una base limpia para una idea distinta.",
  },
] as const;

const capabilities = [
  "Autenticación",
  "Panel administrativo",
  "Base de datos",
  "Pagos",
  "PWA",
  "Mapas",
] as const;

function detailMessage(detail: unknown): string {
  if (typeof detail !== "string") return "";
  try {
    const parsed = JSON.parse(detail) as { message?: string };
    return typeof parsed.message === "string" ? parsed.message : "";
  } catch {
    return detail.slice(0, 180);
  }
}

export function ScopedCreateApp() {
  const [apps, setApps] = useState<GeneratedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("landing");
  const [modules, setModules] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<BuilderError | null>(null);
  const [result, setResult] = useState<ShipResponse | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.value === template) ?? templates[0],
    [template],
  );

  const loadApps = useCallback(async () => {
    try {
      const response = await fetch("/api/forja/apps", { cache: "no-store" });
      const payload = (await response.json()) as { apps?: GeneratedApp[] };
      setApps(response.ok ? payload.apps ?? [] : []);
    } catch {
      setApps([]);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  function toggleModule(module: string) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
  }

  async function createApp() {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/forja/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          template,
          isPrivate,
          modules,
        }),
      });
      const payload = (await response.json()) as ShipResponse;

      if (!response.ok || !payload.ok) {
        if (payload.error === "connect_github") {
          setError({
            title: "Falta conectar GitHub",
            message: "Conecta tu cuenta y vuelve a intentar desde este mismo espacio.",
          });
        } else if (payload.error === "connect_vercel") {
          setError({
            title: "Falta conectar Vercel",
            message: "Conecta tu cuenta para que VForge pueda publicar el proyecto.",
          });
        } else if (payload.error === "github_repo_permission") {
          setError({
            title: "GitHub necesita un permiso adicional",
            message:
              "Tu cuenta está conectada, pero la instalación todavía no autoriza crear repositorios. Actualiza el acceso de VForge en GitHub y vuelve a publicar.",
            permission: true,
          });
        } else if (payload.error === "repo_create") {
          setError({
            title: "GitHub rechazó el repositorio",
            message:
              detailMessage(payload.detail) ||
              "Revisa el acceso de la integración e intenta nuevamente.",
          });
        } else if (payload.error === "deploy") {
          setError({
            title: "El repositorio se creó, pero falta publicar",
            message:
              "Vercel rechazó el despliegue. Tu código quedó seguro en GitHub para reintentarlo.",
          });
        } else {
          setError({
            title: "La construcción no terminó",
            message: "VForge conservó tu brief. Intenta nuevamente en un momento.",
          });
        }
        return;
      }

      setResult(payload);
      setName("");
      setDescription("");
      setModules([]);
      await loadApps();
    } catch {
      setError({
        title: "Se perdió la conexión",
        message: "Tu brief sigue aquí. Reintenta cuando la red esté estable.",
      });
    } finally {
      setCreating(false);
    }
  }

  const githubState = error?.permission
    ? "error"
    : result?.ok
      ? "done"
      : creating
        ? "active"
        : "idle";
  const vercelState = result?.ok
    ? "done"
    : creating
      ? "waiting"
      : "idle";

  return (
    <section className="mt-12 sm:mt-16" aria-labelledby="create-app-title">
      <div className="flex flex-col gap-4 border-b border-[var(--color-ink)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mono-label">Paso 02 · Constructor</p>
          <h2
            id="create-app-title"
            className="mt-2 max-w-3xl text-[34px] font-medium leading-[0.98] tracking-[-0.06em] sm:text-[46px]"
          >
            Dale forma a tu primera app.
          </h2>
        </div>
        <p className="max-w-sm text-[12px] leading-5 text-[var(--fg-secondary)] sm:text-right">
          Elige una dirección, define lo necesario y VForge prepara el repo y
          la publicación con tus propias cuentas.
        </p>
      </div>

      <div className="grid border-x border-b border-[var(--color-ink)] bg-[var(--color-surface)] lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
        <div className="p-5 sm:p-8 lg:border-r lg:border-[var(--color-ink)]">
          <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
              01 / Dirección
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              {selectedTemplate.eyebrow}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {templates.map((item, index) => {
              const active = template === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTemplate(item.value)}
                  className={`group min-h-28 border p-4 text-left transition duration-200 ${
                    active
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-background)]"
                      : "border-[var(--border-1)] bg-[var(--color-background)] hover:border-[var(--color-ink)]"
                  }`}
                >
                  <span
                    className={`font-mono text-[9px] tracking-[0.16em] ${
                      active ? "opacity-60" : "text-[var(--fg-muted)]"
                    }`}
                  >
                    0{index + 1}
                  </span>
                  <span className="mt-5 block text-[18px] font-medium tracking-[-0.03em]">
                    {item.label}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] leading-4 ${
                      active ? "opacity-65" : "text-[var(--fg-secondary)]"
                    }`}
                  >
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between border-b border-[var(--border-1)] pb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
              02 / Brief
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Escribe como hablas
            </p>
          </div>

          <label className="mt-4 grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Nombre del proyecto
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Estudio Norte"
              maxLength={60}
              className="min-h-14 w-full border border-[var(--border-1)] bg-[var(--color-background)] px-4 text-[17px] tracking-[-0.02em] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--color-ink)]"
            />
          </label>

          <label className="mt-4 grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              ¿Qué quieres construir?
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Cuéntale a VForge qué debe hacer, para quién es y qué sensación debe transmitir."
              maxLength={600}
              rows={5}
              className="w-full resize-y border border-[var(--border-1)] bg-[var(--color-background)] px-4 py-4 text-[14px] leading-6 outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--color-ink)]"
            />
            <span className="text-right font-mono text-[9px] text-[var(--fg-muted)]">
              {description.length}/600
            </span>
          </label>

          <div className="mt-8 flex items-center justify-between border-b border-[var(--border-1)] pb-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
              03 / Necesidades
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Selección múltiple
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {capabilities.map((item) => {
              const active = modules.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleModule(item)}
                  className={`min-h-10 border px-3 text-[11px] transition ${
                    active
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-background)]"
                      : "border-[var(--border-1)] bg-[var(--color-background)] hover:border-[var(--color-ink)]"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col bg-[var(--color-background)] p-5 sm:p-7">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
              Plan de construcción
            </p>
            <p className="mt-3 text-[24px] font-medium leading-7 tracking-[-0.045em]">
              {name.trim() || "Proyecto sin nombre"}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--fg-secondary)]">
              {selectedTemplate.label}
              {modules.length ? ` · ${modules.length} necesidades` : " · Base inicial"}
            </p>
          </div>

          <div className="my-7 border-y border-[var(--border-1)]">
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-3 border-b border-[var(--border-1)] py-4">
              <span
                className={`h-2 w-2 rounded-full ${
                  githubState === "done"
                    ? "bg-emerald-500"
                    : githubState === "error"
                      ? "bg-red-500"
                      : githubState === "active"
                        ? "animate-pulse bg-[var(--color-ink)]"
                        : "border border-[var(--color-ink)]"
                }`}
              />
              <span className="text-[12px]">Crear repositorio</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                GitHub
              </span>
            </div>
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-3 py-4">
              <span
                className={`h-2 w-2 rounded-full ${
                  vercelState === "done"
                    ? "bg-emerald-500"
                    : vercelState === "waiting"
                      ? "animate-pulse border border-[var(--color-ink)]"
                      : "border border-[var(--color-ink)]"
                }`}
              />
              <span className="text-[12px]">Publicar preview</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                Vercel
              </span>
            </div>
          </div>

          <label className="inline-flex items-start gap-3 text-[11px] leading-4 text-[var(--fg-secondary)]">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-black"
            />
            <span>
              Repositorio privado
              <span className="mt-0.5 block text-[var(--fg-muted)]">
                Sólo tú podrás ver el código en GitHub.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={createApp}
            disabled={creating || !name.trim()}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 bg-[var(--color-ink)] px-5 text-[12px] font-medium text-[var(--color-background)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {creating ? (
              <>
                <IconLoader size={14} className="animate-spin" />
                VForge está construyendo
              </>
            ) : (
              <>
                Construir y publicar <IconArrowR size={13} />
              </>
            )}
          </button>
          <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Tus cuentas · tus repos · tus deployments
          </p>

          <div aria-live="polite" className="mt-auto pt-6">
            {error ? (
              <div
                role="alert"
                className="border border-[var(--color-ink)] bg-[var(--color-surface)] p-4"
              >
                <p className="text-[13px] font-medium">{error.title}</p>
                <p className="mt-2 text-[11px] leading-5 text-[var(--fg-secondary)]">
                  {error.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {error.permission ? (
                    <a
                      href="https://github.com/settings/installations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !min-h-9 !px-3"
                    >
                      Revisar acceso en GitHub
                    </a>
                  ) : null}
                  <a
                    href="/api/auth/github/start?return_to=/workspace"
                    className="btn-ghost !min-h-9 !px-3"
                  >
                    Reconectar
                  </a>
                </div>
              </div>
            ) : null}

            {result?.ok ? (
              <div className="border border-[var(--color-ink)] bg-[var(--color-surface)] p-4">
                <p className="inline-flex items-center gap-2 text-[13px] font-medium">
                  <IconCheck size={13} /> Proyecto publicado
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[var(--fg-secondary)]">
                  Ya vive en tus cuentas. Puedes abrir el código o revisar la
                  publicación.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.repo?.url ? (
                    <a
                      href={result.repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost !min-h-9 !px-3"
                    >
                      <IconGithub size={12} /> Repositorio
                    </a>
                  ) : null}
                  {result.deploy?.url ? (
                    <a
                      href={result.deploy.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !min-h-9 !px-3"
                    >
                      <IconRocket size={12} /> Ver app
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between border-b border-[var(--color-ink)] pb-3">
          <div>
            <p className="mono-label">Historial</p>
            <h3 className="mt-1 text-[22px] font-medium tracking-[-0.04em]">
              Apps generadas
            </h3>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            {apps.length} proyectos
          </span>
        </div>

        {loadingApps ? (
          <div className="grid min-h-28 place-items-center border-x border-b border-[var(--border-1)]">
            <IconLoader size={14} className="animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="border-x border-b border-[var(--border-1)] p-5">
            <p className="text-[13px]">Tu primera publicación aparecerá aquí.</p>
            <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
              Sin proyectos heredados ni cuentas mezcladas.
            </p>
          </div>
        ) : (
          <div className="grid border-l border-[var(--border-1)] md:grid-cols-2">
            {apps.map((app) => (
              <article
                key={app.id}
                className="border-b border-r border-[var(--border-1)] bg-[var(--color-surface)] p-5 transition hover:bg-[var(--color-background)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[17px] font-medium tracking-[-0.03em]">
                      {app.name}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                      {app.template || "base"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    En línea
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {app.repo_url ? (
                    <a
                      href={app.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost !min-h-9 !px-3"
                    >
                      GitHub
                    </a>
                  ) : null}
                  {app.deploy_url ? (
                    <a
                      href={app.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !min-h-9 !px-3"
                    >
                      Abrir app
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
