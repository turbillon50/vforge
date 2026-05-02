"use client";

import { useState, useMemo } from "react";
import { ProjectRow } from "@/components/vforge/project-row";
import { PROJECTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type FilterType = "all" | "live" | "warning" | "error" | "v-family" | "v-momentum";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "live", label: "Live" },
  { id: "warning", label: "Warning" },
  { id: "error", label: "Error" },
  { id: "v-family", label: "V-Family" },
  { id: "v-momentum", label: "V-Momentum" },
];

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredProjects = useMemo(() => {
    switch (activeFilter) {
      case "live":
        return PROJECTS.filter((p) => p.status === "live");
      case "warning":
        return PROJECTS.filter((p) => p.status === "building");
      case "error":
        return PROJECTS.filter((p) => p.status === "error");
      case "v-family":
        return PROJECTS.filter((p) => 
          p.name.toLowerCase().startsWith("v") || p.slug.startsWith("v")
        );
      case "v-momentum":
        return PROJECTS.filter((p) => p.slug === "vmomentum");
      default:
        return PROJECTS;
    }
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Biblioteca
        </p>
        <h1
          className="text-2xl md:text-3xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Tus {PROJECTS.length} proyectos
        </h1>
        <p
          className="text-sm text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Filtra por estado o familia
        </p>
      </header>

      {/* Filter Chips - Horizontal Scrollable */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
              "min-h-[44px] touch-manipulation",
              activeFilter === filter.id
                ? "bg-vf-green text-black"
                : "bg-vf-bg-1 text-vf-fg-1 hover:bg-vf-bg-2 active:bg-vf-bg-2"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Project List */}
      <section className="stagger-fade-up" style={{ animationDelay: "200ms" }}>
        {filteredProjects.length === 0 ? (
          <div className="py-12 text-center text-vf-fg-2">
            No hay proyectos con este filtro
          </div>
        ) : (
          <div className="-mx-4 md:mx-0">
            {filteredProjects.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                delay={250 + index * 40}
                showBorder={index > 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
