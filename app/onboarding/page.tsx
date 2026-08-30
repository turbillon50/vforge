"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { VWordmark } from "@/components/brand/VMark";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import {
  IconArrowR,
  IconCheck,
  IconGithub,
  IconLoader,
  IconRocket,
} from "@/components/brand/VFIcons";

type Connection = "github" | "vercel";

export default function OnboardingPage() {
  if (!hasClerkPublishableKey()) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white px-5 text-center text-black">
        <div className="max-w-sm">
          <VWordmark className="justify-center" />
          <p className="mt-6 text-[13px] leading-6 text-[var(--fg-muted)]">
            El acceso se habilitará cuando Clerk esté configurado en este entorno.
          </p>
        </div>
      </main>
    );
  }

  return <OnboardingWithClerk />;
}

function OnboardingWithClerk() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [connected, setConnected] = useState<Connection[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding/status", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { connected?: string[] };
      const next = (payload.connected ?? []).filter(
        (item): item is Connection => item === "github" || item === "vercel",
      );
      setConnected(next);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) void loadStatus();
  }, [isSignedIn, loadStatus]);

  async function enterWorkspace() {
    if (finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const response = await fetch("/api/user/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.fullName ?? user?.firstName ?? "",
          services: connected.length,
        }),
      });
      if (!response.ok) throw new Error("No pudimos guardar tu configuración.");
      router.push("/workspace");
      router.refresh();
    } catch (error) {
      setFinishError(
        error instanceof Error
          ? error.message
          : "No pudimos abrir tu espacio. Intenta otra vez.",
      );
      setFinishing(false);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white text-black">
        <IconLoader size={18} className="animate-spin" />
      </div>
    );
  }

  const items: {
    id: Connection;
    title: string;
    body: string;
    href: string;
    icon: typeof IconGithub;
  }[] = [
    {
      id: "github",
      title: "GitHub",
      body: "Conecta tu cuenta o crea una nueva. Quedará vinculada sólo a tu usuario.",
      href: "/api/auth/github/start?return_to=%2Fonboarding",
      icon: IconGithub,
    },
    {
      id: "vercel",
      title: "Vercel",
      body: "Conecta tu cuenta o crea una nueva. Quedará vinculada sólo a tu usuario.",
      href: "/api/auth/vercel/start?return_to=%2Fonboarding",
      icon: IconRocket,
    },
  ];

  return (
    <main className="min-h-dvh bg-[#f7f7f5] px-5 py-8 text-black sm:px-8">
      <div className="mx-auto max-w-[980px]">
        <header className="flex items-center justify-between border-b border-[var(--border-1)] pb-6">
          <VWordmark />
          <button
            type="button"
            onClick={enterWorkspace}
            disabled={finishing}
            className="text-[12px] font-medium text-[var(--fg-muted)] hover:text-black disabled:opacity-50"
          >
            Entrar sin conectar
          </button>
        </header>

        <section className="grid gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-24">
          <div>
            <p className="mono-label">Preparar VForge</p>
            <h1 className="mt-5 text-[clamp(3rem,7vw,6rem)] font-semibold leading-[0.9] tracking-[-0.07em]">
              Conecta lo que alimentará tus salas.
            </h1>
            <p className="mt-7 max-w-lg text-[17px] leading-7">
              No estamos configurando una fábrica completa. Sólo las dos fuentes
              necesarias para ver proyectos y previews reales desde el inicio.
            </p>
          </div>

          <div className="border border-black bg-white">
            <div className="border-b border-[var(--border-1)] px-5 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Conexiones opcionales
              </p>
            </div>

            {items.map(({ id, title, body, href, icon: Icon }) => {
              const isConnected = connected.includes(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-4 border-b border-[var(--border-1)] px-5 py-5 last:border-b-0"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center border border-black">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-black">{title}</p>
                    <p className="mt-1 text-[12px] leading-5">{body}</p>
                  </div>
                  {loadingStatus ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : isConnected ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em]">
                      <IconCheck size={12} /> Conectado
                    </span>
                  ) : (
                    <a
                      href={href}
                      className="btn-ghost !min-h-10 !px-3 text-center !leading-4"
                    >
                      Conectar o crear cuenta
                    </a>
                  )}
                </div>
              );
            })}

            <div className="p-5">
              <button
                type="button"
                onClick={enterWorkspace}
                disabled={finishing}
                className="btn-primary w-full !min-h-12 disabled:opacity-50"
              >
                {finishing ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <>
                    Abrir mis proyectos <IconArrowR size={14} />
                  </>
                )}
              </button>
              {finishError ? (
                <p role="alert" className="mt-3 text-[12px] leading-5 text-black">
                  {finishError}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
