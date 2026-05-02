"use client";

import { Brand } from "@/components/vforge/brand";
import { StatusPill } from "@/components/vforge/status-pill";
import { StatCard } from "@/components/vforge/stat-card";
import { ProjectRow } from "@/components/vforge/project-row";
import { SectionHeader } from "@/components/vforge/section-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { PROJECTS, HUB_STATS } from "@/lib/mock-data";
import { FolderKanban, Rocket, Sparkles, Activity } from "lucide-react";

const STATS_DISPLAY = [
  { label: "PROYECTOS ACTIVOS", value: HUB_STATS.activeProjects.value, trend: HUB_STATS.activeProjects.delta, icon: FolderKanban },
  { label: "DEPLOYS HOY", value: HUB_STATS.deploysToday.value, trend: HUB_STATS.deploysToday.delta, icon: Rocket },
  { label: "FORGE RUNS", value: HUB_STATS.forgeRuns.value, trend: HUB_STATS.forgeRuns.delta, icon: Sparkles },
  { label: "UPTIME PROMEDIO", value: HUB_STATS.uptime.value, trend: HUB_STATS.uptime.delta, icon: Activity },
];

function HubPreview() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-vf-fg-2">Buenos dias,</p>
        <h1 className="text-2xl font-semibold tracking-tight text-vf-fg">
          Luis Humberto
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {STATS_DISPLAY.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <StatusPill status="live" />
        <StatusPill status="building" />
        <StatusPill status="warning" />
        <StatusPill status="error" />
        <StatusPill status="idle" />
      </div>

      {/* Projects */}
      <SectionHeader title="Proyectos recientes" href="/projects" />
      <div className="rounded-lg border border-vf-border overflow-hidden">
        {PROJECTS.slice(0, 3).map((project, i) => (
          <ProjectRow
            key={project.id}
            project={project}
            showBorder={i > 0}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button className="bg-vf-green text-black hover:bg-vf-green/90">
          Desplegar
        </Button>
        <Button variant="outline" className="border-vf-border text-vf-fg hover:bg-vf-bg-1">
          Cancelar
        </Button>
      </div>

      {/* Brand */}
      <Brand size="lg" showTagline />
    </div>
  );
}

export default function ThemePreviewPage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-vf-fg">
              Theme Preview
            </h1>
            <p className="text-sm text-vf-fg-2">
              Visual comparison of dark and light themes at 390px mobile width
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dark theme panel */}
          <div
            data-theme="dark"
            className="rounded-xl overflow-hidden border border-neutral-800"
            style={{ width: "100%", maxWidth: 390 }}
          >
            <div className="bg-[#000000] px-4 py-3 border-b border-neutral-800">
              <span className="text-sm font-medium text-white">Dark Theme</span>
            </div>
            <div className="bg-[#000000]">
              <HubPreview />
            </div>
          </div>

          {/* Light theme panel */}
          <div
            data-theme="light"
            className="rounded-xl overflow-hidden border border-neutral-200"
            style={{ width: "100%", maxWidth: 390 }}
          >
            <div className="bg-[#FFFFFF] px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-black">Light Theme</span>
            </div>
            <div className="bg-[#FFFFFF]">
              <HubPreview />
            </div>
          </div>
        </div>

        {/* Contrast audit info */}
        <div className="rounded-lg border border-vf-border bg-vf-bg-1 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vf-fg">Contrast Audit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-vf-fg-2">fg / bg</p>
              <p className="text-vf-fg font-mono">16:1+ (both)</p>
            </div>
            <div className="space-y-1">
              <p className="text-vf-fg-2">fg-1 / bg</p>
              <p className="text-vf-fg font-mono">4.5:1+ (body)</p>
            </div>
            <div className="space-y-1">
              <p className="text-vf-fg-2">fg-2 / bg</p>
              <p className="text-vf-fg font-mono">3:1+ (captions)</p>
            </div>
            <div className="space-y-1">
              <p className="text-vf-fg-2">black on green</p>
              <p className="text-vf-fg font-mono">12.4:1 (CTA)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
