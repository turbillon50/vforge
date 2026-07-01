"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconCheck, IconCopy, IconKey, IconLoader, IconShield } from "@/components/brand/VFIcons";
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
  const [showAdd, setShowAdd]   = useState(false);
  const [showEnv, setShowEnv]   = useState(false);

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
            {hasToken && (
              <>
                <button onClick={() => setShowEnv(true)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-all"
                  style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.5)" }}>
                  ↑ Import .env
                </button>
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all"
                  style={{ background:"#fff", color:"#000" }}>
                  + Nuevo secret
                </button>
              </>
            )}
            {hasToken ? (
              <button onClick={lock} className="btn-ghost">
                <IconShield size={13} /> Bloquear
              </button>
            ) : (
              <button onClick={unlock} className="btn-primary">
                <IconKey size={13} /> Unlock vault
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
              <IconShield size={12} className="text-success-emerald" />{" "}
              {t.secrets.sealed}
            </div>
          </div>

          {!hasToken && (
            <div className="p-8 text-center text-on-surface-variant">
              <IconShield className="mx-auto mb-3 text-violet-300" size={28} />
              <p className="font-display text-lg text-on-surface">Vault bloqueada</p>
              <p className="mt-2 text-sm max-w-md mx-auto leading-relaxed">
                Tus secretos viven encriptados (AES-256-GCM) en Neon. Para
                verlos en este navegador necesitas el operator token —
                el mismo que <span className="font-mono text-violet-400">V</span> usa
                para Ring 1+ writes.
              </p>
              <button
                onClick={unlock}
                className="btn-primary mt-5 inline-flex"
                style={{ touchAction: "manipulation" }}
              >
                <IconKey size={13} /> Unlock vault
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
                    className="grid grid-cols-12 items-center gap-3 border-b border-app px-4 py-3 last:border-0 hover:bg-tint-1/[0.05]"
                  >
                    <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                      <IconShield size={14} className="text-violet-300 shrink-0" />
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
                            : "flex h-7 items-center gap-1 rounded-md border border-app bg-tint-1/[0.05] px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-50"
                        }
                      >
                        {isLoading ? (
                          <IconLoader size={11} className="animate-spin" />
                        ) : isCopied ? (
                          <IconCheck size={11} />
                        ) : (
                          <IconCopy size={11} />
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
      {showAdd && (
        <AddSecretModal
          token={typeof window !== 'undefined' ? (window.localStorage.getItem('vforge_operator_token') ?? '') : ''}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }} />
      )}
      {showEnv && (
        <ImportEnvModal
          token={typeof window !== 'undefined' ? (window.localStorage.getItem('vforge_operator_token') ?? '') : ''}
          onClose={() => setShowEnv(false)}
          onSaved={() => { setShowEnv(false); load(); }} />
      )}
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
    cyan: "text-violet-400",
    emerald: "text-success-emerald",
    crimson: "text-error-crimson",
  };
  return (
    <div className="rounded-xl border border-app bg-tint-1/[0.05] p-4">
      <p className="label-caps text-muted">{label}</p>
      <p className={`mt-2 font-display text-lg font-semibold ${m[tone]}`}>{value}</p>
    </div>
  );
}

/* ─── Componentes adicionales ─────────────────────────────────────── */

export function AddSecretModal({ onClose, onSaved, token }: {
  onClose: () => void;
  onSaved: () => void;
  token: string;
}) {
  const [name, setName]  = useState("");
  const [value, setValue] = useState("");
  const [desc, setDesc]  = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]    = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !value.trim()) { setErr("Nombre y valor son requeridos"); return; }
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/vault/operator-secrets", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
        body: JSON.stringify({ name: name.trim().toUpperCase().replace(/\s+/g,"_"), value: value.trim(), description: desc.trim() || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? `HTTP ${r.status}`); }
      onSaved();
    } catch(e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background:"#0f0f14", border:"1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        <h3 className="mb-5 text-[15px] font-bold" style={{ color:"#fff" }}>Nuevo secret</h3>
        {err && <p className="mb-3 rounded-lg px-3 py-2 text-[12px]"
          style={{ background:"rgba(239,68,68,0.1)", color:"#f87171", border:"1px solid rgba(239,68,68,0.2)" }}>{err}</p>}
        {[
          { label:"Nombre (ej: OPENAI_API_KEY)", val:name, set:setName, type:"text", mono:true },
          { label:"Valor", val:value, set:setValue, type:"password", mono:true },
          { label:"Descripción (opcional)", val:desc, set:setDesc, type:"text", mono:false },
        ].map(({ label, val, set, type, mono }) => (
          <div key={label} className="mb-3">
            <label className="mb-1 block text-[11px]" style={{ color:"rgba(255,255,255,0.4)" }}>{label}</label>
            <input type={type} value={val} onChange={e => set(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                color:"#e5e5e5", fontFamily: mono ? "monospace" : "inherit" }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
        ))}
        <div className="mt-5 flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all"
            style={{ background: saving ? "rgba(255,255,255,0.1)" : "#fff", color: saving ? "rgba(255,255,255,0.3)" : "#000" }}>
            {saving ? "Guardando…" : "Guardar secret"}
          </button>
          <button onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[13px] transition-all"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportEnvModal({ onClose, onSaved, token }: {
  onClose: () => void;
  onSaved: () => void;
  token: string;
}) {
  const [text, setText]   = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: number; skip: number } | null>(null);
  const [err, setErr]     = useState<string | null>(null);

  function parse(raw: string) {
    const lines = raw.split("\n");
    const pairs: { name: string; value: string }[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 1) continue;
      const name  = trimmed.slice(0, idx).trim();
      let   value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (name && value) pairs.push({ name, value });
    }
    return pairs;
  }

  async function importAll() {
    const pairs = parse(text);
    if (!pairs.length) { setErr("No se encontraron pares KEY=VALUE válidos"); return; }
    setSaving(true); setErr(null);
    let ok = 0, skip = 0;
    for (const pair of pairs) {
      try {
        const r = await fetch("/api/vault/operator-secrets", {
          method:"POST",
          headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
          body: JSON.stringify(pair),
        });
        if (r.ok) ok++; else skip++;
      } catch { skip++; }
    }
    setSaving(false);
    setResult({ ok, skip });
    setTimeout(() => { onSaved(); }, 1500);
  }

  const preview = parse(text);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6"
        style={{ background:"#0f0f14", border:"1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        <h3 className="mb-1 text-[15px] font-bold" style={{ color:"#fff" }}>Importar .env</h3>
        <p className="mb-4 text-[12px]" style={{ color:"rgba(255,255,255,0.35)" }}>
          Pega el contenido de tu archivo .env — cada KEY=VALUE se guarda como secret cifrado.
        </p>
        {err && <p className="mb-3 rounded-lg px-3 py-2 text-[12px]"
          style={{ background:"rgba(239,68,68,0.1)", color:"#f87171" }}>{err}</p>}
        {result && (
          <p className="mb-3 rounded-lg px-3 py-2 text-[12px]"
            style={{ background:"rgba(34,197,94,0.08)", color:"#86efac" }}>
            ✓ {result.ok} importados · {result.skip} omitidos
          </p>
        )}
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
          placeholder={"OPENAI_API_KEY=sk-...\nNEON_DB_URL=postgresql://...\n# comentarios ignorados"}
          className="w-full rounded-lg px-3 py-2.5 text-[12px] outline-none transition-colors"
          style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
            color:"#e5e5e5", fontFamily:"monospace", resize:"vertical" }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)")}
          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
        {preview.length > 0 && (
          <p className="mt-2 text-[11px]" style={{ color:"rgba(255,255,255,0.3)" }}>
            {preview.length} variable{preview.length !== 1 ? "s" : ""} detectada{preview.length !== 1 ? "s" : ""}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={importAll} disabled={saving || !text.trim()}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
            style={{ background: saving || !text.trim() ? "rgba(255,255,255,0.08)" : "#fff",
              color: saving || !text.trim() ? "rgba(255,255,255,0.3)" : "#000" }}>
            {saving ? "Importando…" : `Importar ${preview.length > 0 ? preview.length + " secrets" : ""}`}
          </button>
          <button onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[13px]"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
