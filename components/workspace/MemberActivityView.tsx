"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { VFIcons } from "@/components/VFIcons";

/**
 * Types
 */
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

/**
 * Helper to format date in a readable way
 */
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

/**
 * MemberActivityView
 */
export const MemberActivityView = () => {
  const [apps, setApps] = useState<App[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forja/apps", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data: ApiResponse = await res.json();
      setApps(data.apps);
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-4 bg-[var(--color-skeleton-bg)] rounded animate-pulse"
        />
      ))}
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center gap-4 p-6 bg-[var(--color-bg-light)] rounded">
      <VFIcons.AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
      <p className="text-[var(--color-text)]">
        No se pudo cargar la actividad: {error}
      </p>
      <Button variant="secondary" onClick={fetchApps}>
        Reintentar
      </Button>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center gap-2 p-6 bg-[var(--color-bg-light)] rounded">
      <VFIcons.Inbox className="w-12 h-12 text-[var(--color-muted)]" />
      <p className="text-[var(--color-muted)]">
        No hay actividad en tu espacio todavía.
      </p>
    </div>
  );

  const renderTimeline = () => (
    <ul className="space-y-6 border-l-2 border-[var(--color-divider)] pl-4">
      {apps!.map((app) => (
        <li key={app.id} className="relative">
          <span
            className="absolute -left-3 top-1 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <VFIcons.Circle className="w-3 h-3 text-white" />
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <VFIcons.App className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="text-[var(--color-text)] font-medium">{app.name}</h3>
            </div>
            <time
              dateTime={app.created_at}
              className="text-sm text-[var(--color-muted)]"
            >
              {formatDate(app.created_at)}
            </time>
          </div>

          <p className="mt-1 text-[var(--color-text)]">
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
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-[var(--color-bg-accent)] rounded hover:bg-[var(--color-bg-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <VFIcons.GitBranch className="w-4 h-4" />
                Repositorio
              </a>
            )}
            {app.deploy_url && (
              <a
                href={app.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-[var(--color-bg-accent)] rounded hover:bg-[var(--color-bg-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <VFIcons.CloudUpload className="w-4 h-4" />
                Despliegue
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="max-w-4xl mx-auto p-4">
      <PageHeader
        eyebrow="Actividad de tu espacio"
        title="Actividad."
        description="Revisa las últimas aplicaciones que has creado o actualizado en tu espacio."
      >
        <Button variant="primary" onClick={fetchApps} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </Button>
      </PageHeader>

      <div className="mt-6">
        {loading && renderSkeleton()}
        {error && !loading && renderError()}
        {!loading && apps && apps.length === 0 && renderEmpty()}
        {!loading && apps && apps.length > 0 && renderTimeline()}
      </div>
    </section>
  );
};