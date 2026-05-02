"use client";

import { StatCard } from "@/components/vforge/stat-card";
import { SectionHeader } from "@/components/vforge/section-header";
import { ProjectRow } from "@/components/vforge/project-row";
import { ActivityRow } from "@/components/vforge/activity-row";
import { PROJECTS, ACTIVITY, HUB_STATS } from "@/lib/mock-data";
import {
  FolderKanban,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function HubPage() {
  const recentProjects = PROJECTS.slice(0, 4);
  const recentActivity = ACTIVITY.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Buenos días, Luis
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Tu fábrica
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          8 proyectos · 6 en producción · 2 en construcción
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Proyectos activos"
          value={HUB_STATS.activeProjects.value}
          deltaLabel={HUB_STATS.activeProjects.delta}
          deltaTone={HUB_STATS.activeProjects.tone}
          delay={150}
        />
        <StatCard
          icon={Rocket}
          label="Deploys hoy"
          value={HUB_STATS.deploysToday.value}
          deltaLabel={HUB_STATS.deploysToday.delta}
          deltaTone={HUB_STATS.deploysToday.tone}
          delay={200}
        />
        <StatCard
          icon={Sparkles}
          label="Forge runs"
          value={HUB_STATS.forgeRuns.value}
          deltaLabel={HUB_STATS.forgeRuns.delta}
          deltaTone={HUB_STATS.forgeRuns.tone}
          delay={250}
        />
        <StatCard
          icon={TrendingUp}
          label="Uptime promedio"
          value={HUB_STATS.uptime.value}
          deltaLabel={HUB_STATS.uptime.delta}
          deltaTone={HUB_STATS.uptime.tone}
          delay={300}
        />
      </section>

      {/* Recent Projects */}
      <section>
        <SectionHeader
          title="Proyectos recientes"
          rightCta={{ label: "Ver todos", href: "/projects" }}
        />
        <div className="divide-y divide-vf-border">
          {recentProjects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              delay={350 + index * 50}
            />
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <SectionHeader
          title="Actividad reciente"
          rightCta={{ label: "Ver todo", href: "/activity" }}
        />
        <div className="divide-y divide-vf-border/50">
          {recentActivity.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              delay={550 + index * 50}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
