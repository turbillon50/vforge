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
    let checkingVersion = false;
    const versionKey = "vforge:deployment-version";

    // Si el SW nuevo toma control, recargamos una sola vez para servir fresco.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const promote = (sw: ServiceWorker | null) => {
      // Solo ofrecer "actualizar" si YA había un SW controlando (es update, no
      // primera instalación) y el nuevo terminó de instalar.
      if (sw && navigator.serviceWorker.controller) setWaiting(sw);
    };

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        reg = registration;
        void registration.update().catch(() => {});

        // Ya hay uno esperando de una visita anterior.
        if (registration.waiting) promote(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed")
              promote(registration.waiting || installing);
          });
        });
      })
      .catch(() => {
        /* offline shell no disponible */
      });

    // Una pestaña puede seguir viva entre deployments aunque el build nuevo ya
    // esté en producción. Comparamos el SHA servido por Vercel y recargamos una
    // sola vez cuando cambie, sin depender de recordar cambiar el SW a mano.
    const checkAppVersion = async () => {
      if (checkingVersion || reloading) return;
      checkingVersion = true;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { version?: string };
        const nextVersion = payload.version?.trim();
        if (!nextVersion || nextVersion === "development") return;

        const currentVersion = window.localStorage.getItem(versionKey);
        window.localStorage.setItem(versionKey, nextVersion);
        if (currentVersion && currentVersion !== nextVersion) {
          reloading = true;
          window.location.reload();
        }
      } catch {
        /* La app sigue funcionando aunque la revisión de versión falle. */
      } finally {
        checkingVersion = false;
      }
    };

    void checkAppVersion();
    const versionInterval = window.setInterval(
      () => void checkAppVersion(),
      60_000,
    );

    // Revisar updates cuando el usuario vuelve a la app (clave en móvil/PWA).
    const checkForUpdate = () => {
      if (document.visibilityState !== "visible") return;
      reg?.update().catch(() => {});
      void checkAppVersion();
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
      window.clearInterval(versionInterval);
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
      <div className="flex w-full max-w-sm items-center gap-3 border border-black bg-white px-4 py-3 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-black"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-black">
            Nueva versión disponible
          </p>
          <p className="truncate text-[11px] text-[var(--fg-muted)]">
            Actualiza para ver lo último de VForge.
          </p>
        </div>
        <button
          onClick={applyUpdate}
          className="shrink-0 border border-black bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition active:scale-95 hover:bg-[#2b2b2b]"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
