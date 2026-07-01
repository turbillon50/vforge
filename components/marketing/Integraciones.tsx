"use client";
import { useEffect, useRef } from "react";

const INTEGRATIONS = [
  { name: "GitHub", icon: "⚙" },
  { name: "Vercel", icon: "▲" },
  { name: "Anthropic", icon: "◆" },
  { name: "OpenAI", icon: "✦" },
  { name: "Supabase", icon: "⚡" },
  { name: "Neon DB", icon: "◉" },
  { name: "Cloudflare", icon: "☁" },
  { name: "Docker", icon: "◻" },
  { name: "Stripe", icon: "✺" },
  { name: "Linear", icon: "◈" },
  { name: "Notion", icon: "□" },
  { name: "Slack", icon: "◎" },
];

export function Integraciones() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section style={{ background: "#000", padding: "80px 0", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", marginBottom: 48 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#6B6B6B", marginBottom: 16,
        }}>
          <span style={{ display: "inline-block", width: 16, height: 1, background: "#6B6B6B" }}/>
          Integraciones
        </div>
        <h2 style={{
          fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
          fontWeight: 400, letterSpacing: "-0.03em",
          color: "#FFFFFF", maxWidth: 500,
        }}>
          Conecta con las herramientas que ya usas
        </h2>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #303236", marginBottom: 48 }}/>

      {/* Infinite scroll strip */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Fade edges */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 120,
          background: "linear-gradient(to right, #000, transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 120,
          background: "linear-gradient(to left, #000, transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>

        <div
          ref={trackRef}
          style={{
            display: "flex",
            gap: 12,
            width: "max-content",
            animation: "scroll-x 35s linear infinite",
          }}
        >
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
            <div key={i} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#18191B",
              border: "1px solid #303236",
              borderRadius: 8,
              padding: "12px 20px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1, color: "#37C38F" }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#A0A0A0", letterSpacing: "-0.01em" }}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #303236", marginTop: 48 }}/>
    </section>
  );
}

