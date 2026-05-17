"use client";

import { useState, useEffect } from "react";
import { ChevronRight, X, Sparkles, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPage } from "./ChatPage";

const STORAGE_KEY = "v_dock_collapsed";
/** sessionStorage key — picked up by ChatPage on mount/on open. */
export const V_PENDING_PROMPT_KEY = "v_pending_prompt";

interface VContext {
  label: string;
  value: string;
}

/**
 * VDock — V always present, never hidden in a sidebar item.
 *
 * Desktop: anchored right column (380px expanded, 56px collapsed).
 * Mobile: hidden by default; opened as a fullscreen sheet via the
 * topbar V button (or `openV()` from anywhere).
 *
 * Context-aware: when a card calls `openV({ label, value, prompt })`,
 * the header surfaces the context strip and ChatPage auto-sends the
 * prompt as the next user turn.
 */
export function VDock() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [context, setContext] = useState<VContext | null>(null);

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

  // Listen for global "open V" events. Detail may carry context to
  // surface in the header strip.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { label?: string; value?: string }
        | undefined;
      setMobileOpen(true);
      setCollapsed(false);
      if (detail?.label && detail?.value) {
        setContext({ label: detail.label, value: detail.value });
      }
    };
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
              <div className="px-4 py-2 border-b border-vf-border bg-vf-bg-1/40 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2">
                    {context.label}
                  </div>
                  <div className="text-xs text-vf-fg-1 truncate">
                    {context.value}
                  </div>
                </div>
                <button
                  onClick={() => setContext(null)}
                  className="p-1 -m-1 rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2"
                  aria-label="Quitar contexto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatPage />
            </div>
          </>
        )}
      </aside>

      {/* Mobile fullscreen sheet — controlled by global event from topbar / cards */}
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
            <div className="px-4 py-2 border-b border-vf-border bg-vf-bg-1/40 flex items-start justify-between gap-2 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2">
                  {context.label}
                </div>
                <div className="text-xs text-vf-fg-1 truncate">
                  {context.value}
                </div>
              </div>
              <button
                onClick={() => setContext(null)}
                className="p-1 -m-1 rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2"
                aria-label="Quitar contexto"
              >
                <X className="w-3 h-3" />
              </button>
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

/**
 * Open V from anywhere in the app. If `context.prompt` is provided,
 * ChatPage will auto-send it as the next user turn.
 */
export function openV(opts?: {
  label?: string;
  value?: string;
  prompt?: string;
}) {
  if (typeof window === "undefined") return;
  if (opts?.prompt) {
    try {
      window.sessionStorage.setItem(
        V_PENDING_PROMPT_KEY,
        JSON.stringify({ prompt: opts.prompt, ts: Date.now() }),
      );
    } catch {
      // ignore
    }
  }
  const detail = {
    label: opts?.label,
    value: opts?.value,
  };
  window.dispatchEvent(new CustomEvent("vforge:open-v", { detail }));
}
