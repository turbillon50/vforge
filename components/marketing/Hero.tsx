"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MessagesSquare, Sparkles } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export function Hero() {
  const t = useT();
  return (
    <section className="relative isolate overflow-hidden border-b border-app">
      {/* Atmospheric backdrop — una sola capa suave en lugar de tres */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-violet-aura opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[20%] h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-container px-5 pt-20 pb-24 sm:pt-24 md:px-margin-desktop md:pt-32 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          {/* Eyebrow */}
          <span className="chip mb-6 border-violet-500/30 bg-violet-500/[0.04] text-violet-200">
            <span className="relative inline-flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyber-cyan opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyber-cyan" />
            </span>
            {t.marketing.hero_eyebrow}
          </span>

          {/* V mark central — protagonista visual */}
          <div className="relative mb-6">
            <div className="absolute inset-0 -z-10 bg-violet-cyan opacity-30 blur-[60px]" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-cyan-400/20 backdrop-blur-sm md:h-24 md:w-24">
              <span className="font-display text-4xl font-bold tracking-tight md:text-5xl">
                <span className="bg-gradient-to-br from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                  V
                </span>
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-void ring-2 ring-success-emerald/30">
                <span className="h-2 w-2 rounded-full bg-success-emerald animate-pulse" />
              </span>
            </div>
          </div>

          {/* Headline dramático */}
          <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-[80px] md:leading-[0.95] max-w-5xl">
            {t.marketing.hero_title_a}{" "}
            <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {t.marketing.hero_title_b}
            </span>{" "}
            {t.marketing.hero_title_c}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant sm:text-base md:text-lg md:leading-relaxed">
            {t.marketing.hero_subtitle}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/app/chat"
              className="btn-primary group justify-center !px-6 !py-3 text-[14px]"
            >
              <MessagesSquare size={14} />
              Hablar con V
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/glossary"
              className="btn-ghost justify-center !px-6 !py-3 text-[14px]"
            >
              <Sparkles size={13} />
              {t.marketing.hero_cta_secondary}
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-6 max-w-full px-2 break-words text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
            {t.marketing.hero_trust}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
