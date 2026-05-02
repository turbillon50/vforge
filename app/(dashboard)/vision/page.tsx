"use client";

import { useState } from "react";
import { RECENT_VISION } from "@/lib/mock-data";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { Eye, Folder, Clipboard, Camera, Upload, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const methodTiles = [
  {
    icon: Clipboard,
    title: "Pegar texto",
    description: "Copia la URL o ruta y pégala aquí",
  },
  {
    icon: Camera,
    title: "Foto del archivo .env",
    description: "Captura desde cámara o galería",
  },
  {
    icon: Upload,
    title: "Subir .env",
    description: "Arrastra o selecciona un archivo",
  },
  {
    icon: Mic,
    title: "Dictado por voz",
    description: "Di la URL del repositorio",
  },
];

function getScoreColor(score: string): "green" | "warning" | "error" {
  const numScore = parseInt(score.split("/")[0], 10);
  if (numScore >= 8) return "green";
  if (numScore >= 5) return "warning";
  return "error";
}

const scoreStyles = {
  green: "bg-vf-green/10 text-vf-green border-vf-green/20",
  warning: "bg-vf-warning/10 text-vf-warning border-vf-warning/20",
  error: "bg-vf-error/10 text-vf-error border-vf-error/20",
};

export default function VisionPage() {
  const [repoUrl, setRepoUrl] = useState("");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Herramienta · Claude
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Repo Vision
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Diagrama y mockup visual de cualquier repo en 2 min
        </p>
      </header>

      {/* Big Input Card */}
      <section
        className="bg-vf-bg-1 border border-vf-border rounded-xl p-6 space-y-5 stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        <div className="space-y-3">
          <label
            htmlFor="repo-url"
            className="block text-sm font-medium text-vf-fg"
          >
            URL del repositorio
          </label>
          <input
            id="repo-url"
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/usuario/repo o ruta local"
            className="w-full bg-vf-bg-2 border border-vf-border-1 focus:border-vf-border-2 rounded-md px-4 py-3 text-vf-fg placeholder:text-vf-fg-2 font-mono text-sm outline-none transition-colors"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="w-full sm:w-auto bg-vf-green hover:bg-vf-green/90 text-black font-medium"
            >
              <Eye className="w-4 h-4 mr-2" />
              Analizar
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-vf-border text-vf-fg-1 hover:bg-vf-bg-2 hover:text-vf-fg"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Pegar del portapapeles
            </Button>
          </div>
        </div>

        {/* Method Tiles */}
        <div className="pt-4 border-t border-vf-border">
          <p className="text-sm text-vf-fg-1 mb-4">O elige cómo capturarlo</p>
          <div className="grid grid-cols-2 gap-3">
            {methodTiles.map((tile, index) => (
              <button
                key={tile.title}
                type="button"
                className="flex items-start gap-3 p-4 rounded-lg border border-vf-border bg-transparent hover:bg-vf-bg-2 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-md bg-vf-bg-2 flex items-center justify-center shrink-0">
                  <tile.icon className="w-4 h-4 text-vf-fg-1" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-vf-fg">
                    {tile.title}
                  </div>
                  <div className="text-xs text-vf-fg-2 line-clamp-2">
                    {tile.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Analysis Section */}
      <section className="space-y-4">
        <h2
          className="text-[13px] uppercase tracking-wide text-vf-fg-2 font-medium stagger-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          Análisis recientes
        </h2>
        <div className="space-y-1">
          {RECENT_VISION.map((item, index) => {
            const scoreColor = getScoreColor(item.score);
            return (
              <button
                key={item.repo}
                type="button"
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-vf-bg-1 rounded-lg transition-colors stagger-fade-up"
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div className="w-9 h-9 rounded-md bg-vf-bg-1 flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 text-vf-fg-2" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-mono text-sm text-vf-fg truncate">
                    {item.repo}
                  </div>
                </div>
                <div
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-mono border shrink-0",
                    scoreStyles[scoreColor]
                  )}
                >
                  {item.score}
                </div>
                <div className="font-mono text-xs text-vf-fg-2 shrink-0 hidden sm:block">
                  {item.duration}
                </div>
                <div className="font-mono text-xs text-vf-fg-2 shrink-0">
                  {item.time}
                </div>
              </button>
            );
          })}
        </div>

        {RECENT_VISION.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <ForgeOrb size={120} state="idle" />
            <p className="text-sm text-vf-fg-1 text-center">
              No hay análisis recientes. Ingresa una URL para comenzar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
