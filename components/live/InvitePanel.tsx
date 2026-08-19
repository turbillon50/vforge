"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, Plus, Users } from "lucide-react";
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

const ROLES: Array<{ value: LiveRole; label: string }> = [
  { value: "observer", label: "Observador" },
  { value: "reviewer", label: "Revisor" },
  { value: "owner", label: "Propietario" },
];

function inviteState(invitation: Invitation) {
  if (invitation.revoked_at) return { label: "Revocada", className: "bg-[#ebe7df] text-[#777168]" };
  if (invitation.accepted_at) return { label: "Aceptada", className: "bg-[#dff0e5] text-[#28704a]" };
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return { label: "Expirada", className: "bg-[#f6e9cf] text-[#8a6218]" };
  return { label: "Pendiente", className: "bg-[#fff0eb] text-[#b94327]" };
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
      const response = await fetch(`/api/live/${projectId}/invitations`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { invitations: Invitation[] };
      setInvitations(data.invitations);
    } catch {
      // El panel conserva la última lista disponible.
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    setLastLink(null);
    try {
      const response = await fetch(`/api/live/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError("No se pudo crear la invitación."); return; }
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
      setError("El navegador bloqueó el portapapeles.");
    }
  }

  return (
    <section className="rounded-[20px] border border-[#d9d4c9] bg-[#fbfaf7] p-5">
      <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4" /><h2 className="text-sm font-semibold text-[#1b1a17]">Invitar a la sala</h2></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" className="h-11 w-full rounded-full border border-[#d9d4c9] bg-white px-4 text-sm text-[#1b1a17] outline-none placeholder:text-[#aaa49b] focus:border-[#ff5c35]" />
        <select value={role} onChange={(event) => setRole(event.target.value as LiveRole)} className="h-11 rounded-full border border-[#d9d4c9] bg-white px-4 text-sm text-[#1b1a17] outline-none focus:border-[#ff5c35]">
          {ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button onClick={create} disabled={busy || !email.trim()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#1b1a17] px-5 text-sm font-semibold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Invitar</button>
      </div>
      {error ? <p className="mt-2 text-xs text-[#a33925]">{error}</p> : null}

      {lastLink ? (
        <div className="mt-4 rounded-[15px] border border-[#f1b9aa] bg-[#fff2ed] p-3">
          <p className="mb-2 text-xs font-medium text-[#8f3b27]">Este enlace se muestra una sola vez</p>
          <div className="flex gap-2"><code className="min-w-0 flex-1 truncate rounded-[10px] bg-white px-3 py-2 text-xs text-[#625e56]">{lastLink}</code><button onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#e4a997] bg-white px-3 text-xs font-medium text-[#8f3b27]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar"}</button></div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {invitations.length === 0 ? <p className="py-4 text-sm text-[#777168]">Aún no hay invitaciones.</p> : invitations.map((invitation) => {
          const state = inviteState(invitation);
          return (
            <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e3dfd6] bg-white p-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-[#1b1a17]">{invitation.email}</p><p className="mt-0.5 text-xs text-[#8a847a]">{ROLES.find((item) => item.value === invitation.role)?.label ?? invitation.role}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${state.className}`}>{state.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
