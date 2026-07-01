"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSparkles, IconRefresh, IconMoon, IconSun, IconCheck,
  IconZap, IconRocket, IconLayers,
} from "@/components/brand/VFIcons";
import {
  type DesignPreset, DEFAULT_PRESET, PRESETS,
  applyDesignPreset, loadDesignPreset,
} from "@/lib/design-canvas";

const ACCENTS = [
  { name: "violet", value: "#7c3aed" },
  { name: "indigo", value: "#4f46e5" },
  { name: "cyan", value: "#0e7490" },
  { name: "emerald", value: "#059669" },
  { name: "rose", value: "#e11d48" },
];

const DENSITIES: { id: DesignPreset["density"]; label: string; desc: string }[] = [
  { id: "compact", label: "Compacto", desc: "Mas info" },
  { id: "normal", label: "Normal", desc: "Balanceado" },
  { id: "spacious", label: "Espacioso", desc: "Mas aire" },
];

function Row({ label, value, desc, children }: {
  label: string; value?: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-on-surface">{label}</label>
        {value !== undefined && (
          <span className="font-mono text-[12px] tabular-nums text-violet-300">{value}</span>
        )}
      </div>
      {children}
      {desc && <p className="mt-1.5 text-[11px] text-on-surface-variant">{desc}</p>}
    </div>
  );
}

