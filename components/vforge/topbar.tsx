"use client";

import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { ProjectSwitcher } from "./project-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Menu, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Topbar({ onMenuClick, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-40",
        "h-14 px-4 flex items-center justify-between",
        "bg-vf-bg/95 backdrop-blur-sm border-b border-vf-border",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Brand size="sm" />
      </div>

      <div className="flex items-center gap-2">
        <ProjectSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
        >
          <Bell className="w-4 h-4" />
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
