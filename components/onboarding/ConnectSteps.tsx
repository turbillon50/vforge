"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  title: string;
  why: string;
  action: string;
  href?: string;
}> = [
  {
    id: "github",
    title: "GitHub",
    why: "Sin GitHub no existe el código real. Cada cambio, cada versión y cada historial viven ahí. Es la base de la empresa, no un accesorio.",
    action: "Conectar GitHub",
    href: "/api/auth/github/start",
  },
  {
    id: "vercel",
    title: "Vercel",
    why: "Sin Vercel no hay preview ni dominio en vivo. Tus clientes no pueden ver el producto mientras se construye. El deploy es lo que convierte ideas en negocio.",
    action: "Conectar Vercel",
    href: "/api/auth/vercel/start",
  },
  {
    id: "stripe",
    title: "Stripe",
    why: "Sin Stripe no cobras. La app se queda en demo. Conectarlo ahora permite facturar cuando el producto esté listo, sin rehacer la infraestructura.",
    action: "Conectar Stripe",
    href: "/api/auth/stripe/start",
  },
  {
    id: "mcp",
    title: "Token MCP",
    why: "El token MCP te deja controlar VForge desde Claude, Grok o ChatGPT. Es el puente para operar tu empresa con los modelos que ya usas.",
    action: "Generar token",
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
  const step = STEPS[stepIndex] ?? STEPS[STEPS.length - 1];

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

  if (current === "done" || (connections.has("github") && connections.has("vercel") && connections.has("stripe") && mcpToken)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: 480,
          margin: "0 auto",
          textAlign: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 20px",
            border: "1px solid var(--vf-fg)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <IconCheck size={20} />
        </div>
        <p style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--vf-fg-2)" }}>
          Listo
        </p>
        <h2 style={{ marginTop: 12, fontSize: 28, fontWeight: 600, letterSpacing: "-0.04em" }}>
          Tu infraestructura está conectada.
        </h2>
        <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--vf-fg-1)" }}>
          GitHub, Vercel, Stripe y el token MCP ya están listos. Ahora puedes construir y operar desde el estudio o desde Claude / Grok.
        </p>
        {onComplete ? (
          <button
            type="button"
            onClick={onComplete}
            style={{
              marginTop: 28,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 18px",
              background: "var(--vf-fg)",
              color: "var(--vf-bg-1)",
              border: "none",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Ir al estudio <IconArrowR size={13} />
          </button>
        ) : null}
      </motion.div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px" }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 2,
              background: i <= stepIndex ? "var(--vf-fg)" : "var(--vf-border)",
            }}
          />
        ))}
      </div>

      <p style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--vf-fg-2)" }}>
        Paso {stepIndex + 1} de {STEPS.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
        >
          <h1 style={{ marginTop: 10, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.05 }}>
            {step.title}
          </h1>
          <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.65, color: "var(--vf-fg-1)", maxWidth: 420 }}>
            {step.why}
          </p>

          <div style={{ marginTop: 28 }}>
            {step.id === "mcp" ? (
              <>
                <button
                  type="button"
                  onClick={() => void generateMcp()}
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 42,
                    padding: "0 18px",
                    background: "var(--vf-fg)",
                    color: "var(--vf-bg-1)",
                    border: "none",
                    fontSize: 12,
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? <IconLoader size={13} className="animate-spin" /> : <IconKey size={13} />}
                  {step.action}
                </button>

                {mcpToken ? (
                  <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      readOnly
                      value={mcpToken}
                      style={{
                        flex: 1,
                        height: 40,
                        padding: "0 12px",
                        border: "1px solid var(--vf-border)",
                        background: "var(--vf-bg)",
                        color: "var(--vf-fg)",
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void copyToken()}
                      style={{
                        height: 40,
                        padding: "0 14px",
                        border: "1px solid var(--vf-fg)",
                        background: "var(--vf-fg)",
                        color: "var(--vf-bg-1)",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ) : null}
                {mcpUrl ? (
                  <p style={{ marginTop: 8, fontSize: 10, fontFamily: "monospace", color: "var(--vf-fg-2)" }}>
                    {mcpUrl}
                  </p>
                ) : null}
              </>
            ) : (
              <a
                href={step.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 42,
                  padding: "0 18px",
                  background: "var(--vf-fg)",
                  color: "var(--vf-bg-1)",
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                {step.id === "github" && <IconGithub size={14} />}
                {step.id === "vercel" && <IconGlobe size={14} />}
                {step.id === "stripe" && <IconCreditCard size={14} />}
                {step.action}
              </a>
            )}
          </div>

          {/* Skip secondary */}
          {step.id !== "github" && step.id !== "mcp" ? (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                marginTop: 16,
                background: "none",
                border: "none",
                fontSize: 11,
                color: "var(--vf-fg-2)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Ya lo conecté · actualizar
            </button>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