export default function DesignCanvas() {
  const [preset, setPreset] = useState<DesignPreset>(DEFAULT_PRESET);
  const [spin, setSpin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cargar y aplicar al montar
  useEffect(() => {
    const p = loadDesignPreset();
    setPreset(p);
    applyDesignPreset(p);
  }, []);

  // Aplica un parche al preset actual e instantáneamente al DOM
  function patch(next: Partial<DesignPreset>) {
    setPreset((prev) => {
      const merged = { ...prev, ...next };
      applyDesignPreset(merged);
      return merged;
    });
  }

  function selectPreset(p: DesignPreset) {
    const merged = { ...p };
    setPreset(merged);
    applyDesignPreset(merged);
  }

  function reset() {
    setSpin(true);
    selectPreset({ ...DEFAULT_PRESET });
    setTimeout(() => setSpin(false), 600);
  }

  function setContentMode(mode: DesignPreset["contentMode"]) {
    patch({ contentMode: mode });
    try { localStorage.setItem("vf-content-mode", mode); } catch {}
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/design-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* silencioso — ya quedó en localStorage */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* A) HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconSparkles size={16} className="text-violet-300" />
          <span className="font-display text-sm font-semibold text-on-surface">Canvas de Diseno</span>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
            Owner
          </span>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-md border border-app px-2.5 py-1.5 text-[12px] text-on-surface-variant transition hover:bg-tint-2/[0.08] hover:text-on-surface"
        >
          <motion.span animate={{ rotate: spin ? 360 : 0 }} transition={{ duration: 0.6, ease: "easeInOut" }} style={{ display: "inline-flex" }}>
            <IconRefresh size={13} />
          </motion.span>
          Reset
        </button>
      </div>

      {/* B) PRESETS */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = preset.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => selectPreset(p)}
              className={
                "rounded-full border px-3 py-1.5 text-[12px] transition " +
                (active
                  ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                  : "border-app text-on-surface-variant hover:bg-tint-2/[0.08] hover:text-on-surface")
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* C) CONTROLES */}

      {/* 1. CONTRASTE */}
      <Row label="Contraste" value={`${preset.contrast.toFixed(2)}x`} desc="Legibilidad del texto">
        <input
          type="range" min={0.7} max={1.5} step={0.05} value={preset.contrast}
          onChange={(e) => patch({ contrast: parseFloat(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.25), rgba(124,58,237,1))" }}
        />
      </Row>

      {/* 2. BRILLO */}
      <Row label="Brillo" value={`${preset.brightness}%`} desc="Oscuridad del fondo">
        <div className="flex items-center gap-3">
          <IconMoon size={15} className="shrink-0 text-on-surface-variant" />
          <input
            type="range" min={0} max={100} step={5} value={preset.brightness}
            onChange={(e) => patch({ brightness: parseInt(e.target.value, 10) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{ background: "linear-gradient(90deg, #0a0814, #cbd5e1)" }}
          />
          <IconSun size={15} className="shrink-0 text-on-surface-variant" />
        </div>
      </Row>

      {/* 3. ACENTO */}
      <Row label="Acento" value={preset.accent} desc="Color principal de la interfaz">
        <div className="flex items-center gap-2">
          {ACCENTS.map((a) => {
            const active = preset.accent.toLowerCase() === a.value.toLowerCase();
            return (
              <button
                key={a.value}
                onClick={() => patch({ accent: a.value })}
                aria-label={a.name}
                className="h-7 w-7 rounded-full border-2 transition"
                style={{
                  background: a.value,
                  borderColor: active ? "#fff" : "transparent",
                  boxShadow: active ? `0 0 0 2px ${a.value}, 0 0 12px ${a.value}` : "none",
                }}
              />
            );
          })}
          <label
            className="relative ml-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-app text-on-surface-variant"
            aria-label="Color personalizado"
          >
            <IconSparkles size={13} />
            <input
              type="color" value={preset.accent}
              onChange={(e) => patch({ accent: e.target.value })}
              className="absolute h-0 w-0 opacity-0"
            />
          </label>
        </div>
      </Row>

      {/* 4. DENSIDAD */}
      <Row label="Densidad">
        <div className="grid grid-cols-3 gap-2">
          {DENSITIES.map((d) => {
            const active = preset.density === d.id;
            return (
              <button
                key={d.id}
                onClick={() => patch({ density: d.id })}
                className={
                  "rounded-lg border px-2 py-2.5 text-center transition " +
                  (active
                    ? "border-violet-500/30 bg-violet-500/15"
                    : "border-app hover:bg-tint-2/[0.08]")
                }
              >
                <div className={"text-[12px] font-medium " + (active ? "text-violet-300" : "text-on-surface")}>{d.label}</div>
                <div className="text-[10px] text-on-surface-variant">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </Row>

      {/* 5. ICONOS */}
      <Row label="Iconos">
        <div className="grid grid-cols-2 gap-2">
          {(["filled", "outline"] as const).map((style) => {
            const active = preset.iconStyle === style;
            const fill = style === "filled" ? "currentColor" : "none";
            return (
              <button
                key={style}
                onClick={() => patch({ iconStyle: style })}
                className={
                  "flex flex-col items-center gap-2 rounded-lg border px-2 py-3 transition " +
                  (active
                    ? "border-violet-500/30 bg-violet-500/15"
                    : "border-app hover:bg-tint-2/[0.08]")
                }
              >
                <div className={active ? "flex gap-2 text-violet-300" : "flex gap-2 text-on-surface-variant"}>
                  <IconZap size={16} fill={fill} />
                  <IconRocket size={16} fill={fill} />
                  <IconLayers size={16} fill={fill} />
                </div>
                <span className={"text-[11px] " + (active ? "text-violet-300" : "text-on-surface")}>
                  {style === "filled" ? "Filled (actual)" : "Outline (minimal)"}
                </span>
              </button>
            );
          })}
        </div>
      </Row>

      {/* 6. CONTENIDO (Owner-only) */}
      <Row label="Contenido" desc="Demo muestra datos ficticios para presentaciones">
        <div className="grid grid-cols-2 gap-2">
          {(["live", "demo"] as const).map((mode) => {
            const active = preset.contentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setContentMode(mode)}
                className={
                  "rounded-lg border px-2 py-2.5 text-[12px] font-medium transition " +
                  (active
                    ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                    : "border-app text-on-surface hover:bg-tint-2/[0.08]")
                }
              >
                {mode === "live" ? "En Vivo" : "Demo"}
              </button>
            );
          })}
        </div>
      </Row>

      {/* D) GUARDAR */}
      <button
        onClick={save}
        disabled={saving}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {saved ? (
            <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
              <IconCheck size={15} /> Guardado
            </motion.span>
          ) : (
            <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {saving ? "Guardando…" : "Guardar preferencias"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
