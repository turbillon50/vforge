"use client";
/**
 * Gate del portal en vivo cuando el usuario NO tiene acceso todavía.
 *
 * Si la URL trae `?invite=<token>`, intenta aceptar la invitación (POST a
 * /api/live/invitations/accept) y, si funciona, recarga para entrar. Si no hay
 * token o la invitación es inválida, muestra un mensaje neutro (opaco).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader, IconShield, IconCheck } from "@/components/brand/VFIcons";

type State = "idle" | "accepting" | "accepted" | "denied";

/** Lee ?invite=<token> del querystring sin useSearchParams (evita el requisito
 *  de Suspense en build). Solo corre en cliente. */
function readInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("invite");
}

export function LiveGate({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  const accept = useCallback(
    async (t: string) => {
      try {
        const res = await fetch(`/api/live/invitations/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        });
        if (res.ok) {
          setState("accepted");
          // Limpia el token de la URL y recarga con acceso ya concedido.
          router.replace(`/app/live/${encodeURIComponent(projectId)}`);
          router.refresh();
          return;
        }
      } catch {
        /* cae a denied */
      }
      setState("denied");
    },
    [projectId, router],
  );

  useEffect(() => {
    const token = readInviteToken();
    if (token) {
      setState("accepting");
      accept(token);
    } else {
      setState("denied");
    }
  }, [accept]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#03020a] px-6 text-center">
      {state === "idle" || state === "accepting" ? (
        <>
          <IconLoader size={24} className="animate-spin text-violet-400" />
          <p className="text-sm text-[var(--fg-secondary)]">
            Validando tu invitación…
          </p>
        </>
      ) : state === "accepted" ? (
        <>
          <IconCheck size={26} className="text-emerald-400" />
          <p className="text-sm text-[var(--fg-secondary)]">
            Invitación aceptada. Entrando…
          </p>
        </>
      ) : (
        <>
          <IconShield size={26} className="text-amber-400" />
          <p className="max-w-sm text-sm text-[var(--fg-secondary)]">
            No tienes acceso a este portal, o tu invitación ya no es válida.
            Pide al equipo de VForge un nuevo enlace.
          </p>
        </>
      )}
    </div>
  );
}
