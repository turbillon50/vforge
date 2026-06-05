"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { VMark, VWordmark } from "@/components/brand/VMark";
import {
  Activity,
  Bell,
  ChevronRight,
  GitBranch,
  LifeBuoy,
  MessagesSquare,
  Search,
  Settings,
  Workflow,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import { Home, Users } from "lucide-react";
import { VPresence } from "@/components/brand/VPresence";
import { VOrb } from "./VOrb";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const nav = [
    { href: "/app/chat", label: "Conversación", icon: MessagesSquare, kbd: "C" },
    { href: "/app/repovision", label: t.workspace.nav.repovision, icon: GitBranch, kbd: "R" },
    { href: "/app/deployments", label: t.workspace.nav.deployments, icon: Activity, kbd: "D" },
    { href: "/app/projects", label: t.workspace.nav.projects, icon: Workflow, kbd: "P" },
  ];
  const navBottom = [
    { href: "/app/home", label: "Inicio", icon: Home, kbd: "H", exact: true },
    { href: "/app/admin", label: "Usuarios", icon: Users, kbd: "U" },
  ];

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-void">
      <aside className="sticky top-0 glass-strong hidden h-dvh w-[260px] shrink-0 flex-col border-r border-app md:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/app"><VWordmark /></Link>
          <span className="flex items-center gap-1.5 text-[12px] text-on-surface-variant"><span className="h-1.5 w-1.5 rounded-full bg-success-emerald" />V en línea</span>
        </div>

        <div className="px-3">
          <button className="group flex w-full items-center gap-2 rounded-md border border-app bg-tint-1 px-3 py-2 text-left text-sm text-on-surface-variant transition hover:border-app-strong">
            <Search size={14} />
            <span className="flex-1 truncate">{t.workspace.quick_command}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">⌘K</span>
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 no-scrollbar">
          <p className="mb-2 px-2 text-[12px] font-medium text-muted">Espacio de trabajo</p>
          {nav.map((item) => {
            const active = (item as { exact?: boolean }).exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30 shadow-[0_0_18px_rgba(139,92,246,0.18)]"
                    : "text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
                )}
              >
                <item.icon size={15} className={active ? "text-cyber-cyan" : ""} />
                <span className="flex-1">{item.label}</span>
                <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted group-hover:inline">
                  {item.kbd}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-app p-3">
          {navBottom.map((item) => {
            const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30"
                    : "text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
                )}
              >
                <item.icon size={15} className={active ? "text-cyber-cyan" : ""} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/app/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
          >
            <Settings size={15} /> {t.workspace.nav.settings}
          </Link>
          <a
            href="#"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
          >
            <LifeBuoy size={15} /> {t.workspace.nav.help}
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 max-w-full flex-1 flex-col h-dvh overflow-x-hidden">
        <TopBar hiddenOnMobile={!!pathname?.startsWith("/app/chat")} />
        <div
          className={cn(
            "flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden",
            // Chat manages its own bottom clearance via .vf-composer-pad — no
            // pb-24 here or we get a double-reserve gap. Other routes need pb-24
            // mobile to clear the floating MobileNav.
            pathname?.startsWith("/app/chat")
              ? "overflow-y-hidden"
              : "overflow-y-auto pb-24 md:pb-0 flex flex-col",
          )}
        >
          {children}
        </div>
        <MobileNav pathname={pathname || ""} />
        <VOrb />
      </div>
    </div>
  );
}

function TopBar({ hiddenOnMobile = false }: { hiddenOnMobile?: boolean }) {
  const { user } = useUser();
  const clerkAppearance = useClerkAppearance();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 glass-strong border-b border-app",
        hiddenOnMobile && "hidden md:block",
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:px-8">
        <div className="flex shrink-0 items-center gap-2 text-on-surface-variant md:hidden">
          <VMark size={20} />
          <span className="font-display text-sm font-semibold tracking-tight text-on-surface">VForge</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumbs />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleToggle compact />
          <ThemeToggle compact />
          <button
            aria-label="Notifications"
            className="rounded-md border border-app-strong bg-tint-1 p-2 text-on-surface-variant hover:text-on-surface"
          >
            <Bell size={15} />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-app-strong bg-tint-1 py-1 pl-1 pr-2 md:pr-3">
            <UserButton afterSignOutUrl="/" appearance={{ ...clerkAppearance, elements: { ...clerkAppearance.elements, avatarBox: "h-7 w-7" } }} />
            <span className="hidden max-w-[120px] truncate text-[13px] font-medium text-on-surface md:inline">
              {user?.firstName ?? user?.username ?? ""}
            </span>
            <span className="hidden rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-300 ring-1 ring-violet-500/30 md:inline">
              Owner
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs() {
  const pathname = usePathname() || "";
  const parts = pathname.split("/").filter(Boolean);
  // Prefix "VForge" so users always see brand root even on mobile.
  const trail = ["VForge", ...parts];
  return (
    <nav
      aria-label="ruta"
      className="flex items-center gap-1.5 text-[13px]"
    >
      {trail.map((p, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={p + i} className="flex items-center gap-1">
            <span
              className={
                isLast
                  ? "bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-semibold text-transparent"
                  : "text-muted"
              }
            >
              {p}
            </span>
            {!isLast && <ChevronRight size={11} className="text-muted/50" />}
          </span>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const t = useT();
  // El bottom-nav vive en TODAS las rutas, incluyendo /app/chat. Sin él
  // Luis se queda sin navegación rápida hacia Proyectos / Bóveda /
  // Deploy / Alertas. Cuando el teclado mobile está abierto, la clase
  // body.keyboard-open lo oculta automáticamente (CSS en globals.css).
  const mobileNav = [
    { href: "/app/chat", label: "Chat", icon: MessagesSquare, orb: true },
    { href: "/app/projects", label: t.workspace.mobile_labels.projects, icon: Workflow },
    { href: "/app/deployments", label: "Despliegues", icon: Activity },
    { href: "/app/settings", label: "Ajustes", icon: Settings },
  ];
  return (
    <nav
      aria-label="navegación principal"
      data-vorb-avoid
      className="vf-mobile-nav glass-strong fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-between gap-0.5 rounded-t-2xl border-t border-app px-2 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        minHeight: 60,
      }}
    >
      {mobileNav.map((i) => {
        const active = (i as { exact?: boolean }).exact
          ? pathname === i.href
          : pathname.startsWith(i.href);
        if ((i as { orb?: boolean }).orb) {
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-label="Hablar con V"
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-[0.94]",
                active ? "text-violet-300" : "text-on-surface-variant",
              )}
            >
              <VPresence size={28} breathing={active} />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active
                    ? "bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-semibold text-transparent"
                    : "",
                )}
              >
                {i.label}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-[0.94]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              active ? "text-violet-300" : "text-on-surface-variant",
            )}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId="vf-nav-halo"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="pointer-events-none absolute inset-x-3 -bottom-0.5 top-1 -z-10 rounded-xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(139,92,246,0.5), rgba(34,211,238,0.28) 55%, transparent 75%)",
                  filter: "blur(8px)",
                  opacity: 0.7,
                }}
              />
            )}
            <motion.span
              className="inline-flex items-center justify-center"
              animate={
                active
                  ? { scale: [1, 1.08, 1] }
                  : { scale: 1 }
              }
              transition={
                active
                  ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.18 }
              }
            >
              <i.icon
                size={18}
                strokeWidth={active ? 2.4 : 2}
                className={cn(
                  "transition",
                  active
                    ? "text-violet-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.65)]"
                    : "group-hover:text-on-surface",
                )}
              />
            </motion.span>
            <span
              className={cn(
                "text-[10px] font-medium transition",
                active
                  ? "bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-semibold text-transparent"
                  : "",
              )}
            >
              {i.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
