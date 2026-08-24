"use client";

/**
 * Setup es recomendado, no obligatorio.
 * El usuario elige cuándo conectar desde /app/setup o Conexiones.
 * Antes el gate forzaba setup y rompía el recorrido (landing → producto).
 */
export function ConnectionGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function markSetupSkipped() {
  try {
    localStorage.setItem("vforge.setupSkipped", "1");
  } catch {
    /* ok */
  }
}

export function clearSetupSkipped() {
  try {
    localStorage.removeItem("vforge.setupSkipped");
  } catch {
    /* ok */
  }
}
