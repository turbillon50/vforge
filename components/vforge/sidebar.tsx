"use client";

import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  Eye,
  Search,
  Compass,
  Lock,
  Boxes,
  Settings,
} from "lucide-react";

// Note: "Forge AI" / V is intentionally NOT in this sidebar.
// V lives permanently in the right dock (VDock) and on mobile is
// accessed via the topbar button — V is central, not a side item.
const navSections = [
  {
    label: "CONTROL",
    items: [
      { name: "Hub", href: "/hub", icon: LayoutDashboard },
      { name: "Proyectos", href: "/projects", icon: FolderKanban },
      { name: "Actividad", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "HERRAMIENTAS",
    items: [
      { name: "Repo Vision", href: "/vision", icon: Eye },
      { name: "Repo Hunter", href: "/hunter", icon: Search },
      { name: "Stack Scout", href: "/scout", icon: Compass },
      { name: "Bóveda", href: "/vault", icon: Lock },
      { name: "Módulos", href: "/modules", icon: Boxes },
    ],
  },
  {
    label: "SISTEMA",
    items: [{ name: "Configuración", href: "/settings", icon: Settings }],
  },
];

interface SidebarProps {
  /** When true, renders without the responsive wrapper (used inside the mobile drawer). */
  inDrawer?: boolean;
  onItemClick?: () => void;
}

export function Sidebar({ inDrawer = false, onItemClick }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col w-[220px] lg:w-[240px] h-screen",
        "bg-vf-bg border-r border-vf-border",
        inDrawer ? "" : "hidden md:flex fixed left-0 top-0 z-30",
      )}
    >
      {/* Brand header */}
      <div className="h-14 flex items-center px-5 border-b border-vf-border flex-shrink-0">
        <Brand size="sm" />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-vf-fg-2 font-medium font-mono">
              {section.label}
            </div>
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (pathname?.startsWith(`${item.href}/`) ?? false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-md",
                      "text-sm transition-colors duration-150",
                      "min-h-[40px]",
                      isActive
                        ? "text-vf-fg bg-vf-bg-1"
                        : "text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-vf-green rounded-r" />
                    )}
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-vf-border flex-shrink-0">
        <ThemeToggle variant="row" />
      </div>
    </aside>
  );
}
