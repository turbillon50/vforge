"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { EnablePush } from "@/components/pwa/EnablePush";

/**
 * Banner flotante para activar push cuando hay sesión.
 * Solo se muestra en rutas /app* y si aún no está suscrito.
 */
export function OwnerPushBanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem("vforge_push_dismiss") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    setDismissed(false);
  }, []);

  useEffect(() => {
    if (!mounted || !isLoaded || !isSignedIn) return;
    if (typeof window === "undefined") return;
    if (!window.location.pathname.startsWith("/app")) {
      setDismissed(true);
      return;
    }
    // Si ya hay suscripción, no molestar
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setDismissed(true);
      })
      .catch(() => {});
  }, [mounted, isLoaded, isSignedIn]);

  if (!mounted || !isLoaded || !isSignedIn || dismissed) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-3 z-40 w-[min(100%-1.5rem,320px)] rounded-2xl border border-black bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium">Avisos en el teléfono</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--fg-muted)]">
            Te avisamos cuando un cliente escribe en la sala o en el link público.
          </p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border-1)] text-[12px]"
          aria-label="Cerrar"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem("vforge_push_dismiss", "1");
            } catch {
              /* ignore */
            }
          }}
        >
          ×
        </button>
      </div>
      <EnablePush compact />
    </div>
  );
}
