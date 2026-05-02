"use client";

import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Drawer({ isOpen, onClose }: DrawerProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "md:hidden fixed left-0 top-0 bottom-0 z-50",
              "w-[280px] bg-vf-bg border-r border-vf-border",
              "flex flex-col"
            )}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-vf-border">
              <Brand size="sm" />
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

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
                          onClick={onClose}
                          className={cn(
                            "relative flex items-center gap-3 px-3 py-3 rounded-md",
                            "text-sm transition-colors duration-150",
                            "min-h-[44px]",
                            isActive
                              ? "text-vf-fg bg-vf-bg-1"
                              : "text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-vf-green rounded-r green-glow-sm" />
                          )}
                          <item.icon className="w-5 h-5" />
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
