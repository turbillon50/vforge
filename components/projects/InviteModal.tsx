"use client";

import { useState, useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconSend,
  IconGlobe,
  IconCheck,
  IconX,
  IconLoader,
} from "@/components/brand/VFIcons";

type Method = "email" | "whatsapp";
type Scope = "client" | "viewer" | "editor" | "admin";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "client", label: "Cliente (solo lectura)" },
  { value: "viewer", label: "Invitado (vista demo)" },
  { value: "editor", label: "Colaborador (edicion)" },
  { value: "admin", label: "Admin (control total)" },
];

type InviteModalProps = {
  projectId: string | null;
  projectName: string;
  open: boolean;
  onClose: () => void;
};

export function InviteModal({
  projectId,
  projectName,
  open,
  onClose,
}: InviteModalProps) {
  const [method, setMethod] = useState<Method>("email");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<Scope>("client");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const inputId = useId();
  const scopeId = useId();

  // Reset cada vez que se abre.
  useEffect(() => {
    if (open) {
      setMethod("email");
      setValue("");
      setScope("client");
      setLoading(false);
      setSent(false);
      setError(null);
    }
  }, [open]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSend() {
    if (loading || sent || !projectId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          method,
          email: method === "email" ? value : undefined,
          phone: method === "whatsapp" ? "+52" + value : undefined,
          scope,
        }),
      });
      if (!res.ok) {
        let msg = "No se pudo enviar la invitacion.";
        try {
          const data = await res.json();
          if (data?.error) msg = String(data.error);
        } catch {
          /* respuesta sin cuerpo JSON */
        }
        throw new Error(msg);
      }
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const canSend = value.trim().length > 0 && !loading && !sent;
  const border12 = "color-mix(in srgb, var(--color-on-surface) 12%, transparent)";
  const violetSoft = "color-mix(in srgb, var(--color-violet-400) 14%, transparent)";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="invite-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.2 }}
          style={{
            background: "color-mix(in srgb, var(--color-void) 70%, transparent)",
          }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-2xl"
            style={{
              background: "var(--color-surface)",
              borderColor: border12,
              color: "var(--color-on-surface)",
            }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg transition-opacity hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
            >
              <IconX size={18} />
            </button>

            <h2
              id={titleId}
              className="pr-8 text-lg font-semibold tracking-tight"
              style={{ color: "var(--color-on-surface)" }}
            >
              Invitar a {projectName}
            </h2>

            {sent ? (
              <motion.div
                className="flex flex-col items-center gap-3 py-10 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-cyan-400) 18%, transparent)",
                    color: "var(--color-cyan-400)",
                  }}
                >
                  <IconCheck size={28} />
                </span>
                <p
                  className="text-base font-medium"
                  style={{ color: "var(--color-on-surface)" }}
                >
                  Invitacion enviada
                </p>
              </motion.div>
            ) : (
              <div className="mt-5 flex flex-col gap-5">
                {/* Toggle de metodo */}
                <div
                  role="radiogroup"
                  aria-label="Metodo de invitacion"
                  className="flex gap-2"
                >
                  {[
                    { key: "email" as Method, label: "Correo", Icon: IconSend },
                    { key: "whatsapp" as Method, label: "WhatsApp", Icon: IconGlobe },
                  ].map(({ key, label, Icon }) => {
                    const active = method === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMethod(key)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors"
                        style={{
                          borderColor: active ? "var(--color-violet-400)" : border12,
                          background: active ? violetSoft : "transparent",
                          color: active
                            ? "var(--color-on-surface)"
                            : "var(--color-muted)",
                        }}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Input de contacto */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={inputId}
                    className="text-xs font-medium"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {method === "email"
                      ? "Correo electronico"
                      : "Numero de WhatsApp"}
                  </label>
                  <div
                    className="flex items-center overflow-hidden rounded-xl border"
                    style={{
                      borderColor: border12,
                      background:
                        "color-mix(in srgb, var(--color-void) 50%, transparent)",
                    }}
                  >
                    {method === "whatsapp" && (
                      <span
                        className="select-none border-r px-3 py-2.5 text-sm"
                        style={{ borderColor: border12, color: "var(--color-muted)" }}
                      >
                        +52
                      </span>
                    )}
                    <input
                      id={inputId}
                      type={method === "email" ? "email" : "tel"}
                      inputMode={method === "email" ? "email" : "tel"}
                      autoComplete="off"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={
                        method === "email" ? "cliente@correo.com" : "998 123 4567"
                      }
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--color-on-surface)" }}
                    />
                  </div>
                </div>

                {/* Selector de scope */}
                <div className="flex flex-col gap-1.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Nivel de acceso
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Nivel de acceso"
                    className="grid grid-cols-2 gap-2"
                  >
                    {SCOPES.map((s) => {
                      const active = scope === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setScope(s.value)}
                          className="rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition-colors"
                          style={{
                            borderColor: active
                              ? "var(--color-violet-400)"
                              : border12,
                            background: active ? violetSoft : "transparent",
                            color: active
                              ? "var(--color-on-surface)"
                              : "var(--color-muted)",
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  <span id={scopeId} className="sr-only">
                    Nivel de acceso seleccionado:{" "}
                    {SCOPES.find((s) => s.value === scope)?.label}
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{
                      background: "color-mix(in srgb, #ef4444 12%, transparent)",
                      color: "#fca5a5",
                    }}
                  >
                    {error}
                  </motion.p>
                )}

                {/* Enviar */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-violet-400), var(--color-cyan-400))",
                    color: "var(--color-void)",
                  }}
                >
                  {loading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                      className="inline-flex"
                    >
                      <IconLoader size={16} />
                    </motion.span>
                  ) : (
                    <IconSend size={16} />
                  )}
                  {loading ? "Enviando…" : "Enviar invitacion"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InviteModal;
