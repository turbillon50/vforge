"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { CheckCircle2, CircleDot, XCircle, Github, Link2, Triangle, Database, Mail, KeyRound, Loader2 } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface HealthData {
  ok: boolean;
  checks: Record<string, boolean | string | number>;
}

interface IntegrationStat {
  name: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export default function IntegrationsPage() {
  const t = useT();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ghStatus, setGhStatus] = useState<string | null>(null);
  const [vcStatus, setVcStatus] = useState<string | null>(null);
  const [neonStatus, setNeonStatus] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get("github");
    const v = sp.get("vercel");
    const n = sp.get("neon");
    if (g) setGhStatus(g);
    if (v) setVcStatus(v);
    if (n) setNeonStatus(n);
    if (g || v || n) window.history.replaceState({}, "", "/app/integrations");
  }, []);

  useEffect(() => {
    fetch("/api/v-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const integrations: IntegrationStat[] = data
    ? Object.entries(data.checks).map(([name, value]) => {
        const isBool = typeof value === "boolean";
        const ok = isBool ? value : true;
        return {
          name,
          status: ok ? "ok" : "error",
          detail: String(value),
        };
      })
    : [];

  return (
    <>
      <PageHeader
        eyebrow={t.integrations.eyebrow}
        title={t.integrations.title}
        description={t.integrations.body}
      />

      <div className="px-5 py-6 md:px-8">
        {/* Conectar GitHub — OAuth de un click, sin pegar tokens */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <Github size={20} className="text-on-surface" />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                  GitHub
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {ghStatus === "connected"
                    ? "Conectado. V ya puede leer y operar tus repos."
                    : ghStatus && ghStatus.startsWith("error")
                      ? "No se pudo conectar. Reintenta."
                      : "Autoriza con un click — sin pegar tokens."}
                </p>
              </div>
            </div>
            <a
              href="/api/auth/github/start"
              className={"inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium transition " + (ghStatus === "connected" ? "border border-app bg-tint-1 text-on-surface hover:border-app-strong" : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:opacity-95")}
            >
              {ghStatus === "connected" ? (<><CheckCircle2 size={16} /> Reconectar</>) : (<><Link2 size={16} /> Conectar GitHub</>)}
            </a>
          </div>
        </div>

        {/* Conectar Vercel — Integration V-Forge */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <Triangle size={18} className="fill-current text-on-surface" />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                  Vercel
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {vcStatus === "connected"
                    ? "Conectado. Deploys y dominios gestionados desde aquí."
                    : vcStatus && vcStatus.startsWith("error")
                      ? "No se pudo conectar. Reintenta."
                      : "Instala la integración V-Forge con un click."}
                </p>
              </div>
            </div>
            <a
              href="/api/auth/vercel/start"
              className={"inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium transition " + (vcStatus === "connected" ? "border border-app bg-tint-1 text-on-surface hover:border-app-strong" : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:opacity-95")}
            >
              {vcStatus === "connected" ? (<><CheckCircle2 size={16} /> Reconectar</>) : (<><Link2 size={16} /> Conectar Vercel</>)}
            </a>
          </div>
        </div>

        {/* Conectar Neon — OAuth2 estándar de un click */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <Database size={18} className="text-on-surface" />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                  Neon
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {neonStatus === "connected"
                    ? "Conectado. V puede crear y leer tus proyectos Postgres."
                    : neonStatus && neonStatus.startsWith("error")
                      ? "No se pudo conectar. Reintenta."
                      : "Autoriza con un click — sin pegar tokens."}
                </p>
              </div>
            </div>
            <a
              href="/api/auth/neon/start"
              className={"inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium transition " + (neonStatus === "connected" ? "border border-app bg-tint-1 text-on-surface hover:border-app-strong" : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:opacity-95")}
            >
              {neonStatus === "connected" ? (<><CheckCircle2 size={16} /> Reconectar</>) : (<><Link2 size={16} /> Conectar Neon</>)}
            </a>
          </div>
        </div>

        {/* Conectar Clerk — paste-key validado (Clerk no tiene OAuth de conexión) */}
        <PasteKeyCard
          service="clerk"
          title="Clerk"
          icon={<KeyRound size={18} className="text-on-surface" />}
          description="Clerk no ofrece OAuth para conectar tu cuenta. Pega tu Secret Key (sk_...) y la validamos."
          placeholder="sk_live_..."
        />

        {/* Conectar Resend — paste-key validado (API key, no OAuth) */}
        <PasteKeyCard
          service="resend"
          title="Resend"
          icon={<Mail size={18} className="text-on-surface" />}
          description="Resend usa API key, no OAuth. Pega tu key (re_...) y la validamos al instante."
          placeholder="re_..."
        />

        {loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[100px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && integrations.length === 0 && (
          <div className="rounded-xl border border-app bg-tint-1 p-10 text-center text-on-surface-variant">
            <p className="font-display text-lg">No pude leer el healthcheck</p>
            <p className="mt-2 text-sm">
              El endpoint /api/v-health no respondió. Revisa logs.
            </p>
          </div>
        )}

        {!loading && integrations.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((i) => (
              <div
                key={i.name}
                className="rounded-xl border border-app bg-tint-1 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-semibold text-on-surface capitalize">
                    {i.name.replace(/_/g, " ")}
                  </p>
                  {i.status === "ok" && (
                    <CheckCircle2 size={16} className="text-success-emerald shrink-0" />
                  )}
                  {i.status === "warning" && (
                    <CircleDot size={16} className="text-cyber-cyan animate-pulse shrink-0" />
                  )}
                  {i.status === "error" && (
                    <XCircle size={16} className="text-error-crimson shrink-0" />
                  )}
                </div>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted truncate">
                  {i.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface PasteKeyCardProps {
  service: "clerk" | "resend";
  title: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
}

function PasteKeyCard({ service, title, icon, description, placeholder }: PasteKeyCardProps) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; account?: string; error?: string } | null>(null);

  const connect = async () => {
    if (!key.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`/api/connect/${service}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const d = (await r.json()) as { ok: boolean; account?: string; error?: string };
      setResult(d);
      if (d.ok) setKey("");
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const connected = result?.ok === true;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
            {icon}
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
              {title}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
              {connected
                ? `Conectado. ${result?.account ?? "Llave validada"}.`
                : description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className="h-11 flex-1 rounded-xl border border-app bg-tint-1 px-4 font-mono text-[13px] text-on-surface placeholder:text-muted outline-none transition focus:border-app-strong"
          />
          <button
            type="button"
            onClick={connect}
            disabled={busy || !key.trim()}
            className={"inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium transition disabled:opacity-50 " + (connected ? "border border-app bg-tint-1 text-on-surface hover:border-app-strong" : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:opacity-95")}
          >
            {busy ? (<><Loader2 size={16} className="animate-spin" /> Validando</>) : connected ? (<><CheckCircle2 size={16} /> Conectado</>) : (<><Link2 size={16} /> Conectar</>)}
          </button>
        </div>

        {result && !result.ok && (
          <p className="flex items-center gap-2 text-[13px] text-error-crimson">
            <XCircle size={14} className="shrink-0" /> {result.error ?? "No se pudo validar la llave."}
          </p>
        )}
        {connected && (
          <p className="flex items-center gap-2 text-[13px] text-success-emerald">
            <CheckCircle2 size={14} className="shrink-0" /> Llave validada y guardada de forma cifrada.
          </p>
        )}
      </div>
    </div>
  );
}
