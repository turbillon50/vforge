"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { F, statusColor, statusLabel } from "../theme";
import { IconChevron, IconRefresh, IconRotate, IconX, IconPlus } from "../ForjaIcons";

type Job = {
  id: number;
  status: string;
  agent: string;
  priority: number | null;
  task_type: string | null;
  project_id: string | null;
  titulo: string;
  err: string;
  res: string;
  creado: string;
  inicio: string;
  created_iso: string | null;
  started_iso: string | null;
  completed_iso: string | null;
};

type JobLog = {
  loading?: boolean;
  status?: string;
  result?: string;
  error?: string;
  log_tail?: string;
  daemon_log?: string[];
  fetchErr?: string;
};

const ACTIVE = new Set(["running", "in_progress", "pending", "queued"]);
const isActive = (s: string) => ACTIVE.has((s || "").toLowerCase());
const canCancel = (s: string) => {
  const x = (s || "").toLowerCase();
  return x === "pending" || x === "running" || x === "queued" || x === "in_progress";
};

function fmtDur(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function elapsed(j: Job, now: number): string {
  if (!j.created_iso) return "—";
  const start = Date.parse(j.created_iso);
  if (Number.isNaN(start)) return "—";
  const end = j.completed_iso ? Date.parse(j.completed_iso) : now;
  return fmtDur(end - start);
}

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
  const [now, setNow] = useState<number>(() => Date.now());
  const [confirm, setConfirm] = useState<{ id: number; kind: "relanzar" | "cancelar" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<number, JobLog>>({});
  const [showNew, setShowNew] = useState(false);
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

  // Auto-refresh de la cola.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (auto) timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [auto, load]);

  // Reloj vivo (1s) para el tiempo transcurrido de cada job.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadLog = useCallback(async (id: number) => {
    setLogs((p) => ({ ...p, [id]: { ...p[id], loading: true } }));
    try {
      const r = await fetch(`/api/forja/ojo/log?id=${id}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "error");
      setLogs((p) => ({ ...p, [id]: { ...j, loading: false } }));
    } catch (e) {
      setLogs((p) => ({ ...p, [id]: { loading: false, fetchErr: String(e).slice(0, 120) } }));
    }
  }, []);

  const toggle = (id: number) => {
    if (open === id) {
      setOpen(null);
    } else {
      setOpen(id);
      loadLog(id);
    }
  };

  const doAction = useCallback(
    async (kind: "relanzar" | "cancelar", id: number) => {
      setBusy(`${kind}-${id}`);
      try {
        const r = await fetch(`/api/forja/ojo/${kind}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const j = await r.json();
        if (kind === "relanzar" && j?.nuevo_id) setFlash(`Relanzado como #${j.nuevo_id}`);
        else if (kind === "cancelar" && j?.ok) setFlash(`Job #${id} cancelado`);
        else if (kind === "cancelar" && j?.ok === false) setFlash(`No cancelable: ${j.razon ?? "estado final"}`);
      } catch (e) {
        setFlash(`Error: ${String(e).slice(0, 80)}`);
      } finally {
        setConfirm(null);
        setBusy(null);
        await load();
        setTimeout(() => setFlash(null), 4000);
      }
    },
    [load],
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: F.fg, margin: 0 }}>El Ojo de Vulcano</h2>
          <p style={{ fontSize: 12.5, color: F.fg3, margin: "4px 0 0" }}>dispatch en vivo {ts && `· ${ts}`}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowNew((v) => !v)} style={primaryBtn(showNew)}>
            {showNew ? <IconX size={14} /> : <IconPlus size={14} />} Nueva tarea
          </button>
          <button onClick={() => setAuto((v) => !v)} style={toggleBtn(auto)}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: auto ? F.cyan : F.fg3 }} />
            auto 30s
          </button>
          <button onClick={load} style={ghostBtn}>
            <IconRefresh size={14} /> Refrescar
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden", marginBottom: 14 }}
          >
            <NuevaTarea
              onDone={async (msg) => {
                setShowNew(false);
                setFlash(msg);
                await load();
                setTimeout(() => setFlash(null), 4000);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {flash && <div style={flashBox}>{flash}</div>}
      {err && <div style={errBox}>Ojo inaccesible: {err}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((j, i) => {
          const c = statusColor(j.status);
          const isOpen = open === j.id;
          const active = isActive(j.status);
          const lg = logs[j.id];
          return (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: Math.min(i * 0.03, 0.3) }}
              style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 14, overflow: "hidden" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                <button onClick={() => toggle(j.id)} style={rowBtn}>
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
                    <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11.5, color: F.fg3, flexWrap: "wrap", alignItems: "center" }}>
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
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          color: active ? c : F.fg3,
                        }}
                      >
                        {elapsed(j, now)}
                        {active && (
                          <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            style={{ marginLeft: 4 }}
                          >
                            ●
                          </motion.span>
                        )}
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "monospace" }}>#{j.id}</span>
                    </div>
                  </div>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} style={{ color: F.fg3, display: "inline-flex" }}>
                    <IconChevron size={16} />
                  </motion.span>
                </button>
              </div>

              {/* Acciones + confirmación inline */}
              <div style={{ display: "flex", gap: 8, padding: "0 14px 12px 40px", alignItems: "center" }}>
                {confirm && confirm.id === j.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: F.fg2 }}>
                      {confirm.kind === "relanzar" ? "¿Relanzar este job?" : "¿Cancelar este job?"}
                    </span>
                    <button
                      onClick={() => doAction(confirm.kind, j.id)}
                      disabled={!!busy}
                      style={confirmBtn(confirm.kind === "cancelar" ? F.red : F.cyan)}
                    >
                      {busy ? "…" : "Sí"}
                    </button>
                    <button onClick={() => setConfirm(null)} style={ghostBtnSm}>
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setConfirm({ id: j.id, kind: "relanzar" })} style={actionBtn(F.cyan)}>
                      <IconRotate size={13} /> Relanzar
                    </button>
                    {canCancel(j.status) && (
                      <button onClick={() => setConfirm({ id: j.id, kind: "cancelar" })} style={actionBtn(F.red)}>
                        <IconX size={13} /> Cancelar
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Log expandible */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 16px 16px 40px" }}>
                      {lg?.loading && <div style={{ fontSize: 12, color: F.fg3, padding: "6px 0" }}>cargando log…</div>}
                      {lg?.fetchErr && <LogBlock label="error de fetch" text={lg.fetchErr} color={F.red} />}
                      {lg && !lg.loading && !lg.fetchErr && (
                        <>
                          {lg.error && <LogBlock label="error" text={lg.error} color={F.red} />}
                          <LogBlock label="resultado" text={lg.result || "(sin resultado todavía)"} color={F.cyan} />
                          {lg.log_tail && <LogBlock label="log_tail" text={lg.log_tail} color={F.fg2} />}
                          {lg.daemon_log && lg.daemon_log.length > 0 && (
                            <LogBlock label="daemon log" text={lg.daemon_log.join("\n")} color={F.fg2} />
                          )}
                        </>
                      )}
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

function NuevaTarea({ onDone }: { onDone: (msg: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("shell");
  const [project, setProject] = useState("vforge");
  const [priority, setPriority] = useState(5);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!prompt.trim()) {
      setError("El prompt no puede ir vacío");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/forja/ojo/nueva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, project_id: project, prompt, priority }),
      });
      const j = await r.json();
      if (!r.ok || !j?.id) throw new Error(j?.error || "error");
      onDone(`Tarea #${j.id} encolada (${agent})`);
    } catch (e) {
      setError(String(e).slice(0, 120));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: F.surface, border: `1px solid ${F.border2}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: F.fg, marginBottom: 12 }}>Encolar tarea nueva</div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt / comando (ej. echo hola, o instrucción para claude)"
        rows={3}
        style={inputBase}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <label style={fieldLbl}>
          agente
          <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ ...inputBase, width: 120 }}>
            <option value="claude">claude</option>
            <option value="grok">grok</option>
            <option value="shell">shell</option>
          </select>
        </label>
        <label style={fieldLbl}>
          proyecto
          <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="vforge" style={{ ...inputBase, width: 140 }} />
        </label>
        <label style={fieldLbl}>
          prioridad
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={{ ...inputBase, width: 80 }}
          />
        </label>
      </div>
      {error && <div style={{ ...errBox, marginTop: 10, marginBottom: 0 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={sending} style={primaryBtn(true)}>
          {sending ? "encolando…" : "Encolar"}
        </button>
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
          maxHeight: 320,
          overflow: "auto",
        }}
      >
        {text}
      </pre>
    </div>
  );
}

const rowBtn: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};

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

const ghostBtnSm: React.CSSProperties = {
  ...ghostBtn,
  padding: "5px 12px",
  fontSize: 12,
};

const actionBtn = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: `1px solid ${color}44`,
  color,
  borderRadius: 9,
  padding: "5px 11px",
  fontSize: 12,
  cursor: "pointer",
});

const confirmBtn = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: `${color}22`,
  border: `1px solid ${color}`,
  color,
  borderRadius: 9,
  padding: "5px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});

const primaryBtn = (on: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: on ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.10)",
  border: `1px solid ${on ? F.violet : "rgba(124,58,237,0.4)"}`,
  color: on ? "#c4b5fd" : "#b8a6f0",
  borderRadius: 10,
  padding: "7px 14px",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
});

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

const inputBase: React.CSSProperties = {
  background: F.void,
  border: `1px solid ${F.border2}`,
  borderRadius: 10,
  color: F.fg,
  padding: "9px 11px",
  fontSize: 12.5,
  width: "100%",
  fontFamily: "var(--font-geist-mono, monospace)",
  outline: "none",
  resize: "vertical",
};

const fieldLbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: F.fg3,
};

const errBox: React.CSSProperties = {
  background: "rgba(242,80,110,0.08)",
  border: "1px solid rgba(242,80,110,0.25)",
  color: "#f2506e",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  marginBottom: 12,
};

const flashBox: React.CSSProperties = {
  background: "rgba(34,211,238,0.08)",
  border: "1px solid rgba(34,211,238,0.28)",
  color: F.cyan,
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  marginBottom: 12,
};
