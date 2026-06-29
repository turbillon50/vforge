"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type DragEvent,
} from "react";
import { motion } from "framer-motion";
import {
  IconCamera,
  IconCheck,
  IconClock,
  IconDatabase,
  IconFile,
  IconInfo,
  IconLoader,
  IconMic,
  IconPlus,
  IconRefresh,
  IconSend,
  IconStop,
  IconUpload,
  IconWarn,
} from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";
import type { EvidenceKind, ProcessState } from "@/lib/vault/evidence";

type SvgIcon = ComponentType<{ size?: number; className?: string }>;

interface ProjectOption {
  id: string;
  name: string;
  category?: string;
}

interface EvidenceItem {
  id: string;
  project_slug: string;
  kind: EvidenceKind;
  raw_url: string | null;
  transcript: string;
  interpretation: string;
  linked_process: string | null;
  created_by: string;
  created_at: string;
}

interface ProcessStatus {
  id: string;
  project_slug: string;
  process_name: string;
  state: ProcessState;
  note: string;
  updated_at: string;
}

interface VaultResponse {
  evidence: EvidenceItem[];
  statuses: ProcessStatus[];
  error?: string;
}

interface UploadResponse {
  evidence?: EvidenceItem;
  error?: string;
}

interface StatusResponse {
  status?: ProcessStatus;
  error?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PROJECT_STORAGE_KEY = "vforge_evidence_vault_project";

const KIND_META: Record<
  EvidenceKind,
  { label: string; Icon: SvgIcon; tone: string }
> = {
  screenshot: {
    label: "Screenshot",
    Icon: IconCamera,
    tone: "text-violet-400 border-violet-400",
  },
  text: {
    label: "Texto",
    Icon: IconFile,
    tone: "text-violet-400 border-violet-400",
  },
  voice: {
    label: "Voz",
    Icon: IconMic,
    tone: "text-success-emerald border-success-emerald",
  },
};

const STATE_META: Record<
  ProcessState,
  { label: string; Icon: SvgIcon; tone: string; action: string }
> = {
  listo: {
    label: "Listo",
    Icon: IconCheck,
    tone: "text-success-emerald border-success-emerald",
    action: "Marcar listo",
  },
  falta: {
    label: "Falta",
    Icon: IconWarn,
    tone: "text-[var(--color-gold-arc)] border-[color:var(--color-gold-arc)]",
    action: "Marcar falta",
  },
  sugerencia: {
    label: "Sugerencia",
    Icon: IconInfo,
    tone: "text-electric-blue border-electric-blue",
    action: "Marcar sugerencia",
  },
};

const STATE_OPTIONS: ProcessState[] = ["listo", "falta", "sugerencia"];

export function EvidenceVaultClient({
  initialProject,
}: {
  initialProject?: string;
}) {
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [project, setProject] = useState(() => normalizeProject(initialProject));
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [statuses, setStatuses] = useState<ProcessStatus[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingVault, setLoadingVault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [linkedProcess, setLinkedProcess] = useState("");
  const [textOpen, setTextOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");

  const [voiceMode, setVoiceMode] = useState<"idle" | "recording" | "uploading">(
    "idle",
  );
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [statusProcess, setStatusProcess] = useState("");
  const [statusState, setStatusState] = useState<ProcessState>("falta");
  const [statusNote, setStatusNote] = useState("");

  const processNames = useMemo(
    () => statuses.map((status) => status.process_name),
    [statuses],
  );

  const syncState = error
    ? "error"
    : loadingProjects || loadingVault || saving || voiceMode === "uploading"
      ? "syncing"
      : "synced";

  useEffect(() => {
    let cancelled = false;
    setLoadingProjects(true);
    fetch("/api/projects", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({ projects: [] }))) as {
          projects?: ProjectOption[];
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body.projects ?? [];
      })
      .then((items) => {
        if (cancelled) return;
        setProjects(items);
        setProject((current) => {
          if (current) return current;
          if (typeof window !== "undefined") {
            const saved = normalizeProject(localStorage.getItem(PROJECT_STORAGE_KEY));
            if (saved) return saved;
          }
          return items[0]?.id ?? "";
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadVault = useCallback(async (projectSlug: string) => {
    if (!projectSlug) return;
    setLoadingVault(true);
    setError(null);
    try {
      const res = await fetch(`/api/vault?project=${encodeURIComponent(projectSlug)}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as VaultResponse;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEvidence(data.evidence ?? []);
      setStatuses(data.statuses ?? []);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingVault(false);
    }
  }, []);

  useEffect(() => {
    if (!project) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(PROJECT_STORAGE_KEY, project);
    }
    void loadVault(project);
  }, [loadVault, project]);

  useEffect(() => {
    if (!recordingStartedAt) return;
    const id = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [recordingStartedAt]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items ?? []);
      const image = items.find(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      );
      if (!image) return;
      const file = image.getAsFile();
      if (!file) return;
      event.preventDefault();
      void uploadScreenshot(file);
    }

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
      stopMediaStream();
    };
    // uploadScreenshot reads current state intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, linkedProcess]);

  async function uploadScreenshot(file: Blob) {
    if (!ensureProject()) return;
    const form = new FormData();
    form.append("project", project);
    form.append("kind", "screenshot");
    if (linkedProcess.trim()) form.append("linkedProcess", linkedProcess.trim());
    form.append("file", file, file instanceof File ? file.name : "screenshot.png");
    await postUpload(form, "Screenshot guardado");
  }

  async function uploadText() {
    if (!ensureProject()) return;
    const text = textDraft.trim();
    if (!text) {
      setFeedback("Pega o escribe texto antes de guardar.");
      return;
    }

    await postUpload(
      {
        project,
        kind: "text",
        text,
        linkedProcess: linkedProcess.trim() || null,
      },
      "Texto guardado",
    );
    setTextDraft("");
    setTextOpen(false);
  }

  async function uploadVoice(blob: Blob) {
    if (!ensureProject()) return;
    const form = new FormData();
    form.append("project", project);
    form.append("kind", "voice");
    if (linkedProcess.trim()) form.append("linkedProcess", linkedProcess.trim());
    form.append("audio", blob, "nota-voz.webm");
    await postUpload(form, "Nota de voz guardada");
  }

  async function postUpload(
    body: FormData | Record<string, unknown>,
    successMessage: string,
  ) {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/vault/upload", {
        method: "POST",
        headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as UploadResponse;
      if (!res.ok || !data.evidence) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setEvidence((current) => [data.evidence as EvidenceItem, ...current]);
      setFeedback(successMessage);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setVoiceMode("idle");
      setRecordingSeconds(0);
      setRecordingStartedAt(null);
    }
  }

  async function saveStatus() {
    if (!ensureProject()) return;
    const processName = statusProcess.trim();
    if (!processName) {
      setFeedback("Escribe el nombre del proceso.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/vault/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          processName,
          state: statusState,
          note: statusNote,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as StatusResponse;
      if (!res.ok || !data.status) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatuses((current) =>
        [
          data.status as ProcessStatus,
          ...current.filter((item) => item.process_name !== processName),
        ].sort((a, b) => a.process_name.localeCompare(b.process_name)),
      );
      setFeedback("Estado de proceso actualizado");
      setStatusProcess("");
      setStatusNote("");
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTextButton() {
    setTextOpen((open) => !open);
    window.setTimeout(() => textAreaRef.current?.focus(), 30);
    if (textDraft || typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      return;
    }
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.trim()) setTextDraft(clipboardText);
    } catch {
      /* Manual paste remains available. */
    }
  }

  async function handleVoiceButton() {
    if (voiceMode === "recording") {
      stopRecording();
      return;
    }
    if (voiceMode !== "idle") return;
    await startRecording();
  }

  async function startRecording() {
    if (!ensureProject()) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("La grabacion de voz no esta disponible en este navegador.");
      return;
    }

    try {
      setError(null);
      setFeedback(null);
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopMediaStream();
        setVoiceMode("uploading");
        void uploadVoice(blob);
      };
      recorder.start(250);
      setVoiceMode("recording");
      setRecordingStartedAt(Date.now());
      setRecordingSeconds(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      stopMediaStream();
      setVoiceMode("idle");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      setVoiceMode("uploading");
      recorder.stop();
    }
  }

  function stopMediaStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function pickAudioMime(): string | null {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? null;
  }

  function ensureProject(): boolean {
    if (project) return true;
    setFeedback("Selecciona o escribe un proyecto primero.");
    return false;
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("Suelta una imagen para guardar screenshot.");
      return;
    }
    void uploadScreenshot(file);
  }

  function handleProjectChange(value: string) {
    setProject(normalizeProject(value));
    setEvidence([]);
    setStatuses([]);
    setFeedback(null);
    setError(null);
  }

  const selectedProjectName =
    projects.find((item) => item.id === project)?.name ?? project;

  return (
    <div className="flex min-h-full flex-col bg-void text-on-surface">
      <header className="border-b border-app px-5 py-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400">
              ESFERA
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-on-surface md:text-3xl">
              Baul de Evidencia
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Captura pruebas, notas y senales de proceso por proyecto sin salir del
              workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-[240px]">
              <span className="label-caps mb-1 block text-muted">Proyecto</span>
              {projects.length > 0 ? (
                <select
                  value={project}
                  onChange={(event) => handleProjectChange(event.target.value)}
                  className="input-base h-11"
                  disabled={loadingProjects}
                >
                  <option value="">Selecciona proyecto</option>
                  {projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={project}
                  onChange={(event) => handleProjectChange(event.target.value)}
                  placeholder="slug-proyecto"
                  className="input-base h-11"
                />
              )}
            </label>
            <SyncBadge state={syncState} lastSyncedAt={lastSyncedAt} />
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-5 p-5 md:p-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="min-w-0 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl border border-dashed bg-surface p-4 shadow-elev transition md:p-5",
              dragOver ? "border-violet-400 bg-tint-2" : "border-app-strong",
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="label-caps text-violet-400">Zona para soltar</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-on-surface">
                  Un gesto: suelta, pega o toca una accion
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Screenshot, texto o nota de voz quedan vinculados al proyecto
                  seleccionado.
                </p>
              </div>
              <label className="min-w-0 lg:w-72">
                <span className="label-caps mb-1 block text-muted">
                  Proceso vinculado
                </span>
                <input
                  value={linkedProcess}
                  onChange={(event) => setLinkedProcess(event.target.value)}
                  list="vault-process-options"
                  placeholder="opcional"
                  className="input-base h-11"
                />
                <datalist id="vault-process-options">
                  {processNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <CaptureButton
                label="Screenshot"
                hint="Elegir o pegar imagen"
                Icon={IconCamera}
                disabled={saving || !project}
                onClick={() => screenshotInputRef.current?.click()}
              />
              <CaptureButton
                label="Texto"
                hint="Pegar nota o requerimiento"
                Icon={IconFile}
                disabled={saving || !project}
                active={textOpen}
                onClick={() => void handleTextButton()}
              />
              <CaptureButton
                label={voiceMode === "recording" ? "Detener" : "Nota de voz"}
                hint={
                  voiceMode === "recording"
                    ? `${recordingSeconds}s grabando`
                    : voiceMode === "uploading"
                      ? "Transcribiendo"
                      : "Grabar y guardar"
                }
                Icon={voiceMode === "recording" ? IconStop : IconMic}
                disabled={saving || !project || voiceMode === "uploading"}
                active={voiceMode === "recording"}
                onClick={() => void handleVoiceButton()}
              />
            </div>

            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadScreenshot(file);
              }}
            />

            {textOpen && (
              <div className="mt-4 rounded-xl border border-app bg-surface-low p-3">
                <textarea
                  ref={textAreaRef}
                  value={textDraft}
                  onChange={(event) => setTextDraft(event.target.value)}
                  rows={5}
                  placeholder="Pega aqui el texto que quieres guardar como evidencia."
                  className="input-base min-h-[132px] resize-y"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-[11px] text-muted">
                    {textDraft.trim().length} caracteres listos para guardar
                  </p>
                  <button
                    type="button"
                    onClick={() => void uploadText()}
                    disabled={saving || !textDraft.trim()}
                    className="btn-primary min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <IconLoader size={14} className="animate-spin" /> : <IconSend size={14} />}
                    Guardar texto
                  </button>
                </div>
              </div>
            )}

            {(feedback || error) && (
              <div
                className={cn(
                  "mt-4 rounded-xl border px-3 py-2 text-sm",
                  error
                    ? "border-error-crimson text-error-crimson"
                    : "border-success-emerald text-success-emerald",
                )}
                role="status"
              >
                {error ?? feedback}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
            className="rounded-2xl border border-app bg-surface shadow-elev"
          >
            <div className="flex items-center justify-between gap-3 border-b border-app px-4 py-4 md:px-5">
              <div>
                <p className="label-caps text-violet-400">Linea de evidencia</p>
                <h2 className="mt-1 font-display text-lg font-semibold">
                  {selectedProjectName || "Selecciona proyecto"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => project && void loadVault(project)}
                disabled={!project || loadingVault}
                className="btn-ghost min-h-10 px-3 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refrescar evidencia"
              >
                <IconRefresh
                  size={14}
                  className={loadingVault ? "animate-spin" : undefined}
                />
                Refrescar
              </button>
            </div>

            <div className="divide-y divide-[rgb(var(--color-border))]">
              {loadingVault && evidence.length === 0 ? (
                <EvidenceSkeleton />
              ) : evidence.length === 0 ? (
                <EmptyState
                  Icon={IconDatabase}
                  title="Aun no hay evidencia"
                  body="El primer screenshot, texto o audio que guardes aparecera aqui."
                />
              ) : (
                evidence.map((item, index) => (
                  <EvidenceRow key={item.id} item={item} index={index} />
                ))
              )}
            </div>
          </motion.div>
        </section>

        <aside className="min-w-0 space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.08 }}
            className="rounded-2xl border border-app bg-surface p-4 shadow-elev md:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-violet-400">Tablero de estado</p>
                <h2 className="mt-1 font-display text-lg font-semibold">
                  Procesos
                </h2>
              </div>
              <span className="chip">{statuses.length} activos</span>
            </div>

            <div className="mt-4 space-y-3">
              {statuses.length === 0 ? (
                <EmptyState
                  Icon={IconInfo}
                  title="Sin procesos todavia"
                  body="Crea un proceso para empezar a marcar listo, falta o sugerencia."
                  compact
                />
              ) : (
                statuses.map((status) => (
                  <ProcessCard key={status.id} status={status} />
                ))
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.12 }}
            className="rounded-2xl border border-app bg-surface p-4 shadow-elev md:p-5"
          >
            <p className="label-caps text-violet-400">Actualizar proceso</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-on-surface-variant">
                  Nombre del proceso
                </span>
                <input
                  value={statusProcess}
                  onChange={(event) => setStatusProcess(event.target.value)}
                  list="vault-process-options"
                  placeholder="Onboarding, pagos, deploy..."
                  className="input-base h-11"
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                {STATE_OPTIONS.map((state) => {
                  const meta = STATE_META[state];
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={state}
                      type="button"
                      onClick={() => setStatusState(state)}
                      className={cn(
                        "min-h-11 rounded-md border bg-tint-1 px-2 text-xs font-semibold transition",
                        "inline-flex items-center justify-center gap-1.5",
                        statusState === state
                          ? meta.tone
                          : "border-app text-on-surface-variant hover:bg-tint-2",
                      )}
                    >
                      <Icon size={13} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm text-on-surface-variant">
                  Nota
                </span>
                <textarea
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  rows={4}
                  placeholder="Que falta, que ya quedo, o que recomiendas."
                  className="input-base resize-y"
                />
              </label>

              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={saving || !project || !statusProcess.trim()}
                className="btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <IconLoader size={14} className="animate-spin" /> : <IconPlus size={14} />}
                Guardar estado
              </button>
            </div>
          </motion.section>
        </aside>
      </main>
    </div>
  );
}

function CaptureButton({
  label,
  hint,
  Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  Icon: SvgIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[104px] rounded-xl border bg-surface-low p-4 text-left transition",
        "focus:outline-none focus:ring-2 focus:ring-violet-400",
        active
          ? "border-violet-400 bg-tint-2 text-on-surface"
          : "border-app text-on-surface hover:border-violet-400 hover:bg-tint-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-app bg-tint-1">
        <Icon size={19} />
      </span>
      <span className="mt-3 block font-display text-base font-semibold">{label}</span>
      <span className="mt-1 block text-sm text-on-surface-variant">{hint}</span>
    </button>
  );
}

function EvidenceRow({ item, index }: { item: EvidenceItem; index: number }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.Icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE, delay: Math.min(index * 0.025, 0.2) }}
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-4 md:px-5"
    >
      <div
        className={cn(
          "mt-1 flex h-10 w-10 items-center justify-center rounded-md border bg-tint-1",
          meta.tone,
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={cn("chip border", meta.tone)}>{meta.label}</span>
            {item.linked_process && (
              <span className="chip">
                <IconDatabase size={12} />
                {item.linked_process}
              </span>
            )}
          </div>
          <time
            dateTime={item.created_at}
            className="font-mono text-[11px] text-muted"
          >
            {formatTimestamp(item.created_at)}
          </time>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">
          {item.transcript}
        </p>
        <p className="mt-3 rounded-xl border border-app bg-tint-1 px-3 py-2 text-sm leading-6 text-on-surface-variant">
          {item.interpretation}
        </p>
        {item.raw_url && (
          <a
            href={item.raw_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex font-mono text-[11px] uppercase tracking-[0.14em] text-violet-400 hover:text-violet-400"
          >
            Abrir archivo
          </a>
        )}
      </div>
    </motion.article>
  );
}

function ProcessCard({ status }: { status: ProcessStatus }) {
  const meta = STATE_META[status.state];
  const Icon = meta.Icon;
  return (
    <article className="rounded-xl border border-app bg-surface-low p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold">
            {status.process_name}
          </h3>
          <time
            dateTime={status.updated_at}
            className="mt-1 block font-mono text-[10px] text-muted"
          >
            {formatTimestamp(status.updated_at)}
          </time>
        </div>
        <span className={cn("chip border", meta.tone)}>
          <Icon size={12} />
          {meta.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
        {status.note || "Sin nota."}
      </p>
    </article>
  );
}

function SyncBadge({
  state,
  lastSyncedAt,
}: {
  state: "synced" | "syncing" | "error";
  lastSyncedAt: Date | null;
}) {
  const label =
    state === "syncing"
      ? "Sincronizando"
      : state === "error"
        ? "Revisar conexion"
        : "Sincronizado";
  const Icon = state === "syncing" ? IconLoader : state === "error" ? IconWarn : IconCheck;
  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md border bg-tint-1 px-3",
        state === "error"
          ? "border-error-crimson text-error-crimson"
          : state === "syncing"
            ? "border-violet-400 text-violet-400"
            : "border-success-emerald text-success-emerald",
      )}
    >
      <Icon size={14} className={state === "syncing" ? "animate-spin" : undefined} />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em]">{label}</p>
        {lastSyncedAt && state === "synced" && (
          <p className="font-mono text-[10px] text-muted">
            {lastSyncedAt.toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  body,
  compact,
}: {
  Icon: SvgIcon;
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("px-5 text-center", compact ? "py-6" : "py-12")}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-app bg-tint-1 text-violet-400">
        <Icon size={20} />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-on-surface">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-on-surface-variant">
        {body}
      </p>
    </div>
  );
}

function EvidenceSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 md:px-5">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <div className="vf-skeleton h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <div className="vf-skeleton h-4 w-32 rounded-md" />
            <div className="vf-skeleton h-4 w-full rounded-md" />
            <div className="vf-skeleton h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeProject(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
