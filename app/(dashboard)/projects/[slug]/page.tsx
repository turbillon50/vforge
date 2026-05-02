"use client";

import { PROJECTS, VAULT_SECRETS, ACTIVITY } from "@/lib/mock-data";
import { ProjectFavicon } from "@/components/vforge/project-favicon";
import { StatusPill } from "@/components/vforge/status-pill";
import { SectionHeader } from "@/components/vforge/section-header";
import { ActivityRow } from "@/components/vforge/activity-row";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { use } from "react";
import { ExternalLink, Rocket, Activity, Clock, Zap, Key, Lock } from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const project = PROJECTS.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  // Filter secrets for this project
  const projectSecrets = VAULT_SECRETS.filter((s) => s.project === project.id);

  // Filter activity for this project
  const projectActivity = ACTIVITY.filter((a) => a.project === project.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header
        className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between stagger-fade-up"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center gap-4">
          <ProjectFavicon project={project} size="xl" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-vf-fg">
              {project.name}
            </h1>
            <p className="font-mono text-sm text-vf-fg-2 mt-1">
              {project.repo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {project.domain ? (
            <Button
              variant="ghost"
              className="text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
              asChild
            >
              <a
                href={`https://${project.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir dominio
              </a>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-vf-fg-2 cursor-not-allowed opacity-50"
              disabled
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Sin dominio
            </Button>
          )}
          <Button className="bg-vf-green text-black hover:bg-vf-green/90 font-medium">
            <Rocket className="w-4 h-4 mr-2" />
            Desplegar
          </Button>
        </div>
      </header>

      {/* Stat Cards */}
      <section
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-fade-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <Activity className="w-5 h-5 text-vf-green" />
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={project.status} />
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wide text-vf-fg-2">
            Estado
          </div>
        </div>

        <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <Clock className="w-5 h-5 text-vf-green" />
          </div>
          <div className="font-mono text-[32px] leading-none text-vf-fg tracking-tight">
            {project.lastDeploy ?? "—"}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wide text-vf-fg-2">
            Último deploy
          </div>
          {!project.lastDeploy && (
            <div className="mt-1 text-xs text-vf-fg-2">
              Sin deploys aún
            </div>
          )}
        </div>

        <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <Zap className="w-5 h-5 text-vf-green" />
          </div>
          <div className="font-mono text-[32px] leading-none text-vf-fg tracking-tight">
            {project.deploysToday}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wide text-vf-fg-2">
            Deploys hoy
          </div>
          {project.deploysToday === 0 && (
            <div className="mt-1 text-xs text-vf-fg-2">
              Ningún deploy hoy
            </div>
          )}
        </div>
      </section>

      {/* Secrets Section */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <SectionHeader
          title="Secretos del proyecto"
          rightCta={{ label: "Ver Vault", href: "/vault" }}
        />
        {projectSecrets.length > 0 ? (
          <div className="bg-vf-bg-1 border border-vf-border rounded-lg divide-y divide-vf-border">
            {projectSecrets.map((secret) => (
              <div
                key={secret.name}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Key className="w-4 h-4 text-vf-green flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-vf-fg truncate">
                    {secret.name}
                  </div>
                  <div className="text-xs text-vf-fg-2 mt-0.5">
                    {secret.scope === "client" && "Cliente"}
                    {secret.scope === "platform" && "Plataforma"}
                    {secret.scope === "platform-global" && "Global"}
                    {secret.lastUsed && ` · usado hace ${secret.lastUsed}`}
                  </div>
                </div>
                <Lock className="w-3.5 h-3.5 text-vf-fg-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-8 text-center">
            <Key className="w-8 h-8 text-vf-fg-2 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-vf-fg-2">
              Este proyecto no tiene secretos configurados
            </p>
          </div>
        )}
      </section>

      {/* Activity Section */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        <SectionHeader
          title="Actividad de este proyecto"
          rightCta={{ label: "Ver todo", href: "/activity" }}
        />
        {projectActivity.length > 0 ? (
          <div className="bg-vf-bg-1 border border-vf-border rounded-lg px-4 py-2">
            {projectActivity.map((item, idx) => (
              <ActivityRow key={item.id} item={item} delay={idx * 30} />
            ))}
          </div>
        ) : (
          <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-8 text-center">
            <Activity className="w-8 h-8 text-vf-fg-2 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-vf-fg-2">
              Sin actividad reciente para este proyecto
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
