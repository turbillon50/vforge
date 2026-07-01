"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { F, statusColor } from "../theme";
import { IconCpu, IconServer, IconGlobe, IconBolt, IconRefresh } from "../ForjaIcons";

type Svc = { up: boolean; ms: number; detail?: string | number; model?: string | null };
type Estado = {
  cerebras?: Svc;
  gpu?: Svc;
  v?: Svc;
  mesh?: Svc;
  jobs?: Record<string, number>;
  recent?: Array<{ id: number; status: string; agent: string; titulo: string; creado: string }>;
  ts?: string;
  error?: string;
};

const CARDS: Array<{ key: keyof Estado; nombre: string; sub: string; Icon: typeof IconCpu }> = [
  { key: "cerebras", nombre: "Cerebras", sub: "inferencia cloud", Icon: IconBolt },
  { key: "gpu", nombre: "GPU 5090", sub: "modelo local", Icon: IconCpu },
  { key: "v", nombre: "V · api", sub: "mindcontextia.one", Icon: IconGlobe },
  { key: "mesh", nombre: "Mesh router", sub: "orquestador", Icon: IconServer },
];

function Dot({ up }: { up: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
      {up && (
        <motion.span
          style={{ position: "absolute", inset: 0, borderRadius: 999, background: F.cyan }}
          animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span
        style={{
          position: "relative",
          width: 9,
          height: 9,
          borderRadius: 999,
          background: up ? F.cyan : F.red,
          boxShadow: up ? `0 0 10px ${F.cyan}` : "none",
        }}
      />
    </span>
  );
}

export function Diagnostico() {
  const [data, setData] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/forja/estado", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "error");
      setData(j);
      setErr(null);
    } catch (e) {
      setErr(String(e).slice(0, 120));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const jobs = data?.jobs ?? {};

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: F.fg, margin: 0 }}>Estado del enjambre</h2>
          <p style={{ fontSize: 12.5, color: F.fg3, margin: "4px 0 0" }}>
            {data?.ts ? `sondeo ${data.ts}` : "sondeando…"} · auto 30s
          </p>
        </div>
        <button onClick={load} disabled={loading} style={ghostBtn}>
          <IconRefresh size={14} style={{ opacity: loading ? 0.4 : 1 }} />
          <span>Refrescar</span>
        </button>
      </div>

      {err && <div style={errBox}>No pude leer el Ojo: {err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
        {CARDS.map(({ key, nombre, sub, Icon }, i) => {
          const svc = data?.[key] as Svc | undefined;
          const up = !!svc?.up;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
              style={{
                background: F.surface,
                border: `1px solid ${F.border}`,
                borderRadius: 16,
                padding: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {up && (
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    background: `radial-gradient(circle, ${F.violet}22, transparent 70%)`,
                  }}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: up ? F.silver : F.fg3, display: "inline-flex" }}>
                  <Icon size={19} />
                </span>
                <Dot up={up} />
              </div>
              <div style={{ marginTop: 14, fontSize: 14.5, fontWeight: 600, color: F.fg }}>{nombre}</div>
              <div style={{ fontSize: 11.5, color: F.fg3, marginTop: 2 }}>{sub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 13, color: up ? F.cyan : F.red, fontWeight: 600 }}>
                  {up ? "operativo" : "caído"}
                </span>
                {svc && (
                  <span style={{ fontSize: 11.5, color: F.fg3, fontVariantNumeric: "tabular-nums" }}>
                    · {svc.ms}ms
                  </span>
                )}
              </div>
              {svc?.model && (
                <div style={{ fontSize: 11, color: F.fg3, marginTop: 6, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {svc.model}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12, marginTop: 12 }}>
        <div style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12.5, color: F.fg2, marginBottom: 12 }}>Cola de trabajos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {[
              ["running", "corriendo"],
              ["pending", "en espera"],
              ["done", "listos"],
              ["error", "errores"],
            ].map(([k, lbl]) => (
              <div key={k}>
                <div style={{ fontSize: 22, fontWeight: 700, color: statusColor(k), fontVariantNumeric: "tabular-nums" }}>
                  {jobs[k] ?? 0}
                </div>
                <div style={{ fontSize: 11, color: F.fg3 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: F.surface, border: `1px solid ${F.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12.5, color: F.fg2, marginBottom: 12 }}>Últimos jobs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data?.recent ?? []).map((j) => (
              <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: statusColor(j.status), flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: F.fg2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                  {j.titulo}
                </span>
                <span style={{ fontSize: 11, color: F.fg3, flexShrink: 0 }}>{j.agent}</span>
                <span style={{ fontSize: 11, color: F.fg3, flexShrink: 0 }}>{j.creado}</span>
              </div>
            ))}
            {!data?.recent?.length && <div style={{ fontSize: 12, color: F.fg3 }}>sin datos</div>}
          </div>
        </div>
      </div>
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

const errBox: React.CSSProperties = {
  background: "rgba(242,80,110,0.08)",
  border: "1px solid rgba(242,80,110,0.25)",
  color: "#f2506e",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  marginBottom: 12,
};
