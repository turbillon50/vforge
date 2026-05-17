"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";
import { Drawer } from "./drawer";
import { VDock } from "@/components/V/VDock";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Vercel/Linear-style shell:
 *   Desktop ≥ lg   → [ Sidebar 240px | Main (fluid) | V dock 380px ]
 *   md → lg        → [ Sidebar 220px | Main (fluid) ]  · V via topbar button
 *   < md           → [ Topbar | Main | Bottom hint ]   · Sidebar via drawer
 *
 * No spring animations on route transitions — content paints immediately.
 */
export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-vf-bg text-vf-fg font-sans antialiased">
      {/* Mobile topbar (hamburger + V button) */}
      <Topbar onMenuClick={() => setDrawerOpen(true)} />

      {/* Desktop left sidebar (fixed) */}
      <Sidebar />

      {/* Mobile slide-in drawer wrapping the same Sidebar tree */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* V dock — desktop ≥ lg only; mobile uses topbar button */}
      <VDock />

      {/* Main content
          - Desktop: left padded by sidebar (240px) and right padded by V dock (380px lg)
          - Mobile: top padded by topbar (56px) */}
      <main
        className="
          pt-14 md:pt-0
          md:pl-[220px] lg:pl-[240px]
          lg:pr-[380px]
          min-h-screen
        "
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav (hidden on md+) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe">
        <MobileNav />
      </div>
    </div>
  );
}
