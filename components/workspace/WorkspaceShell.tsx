"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { VMark, VWordmark } from "@/components/brand/VMark";
import {
  IconChat, IconBranch, IconActivity, IconLayers, IconFile,
  IconSearch, IconSettings, IconHome, IconUsers, IconBell,
  IconChevR, IconLifeBuoy, IconRocket, IconGlobe, IconDatabase, IconCpu,
  IconZap,
} from "@/components/brand/VFIcons";
import { UserButton, useUser } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import { VPresence } from "@/components/brand/VPresence";
import { VOrb } from "./VOrb";
import { Icon3D } from "@/components/brand/Icon3D";
import { PageTransition } from "@/components/motion/PageTransition";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

function hasClerkPublishableKey(): boolean {
  return /^pk_(test|live)_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "");
}


const NAV = [
  { href:"/app/chat",        label:"Conversación",  Icon:IconChat,     kbd:"C" },
  { href:"/app/repovision",  label:"RepoVisión",    Icon:IconBranch,   kbd:"R" },
  { href:"/app/deployments", label:"Despliegues",   Icon:IconRocket,   kbd:"D" },
  { href:"/app/vulcano",       label:"Navegador",    Icon:IconGlobe,    kbd:"N" },
  { href:"/app/taller",      label:"Taller",        Icon:IconCpu,      kbd:"O" },
<<<<<<< Updated upstream
  { href:"/app/automatizaciones", label:"Automatización", Icon:IconRocket, kbd:"U" },
  { href:"/app/flujos",      label:"Flujos",        Icon:IconZap,      kbd:"F" },
  { href:"/app/crm",         label:"CRM",           Icon:IconUsers,    kbd:"M" },
=======
  { href:"/app/automatizaciones", label:"Automatización", Icon:IconActivity, kbd:"U" },
>>>>>>> Stashed changes
  { href:"/app/projects",    label:"Proyectos",     Icon:IconLayers,   kbd:"P" },
  { href:"/app/vault",       label:"Baul",          Icon:IconDatabase, kbd:"B" },
  { href:"/app/contracts",   label:"Contratos",     Icon:IconFile,     kbd:"T" },
  { href:"/app/activity",    label:"Actividad",     Icon:IconActivity, kbd:"A" },
];
const NAV_BTM = [
  { href:"/app/home",  label:"Inicio",   Icon:IconHome,  exact:true },
  { href:"/app/admin", label:"Usuarios", Icon:IconUsers },
];
const MOBILE = [
  { href:"/app/chat",        label:"Chat",      orb:true },
  { href:"/app/home",        label:"Inicio",    Icon:IconHome },
  { href:"/app/projects",    label:"Proyectos", Icon:IconLayers },
  { href:"/app/vulcano",      label:"Navegador", Icon:IconGlobe },
  { href:"/app/deployments", label:"Deploy",    Icon:IconRocket },
  { href:"/app/settings",    label:"Ajustes",   Icon:IconSettings },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#050509]">
      {/* Sidebar */}
      <aside className="hidden h-dvh w-[248px] shrink-0 flex-col border-r border-white/[0.05] bg-[#07070d]/90 backdrop-blur-2xl md:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/app"><VWordmark /></Link>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"/>online
          </span>
        </div>
        <div className="px-3 pb-3">
          <button className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3.5 py-2.5 text-[13px] text-white/25 transition hover:bg-white/[0.04]">
            <IconSearch size={14}/><span className="flex-1">Buscar</span>
            <kbd className="font-mono text-[10px] opacity-40">⌘K</kbd>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-2 no-scrollbar">
          <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">Workspace</p>
          {NAV.map(({ href, label, Icon, kbd }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "group relative mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                active ? "bg-violet-500/10 text-violet-200 ring-1 ring-violet-500/20" : "text-white/35 hover:bg-white/[0.04] hover:text-white/75"
              )}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-400 opacity-80"/>}
                <Icon size={15} className={active?"text-violet-400":"text-white/25 group-hover:text-white/55"}/>
                <span className="flex-1">{label}</span>
                <span className="hidden font-mono text-[9px] tracking-widest text-white/15 group-hover:inline">{kbd}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.05] p-3 space-y-0.5">
          {NAV_BTM.map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname===href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                active?"bg-violet-500/10 text-violet-200":"text-white/35 hover:bg-white/[0.04] hover:text-white/65"
              )}>
                <Icon size={14} className={active?"text-violet-400":"text-white/25"}/>{label}
              </Link>
            );
          })}
          <Link href="/app/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-white/35 transition hover:bg-white/[0.04] hover:text-white/65">
            <IconSettings size={14} className="text-white/25"/>Configuración
          </Link>
          <a href="#" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-white/35 transition hover:bg-white/[0.04] hover:text-white/65">
            <IconLifeBuoy size={14} className="text-white/25"/>Ayuda
          </a>
        </div>
      </aside>
      {/* Main */}
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar hiddenOnMobile={pathname.startsWith("/app/chat")||pathname.startsWith("/forge")||pathname.startsWith("/v")} pathname={pathname}/>
        <div data-app-scroll className={cn(
          "flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden",
          (pathname.startsWith("/app/chat")||pathname.startsWith("/forge")||pathname.startsWith("/v"))?"overflow-y-hidden":"overflow-y-auto flex flex-col"
        )}>
          {pathname.startsWith("/app/chat")?children:<PageTransition>{children}</PageTransition>}
        </div>
        <MobileNav pathname={pathname}/>
        <VOrb/>
      </div>
    </div>
  );
}

