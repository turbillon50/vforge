"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { VMark, VWordmark } from "@/components/brand/VMark";
import {
  Activity,
  Bell,
  Boxes,
  ChevronRight,
  GitBranch,
  Globe2,
  KeyRound,
  Layers,
  LifeBuoy,
  Map,
  MessagesSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const nav = [
    { href: "/app/chat", label: t.workspace.nav.chat, icon: MessagesSquare, kbd: "C" },
    { href: "/app/repovision", label: t.workspace.nav.repovision, icon: GitBranch, kbd: "R" },
    { href: "/app/blueprint", label: "Blueprint", icon: Map, kbd: "B" },
    { href: "/app/deployments", label: t.workspace.nav.deployments, icon: Activity, kbd: "D" },
    { href: "/app/marketplace", label: t.workspace.nav.marketplace, icon: Layers, kbd: "M" },
    { href: "/app/integrations", label: t.workspace.nav.integrations, icon: Boxes, kbd: "I" },
    { href: "/app/secrets", label: t.workspace.nav.secrets, icon: ShieldCheck, kbd: "S" },
    { href: "/app/projects", label: t.workspace.nav.projects, icon: Workflow, kbd: "P" },
    { href: "/app/activity", label: t.workspace.nav.activity, icon: Bell, kbd: "A" },
    { href: "/app/hub", label: t.workspace.nav.hub, icon: Globe2, kbd: "H" },
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-void">
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-app bg-ink md:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/app"><VWordmark /></Link>
          <span className="chip">{t.workspace.b_ready}</span>
        </div>

        <div className="px-3">
          <button className="group flex w-full items-center gap-2 rounded-md border border-app bg-tint-1 px-3 py-2 text-left text-sm text-on-surface-variant transition hover:border-app-strong">
            <Search size={14} />
            <span className="flex-1 truncate">{t.workspace.quick_command}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">⌘K</span>
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 no-scrollbar">
          <p className="label-caps mb-2 px-2 text-muted">{t.workspace.workspace_label}</p>
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30"
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
          <div className="mb-3 rounded-lg border border-app bg-tint-1 p-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyber-cyan" />
              <p className="label-caps text-muted">{t.workspace.b_insights_label}</p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant">
              {t.workspace.b_insights_body}
            </p>
          </div>
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
        <TopBar />
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
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-app bg-void/85 backdrop-blur-xl"
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
          <div className="hidden items-center gap-2 rounded-full border border-app-strong bg-tint-1 py-1 pl-1 pr-3 md:flex">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface">
              you
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
      className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em]"
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
    { href: "/app/chat", label: t.workspace.mobile_labels.b, icon: MessagesSquare },
    { href: "/app/deployments", label: t.workspace.mobile_labels.deploy, icon: Activity },
    { href: "/app/projects", label: t.workspace.mobile_labels.projects, icon: Workflow },
    { href: "/app/secrets", label: t.workspace.mobile_labels.vault, icon: KeyRound },
    { href: "/app/activity", label: t.workspace.mobile_labels.alerts, icon: Bell },
  ];
  return (
    <nav
      aria-label="navegación principal"
      className="vf-mobile-nav glass-strong fixed inset-x-3 z-40 mx-auto flex max-w-[460px] items-stretch justify-between gap-0.5 overflow-hidden rounded-2xl px-1 shadow-elev md:hidden"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        minHeight: 56,
      }}
    >
      {mobileNav.map((i) => {
        const active = pathname.startsWith(i.href);
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
                "font-mono text-[10px] uppercase tracking-widest transition",
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
