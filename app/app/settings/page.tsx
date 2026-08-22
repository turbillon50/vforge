"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconCheck,
  IconCopy,
  IconCreditCard,
  IconFingerprint,
  IconKey,
  IconLink,
  IconLoader,
  IconSettings,
} from "@/components/brand/VFIcons";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

interface BillingState {
  plan: string;
  status: string | null;
  current_period_end: string | null;
}

interface McpResponse {
  token?: string;
  url?: string;
  config?: Record<string, unknown>;
  error?: string;
}

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Cuenta y acceso"
        title="Configuración."
        description="Lo indispensable para operar VForge: identidad, conexiones, plan y acceso MCP. Sin paneles de relleno."
      />

      <div className="grid gap-4 bg-[#f7f7f5] px-5 py-6 md:px-8 md:py-8 xl:grid-cols-2">
        <AccountPanel />
        <BillingPanel />
        <ConnectionsPanel />
        <McpPanel />
      </div>
    </div>
  );
}

function AccountPanel() {
  if (!hasClerkPublishableKey()) {
    return (
      <SettingsCard
        eyebrow="Identidad"
        title="Clerk no está disponible en este entorno."
        Icon={IconFingerprint}
      >
        <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
          La compilación local mantiene una sesión neutra. En producción esta
          tarjeta usa la cuenta autenticada real.
        </p>
      </SettingsCard>
    );
  }

  return <ClerkAccountPanel />;
}

function ClerkAccountPanel() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  return (
    <SettingsCard eyebrow="Identidad" title="Tu cuenta" Icon={IconFingerprint}>
      {!isLoaded ? (
        <div className="h-20 animate-pulse border border-[var(--border-1)] bg-[#f7f7f5]" />
      ) : (
        <div className="flex items-center gap-4 border-y border-[var(--border-1)] py-4">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-black text-[17px] font-medium">
            {(user?.firstName ?? user?.username ?? "V").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                user?.username ||
                "Cuenta VForge"}
            </p>
            <p className="mt-1 truncate font-mono text-[9px] text-[var(--fg-muted)]">
              {user?.emailAddresses?.[0]?.emailAddress ?? "Sin correo"}
            </p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => clerk.openUserProfile()}
        className="btn-ghost mt-4 w-full"
      >
        <IconSettings size={12} /> Editar cuenta en Clerk
      </button>
    </SettingsCard>
  );
}

function BillingPanel() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Inicia sesión para leer el plan."
              : `HTTP ${response.status}`,
          );
        }
        return (await response.json()) as BillingState;
      })
      .then(setBilling)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "No disponible"),
      )
      .finally(() => setLoading(false));
  }, []);

  const periodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin renovación programada";

  return (
    <SettingsCard eyebrow="Facturación" title="Plan vigente" Icon={IconCreditCard}>
      {loading ? (
        <div className="h-20 animate-pulse border border-[var(--border-1)] bg-[#f7f7f5]" />
      ) : error ? (
        <p className="border-l-2 border-black pl-3 text-[12px] leading-5">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-2 border border-[var(--border-1)]">
          <div className="border-r border-[var(--border-1)] p-4">
            <p className="mono-label">Plan</p>
            <p className="mt-3 text-[22px] font-medium capitalize">
              {billing?.plan ?? "free"}
            </p>
          </div>
          <div className="p-4">
            <p className="mono-label">Estado</p>
            <p className="mt-3 text-[12px] font-medium">
              {billing?.status ?? "Sin suscripción"}
            </p>
            <p className="mt-1 text-[9px] text-[var(--fg-muted)]">{periodEnd}</p>
          </div>
        </div>
      )}
      <Link href="/app/integrations" className="btn-ghost mt-4 w-full">
        <IconLink size={12} /> Gestionar Stripe y conexiones
      </Link>
    </SettingsCard>
  );
}

function ConnectionsPanel() {
  return (
    <SettingsCard
      eyebrow="Proveedores"
      title="Cuentas propias"
      Icon={IconLink}
    >
      <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
        GitHub, Vercel, Stripe, Neon, Clerk y el resto se conectan por usuario.
        VForge no sustituye la propiedad de esas cuentas.
      </p>
      <Link href="/app/integrations" className="btn-primary mt-5 w-full">
        <IconKey size={12} /> Abrir conexiones
      </Link>
    </SettingsCard>
  );
}

function McpPanel() {
  const [result, setResult] = useState<McpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mcp/token", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as McpResponse;
      if (!response.ok || !payload.token) {
        throw new Error(
          payload.error ||
            (response.status === 401
              ? "Inicia sesión para generar un token."
              : `HTTP ${response.status}`),
        );
      }
      setResult(payload);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo generar el token.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyConfig() {
    if (!result?.token) return;
    const config =
      result.config ?? {
        name: "VForge",
        url: result.url ?? "https://vforge.site/api/mcp",
        auth: "Bearer",
        token: result.token,
      };
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("El navegador no permitió copiar; selecciona el bloque manualmente.");
    }
  }

  return (
    <SettingsCard eyebrow="LLM y agentes" title="Acceso MCP" Icon={IconKey}>
      <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
        Genera una credencial individual para conectar un cliente MCP a VForge.
        El token sólo se muestra una vez.
      </p>

      {result?.token ? (
        <div className="mt-5">
          <p className="mono-label">Guárdalo ahora</p>
          <code className="mt-2 block max-h-28 overflow-auto break-all border border-black bg-black p-3 font-mono text-[9px] leading-5 text-white">
            {result.token}
          </code>
          <button type="button" onClick={() => void copyConfig()} className="btn-ghost mt-3 w-full">
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? "Configuración copiada" : "Copiar configuración MCP"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-35"
        >
          {loading ? (
            <IconLoader size={12} className="animate-spin" />
          ) : (
            <IconKey size={12} />
          )}
          {loading ? "Generando…" : "Generar token MCP"}
        </button>
      )}

      {error ? (
        <p className="mt-3 border-l-2 border-black pl-3 text-[11px] leading-5">
          {error}
        </p>
      ) : null}
    </SettingsCard>
  );
}

function SettingsCard({
  eyebrow,
  title,
  Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  Icon: typeof IconKey;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--border-1)] bg-white p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mono-label">{eyebrow}</p>
          <h2 className="mt-2 text-[19px] font-medium tracking-[-0.035em]">
            {title}
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center border border-black">
          <Icon size={14} />
        </span>
      </div>
      {children}
    </section>
  );
}
