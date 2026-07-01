"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { F } from "./theme";
import { IconPulse, IconGrid, IconBeaker, IconDevice } from "./ForjaIcons";
import { Diagnostico } from "./tabs/Diagnostico";
import { Ensamblaje } from "./tabs/Ensamblaje";
import { Tester } from "./tabs/Tester";
import { Preview } from "./tabs/Preview";

type TabId = "diagnostico" | "ensamblaje" | "tester" | "preview";

const TABS: Array<{ id: TabId; label: string; Icon: typeof IconPulse }> = [
  { id: "diagnostico", label: "Diagnóstico", Icon: IconPulse },
  { id: "ensamblaje", label: "Ensamblaje", Icon: IconGrid },
  { id: "tester", label: "Tester", Icon: IconBeaker },
  { id: "preview", label: "Preview", Icon: IconDevice },
];

export function ForjaWorkspace() {
  const [tab, setTab] = useState<TabId>("diagnostico");

  return (
    <div style={{ minHeight: "100%", background: F.bg, color: F.fg }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 32px) 64px" }}>
        {/* encabezado */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${F.violet}, ${F.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 26px ${F.violet}55`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 5.8L20 8l-4.4 3.8L17 18l-5-3.2L7 18l1.4-6.2L4 8l5.6-.2z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.4 }}>La Forja</h1>
            <p style={{ fontSize: 12.5, color: F.fg3, margin: "3px 0 0" }}>
              diagnóstico · ensamblaje · tester · preview — solo Owner
            </p>
          </div>
        </div>

        {/* tabs con borde inferior animado */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${F.border}`, margin: "24px 0 28px" }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: "none",
                  color: active ? F.fg : F.fg3,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  padding: "10px 14px 13px",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
              >
                <Icon size={15} />
                {label}
                {active && (
                  <motion.span
                    layoutId="forja-tab-underline"
                    style={{
                      position: "absolute",
                      left: 6,
                      right: 6,
                      bottom: -1,
                      height: 2,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${F.violet}, ${F.cyan})`,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* contenido */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {tab === "diagnostico" && <Diagnostico />}
            {tab === "ensamblaje" && <Ensamblaje />}
            {tab === "tester" && <Tester />}
            {tab === "preview" && <Preview />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
