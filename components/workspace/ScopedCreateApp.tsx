"use client";

import { useCallback, useEffect, useState } from "react";
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
  repo?: { url?: string };
  deploy?: { url?: string | null };
}

const templates = [
  { value: "landing", label: "Landing" },
  { value: "tienda", label: "Tienda" },
  { value: "portafolio", label: "Portafolio" },
  { value: "blanco", label: "Lienzo en blanco" },
];

export function ScopedCreateApp() {
  const [apps, setApps] = useState<GeneratedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("landing");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShipResponse | null>(null);

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
          modules: [],
        }),
      });
      const payload = (await response.json()) as ShipResponse;

      if (!response.ok || !payload.ok) {
        const message =
          payload.error === "connect_github"
            ? "Conecta GitHub antes de crear una app."
            : payload.error === "connect_vercel"
              ? "Conecta Vercel antes de crear una app."
              : payload.error === "repo_create"
                ? "GitHub no permitió crear el repositorio."
                : payload.error === "deploy"
                  ? "El repositorio se creó, pero Vercel no pudo desplegarlo."
                  : "No pudimos crear la app. Intenta nuevamente.";
        setError(message);
        return;
      }

      setResult(payload);
      setName("");
      setDescription("");
      await loadApps();
    } catch {
      setError("Se perdió la conexión durante la creación. Intenta nuevamente.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-12 sm:mt-16" aria-labelledby="create-app-title">
      <div className="border-b border-[var(--color-ink)] pb-4">
        <p className="mono-label">Paso 02</p>
        <h2
          id="create-app-title"
          className="mt-2 text-[28px] font-medium tracking-[-0.05em]"
        >
          Crea tu primera app
        </h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--fg-secondary)]">
          Esta primera prueba crea un repositorio en tu GitHub y una URL publicada
          en tu Vercel. Todavía es una base inicial, no una aplicación completa.
        </p>
      </div>

      <div className="border-x border-b border-[var(--color-ink)] bg-[var(--color-surface)] p-5 sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Nombre
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mi primera app"
              maxLength={60}
              className="min-h-12 w-full border border-[var(--border-1)] bg-[var(--color-background)] px-4 text-[14px] outline-none transition focus:border-[var(--color-ink)]"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Plantilla
            </span>
            <select
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              className="min-h-12 w-full border border-[var(--border-1)] bg-[var(--color-background)] px-4 text-[14px] outline-none transition focus:border-[var(--color-ink)]"
            >
              {templates.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Descripción
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe en una frase qué debe comunicar."
            maxLength={600}
            rows={4}
            className="w-full resize-y border border-[var(--border-1)] bg-[var(--color-background)] px-4 py-3 text-[14px] leading-6 outline-none transition focus:border-[var(--color-ink)]"
          />
        </label>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-3 text-[12px] text-[var(--fg-secondary)]">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
              className="h-4 w-4 accent-black"
            />
            Repositorio privado
          </label>
          <button
            type="button"
            onClick={createApp}
            disabled={creating || !name.trim()}
            className="btn-primary !min-h-11 disabled:opacity-50"
          >
            {creating ? (
              <>
                <IconLoader size={13} className="animate-spin" /> Creando
              </>
            ) : (
              <>
                Crear repo y publicar <IconArrowR size={12} />
              </>
            )}
          </button>
        </div>

        <div aria-live="polite">
          {error ? (
            <p role="alert" className="mt-4 text-[12px] leading-5">
              {error}
            </p>
          ) : null}

          {result?.ok ? (
            <div className="mt-5 border border-[var(--color-ink)] p-4">
              <p className="inline-flex items-center gap-2 text-[13px] font-medium">
                <IconCheck size={13} /> App creada
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.repo?.url ? (
                  <a
                    href={result.repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !min-h-10 !px-3"
                  >
                    <IconGithub size={12} /> Abrir repositorio
                  </a>
                ) : null}
                {result.deploy?.url ? (
                  <a
                    href={result.deploy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary !min-h-10 !px-3"
                  >
                    <IconRocket size={12} /> Abrir publicación
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Apps generadas
        </p>
        {loadingApps ? (
          <div className="mt-3 grid min-h-24 place-items-center border border-[var(--border-1)]">
            <IconLoader size={14} className="animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <p className="mt-3 border border-[var(--border-1)] p-4 text-[12px] text-[var(--fg-secondary)]">
            Tu primera app aparecerá aquí después de publicarla.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {apps.map((app) => (
              <article
                key={app.id}
                className="border border-[var(--border-1)] bg-[var(--color-surface)] p-4"
              >
                <p className="text-[16px] font-medium">{app.name}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                  {app.template || "base"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
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
                      Publicación
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
