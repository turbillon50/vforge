"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { extractArchiveText } from "@/lib/live/archive-text";
import {
  IconCheck,
  IconCode,
  IconDownload,
  IconFile,
  IconLoader,
  IconMaximize,
  IconUpload,
  IconX,
} from "@/components/brand/VFIcons";

type ContextTab = "status" | "content" | "archive";

interface ContextPayload {
  project: {
    name: string;
    description: string | null;
    github_repo: string | null;
    github_default_branch: string | null;
    github_url: string | null;
    vercel_url: string | null;
    domain: string | null;
    status: string;
    last_audit_score: number | null;
    last_audit_at: string | null;
  };
  integrations: Array<{ kind: string; label: string; status: string }>;
  repositories: Array<{
    repo_full_name: string;
    role: string;
    is_primary: boolean;
    default_branch: string | null;
    language: string | null;
    html_url: string | null;
  }>;
  document: { content: string; updated_by: string | null; updated_at: string | null };
  assets: Array<{
    id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    extracted_text_bytes: number;
    uploaded_by_email: string;
    created_at: string;
  }>;
  me: { role: string; canWrite: boolean };
}

function humanBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function HeaderButton({
  focused,
  onClick,
  label,
}: {
  focused: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]"
      aria-label={focused ? `Restaurar ${label}` : `Ampliar ${label}`}
      title={focused ? "Restaurar" : "Ampliar"}
    >
      {focused ? <IconX size={11} /> : <IconMaximize size={11} />}
    </button>
  );
}

