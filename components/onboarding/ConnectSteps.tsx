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

type StepId = "github" | "vercel" | "stripe" | "mcp" | "done";

const STEPS: Array<{
  id: StepId;
  n: string;
  title: string;
  why: string;
  action: string;
  href?: string;
}> = [
  {
    id: "github",
    n: "01",
    title: "GitHub",
    why: "Sin GitHub no existe el código real. Cada cambio y cada versión viven ahí. Es la base de la empresa.",
    action: "Conectar GitHub",
    href: "/api/auth/github/start",
  },
  {
    id: "vercel",
    n: "02",
    title: "Vercel",
    why: "Sin Vercel no hay preview ni dominio en vivo. Tus clientes no ven el producto mientras se construye.",
    action: "Conectar Vercel",
    href: "/api/auth/vercel/start",
  },
  {
    id: "stripe",
    n: "03",
    title: "Stripe",
    why: "Sin Stripe no cobras. La app se queda en demo. Conéctalo ahora para facturar cuando el producto esté listo.",
    action: "Conectar Stripe",
    href: "/api/auth/stripe/start",
  },
  {
    id: "mcp",
    n: "04",
    title: "Token MCP",
    why: "El token te deja controlar VForge desde Claude, Grok o ChatGPT. Es el puente con los modelos que ya usas.",
    action: "Generar token MCP",
  },
];

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

  const current: StepId = !connections.has("github")
    ? "github"
    : !connections.has("vercel")
      ? "vercel"
      : !connections.has("stripe")
        ? "stripe"
        : mcpToken
          ? "done"
          : "mcp";

  const stepIndex = STEPS.findIndex((s) => s.id === current);
  const step = STEPS[Math.max(0, stepIndex)] ?? STEPS[0];

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

  if (current === "done") {
    return (
      <div className="mx-auto w-full max-w-[520px] px-5 py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center border border-black">
          <IconCheck size={20} />
        </div>
        <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Listo
        </p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">
          Infraestructura conectada.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-[var(--fg-secondary)]">
          GitHub, Vercel, Stripe y el token MCP están listos. Ya puedes construir y operar.
        </p>
        {onComplete ? (
          <button
            type="button"
            onClick={onComplete}
            className="btn-primary mt-8 !min-h-11 !px-6"
          >
            Ir al estudio <IconArrowR size={13} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-10">
      {/* Progress — estilo Stitch */}
      <div className="mb-10 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-medium " +
                  (done || active
                    ? "bg-black text-white"
                    : "border border-[var(--border-1)] text-[var(--fg-muted)]")
                }
              >
                {done ? <IconCheck size={12} /> : s.n}
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={
                    "h-px flex-1 " +
                    (done ? "bg-black" : "bg-[var(--border-1)]")
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
        Paso {stepIndex + 1} de {STEPS.length}
      </p>
      <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-[-0.045em]">
        {step.title}
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-6 text-[var(--fg-secondary)]">
        {step.why}
      </p>

      <div className="mt-8">
        {step.id === "mcp" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void generateMcp()}
              disabled={loading}
              className="btn-primary !min-h-11 !px-6 disabled:opacity-40"
            >
              {loading ? (
                <IconLoader size={13} className="animate-spin" />
              ) : (
                <IconKey size={13} />
              )}
              {step.action}
            </button>
            {mcpToken ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={mcpToken}
                  className="min-h-11 flex-1 border border-[var(--border-1)] bg-[#f7f7f5] px-3 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => void copyToken()}
                  className="btn-primary !min-h-11 !px-4"
                >
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : null}
            {mcpUrl ? (
              <p className="font-mono text-[10px] text-[var(--fg-muted)]">{mcpUrl}</p>
            ) : null}
          </div>
        ) : (
          <a href={step.href} className="btn-primary !min-h-11 !px-6 inline-flex">
            {step.id === "github" && <IconGithub size={14} />}
            {step.id === "vercel" && <IconGlobe size={14} />}
            {step.id === "stripe" && <IconCreditCard size={14} />}
            {step.action}
          </a>
        )}
      </div>

      {step.id !== "github" && step.id !== "mcp" ? (
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 text-[12px] text-[var(--fg-muted)] underline underline-offset-4"
        >
          Ya lo conecté · actualizar
        </button>
      ) : null}

      {/* Cards estilo Stitch: resumen de lo ya conectado */}
      <div className="mt-12 grid gap-3 border-t border-[var(--border-1)] pt-8 sm:grid-cols-3">
        {[
          { id: "github", label: "GitHub", Icon: IconGithub },
          { id: "vercel", label: "Vercel", Icon: IconGlobe },
          { id: "stripe", label: "Stripe", Icon: IconCreditCard },
        ].map(({ id, label, Icon }) => {
          const ok = connections.has(id);
          return (
            <div
              key={id}
              className="flex items-center gap-2 border border-[var(--border-1)] bg-white px-3 py-3"
            >
              <Icon size={14} />
              <span className="text-[12px] font-medium">{label}</span>
              <span
                className="ml-auto font-mono text-[8px] uppercase tracking-[0.12em]"
                style={{ color: ok ? "#000" : "var(--fg-muted)" }}
              >
                {ok ? "OK" : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
