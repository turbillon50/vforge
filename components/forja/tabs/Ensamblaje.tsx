"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { F, statusColor, statusLabel } from "../theme";
import { IconChevron, IconRefresh } from "../ForjaIcons";

type Job = {
  id: number;
  status: string;
  agent: string;
  priority: number | null;
  progress_pct: number | null;
  task_type: string | null;
  project_id: string | null;
  titulo: string;
  log: string;
  err: string;
  res: string;
  creado: string;
  inicio: string;
};

function Orbe({ status }: { status: string }) {
  const c = statusColor(status);
  const s = (status || "").toLowerCase();
  const running = s === "running" || s === "in_progress";
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 14, height: 14, flexShrink: 0 }}>
      {running && (
        <motion.span
          style={{ position: "absolute", inset: -3, borderRadius: 999, background: c }}
          animate={{ scale: [0.7, 1.5], opacity: [0.55, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        style={{ position: "relative", width: 14, height: 14, borderRadius: 999, background: c, boxShadow: `0 0 12px ${c}aa` }}
        animate={running ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
        transition={running ? { duration: 1.4, repeat: Infinity } : undefined}
      />
    </span>
  );
}

export function Ensamblaje() {
  const [rows, setRows] = useState<Job[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ts, setTs] = useState<string>("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/forja/ojo", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "error");
      setRows(j.rows ?? []);
      setErr(null);
      setTs(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      setErr(String(e).slice(0, 120));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (auto) timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [auto, load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: F.fg, margin: 0 }}>El Ojo de Vulcano</h2>
          <p style={{ fontSize: 12.5, color: F.fg3, margin: "4px 0 0" }}>
            dispatch en vivo {ts && `· ${ts}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAuto((v) => !v)} style={toggleBtn(auto)}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: auto ? F.cyan : F.fg3 }} />
            auto 30s
          </button>
          <button onClick={load} style={ghostBtn}>
            <IconRefresh size={14} /> Refrescar
          </button>
        </div>
      </div>

      {err && <div style={errBox}>Ojo inaccesible: {err}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((j, i) => {
          const c = statusColor(j.status);
          const isOpen = open === j.id;
          const pct = j.progress_pct ?? 0;
          return (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: Math.min(i * 0.03, 0.3) }}
              style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 14, overflow: "hidden" }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : j.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Orbe status={j.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: F.fg,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: 500,
                    }}
                  >
                    {j.titulo || "(sin título)"}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11.5, color: F.fg3 }}>
                    <span style={{ color: c }}>{statusLabel(j.status)}</span>
                    <span>·</span>
                    <span>{j.agent}</span>
                    {j.project_id && (
                      <>
                        <span>·</span>
                        <span>{j.project_id}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{j.inicio || j.creado}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "monospace" }}>#{j.id}</span>
                  </div>
                  <div style={{ marginTop: 8, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: c, borderRadius: 3 }}
                    />
                  </div>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} style={{ color: F.fg3, display: "inline-flex" }}>
                  <IconChevron size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 16px 16px 44px" }}>
                      {j.err && <LogBlock label="error" text={j.err} color={F.red} />}
                      <LogBlock label="log" text={j.log || "(sin log)"} color={F.fg2} />
                      {j.res && <LogBlock label="resultado" text={j.res} color={F.cyan} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {!rows.length && !err && <div style={{ fontSize: 12.5, color: F.fg3, padding: 20, textAlign: "center" }}>cargando cola…</div>}
      </div>
    </div>
  );
}

function LogBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.6, color: F.fg3, marginBottom: 5 }}>{label}</div>
      <pre
        style={{
          margin: 0,
          fontSize: 11.5,
          lineHeight: 1.6,
          color,
          background: F.void,
          border: `1px solid ${F.border}`,
          borderRadius: 10,
          padding: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "var(--font-geist-mono, monospace)",
          maxHeight: 240,
          overflow: "auto",
        }}
      >
        {text}
      </pre>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  border: `1px solid ${F.border2}`,
  color: F.fg2,
  borderRadius: 10,
  padding: "7px 12px",
  fontSize: 12.5,
  cursor: "pointer",
};

const toggleBtn = (on: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: on ? "rgba(34,211,238,0.08)" : "transparent",
  border: `1px solid ${on ? "rgba(34,211,238,0.3)" : F.border2}`,
  color: on ? F.cyan : F.fg3,
  borderRadius: 10,
  padding: "7px 12px",
  fontSize: 12.5,
  cursor: "pointer",
});

const errBox: React.CSSProperties = {
  background: "rgba(242,80,110,0.08)",
  border: "1px solid rgba(242,80,110,0.25)",
  color: "#f2506e",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  marginBottom: 12,
};
