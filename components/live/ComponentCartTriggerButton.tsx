"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { IconLayers } from "@/components/brand/VFIcons";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Disparador del carrito de componentes — la única pieza a color de la
 * barra de la sala (el resto de VForge es blanco/negro). Mismo efecto
 * "cristal/agua" del preset craft de catalogo-compoentes: barrido de luz
 * + glow al hover, onda líquida al click. Portado aquí a mano porque
 * catalogo-compoentes todavía no es un paquete npm instalable.
 */
export function ComponentCartTriggerButton({
  onClick,
  active,
}: {
  onClick: () => void;
  active: boolean;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-md border px-2.5 py-2 font-mono text-[8px] uppercase tracking-[0.1em] transition-all duration-300",
        active
          ? "border-violet-600 bg-violet-600 text-white shadow-[0_0_20px_-2px_rgba(124,58,237,0.55)]"
          : "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:shadow-[0_0_20px_-4px_rgba(124,58,237,0.45)]",
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100" />
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            background: "radial-gradient(circle, rgba(124,58,237,0.65) 0%, transparent 70%)",
            transform: "translate(-50%, -50%)",
            animation: "vf-cart-ripple 700ms ease-out forwards",
          }}
        />
      ))}
      <IconLayers size={11} className="relative" />
      <span className="relative">Carrito</span>
      <style jsx>{`
        @keyframes vf-cart-ripple {
          to {
            width: 220px;
            height: 220px;
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}
