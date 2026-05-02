"use client";

import { useState } from "react";
import { VAULT_SECRETS, PROJECTS } from "@/lib/mock-data";
import { Lock, Clipboard, Camera, Upload, Mic, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CameraCapture,
  FileDropZone,
  VoiceRecorder,
  PasteText,
  type CameraCaptureResult,
  type FileDropResult,
  type VoiceRecorderResult,
  type PasteTextResult,
} from "@/components/web-apis";

type FilterType = "all" | "castores" | "vandefi" | "urmah" | "global";
type CaptureMethod = "paste" | "camera" | "upload" | "voice" | null;

interface CapturedDraft {
  method: CaptureMethod;
  summary: string;
  capturedAt: Date;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "castores", label: "Castores" },
  { key: "vandefi", label: "VanDeFi" },
  { key: "urmah", label: "URMAH" },
  { key: "global", label: "Globales" },
];

const METHOD_TILES: {
  method: Exclude<CaptureMethod, null>;
  icon: typeof Clipboard;
  title: string;
  description: string;
}[] = [
  {
    method: "paste",
    icon: Clipboard,
    title: "Pegar texto",
    description: "Copia y pega el valor del secreto",
  },
  {
    method: "camera",
    icon: Camera,
    title: "Foto del archivo .env",
    description: "Escanea con la cámara del móvil",
  },
  {
    method: "upload",
    icon: Upload,
    title: "Subir .env",
    description: "Arrastra o selecciona un archivo",
  },
  {
    method: "voice",
    icon: Mic,
    title: "Dictado por voz",
    description: "Dicta el nombre y valor del secreto",
  },
];

export default function VaultPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeMethod, setActiveMethod] = useState<CaptureMethod>(null);
  const [drafts, setDrafts] = useState<CapturedDraft[]>([]);

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

  function pushDraft(method: Exclude<CaptureMethod, null>, summary: string) {
    setDrafts((prev) => [
      { method, summary, capturedAt: new Date() },
      ...prev,
    ]);
  }

  function handlePaste(r: PasteTextResult) {
    pushDraft("paste", `${r.text.length} caracteres pegados`);
  }
  function handleCamera(r: CameraCaptureResult) {
    pushDraft(
      "camera",
      `Foto ${r.width}×${r.height} (${(r.blob.size / 1024).toFixed(0)} KB)`,
    );
  }
  function handleUpload(r: FileDropResult) {
    pushDraft(
      "upload",
      `${r.file.name} · ${(r.file.size / 1024).toFixed(1)} KB`,
    );
  }
  function handleVoice(r: VoiceRecorderResult) {
    pushDraft(
      "voice",
      `${r.durationSec.toFixed(1)}s · ${r.mimeType.split(";")[0]}`,
    );
  }

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
                : "bg-vf-bg-1 text-vf-fg-1 border-vf-border hover:bg-vf-bg-2 hover:text-vf-fg",
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
              key={tile.method}
              onClick={() => setActiveMethod(tile.method)}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-lg",
                "bg-vf-bg border border-vf-border",
                "hover:bg-vf-bg-2 hover:border-vf-border-1 transition-colors duration-150",
                "text-left min-h-[44px]",
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

        {/* Drafts pending backend */}
        {drafts.length > 0 && (
          <div className="mt-5 pt-5 border-t border-vf-border space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2">
              Capturas pendientes · esperando backend
            </p>
            {drafts.slice(0, 5).map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm bg-vf-bg-2 border border-vf-border rounded-md px-3 py-2"
              >
                <Check className="w-4 h-4 text-vf-green-quiet flex-shrink-0" />
                <span className="font-mono text-xs text-vf-fg-2 uppercase">
                  {d.method}
                </span>
                <span className="text-vf-fg flex-1 min-w-0 truncate">
                  {d.summary}
                </span>
                <span className="font-mono text-[10px] text-vf-fg-3 flex-shrink-0">
                  {d.capturedAt.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
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
                  index > 0 && "border-t border-vf-border",
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

      {/* Modals */}
      {activeMethod === "paste" && (
        <PasteText
          title="Pegar secreto"
          hint="KEY=valor o cualquier texto"
          placeholder="STRIPE_SECRET_KEY=sk_live_..."
          onAccept={handlePaste}
          onClose={() => setActiveMethod(null)}
          validate={(text) =>
            text.length > 50_000 ? "Texto demasiado largo (máx 50 KB)" : null
          }
        />
      )}
      {activeMethod === "camera" && (
        <CameraCapture
          title="Foto del .env"
          hint="Encuadra el archivo o el sticker con la clave"
          preferredFacing="environment"
          onCapture={handleCamera}
          onClose={() => setActiveMethod(null)}
        />
      )}
      {activeMethod === "upload" && (
        <FileDropZone
          title="Subir archivo .env"
          hint="Arrastra, pega o selecciona el .env"
          accept=".env,.txt,text/plain,application/octet-stream"
          readAsText
          onAccept={handleUpload}
          onClose={() => setActiveMethod(null)}
        />
      )}
      {activeMethod === "voice" && (
        <VoiceRecorder
          title="Dictar secreto"
          hint="Di el nombre y el valor"
          maxDurationSec={45}
          onCapture={handleVoice}
          onClose={() => setActiveMethod(null)}
        />
      )}
    </div>
  );
}
