"use client";

import { useState } from "react";
import {
  IconGithub,
  IconGlobe,
  IconCreditCard,
  IconKey,
  IconCheck,
  IconCopy,
  IconLoader,
  IconArrowR,
} from "@/components/brand/VFIcons";

type StepId = "github" | "vercel" | "optional" | "done";

type Props = {
  connections: Set<string>;
  onRefresh?: () => void;
  onComplete?: () => void;
};

export function ConnectSteps({ connections, onRefresh, onComplete }: Props) {
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const hasGithub = connections.has("github");
  const hasVercel = connections.has("vercel");
  const hasStripe = connections.has("stripe");
  const coreReady = hasGithub && hasVercel;

  const current: StepId = !hasGithub
    ? "github"
    : !hasVercel
      ? "vercel"
      : showOptional
        ? "optional"
        : "done";

  async function generateMcp() {
    setLoading(true);
    setMcpToken(null);
    try {
      const res = await fetch("/api/mcp/token", { method: "POST" });
      const data = await res.json();
      if (data?.token) {
        setMcpToken(data.token);
        setMcpUrl(data.url || "https://vforge.site/api/mcp");
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!mcpToken) return;
    await navigator.clipboard.writeText(mcpToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // —— Núcleo listo: GitHub + Vercel ——
  if (current === "done" && coreReady) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-5 py-12">
        <div className="mx-auto grid h-12 w-12 place-items-center border border-black bg-black text-white">
          <IconCheck size={20} />
        </div>
        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Base lista
        </p>
        <h2 className="mt-3 text-center text-[28px] font-semibold tracking-[-0.04em]">
          Ya puedes construir.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-[14px] leading-6 text-[var(--fg-secondary)]">
          GitHub y Vercel están conectados. Stripe y MCP son opcionales: actívalos cuando cobres o controles desde Claude/Grok.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onComplete}
            className="btn-primary !min-h-11 !px-6"
          >
            Ir al estudio <IconArrowR size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowOptional(true)}
            className="btn-ghost !min-h-11 !px-6"
          >
            Stripe + MCP
          </button>
        </div>

        <div className="mt-12 grid gap-3 border-t border-[var(--border-1)] pt-8 sm:grid-cols-3">
          {[
            { id: "github", label: "GitHub", ok: hasGithub, Icon: IconGithub },
            { id: "vercel", label: "Vercel", ok: hasVercel, Icon: IconGlobe },
            { id: "stripe", label: "Stripe", ok: hasStripe, Icon: IconCreditCard },
          ].map(({ id, label, ok, Icon }) => (
            <div
              key={id}
              className="flex items-center gap-2 border border-[var(--border-1)] bg-white px-3 py-3"
            >
              <Icon size={14} />
              <span className="text-[12px] font-medium">{label}</span>
              <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                {ok ? "OK" : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // —— Opcionales: Stripe + MCP ——
  if (current === "optional") {
    return (
      <div className="mx-auto w-full max-w-[560px] px-5 py-10">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Opcional
        </p>
        <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-[-0.045em]">
          Cobra y controla con IA
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-6 text-[var(--fg-secondary)]">
          Stripe para pagos reales. MCP para operar VForge desde Claude, Grok o ChatGPT.
        </p>

        <div className="mt-8 space-y-4">
          <a
            href="/api/auth/stripe/start"
            className="flex items-center justify-between border border-[var(--border-1)] bg-white px-4 py-4 hover:border-black"
          >
            <span className="flex items-center gap-3">
              <IconCreditCard size={16} />
              <span>
                <span className="block text-[13px] font-medium">Stripe</span>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  {hasStripe ? "Conectado" : "Conectar cuenta"}
                </span>
              </span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
              {hasStripe ? "OK" : "Conectar"}
            </span>
          </a>

          <div className="border border-[var(--border-1)] bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <IconKey size={16} />
                <span>
                  <span className="block text-[13px] font-medium">Token MCP</span>
                  <span className="text-[11px] text-[var(--fg-muted)]">
                    Control desde otros modelos
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => void generateMcp()}
                disabled={loading}
                className="btn-primary !min-h-9 !px-3 text-[11px] disabled:opacity-40"
              >
                {loading ? <IconLoader size={12} className="animate-spin" /> : null}
                Generar
              </button>
            </div>
            {mcpToken ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={mcpToken}
                  className="min-h-10 flex-1 border border-[var(--border-1)] bg-[#f7f7f5] px-3 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => void copyToken()}
                  className="btn-ghost !min-h-10 !px-3"
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : null}
            {mcpUrl ? (
              <p className="mt-2 font-mono text-[10px] text-[var(--fg-muted)]">{mcpUrl}</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="btn-primary mt-8 !min-h-11 !px-6"
        >
          Ir al estudio <IconArrowR size={13} />
        </button>
      </div>
    );
  }

  // —— Pasos núcleo: GitHub luego Vercel ——
  const step =
    current === "github"
      ? {
          n: "01",
          title: "GitHub",
          why: "Sin repositorio no hay producto real. Cada cambio, cada versión y cada agente trabajan sobre código que vive aquí. Es la base de la empresa.",
          action: "Conectar GitHub",
          href: "/api/auth/github/start",
          Icon: IconGithub,
        }
      : {
          n: "02",
          title: "Vercel",
          why: "Sin despliegue no hay preview ni dominio en vivo. Tus clientes no ven el avance mientras construyes. Conéctalo y el taller cobra sentido.",
          action: "Conectar Vercel",
          href: "/api/auth/vercel/start",
          Icon: IconGlobe,
        };

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-10">
      <div className="mb-10 flex items-center gap-2">
        {["01", "02"].map((n, i) => {
          const done = (i === 0 && hasGithub) || (i === 1 && hasVercel);
          const active =
            (i === 0 && current === "github") || (i === 1 && current === "vercel");
          return (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-medium " +
                  (done || active
                    ? "bg-black text-white"
                    : "border border-[var(--border-1)] text-[var(--fg-muted)]")
                }
              >
                {done ? <IconCheck size={12} /> : n}
              </div>
              {i === 0 ? (
                <div className={"h-px flex-1 " + (hasGithub ? "bg-black" : "bg-[var(--border-1)]")} />
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
        Paso {step.n} de 02 · esencial
      </p>
      <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-[-0.045em]">
        {step.title}
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-6 text-[var(--fg-secondary)]">
        {step.why}
      </p>

      <div className="mt-8">
        <a href={step.href} className="btn-primary !min-h-11 !px-6 inline-flex items-center gap-2">
          <step.Icon size={14} />
          {step.action}
        </a>
      </div>

      {current === "vercel" ? (
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 text-[12px] text-[var(--fg-muted)] underline underline-offset-4"
        >
          Ya lo conecté · actualizar
        </button>
      ) : null}

      <div className="mt-12 grid gap-3 border-t border-[var(--border-1)] pt-8 sm:grid-cols-2">
        {[
          { id: "github", label: "GitHub", ok: hasGithub, Icon: IconGithub },
          { id: "vercel", label: "Vercel", ok: hasVercel, Icon: IconGlobe },
        ].map(({ id, label, ok, Icon }) => (
          <div
            key={id}
            className="flex items-center gap-2 border border-[var(--border-1)] bg-white px-3 py-3"
          >
            <Icon size={14} />
            <span className="text-[12px] font-medium">{label}</span>
            <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              {ok ? "OK" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
