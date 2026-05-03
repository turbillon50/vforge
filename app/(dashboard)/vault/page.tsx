"use client";

import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OPERATOR_TOKEN_KEY = "vforge_operator_token";

function getOperatorToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OPERATOR_TOKEN_KEY);
}

function setOperatorToken(value: string) {
  localStorage.setItem(OPERATOR_TOKEN_KEY, value);
}

function clearOperatorToken() {
  localStorage.removeItem(OPERATOR_TOKEN_KEY);
}

function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = getOperatorToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, cache: "no-store" });
}

interface SecretMetadata {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  scope: string | null;
  created_at: string;
  rotated_at: string | null;
  last_used_at: string | null;
}

interface VaultHealth {
  ok: boolean;
  error?: string;
}

export default function VaultPage() {
  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [health, setHealth] = useState<VaultHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "missing" | "ok" | "invalid">("checking");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    if (!getOperatorToken()) {
      setAuthState("missing");
      setLoading(false);
      return;
    }
    try {
      const res = await authedFetch("/api/vault/operator-secrets");
      if (res.status === 401 || res.status === 403) {
        setAuthState("invalid");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as {
        secrets: SecretMetadata[];
        vault_health: VaultHealth;
      };
      setSecrets(data.secrets);
      setHealth(data.vault_health);
      setAuthState("ok");
    } catch {
      setHealth({ ok: false, error: "fetch failed" });
      setAuthState("invalid");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Show auth setup screen if no token / invalid token
  if (authState === "missing" || authState === "invalid") {
    return <OperatorAuthGate state={authState} onUnlock={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2">
          Bóveda · server-side encrypted
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight-vf text-vf-fg">
            {loading ? "Cargando…" : `${secrets.length} secreto${secrets.length === 1 ? "" : "s"}`}
          </h1>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-vf-green text-black text-sm font-medium flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
        <p className="text-sm text-vf-fg-2">
          Cifradas AES-256-GCM con master pepper · V las invoca automáticamente cuando las necesita
        </p>
      </header>

      {/* Vault health */}
      {health && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono",
            health.ok
              ? "bg-vf-green-soft border border-vf-green/30 text-vf-green-quiet"
              : "bg-vf-bg-2 border border-vf-error/40 text-vf-error",
          )}
        >
          {health.ok ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              vault crypto OK · self-test passed
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              vault crypto error: {health.error}
            </>
          )}
        </div>
      )}

      {/* List or empty state */}
      {!loading && secrets.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="border border-vf-border rounded-xl overflow-hidden bg-vf-bg-1">
          {secrets.map((s, i) => (
            <SecretRow
              key={s.id}
              secret={s}
              isFirst={i === 0}
              onDelete={load}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddSecretModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-vf-border-1 rounded-xl px-6 py-16 text-center space-y-4">
      <KeyRound className="w-10 h-10 text-vf-fg-3 mx-auto" />
      <div>
        <h2 className="text-vf-fg font-semibold text-lg">La bóveda está vacía</h2>
        <p className="text-vf-fg-2 text-sm mt-1 max-w-md mx-auto">
          Agrega tus API keys una por una. Cada una se cifra con AES-256-GCM
          server-side. V las invoca cuando ejecuta acciones.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-vf-green text-black text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Agregar tu primera key
      </button>
    </div>
  );
}

function SecretRow({
  secret,
  isFirst,
  onDelete,
}: {
  secret: SecretMetadata;
  isFirst: boolean;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function reveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await authedFetch(`/api/vault/operator-secrets/${secret.id}/value`);
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { value: string };
      setRevealed(data.value);
    } catch {
      // silent
    } finally {
      setRevealing(false);
    }
  }

  async function copy() {
    setRevealing(true);
    try {
      const res = await authedFetch(`/api/vault/operator-secrets/${secret.id}/value`);
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { value: string };
      await navigator.clipboard.writeText(data.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    } finally {
      setRevealing(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await authedFetch(`/api/vault/operator-secrets/${secret.id}`, {
        method: "DELETE",
      });
      if (res.ok) onDelete();
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const meta: string[] = [];
  if (secret.provider) meta.push(secret.provider);
  if (secret.scope) meta.push(secret.scope);
  if (secret.last_used_at) {
    meta.push(`usado ${new Date(secret.last_used_at).toLocaleDateString("es-MX")}`);
  } else {
    meta.push("nunca usado");
  }

  return (
    <div
      className={cn(
        "px-4 py-4 flex items-center gap-3",
        !isFirst && "border-t border-vf-border",
      )}
    >
      <Lock className="w-4 h-4 text-vf-green-quiet flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-vf-fg truncate">{secret.name}</div>
        {revealed && (
          <div className="font-mono text-[11px] text-vf-fg break-all bg-vf-bg-2 border border-vf-border-1 rounded px-2 py-1 mt-1">
            {revealed}
          </div>
        )}
        <div className="font-mono text-[11px] text-vf-fg-2 truncate mt-0.5">
          {meta.join(" · ")}
          {secret.description && ` · ${secret.description}`}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={reveal}
          disabled={revealing}
          className="w-9 h-9 flex items-center justify-center rounded-md text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2 disabled:opacity-50"
          aria-label={revealed ? "Ocultar" : "Ver"}
          title={revealed ? "Ocultar" : "Ver valor"}
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={revealing}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-md hover:bg-vf-bg-2 disabled:opacity-50",
            copied ? "text-vf-green" : "text-vf-fg-2 hover:text-vf-fg",
          )}
          aria-label="Copiar"
          title="Copiar al portapapeles"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-vf-fg-3 hover:text-vf-error hover:bg-vf-bg-2"
            aria-label="Borrar"
            title="Borrar (Anillo 3)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="px-2 py-1 rounded text-vf-fg-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doDelete}
              disabled={deleting}
              className="px-2 py-1 rounded bg-vf-error text-white text-xs disabled:opacity-50"
            >
              {deleting ? "…" : "Sí"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddSecretModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    provider: "",
    scope: "platform-global",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractInfo, setExtractInfo] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  async function handleScreenshot(file: File) {
    setExtracting(true);
    setExtractInfo(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await authedFetch("/api/forge/extract-secret", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `error ${res.status}`);
      }
      const { extracted } = (await res.json()) as {
        extracted: {
          name: string | null;
          value: string | null;
          provider: string | null;
          description: string | null;
          confidence: "high" | "medium" | "low";
          notes: string | null;
        };
      };
      setForm((f) => ({
        name: extracted.name ?? f.name,
        value: extracted.value ?? f.value,
        description: extracted.description ?? f.description,
        provider: extracted.provider ?? f.provider,
        scope: f.scope,
      }));
      const parts: string[] = [];
      parts.push(`confianza: ${extracted.confidence}`);
      if (extracted.notes) parts.push(extracted.notes);
      setExtractInfo(parts.join(" · "));
      // If value detected, briefly show it so Luis can verify visually
      if (extracted.value) setShowValue(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.value) {
      setError("Nombre y valor son requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/vault/operator-secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          value: form.value,
          description: form.description || null,
          provider: form.provider || null,
          scope: form.scope || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `error ${res.status}`);
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-vf-bg-1 border border-vf-border rounded-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold text-vf-fg">Agregar secret</h2>
          <p className="text-xs text-vf-fg-2 mt-1">
            Cifrado AES-256-GCM. Server-side. V lo invoca cuando lo necesite.
          </p>
        </div>

        {/* Screenshot extractor */}
        <div className="border border-vf-border-1 bg-vf-bg-2 rounded-md p-3 space-y-2">
          <button
            type="button"
            onClick={() => screenshotInputRef.current?.click()}
            disabled={extracting}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium",
              extracting
                ? "bg-vf-bg-3 text-vf-fg-2 cursor-wait"
                : "bg-vf-green text-black hover:bg-vf-green/90",
            )}
          >
            {extracting ? (
              <>
                <span className="dot-live w-2 h-2 rounded-full bg-vf-fg" />
                Extrayendo con OpenAI Vision…
              </>
            ) : (
              <>📷 Pegar / subir screenshot del secret</>
            )}
          </button>
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleScreenshot(f);
              e.target.value = "";
            }}
          />
          {extractInfo && (
            <p className="text-[11px] font-mono text-vf-fg-2">{extractInfo}</p>
          )}
          <p className="text-[10px] text-vf-fg-3">
            Captura desde la cámara del celular o sube una foto. V lo lee, extrae el
            valor y rellena el form. Verifica antes de guardar.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field
            label="Nombre (UPPER_SNAKE_CASE)"
            value={form.name}
            placeholder="ej. STRIPE_SECRET_KEY"
            mono
            onChange={(v) =>
              setForm({ ...form, name: v.toUpperCase().replace(/[^A-Z0-9_]/g, "") })
            }
          />
          <div>
            <label className="block text-xs text-vf-fg-2 mb-1">Valor</label>
            <div className="relative">
              <textarea
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="sk_live_..."
                rows={3}
                className="w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg font-mono placeholder:text-vf-fg-3 focus:outline-none focus:border-vf-border-2 resize-none"
                style={{ WebkitTextSecurity: showValue ? "none" : "disc" } as React.CSSProperties}
              />
              <button
                type="button"
                onClick={() => setShowValue((v) => !v)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg"
                aria-label={showValue ? "Ocultar" : "Ver"}
              >
                {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <Field
            label="Provider (opcional)"
            value={form.provider}
            placeholder="ej. anthropic, openai, vercel, stripe"
            onChange={(v) => setForm({ ...form, provider: v.toLowerCase() })}
          />
          <Field
            label="Descripción (opcional)"
            value={form.description}
            placeholder="¿Qué hace esta key? ¿Para qué proyecto?"
            onChange={(v) => setForm({ ...form, description: v })}
          />
          <div>
            <label className="block text-xs text-vf-fg-2 mb-1">Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg focus:outline-none focus:border-vf-border-2"
            >
              <option value="platform-global">platform-global (toda la fábrica)</option>
              <option value="platform">platform (vForge interno)</option>
              <option value="account-wide">account-wide (cuenta del provider)</option>
              <option value="project-scoped">project-scoped (limitada a un proyecto)</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-vf-error font-mono" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-md border border-vf-border bg-vf-bg-2 text-vf-fg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-md bg-vf-green text-black text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Cifrando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OperatorAuthGate({
  state,
  onUnlock,
}: {
  state: "missing" | "invalid";
  onUnlock: () => void;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Pega tu Operator Token");
      return;
    }
    setBusy(true);
    setOperatorToken(trimmed);
    try {
      const res = await fetch("/api/vault/operator-secrets", {
        headers: { Authorization: `Bearer ${trimmed}` },
        cache: "no-store",
      });
      if (res.ok) {
        onUnlock();
      } else {
        clearOperatorToken();
        setError(
          res.status === 401 || res.status === 403
            ? "Token inválido — verifica que sea VFORGE_OPERATOR_TOKEN"
            : `error ${res.status}`,
        );
      }
    } catch {
      clearOperatorToken();
      setError("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2">
          Bóveda · acceso protegido
        </p>
        <h1 className="text-2xl font-semibold tracking-tight-vf text-vf-fg flex items-center gap-2">
          <Lock className="w-6 h-6 text-vf-green" />
          Configurar acceso
        </h1>
        <p className="text-sm text-vf-fg-2">
          {state === "invalid"
            ? "El token guardado ya no es válido. Pega el Operator Token actual."
            : "Pega el VFORGE_OPERATOR_TOKEN para acceder al Vault. Lo guardamos cifrado en el localStorage de este dispositivo."}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-vf-fg-2 mb-1">
            Operator token (VFORGE_OPERATOR_TOKEN)
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="64 chars hex"
            autoComplete="off"
            className="w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg font-mono placeholder:text-vf-fg-3 focus:outline-none focus:border-vf-border-2"
          />
        </div>

        {error && (
          <p className="text-xs text-vf-error font-mono" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-md bg-vf-green text-black text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {busy ? "Verificando…" : "Desbloquear Vault"}
        </button>
      </form>

      <div className="text-xs text-vf-fg-2 border-t border-vf-border pt-4 space-y-2">
        <p className="font-medium text-vf-fg-1">¿De dónde viene el token?</p>
        <p>
          Vercel dashboard → proyecto vforge → Settings → Environment Variables
          → <span className="font-mono text-vf-fg-1">VFORGE_OPERATOR_TOKEN</span>.
          Es un secret encrypted que Vercel descifra para ti al editarlo.
        </p>
        <p className="text-vf-fg-3">
          Cuando se cablee Clerk en M1, este token se reemplaza por sesión Clerk
          + recent-reauth.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-vf-fg-2 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg placeholder:text-vf-fg-3 focus:outline-none focus:border-vf-border-2",
          mono && "font-mono",
        )}
      />
    </div>
  );
}
