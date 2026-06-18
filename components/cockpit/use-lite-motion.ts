"use client";

import { useEffect, useState } from "react";

/**
 * Modo "lite" de animaciones: true en viewport móvil (<=640px) o cuando el
 * usuario pidió reduce-motion. Los componentes del Taller usan esto para
 * APAGAR animaciones infinitas costosas (orbes girando, blur que respira,
 * partículas, pulsos) en celular, dejando el render estático y fluido.
 * En desktop devuelve false → estética completa intacta.
 * SSR-safe: arranca en false y se corrige al montar (sin mismatch de hidratación).
 */
export function useLiteMotion(): boolean {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqMobile = window.matchMedia("(max-width: 640px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setLite(mqMobile.matches || mqReduce.matches);
    update();
    mqMobile.addEventListener("change", update);
    mqReduce.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqReduce.removeEventListener("change", update);
    };
  }, []);
  return lite;
}
