"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";
import { IconHome, IconKey, IconRocket, IconCreditCard, IconUsers, IconCpu } from "@/components/brand/VFIcons";
import { ClientV } from "@/components/workspace/ClientV";

const NAV = [
  { href: "/workspace", label: "Inicio", Icon: IconHome },
  { href: "/workspace/apps", label: "Mis apps", Icon: IconRocket },
  { href: "/workspace/studio", label: "Estudio", Icon: IconCpu },
  { href: "/workspace/conexiones", label: "Conexiones", Icon: IconKey },
  { href: "/workspace/cobros", label: "Cobros", Icon: IconCreditCard },
  { href: "/workspace/perfil", label: "Perfil", Icon: IconUsers },
];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: "#070709" }}>
      {/* Ambiente cinematográfico */}
      <div className="vf-ambient" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.18] animate-[mesh_28s_linear_infinite]"
           style={{ backgroundImage: "radial-gradient(rgba(124,58,237,.9) 0.7px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="vf-grain" />

      {/* Sidebar */}
      <aside className="relative z-10 hidden h-dvh w-[264px] shrink-0 flex-col md:flex"
             style={{ borderRight: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(180deg,rgba(10,9,15,.92),rgba(7,7,9,.96))", backdropFilter: "blur(20px)" }}>
        <div className="px-6 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <Link href="/workspace" className="flex items-center gap-2"><VWordmark /></Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {NAV.map(({ href, label, Icon }) => {
            const isActive = href === "/workspace" ? pathname === "/workspace" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium transition-all duration-200 ${isActive ? "text-white" : "text-white/60 hover:text-white"}`}
                style={isActive ? { background: "linear-gradient(180deg,rgba(124,58,237,.20),rgba(124,58,237,.07))", border: "1px solid rgba(124,58,237,.34)", boxShadow: "0 10px 26px -14px rgba(124,58,237,.6), inset 0 1px 0 rgba(255,255,255,.1)" } : { border: "1px solid transparent" }}>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full" style={{ background: "#a855f7", boxShadow: "0 0 10px #a855f7" }} />}
                <Icon size={18} className="transition-transform group-hover:scale-110" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />online
          </span>
        </div>
      </aside>

      {/* Contenido */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center px-6"
                style={{ borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(7,7,9,.8)", backdropFilter: "blur(20px)" }}>
          <div className="md:hidden"><Link href="/workspace"><VWordmark /></Link></div>
          <div className="flex-1" />
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
      <ClientV />
    </div>
  );
}
