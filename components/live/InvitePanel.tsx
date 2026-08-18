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
