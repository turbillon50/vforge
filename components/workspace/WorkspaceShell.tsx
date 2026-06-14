"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VMark, VWordmark } from "@/components/brand/VMark";
import {
  IconChat, IconBranch, IconActivity, IconLayers, IconFile,
  IconSearch, IconSettings, IconHome, IconUsers, IconBell,
  IconChevR, IconLifeBuoy, IconRocket, IconGlobe, IconDatabase, IconCpu,
  IconZap, IconWorkflow, IconBoxes, IconBag, IconKey, IconCreditCard, IconX, IconShare,
} from "@/components/brand/VFIcons";
import { UserButton, useUser } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import { VPresence } from "@/components/brand/VPresence";
import { VOrb } from "./VOrb";
import { TokenHealthIndicator, TokenToastHost } from "./TokenHealth";
import { Icon3D } from "@/components/brand/Icon3D";
import { PageTransition } from "@/components/motion/PageTransition";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";
import { CommandPalette } from "./CommandPalette";

// Atajos "G + letra" estilo Linear (chord: pulsa G, luego la letra).
const GOTO: Record<string, string> = {
  c: "/app/chat",
  t: "/app/taller",
  b: "/app/blueprint",
  r: "/app/repovision",
  p: "/app/projects",
};
function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

function hasClerkPublishableKey(): boolean {
  return /^pk_(test|live)_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "");
}


const NAV = [
  { href:"/app/chat",        label:"Conversación",  Icon:IconChat,     kbd:"C" },
  { href:"/app/repovision",  label:"RepoVisión",    Icon:IconBranch,   kbd:"R" },
  { href:"/app/deployments", label:"Despliegues",   Icon:IconRocket,   kbd:"D" },
  { href:"/app/vulcano",       label:"Navegador",    Icon:IconGlobe,    kbd:"N" },
  { href:"/app/taller",      label:"Taller",        Icon:IconCpu,      kbd:"O" },
  { href:"/app/blueprint",   label:"Blueprint",     Icon:IconWorkflow, kbd:"B" },
  { href:"/app/crm",         label:"CRM",           Icon:IconUsers,    kbd:"M" },
  { href:"/app/projects",    label:"Proyectos",     Icon:IconLayers,   kbd:"P" },
  { href:"/app/vault",       label:"Baul",          Icon:IconDatabase, kbd:"L" },
  { href:"/app/contracts",   label:"Contratos",     Icon:IconFile,     kbd:"T" },
  { href:"/app/activity",    label:"Actividad",     Icon:IconActivity, kbd:"A" },
  { href:"/app/community",   label:"Community",     Icon:IconShare,    kbd:"K" },
];
const NAV_BTM = [
  { href:"/app/home",  label:"Inicio",   Icon:IconHome,  exact:true },
  { href:"/app/admin", label:"Usuarios", Icon:IconUsers },
];
const MOBILE = [
  { href:"/app/home",        label:"Inicio",    Icon:IconHome },
  { href:"/app/taller",      label:"Taller",    Icon:IconCpu },
  { href:"/app/chat",        label:"Chat",      orb:true },
  { href:"/app/blueprint",   label:"Blueprint", Icon:IconWorkflow },
  { href:"/app/vulcano",      label:"Navegador", Icon:IconGlobe },
];

/**
 * PARIDAD MÓVIL/DESKTOP: TODAS las secciones que el sidebar desktop expone,
 * agrupadas para el bottom-sheet "Más". El bottom nav solo cabe 5 atajos; este
 * drawer abre el resto para que el móvil no esconda nada de la app.
 */
