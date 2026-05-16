"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { Drawer } from "./drawer";
import { MultichatDrawer } from "@/components/V/MultichatDrawer";
import { ForgeOrb } from "@/components/ui/forge-orb"; // if we needed it, but it's in mobile-nav
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMultichatOpen, setIsMultichatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-vf-bg relative overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Topbar */}
      <Topbar onMenuClick={() => setIsDrawerOpen(true)} />

      {/* Mobile Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen relative z-10",
          "pt-14 pb-20 md:pt-0 md:pb-0", // Mobile: offset for topbar and bottom nav
          "md:ml-[220px] lg:ml-[240px]" // Desktop: offset for sidebar
        )}
      >
        <div className="w-full h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav onOrbClick={() => setIsMultichatOpen(true)} />

      {/* V Multichat OS Level Drawer */}
      <MultichatDrawer isOpen={isMultichatOpen} onClose={() => setIsMultichatOpen(false)} />
    </div>
  );
}
