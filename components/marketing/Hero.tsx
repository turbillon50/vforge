"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MessagesSquare, Sparkles } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export function Hero() {
  const t = useT();
  return (
    <section className="relative isolate flex min-h-[90vh] items-center overflow-hidden border-b border-app">
      <div className="absolute inset-0 -z-10">
        <motion.img
          src="/vforge-hero.webp"
          alt=""
          initial={{ scale: 1.14, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 6, ease: "easeOut" }}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/55 to-void" />
        <div className="absolute inset-0 bg-gradient-to-r from-void/95 via-void/45 to-void/70" />
      </div>

      <div className="relative mx-auto w-full max-w-container px-5 py-24 md:px-margin-desktop">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex max-w-3xl flex-col items-center text-center md:items-start md:text-left"
        >
          <span className="chip mb-6 border-violet-500/30 bg-violet-500/[0.06] text-violet-100">
            <span className="relative inline-flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyber-cyan opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyber-cyan" />
            </span>
            {t.marketing.hero_eyebrow}
          </span>

          <h1 className="font-display text-[40px] font-bold leading-[1.02] tracking-tight text-off-white text-balance sm:text-6xl md:text-[82px] md:leading-[0.95]">
            {t.marketing.hero_title_a}{" "}
            <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              {t.marketing.hero_title_b}
            </span>{" "}
            {t.marketing.hero_title_c}
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-on-surface-variant sm:text-lg">
            {t.marketing.hero_subtitle}
          </p>

          <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/app/chat" className="btn-primary group justify-center !px-7 !py-3.5 text-[15px]">
              <MessagesSquare size={15} />
              Hablar con V
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/glossary" className="btn-ghost justify-center !px-7 !py-3.5 text-[15px]">
              <Sparkles size={14} />
              {t.marketing.hero_cta_secondary}
            </Link>
          </div>

          <p className="mt-8 max-w-full break-words font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
            {t.marketing.hero_trust}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