type IconCmp = typeof IconHome;
const MORE_GROUPS: { title:string; items:{ href:string; label:string; desc:string; Icon:IconCmp; exact?:boolean }[] }[] = [
  {
    title: "Operación",
    items: [
      { href:"/app/home",        label:"Inicio",       desc:"Panel y resumen del workspace",     Icon:IconHome, exact:true },
      { href:"/app/taller",      label:"Taller",       desc:"Esferas Vulcano construyendo en vivo", Icon:IconCpu },
      { href:"/app/chat",        label:"Conversación", desc:"Chat operativo con el agente V",     Icon:IconChat },
      { href:"/app/vulcano",     label:"Navegador",    desc:"Navegador autónomo en Hetzner",      Icon:IconGlobe },
      { href:"/app/blueprint",   label:"Blueprint",    desc:"Flujos y automatizaciones n8n",      Icon:IconWorkflow },
      { href:"/app/repovision",  label:"RepoVisión",   desc:"Estructura y ramas del repositorio", Icon:IconBranch },
      { href:"/app/deployments", label:"Despliegues",  desc:"Builds y deploys de Vercel",         Icon:IconRocket },
      { href:"/app/projects",    label:"Proyectos",    desc:"Forja y gestión de proyectos",       Icon:IconLayers },
      { href:"/app/activity",    label:"Actividad",    desc:"Bitácora de eventos del sistema",    Icon:IconActivity },
    ],
  },
  {
    title: "Clientes y Ventas",
    items: [
      { href:"/app/crm",         label:"CRM",          desc:"Leads y pipeline de ventas",         Icon:IconUsers },
      { href:"/app/contracts",   label:"Contratos",    desc:"Documentos legales automatizados",   Icon:IconFile },
      { href:"/app/marketplace", label:"Marketplace",  desc:"Plantillas y módulos reutilizables", Icon:IconBag },
      { href:"/app/community",  label:"Community",    desc:"Redes sociales · Revisión de posts",  Icon:IconShare },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href:"/app/vault",         label:"Baúl",          desc:"Evidencia y archivos vivos",       Icon:IconDatabase },
      { href:"/app/secrets",       label:"Secrets",       desc:"Credenciales y llaves cifradas",   Icon:IconKey },
      { href:"/app/integrations",  label:"Integraciones", desc:"Servicios y APIs conectadas",      Icon:IconZap },
      { href:"/app/admin",         label:"Usuarios",      desc:"Miembros, roles y permisos",       Icon:IconUsers },
      { href:"/app/admin/billing", label:"Facturación",   desc:"Planes, pagos y suscripción",      Icon:IconCreditCard },
      { href:"/app/settings",      label:"Configuración", desc:"Ajustes de cuenta y workspace",    Icon:IconSettings },
    ],
  },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const lastG = useRef(0);

  // Atajos de teclado G+letra (sin abrir la paleta)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "g") { lastG.current = e.timeStamp; return; }
      if (lastG.current && e.timeStamp - lastG.current < 1000) {
        const href = GOTO[k];
        lastG.current = 0;
        if (href) { e.preventDefault(); router.push(href); }
      } else {
        lastG.current = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[var(--color-void)]">
      {/* Sidebar — chrome theme-aware (tokens --chrome-bg / --fg-* / --border-* / --surface-*) */}
      <aside data-chrome className="hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[var(--border-1)] bg-[rgb(var(--chrome-bg)/0.92)] backdrop-blur-2xl md:flex">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <Link href="/app"><VWordmark /></Link>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--fg-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"/>online
            </span>
          </div>
          <TokenHealthIndicator className="mt-3" />
        </div>
        <div className="px-3 pb-3">
          <button onClick={()=>window.dispatchEvent(new Event("vf:command-palette"))} className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[13px] text-[var(--fg-tertiary)] transition hover:bg-[var(--surface-2)]">
            <IconSearch size={14}/><span className="flex-1 text-left">Buscar</span>
            <kbd className="font-mono text-[10px] opacity-60">⌘K</kbd>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-2 no-scrollbar">
          <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">Workspace</p>
          {NAV.map(({ href, label, Icon, kbd }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "group relative mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                active ? "bg-violet-500/12 text-[var(--color-violet-300)] ring-1 ring-violet-500/25" : "text-[var(--fg-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
              )}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-400 opacity-80"/>}
                <Icon size={15} className={active?"text-[var(--color-violet-300)]":"text-[var(--fg-muted)] group-hover:text-[var(--fg-secondary)]"}/>
                <span className="flex-1">{label}</span>
                <span className="hidden font-mono text-[9px] tracking-widest text-[var(--fg-subtle)] group-hover:inline">{kbd}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border-1)] p-3 space-y-0.5">
          {NAV_BTM.map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname===href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                active?"bg-violet-500/12 text-[var(--color-violet-300)]":"text-[var(--fg-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
              )}>
                <Icon size={14} className={active?"text-[var(--color-violet-300)]":"text-[var(--fg-muted)]"}/>{label}
              </Link>
            );
          })}
          <Link href="/app/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-[var(--fg-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]">
            <IconSettings size={14} className="text-[var(--fg-muted)]"/>Configuración
          </Link>
          <a href="#" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-[var(--fg-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]">
            <IconLifeBuoy size={14} className="text-[var(--fg-muted)]"/>Ayuda
          </a>
        </div>
      </aside>
      {/* Main */}
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar hiddenOnMobile={pathname.startsWith("/app/chat")||pathname.startsWith("/forge")||pathname.startsWith("/v")} pathname={pathname}/>
        <div data-app-scroll className={cn(
          "flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden",
          (pathname.startsWith("/app/chat")||pathname.startsWith("/app/vulcano")||pathname.startsWith("/forge")||pathname.startsWith("/v"))?"overflow-y-hidden":"overflow-y-auto flex flex-col"
        )}>
          {(pathname.startsWith("/app/chat")||pathname.startsWith("/app/vulcano"))?children:<PageTransition>{children}</PageTransition>}
        </div>
        <MobileNav pathname={pathname}/>
        <VOrb/>
      </div>
      <TokenToastHost/>
      <CommandPalette/>
    </div>
  );
}

