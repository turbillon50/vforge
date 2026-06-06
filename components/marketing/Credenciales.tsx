import Image from "next/image";

/**
 * Banda de credenciales / confianza.
 * Insignia oficial de Mercado Pago (Checkout Pro). Discreta y premium,
 * acorde al design-system: sin dorado salvo el propio del branding de MP.
 */
const CERT_CODE = "cert_3e7bf309614311f197f886b7d357c539";
const VERIFY_URL = "https://www.mercadopago.com.mx/developers/panel";

export function Credenciales() {
  return (
    <section
      id="credenciales"
      aria-label="Credenciales y certificaciones"
      className="border-b border-app bg-void py-16 md:py-20"
    >
      <div className="mx-auto max-w-container px-5 md:px-margin-desktop">
        <p className="label-caps mb-3 text-center text-cyber-cyan">Confianza verificada</p>
        <h2 className="text-center font-display text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
          Pagos certificados por{" "}
          <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
            Mercado Pago
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-on-surface-variant">
          Integración Checkout Pro auditada y aprobada. Desarrollador certificado por Mercado Pago.
        </p>

        <div className="mt-9 flex justify-center">
          <a
            href={VERIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`Verificar certificación · ${CERT_CODE}`}
            className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border border-app bg-surface/60 px-8 py-7 backdrop-blur-xl transition-colors hover:border-app-strong sm:flex-row sm:gap-6 sm:px-10"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-80 sm:left-[18%]"
            />
            <Image
              src="/badges/mp-checkout-pro.png"
              alt="Insignia oficial Mercado Pago Checkout Pro — desarrollador certificado"
              width={120}
              height={120}
              className="relative h-24 w-24 flex-none object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28"
            />
            <div className="relative text-center sm:text-left">
              <p className="font-display text-lg font-semibold text-on-surface">
                Checkout Pro · Certificado
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Desarrollador oficial de Mercado Pago
              </p>
              <p className="mt-2 font-mono text-[11px] tracking-wide text-muted">
                {CERT_CODE}
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
