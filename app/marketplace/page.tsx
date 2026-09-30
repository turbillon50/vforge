import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketplacePage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] px-5 pb-24 pt-32 text-white">
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="mb-4 font-mono text-[12px] font-semibold uppercase tracking-[0.24em] text-[var(--fg-muted)]">
            Marketplace
          </p>
          <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-bold leading-tight tracking-[-0.04em] text-white">
            El marketplace abre pronto con apps propias de la fábrica.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] font-light leading-relaxed text-[var(--fg-subtle)]">
            Estamos preparando apps propias de la fábrica. Por ahora no mostramos
            proyectos de clientes ni inventamos productos que todavía no están listos.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#precios"
              className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
            >
              Ver precios
            </Link>
            <Link
              href="/developers"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/75 transition hover:text-white"
            >
              Ver MCP público
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
