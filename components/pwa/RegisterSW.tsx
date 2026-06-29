"use client";

import { useEffect, useState } from "react";

/**
 * Registra el service worker y vigila actualizaciones.
 * Cuando hay una versión nueva esperando, muestra un toast on-brand
 * "Nueva versión disponible" → al tocar "Actualizar" activa el SW nuevo
 * y recarga. Así los celulares (Luis + clientes) reciben updates sin
 * desinstalar la PWA, para siempre.
 */
export function RegisterSW() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    let reloading = false;

    // Si el SW nuevo toma control, recargamos una sola vez para servir fresco.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const promote = (sw: ServiceWorker | null) => {
      // Solo ofrecer "actualizar" si YA había un SW controlando (es update, no
      // primera instalación) y el nuevo terminó de instalar.
      if (sw && navigator.serviceWorker.controller) setWaiting(sw);
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;

        // Ya hay uno esperando de una visita anterior.
        if (registration.waiting) promote(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") promote(registration.waiting || installing);
          });
        });
      })
      .catch(() => {
        /* offline shell no disponible */
      });

    // Revisar updates cuando el usuario vuelve a la app (clave en móvil/PWA).
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  function applyUpdate() {
    if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  }

  if (!waiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom,0px),0px)" }}
      className="fixed inset-x-0 bottom-0 z-[200] flex justify-center px-3 pb-3"
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-violet-400/25 bg-[#06040f]/90 px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(124,58,237,0.18)] backdrop-blur-2xl">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: "radial-gradient(circle,#8b5cf6,#7c3aed)",
            boxShadow: "0 0 10px rgba(34,211,238,0.6)",
            animation: "swPulse 1.6s ease-in-out infinite",
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white">Nueva versión disponible</p>
          <p className="truncate text-[11px] text-[var(--fg-tertiary)]">Actualiza para ver lo último de VForge.</p>
        </div>
        <button
          onClick={applyUpdate}
          className="shrink-0 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600/40 to-violet-500/25 px-3.5 py-2 text-[12px] font-semibold text-white transition active:scale-95 hover:from-violet-600/55 hover:to-violet-500/35"
        >
          Actualizar
        </button>
      </div>
      <style>{`@keyframes swPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}`}</style>
    </div>
  );
}
