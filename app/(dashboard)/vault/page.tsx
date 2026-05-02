"use client";

import { useState } from "react";
import { VAULT_SECRETS, PROJECTS } from "@/lib/mock-data";
import { Lock, Clipboard, Camera, Upload, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FilterType = "all" | "castores" | "vandefi" | "urmah" | "global";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "castores", label: "Castores" },
  { key: "vandefi", label: "VanDeFi" },
  { key: "urmah", label: "URMAH" },
  { key: "global", label: "Globales" },
];

const METHOD_TILES = [
  {
    icon: Clipboard,
    title: "Pegar texto",
    description: "Copia y pega el valor del secreto",
  },
  {
    icon: Camera,
    title: "Foto del archivo .env",
    description: "Escanea con la cámara del móvil",
  },
  {
    icon: Upload,
    title: "Subir .env",
    description: "Arrastra o selecciona un archivo",
  },
  {
    icon: Mic,
    title: "Dictado por voz",
    description: "Dicta el nombre y valor del secreto",
  },
];

export default function VaultPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredSecrets = VAULT_SECRETS.filter((secret) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "global") return secret.project === null;
    return secret.project === activeFilter;
  });

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Global";
    const project = PROJECTS.find((p) => p.id === projectId);
    return project?.name || projectId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          BÓVEDA · 0-knowledge
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Tus secretos
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Cifrados extremo a extremo · acceso por 2FA
        </p>
      </header>

      {/* Filter Chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
              "border min-h-[44px]",
              activeFilter === filter.key
                ? "bg-vf-green text-black border-vf-green"
                : "bg-vf-bg-1 text-vf-fg-1 border-vf-border hover:bg-vf-bg-2 hover:text-vf-fg"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Add Secret Card */}
      <div
        className="bg-vf-bg-1 border border-vf-border rounded-lg p-5 stagger-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-lg font-semibold text-vf-fg mb-1">
          Agregar secreto
        </h2>
        <p className="text-sm text-vf-fg-2 mb-4">Elige cómo lo capturas</p>

        <div className="grid grid-cols-2 gap-3">
          {METHOD_TILES.map((tile) => (
            <button
              key={tile.title}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-lg",
                "bg-vf-bg border border-vf-border",
                "hover:bg-vf-bg-2 transition-colors duration-150",
                "text-left min-h-[44px]"
              )}
            >
              <tile.icon className="w-5 h-5 text-vf-green" />
              <div>
                <div className="text-sm font-medium text-vf-fg">
                  {tile.title}
                </div>
                <div className="text-xs text-vf-fg-2 mt-0.5">
                  {tile.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Secrets List */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "250ms" }}
      >
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 mb-3">
          {filteredSecrets.length} secreto{filteredSecrets.length !== 1 ? "s" : ""}
        </h3>

        <div className="bg-vf-bg-1 border border-vf-border rounded-lg overflow-hidden">
          {filteredSecrets.length === 0 ? (
            <div className="p-6 text-center text-vf-fg-2 text-sm">
              No hay secretos en esta categoría
            </div>
          ) : (
            filteredSecrets.map((secret, index) => (
              <div
                key={secret.name}
                className={cn(
                  "flex items-center gap-4 px-4 py-4",
                  "hover:bg-vf-bg-2 transition-colors duration-150",
                  index > 0 && "border-t border-vf-border"
                )}
              >
                <Lock className="w-5 h-5 text-vf-fg-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-vf-fg truncate">
                    {secret.name}
                  </div>
                  <div className="font-mono text-[11px] text-vf-fg-2 truncate mt-0.5">
                    {getProjectName(secret.project)}
                    {secret.lastUsed && ` · usado hace ${secret.lastUsed}`}
                    {secret.injectedTo.length > 0 &&
                      ` · inyectado a ${secret.injectedTo.join(", ")}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-vf-fg-1 hover:text-vf-fg min-h-[44px]"
                >
                  Ver
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
