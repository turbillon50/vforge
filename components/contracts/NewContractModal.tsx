"use client";

const TEMPLATES = {
  custom: { label:"Personalizado", product:"Aplicación Personalizada", amount:12000, desc:"" },
  nda:    { label:"NDA",           product:"Acuerdo de Confidencialidad (NDA)", amount:0,     desc:"Acuerdo de no divulgación estándar para proyectos tech." },
  msa:    { label:"MSA",           product:"Contrato Marco de Servicios (MSA)", amount:36000, desc:"Marco de servicios recurrentes con SLA definido." },
  sow:    { label:"SOW",           product:"Alcance de Trabajo (SOW)",          amount:18000, desc:"Entregables, plazos y criterios de aceptación definidos." },
} as const;
type TemplateKey = keyof typeof TEMPLATES;

import { useEffect, useState } from "react";
import { Modal, Field, inputCls } from "./Modal";
import { IconFile, IconLoader, IconCheck, IconSend } from "@/components/brand/VFIcons";
import { money } from "./types";

interface ProjectOpt {
  id: string;
  name: string;
}

export function NewContractModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [projectId, setProjectId] = useState("");
  const [template, setTemplate] = useState<"custom"|"nda"|"msa"|"sow">("custom");
  const [product, setProduct] = useState("Aplicación Personalizada");
  const [amount, setAmount] = useState(12000);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [busy, setBusy] = useState<"" | "draft" | "send">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(""); setDone("");
    // Aplicar plantilla seleccionada
    const tmpl = TEMPLATES[template as TemplateKey];
    if (tmpl) {
      setProduct(tmpl.product);
      if (tmpl.amount > 0) setAmount(tmpl.amount);
    }
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const list: ProjectOpt[] = (d.projects ?? []).map(
          (p: { id: string; name: string }) => ({ id: p.id, name: p.name }),
        );
        setProjects(list);
        if (list[0] && !projectId) setProjectId(list[0].id);
      })
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(send: boolean) {
    setError("");
    if (!projectId) return setError("Elige un proyecto");
    if (send && !signerEmail.includes("@"))
      return setError("Para enviar a firma necesitas el correo del cliente");
    setBusy(send ? "send" : "draft");
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          product,
          amount,
          signer_name: signerName || null,
          signer_email: signerEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear");
      const id = data.contract?.id;
      if (send && id) {
        const sres = await fetch(`/api/contracts/${id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signer_name: signerName, signer_email: signerEmail }),
        });
        const sdata = await sres.json();
        if (!sres.ok) throw new Error(sdata.error ?? "Error al enviar");
        setDone(
          sdata.mode === "docusign"
            ? "Contrato enviado a DocuSign ✅"
            : "Contrato creado y listo para firma ✅",
        );
      } else {
        setDone("Borrador creado ✅");
      }
      onCreated();
      setTimeout(() => {
        setBusy("");
        onClose();
      }, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy("");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar nuevo contrato"
      subtitle="Desde un proyecto de tu cartera"
    >
      <div className="space-y-3.5">
        {/* Selector de plantilla */}
      <div className="mb-5">
        <label className="mb-2 block text-[11px]" style={{color:"rgba(255,255,255,0.4)"}}>Plantilla</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TEMPLATES) as TemplateKey[]).map(key => {
            const tmpl = TEMPLATES[key];
            return (
              <button key={key} type="button"
                onClick={() => { setTemplate(key); setProduct(tmpl.product); if(tmpl.amount>0) setAmount(tmpl.amount); }}
                className="rounded-lg py-2 px-1 text-center text-[11px] font-medium transition-all"
                style={{
                  background: template===key ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                  border: template===key ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: template===key ? "#c4b5fd" : "rgba(255,255,255,0.4)",
                }}>
                {tmpl.label}
              </button>
            );
          })}
        </div>
        {TEMPLATES[template as TemplateKey]?.desc && (
          <p className="mt-2 text-[11px]" style={{color:"rgba(255,255,255,0.3)"}}>
            {TEMPLATES[template as TemplateKey].desc}
          </p>
        )}
      </div>
            <Field label="Proyecto">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputCls}
          >
            {projects.length === 0 && <option value="">— sin proyectos —</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0a0a12]">
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Producto / alcance">
          <input
            className={inputCls}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </Field>
        <Field label="Monto total (MXN)">
          <input
            type="number"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <span className="mt-1 block text-[11px] text-[var(--fg-muted)]">
            3 pagos de {money(Math.floor(amount / 3))} (esquema V-Momentum)
          </span>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente (firmante)">
            <input
              className={inputCls}
              placeholder="Nombre"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </Field>
          <Field label="Correo del cliente">
            <input
              className={inputCls}
              placeholder="correo@..."
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">
            <IconCheck size={13} /> {done}
          </p>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            disabled={!!busy}
            onClick={() => submit(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] py-2.5 text-sm font-medium text-[var(--fg-secondary)] transition hover:text-white disabled:opacity-50"
          >
            {busy === "draft" ? <IconLoader size={14} className="animate-spin" /> : <IconFile size={14} />}
            Borrador
          </button>
          <button
            disabled={!!busy}
            onClick={() => submit(true)}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.35)] transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy === "send" ? <IconLoader size={14} className="animate-spin" /> : <IconSend size={14} />}
            Crear y enviar a firma
          </button>
        </div>
      </div>
    </Modal>
  );
}
