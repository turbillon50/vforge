"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { EnablePush } from "@/components/pwa/EnablePush";

const CLAVE_DESCARTE = "vforge_push_dismiss";
const CLAVE_VISITAS = "vforge_push_visitas";
/** MUST-500 §18: el aviso no aparece en la primera carga, solo después de
 *  varias pantallas dentro de la app. */
const VISITAS_MINIMAS = 3;

/**
 * Aviso para activar los avisos push del teléfono.
 *
 * NO flota: se pinta como una franja dentro del shell, debajo del encabezado.
 * Antes era `position: fixed` abajo a la derecha y tapaba el compositor del
 * Estudio, las tarjetas de Proyectos y el Tablero (MUST-500 §114). Al vivir en
 * el flujo ya no hay nada que compensar con safe-area: el pie del shell sigue
 * siendo el único dueño de `env(safe-area-inset-bottom)`.
 *
 * Al cerrarlo no vuelve: el descarte se guarda en localStorage, no en
 * sessionStorage (antes reaparecía en cada pestaña nueva).
 */
export function OwnerPushBanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname() ?? "";
  const enApp = pathname.startsWith("/app");

  const [descartado, setDescartado] = useState(true);
  const [suficientesVisitas, setSuficientesVisitas] = useState(false);
  const [soportado, setSoportado] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    // Sin soporte de push la franja no tendría botón: no se pinta (MUST-500 §269).
    setSoportado("serviceWorker" in navigator && "PushManager" in window);
    try {
      if (localStorage.getItem(CLAVE_DESCARTE) === "1") return;
    } catch {
      /* almacenamiento bloqueado: mejor no insistir */
      return;
    }
    setDescartado(false);
  }, []);

  // Cuenta pantallas vistas dentro de /app para no saltar en la primera carga.
  useEffect(() => {
    if (!enApp) return;
    try {
      const n = Number(localStorage.getItem(CLAVE_VISITAS) ?? "0") + 1;
      localStorage.setItem(CLAVE_VISITAS, String(n));
      setSuficientesVisitas(n >= VISITAS_MINIMAS);
    } catch {
      /* ignore */
    }
  }, [enApp, pathname]);

  useEffect(() => {
    if (!montado || !isLoaded || !isSignedIn || !soportado) return;
    // Si ya hay suscripción, no molestar.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setDescartado(true);
      })
      .catch(() => {});
  }, [montado, isLoaded, isSignedIn, soportado]);

  if (!montado || !isLoaded || !isSignedIn) return null;
  if (!enApp || !soportado || descartado || !suficientesVisitas) return null;

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-[var(--border-1)] bg-[#f7f7f5] px-page-sm py-2 md:px-page-md xl:px-page-lg"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">Avisos en el teléfono</p>
        <p className="truncate text-[12px] text-[var(--fg-muted)]">
          Mensajes de clientes y salas, al momento.
        </p>
      </div>
      <EnablePush compact />
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-[var(--border-1)] text-[16px] leading-none"
        aria-label="Cerrar aviso de notificaciones"
        onClick={() => {
          setDescartado(true);
          try {
            localStorage.setItem(CLAVE_DESCARTE, "1");
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
