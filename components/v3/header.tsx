"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderV3Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// Map of route → short breadcrumb label.
const ROUTE_LABEL: Record<string, string> = {
  "/": "Chat con V",
  "/hub": "Chat con V",
  "/projects": "Proyectos",
  "/vault": "Bóveda",
  "/modules": "Módulos",
  "/activity": "Actividad",
  "/settings": "Configuración",
  "/forge": "Forge — chat clásico",
  "/v": "V — sesión completa",
};

function breadcrumbFor(pathname: string | null): string {
  if (!pathname) return "vForge";
  const exact = ROUTE_LABEL[pathname];
  if (exact) return exact;
  // dynamic segments fall back to the first segment
  const first = "/" + (pathname.split("/")[1] ?? "");
  return ROUTE_LABEL[first] ?? "vForge";
}

export function HeaderV3({ sidebarOpen, onToggleSidebar }: HeaderV3Props) {
  const pathname = usePathname();
  const label = breadcrumbFor(pathname);

  return (
    <header className="h-14 flex items-center gap-3 px-3 md:px-5 border-b border-vf-border bg-vf-bg flex-shrink-0 sticky top-0 z-20">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        className="w-9 h-9 flex items-center justify-center rounded-md text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1 active:bg-vf-bg-2 transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/hub"
          className="hidden sm:inline text-sm font-semibold text-vf-fg-1 hover:text-vf-fg transition-colors"
        >
          vForge
        </Link>
        <span className="hidden sm:inline text-vf-fg-3 select-none">/</span>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Subtle V status — small live dot, no loud badge */}
        <div
          className="hidden md:flex items-center gap-2 text-xs text-vf-fg-1"
          title="V está en línea"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
          <span className="font-mono uppercase tracking-wider text-[10px]">
            V · en línea
          </span>
        </div>
        <Link
          href="/hub"
          aria-label="Ir al chat con V"
          className={cn(
            "md:hidden h-8 w-8 flex items-center justify-center rounded-md",
            "text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1 transition-colors relative",
          )}
          style={{ touchAction: "manipulation" }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
        </Link>
      </div>
    </header>
  );
}
