"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_PRIMARY = [
  {
    href: "/app/projects",
    label: "Projects",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    href: "/forge",
    label: "Forge",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/app/vault",
    label: "Vault",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="3" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    href: "/app/automations",
    label: "Automations",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 7.5C2 4.46 4.46 2 7.5 2s5.5 2.46 5.5 5.5S10.54 13 7.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M7.5 5v2.5L9 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M2 11l1.5-1.5L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/app/contracts",
    label: "Contracts",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="5" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const NAV_SECONDARY = [
  {
    href: "/app/settings",
    label: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  function isActive(href: string) {
    if (href === "/app/projects") return path === href || path.startsWith("/app/projects");
    return path === href || path.startsWith(href + "/");
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0a0a0f",
        color: "#e5e5e5",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: "220px",
          minWidth: "220px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0f",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: "52px",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            VForge
          </span>
        </div>

        {/* Primary nav */}
        <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: "1px" }}>
          {NAV_PRIMARY.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: active ? 500 : 400,
                  color: active ? "#fff" : "#666",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  textDecoration: "none",
                  transition: "all 100ms",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.color = "#aaa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#666";
                  }
                }}
              >
                <span style={{ opacity: active ? 0.9 : 0.5, lineHeight: 0 }}>{item.icon}</span>
                {item.label}
                {active && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#7c3aed",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Secondary nav + user */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 6px" }}>
          {NAV_SECONDARY.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: active ? "#fff" : "#555",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  textDecoration: "none",
                  transition: "all 100ms",
                  marginBottom: "4px",
                }}
              >
                <span style={{ opacity: 0.5, lineHeight: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          {/* User */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "2px",
            }}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: "24px", height: "24px" },
                },
              }}
            />
            <span style={{ fontSize: "12px", color: "#444" }}>Account</span>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header
          style={{
            height: "52px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#333", fontFamily: "monospace" }}>
              {path.split("/").filter(Boolean).map((seg, i, arr) => (
                <span key={i}>
                  <span style={{ color: i === arr.length - 1 ? "#666" : "#333" }}>{seg}</span>
                  {i < arr.length - 1 && <span style={{ color: "#2a2a2a", margin: "0 4px" }}>/</span>}
                </span>
              ))}
            </span>
          </div>
          {/* Acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <kbd
              style={{
                fontSize: "11px",
                color: "#333",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontFamily: "monospace",
              }}
            >
              ⌘K
            </kbd>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
