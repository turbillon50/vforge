"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Check, Copy, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface OperatorSecret {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  scope: string | null;
  created_at: string;
  rotated_at: string | null;
  last_used_at: string | null;
}

const OPERATOR_TOKEN_KEY = "vforge_operator_token";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${Math.max(mins, 1)}m`;
}

export default function SecretsPage() {
  const t = useT();
  const [secrets, setSecrets] = useState<OperatorSecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);

  function load() {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(OPERATOR_TOKEN_KEY);
    setHasToken(Boolean(token));
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch("/api/vault/operator-secrets", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 401) throw new Error("Falta el header de autorización.");
        if (r.status === 403) throw new Error("Token inválido. Vuelve a unlock.");
        if (r.status === 503) {
          throw new Error(
            "El server no tiene VFORGE_OPERATOR_TOKEN configurado.",
          );
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { secrets: OperatorSecret[] }) => setSecrets(d.secrets ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function unlock() {
    const raw = window.prompt("Pega tu VFORGE_OPERATOR_TOKEN:");
    if (!raw) return;
    const token = raw.trim();
    if (!token) return;
    window.localStorage.setItem(OPERATOR_TOKEN_KEY, token);
    load();
  }

  function lock() {
    window.localStorage.removeItem(OPERATOR_TOKEN_KEY);
    setSecrets([]);
    setHasToken(false);
  }

  async function revealAndCopy(id: string) {
    if (revealingId) return;
    const token = window.localStorage.getItem(OPERATOR_TOKEN_KEY);
    if (!token) {
      setRowError({ id, msg: "Vault bloqueada." });
      return;
    }
    setRevealingId(id);
    setRowError(null);
    try {
      const r = await fetch(`/api/vault/operator-secrets/${id}/value`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      const { value } = (await r.json()) as { value: string };
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        throw new Error("Clipboard bloqueado por el navegador.");
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch (err) {
      setRowError({
        id,
        msg: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRevealingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t.secrets.eyebrow}
        title={t.secrets.title}
        description={t.secrets.body}
        actions={
          <>
            {hasToken ? (
              <button onClick={lock} className="btn-ghost">
                <Lock size={13} /> Bloquear
              </button>
            ) : (
              <button onClick={unlock} className="btn-primary">
                <KeyRound size={13} /> Unlock vault
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 px-5 pt-6 md:grid-cols-4 md:px-8">
        <Stat label={t.secrets.stats.encrypted} value="AES-256-GCM" tone="violet" />
        <Stat
          label={t.secrets.stats.rotations}
          value={String(secrets.filter((s) => s.rotated_at).length)}
          tone="cyan"
        />
        <Stat label="Total" value={String(secrets.length)} tone="emerald" />
        <Stat
          label={t.secrets.stats.stale}
          value={String(secrets.filter((s) => !s.rotated_at).length)}
          tone="crimson"
        />
      </div>

      <div className="px-5 py-6 md:px-8">
        <div className="rounded-xl border border-app">
          <div className="flex items-center justify-between border-b border-app px-4 py-3">
            <p className="label-caps text-muted">{t.secrets.list_label}</p>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
              <ShieldCheck size={12} className="text-success-emerald" />{" "}
              {t.secrets.sealed}
            </div>
          </div>

          {!hasToken && (
            <div className="p-8 text-center text-on-surface-variant">
              <Lock className="mx-auto mb-3 text-violet-300" size={28} />
              <p className="font-display text-lg text-on-surface">Vault bloqueada</p>
              <p className="mt-2 text-sm max-w-md mx-auto leading-relaxed">
                Tus secretos viven encriptados (AES-256-GCM) en Neon. Para
                verlos en este navegador necesitas el operator token —
                el mismo que <span className="font-mono text-cyber-cyan">V</span> usa
                para Ring 1+ writes.
              </p>
              <button
                onClick={unlock}
                className="btn-primary mt-5 inline-flex"
                style={{ touchAction: "manipulation" }}
              >
                <KeyRound size={13} /> Unlock vault
              </button>
              <p className="mt-4 text-[11px] text-muted">
                El token vive en la env var <span className="font-mono">VFORGE_OPERATOR_TOKEN</span>{" "}
                de Vercel. Pégalo cuando se abra el prompt.
              </p>
            </div>
          )}

          {hasToken && loading && (
            <div className="p-8 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
              Cargando…
            </div>
          )}

          {hasToken && error && (
            <div className="p-6 text-center text-sm text-error-crimson">⚠ {error}</div>
          )}

          {hasToken && !loading && !error && secrets.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant">
              <p>No hay secretos guardados todavía.</p>
            </div>
          )}

          {hasToken && !loading && secrets.length > 0 && (
            <ul>
              {secrets.map((s) => {
                const isCopied = copiedId === s.id;
                const isLoading = revealingId === s.id;
                const err = rowError?.id === s.id ? rowError.msg : null;
                return (
                  <li
                    key={s.id}
                    className="grid grid-cols-12 items-center gap-3 border-b border-app px-4 py-3 last:border-0 hover:bg-tint-1"
                  >
                    <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                      <Lock size={14} className="text-violet-300 shrink-0" />
                      <span className="font-mono text-[13px] text-on-surface truncate">
                        {s.name}
                      </span>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <span className="chip text-success-emerald">● vault</span>
                    </div>
                    <div className="col-span-5 md:col-span-2 text-[12px] text-on-surface-variant truncate">
                      {s.provider ?? s.scope ?? "—"}
                    </div>
                    <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                        {s.rotated_at
                          ? `rotada ${timeAgo(s.rotated_at)}`
                          : `creada ${timeAgo(s.created_at)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => revealAndCopy(s.id)}
                        disabled={isLoading}
                        aria-label={
                          isCopied ? "Copiado" : `Copiar valor de ${s.name}`
                        }
                        className={
                          isCopied
                            ? "flex h-7 items-center gap-1 rounded-md border border-success-emerald/40 bg-success-emerald/10 px-2 font-mono text-[10px] uppercase tracking-widest text-success-emerald"
                            : "flex h-7 items-center gap-1 rounded-md border border-app bg-tint-1 px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-50"
                        }
                      >
                        {isLoading ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : isCopied ? (
                          <Check size={11} />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{isCopied ? "Copiado" : "Copy"}</span>
                      </button>
                    </div>
                    {err && (
                      <div className="col-span-12 -mt-1 text-right text-[11px] text-error-crimson">
                        ⚠ {err}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "cyan" | "emerald" | "crimson";
}) {
  const m = {
    violet: "text-violet-300",
    cyan: "text-cyber-cyan",
    emerald: "text-success-emerald",
    crimson: "text-error-crimson",
  };
  return (
    <div className="rounded-xl border border-app bg-tint-1 p-4">
      <p className="label-caps text-muted">{label}</p>
      <p className={`mt-2 font-display text-lg font-semibold ${m[tone]}`}>{value}</p>
    </div>
  );
}
