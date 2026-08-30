"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconCheck,
  IconCopy,
  IconLoader,
  IconPlus,
  IconUsers,
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

const ROLES: { value: LiveRole; label: string; description: string }[] = [
  {
    value: "observer",
    label: "Observador",
    description: "Ve escritorio y móvil; puede comentar.",
  },
  {
    value: "reviewer",
    label: "Revisor",
    description: "También puede ver administración.",
  },
];

function invitationState(invitation: Invitation) {
  if (invitation.revoked_at) return "Revocada";
  if (invitation.accepted_at) return "Aceptada";
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return "Expirada";
  return "Pendiente";
}

export function InvitePanel({ projectId }: { projectId: string }) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<LiveRole>("observer");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/invitations",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError("No se pudieron cargar las invitaciones.");
        return;
      }
      const payload = (await response.json()) as {
        invitations?: Invitation[];
      };
      setInvitations(
        Array.isArray(payload.invitations) ? payload.invitations : [],
      );
      setError(null);
    } catch {
      setError("Las invitaciones no están disponibles.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInvitation() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || busy) return;
    setBusy(true);
    setError(null);
    setLastLink(null);
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/invitations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, role }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        acceptUrl?: string;
      };
      if (!response.ok) {
        setError("No se pudo crear la invitación.");
        return;
      }
      setEmail("");
      setLastLink(payload.acceptUrl ?? null);
      await load();
    } catch {
      setError("No se pudo crear la invitación.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!lastLink) return;
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("El navegador bloqueó el portapapeles.");
    }
  }

  const selectedRole = ROLES.find((item) => item.value === role);

  return (
    <section className="rounded-[8px] border border-black bg-white">
      <header className="flex flex-col gap-3 border-b border-[var(--border-1)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <IconUsers size={14} />
          <div>
            <h2 className="text-[12px] font-medium">Invitar al proyecto</h2>
            <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
              El enlace se muestra una sola vez y respeta el alcance elegido.
            </p>
          </div>
        </div>
        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Sólo owner
        </span>
      </header>

      <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-start">
        <label>
          <span className="mono-label">Correo del invitado</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="cliente@empresa.com"
            className="input-base mt-2"
          />
        </label>

        <label>
          <span className="mono-label">Alcance</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as LiveRole)}
            className="input-base mt-2"
          >
            {ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[9px] leading-4 text-[var(--fg-muted)]">
            {selectedRole?.description}
          </span>
        </label>

        <button
          type="button"
          onClick={() => void createInvitation()}
          disabled={busy || !email.trim()}
          className="btn-primary mt-[26px] disabled:opacity-40"
        >
          {busy ? <IconLoader size={13} className="animate-spin" /> : <IconPlus size={13} />}
          Crear invitación
        </button>
      </div>

      {lastLink ? (
        <div className="mx-4 mb-4 flex flex-col gap-2 border border-black bg-[#f7f7f5] p-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all font-mono text-[9px]">
            {lastLink}
          </code>
          <button type="button" onClick={() => void copyLink()} className="btn-ghost shrink-0">
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mx-4 mb-4 border-l border-black pl-3 text-[10px] leading-4">
          {error}
        </p>
      ) : null}

      <div className="border-t border-[var(--border-1)]">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          <span>Invitado</span>
          <span>Rol</span>
          <span className="text-right">Estado</span>
        </div>
        {!loaded ? (
          <div className="grid min-h-20 place-items-center border-t border-[var(--border-1)]">
            <IconLoader size={13} className="animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <p className="border-t border-[var(--border-1)] px-4 py-6 text-[11px] text-[var(--fg-muted)]">
            Todavía no hay invitaciones para este proyecto.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-1)] border-t border-[var(--border-1)]">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center px-4 py-3 text-[10px]"
              >
                <span className="truncate">{invitation.email}</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                  {ROLE_LABEL(invitation.role)}
                </span>
                <span className="flex items-center justify-end gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em]">
                  <span
                    className="status-shape"
                    data-active={invitationState(invitation) === "Aceptada"}
                  />
                  {invitationState(invitation)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ROLE_LABEL(role: string) {
  if (role === "reviewer") return "Revisor";
  if (role === "observer") return "Observador";
  return role;
}
