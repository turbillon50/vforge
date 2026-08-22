import { IconFingerprint } from "@/components/brand/VFIcons";

export function ClerkPlaceholder({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="w-full border border-black bg-white p-6">
      <span className="grid h-10 w-10 place-items-center border border-black">
        <IconFingerprint size={16} />
      </span>
      <h3 className="mt-6 text-[18px] font-medium tracking-[-0.035em]">
        Acceso no disponible en esta compilación
      </h3>
      <p className="mt-3 text-[12px] leading-5 text-[var(--fg-muted)]">
        {mode === "sign-in"
          ? "El formulario real aparece cuando Clerk está configurado. Esta vista local no simula una sesión ni permite saltarse la autenticación."
          : "El registro real aparece cuando Clerk está configurado. Esta vista local no crea cuentas de demostración."}
      </p>
      <p className="mt-6 border-t border-[var(--border-1)] pt-4 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--fg-muted)]">
        Autenticación real · sin formulario de muestra
      </p>
    </div>
  );
}
