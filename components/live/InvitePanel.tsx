"use client";
/**
 * Panel de invitaciones (solo owner) — crea invitaciones seguras y lista las
 * existentes. El token en claro se muestra UNA sola vez tras crearla.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconUsers,
  IconPlus,
  IconLoader,
  IconCopy,
  IconCheck,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

const ROLES: { value: LiveRole; label: string }[] = [
  { value: "observer", label: "Observador" },
  { value: "reviewer", label: "Revisor" },
  { value: "owner", label: "Owner" },
];

function inviteState(inv: Invitation): { label: string; cls: string } {
  if (inv.revoked_at) return { label: "Revocada", cls: "bg-white/[0.06] text-[var(--fg-muted)]" };
  if (inv.accepted_at) return { label: "Aceptada", cls: "bg-emerald-500/15 text-emerald-300" };
  if (new Date(inv.expires_at).getTime() <= Date.now())
    return { label: "Expirada", cls: "bg-amber-500/15 text-amber-300" };
  return { label: "Pendiente", cls: "bg-violet-500/15 text-violet-200" };
}

export function InvitePanel({ projectId }: { projectId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<LiveRole>("observer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${projectId}/invitations`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { invitations: Invitation[] };
      setInvitations(data.invitations);
    } catch {
      /* silencioso */
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    setLastLink(null);
    try {
      const res = await fetch(`/api/live/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("No se pudo crear la invitación.");
        return;
      }
      setEmail("");
      setLastLink(data.acceptUrl ?? null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!lastLink) return;
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-violet-300">
        <IconUsers size={14} />
        <span className="text-[13px] font-semibold text-[var(--fg-primary)]">
          Invitaciones
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@cliente.com"
          className="w-full rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-violet-500/50"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as LiveRole)}
          className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-white outline-none focus:border-violet-500/50"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#0a0a12]">
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={create}
          disabled={busy || !email.trim()}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          {busy ? <IconLoader size={14} className="animate-spin" /> : <IconPlus size={14} />}
          Invitar
        </button>
      </div>
      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

      {lastLink && (
        <div className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
          <p className="mb-1.5 text-[11px] text-violet-200">
            Link de invitación (se muestra una sola vez):
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-2.5 py-1.5 text-[11px] text-violet-100">
              {lastLink}
            </code>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-violet-500/30 px-2.5 py-1.5 text-[11px] text-violet-200 transition active:scale-95"
            >
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {invitations.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-[var(--fg-muted)]">
            Sin invitaciones.
          </p>
        ) : (
          invitations.map((inv) => {
            const st = inviteState(inv);
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-[var(--fg-primary)]">
                    {inv.email}
                  </p>
                  <p className="text-[10px] text-[var(--fg-muted)]">
                    {ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${st.cls}`}
                >
                  {st.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
