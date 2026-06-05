import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PencilLine } from "lucide-react";
import WorkspaceShell from "@/components/userspace/WorkspaceShell";
import { getScope } from "@/lib/workspace/db";

export const metadata = { title: "Tu workspace — VForge" };
export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const row = await getScope(userId).catch(() => null);
  if (!row || !row.scope?.projectName) redirect("/workspace/setup");

  const user = await currentUser().catch(() => null);
  const firstName = user?.firstName ?? null;
  const scope = row.scope;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-void">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 35% at 15% 0%, rgba(139,92,246,0.1), transparent 60%), radial-gradient(40% 30% at 95% 5%, rgba(34,211,238,0.08), transparent 60%)",
        }}
      />

      <header className="relative z-10 px-4 pb-4 pt-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
            {scope.projectName}
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/35 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
            </span>
            En preparación — la construcción automatizada llega pronto
          </span>
          <Link
            href="/workspace/setup"
            className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border border-app bg-tint-1 px-4 text-sm text-on-surface transition hover:bg-tint-2"
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            Editar alcance
          </Link>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          {firstName ? `Hola, ${firstName}. ` : "Hola. "}
          Este es el plano de tu app y tu asistente para afinarlo.
        </p>
      </header>

      <WorkspaceShell scope={scope} />
    </main>
  );
}
