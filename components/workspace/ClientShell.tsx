"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";
import { IconHome, IconKey, IconRocket, IconCreditCard, IconUsers } from "@/components/brand/VFIcons";
import { ClientV } from "@/components/workspace/ClientV";

const NAV = [
  { href: "/workspace", label: "Inicio", Icon: IconHome },
  { href: "/workspace/apps", label: "Mis apps", Icon: IconRocket },
  { href: "/workspace#cobros", label: "Cobros", Icon: IconCreditCard },
  { href: "/workspace/conexiones", label: "Conexiones", Icon: IconKey },
  { href: "/workspace/perfil", label: "Perfil", Icon: IconUsers },
];

/**
 * Shell premium del CLIENTE — mismo look que el de owner pero con navegación
 * propia y solo páginas aisladas por tenant (su bóveda, su motor). No expone /app.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: "#0a0810" }}>
      <div className="vibe-mesh" />
      <aside className="relative z-10 hidden h-dvh w-[230px] shrink-0 flex-col md:flex" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-5">
          <Link href="/workspace"><VWordmark /></Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, Icon }) => {
            const on = pathname === href || (href !== "/workspace" && pathname.startsWith(href.split("#")[0] + "/"));
            return (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors"
                style={{ color: on ? "#fff" : "rgba(255,255,255,0.6)", background: on ? "rgba(255,255,255,0.05)" : "transparent" }}>
                <Icon size={15} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4">
          <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }} />online
          </span>
        </div>
      </aside>
      <div className="relative z-10 flex h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)" }}>
          <div className="md:hidden"><Link href="/workspace"><VWordmark /></Link></div>
          <div className="ml-auto flex items-center gap-3">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <ClientV />
    </div>
  );
}
