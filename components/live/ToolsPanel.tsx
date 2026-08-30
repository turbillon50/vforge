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
  canWrite?: boolean;
  vercel: {
    connected: boolean;
    projectId?: string | null;
    url?: string | null;
    domain?: string | null;
    github?: string | null;
    framework?: string | null;
    name?: string | null;
    error?: string;
    actions?: Array<{ id: string; label: string; detail: string; write: boolean }>;
    deployments?: Array<{
      uid: string;
      url: string;
      state: string;
      target: string;
      createdAt: number;
      commit?: string | null;
      ref?: string | null;
      message?: string | null;
    }>;
    domains?: Array<{ name: string; verified: boolean }>;
    env?: Array<{ key: string; type: string; target: string[] }>;
  };
  integrations: Array<{
    kind: string;
    label: string;
    status: "connected" | "available" | "missing";
    detail: string;
    hint?: string;
    secretHint?: string | null;
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
  mcp: {
    url: string;
    projectId: string;
    hint: string;
    config?: { claude: unknown; cursor: unknown; grok: unknown };
  };
}

export function ToolsPanel({
  projectId,
  canWrite = false,
  onClose,
}: {
  projectId: string;
  canWrite?: boolean;
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
  const [domain, setDomain] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");

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

  async function postAction(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | { token?: string; error?: string; notice?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.notice || payload?.error || "No se pudo completar.");
      }
      if (payload?.token) setMcpToken(payload.token);
      setNotice(okMessage);
      if (body.action !== "mcp-token") await load();
      return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const write = Boolean(data?.canWrite ?? canWrite);

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
          <VercelTools
            vercel={data.vercel}
            write={write}
            busy={busy}
            domain={domain}
            envKey={envKey}
            envValue={envValue}
            onDomain={setDomain}
            onEnvKey={setEnvKey}
            onEnvValue={setEnvValue}
            onRedeploy={() => void postAction({ action: "vercel-redeploy" }, "Redeploy disparado.")}
            onPromote={(deploymentId) => void postAction({ action: "vercel-promote", deploymentId }, "Preview promovido a producción.")}
            onDomainSave={() => {
              void postAction({ action: "vercel-domain", domain }, "Dominio enviado a Vercel.").then((ok) => {
                if (ok) setDomain("");
              });
            }}
            onEnvSave={() => {
              void postAction({ action: "vercel-env", key: envKey.trim().toUpperCase(), value: envValue }, "Env cifrada. El valor no se vuelve a mostrar.").then((ok) => {
                if (ok) {
                  setEnvKey("");
                  setEnvValue("");
                }
              });
            }}
          />
        ) : tab === "integrations" ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.integrations.map((item) => (
              <div key={item.kind} className={cn("rounded-md border p-3", item.kind === "mcp" ? "border-black" : "border-[var(--border-1)]")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium">{item.label}</p>
                  <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                    <span className="status-shape" data-active={item.status === "connected"} />
                    {item.status === "connected" ? "conectado" : "disponible"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-[var(--fg-muted)]">{item.hint || item.detail}</p>
                {item.secretHint ? (
                  <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                    Bóveda · {item.secretHint}
                  </p>
                ) : null}
                {item.kind === "mcp" ? (
                  <button type="button" className="btn-ghost mt-2" onClick={() => setTab("mcp")}>
                    Emitir MCP
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : tab === "vault" ? (
          <div>
            <p className="text-[10px] leading-4 text-[var(--fg-muted)]">
              Nombres, alcance y estado. El valor se cifra y nunca se muestra otra vez.
            </p>
            {write ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={secretName} onChange={(event) => setSecretName(event.target.value)} placeholder="STRIPE_SECRET_KEY" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
                <input value={secretValue} onChange={(event) => setSecretValue(event.target.value)} placeholder="valor" type="password" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
                <button
                  type="button"
                  onClick={() => {
                    void postAction(
                      { action: "secret", name: secretName.trim().toUpperCase(), value: secretValue },
                      "Secreto cifrado. El valor no se vuelve a mostrar.",
                    ).then((ok) => {
                      if (ok) {
                        setSecretName("");
                        setSecretValue("");
                      }
                    });
                  }}
                  disabled={busy || !secretName || !secretValue}
                  className="btn-primary disabled:opacity-40"
                >
                  {busy ? <IconLoader size={12} className="animate-spin" /> : <IconKey size={12} />} Guardar
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-[var(--fg-muted)]">Sólo el owner escribe en la bóveda.</p>
            )}
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
            <ul className="mt-3 space-y-1 font-mono text-[10px] leading-4 text-[var(--fg-muted)]">
              <li>vforge_project_feedback — anotaciones y anclas</li>
              <li>vforge_project_context — referencias y HTML leído</li>
              <li>vforge_project_see — plugin de ojos: fotografía Escritorio y Móvil</li>
            </ul>
            <button
              type="button"
              onClick={() => void postAction({ action: "mcp-token" }, "Token visible una sola vez. Cópialo ahora.")}
              disabled={busy}
              className="btn-primary mt-3 disabled:opacity-40"
            >
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
            {data.mcp.config ? (
              <div className="mt-4 grid gap-2 lg:grid-cols-3">
                {(["claude", "cursor", "grok"] as const).map((client) => (
                  <div key={client} className="rounded-md border border-[var(--border-1)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[8px] uppercase tracking-[0.1em]">{client}</p>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => void navigator.clipboard.writeText(JSON.stringify(data.mcp.config?.[client], null, 2))}
                      >
                        <IconCopy size={11} />
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto font-mono text-[9px] leading-4 text-[var(--fg-muted)]">
                      {JSON.stringify(data.mcp.config?.[client], null, 2)}
                    </pre>
                  </div>
                ))}
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

function VercelTools({
  vercel,
  write,
  busy,
  domain,
  envKey,
  envValue,
  onDomain,
  onEnvKey,
  onEnvValue,
  onRedeploy,
  onPromote,
  onDomainSave,
  onEnvSave,
}: {
  vercel: ToolsPayload["vercel"];
  write: boolean;
  busy: boolean;
  domain: string;
  envKey: string;
  envValue: string;
  onDomain: (value: string) => void;
  onEnvKey: (value: string) => void;
  onEnvValue: (value: string) => void;
  onRedeploy: () => void;
  onPromote: (deploymentId: string) => void;
  onDomainSave: () => void;
  onEnvSave: () => void;
}) {
  if (!vercel.connected && !vercel.projectId) {
    return (
      <div>
        <p className="text-[11px] text-[var(--fg-muted)]">Esta sala aún no tiene proyecto Vercel enlazado.</p>
        <ActionStrip actions={vercel.actions} />
      </div>
    );
  }
  const production = vercel.url?.startsWith("http") ? vercel.url : vercel.url ? `https://${vercel.url}` : vercel.domain ? `https://${vercel.domain}` : null;
  return (
    <div className="space-y-4">
      <ActionStrip actions={vercel.actions} />
      <div className="rounded-md border border-[var(--border-1)] p-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Proyecto</p>
        <p className="mt-1 font-mono text-[11px]">{vercel.name || vercel.projectId || "sin id"}</p>
        <p className="mt-1 font-mono text-[10px] text-[var(--fg-muted)]">
          {[vercel.framework, vercel.projectId, vercel.github].filter(Boolean).join(" · ")}
        </p>
        {vercel.domain ? <p className="mt-1 text-[11px]">{vercel.domain}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {production ? (
            <a href={production} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px]">
              Abrir producción <IconExtLink size={10} />
            </a>
          ) : null}
          {write ? (
            <button type="button" onClick={onRedeploy} disabled={busy || !vercel.github} className="btn-primary disabled:opacity-40">
              {busy ? <IconLoader size={12} className="animate-spin" /> : null} Redeploy producción
            </button>
          ) : null}
        </div>
        {vercel.error ? <p className="mt-2 text-[10px]">{vercel.error}</p> : null}
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Deploys</p>
        <div className="mt-2 space-y-2">
          {(vercel.deployments ?? []).length ? (vercel.deployments ?? []).map((item) => (
            <div key={item.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border-1)] px-3 py-2">
              <a href={`https://${item.url}`} target="_blank" rel="noreferrer" className="min-w-0">
                <span className="truncate font-mono text-[10px]">{item.target} · {item.state}</span>
                <p className="truncate font-mono text-[8px] text-[var(--fg-muted)]">
                  {[item.ref, item.commit, item.message].filter(Boolean).join(" · ")}
                </p>
              </a>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-[var(--fg-muted)]">{new Date(item.createdAt).toISOString().slice(5, 16).replace("T", " ")}</span>
                {write && item.target !== "production" && /ready/i.test(item.state) ? (
                  <button type="button" className="btn-ghost" disabled={busy} onClick={() => onPromote(item.uid)}>
                    Promover
                  </button>
                ) : null}
              </div>
            </div>
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
        {write ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={domain} onChange={(event) => onDomain(event.target.value)} placeholder="app.tudominio.com" className="min-w-[180px] flex-1 rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
            <button type="button" onClick={onDomainSave} disabled={busy || !domain} className="btn-primary disabled:opacity-40">Agregar dominio</button>
          </div>
        ) : null}
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">Env · nombres, nunca valores</p>
        {write ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={envKey} onChange={(event) => onEnvKey(event.target.value)} placeholder="NEXT_PUBLIC_APP_URL" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
            <input value={envValue} onChange={(event) => onEnvValue(event.target.value)} placeholder="valor" type="password" className="rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[11px]" />
            <button type="button" onClick={onEnvSave} disabled={busy || !envKey || !envValue} className="btn-primary disabled:opacity-40">Alta env</button>
          </div>
        ) : null}
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

function ActionStrip({
  actions,
}: {
  actions?: Array<{ id: string; label: string; detail: string; write: boolean }>;
}) {
  if (!actions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((item) => (
        <span
          key={item.id}
          title={item.detail}
          className="rounded-md border border-[var(--border-1)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em]"
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
