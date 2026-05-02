"use client";

import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Activity,
  Eye,
  Search,
  Compass,
  Lock,
  Boxes,
  Settings,
} from "lucide-react";

const navSections = [
  {
    label: "CONTROL",
    items: [
      { name: "Hub", href: "/hub", icon: LayoutDashboard },
      { name: "Proyectos", href: "/projects", icon: FolderKanban },
      { name: "Forge AI", href: "/forge", icon: Sparkles },
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
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-[220px] lg:w-[240px] h-screen",
        "bg-vf-bg border-r border-vf-border",
        "fixed left-0 top-0",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="px-3 mb-2 text-[11px] uppercase tracking-wide text-vf-fg-2 font-medium">
              {section.label}
            </div>
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-md",
                      "text-sm transition-colors duration-150",
                      isActive
                        ? "text-vf-fg bg-vf-bg-1"
                        : "text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-vf-green rounded-r green-glow-sm"
                      />
                    )}
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-vf-border">
        <ThemeToggle variant="row" />
      </div>
      <div className="px-6 py-4 border-t border-vf-border">
        <Brand size="md" />
      </div>
    </aside>
  );
}
