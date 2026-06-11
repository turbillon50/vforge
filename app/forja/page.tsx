import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ForjaWizard } from "@/components/forja/ForjaWizard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Forja tu Esfera · VForge",
  description: "Conecta tu propia infraestructura y enciende tu esfera.",
};

export default async function ForjaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/forja");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#03020a]">
      {/* Aura premium */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/12 blur-[130px]" />
        <div className="absolute left-1/2 top-[35%] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-[110px]" />
      </div>
      <ForjaWizard />
    </div>
  );
}
