"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForgeOrb } from "@/components/ui/forge-orb";
import {
  LayoutDashboard,
  FolderKanban,
  Lock,
  Boxes,
} from "lucide-react";

const navItems = [
  { name: "Hub", href: "/hub", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "FORGE", href: "/forge", icon: null, isCenter: true },
  { name: "Bóveda", href: "/vault", icon: Lock },
  { name: "Módulos", href: "/modules", icon: Boxes },
];

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  const handleTap = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40",
        "h-16 px-2 flex items-center justify-around",
        "bg-vf-bg/60 backdrop-blur-xl border-t border-vf-border/50",
        "pb-safe",
        className
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (item.isCenter) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleTap}
              className={cn(
                "flex flex-col items-center justify-center",
                // Smaller central button (was 64×64 with -mt-5). Less
                // visual weight so the composer remains readable on
                // mobile when the on-screen keyboard is up.
                "w-12 h-12 -mt-3 rounded-full",
                "bg-black",
                "ring-2 ring-vf-green",
                "shadow-[0_0_14px_rgba(124,255,60,0.35),0_0_28px_rgba(124,255,60,0.18)]",
                "transition-all duration-150",
                "active:scale-95 hover:scale-105"
              )}
              aria-label={item.name}
            >
              <ForgeOrb size={28} state="idle" glow={false} />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleTap}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-3",
              "min-w-[56px] min-h-[44px]",
              "transition-colors duration-150"
            )}
          >
            {item.icon && (
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-vf-green-quiet" : "text-vf-fg-2"
                )}
              />
            )}
            <span
              className={cn(
                "text-[10px] tracking-wide",
                isActive ? "text-vf-green-quiet" : "text-vf-fg-2"
              )}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
