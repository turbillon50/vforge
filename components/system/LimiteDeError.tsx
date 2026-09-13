"use client";

import { Component, type ReactNode } from "react";

/**
 * Aísla una pieza accesoria para que su tronido no se lleve la app entera.
 *
 * Por qué existe: el banner de notificaciones del layout llama useAuth(). Si
 * una pantalla falla y el árbol se re-renderiza sin el provider de Clerk, ese
 * banner truena TAMBIÉN, y entonces el error escala hasta global-error: el
 * usuario pierde toda la aplicación por culpa de un adorno. Medido el 13-sep.
 *
 * Regla: todo lo que viva en el layout y no sea indispensable va envuelto aquí.
 * Si truena, desaparece en silencio (o muestra `respaldo`) y lo demás sigue.
 */
export class LimiteDeError extends Component<
  { children: ReactNode; respaldo?: ReactNode; nombre?: string },
  { trono: boolean }
> {
  state = { trono: false };

  static getDerivedStateFromError() {
    return { trono: true };
  }

  componentDidCatch(error: Error) {
    console.error("[pieza-aislada]", this.props.nombre ?? "sin-nombre", error?.message);
  }

  render() {
    if (this.state.trono) return this.props.respaldo ?? null;
    return this.props.children;
  }
}
