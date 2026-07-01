"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { F } from "../theme";
import { DOMINIOS } from "@/lib/forja/dominios";
import { IconBeaker, IconPlay, IconRefresh } from "../ForjaIcons";

type QaRow = { dominio: string; http_status: number; latencia_ms: number; ok: boolean; ts: string };

function statusTone(ok: boolean, code: number) {
  if (ok) return F.cyan;
  if (code === 0) return F.red;
  return F.amber;
}

export function Tester() {
  const [dominio, setDominio] = useState("");
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<QaRow | null>(null);
  const [rows, setRows] = useState<QaRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/forja/qa", { cache: "no-store" });
      const j = await r.json();
      if (r.ok) setRows(j.rows ?? []);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const run = useCallback(async () => {
    const d = dominio.trim();
    if (!d) return;
    setRunning(true);
    setErr(null);
    try {
      const r = await fetch("/api/forja/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominio: d }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "error");
      setLast(j);
      loadHistory();
    } catch (e) {
      setErr(String(e).slice(0, 120));
    } finally {
      setRunning(false);
    }
  }, [dominio, loadHistory]);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: F.fg, margin: 0 }}>Tester de dominios</h2>
        <p style={{ fontSize: 12.5, color: F.fg3, margin: "4px 0 0" }}>
          corre un QA de status + latencia contra cualquiera de los 50 dominios oficiales
        </p>
      </div>

      <div
        style={{
          background: F.surface,
          border: `1px solid ${F.border}`,
          borderRadius: 16,
          padding: 18,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 240, display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 12, color: F.fg3, display: "inline-flex", pointerEvents: "none" }}>
            <IconBeaker size={16} />
          </span>
          <input
            list="forja-dominios"
            value={dominio}
            onChange={(e) => setDominio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="elige o escribe un dominio…"
            style={{
              width: "100%",
              background: F.void,
              border: `1px solid ${F.border2}`,
              borderRadius: 11,
              padding: "11px 12px 11px 36px",
              color: F.fg,
              fontSize: 13.5,
              outline: "none",
            }}
          />
          <datalist id="forja-dominios">
            {DOMINIOS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <button onClick={run} disabled={running || !dominio.trim()} style={primaryBtn(running || !dominio.trim())}>
          {running ? <IconRefresh size={15} /> : <IconPlay size={15} />}
          {running ? "corriendo…" : "correr QA"}
        </button>
      </div>

      {err && <div style={errBox}>{err}</div>}

      <AnimatePresence>
        {last && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 12,
              background: F.surfaceHi,
              border: `1px solid ${F.border2}`,
              borderRadius: 14,
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: F.fg }}>{last.dominio}</div>
            <Metric label="status" value={String(last.http_status || "—")} color={statusTone(last.ok, last.http_status)} />
            <Metric label="latencia" value={`${last.latencia_ms}ms`} color={F.silver} />
            <Metric label="veredicto" value={last.ok ? "OK" : "falla"} color={last.ok ? F.cyan : F.red} />
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: F.fg3 }}>{last.ts}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12.5, color: F.fg2, marginBottom: 10 }}>Último QA por dominio</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.dominio}
              style={{
                background: F.surface,
                border: `1px solid ${F.border}`,
                borderRadius: 12,
                padding: "11px 13px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: statusTone(r.ok, r.http_status), flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: F.fg, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.dominio}
              </span>
              <span style={{ fontSize: 11.5, color: F.fg3, fontVariantNumeric: "tabular-nums" }}>
                {r.http_status || "—"} · {r.latencia_ms}ms
              </span>
            </div>
          ))}
          {!rows.length && <div style={{ fontSize: 12, color: F.fg3 }}>aún no hay corridas</div>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: F.fg3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
    </div>
  );
}

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: disabled ? "rgba(124,58,237,0.25)" : F.violet,
  border: "none",
  color: "#fff",
  borderRadius: 11,
  padding: "11px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.7 : 1,
});

const errBox: React.CSSProperties = {
  background: "rgba(242,80,110,0.08)",
  border: "1px solid rgba(242,80,110,0.25)",
  color: "#f2506e",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  marginTop: 12,
};
