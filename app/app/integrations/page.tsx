"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconActivity,
  IconCreditCard,
  IconDatabase,
  IconFingerprint,
  IconGithub,
  IconGlobe,
  IconKey,
  IconLink,
  IconRefresh,
  IconSend,
} from "@/components/brand/VFIcons";
import { AgentFabricPanel } from "@/components/integrations/AgentFabricPanel";

type ServiceIcon = typeof IconGithub;
type ServiceMode = "oauth" | "key";

interface Service {
  id: string;
  name: string;
  description: string;
  Icon: ServiceIcon;
  mode: ServiceMode;
  endpoint: string;
  placeholder?: string;
}

interface PlatformHealth {
  ok: boolean;
  ts?: string;
  db?: { status?: string; latency_ms?: number };
  vault?: { status?: string };
  openrouter?: { status?: string; latency_ms?: number };
}

const SERVICES: Service[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Repositorios y aplicación instalada.",
    Icon: IconGithub,
    mode: "oauth",
    endpoint: "/api/auth/github/start",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Previews, dominios y producción.",
    Icon: IconGlobe,
    mode: "oauth",
    endpoint: "/api/auth/vercel/start",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Cuenta conectada para pagos.",
    Icon: IconCreditCard,
    mode: "oauth",
    endpoint: "/api/auth/stripe/start",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Postgres de tu propia cuenta.",
    Icon: IconDatabase,
    mode: "key",
    endpoint: "/api/connect/neon",
    placeholder: "API key de Neon",
  },
  {
    id: "clerk",
    name: "Clerk",
    description: "Autenticación de tu propio proyecto.",
    Icon: IconFingerprint,
    mode: "key",
    endpoint: "/api/connect/clerk",
    placeholder: "Secret key de Clerk",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Correo transaccional y dominios.",
    Icon: IconSend,
    mode: "key",
    endpoint: "/api/connect/resend",
    placeholder: "API key de Resend",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "SMS, voz y WhatsApp.",
    Icon: IconActivity,
    mode: "key",
    endpoint: "/api/connect/twilio",
    placeholder: "AC...:auth-token",
  },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<string[]>([]);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [states, setStates] = useState<
    Record<string, "idle" | "saving" | "error">
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const [connectionsResponse, healthResponse] = await Promise.all([
        fetch("/api/onboarding/status", { cache: "no-store" }),
        fetch("/api/admin/health", { cache: "no-store" }),
      ]);

      if (connectionsResponse.ok) {
        const payload = (await connectionsResponse.json()) as {
          connected?: string[];
        };
        setConnected(
          Array.isArray(payload.connected)
            ? payload.connected.map((item) => item.toLowerCase())
            : [],
        );
      } else {
        setConnected([]);
      }

      const healthPayload = (await healthResponse.json().catch(() => null)) as
        | PlatformHealth
        | null;
      setHealth(healthPayload);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connectedSet = useMemo(() => new Set(connected), [connected]);

  async function saveKey(service: Service) {
    const value = values[service.id]?.trim();
    if (!value) return;

    setStates((current) => ({ ...current, [service.id]: "saving" }));
    setErrors((current) => ({ ...current, [service.id]: "" }));
    try {
      const response = await fetch(service.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: value }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `La conexión respondió HTTP ${response.status}.`);
      }
      setConnected((current) =>
        current.includes(service.id) ? current : [...current, service.id],
      );
      setValues((current) => ({ ...current, [service.id]: "" }));
      setEditing((current) => ({ ...current, [service.id]: false }));
      setStates((current) => ({ ...current, [service.id]: "idle" }));
    } catch (caught) {
      setStates((current) => ({ ...current, [service.id]: "error" }));
      setErrors((current) => ({
        ...current,
        [service.id]:
          caught instanceof Error ? caught.message : "No se pudo guardar la conexión.",
      }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Infraestructura propia"
        title="Conexiones."
        description="Tus cuentas siguen siendo tuyas. VForge autoriza, valida y guarda cada conexión cifrada sin mostrar secretos después."
        actions={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="btn-ghost"
          >
            <IconRefresh size={12} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        }
      />

      <section className="grid border-b border-[var(--border-1)] bg-[#f7f7f5] md:grid-cols-3">
        <HealthCell
          label="Base de datos"
          state={health?.db?.status}
          detail={
            health?.db?.latency_ms !== undefined
              ? `${health.db.latency_ms} ms`
              : undefined
          }
        />
        <HealthCell label="Vault cifrado" state={health?.vault?.status} />
        <HealthCell
          label="Motor auxiliar"
          state={health?.openrouter?.status}
          detail={
            health?.openrouter?.status === "missing-key"
              ? "Opcional"
              : health?.openrouter?.latency_ms !== undefined
                ? `${health.openrouter.latency_ms} ms`
                : undefined
          }
        />
      </section>

      <AgentFabricPanel />

      <section className="bg-white px-5 py-6 md:px-8 md:py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mono-label">Servicios autorizados</p>
            <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
              {loading
                ? "Leyendo conexiones…"
                : `${connectedSet.size} conexiones registradas para esta cuenta.`}
            </p>
          </div>
          <IconLink size={16} />
        </div>

        <div className="grid border-l border-t border-[var(--border-1)] lg:grid-cols-2">
          {SERVICES.map((service) => {
            const isConnected = connectedSet.has(service.id);
            const isEditing = editing[service.id] || !isConnected;
            const saving = states[service.id] === "saving";
            const error = errors[service.id];

            return (
              <article
                key={service.id}
                className="min-w-0 border-b border-r border-[var(--border-1)] p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center border border-black bg-white">
                      <service.Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[14px] font-medium">{service.name}</h2>
                      <p className="mt-1 text-[11px] leading-5 text-[var(--fg-muted)]">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em]">
                    <span className="status-shape" data-active={isConnected} />
                    {isConnected ? "Conectado" : "Pendiente"}
                  </span>
                </div>

                <div className="mt-5">
                  {service.mode === "oauth" ? (
                    <a
                      href={service.endpoint}
                      className={isConnected ? "btn-ghost w-full" : "btn-primary w-full"}
                    >
                      <IconLink size={12} />
                      {isConnected ? `Reconectar ${service.name}` : `Conectar ${service.name}`}
                    </a>
                  ) : isEditing ? (
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">{service.placeholder}</span>
                          <input
                            type="password"
                            autoComplete="off"
                            value={values[service.id] ?? ""}
                            onChange={(event) =>
                              setValues((current) => ({
                                ...current,
                                [service.id]: event.target.value,
                              }))
                            }
                            placeholder={service.placeholder}
                            className="min-h-11 w-full border border-[var(--border-1)] bg-white px-3 font-mono text-[11px] text-black placeholder:text-[var(--fg-muted)] focus:border-black focus:outline-none"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void saveKey(service)}
                          disabled={saving || !values[service.id]?.trim()}
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <IconKey size={12} />
                          {saving ? "Validando…" : "Validar y guardar"}
                        </button>
                      </div>
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing((current) => ({
                              ...current,
                              [service.id]: false,
                            }))
                          }
                          className="mt-2 text-[11px] underline underline-offset-4"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing((current) => ({
                          ...current,
                          [service.id]: true,
                        }))
                      }
                      className="btn-ghost w-full"
                    >
                      <IconKey size={12} /> Reemplazar credencial
                    </button>
                  )}
                  {error ? (
                    <p className="mt-3 border-l-2 border-black pl-3 text-[11px] leading-5">
                      {error}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-5 max-w-2xl text-[10px] leading-5 text-[var(--fg-muted)]">
          Las credenciales pegadas se validan contra el proveedor y se guardan
          cifradas en el vault del usuario. Esta pantalla nunca vuelve a leerlas
          ni las imprime.
        </p>
      </section>
    </div>
  );
}

function HealthCell({
  label,
  state,
  detail,
}: {
  label: string;
  state: string | undefined;
  detail?: string;
}) {
  const active = state === "ok" || state === "missing-key";
  return (
    <div className="border-b border-[var(--border-1)] px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:px-8">
      <p className="mono-label">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[12px] font-medium">
          <span className="status-shape" data-active={active} />
          {state ?? "Sin lectura"}
        </span>
        {detail ? (
          <span className="font-mono text-[9px] text-[var(--fg-muted)]">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}
