"use client";

import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { Menu, Sparkles } from "lucide-react";
import { openV } from "@/components/V/VDock";

interface TopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

/**
 * Mobile-only topbar (md:hidden).
 * - Left: hamburger → opens Sidebar drawer
 * - Center: brand
 * - Right: V button → opens VDock as fullscreen sheet
 *
 * Desktop has no topbar — sidebar + content + V dock fill the viewport
 * (Vercel/Linear style).
 */
export function Topbar({ onMenuClick, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-40",
        "h-14 px-3 flex items-center justify-between gap-3",
        "bg-vf-bg/90 backdrop-blur-md border-b border-vf-border",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="w-10 h-10 flex items-center justify-center rounded-md text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1 active:bg-vf-bg-2 transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <Brand size="sm" />
      </div>

      <button
        type="button"
        onClick={() => openV()}
        aria-label="Abrir chat con V"
        className="h-9 px-3 flex items-center gap-2 rounded-md bg-vf-green/10 border border-vf-green/30 text-vf-green hover:bg-vf-green/20 active:bg-vf-green/30 transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold tracking-wide">V</span>
        <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
      </button>
    </header>
  );
}
