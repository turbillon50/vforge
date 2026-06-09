import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-void">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <article className="vf-legal text-on-surface-variant">{children}</article>
        <div className="mt-16 border-t border-app pt-8 text-[13px] text-muted">
          <Link href="/docs" className="mr-4 hover:text-on-surface">Docs</Link>
          <Link href="/terminos" className="mr-4 hover:text-on-surface">Terminos</Link>
          <Link href="/privacidad" className="mr-4 hover:text-on-surface">Privacidad</Link>
          <Link href="/support" className="hover:text-on-surface">Soporte</Link>
        </div>
      </main>
      <MarketingFooter />
      <style>{`
        .vf-legal h1 { font-size: 2rem; font-weight: 600; letter-spacing: -0.02em; color: var(--color-on-surface); margin-bottom: 0.5rem; }
        .vf-legal h2 { font-size: 1.15rem; font-weight: 600; color: var(--color-on-surface); margin-top: 2rem; margin-bottom: 0.5rem; }
        .vf-legal p { line-height: 1.7; margin: 0.75rem 0; }
        .vf-legal ul { margin: 0.75rem 0; padding-left: 1.25rem; list-style: disc; }
        .vf-legal li { margin: 0.4rem 0; line-height: 1.6; }
        .vf-legal a { color: var(--color-violet-400); }
        .vf-legal .eyebrow { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-violet-300); }
        .vf-legal .muted { color: var(--color-muted); font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
