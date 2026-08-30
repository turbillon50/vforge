"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconActivity,
  IconExtLink,
  IconGithub,
  IconRefresh,
  IconRocket,
  IconWarn,
} from "@/components/brand/VFIcons";

type App = {
  id: string;
  name: string;
  repo_url: string | null;
  deploy_url: string | null;
  template: string | null;
  created_at: string;
};

type ApiResponse = {
  apps: App[];
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function MemberActivityView() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forja/apps", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: ApiResponse = await res.json();
      setApps(data.apps);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const renderLoading = () => (
    <div className="p-4 text-center">
      <IconRefresh className="animate-spin inline-block w-6 h-6 text-black" />
      <p className="mt-2 text-black">Cargando...</p>
    </div>
  );

  const renderError = () => (
    <div className="p-4 text-center bg-white">
      <IconWarn className="w-8 h-8 text-black inline-block" />
      <p className="mt-2 text-black">No se pudo cargar la actividad: {error}</p>
      <button
        onClick={fetchApps}
        className="mt-4 bg-black text-white px-4 py-2 rounded"
      >
        Reintentar
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="p-4 text-center bg-white">
      <IconActivity className="w-12 h-12 text-black inline-block" />
      <p className="mt-2 text-black">No hay actividad en tu espacio todavía.</p>
    </div>
  );

  const renderTimeline = () => (
    <ul className="space-y-6 border-l-2 border-black pl-4">
      {apps!.map((app) => (
        <li key={app.id} className="relative">
          <span
            className="absolute -left-3 top-2 w-4 h-4 bg-black rounded-full"
            aria-hidden="true"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconRocket className="w-5 h-5 text-black" />
              <h3 className="text-black font-medium">{app.name}</h3>
            </div>
            <time dateTime={app.created_at} className="text-sm text-black">
              {formatDate(app.created_at)}
            </time>
          </div>
          <p className="mt-1 text-black">
            {app.repo_url && app.deploy_url
              ? "Repositorio y despliegue configurados."
              : app.repo_url
                ? "Repositorio configurado."
                : app.deploy_url
                  ? "Despliegue configurado."
                  : "Aplicación basada en plantilla."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {app.repo_url && (
              <a
                href={app.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-black text-white rounded"
              >
                <IconGithub className="w-4 h-4" />
                Repo
              </a>
            )}
            {app.deploy_url && (
              <a
                href={app.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-black text-white rounded"
              >
                <IconExtLink className="w-4 h-4" />
                Deploy
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="max-w-4xl mx-auto p-4 bg-white">
      <PageHeader
        eyebrow="Actividad de tu espacio"
        title="Actividad."
        description="Revisa las últimas aplicaciones que has creado o actualizado en tu espacio."
        actions={
          <button
            type="button"
            onClick={fetchApps}
            disabled={loading}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        }
      />

      <div className="mt-6">
        {loading && renderLoading()}
        {error && !loading && renderError()}
        {!loading && apps && apps.length === 0 && renderEmpty()}
        {!loading && apps && apps.length > 0 && renderTimeline()}
      </div>
    </section>
  );
}
