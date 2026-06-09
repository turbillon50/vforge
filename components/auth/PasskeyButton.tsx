"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { IconFingerprint, IconLoader } from "@/components/brand/VFIcons";

/**
 * Inicio de sesion con passkey (Face ID / Touch ID / Windows Hello).
 * Usa el flujo "discoverable" de Clerk: el usuario no escribe email,
 * el dispositivo ofrece sus passkeys guardadas. Si Clerk no tiene
 * passkeys habilitadas o el navegador no soporta, el boton avisa.
 */
export function PasskeyButton({ redirectUrl = "/app" }: { redirectUrl?: string }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPasskey() {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signIn.authenticateWithPasskey({ flow: "discoverable" });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
      } else {
        setError("No se pudo completar. Intenta con otro método.");
        setLoading(false);
      }
    } catch {
      setError("Tu dispositivo o cuenta aún no tiene una passkey lista.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onPasskey}
        disabled={loading || !isLoaded}
        className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 text-sm font-medium text-violet-100 transition active:scale-[0.98] hover:border-violet-400/70 hover:bg-violet-500/20 disabled:opacity-60"
      >
        {loading ? (
          <IconLoader size={16} className="animate-spin" />
        ) : (
          <IconFingerprint size={16} className="text-cyan-300 transition group-hover:scale-110" />
        )}
        {loading ? "Verificando…" : "Continuar con passkey"}
      </button>
      {error && <p className="mt-2 text-center text-[12px] text-amber-300/90">{error}</p>}
    </div>
  );
}