export function ProjectContextPanel({
  projectId,
  workspace = false,
  focused = false,
  onFocus,
  onMinimize,
}: {
  projectId: string;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onMinimize?: () => void;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ContextTab>("status");
  const [data, setData] = useState<ContextPayload | null>(null);
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${encodedProjectId}/context`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setError("No se pudo cargar el contexto del proyecto.");
        return;
      }
      const payload = (await response.json()) as ContextPayload;
      setData(payload);
      setContent(payload.document.content || "");
      setError(null);
    } catch {
      setError("El contexto del proyecto no está disponible.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveContent() {
    if (!data?.me.canWrite || busy) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodedProjectId}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        setError("No se pudo guardar CONTENIDO.md.");
        return;
      }
      setNotice("CONTENIDO.md guardado");
      await load();
    } catch {
      setError("No se pudo guardar CONTENIDO.md.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadArchive(file: File) {
    if (!data?.me.canWrite || busy) return;
    if (!file.name.toLowerCase().endsWith(".zip") || file.size < 1 || file.size > 50 * 1024 * 1024) {
      setError("Selecciona un ZIP de WhatsApp de hasta 50 MB.");
      return;
    }
    setBusy(true);
    setProgress(1);
    setNotice("Leyendo el ZIP en tu dispositivo…");
    setError(null);
    try {
      const bytes = await readFileBytes(file, (loaded) => {
        setProgress(Math.max(1, Math.round((loaded / file.size) * 55)));
      });
      setProgress(60);
      setNotice("Extrayendo el texto del chat…");
      const extractedText = extractArchiveText(bytes);
      if (!extractedText.trim()) {
        throw new Error("No encontré _chat.txt. Exporta el chat de WhatsApp; las fotos se ignoran.");
      }
      const text = extractedText.slice(0, 1_800_000);
      setProgress(78);
      setNotice("Guardando la conversación…");
      const finalize = await fetch(`/api/live/${encodedProjectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          extractedText: text,
          contentType: "application/zip",
          size: file.size,
        }),
      });
      const done = (await finalize.json().catch(() => null)) as
        | { notice?: string; error?: string }
        | null;
      if (!finalize.ok) {
        throw new Error(done?.notice || "No se pudo guardar la conversación.");
      }
      setProgress(100);
      setNotice("Conversación cargada. V ya puede leer el chat.");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer el ZIP.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function takeZip(files: FileList | File[] | null) {
    const file = files && files[0] ? files[0] : null;
    if (file) void uploadArchive(file);
  }

  return (
    <section
      className={cn(
        "bg-white",
        workspace
          ? "flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] p-4"
          : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", workspace && "-mx-4 -mt-4 h-10 shrink-0 border-b border-[var(--border-1)] px-4")}>
        <div className="flex items-center gap-2">
          <IconFile size={13} />
          <h2 className="text-[12px] font-medium">Archivos y contexto</h2>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize ? (
            <button type="button" onClick={onMinimize} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Minimizar contexto" title="Minimizar">
              <span className="h-px w-3 bg-current" />
            </button>
          ) : null}
          {onFocus ? <HeaderButton focused={focused} onClick={onFocus} label="contexto" /> : null}
        </div>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto">
        {(["status", "content", "archive"] as ContextTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "shrink-0 rounded-md border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
              tab === item ? "border-black bg-black text-white" : "border-[var(--border-1)]",
            )}
          >
            {item === "status" ? "Estado real" : item === "content" ? "CONTENIDO.md" : "Conversación.zip"}
          </button>
        ))}
      </div>

      <div className={cn("mt-3 overflow-y-auto pr-1", workspace && "min-h-0 flex-1")}>
        {!loaded ? (
          <div className="grid min-h-24 place-items-center"><IconLoader size={14} className="animate-spin" /></div>
        ) : !data ? (
          <p className="text-[11px] text-[var(--fg-muted)]">Sin contexto disponible.</p>
        ) : tab === "status" ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--border-1)] p-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Código y publicación</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
                <dt className="text-[var(--fg-muted)]">Estado</dt><dd className="truncate text-right">{data.project.status}</dd>
                <dt className="text-[var(--fg-muted)]">Repositorio principal</dt><dd className="truncate text-right">{data.project.github_repo || "Sin enlazar"}</dd>
                <dt className="text-[var(--fg-muted)]">Rama</dt><dd className="truncate text-right">{data.project.github_default_branch || "—"}</dd>
                <dt className="text-[var(--fg-muted)]">Vercel</dt><dd className="truncate text-right">{data.project.domain || data.project.vercel_url || "Sin publicar"}</dd>
                <dt className="text-[var(--fg-muted)]">Auditoría</dt><dd className="truncate text-right">{data.project.last_audit_score ?? "—"}</dd>
              </dl>
              {data.repositories?.length ? (
                <div className="mt-3 border-t border-[var(--border-1)] pt-2">
                  <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                    Grupo · {data.repositories.length} repositorios
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {data.repositories.map((repository) => (
                      <div key={repository.repo_full_name} className="flex items-center justify-between gap-3 text-[9px]">
                        <span className="truncate">{repository.repo_full_name}</span>
                        <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                          {repository.role}{repository.is_primary ? " · principal" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-md border border-[var(--border-1)] p-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Integraciones reales</p>
              <div className="mt-2 space-y-2">
                {data.integrations.length ? data.integrations.map((integration) => (
                  <div key={`${integration.kind}-${integration.label}`} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="truncate">{integration.label || integration.kind}</span>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em]"><span className="status-shape" data-active={integration.status === "connected" || integration.status === "active"} />{integration.status}</span>
                  </div>
                )) : <p className="text-[10px] text-[var(--fg-muted)]">Sin integraciones registradas.</p>}
              </div>
            </div>
          </div>
        ) : tab === "content" ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"><IconCode size={10} /> Contexto total de la app</p>
              <span className="font-mono text-[8px] text-[var(--fg-muted)]">{content.length}/100000</span>
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              readOnly={!data.me.canWrite}
              maxLength={100_000}
              rows={focused ? 22 : 9}
              placeholder="# Producto\n\nObjetivo, usuarios, reglas, flujos, tono, pendientes y decisiones…"
              className="mt-2 w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-mono text-[10px] leading-5 text-black focus:border-black read-only:bg-[var(--color-background)]"
            />
            {data.me.canWrite ? (
              <button type="button" onClick={() => void saveContent()} disabled={busy} className="btn-primary mt-2 w-full disabled:opacity-40">
                {busy ? <IconLoader size={12} className="animate-spin" /> : <IconCheck size={12} />} Guardar CONTENIDO.md
              </button>
            ) : <p className="mt-2 text-[10px] text-[var(--fg-muted)]">Disponible en modo lectura para tu rol.</p>}
            {data.document.updated_at ? <p className="mt-2 text-[9px] text-[var(--fg-muted)]">Última edición: {data.document.updated_by || "miembro del proyecto"}</p> : null}
          </div>
        ) : (
          <div>
            <p className="text-[10px] leading-4 text-[var(--fg-muted)]">
              Exporta el chat de WhatsApp (sin incluir toda la galería si pesa más de 50 MB). VForge lee el texto y guarda el ZIP.
            </p>
            {data.me.canWrite ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  takeZip(event.dataTransfer.files);
                }}
                className={cn(
                  "mt-3 rounded-md border border-dashed p-3",
                  dragging ? "border-black bg-[#f7f7f5]" : "border-[var(--border-1)]",
                )}
              >
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn-primary w-full disabled:opacity-40">
                  {busy ? <IconLoader size={12} className="animate-spin" /> : <IconUpload size={12} />}
                  {progress == null ? "Subir ZIP de WhatsApp" : `${progress}%`}
                </button>
                <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                  o suéltalo aquí
                </p>
              </div>
            ) : null}
            <input ref={inputRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="hidden" onChange={(event) => { takeZip(event.target.files); }} />
            <div className="mt-3 space-y-2">
              {data.assets.length ? data.assets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 rounded-md border border-[var(--border-1)] p-2.5">
                  <IconFile size={12} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium">{asset.filename}</p>
                    <p className="font-mono text-[8px] text-[var(--fg-muted)]">{humanBytes(asset.size_bytes)} · texto {humanBytes(asset.extracted_text_bytes)}</p>
                  </div>
                  <a href={`/api/live/${encodedProjectId}/assets/${encodeURIComponent(asset.id)}/download`} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border-1)]" aria-label={`Descargar ${asset.filename}`} title="Descargar ZIP"><IconDownload size={12} /></a>
                </div>
              )) : <p className="rounded-md border border-dashed border-[var(--border-1)] p-3 text-[10px] text-[var(--fg-muted)]">Aún no hay conversaciones cargadas.</p>}
            </div>
          </div>
        )}
      </div>

      {notice ? <p className="mt-2 text-[10px] text-black">{notice}</p> : null}
      {error ? <p className="mt-2 text-[10px] text-black">{error}</p> : null}
    </section>
  );
}

function readFileBytes(file: File, onProgress: (loaded: number) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
        return;
      }
      reject(new Error("No se pudo leer el ZIP."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer el ZIP."));
    reader.readAsArrayBuffer(file);
  });
}
