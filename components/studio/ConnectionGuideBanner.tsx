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
  IconRefresh,
} from "@/components/brand/VFIcons";

type Props = {
  connections: Set<string>;
  onRefresh: () => void;
};

export function ConnectionGuideBanner({ connections, onRefresh }: Props) {
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const gh = connections.has("github");
  const vc = connections.has("vercel");
  const st = connections.has("stripe");
  const allConnected = gh && vc;

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
    setTimeout(() => setCopied(false), 2000);
  }

  if (allConnected && !mcpToken) {
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
        }}
      >
        <span style={{ fontSize: 10, color: "var(--vf-fg-2)", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          GitHub + Vercel listos · genera tu token MCP para Claude / Grok / ChatGPT
        </span>
        <button
          type="button"
          onClick={() => void generateMcp()}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 10px",
            border: "1px solid var(--vf-border-1)",
            background: "var(--vf-fg)",
            color: "var(--vf-bg-1)",
            fontSize: 10,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? <IconLoader size={11} className="animate-spin" /> : <IconKey size={11} />}
          Generar token MCP
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        borderBottom: "1px solid var(--vf-border)",
        background: "var(--vf-bg-1)",
        padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--vf-fg-2)" }}>
          Conecta tu empresa · GitHub · Vercel · Stripe · MCP
        </p>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Actualizar conexiones"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--vf-fg-2)" }}
        >
          <IconRefresh size={12} />
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {gh ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--vf-fg)" }}>
            <IconCheck size={11} /> GitHub
          </span>
        ) : (
          <a
            href="/api/auth/github/start"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--vf-fg)",
              background: "var(--vf-fg)",
              color: "var(--vf-bg-1)",
              fontSize: 10,
              textDecoration: "none",
            }}
          >
            <IconGithub size={12} /> Conectar GitHub
          </a>
        )}

        {vc ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--vf-fg)" }}>
            <IconCheck size={11} /> Vercel
          </span>
        ) : (
          <a
            href="/api/auth/vercel/start"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--vf-border-1)",
              color: "var(--vf-fg)",
              fontSize: 10,
              textDecoration: "none",
            }}
          >
            <IconGlobe size={12} /> Conectar Vercel
          </a>
        )}

        {st ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--vf-fg)" }}>
            <IconCheck size={11} /> Stripe
          </span>
        ) : (
          <a
            href="/api/auth/stripe/start"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--vf-border-1)",
              color: "var(--vf-fg)",
              fontSize: 10,
              textDecoration: "none",
            }}
          >
            <IconCreditCard size={12} /> Conectar Stripe
          </a>
        )}

        <button
          type="button"
          onClick={() => void generateMcp()}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 28,
            padding: "0 10px",
            border: "1px solid var(--vf-border-1)",
            background: "transparent",
            color: "var(--vf-fg)",
            fontSize: 10,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? <IconLoader size={11} className="animate-spin" /> : <IconKey size={11} />}
          Token MCP
        </button>
      </div>

      <AnimatePresence>
        {mcpToken ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              readOnly
              value={mcpToken}
              style={{
                flex: 1,
                height: 32,
                padding: "0 10px",
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
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 32,
                padding: "0 12px",
                border: "1px solid var(--vf-fg)",
                background: "var(--vf-fg)",
                color: "var(--vf-bg-1)",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            {mcpUrl ? (
              <span style={{ fontSize: 9, color: "var(--vf-fg-2)", fontFamily: "monospace" }}>
                {mcpUrl}
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
