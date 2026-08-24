"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  IconGithub,
  IconGlobe,
  IconCreditCard,
  IconKey,
  IconCheck,
  IconCopy,
  IconLoader,
} from "@/components/brand/VFIcons";

type Props = {
  connections: Set<string>;
  onRefresh: () => void;
};

/** Banner mínimo y secuencial: solo muestra el siguiente paso pendiente. */
export function ConnectionGuideBanner({ connections, onRefresh }: Props) {
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const gh = connections.has("github");
  const vc = connections.has("vercel");
  const st = connections.has("stripe");

  // Solo el siguiente paso
  const next = !gh
    ? { id: "github", label: "Conectar GitHub", href: "/api/auth/github/start", why: "Base del código y del historial real." }
    : !vc
      ? { id: "vercel", label: "Conectar Vercel", href: "/api/auth/vercel/start", why: "Previews y dominio en vivo para tus clientes." }
      : !st
        ? { id: "stripe", label: "Conectar Stripe", href: "/api/auth/stripe/start", why: "Cobrar cuando el producto esté listo." }
        : null;

  async function generateMcp() {
    setLoading(true);
    try {
      const res = await fetch("/api/mcp/token", { method: "POST" });
      const data = await res.json();
      if (data?.token) setMcpToken(data.token);
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!mcpToken) return;
    await navigator.clipboard.writeText(mcpToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // Todo listo → solo token MCP compacto
  if (!next) {
    return (
      <div
        style={{
          borderBottom: "1px solid var(--vf-border)",
          background: "var(--vf-bg-1)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--vf-fg-2)", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Conectores listos
        </span>
        {mcpToken ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              readOnly
              value={mcpToken}
              style={{
                width: 180,
                height: 28,
                padding: "0 8px",
                border: "1px solid var(--vf-border)",
                background: "var(--vf-bg)",
                color: "var(--vf-fg)",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            />
            <button
              type="button"
              onClick={() => void copyToken()}
              style={{
                height: 28,
                padding: "0 10px",
                border: "1px solid var(--vf-fg)",
                background: "var(--vf-fg)",
                color: "var(--vf-bg-1)",
                fontSize: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {copied ? <IconCheck size={10} /> : <IconCopy size={10} />}
              {copied ? "Ok" : "Copiar MCP"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void generateMcp()}
            disabled={loading}
            style={{
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--vf-border-1)",
              background: "transparent",
              color: "var(--vf-fg)",
              fontSize: 10,
              cursor: loading ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {loading ? <IconLoader size={10} className="animate-spin" /> : <IconKey size={10} />}
            Token MCP
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderBottom: "1px solid var(--vf-border)",
        background: "var(--vf-bg-1)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--vf-fg-2)" }}>
          Siguiente paso
        </p>
        <p style={{ marginTop: 2, fontSize: 12, color: "var(--vf-fg)" }}>{next.why}</p>
      </div>
      <a
        href={next.href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 12px",
          background: "var(--vf-fg)",
          color: "var(--vf-bg-1)",
          textDecoration: "none",
          fontSize: 11,
          whiteSpace: "nowrap",
        }}
      >
        {next.id === "github" && <IconGithub size={12} />}
        {next.id === "vercel" && <IconGlobe size={12} />}
        {next.id === "stripe" && <IconCreditCard size={12} />}
        {next.label}
      </a>
    </motion.div>
  );
}
