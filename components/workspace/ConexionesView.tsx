"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/workspace/PageHeader";
import {
  IconCheck,
  IconGithub,
  IconRefresh,
  IconRocket,
  IconCreditCard,
  IconCpu,
  IconArrowR,
} from "@/components/brand/VFIcons";

type Provider = "github" | "vercel" | "stripe";

interface OnboardingStatus {
  connected?: Provider[];
}

/* -------------------------------------------------------------
   Small reusable components
------------------------------------------------------------- */
function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium
        ${
          connected
            ? "bg-black text-white"
            : "bg-white border-[var(--border-1)] text-[var(--fg-secondary)]"
        }`}
    >
      {connected && <IconCheck className="h-3 w-3" aria-hidden="true" />}
      {connected ? "Conectado" : "Desconectado"}
    </span>
  );
}

function ReadyBadge() {
  return (
    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
      Listo
    </span>
  );
}

function ConnectionCard({
  title,
  description,
  icon,
  connected,
  connectUrl,
  signupUrl,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  connectUrl?: string;
  signupUrl?: string;
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border-1)] bg-white p-4
                 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          {icon}
          {title}
        </h2>
        <StatusBadge connected={connected} />
        {connected && <ReadyBadge />}
      </div>

      <p className="mt-2 text-xs text-[var(--fg-secondary)]">{description}</p>

      {!connected && connectUrl && (
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={connectUrl}
            className="inline-flex items-center gap-1 rounded bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--border-1)]"
          >
            <IconArrowR className="h-3 w-3" aria-hidden="true" />
            Conectar
          </a>
          {signupUrl && (
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--fg-secondary)] underline"
            >
              Crear cuenta
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Main view
------------------------------------------------------------- */
export function ConexionesView() {
  const [connected, setConnected] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/onboarding/status");
      if (!resp.ok) throw new Error("Error al obtener el estado");
      const data: OnboardingStatus = await resp.json();
      const list = Array.isArray(data.connected) ? data.connected : [];
      setConnected(list as Provider[]);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isConnected = (p: Provider) => connected.includes(p);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-black" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Conexiones" />

      {error && (
        <div className="mb-4 rounded bg-red-100 border border-red-200 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={fetchStatus}
          className="inline-flex items-center gap-1 rounded bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] border border-[var(--border-1)] hover:bg-[var(--border-1)]"
        >
          <IconRefresh className="h-3 w-3" aria-hidden="true" />
          Actualizar
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* GitHub */}
        <ConnectionCard
          title="GitHub"
          description="Conexión OAuth para crear e importar repositorios."
          icon={<IconGithub className="h-4 w-4" aria-hidden="true" />}
          connected={isConnected("github")}
          connectUrl="/api/auth/github/start?return_to=%2Fworkspace%2Fconexiones"
          signupUrl="https://github.com/signup"
        />

        {/* Vercel */}
        <ConnectionCard
          title="Vercel"
          description="Conecta Vercel para desplegar tus proyectos."
          icon={<IconRocket className="h-4 w-4" aria-hidden="true" />}
          connected={isConnected("vercel")}
          connectUrl="/api/auth/vercel/start?return_to=%2Fworkspace%2Fconexiones"
          signupUrl="https://vercel.com/signup"
        />

        {/* Stripe */}
        <ConnectionCard
          title="Stripe"
          description="Conecta Stripe para gestionar pagos y suscripciones."
          icon={<IconCreditCard className="h-4 w-4" aria-hidden="true" />}
          connected={isConnected("stripe")}
          connectUrl="/api/auth/stripe/start?return_to=%2Fworkspace%2Fconexiones"
          signupUrl="https://dashboard.stripe.com/register"
        />
      </div>

      {/* Información estática */}
      <section className="mt-8 rounded border border-[var(--border-1)] bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <IconCpu className="h-4 w-4" aria-hidden="true" />
          Modelos de IA
        </h3>
        <p className="mt-2 text-xs text-[var(--fg-secondary)]">
          Cada usuario elige y aporta sus modelos o tokens dentro de sus chats.
          VForge no impone un proveedor desde este panel.
        </p>
      </section>
    </section>
  );
}

export default ConexionesView;