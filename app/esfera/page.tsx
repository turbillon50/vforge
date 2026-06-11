import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { EsferaDashboard } from "@/components/forja/EsferaDashboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mi Esfera · VForge",
  description: "Estado de tu infraestructura y ahorro vs infra tradicional.",
};

export default async function EsferaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/esfera");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#03020a]">
      {/* Aura premium — un solo glow por zona */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-12%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-600/12 blur-[140px]" />
        <div className="absolute right-[-8%] top-[40%] h-[360px] w-[360px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
      </div>
      <EsferaDashboard />
    </div>
  );
}
