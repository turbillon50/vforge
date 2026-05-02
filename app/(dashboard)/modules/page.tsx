"use client";

import { useState } from "react";
import { MODULES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Eye,
  Search,
  Compass,
  Activity,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart,
  Database,
  Users,
  Shield,
  Calculator,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, LucideIcon> = {
  Eye,
  Search,
  Compass,
  Activity,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart,
  Database,
  Users,
  Shield,
  Calculator,
};

const stateConfig = {
  installed: {
    label: "Instalado",
    className: "bg-vf-green-dim text-vf-green",
  },
  available: {
    label: "Disponible",
    className: "bg-transparent text-vf-fg-2 border border-vf-border",
  },
  beta: {
    label: "Beta",
    className: "bg-vf-warning/10 text-vf-warning",
  },
};

type FilterType = "all" | "installed" | "available" | "beta";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "installed", label: "Instalados" },
  { id: "available", label: "Disponibles" },
  { id: "beta", label: "Beta" },
];

export default function ModulesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredModules = MODULES.filter((module) => {
    if (activeFilter === "all") return true;
    return module.state === activeFilter;
  });

  const installedCount = MODULES.filter((m) => m.state === "installed").length;
  const availableCount = MODULES.filter((m) => m.state === "available").length;
  const totalCount = MODULES.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Ecosistema
        </p>
        <h1
          className="text-2xl md:text-3xl font-semibold tracking-tight text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Módulos
        </h1>
        <p
          className="text-sm text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          {totalCount} instalados o disponibles · genera más con Forge
        </p>
      </header>

      {/* Filter Chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
              activeFilter === filter.id
                ? "bg-vf-green text-black"
                : "bg-vf-bg-1 text-vf-fg-2 hover:bg-vf-bg-2 hover:text-vf-fg"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Modules Grid */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredModules.map((module, index) => {
          const Icon = iconMap[module.icon] ?? Activity;
          const config = stateConfig[module.state];

          return (
            <div
              key={module.id}
              className={cn(
                "bg-vf-bg-1 border border-vf-border rounded-lg p-5",
                "hover:border-vf-border-1 hover:bg-vf-bg-2 transition-colors cursor-pointer",
                "stagger-fade-up"
              )}
              style={{ animationDelay: `${200 + index * 30}ms` }}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-vf-green-dim flex items-center justify-center">
                  <Icon className="w-4 h-4 text-vf-green" />
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full font-medium",
                    config.className
                  )}
                >
                  {config.label}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold tracking-tight text-vf-fg mb-1">
                {module.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-vf-fg-1 mb-4 line-clamp-2">
                {module.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {module.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[10px] font-mono uppercase text-vf-fg-2 bg-vf-bg-2 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Special Card: Generate New Module */}
        <div
          className={cn(
            "bg-vf-bg-1 border border-dashed border-vf-border rounded-lg p-5",
            "hover:border-vf-green/50 hover:bg-vf-bg-2 transition-colors",
            "stagger-fade-up flex flex-col"
          )}
          style={{ animationDelay: `${200 + filteredModules.length * 30}ms` }}
        >
          {/* Top Row: Icon */}
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-vf-green-dim flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-vf-green" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold tracking-tight text-vf-fg mb-1">
            Generar módulo nuevo
          </h3>

          {/* Description */}
          <p className="text-sm text-vf-fg-1 mb-4 flex-1">
            Describe qué necesitas y Forge creará un módulo personalizado para tu ecosistema.
          </p>

          {/* CTA Button */}
          <Link
            href="/forge"
            className={cn(
              "inline-flex items-center justify-center gap-2 w-full",
              "px-4 py-2.5 rounded-lg text-sm font-medium",
              "bg-vf-green text-black hover:bg-vf-green/90 transition-colors"
            )}
          >
            Pedirle a Forge
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
