"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Check, Clock, PenLine, Download, Plus, ShieldCheck, ChevronRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Contract = {
  id: string;
  client: string;
  product: string;
  amount: string;
  status: "firmado" | "pendiente" | "borrador";
  date: string;
  progress: number;
};

const CONTRACTS: Contract[] = [
  { id: "VF-0042", client: "CSN Carnes Selectas", product: "Aplicación Personalizada", amount: "$12,000", status: "firmado", date: "12 May 2026", progress: 100 },
  { id: "VF-0041", client: "Hilda — HappyToc", product: "App + Publicación iOS", amount: "$17,000", status: "pendiente", date: "08 Jun 2026", progress: 60 },
  { id: "VF-0040", client: "Joel Tejeda — MT Empresarial", product: "Aplicación Personalizada", amount: "$12,000", status: "firmado", date: "28 Abr 2026", progress: 100 },
  { id: "VF-0043", client: "Nataly Cruz — Lnred", product: "MCP Empresarial", amount: "$25,000", status: "borrador", date: "—", progress: 15 },
];

const STATUS = {
  firmado: { label: "Firmado", color: "#34d399", icon: Check },
  pendiente: { label: "Pendiente de firma", color: "#fbbf24", icon: Clock },
  borrador: { label: "Borrador", color: "#8b5cf6", icon: PenLine },
};

export default function ContractsPage() {
  const [filter, setFilter] = useState<string>("todos");
  const filtered = filter === "todos" ? CONTRACTS : CONTRACTS.filter(c => c.status === filter);

  const signed = CONTRACTS.filter(c => c.status === "firmado").length;
  const pending = CONTRACTS.filter(c => c.status === "pendiente").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15">
            <ShieldCheck size={18} className="text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">Contratos</h1>
            <p className="text-xs text-on-surface-variant">Firma digital con respaldo legal</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Firmados", value: signed, color: "#34d399" },
          { label: "Pendientes", value: pending, color: "#fbbf24" },
          { label: "Valor total", value: "$66k", color: "#8b5cf6" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: EASE }}
            className="crystal-card rounded-2xl p-4"
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Nuevo contrato */}
      <button className="crystal-glow-border mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.4)] transition-transform active:scale-[0.98]">
        <Plus size={16} /> Generar nuevo contrato
      </button>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {["todos", "firmado", "pendiente", "borrador"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
                : "border-app bg-tint-1 text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista de contratos */}
      <div className="space-y-3">
        {filtered.map((c, i) => {
          const st = STATUS[c.status];
          const StIcon = st.icon;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: EASE }}
              className="crystal-card group w-full rounded-2xl p-4 text-left transition-transform hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app bg-tint-2">
                    <FileText size={17} className="text-on-surface-variant" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{c.client}</p>
                    <p className="text-xs text-on-surface-variant">{c.product}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-on-surface-variant/60">{c.id}</span>
                      <span className="text-[10px] text-on-surface-variant/40">·</span>
                      <span className="text-[10px] text-on-surface-variant/60">{c.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-bold text-on-surface">{c.amount}</span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${st.color}20`, color: st.color }}
                  >
                    <StIcon size={10} /> {st.label}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.progress}%`, background: st.color }} />
                </div>
                <span className="text-[10px] text-on-surface-variant">{c.progress}%</span>
                <ChevronRight size={14} className="text-on-surface-variant/40 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer DocuSign */}
      <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-on-surface-variant/50">
        <ShieldCheck size={12} /> Firma con validez legal vía DocuSign
      </div>
    </div>
  );
}
