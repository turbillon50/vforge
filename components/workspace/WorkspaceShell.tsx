"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    { href: "/app/deployments", label: t.workspace.nav.deployments, icon: Activity, kbd: "D" },
    { href: "/app/marketplace", label: t.workspace.nav.marketplace, icon: Layers, kbd: "M" },
    { href: "/app/integrations", label: t.workspace.nav.integrations, icon: Boxes, kbd: "I" },
    { href: "/app/secrets", label: t.workspace.nav.secrets, icon: ShieldCheck, kbd: "S" },
    { href: "/app/projects", label: t.workspace.nav.projects, icon: Workflow, kbd: "P" },
    { href: "/app/activity", label: t.workspace.nav.activity, icon: Bell, kbd: "A" },
    { href: "/app/hub", label: t.workspace.nav.hub, icon: Globe2, kbd: "H" },
  ];

  return (
    <div className="flex min-h-dvh bg-void">
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

      <div className="min-w-0 flex-1">
        <TopBar />
        <div className="pb-24 md:pb-0">{children}</div>
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
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:px-8">
        <div className="flex items-center gap-2 text-on-surface-variant md:hidden">
          <VMark size={20} />
          <span className="font-display text-sm font-semibold tracking-tight text-on-surface">VForge</span>
        </div>
        <Breadcrumbs />
        <div className="flex items-center gap-2">
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
  return (
    <nav className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
      {parts.map((p, i) => (
        <span key={p + i} className="flex items-center gap-1">
          <span className={i === parts.length - 1 ? "text-on-surface" : ""}>{p}</span>
          {i < parts.length - 1 && <ChevronRight size={11} />}
        </span>
      ))}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const t = useT();
  const mobileNav = [
    { href: "/app/chat", label: t.workspace.mobile_labels.b, icon: MessagesSquare },
    { href: "/app/deployments", label: t.workspace.mobile_labels.deploy, icon: Activity },
    { href: "/app/projects", label: t.workspace.mobile_labels.projects, icon: Workflow },
    { href: "/app/secrets", label: t.workspace.mobile_labels.vault, icon: KeyRound },
    { href: "/app/activity", label: t.workspace.mobile_labels.alerts, icon: Bell },
  ];
  return (
    <nav
      className="fixed inset-x-3 z-40 mx-auto flex max-w-[420px] items-center justify-between gap-1 rounded-2xl border border-app-strong bg-ink/95 px-2 py-1.5 shadow-elev backdrop-blur-xl md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      {mobileNav.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition",
              active ? "bg-violet-500/15 text-violet-300" : "text-on-surface-variant"
            )}
          >
            <i.icon size={16} />
            <span className="font-mono text-[10px] uppercase tracking-widest">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
