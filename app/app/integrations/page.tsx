"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import {
  AnthropicLogo,
  ClerkLogo,
  GitHubLogo,
  MercadoPagoLogo,
  NeonLogo,
  OpenAILogo,
  ResendLogo,
  StripeLogo,
  TwilioLogo,
  VercelLogo,
} from "@/components/brand/logos/ServiceLogos";

interface HealthData { ok: boolean; checks: Record<string, boolean | string | number> }

type LogoComponent = (props: { className?: string; style?: React.CSSProperties; "aria-label"?: string }) => React.ReactNode;

interface Service {
  id: string;
  name: string;
  description: string;
  Logo: LogoComponent;
  color: string;
  group: "core" | "optional";
  oauthKey?: string;
  pasteKey?: string;
  manual?: boolean;
}

const SERVICES: Service[] = [
  { id: "github", name: "GitHub", Logo: GitHubLogo, color: "#24211d", description: "Repositorios, ramas y cambios.", group: "core", oauthKey: "github" },
  { id: "vercel", name: "Vercel", Logo: VercelLogo, color: "#24211d", description: "Previews, producción y despliegues.", group: "core", oauthKey: "vercel" },
  { id: "neon", name: "Neon", Logo: NeonLogo, color: "#00a98f", description: "Base de datos PostgreSQL.", group: "optional", pasteKey: "neon" },
  { id: "clerk", name: "Clerk", Logo: ClerkLogo, color: "#6c47ff", description: "Identidad y acceso de usuarios.", group: "optional", pasteKey: "clerk" },
  { id: "stripe", name: "Stripe", Logo: StripeLogo, color: "#635bff", description: "Pagos y suscripciones.", group: "optional", oauthKey: "stripe" },
  { id: "resend", name: "Resend", Logo: ResendLogo, color: "#24211d", description: "Correo transaccional.", group: "optional", pasteKey: "resend" },
  { id: "anthropic", name: "Anthropic", Logo: AnthropicLogo, color: "#9b6d32", description: "Claude y automatización asistida.", group: "optional", manual: true },
  { id: "openai", name: "OpenAI", Logo: OpenAILogo, color: "#16846b", description: "Modelos auxiliares y herramientas.", group: "optional", manual: true },
  { id: "twilio", name: "Twilio", Logo: TwilioLogo, color: "#d7274b", description: "SMS, voz y WhatsApp.", group: "optional", manual: true },
  { id: "mp", name: "Mercado Pago", Logo: MercadoPagoLogo, color: "#008bc8", description: "Cobros en pesos mexicanos.", group: "optional", manual: true },
];

