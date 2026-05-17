"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarV3 } from "./sidebar";
import { HeaderV3 } from "./header";

interface AppShellV3Props {
  children: React.ReactNode;
}

const SIDEBAR_OPEN_KEY = "v3_sidebar_open";

/**
 * vForge V3 shell — inspired by Vercel's coding-agent-template layout.
 *
 * Desktop: fixed left sidebar (collapsible) · main content (fluid)
 * Mobile:  full-screen sidebar overlay · main content
 *
 * V is central: every page hosts the same shell and the chat
 * composer lives on the landing page (/, /hub). Other routes have
 * a slim "ask V about this" affordance in their header.
 */
export function AppShellV3({ children }: AppShellV3Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Hydrate persisted state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const desktop = mq.matches;
    setIsDesktop(desktop);

    const stored = window.localStorage.getItem(SIDEBAR_OPEN_KEY);
    const initial = stored !== null ? stored === "1" : desktop;
    setSidebarOpen(initial && desktop);
    setHasMounted(true);

    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Persist open state on desktop only.
  useEffect(() => {
    if (typeof window === "undefined" || !hasMounted || !isDesktop) return;
    try {
      window.localStorage.setItem(SIDEBAR_OPEN_KEY, sidebarOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarOpen, hasMounted, isDesktop]);

  // Cmd/Ctrl-B toggles sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = useCallback(() => setSidebarOpen((v) => !v), []);
  const close = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-dvh bg-vf-bg text-vf-fg antialiased relative flex">
      {/* Mobile backdrop */}
      {sidebarOpen && !isDesktop && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] border-r border-vf-border bg-vf-bg",
          "flex flex-col",
          hasMounted ? "transition-transform duration-200 ease-out" : "",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!sidebarOpen}
      >
        {/* Sidebar header — close button on mobile */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-vf-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-vf-green/15 border border-vf-green/40 flex items-center justify-center">
              <span className="text-xs font-bold text-vf-green leading-none">V</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">vForge</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
            aria-label="Cerrar menú"
            style={{ touchAction: "manipulation" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SidebarV3 onItemClick={() => !isDesktop && close()} />
      </aside>

      {/* Main column */}
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col min-h-dvh",
          hasMounted ? "transition-[margin] duration-200 ease-out" : "",
          isDesktop && sidebarOpen ? "lg:ml-[280px]" : "lg:ml-0",
        )}
      >
        <HeaderV3 sidebarOpen={sidebarOpen} onToggleSidebar={toggle} />
        <main className="flex-1 min-h-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