function TopBar({ hiddenOnMobile, pathname }: { hiddenOnMobile?:boolean; pathname:string }) {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <header data-chrome className={cn("sticky top-0 z-30 border-b border-[var(--border-1)] bg-[rgb(var(--chrome-bg)/0.85)] backdrop-blur-2xl",hiddenOnMobile&&"hidden md:block")}
      style={{ paddingTop:"env(safe-area-inset-top,0px)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-[var(--fg-secondary)] transition active:scale-95 md:hidden">
          <VMark size={18}/><span className="font-display text-sm font-semibold text-[var(--fg-primary)]">VForge</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block"><Breadcrumbs pathname={pathname}/></div>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-1.5 font-mono text-[11px] text-[var(--fg-tertiary)] transition hover:border-violet-500/30 hover:text-[var(--color-violet-300)] sm:inline-flex">
            <IconHome size={11}/> Landing
          </Link>
          <LocaleToggle compact/>
          <ThemeToggle compact/>
          <button aria-label="Notificaciones" className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-tertiary)] transition hover:text-[var(--fg-primary)]">
            <IconBell size={13}/>
          </button>
          {clerkEnabled ? <ClerkUserMenu /> : <ClerkOfflineUser />}
        </div>
      </div>
    </header>
  );
}

function ClerkUserMenu() {
  const { user } = useUser();
  const ca = useClerkAppearance();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] py-1 pl-1 pr-2.5">
      <UserButton afterSignOutUrl="/" appearance={{...ca,elements:{...ca.elements,avatarBox:"h-6 w-6"}}}/>
      <span className="hidden max-w-[90px] truncate font-display text-[12px] font-medium text-[var(--fg-secondary)] md:inline">
        {user?.firstName??user?.username??""}
      </span>
      <span className="hidden rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--color-violet-300)] md:inline">Owner</span>
    </div>
  );
}

