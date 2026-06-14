"use client";
import { useRef, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  IconCheck,
  IconClock,
  IconLoader,
  IconCamera,
  IconUpload,
  IconSend,
  IconShield,
  IconChat,
  IconSparkles,
  IconImage,
  IconWarn,
} from "@/components/brand/VFIcons";
import { money } from "@/components/contracts/types";
import { PropositoPanel } from "@/components/portal/PropositoPanel";
import { ProjectSphere } from "@/components/portal/ProjectSphere";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

interface TimelineRow {
  id: string;
  stage: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  title: string;
  detail: string | null;
  created_at: string;
}
interface EvidenceRow {
  id: string;
  kind: string;
  raw_url: string | null;
  transcript: string;
  created_by: string;
  created_at: string;
}
interface FeedbackRow {
  id: string;
  kind: "comment" | "suggestion";
  body: string;
  author_name: string | null;
  created_at: string;
}
interface ContractRow {
  id: string;
  status: string;
  amount: number;
  paid_mxn: number;
  paid_count: number;
  payments: { idx: number; label: string; amount: number; status: string }[];
}
interface PortalData {
  project: { id: string; name: string; status: string; vercel_url: string | null; domain: string | null };
  status: {
    client_name: string;
    status: string;
    total_mxn: string;
    paid_mxn: string;
    next_milestone: string | null;
    updated_at: string;
  } | null;
  timeline: TimelineRow[];
  evidence: EvidenceRow[];
  feedback: FeedbackRow[];
  contracts: ContractRow[];
  me: { email: string; name: string; role: string };
}