function TopBar({ hiddenOnMobile, pathname }: { hiddenOnMobile?:boolean; pathname:string }) {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <header className={cn("sticky top-0 z-30 border-b border-white/[0.05] bg-[#07070d]/85 backdrop-blur-2xl",hiddenOnMobile&&"hidden md:block")}
      style={{ paddingTop:"env(safe-area-inset-top,0px)" }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-white/60 transition active:scale-95 md:hidden">
          <VMark size={18}/><span className="font-display text-sm font-semibold text-white/80">VForge</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block"><Breadcrumbs pathname={pathname}/></div>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 font-mono text-[11px] text-white/35 transition hover:border-violet-500/25 hover:text-violet-300 sm:inline-flex">
            <IconHome size={11}/> Landing
          </Link>
          <LocaleToggle compact/>
          <ThemeToggle compact/>
          <button aria-label="Notificaciones" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-white/35 transition hover:text-white/65">
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
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] py-1 pl-1 pr-2.5">
      <UserButton afterSignOutUrl="/" appearance={{...ca,elements:{...ca.elements,avatarBox:"h-6 w-6"}}}/>
      <span className="hidden max-w-[90px] truncate font-display text-[12px] font-medium text-white/60 md:inline">
        {user?.firstName??user?.username??""}
      </span>
      <span className="hidden rounded-full border border-violet-500/20 bg-violet-500/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-violet-300 md:inline">Owner</span>
    </div>
  );
}

function ClerkOfflineUser() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
      <span className="hidden max-w-[90px] truncate font-display text-[12px] font-medium text-white/60 md:inline">
        Luis
      </span>
      <span className="hidden rounded-full border border-violet-500/20 bg-violet-500/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-violet-300 md:inline">Owner</span>
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
            <span className={isLast?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-semibold text-transparent":"text-white/20"}>{p}</span>
            {!isLast&&<IconChevR size={9} className="text-white/12"/>}
          </span>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname:string }) {
  return (
    <nav data-vorb-avoid className="flex flex-none items-stretch justify-between gap-0.5 border-t border-white/[0.05] bg-[#07070d]/90 px-2 backdrop-blur-2xl md:hidden"
      style={{ paddingBottom:"max(env(safe-area-inset-bottom,0px),12px)", minHeight:58 }}>
      {MOBILE.map(item=>{
        const active=pathname.startsWith(item.href);
        if(item.orb) return (
          <Link key={item.href} href={item.href} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-violet-300":"text-white/35")}>
            <VPresence size={25} breathing={active}/>
            <span className={cn("font-mono text-[9px] uppercase tracking-widest",active?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>{item.label}</span>
          </Link>
        );
        if("Icon" in item && item.Icon) {
          const Icon = item.Icon;
          return (
            <Link key={item.href} href={item.href} className={cn("group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-violet-300":"text-white/35")}>
              {active&&<motion.span aria-hidden layoutId="vf-mob-halo" transition={{type:"spring",stiffness:380,damping:32}}
                className="pointer-events-none absolute inset-x-2 -bottom-0.5 top-1 -z-10 rounded-xl"
                style={{background:"radial-gradient(ellipse,rgba(139,92,246,0.4),transparent 70%)",filter:"blur(8px)"}}/>}
              <motion.span className="inline-flex" animate={active?{scale:[1,1.08,1]}:{scale:1}} transition={active?{duration:2.4,repeat:Infinity,ease:"easeInOut"}:{duration:0.18}}>
                <Icon size={24} className={cn("transition",active?"text-violet-300":"text-white/35 group-hover:text-white/65")}/>
              </motion.span>
              <span className={cn("font-mono text-[9px] uppercase tracking-widest",active?"bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text font-bold text-transparent":"")}>{item.label}</span>
            </Link>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={cn("group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95",active?"text-violet-300":"text-white/35")}>
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
    </nav>
  );
}
