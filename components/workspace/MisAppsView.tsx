"use client";
import { useEffect, useState } from "react";

type App = {
  id: string;
  name: string;
  repo_url: string | null;
  deploy_url: string | null;
  template: string | null;
  created_at: string;
};

export function MisAppsView() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forja/apps")
      .then((r) => (r.ok ? r.json() : { apps: [] }))
      .then((d) => setApps(d.apps || []))
      .catch(() => {
        setError("No se pudo cargar la lista de apps.");
        setApps([]);
      });
  }, []);

  return (
    <main className="bg-[var(--color-background)] text-[var(--color-ink)] mx-auto max-w-4xl w-full px-5 md:px-8 py-12">
      <p className="font-mono text-xs uppercase text-[var(--fg-secondary)] tracking-wider">
        Tu trabajo
      </p>
      <h1 className="mt-3 mb-6 text-4xl font-bold">Mis apps</h1>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-[var(--border-1)] bg-white p-4 text-[var(--fg-secondary)]"
        >
          {error}
        </div>
      )}

      {apps === null ? (
        <div
          role="status"
          className="flex items-center justify-center py-8 text-sm text-[var(--fg-secondary)]"
        >
          Cargando…
        </div>
      ) : apps.length === 0 ? (
        <section className="rounded-md border border-[var(--border-1)] bg-white p-8 text-center">
          <p className="text-base text-[var(--fg-secondary)]">
            Aún no creas ninguna app.
          </p>
          <a
            href="/workspace#crear"
            className="inline-block mt-4 rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Crear mi primera app &rarr;
          </a>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {apps.map((a) => (
            <article
              key={a.id}
              className="rounded-md border border-[var(--border-1)] overflow-hidden flex flex-col h-full bg-white"
            >
              {a.deploy_url && (
                <iframe
                  title={a.name}
                  src={a.deploy_url}
                  className="h-40 w-full border-b border-[var(--border-1)]"
                  loading="lazy"
                />
              )}
              <div className="p-4 flex flex-col flex-1">
                <h2 className="text-base font-semibold">{a.name}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {a.deploy_url && (
                    <a
                      href={a.deploy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-ink)] hover:underline"
                    >
                      Ver en vivo &rarr;
                    </a>
                  )}
                  {a.repo_url && (
                    <a
                      href={a.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-ink)] hover:underline"
                    >
                      Repo &rarr;
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}