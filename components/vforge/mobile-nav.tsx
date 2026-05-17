"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Lock,
  Boxes,
  Activity,
} from "lucide-react";

const navItems = [
  { name: "Hub", href: "/hub", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Bóveda", href: "/vault", icon: Lock },
  { name: "Módulos", href: "/modules", icon: Boxes },
  { name: "Activity", href: "/activity", icon: Activity },
];

/**
 * Bottom nav for mobile. Clean GitHub-style:
 * - 5 equal items
 * - No floating orb (V is accessed from the topbar — central, always)
 * - Solid background, no backdrop blur (cheap on mobile)
 */
export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "h-14 px-1 flex items-stretch justify-around",
        "bg-vf-bg border-t border-vf-border",
        className,
      )}
      style={{ touchAction: "manipulation" }}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (pathname?.startsWith(`${item.href}/`) ?? false);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              "transition-colors",
              "min-h-[44px]",
              isActive ? "text-vf-green" : "text-vf-fg-2 hover:text-vf-fg-1",
            )}
            style={{ touchAction: "manipulation" }}
          >
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
            <span className="text-[10px] font-medium leading-none">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
