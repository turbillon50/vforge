"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconCopy,
  IconExtLink,
  IconKey,
  IconLoader,
  IconShield,
  IconX,
} from "@/components/brand/VFIcons";

type Tab = "vercel" | "integrations" | "vault" | "mcp";

interface ToolsPayload {
  project: { id: string; name: string; github?: string | null };
  vercel: {
    connected: boolean;
    projectId?: string | null;
    url?: string | null;
    domain?: string | null;
    error?: string;
    deployments?: Array<{
      uid: string;
      url: string;
      state: string;
      target: string;
      createdAt: number;
    }>;
    domains?: Array<{ name: string; verified: boolean }>;
    env?: Array<{ key: string; type: string; target: string[] }>;
  };
  integrations: Array<{
    kind: string;
    label: string;
    status: "connected" | "available" | "missing";
    detail: string;
  }>;
  vault: {
    secrets: Array<{
      id: string;
      name: string;
      provider: string | null;
      preview: string;
      created_at: string | null;
      last_used_at: string | null;
    }>;
  };
  mcp: { url: string; projectId: string; hint: string };
}

export function ToolsPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("vercel");
  const [data, setData] = useState<ToolsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [secretName, setSecretName] = useState("");
  const [secretValue, setSecretValue] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/tools`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("No se pudieron leer las herramientas.");
    setData((await response.json()) as ToolsPayload);
  }, [projectId]);

  useEffect(() => {
    void load().catch((caught) =>
      setError(caught instanceof Error ? caught.message : "Sin herramientas."),
    );
  }, [load]);

  async function mintMcp() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mcp-token" }),
      });
      const payload = (await response.json().catch(() => null)) as { token?: string } | null;
      if (!response.ok || !payload?.token) throw new Error("No se pudo emitir el MCP.");
      setMcpToken(payload.token);
      setNotice("Token visible una sola vez. Cópialo ahora.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo emitir el MCP.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSecret() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "secret",
          name: secretName.trim().toUpperCase(),
          value: secretValue,
        }),
      });
      if (!response.ok) throw new Error("No se pudo guardar el secreto.");
      setSecretName("");
      setSecretValue("");
      setNotice("Secreto cifrado. El valor no se vuelve a mostrar.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-4">
        <div className="flex items-center gap-2">
          <IconShield size={13} />
          <h2 className="text-[12px] font-medium">Herramientas de la sala</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]" aria-label="Cerrar herramientas">
          <IconX size={11} />
        </button>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-1)] px-3 py-2">
        {(["vercel", "integrations", "vault", "mcp"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "shrink-0 rounded-md border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
              tab === item ? "border-black bg-black text-white" : "border-[var(--border-1)]",
            )}
          >
            {item === "vercel" ? "Vercel" : item === "integrations" ? "Integraciones" : item === "vault" ? "Bóveda" : "MCP"}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!data ? (
          <div className="grid min-h-40 place-items-center">
            <IconLoader size={14} className="animate-spin" />
          </div>
        ) : tab === "vercel" ? (
          <VercelTools vercel={data.vercel} />
        ) : tab === "integrations" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.integrations.map((item) => (
              <div key={item.kind} className="rounded-md border border-[var(--border-1)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium">{item.label}</p>
                  <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                    <span className="status-shape" data-active={item.status === "connected"} />
                    {item.status === "connected" ? "conectado" : "disponible"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-[var(--fg-muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        ) : tab === "vault" ? (
          <div>
            <p className="text-[10px] leading-4 text-[var(--fg-muted)]">
              Nombres, alcance y estado. El valor nunca se muestra otra vez.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={secretName} onChange={(event) => setSecretName(event.target.value)} placeholder="STRIPE_SECRET_KEY" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
              <input value={secretValue} onChange={(event) => setSecretValue(event.target.value)} placeholder="valor" type="password" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
              <button type="button" onClick={() => void saveSecret()} disabled={busy || !secretName || !secretValue} className="btn-primary disabled:opacity-40">
                {busy ? <IconLoader size={12} className="animate-spin" /> : <IconKey size={12} />} Guardar
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {data.vault.secrets.length ? data.vault.secrets.map((secret) => (
                <div key={secret.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-1)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px]">{secret.name}</p>
                    <p className="font-mono text-[8px] text-[var(--fg-muted)]">
                      {secret.provider || "app"} · {secret.preview}
                    </p>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">cifrado</span>
                </div>
              )) : <p className="text-[11px] text-[var(--fg-muted)]">Bóveda vacía en esta sala.</p>}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[11px] leading-5">{data.mcp.hint}</p>
            <p className="mt-2 font-mono text-[10px] text-[var(--fg-muted)]">{data.mcp.url}</p>
            <button type="button" onClick={() => void mintMcp()} disabled={busy} className="btn-primary mt-3 disabled:opacity-40">
              {busy ? <IconLoader size={12} className="animate-spin" /> : <IconKey size={12} />} Emitir MCP de esta app
            </button>
            {mcpToken ? (
              <div className="mt-3 rounded-md border border-black bg-[#f7f7f5] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium">Bearer (una vez)</p>
                  <button type="button" className="btn-ghost" onClick={() => void navigator.clipboard.writeText(mcpToken)}>
                    <IconCopy size={11} /> Copiar
                  </button>
                </div>
                <p className="mt-2 break-all font-mono text-[10px]">{mcpToken}</p>
              </div>
            ) : null}
          </div>
        )}
        {notice ? <p className="mt-3 flex items-center gap-1 text-[10px]"><IconCheck size={11} /> {notice}</p> : null}
        {error ? <p className="mt-3 text-[10px]">{error}</p> : null}
      </div>
    </section>
  );
}

function VercelTools({ vercel }: { vercel: ToolsPayload["vercel"] }) {
  if (!vercel.connected && !vercel.projectId) {
    return <p className="text-[11px] text-[var(--fg-muted)]">Esta sala aún no tiene proyecto Vercel enlazado.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[var(--border-1)] p-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Proyecto</p>
        <p className="mt-1 font-mono text-[11px]">{vercel.projectId || "sin id"}</p>
        {vercel.domain ? <p className="mt-1 text-[11px]">{vercel.domain}</p> : null}
        {vercel.url ? (
          <a href={vercel.url.startsWith("http") ? vercel.url : `https://${vercel.url}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px]">
            Abrir <IconExtLink size={10} />
          </a>
        ) : null}
        {vercel.error ? <p className="mt-2 text-[10px]">{vercel.error}</p> : null}
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Deploys</p>
        <div className="mt-2 space-y-2">
          {(vercel.deployments ?? []).length ? (vercel.deployments ?? []).map((item) => (
            <a key={item.uid} href={`https://${item.url}`} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-1)] px-3 py-2">
              <span className="truncate font-mono text-[10px]">{item.target} · {item.state}</span>
              <span className="font-mono text-[8px] text-[var(--fg-muted)]">{new Date(item.createdAt).toISOString().slice(5, 16).replace("T", " ")}</span>
            </a>
          )) : <p className="text-[11px] text-[var(--fg-muted)]">Sin deploys leídos.</p>}
        </div>
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Dominios</p>
        <div className="mt-2 space-y-1">
          {(vercel.domains ?? []).map((item) => (
            <p key={item.name} className="font-mono text-[11px]">{item.name} {item.verified ? "" : "· pendiente"}</p>
          ))}
        </div>
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Env · nombres, nunca valores</p>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {(vercel.env ?? []).map((item) => (
            <p key={item.key} className="truncate rounded-md border border-[var(--border-1)] px-2 py-1.5 font-mono text-[10px]">
              {item.key} <span className="text-[var(--fg-muted)]">· {item.target.join("/") || item.type}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
