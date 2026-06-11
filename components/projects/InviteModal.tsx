"use client";
/**
 * InviteModal — el owner invita participantes a un proyecto por WhatsApp o
 * correo y elige su SCOPE de acceso. Conversa con /api/invitations:
 *   POST { project_id, method:'whatsapp'|'email', contact, scope } → invita
 *   GET  ?project_id=X → lista miembros (cada uno con { method, contact, scope })
 *
 * El scope usa las MISMAS claves que /api/invitations (SCOPE_TO_ROLE):
 *   cliente | colaborador | admin | invitado.
 * Sin <form>: todo por onClick. Obsidian premium, framer-motion (scale+fade).
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconX,
  IconChat,
  IconCheck,
  IconSend,
  IconUsers,
  IconEye,
  IconPen,
  IconShield,
  IconRocket,
  IconLoader,
  IconWarn,
} from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type InviteMethod = "whatsapp" | "email";

export interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  method?: string | null;
  contact?: string | null;
  scope?: string | null;
  invited_at?: string | null;
}

/** Scopes de acceso (cara visible). key = lo que espera /api/invitations. */
export const SCOPES = [
  { key: "cliente", label: "Cliente", sub: "Solo lectura", Icon: IconEye, color: "#22d3ee" },
  { key: "colaborador", label: "Colaborador", sub: "Edición", Icon: IconPen, color: "#a78bfa" },
  { key: "admin", label: "Admin", sub: "Control total", Icon: IconShield, color: "#34d399" },
  { key: "invitado", label: "Invitado", sub: "Vista demo", Icon: IconRocket, color: "#f59e0b" },
] as const;

export function scopeLabel(scope?: string | null): string {
  switch (scope) {
    case "admin":
      return "Admin";
    case "colaborador":
      return "Colaborador";
    case "invitado":
      return "Invitado";
    default:
      return "Cliente";
  }
}

export function scopeColor(scope?: string | null): string {
  return SCOPES.find((s) => s.key === scope)?.color ?? "#22d3ee";
}

function initialOf(member: Member): string {
  const src = (member.contact || member.email || "?").replace(/^\+/, "");
  const ch = src.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

/** Pila de avatares reutilizable (tarjeta + panel de detalle). */
export function MemberStack({ members, max = 4 }: { members: Member[]; max?: number }) {
  if (members.length === 0) return null;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m) => (
        <span
          key={m.id}
          title={`${m.contact || m.email} · ${scopeLabel(m.scope)}`}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0e0e16] text-[10px] font-semibold text-white"
          style={{ backgroundColor: scopeColor(m.scope) + "cc" }}
        >
          {initialOf(m)}
        </span>
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0e0e16] bg-white/10 text-[10px] font-semibold text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}

interface InviteModalProps {
  /** Proyecto a invitar. Si es null el modal no se muestra. */
  project: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
  /** Notifica al padre la lista fresca de miembros (para la tarjeta). */
  onMembersChange?: (projectId: string, members: Member[]) => void;
}

