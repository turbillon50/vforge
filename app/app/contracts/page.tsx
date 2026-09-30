"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  IconFile,
  IconCheck,
  IconClock,
  IconPen,
  IconPlus,
  IconShield,
  IconChevR,
  IconSend,
  IconUsers,
  IconLoader,
} from "@/components/brand/VFIcons";
import { NewContractModal } from "@/components/contracts/NewContractModal";
import { NewProjectModal } from "@/components/contracts/NewProjectModal";
import {
  type ContractUI,
  type ContractsMetrics,
  STATUS_META,
  money,
  moneyK,
} from "@/components/contracts/types";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) => fetch(u).then((r) => r.json());

const STATUS_ICON: Record<string, typeof IconCheck> = {
  signed: IconCheck,
  sent: IconClock,
  draft: IconPen,
  declined: IconFile,
  voided: IconFile,
};

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "signed", label: "Firmados" },
  { key: "sent", label: "En firma" },
  { key: "draft", label: "Borradores" },
] as const;

export default function ContractsPage() {
  const { data, isLoading, mutate } = useSWR<{
    contracts: ContractUI[];
    metrics: ContractsMetrics;
  }>("/api/contracts", fetcher, { refreshInterval: 20000 });

  const [filter, setFilter] = useState<string>("todos");
  const [newContract, setNewContract] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const [sending, setSending] = useState<string>("");

  const contracts = useMemo(() => data?.contracts ?? [], [data]);
  const metrics = data?.metrics ?? {
    signed: 0,
    pending: 0,
    drafts: 0,
    total: 0,
    totalValue: 0,
  };
  const filtered =
    filter === "todos"
      ? contracts
      : contracts.filter((c) => c.status === filter);

  async function sendToSign(c: ContractUI) {
    if (sending) return;
    setSending(c.id);
    try {
      await fetch(`/api/contracts/${c.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await mutate();
    } finally {
      setSending("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-8 md:px-8 md:pt-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: EASE }}
        className="relative mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-1)] bg-white">
            <IconShield size={18} className="text-black" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-black">
              Contratos
            </h1>
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              Firma digital con respaldo legal · seguimiento de pagos
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Firmados", value: metrics.signed, color: "#34d399" },
          { label: "En firma", value: metrics.pending, color: "#fbbf24" },
          {
            label: "Valor total",
            value: moneyK(metrics.totalValue),
            color: "#a78bfa",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: EASE }}
            className="relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white p-4"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <p
              className="text-2xl font-bold leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setNewContract(true)}
          className="group relative flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--accent)] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.98]"
        >
          <IconPlus size={15} /> Nuevo contrato
        </button>
        <button
          onClick={() => setNewProject(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-white py-3.5 text-sm font-semibold text-[var(--fg-primary)] transition hover:border-black active:scale-[0.98]"
        >
          <IconUsers size={15} /> Proyecto + invitación
        </button>
      </div>

      {/* Filtros */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[12px] transition ${
              filter === f.key
                ? "border-black bg-black text-white"
                : "border-[var(--border-1)] text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--fg-muted)]">
            <IconLoader size={16} className="animate-spin" /> Cargando…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-1)] bg-[var(--surface-1)] py-12 text-center">
            <IconFile size={22} className="mx-auto mb-2 text-[var(--fg-muted)]" />
            <p className="text-sm text-[var(--fg-tertiary)]">
              {contracts.length === 0
                ? "Aún no hay contratos. Genera el primero."
                : "Sin contratos en este filtro."}
            </p>
          </div>
        )}
        {filtered.map((c, i) => {
          const meta = STATUS_META[c.status];
          const Icon = STATUS_ICON[c.status] ?? IconFile;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), ease: EASE }}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white p-4 transition hover:border-black/30"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-1)] bg-[#f7f7f5]">
                    <IconFile size={16} className="text-[var(--fg-tertiary)]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
                      {c.client_name}
                    </p>
                    <p className="text-[12px] text-[var(--fg-tertiary)]">{c.product}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[var(--fg-muted)]">
                        {c.project_id}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[13px] font-bold text-[var(--fg-primary)]">
                    {money(c.amount)}
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[12px] font-semibold"
                    style={{
                      background: `${meta.color}15`,
                      color: meta.color,
                      border: `1px solid ${meta.color}25`,
                    }}
                  >
                    <Icon size={9} /> {meta.label}
                  </span>
                </div>
              </div>

              {/* Progreso de los 3 pagos V-Momentum */}
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-wide text-[var(--fg-muted)]">
                    Pagos · {c.paid_count}/3
                  </span>
                  <span className="font-mono text-[12px] text-[var(--fg-tertiary)]">
                    {money(c.paid_mxn)} / {money(c.amount)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {c.payments.map((p) => (
                    <div
                      key={p.idx}
                      title={`${p.label} · ${money(p.amount)}`}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10"
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: p.status === "paid" ? "100%" : "0%",
                          background:
                            "linear-gradient(90deg,#34d39990,#34d399)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Acción contextual */}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[12px] text-[var(--fg-muted)]">
                  {c.docusign_envelope_id
                    ? `DocuSign · ${c.docusign_envelope_id.slice(0, 8)}`
                    : c.status === "signed"
                      ? "Firmado"
                      : "Sin envelope"}
                </span>
                {c.status === "draft" ? (
                  <button
                    onClick={() => sendToSign(c)}
                    disabled={sending === c.id}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border-1)] bg-white px-3 py-1.5 text-[12px] font-semibold text-black transition hover:border-black active:scale-95 disabled:opacity-50"
                  >
                    {sending === c.id ? (
                      <IconLoader size={11} className="animate-spin" />
                    ) : (
                      <IconSend size={11} />
                    )}
                    Enviar a firma
                  </button>
                ) : (
                  <IconChevR
                    size={13}
                    className="text-[var(--fg-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-muted)]"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-[12px] text-[var(--fg-muted)]">
        <IconShield size={11} /> Firma con validez legal vía DocuSign
      </p>

      <NewContractModal
        open={newContract}
        onClose={() => setNewContract(false)}
        onCreated={() => mutate()}
      />
      <NewProjectModal
        open={newProject}
        onClose={() => setNewProject(false)}
        onCreated={() => mutate()}
      />
    </div>
  );
}
