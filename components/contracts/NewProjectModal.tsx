"use client";
import { useState } from "react";
import { Modal, Field, inputCls } from "./Modal";
import {
  IconLoader,
  IconCopy,
  IconCheck,
  IconRocket,
} from "@/components/brand/VFIcons";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function NewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [clientName, setClientName] = useState("");
  const [total, setTotal] = useState(12000);
  const [method, setMethod] = useState<"email" | "whatsapp">("whatsapp");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ joinUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const effId = idTouched ? id : slugify(name);

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Pon el nombre del proyecto");
    if (!effId) return setError("Falta el identificador (slug)");
    setBusy(true);
    try {
      const res = await fetch("/api/contracts/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: effId,
          name: name.trim(),
          client_name: clientName || name.trim(),
          total,
          method,
          contact,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear");
      setResult({ joinUrl: data.joinUrl });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard?.writeText(result.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setResult(null);
    setName("");
    setId("");
    setIdTouched(false);
    setClientName("");
    setContact("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={reset}
      title={result ? "Invitación lista" : "Nuevo proyecto + invitación"}
      subtitle={
        result
          ? "Comparte la liga o el QR con tu cliente"
          : "Da de alta el proyecto e invita al cliente"
      }
    >
      {!result ? (
        <div className="space-y-3.5">
          <Field label="Nombre del proyecto">
            <input
              className={inputCls}
              placeholder="Ej. Carnicería CSN"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Identificador (slug)">
            <input
              className={inputCls}
              value={effId}
              onChange={(e) => {
                setIdTouched(true);
                setId(slugify(e.target.value));
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <input
                className={inputCls}
                placeholder="Nombre"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Field>
            <Field label="Monto (MXN)">
              <input
                type="number"
                className={inputCls}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Invitar al cliente por">
            <div className="flex gap-2">
              {(["whatsapp", "email"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium capitalize transition ${
                    method === m
                      ? "border-violet-500/40 bg-violet-500/12 text-violet-200"
                      : "border-white/10 text-white/40"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label={method === "whatsapp" ? "Teléfono (WhatsApp)" : "Correo del cliente"}>
            <input
              className={inputCls}
              placeholder={method === "whatsapp" ? "+52 998 ..." : "correo@..."}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.35)] transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <IconLoader size={15} className="animate-spin" /> : <IconRocket size={15} />}
            Crear e invitar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-2xl border border-white/10 bg-white p-3">
              {/* QR servido por el endpoint owner */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/invitations/qr?data=${encodeURIComponent(result.joinUrl)}`}
                alt="QR de invitación"
                width={200}
                height={200}
                className="h-[200px] w-[200px]"
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-white/30">
              Liga de invitación
            </p>
            <p className="break-all font-mono text-[12px] text-violet-300">
              {result.joinUrl}
            </p>
          </div>
          <button
            onClick={copy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-white/80 transition hover:text-white"
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? "Copiada" : "Copiar liga"}
          </button>
          <p className="text-center text-[11px] text-white/30">
            El cliente abre la liga, inicia sesión y entra a su portal.
          </p>
        </div>
      )}
    </Modal>
  );
}