function ServiceCard({
  service,
  active,
  state,
  value,
  error,
  onValueChange,
  onSave,
}: {
  service: Service;
  active: boolean;
  state: "idle" | "saving" | "connected" | "error";
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
}) {
  const { Logo } = service;
  return (
    <article className="rounded-[20px] border border-[#d9d4c9] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#f0ede6]"><Logo className="h-5 w-5" style={{ color: service.color }} aria-label={service.name} /></span><div className="min-w-0"><h3 className="text-sm font-semibold text-[#1b1a17]">{service.name}</h3><p className="mt-1 text-xs leading-5 text-[#777168]">{service.description}</p></div></div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${active ? "bg-[#dff0e5] text-[#28704a]" : "bg-[#ebe7df] text-[#777168]"}`}>{active ? <Check className="h-3 w-3" /> : null}{active ? "Conectado" : "Sin conectar"}</span>
      </div>

      {!active ? (
        <div className="mt-4">
          {service.oauthKey ? <a href={`/api/auth/${service.oauthKey}/start`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d9d4c9] bg-[#f7f5ef] text-xs font-medium text-[#1b1a17] transition hover:border-[#ff5c35] hover:bg-[#fff3ef]">Conectar {service.name}<ExternalLink className="h-3.5 w-3.5" /></a> : null}
          {service.pasteKey ? <div className="flex gap-2"><input type="password" value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={`API key de ${service.name}`} className="h-10 min-w-0 flex-1 rounded-full border border-[#d9d4c9] bg-[#f7f5ef] px-3 text-xs text-[#1b1a17] outline-none placeholder:text-[#aaa49b] focus:border-[#ff5c35]" /><button onClick={onSave} disabled={state === "saving" || !value} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1b1a17] px-3 text-xs font-medium text-white hover:bg-[#ff5c35] disabled:opacity-40">{state === "saving" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}Guardar</button></div> : null}
          {service.manual ? <a href="/app/settings" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d9d4c9] bg-[#f7f5ef] text-xs font-medium text-[#1b1a17] transition hover:border-[#ff5c35]">Configurar en Ajustes<ExternalLink className="h-3.5 w-3.5" /></a> : null}
          {error ? <p className="mt-2 text-xs text-[#a33925]">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export default function IntegrationsPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pasteValues, setPasteValues] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, "idle" | "saving" | "connected" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function loadHealth() {
    setLoading(true);
    fetch("/api/admin/health", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { ok: false, checks: {} })
      .then(setData)
      .catch(() => setData({ ok: false, checks: {} }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, "idle" | "saving" | "connected" | "error"> = {};
    for (const key of ["github", "vercel", "stripe"]) if (params.get(key) === "ok") next[key] = "connected";
    setStates(next);
    loadHealth();
  }, []);

  async function connectPaste(key: string) {
    const value = pasteValues[key]?.trim();
    if (!value) return;
    setStates((current) => ({ ...current, [key]: "saving" }));
    setErrors((current) => ({ ...current, [key]: "" }));
    try {
      const response = await fetch(`/api/connect/${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: value }) });
      const result = await response.json();
      if (result.ok) setStates((current) => ({ ...current, [key]: "connected" }));
      else { setStates((current) => ({ ...current, [key]: "error" })); setErrors((current) => ({ ...current, [key]: result.error || "Credencial rechazada" })); }
    } catch {
      setStates((current) => ({ ...current, [key]: "error" }));
      setErrors((current) => ({ ...current, [key]: "Error de red" }));
    }
  }

  function isConnected(service: Service) {
    if (states[service.id] === "connected") return true;
    if (service.oauthKey && typeof window !== "undefined" && new URLSearchParams(window.location.search).get(service.oauthKey) === "ok") return true;
    if (service.pasteKey === "neon") return data?.checks?.db === true;
    if (service.pasteKey && data?.checks?.[service.pasteKey]) return Boolean(data.checks[service.pasteKey]);
    return false;
  }

  const connected = SERVICES.filter(isConnected).length;

  return (
    <div className="px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-[1080px]">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-[#ff5c35]">Fuentes del proyecto</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1b1a17] sm:text-5xl">Conexiones</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#777168]">VForge usa estas conexiones para ver repositorios, despliegues y servicios. Los invitados nunca reciben estas credenciales.</p></div>
          <button onClick={loadHealth} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#cfc9be] bg-white/65 px-4 text-sm font-medium text-[#1b1a17] hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</button>
        </header>

        <div className="mt-8 rounded-[18px] border border-[#d9d4c9] bg-[#ebe7df] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#1b1a17]">{connected} de {SERVICES.length} conectados</p><p className="text-xs text-[#777168]">GitHub y Vercel bastan para empezar</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#d4cfc5]"><div className="h-full rounded-full bg-[#ff5c35] transition-[width] duration-500" style={{ width: `${(connected / SERVICES.length) * 100}%` }} /></div></div>

        <section className="mt-8"><div className="mb-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#918b82]">Para la sala de revisión</p></div><div className="grid gap-3 md:grid-cols-2">{SERVICES.filter((service) => service.group === "core").map((service) => <ServiceCard key={service.id} service={service} active={isConnected(service)} state={states[service.id] ?? "idle"} value={service.pasteKey ? pasteValues[service.pasteKey] || "" : ""} error={errors[service.id]} onValueChange={(value) => service.pasteKey && setPasteValues((current) => ({ ...current, [service.pasteKey!]: value }))} onSave={() => service.pasteKey && void connectPaste(service.pasteKey)} />)}</div></section>
        <section className="mt-9"><div className="mb-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#918b82]">Servicios opcionales</p></div><div className="grid gap-3 md:grid-cols-2">{SERVICES.filter((service) => service.group === "optional").map((service) => <ServiceCard key={service.id} service={service} active={isConnected(service)} state={states[service.id] ?? "idle"} value={service.pasteKey ? pasteValues[service.pasteKey] || "" : ""} error={errors[service.id]} onValueChange={(value) => service.pasteKey && setPasteValues((current) => ({ ...current, [service.pasteKey!]: value }))} onSave={() => service.pasteKey && void connectPaste(service.pasteKey)} />)}</div></section>
      </div>
    </div>
  );
}
