"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  CheckCircle2,
  CircleDot,
  XCircle,
  Github,
  Link2,
  Triangle,
  Database,
  CreditCard,
  Mail,
  Loader2,
  KeyRound,
} from "lucide-react";
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
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);

  // Resend se conecta pegando API key (no soporta OAuth).
  const [resendKey, setResendKey] = useState("");
  const [resendState, setResendState] = useState<
    "idle" | "saving" | "connected" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [neonKey, setNeonKey] = useState("");
  const [neonState, setNeonState] = useState<"idle" | "saving" | "connected" | "error">("idle");
  const [neonError, setNeonError] = useState<string | null>(null);
  const [clerkKey, setClerkKey] = useState("");
  const [clerkState, setClerkState] = useState<"idle" | "saving" | "connected" | "error">("idle");
  const [clerkError, setClerkError] = useState<string | null>(null);

  async function connectPaste(
    service: "neon" | "clerk",
    key: string,
    setSt: (s: "idle" | "saving" | "connected" | "error") => void,
    setErr: (e: string | null) => void,
  ) {
    if (!key.trim()) return;
    setSt("saving");
    setErr(null);
    try {
      const res = await fetch(`/api/connect/${service}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const d = await res.json();
      if (d.ok) setSt("connected");
      else { setSt("error"); setErr(d.error || "rechazada"); }
    } catch {
      setSt("error"); setErr("No se pudo validar. Reintenta.");
    }
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get("github");
    const v = sp.get("vercel");
    const n = sp.get("neon");
    const s = sp.get("stripe");
    if (g) setGhStatus(g);
    if (v) setVcStatus(v);
    if (n) setNeonStatus(n);
    if (s) setStripeStatus(s);
    if (g || v || n || s) window.history.replaceState({}, "", "/app/integrations");
  }, []);

  useEffect(() => {
    fetch("/api/v-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function connectResend() {
    if (!resendKey.trim()) return;
    setResendState("saving");
    setResendError(null);
    try {
      const res = await fetch("/api/connect/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: resendKey.trim() }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        setResendState("connected");
        setResendKey("");
      } else {
        setResendState("error");
        setResendError(body.error || "error");
      }
    } catch {
      setResendState("error");
      setResendError("network");
    }
  }

  const integrations: IntegrationStat[] = data
    ? Object.entries(data.checks).map(([name, value]) => {
        const isBool = typeof value === "boolean";
        const ok = isBool ? value : true;
        return {
          name,
          status: ok ? "ok" : "error",
          detail: isBool ? (value ? "Activo" : "Inactivo") : String(value),
        };
      })
    : [];

  const oauthBtn = (connected: boolean) =>
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium transition " +
    (connected
      ? "border border-app bg-tint-1 text-on-surface hover:border-app-strong"
      : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow-violet hover:opacity-95");

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
            <a href="/api/auth/github/start" className={oauthBtn(ghStatus === "connected")}>
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
            <a href="/api/auth/vercel/start" className={oauthBtn(vcStatus === "connected")}>
              {vcStatus === "connected" ? (<><CheckCircle2 size={16} /> Reconectar</>) : (<><Link2 size={16} /> Conectar Vercel</>)}
            </a>
          </div>
        </div>

        {/* Conectar Neon — API key validada (OAuth de Neon es solo partners) */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <Database size={19} className="text-on-surface" />
              </span>
              <div className="flex-1">
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">Neon</p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {neonState === "connected"
                    ? "Conectado. Tu API key fue validada y guardada cifrada."
                    : "Pega tu API key de Neon (console.neon.tech → Account → API keys). La validamos y se guarda cifrada."}
                </p>
              </div>
            </div>
            {neonState !== "connected" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input type="password" autoComplete="off" value={neonKey} onChange={(e) => setNeonKey(e.target.value)} placeholder="napi_xxxxxxxxxxxx" className="h-11 flex-1 rounded-xl border border-app bg-tint-1 px-4 font-mono text-[13px] text-on-surface placeholder:text-muted focus:border-app-strong focus:outline-none" />
                <button type="button" onClick={() => connectPaste("neon", neonKey, setNeonState, setNeonError)} disabled={neonState === "saving" || !neonKey.trim()} className={oauthBtn(false) + " disabled:opacity-50"}>
                  {neonState === "saving" ? (<><Loader2 size={16} className="animate-spin" /> Validando…</>) : (<><Link2 size={16} /> Conectar Neon</>)}
                </button>
              </div>
            )}
            {neonState === "connected" && (<div className="flex items-center gap-2 text-[13px] text-success-emerald"><CheckCircle2 size={16} /> API key validada y conectada.</div>)}
            {neonState === "error" && (<p className="text-[13px] text-error-crimson">{neonError || "No se pudo validar."}</p>)}
          </div>
        </div>

        {/* Conectar Clerk — API key validada (Clerk no tiene OAuth de cuenta) */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <KeyRound size={19} className="text-on-surface" />
              </span>
              <div className="flex-1">
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">Clerk</p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {clerkState === "connected"
                    ? "Conectado. Tu secret key fue validada y guardada cifrada."
                    : "Si quieres usar tu propia instancia de Clerk, pega tu Secret Key (sk_…). Se valida y se guarda cifrada."}
                </p>
              </div>
            </div>
            {clerkState !== "connected" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input type="password" autoComplete="off" value={clerkKey} onChange={(e) => setClerkKey(e.target.value)} placeholder="sk_live_xxxxxxxxxxxx" className="h-11 flex-1 rounded-xl border border-app bg-tint-1 px-4 font-mono text-[13px] text-on-surface placeholder:text-muted focus:border-app-strong focus:outline-none" />
                <button type="button" onClick={() => connectPaste("clerk", clerkKey, setClerkState, setClerkError)} disabled={clerkState === "saving" || !clerkKey.trim()} className={oauthBtn(false) + " disabled:opacity-50"}>
                  {clerkState === "saving" ? (<><Loader2 size={16} className="animate-spin" /> Validando…</>) : (<><Link2 size={16} /> Conectar Clerk</>)}
                </button>
              </div>
            )}
            {clerkState === "connected" && (<div className="flex items-center gap-2 text-[13px] text-success-emerald"><CheckCircle2 size={16} /> Secret key validada y conectada.</div>)}
            {clerkState === "error" && (<p className="text-[13px] text-error-crimson">{clerkError || "No se pudo validar."}</p>)}
          </div>
        </div>

        {/* Conectar Stripe — Connect OAuth real (connect.stripe.com) */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <CreditCard size={19} className="text-on-surface" />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                  Stripe
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {stripeStatus === "connected"
                    ? "Conectado. Cobros y suscripciones de tu cuenta Stripe."
                    : stripeStatus === "error_denied"
                      ? "Autorización cancelada. Reintenta."
                      : stripeStatus && stripeStatus.startsWith("error")
                        ? "No se pudo conectar. Reintenta."
                        : "Conecta tu cuenta con Stripe Connect — un click."}
                </p>
              </div>
            </div>
            <a href="/api/auth/stripe/start" className={oauthBtn(stripeStatus === "connected")}>
              {stripeStatus === "connected" ? (<><CheckCircle2 size={16} /> Reconectar</>) : (<><Link2 size={16} /> Conectar Stripe</>)}
            </a>
          </div>
        </div>

        {/* Conectar Resend — NO soporta OAuth: API key validada */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-app bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint-2">
                <Mail size={19} className="text-on-surface" />
              </span>
              <div className="flex-1">
                <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                  Resend
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                  {resendState === "connected"
                    ? "Conectado. Tu API key fue validada y guardada cifrada."
                    : "Resend no usa OAuth: pega tu API key (re_…). La validamos y se guarda cifrada."}
                </p>
              </div>
            </div>

            {resendState !== "connected" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="password"
                  inputMode="text"
                  autoComplete="off"
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  className="h-11 flex-1 rounded-xl border border-app bg-tint-1 px-4 font-mono text-[13px] text-on-surface placeholder:text-muted focus:border-app-strong focus:outline-none"
                />
                <button
                  type="button"
                  onClick={connectResend}
                  disabled={resendState === "saving" || !resendKey.trim()}
                  className={oauthBtn(false) + " disabled:opacity-50"}
                >
                  {resendState === "saving" ? (
                    <><Loader2 size={16} className="animate-spin" /> Validando…</>
                  ) : (
                    <><Link2 size={16} /> Conectar Resend</>
                  )}
                </button>
              </div>
            )}

            {resendState === "connected" && (
              <div className="flex items-center gap-2 text-[13px] text-success-emerald">
                <CheckCircle2 size={16} /> API key validada y conectada.
              </div>
            )}
            {resendState === "error" && (
              <p className="text-[13px] text-error-crimson">
                {resendError === "invalid_key"
                  ? "API key inválida — Resend la rechazó."
                  : resendError === "bad_format"
                    ? "Formato inválido: debe empezar con re_."
                    : "No se pudo validar la key. Reintenta."}
              </p>
            )}
          </div>
        </div>

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
