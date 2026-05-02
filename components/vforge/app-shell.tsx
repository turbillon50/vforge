"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { Drawer } from "./drawer";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-vf-bg">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Topbar */}
      <Topbar onMenuClick={() => setIsDrawerOpen(true)} />

      {/* Mobile Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen",
          "pt-14 pb-20 md:pt-0 md:pb-0", // Mobile: offset for topbar and bottom nav
          "md:ml-[220px] lg:ml-[240px]" // Desktop: offset for sidebar
        )}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
