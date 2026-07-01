"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { F } from "../theme";
import { DOMINIOS } from "@/lib/forja/dominios";
import { IconDevice, IconExternal } from "../ForjaIcons";

type Modo = "movil" | "desktop";

export function Preview() {
  const [dominio, setDominio] = useState("vforge.site");
  const [url, setUrl] = useState("https://vforge.site");
  const [modo, setModo] = useState<Modo>("movil");

  const cargar = () => {
    const d = dominio.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (d) setUrl(`https://${d}`);
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: F.fg, margin: 0 }}>Preview de dispositivo</h2>
        <p style={{ fontSize: 12.5, color: F.fg3, margin: "4px 0 0" }}>
          renderiza cualquier dominio en marco de iPhone o escritorio
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <input
          list="forja-dominios-preview"
          value={dominio}
          onChange={(e) => setDominio(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && cargar()}
          placeholder="dominio…"
          style={{
            flex: 1,
            minWidth: 220,
            background: F.void,
            border: `1px solid ${F.border2}`,
            borderRadius: 11,
            padding: "10px 12px",
            color: F.fg,
            fontSize: 13.5,
            outline: "none",
          }}
        />
        <datalist id="forja-dominios-preview">
          {DOMINIOS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <button onClick={cargar} style={primaryBtn}>
          cargar
        </button>
        <div style={{ display: "flex", background: F.surface, border: `1px solid ${F.border2}`, borderRadius: 11, padding: 3 }}>
          {(["movil", "desktop"] as Modo[]).map((m) => (
            <button key={m} onClick={() => setModo(m)} style={segBtn(modo === m)}>
              <IconDevice size={13} />
              {m === "movil" ? "móvil" : "escritorio"}
            </button>
          ))}
        </div>
        <a href={url} target="_blank" rel="noreferrer" style={ghostLink}>
          <IconExternal size={14} /> pestaña nueva
        </a>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "28px 12px",
          background: `radial-gradient(circle at 50% 0%, ${F.violet}14, transparent 60%)`,
          borderRadius: 18,
          border: `1px solid ${F.border}`,
        }}
      >
        <motion.div
          key={modo}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {modo === "movil" ? <PhoneFrame url={url} /> : <DesktopFrame url={url} />}
        </motion.div>
      </div>
      <p style={{ fontSize: 11.5, color: F.fg3, marginTop: 10, textAlign: "center" }}>
        algunos sitios bloquean el iframe (X-Frame-Options). Si sale en blanco, ábrelo en pestaña nueva.
      </p>
    </div>
  );
}

function PhoneFrame({ url }: { url: string }) {
  return (
    <div
      style={{
        width: 390,
        height: 780,
        maxWidth: "88vw",
        background: "#050409",
        borderRadius: 46,
        border: `2px solid ${F.border2}`,
        padding: 11,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 26,
          background: "#050409",
          borderRadius: 16,
          zIndex: 2,
        }}
      />
      <iframe
        src={url}
        title="preview-movil"
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 36, background: "#fff" }}
      />
    </div>
  );
}

function DesktopFrame({ url }: { url: string }) {
  return (
    <div
      style={{
        width: 900,
        maxWidth: "92vw",
        background: F.surface,
        borderRadius: 14,
        border: `1px solid ${F.border2}`,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 14px", borderBottom: `1px solid ${F.border}` }}>
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#ff5f57" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#febc2e" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#28c840" }} />
        <div
          style={{
            marginLeft: 12,
            flex: 1,
            background: F.void,
            border: `1px solid ${F.border}`,
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 11.5,
            color: F.fg3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {url}
        </div>
      </div>
      <iframe src={url} title="preview-desktop" style={{ width: "100%", height: 560, border: "none", background: "#fff" }} />
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: F.violet,
  border: "none",
  color: "#fff",
  borderRadius: 11,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const segBtn = (on: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: on ? F.violet : "transparent",
  border: "none",
  color: on ? "#fff" : F.fg3,
  borderRadius: 9,
  padding: "7px 12px",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
});

const ghostLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  border: `1px solid ${F.border2}`,
  color: F.fg2,
  borderRadius: 11,
  padding: "9px 13px",
  fontSize: 12.5,
  textDecoration: "none",
};
