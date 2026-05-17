"use client";

import { useState } from "react";
import { MobileNav } from "./mobile-nav";
import { Drawer } from "./drawer";
import { MultichatDrawer } from "@/components/V/MultichatDrawer";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMultichatOpen, setIsMultichatOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/hub";

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex select-none text-white font-sans w-full">
      
      {/* Immersive Cinematic Wallpaper (glowing ambient orbs) */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ background: "radial-gradient(circle at center, #15102a 0%, #03000a 100%)" }}
      >
        {/* Ambient Orb 1 */}
        <motion.div 
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-600/25 blur-[120px]"
        />
        {/* Ambient Orb 2 */}
        <motion.div 
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[150px]"
        />
        {/* Ambient Orb 3 */}
        <motion.div 
          animate={{
            x: [0, 30, -30, 0],
            y: [0, 50, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-vf-green/15 blur-[100px]"
        />
      </div>

      {/* Main OS Viewport (Always full-screen for absolute immersion) */}
      <div className="flex-1 flex flex-col min-h-screen w-full relative z-10">
        
        {/* Glassmorphic Top Status Bar (Clean and modern like macOS/iOS) */}
        <header className="h-12 w-full border-b border-white/5 bg-white/[0.02] backdrop-blur-md px-6 flex items-center justify-between z-30 select-none">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wider text-white/90 font-mono">vForge OS</span>
            <div className="flex items-center gap-1.5 bg-vf-green/10 px-2 py-0.5 rounded-full border border-vf-green/30">
              <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse" />
              <span className="text-[9px] font-bold text-vf-green tracking-wider uppercase font-mono">Anillo 0</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
            <span>v1.2.0</span>
          </div>
        </header>

        {/* Desktop Viewport Wrapper */}
        <div className="flex-1 relative w-full h-full flex items-center justify-center p-4 md:p-8">
          <AnimatePresence mode="wait">
            {!isHome && (
              <motion.div
                key={pathname}
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className={cn(
                  "absolute inset-x-2 top-2 bottom-16 md:inset-x-8 md:top-6 md:bottom-24 max-w-5xl mx-auto",
                  "bg-vf-bg/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]",
                  "flex flex-col overflow-hidden"
                )}
              >
                {/* App Navigation Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.03]">
                  <button 
                    onClick={() => router.push("/hub")}
                    className="flex items-center gap-2 text-xs font-semibold text-vf-green hover:text-white transition-colors py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Regresar</span>
                  </button>
                  <div className="w-16 h-1.5 bg-white/20 rounded-full" />
                  <div className="w-24" />
                </div>

                {/* Content Inside Active App */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-white/10">
                  {children}
                </div>
              </motion.div>
            )}

            {isHome && (
              <motion.div
                key="home-desktop"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 overflow-y-auto flex items-center justify-center"
              >
                <div className="w-full max-w-6xl h-full flex flex-col items-center justify-start">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Bottom OS Navigation & Dock */}
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
          <MobileNav onOrbClick={() => setIsMultichatOpen(true)} />
        </div>
      </div>

      {/* Multichat Panel */}
      <MultichatDrawer isOpen={isMultichatOpen} onClose={() => setIsMultichatOpen(false)} />
    </div>
  );
}
