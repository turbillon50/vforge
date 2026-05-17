"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { motion } from "framer-motion";
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
  onOrbClick?: () => void;
}

export function MobileNav({ className, onOrbClick }: MobileNavProps) {
  const pathname = usePathname();

  const handleTap = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  return (
    <div className="w-full flex justify-center px-4 pb-4 select-none">
      <nav
        className={cn(
          "w-full max-w-lg h-16 px-4 flex items-center justify-around",
          "bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
          "pb-safe transition-all duration-300",
          className
        )}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.isCenter) {
            return (
              <button
                key="orb"
                onClick={() => {
                  handleTap();
                  if (onOrbClick) onOrbClick();
                }}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "w-12 h-12 -mt-6 rounded-full relative group",
                  "bg-black border border-white/10",
                  "ring-2 ring-vf-green/50 hover:ring-vf-green",
                  "shadow-[0_0_20px_rgba(124,255,60,0.25)] hover:shadow-[0_0_30px_rgba(124,255,60,0.5)]",
                  "transition-all duration-300",
                  "active:scale-90 hover:scale-110"
                )}
                aria-label="V"
              >
                {/* Micro-glow indicator under Orb */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-vf-green/60 blur-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <ForgeOrb size={28} state="idle" glow={false} />
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleTap}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 px-3 relative group",
                "min-w-[50px] min-h-[44px] rounded-2xl",
                "transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.02] active:scale-95"
              )}
            >
              {item.icon && (
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-vf-green" : "text-white/40 group-hover:text-white/70"
                  )}
                />
              )}
              
              <span
                className={cn(
                  "text-[9px] font-semibold tracking-wide transition-colors",
                  isActive ? "text-vf-green" : "text-white/40 group-hover:text-white/70"
                )}
              >
                {item.name}
              </span>

              {/* Active navigation indicator dot */}
              {isActive && (
                <motion.span 
                  layoutId="activeDot"
                  className="absolute bottom-1 w-1 h-1 bg-vf-green rounded-full shadow-[0_0_8px_#7cff3c]" 
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
