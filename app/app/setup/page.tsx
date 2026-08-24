"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectSteps } from "@/components/onboarding/ConnectSteps";
import { VMark } from "@/components/brand/VMark";

export default function SetupPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.connected)
          ? data.connected.map((s: string) => s.toLowerCase())
          : [];
        setConnections(new Set(list));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--vf-bg, #03020a)",
        color: "var(--vf-fg, #f5f5f4)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--vf-border, #1c1917)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <VMark size={18} />
          <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            VForge · Setup
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/app/chat")}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            color: "var(--vf-fg-2, #a8a29e)",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Saltar por ahora
        </button>
      </header>

      <main style={{ flex: 1, display: "grid", placeItems: "center" }}>
        {loading ? (
          <p style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--vf-fg-2)" }}>
            Revisando conexiones…
          </p>
        ) : (
          <ConnectSteps
            connections={connections}
            onRefresh={() => void load()}
            onComplete={() => router.push("/app/chat")}
          />
        )}
      </main>
    </div>
  );
}
