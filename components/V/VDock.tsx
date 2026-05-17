"use client";

import { useState, useEffect } from "react";
import { ChevronRight, X, Sparkles, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPage } from "./ChatPage";

interface VDockProps {
  /** Optional context to surface to V (current route, project, etc.) — for now display only */
  context?: { label: string; value: string } | null;
}

const STORAGE_KEY = "v_dock_collapsed";

/**
 * VDock — V always present, never hidden in a sidebar item.
 *
 * Desktop: anchored right column (380px expanded, 56px collapsed).
 * Mobile: hidden by default; opened as a fullscreen sheet via the
 * topbar V button.
 */
export function VDock({ context }: VDockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  // Listen for global "open V" events from the mobile topbar button.
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("vforge:open-v", handler);
    return () => window.removeEventListener("vforge:open-v", handler);
  }, []);

  return (
    <>
      {/* Desktop dock */}
      <aside
        className={cn(
          "hidden lg:flex flex-col",
          "fixed right-0 top-0 bottom-0 z-30",
          "bg-vf-bg border-l border-vf-border",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-14" : "w-[380px]",
        )}
        aria-label="Chat con V"
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex flex-col items-center gap-3 pt-4 w-full text-vf-fg-1 hover:text-vf-fg transition-colors"
            aria-label="Expandir chat con V"
          >
            <div className="w-9 h-9 rounded-md bg-vf-green/10 border border-vf-green/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-vf-green" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-vf-fg-2 [writing-mode:vertical-rl] rotate-180">
              V · chat
            </span>
          </button>
        ) : (
          <>
            {/* Dock header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-vf-border">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
                <span className="text-sm font-semibold text-vf-fg">V</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2">
                  · agente
                </span>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href="/v"
                  className="p-1.5 rounded hover:bg-vf-bg-1 text-vf-fg-2 hover:text-vf-fg transition-colors"
                  title="Abrir sesión completa"
                  aria-label="Abrir sesión completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded hover:bg-vf-bg-1 text-vf-fg-2 hover:text-vf-fg transition-colors"
                  aria-label="Colapsar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Context strip */}
            {context && (
              <div className="px-4 py-2 border-b border-vf-border bg-vf-bg-1/40">
                <div className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2">
                  {context.label}
                </div>
                <div className="text-xs text-vf-fg-1 truncate">{context.value}</div>
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatPage />
            </div>
          </>
        )}
      </aside>

      {/* Mobile fullscreen sheet — controlled by global event from topbar */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-vf-bg flex flex-col"
          role="dialog"
          aria-label="Chat con V"
        >
          <div className="h-12 flex items-center justify-between px-4 border-b border-vf-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
              <span className="text-sm font-semibold text-vf-fg">V</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 -mr-2 rounded text-vf-fg-1 hover:text-vf-fg"
              aria-label="Cerrar"
              style={{ touchAction: "manipulation" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {context && (
            <div className="px-4 py-2 border-b border-vf-border bg-vf-bg-1/40 flex-shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2">
                {context.label}
              </div>
              <div className="text-xs text-vf-fg-1 truncate">{context.value}</div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <ChatPage />
          </div>
        </div>
      )}
    </>
  );
}

/** Helper for any component to open V on mobile. */
export function openV() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vforge:open-v"));
  }
}
