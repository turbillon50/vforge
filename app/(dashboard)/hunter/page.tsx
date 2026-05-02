"use client";

import { useState } from "react";
import { RECENT_HUNTER } from "@/lib/mock-data";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "frameworks", label: "Frameworks" },
  { id: "boilerplates", label: "Boilerplates" },
  { id: "awesome", label: "Awesome lists" },
  { id: "npm", label: "NPM packages" },
];

export default function HunterPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Herramienta · GitHub · NPM
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Repo Hunter
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Búsqueda semántica entre miles de repos
        </p>
      </header>

      {/* Big Search Input */}
      <div
        className="bg-vf-bg-1 border border-vf-border rounded-xl p-5 md:p-6 space-y-4 stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        <div className="space-y-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué tipo de repo buscas? Describe en lenguaje natural…"
            rows={3}
            className={cn(
              "w-full bg-vf-bg-2 border border-vf-border-1 rounded-lg px-4 py-3",
              "text-sm text-vf-fg placeholder:text-vf-fg-2",
              "focus:outline-none focus:border-vf-border-2 focus:ring-1 focus:ring-vf-green/20",
              "resize-none transition-colors"
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="bg-vf-green hover:bg-vf-green/90 text-black font-medium h-11 px-6 w-full sm:w-auto"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-2 -mx-1 px-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-vf-green text-black"
                  : "bg-vf-bg-2 text-vf-fg-1 hover:bg-vf-bg-3 hover:text-vf-fg"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-[13px] uppercase tracking-wide text-vf-fg-2 font-medium mb-4">
          Búsquedas recientes
        </h2>
        {RECENT_HUNTER.length > 0 ? (
          <div className="space-y-1">
            {RECENT_HUNTER.map((item, index) => (
              <button
                key={item.query}
                type="button"
                className={cn(
                  "flex items-center gap-4 w-full px-4 py-3.5 text-left",
                  "hover:bg-vf-bg-1 active:bg-vf-bg-1 transition-colors rounded-lg",
                  "stagger-fade-up"
                )}
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div className="w-9 h-9 rounded-md bg-vf-bg-2 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-vf-fg-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-vf-fg truncate">{item.query}</div>
                </div>
                <span className="font-mono text-[11px] bg-vf-bg-2 text-vf-fg-1 px-2 py-1 rounded shrink-0">
                  {item.results} resultados
                </span>
                <span className="font-mono text-xs text-vf-fg-2 shrink-0">
                  {item.time}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <ForgeOrb size={120} state="idle" />
            <p className="text-sm text-vf-fg-1 text-center">
              No hay búsquedas recientes. Describe lo que buscas arriba.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