export default function InviteModal({ project, open, onClose, onMembersChange }: InviteModalProps) {
  const [method, setMethod] = useState<InviteMethod>("whatsapp");
  const [phone, setPhone] = useState("+52 ");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<string>("cliente");

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const projectId = project?.id ?? null;

  const loadMembers = useCallback(() => {
    if (!projectId) return;
    setLoadingMembers(true);
    fetch(`/api/invitations?project_id=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { members: Member[] }) => {
        const list = d.members ?? [];
        setMembers(list);
        onMembersChange?.(projectId, list);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [projectId, onMembersChange]);

  // Reset + carga al abrir.
  useEffect(() => {
    if (!open) return;
    setMethod("whatsapp");
    setPhone("+52 ");
    setEmail("");
    setScope("cliente");
    setOkMsg(null);
    setErrMsg(null);
    setSending(false);
    loadMembers();
  }, [open, loadMembers]);

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const contact = method === "whatsapp" ? phone : email;
  const canSend =
    !sending &&
    (method === "whatsapp" ? phone.replace(/\D/g, "").length >= 8 : /.+@.+\..+/.test(email));

  const send = async () => {
    if (!canSend || !projectId) return;
    setSending(true);
    setOkMsg(null);
    setErrMsg(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          method,
          contact: contact.trim(),
          scope,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `No se pudo enviar (HTTP ${res.status})`);
      }
      setOkMsg(
        method === "whatsapp"
          ? `Invitación enviada por WhatsApp a ${data.contact ?? contact}`
          : `Invitación enviada al correo ${data.contact ?? contact}`,
      );
      if (method === "whatsapp") setPhone("+52 ");
      else setEmail("");
      loadMembers();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && project && (
        <motion.div
          key="invite-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md md:items-center md:p-6"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.32, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0e0e16] shadow-2xl md:rounded-3xl"
          >
            {/* Sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4 md:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400">
                  Invitar al proyecto
                </p>
                <h2 className="mt-0.5 truncate font-display text-lg font-semibold text-on-surface">
                  {project.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-muted transition-colors hover:border-white/20 hover:text-on-surface"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 md:px-6">
              {/* Método de contacto */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  Cómo lo contactamos
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "whatsapp" as const, label: "WhatsApp", Icon: IconChat },
                      { key: "email" as const, label: "Correo", Icon: IconSend },
                    ]
                  ).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setMethod(key);
                        setErrMsg(null);
                        setOkMsg(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        method === key
                          ? "border-violet-500/50 bg-violet-500/10 text-on-surface"
                          : "border-white/8 bg-white/3 text-muted hover:border-white/16 hover:text-on-surface"
                      }`}
                    >
                      <Icon size={15} className={method === key ? "text-violet-300" : ""} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de contacto */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {method === "whatsapp" ? "Número de WhatsApp" : "Correo electrónico"}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0a0f] px-3 py-2.5 focus-within:border-violet-500/50">
                  {method === "whatsapp" ? (
                    <IconChat size={16} className="shrink-0 text-muted" />
                  ) : (
                    <IconSend size={16} className="shrink-0 text-muted" />
                  )}
                  {method === "whatsapp" ? (
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+52 998 123 4567"
                      className="w-full bg-transparent text-sm text-on-surface placeholder:text-muted/60 focus:outline-none"
                    />
                  ) : (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="w-full bg-transparent text-sm text-on-surface placeholder:text-muted/60 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Scope */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  Nivel de acceso (scope)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map(({ key, label, sub, Icon, color }) => {
                    const active = scope === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setScope(key)}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                          active ? "border-white/25 bg-white/8" : "border-white/8 bg-white/3 hover:border-white/16"
                        }`}
                      >
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: color + "22", color }}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-[13px] font-medium ${active ? "text-on-surface" : "text-on-surface/80"}`}
                          >
                            {label}
                          </span>
                          <span className="block text-[11px] text-muted">{sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado */}
              {okMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5 text-[13px] text-emerald-300">
                  <IconCheck size={15} className="shrink-0" />
                  {okMsg}
                </div>
              )}
              {errMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-error-crimson/30 bg-error-crimson/8 px-3 py-2.5 text-[13px] text-error-crimson">
                  <IconWarn size={15} className="shrink-0" />
                  {errMsg}
                </div>
              )}

              {/* Enviar */}
              <button
                onClick={send}
                disabled={!canSend}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-violet-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                      className="inline-flex"
                    >
                      <IconLoader size={15} />
                    </motion.span>
                    Enviando…
                  </>
                ) : (
                  <>
                    <IconSend size={15} />
                    Enviar invitación
                  </>
                )}
              </button>

              {/* Miembros actuales */}
              <div className="border-t border-white/8 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <IconUsers size={14} className="text-muted" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Participantes {members.length > 0 && `(${members.length})`}
                  </p>
                </div>

                {loadingMembers ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-11 animate-pulse rounded-xl border border-white/6 bg-white/3" />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-[13px] text-muted">Aún no hay participantes. Envía la primera invitación.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                          style={{ backgroundColor: scopeColor(m.scope) + "cc" }}
                        >
                          {initialOf(m)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-[13px] text-on-surface">
                            {m.method === "whatsapp" ? (
                              <IconChat size={11} className="shrink-0 text-muted" />
                            ) : (
                              <IconSend size={11} className="shrink-0 text-muted" />
                            )}
                            {m.contact || m.email}
                          </p>
                          <p
                            className="font-mono text-[10px] uppercase tracking-widest"
                            style={{ color: scopeColor(m.scope) }}
                          >
                            {scopeLabel(m.scope)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                            m.status === "active"
                              ? "border border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                              : m.status === "revoked"
                                ? "border border-white/8 bg-white/3 text-muted"
                                : "border border-cyan-400/30 bg-cyan-400/8 text-cyan-400"
                          }`}
                        >
                          {m.status === "active" ? "Activo" : m.status === "revoked" ? "Revocado" : "Invitado"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
