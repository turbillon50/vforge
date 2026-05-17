"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { Drawer } from "./drawer";
import { MultichatDrawer } from "@/components/V/MultichatDrawer";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FolderKanban, Lock, Boxes, Search, Eye, Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface AppShellProps {
  children: React.ReactNode;
}

const backgroundApps = [
  { id: "projects", name: "Proyectos", icon: FolderKanban, color: "bg-blue-500/20 text-blue-500" },
  { id: "vault", name: "Bóveda V", icon: Lock, color: "bg-amber-500/20 text-amber-500" },
  { id: "modules", name: "Módulos", icon: Boxes, color: "bg-purple-500/20 text-purple-500" },
  { id: "hunter", name: "Repo Hunt", icon: Search, color: "bg-emerald-500/20 text-emerald-500" },
  { id: "vision", name: "Repo Vision", icon: Eye, color: "bg-indigo-500/20 text-indigo-500" },
  { id: "forge", name: "Forge AI", icon: Sparkles, color: "bg-vf-green/20 text-vf-green" },
];

export function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMultichatOpen, setIsMultichatOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/hub";

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex select-none">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative md:ml-[220px] lg:ml-[240px]">
        {/* Mobile Topbar */}
        <Topbar onMenuClick={() => setIsDrawerOpen(true)} />

        {/* Mobile Drawer */}
        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        {/* The Desktop OS Layer (Always in the background) */}
        <div 
          className={cn(
            "absolute inset-0 z-0 flex flex-col items-center justify-start pt-20 px-6 transition-all duration-500",
            isHome ? "opacity-100 scale-100 blur-0" : "opacity-40 scale-95 blur-md pointer-events-none"
          )}
        >
          <div className="w-full max-w-md text-left mb-12">
            <h1 className="text-2xl font-semibold tracking-tight text-white/90">vForge OS</h1>
            <p className="text-xs text-white/50">Sistema Operativo Anillo 0</p>
          </div>

          <div className="w-full max-w-md grid grid-cols-4 gap-x-4 gap-y-8">
            {backgroundApps.map((app) => (
              <div key={app.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg bg-gradient-to-br from-white/5 to-transparent",
                  app.color
                )}>
                  <app.icon className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-medium text-white/60">{app.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Window Layer (iPhone Multitasking App View) */}
        <div className="flex-1 relative z-10">
          <AnimatePresence mode="wait">
            {!isHome && (
              <motion.div
                key={pathname}
                initial={{ y: "100%", borderRadius: "40px" }}
                animate={{ y: 0, borderRadius: "24px" }}
                exit={{ y: "100%", borderRadius: "40px" }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className={cn(
                  "absolute inset-x-2 top-4 bottom-2 md:inset-4",
                  "bg-vf-bg/85 backdrop-blur-3xl border border-white/10 shadow-2xl",
                  "flex flex-col overflow-hidden"
                )}
              >
                {/* iOS Window Header / Grabber */}
                <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5">
                  <button 
                    onClick={() => router.push("/hub")}
                    className="flex items-center gap-1 text-xs font-medium text-vf-green hover:opacity-80 transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Home</span>
                  </button>
                  <div className="w-12 h-1 bg-white/20 rounded-full" /> {/* Grab Bar */}
                  <div className="w-16" /> {/* Spacer */}
                </div>

                {/* App Content */}
                <div className="flex-1 overflow-y-auto px-5 py-6">
                  {children}
                </div>
              </motion.div>
            )}

            {isHome && (
              <motion.div
                key="home-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0"
              >
                <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-8 h-full">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav onOrbClick={() => setIsMultichatOpen(true)} />
      </div>

      {/* V Multichat OS Level Drawer */}
      <MultichatDrawer isOpen={isMultichatOpen} onClose={() => setIsMultichatOpen(false)} />
    </div>
  );
}
