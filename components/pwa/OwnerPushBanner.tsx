"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { EnablePush } from "@/components/pwa/EnablePush";

/**
 * Banner flotante para activar push cuando hay sesión.
 * Solo se muestra en rutas /app* y si aún no está suscrito.
 */
export function OwnerPushBanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname() ?? "";
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
    <div
      className={`fixed right-2 z-40 flex w-[calc(100%-1rem)] max-w-[360px] items-center gap-2 rounded-xl border border-black bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)] sm:right-4 sm:w-auto sm:min-w-[320px] ${
        pathname === "/app/chat"
          ? "bottom-[calc(8rem+env(safe-area-inset-bottom,0px))] md:bottom-14"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      }`}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium">Avisos en el teléfono</p>
        <p className="hidden text-[9px] leading-4 text-[var(--fg-muted)] sm:block">
          Mensajes de clientes y salas, al momento.
        </p>
      </div>
      <EnablePush compact />
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border-1)] text-[12px]"
        aria-label="Cerrar avisos"
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
  );
}