const TL_COLOR: Record<string, string> = {
  done: "#34d399",
  in_progress: "#fbbf24",
  pending: "#64748b",
  blocked: "#f87171",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function ClientPortal({ projectId }: { projectId: string }) {
  const { data, error, isLoading, mutate } = useSWR<PortalData>(
    `/api/my-project/${projectId}`,
    fetcher,
    { refreshInterval: 12000 },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#03020a]">
        <IconLoader size={22} className="animate-spin text-violet-400" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#03020a] px-6 text-center">
        <IconWarn size={28} className="text-amber-400" />
        <p className="text-sm text-[var(--fg-secondary)]">
          No tienes acceso a este proyecto o aún no aceptas tu invitación.
        </p>
        <a
          href={`/workspace/join/${projectId}`}
          className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200"
        >
          Aceptar invitación
        </a>
      </div>
    );
  }

  const total = data.status ? Number(data.status.total_mxn) : 0;
  const paid = data.status ? Number(data.status.paid_mxn) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const doneCount = data.timeline.filter((t) => t.status === "done").length;

  return (
    <div className="min-h-screen bg-[#03020a] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">
              {data.project.name}
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Portal del cliente · {data.me.name}
            </p>
          </div>
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-200">
            {data.status?.status ?? data.project.status}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-5 px-5 pt-6">
        <ProjectSphere projectId={projectId} />
        <PropositoPanel projectId={projectId} />
        {/* Progreso general */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-gradient-to-br from-[#0d0b1a] to-[#0a0a12] p-5"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--fg-tertiary)]">
                Avance de pago
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {money(paid)}{" "}
                <span className="text-sm font-medium text-[var(--fg-muted)]">
                  / {money(total)}
                </span>
              </p>
            </div>
            <span className="text-2xl font-bold text-violet-300">{pct}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ ease: EASE, duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
            />
          </div>
          {data.status?.next_milestone && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--fg-tertiary)]">
              <IconSparkles size={12} className="text-violet-400" />
              {data.status.next_milestone}
            </p>
          )}
        </motion.div>

        {/* Contratos */}
        {data.contracts.length > 0 && (
          <Section icon={<IconShield size={14} />} title="Contrato">
            {data.contracts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--fg-primary)]">
                    {money(c.amount)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      c.status === "signed"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {c.status === "signed" ? "Firmado" : "En firma"}
                  </span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {c.payments.map((p) => (
                    <div
                      key={p.idx}
                      title={`${p.label} · ${money(p.amount)}`}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: p.status === "paid" ? "100%" : "0%",
                          background: "linear-gradient(90deg,#34d39990,#34d399)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--fg-muted)]">
                  {c.paid_count}/3 pagos · {money(c.paid_mxn)} cubierto
                </p>
              </div>
            ))}
          </Section>
        )}

        {/* Timeline EN VIVO */}
        <Section
          icon={<IconClock size={14} />}
          title="Avance en vivo"
          right={
            <span className="text-[10px] text-[var(--fg-muted)]">
              {doneCount}/{data.timeline.length} hitos
            </span>
          }
        >
          {data.timeline.length === 0 ? (
            <p className="px-1 py-4 text-center text-[12px] text-[var(--fg-muted)]">
              Aún no hay actividad registrada.
            </p>
          ) : (
            <div className="relative space-y-3 pl-1">
              {data.timeline.map((t) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background: TL_COLOR[t.status],
                        boxShadow: `0 0 8px ${TL_COLOR[t.status]}80`,
                      }}
                    />
                    <span className="mt-1 w-px flex-1 bg-white/[0.06]" />
                  </div>
                  <div className="-mt-0.5 pb-1">
                    <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                      {t.title}
                    </p>
                    {t.detail && (
                      <p className="text-[11px] text-[var(--fg-tertiary)]">{t.detail}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
                      {t.stage} · {timeAgo(t.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Evidencias */}
        <Section icon={<IconImage size={14} />} title="Evidencias y fotos">
          <EvidenceUploader projectId={projectId} onDone={() => mutate()} />
          {data.evidence.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {data.evidence.map((e) =>
                e.raw_url ? (
                  <a
                    key={e.id}
                    href={e.raw_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.raw_url}
                      alt={e.transcript}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(ev) => {
                        (ev.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </a>
                ) : (
                  <div
                    key={e.id}
                    className="flex aspect-square items-center justify-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-2 text-center text-[10px] text-[var(--fg-tertiary)]"
                  >
                    {e.transcript.slice(0, 40)}
                  </div>
                ),
              )}
            </div>
          )}
        </Section>

        {/* Comentarios y sugerencias */}
        <Section icon={<IconChat size={14} />} title="Comentarios y sugerencias">
          <FeedbackBox projectId={projectId} onDone={() => mutate()} />
          <div className="mt-3 space-y-2">
            {data.feedback.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      f.kind === "suggestion"
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-white/[0.06] text-[var(--fg-tertiary)]"
                    }`}
                  >
                    {f.kind === "suggestion" ? "Sugerencia" : "Comentario"}
                  </span>
                  <span className="text-[10px] text-[var(--fg-muted)]">
                    {f.author_name ?? "Cliente"} · {timeAgo(f.created_at)}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--fg-primary)]">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <p className="flex items-center justify-center gap-2 pt-2 text-[11px] text-[var(--fg-muted)]">
          <IconCheck size={11} /> Actualizado en tiempo real
        </p>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-violet-300">
          {icon}
          <span className="text-[13px] font-semibold text-[var(--fg-primary)]">
            {title}
          </span>
        </div>
        {right}
      </div>
      {children}
    </motion.div>
  );
}

function EvidenceUploader({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload() {
    if (!file && !caption.trim()) {
      setMsg("Agrega una foto o una nota");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      const res = await fetch(`/api/my-project/${projectId}/evidence`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setFile(null);
      setCaption("");
      setMsg("¡Enviado! ✅");
      onDone();
      setTimeout(() => setMsg(""), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <button
          onClick={() => camRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] py-2.5 text-[12px] font-medium text-[var(--fg-secondary)] transition active:scale-95"
        >
          <IconCamera size={14} /> Cámara
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] py-2.5 text-[12px] font-medium text-[var(--fg-secondary)] transition active:scale-95"
        >
          <IconUpload size={14} /> Archivo
        </button>
      </div>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="truncate rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] text-violet-200">
          {file.name}
        </p>
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        placeholder="Describe la evidencia o deja una nota…"
        className="w-full resize-none rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-violet-500/50"
      />
      <button
        onClick={upload}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <IconLoader size={14} className="animate-spin" /> : <IconSend size={14} />}
        Enviar evidencia
      </button>
      {msg && <p className="text-center text-[11px] text-[var(--fg-tertiary)]">{msg}</p>}
    </div>
  );
}

function FeedbackBox({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"comment" | "suggestion">("comment");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/my-project/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body: body.trim() }),
      });
      if (res.ok) {
        setBody("");
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        {(["comment", "suggestion"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 rounded-xl border py-2 text-[12px] font-medium transition ${
              kind === k
                ? "border-violet-500/40 bg-violet-500/12 text-violet-200"
                : "border-[var(--border-1)] text-[var(--fg-tertiary)]"
            }`}
          >
            {k === "comment" ? "Comentario" : "Sugerencia"}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={
          kind === "suggestion"
            ? "¿Qué te gustaría mejorar?"
            : "Escribe tu comentario…"
        }
        className="w-full resize-none rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-violet-500/50"
      />
      <button
        onClick={send}
        disabled={busy || !body.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] py-2.5 text-[13px] font-semibold text-[var(--fg-primary)] transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? <IconLoader size={14} className="animate-spin" /> : <IconChat size={14} />}
        Enviar
      </button>
    </div>
  );
}
