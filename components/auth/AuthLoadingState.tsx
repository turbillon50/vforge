"use client";

import { useEffect, useState } from "react";

export function AuthLoadingState({ mode = "login" }: { mode?: "login" | "register" }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 9000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="auth-loading" role="status" aria-live="polite" aria-label="Conectando con autenticación segura">
      <div className="auth-loading-mark" aria-hidden="true">
        <span className="auth-loading-spin" />
        <svg viewBox="0 0 16 14" width="18" height="16" fill="currentColor"><path d="M0 0h16L8 14z" /></svg>
      </div>
      <p className="auth-loading-heading">{mode === "login" ? "Preparando tu acceso" : "Preparando tu cuenta"}</p>
      <p className="auth-loading-sub">Estableciendo una conexión segura con VForge.</p>
      <div className="auth-loading-fields" aria-hidden="true">
        <div><span className="auth-loading-label" /><span className="auth-loading-input" /></div>
        <div><span className="auth-loading-label short" /><span className="auth-loading-input" /></div>
        <span className="auth-loading-cta" />
      </div>
      {slow && (
        <div className="auth-loading-recovery">
          <p>El proveedor de acceso está tardando más de lo habitual.</p>
          <button type="button" onClick={() => window.location.reload()}>Reintentar conexión</button>
        </div>
      )}
    </div>
  );
}
