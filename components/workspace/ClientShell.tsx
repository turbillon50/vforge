"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";
import { IconHome, IconKey, IconRocket, IconCreditCard, IconUsers, IconLayers } from "@/components/brand/VFIcons";
import { ClientV } from "@/components/workspace/ClientV";

const NAV = [
  { href: "/workspace", label: "Inicio", Icon: IconHome },
  { href: "/workspace/apps", label: "Mis apps", Icon: IconRocket },
  { href: "/configurador.html", label: "Configurador", Icon: IconLayers },
  { href: "/workspace#cobros", label: "Cobros", Icon: IconCreditCard },
  { href: "/workspace/conexiones", label: "Conexiones", Icon: IconKey },
  { href: "/workspace/perfil", label: "Perfil", Icon: IconUsers },
];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#0a0a0f]">
      {/* Mesh viva sutil premium */}
      <div className="absolute inset-0 bg-[radial-gradient(#7c3aed_0.8px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none animate-[mesh_25s_linear_infinite]" />

      <aside className="relative z-10 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-white/[0.08] md:flex bg-[#0a0a0f]/95 backdrop-blur-2xl">
        <div className="px-6 py-6 border-b border-white/[0.08]">
          <Link href="/workspace" className="flex items-center gap-2">
            <VWordmark />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const base = href.split("#")[0];
            const isActive = base === "/workspace" ? pathname === "/workspace" : pathname.startsWith(base);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium transition-all duration-200 ${isActive ? "bg-white/10 text-white shadow-inner" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon size={18} className="transition-transform group-hover:scale-110" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/[0.08]">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />online
          </span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="sticky top-0 z-50 h-14 border-b border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-2xl flex items-center px-6">
          <div className="md:hidden"><Link href="/workspace"><VWordmark /></Link></div>
          <div className="flex-1" />
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
      <ClientV />
    </div>
  );
}