function ClerkOfflineUser() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-1.5">
      <span className="hidden max-w-[90px] truncate font-display text-[12px] font-medium text-[var(--fg-secondary)] md:inline">
        Luis
      </span>
      <span className="hidden rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--color-violet-300)] md:inline">Owner</span>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname:string }) {
  const parts = pathname.split("/").filter(Boolean);
  const trail = ["VForge",...parts];
  return (
    <nav aria-label="ruta" className="flex items-center gap-1 font-mono text-[12px]">
      {trail.map((p,i)=>{
        const isLast=i===trail.length-1;
        return (
          <span key={p+i} className="flex items-center gap-1">
            <span className={isLast?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-semibold text-transparent":"text-[var(--fg-muted)]"}>{p}</span>
            {!isLast&&<IconChevR size={9} className="text-[var(--fg-subtle)]"/>}
          </span>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname:string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  // "Más" se considera activo cuando la ruta actual NO está entre los 5 atajos
  // del bottom nav — así el usuario ve que está en una sección "del cajón".
  const inMore = !MOBILE.some(m => pathname.startsWith(m.href));
  return (
    <>
    <nav data-chrome data-vorb-avoid className="flex flex-none items-stretch justify-between gap-0.5 border-t border-[var(--border-1)] bg-[rgb(var(--chrome-bg)/0.92)] px-2 backdrop-blur-2xl md:hidden"
      style={{ paddingBottom:"max(env(safe-area-inset-bottom,0px),12px)", minHeight:58 }}>
      {MOBILE.map(item=>{
        const active=pathname.startsWith(item.href);
        if(item.orb) return (
          <Link key={item.href} href={item.href} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)]")}>
            <VPresence size={25} breathing={active}/>
            <span className={cn("font-mono text-[9px] uppercase tracking-widest",active?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>{item.label}</span>
          </Link>
        );
        if("Icon" in item && item.Icon) {
          const Icon = item.Icon;
          return (
            <Link key={item.href} href={item.href} className={cn("group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)]")}>
              {active&&<motion.span aria-hidden layoutId="vf-mob-halo" transition={{type:"spring",stiffness:380,damping:32}}
                className="pointer-events-none absolute inset-x-2 -bottom-0.5 top-1 -z-10 rounded-xl"
                style={{background:"radial-gradient(ellipse,rgba(139,92,246,0.4),transparent 70%)",filter:"blur(8px)"}}/>}
              <motion.span className="inline-flex" animate={active?{scale:[1,1.08,1]}:{scale:1}} transition={active?{duration:2.4,repeat:Infinity,ease:"easeInOut"}:{duration:0.18}}>
                <Icon size={24} className={cn("transition",active?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)] group-hover:text-[var(--fg-secondary)]")}/>
              </motion.span>
              <span className={cn("font-mono text-[9px] uppercase tracking-widest",active?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>{item.label}</span>
            </Link>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={cn("group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)]")}>
            {active&&<motion.span aria-hidden layoutId="vf-mob-halo" transition={{type:"spring",stiffness:380,damping:32}}
              className="pointer-events-none absolute inset-x-2 -bottom-0.5 top-1 -z-10 rounded-xl"
              style={{background:"radial-gradient(ellipse,rgba(139,92,246,0.4),transparent 70%)",filter:"blur(8px)"}}/>}
            <motion.span className="inline-flex" animate={active?{scale:[1,1.08,1]}:{scale:1}} transition={active?{duration:2.4,repeat:Infinity,ease:"easeInOut"}:{duration:0.18}}>
              <Icon3D name={(item as {icon3d?:any}).icon3d} size={25} glow={active} className={cn("transition",active?"":"opacity-55 group-hover:opacity-90")}/>
            </motion.span>
            <span className={cn("font-mono text-[9px] uppercase tracking-widest",active?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>{item.label}</span>
          </Link>
        );
      })}
      {/* 6º atajo: "Más" abre el cajón con TODAS las secciones (paridad desktop) */}
      <button onClick={()=>setMoreOpen(true)} aria-label="Más secciones" aria-haspopup="dialog" aria-expanded={moreOpen}
        className={cn("group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",inMore?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)]")}>
        {inMore&&<motion.span aria-hidden layoutId="vf-mob-halo" transition={{type:"spring",stiffness:380,damping:32}}
          className="pointer-events-none absolute inset-x-2 -bottom-0.5 top-1 -z-10 rounded-xl"
          style={{background:"radial-gradient(ellipse,rgba(139,92,246,0.4),transparent 70%)",filter:"blur(8px)"}}/>}
        <motion.span className="inline-flex" animate={moreOpen?{scale:[1,1.08,1]}:{scale:1}} transition={{duration:0.18}}>
          <IconBoxes size={24} className={cn("transition",inMore?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)] group-hover:text-[var(--fg-secondary)]")}/>
        </motion.span>
        <span className={cn("font-mono text-[9px] uppercase tracking-widest",inMore?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>Más</span>
      </button>
    </nav>
    <MoreDrawer open={moreOpen} onClose={()=>setMoreOpen(false)} pathname={pathname}/>
    </>
  );
}

function MoreDrawer({ open, onClose, pathname }: { open:boolean; onClose:()=>void; pathname:string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.2 }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-label="Todas las secciones"
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm md:hidden"
        >
          <motion.div
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", stiffness:360, damping:38 }}
            onClick={(e)=>e.stopPropagation()}
            data-chrome
            className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border-2)] bg-[rgb(var(--chrome-bg)/0.98)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] no-scrollbar"
            style={{ paddingBottom:"max(env(safe-area-inset-bottom,0px),20px)" }}
          >
            {/* borde superior con gradiente premium */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"/>
            {/* grabber */}
            <div className="sticky top-0 z-10 flex flex-col items-center bg-[rgb(var(--chrome-bg)/0.96)] pt-2.5 backdrop-blur-xl">
              <span className="h-1 w-10 rounded-full bg-[var(--fg-subtle)]"/>
              <div className="flex w-full items-center justify-between px-5 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <VMark size={18}/>
                  <span className="font-display text-[15px] font-bold text-[var(--fg-primary)]">Todas las secciones</span>
                </div>
                <button onClick={onClose} aria-label="Cerrar"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-2)] bg-[var(--surface-1)] text-[var(--fg-tertiary)] transition active:scale-90 hover:text-[var(--fg-primary)]">
                  <IconX size={14}/>
                </button>
              </div>
            </div>

            <div className="space-y-5 px-4 pb-4 pt-1">
              {MORE_GROUPS.map((group)=>(
                <div key={group.title}>
                  <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">{group.title}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map(({ href, label, desc, Icon, exact })=>{
                      const active = exact ? pathname===href : pathname.startsWith(href);
                      return (
                        <Link key={href} href={href} onClick={onClose}
                          className={cn(
                            "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition active:scale-[0.98]",
                            active
                              ? "border-violet-500/25 bg-violet-500/10"
                              : "border-[var(--border-1)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                          )}>
                          <span className={cn(
                            "grid h-10 w-10 flex-none place-items-center rounded-xl border transition",
                            active ? "border-violet-400/30 bg-violet-500/15" : "border-[var(--border-1)] bg-[var(--surface-2)]"
                          )}>
                            <Icon size={18} className={active?"text-[var(--color-violet-300)]":"text-[var(--fg-tertiary)] group-hover:text-[var(--fg-secondary)]"}/>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-[13.5px] font-semibold",active?"text-[var(--color-violet-300)]":"text-[var(--fg-primary)]")}>{label}</span>
                            <span className="block truncate text-[11px] text-[var(--fg-muted)]">{desc}</span>
                          </span>
                          <IconChevR size={14} className="flex-none text-[var(--fg-subtle)]"/>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
