"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  IconRocket,
  IconShield,
  IconActivity,
  IconGlobe,
  IconLayers,
  IconUsers,
} from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Product {
  id: string;
  category: string;
  name: string;
  tagline: string;
  desc: string;
  accent: string;
  tags: string[];
  Icon: React.ComponentType<{ size?: number }>;
  stat: string;
  statLabel: string;
}

const PRODUCTS: Product[] = [
  {
    id: "delivery",
    category: "Delivery & Logística",
    name: "Pedidos en línea",
    tagline: "Agua, comida, servicios. Tuyo en 30 minutos.",
    desc: "App de pedidos con seguimiento GPS, historial, pagos integrados y WhatsApp automático al confirmar.",
    accent: "#22d3ee",
    tags: ["PWA", "GPS", "WhatsApp", "Stripe"],
    Icon: IconRocket,
    stat: "< 30s",
    statLabel: "confirmar pedido",
  },
  {
    id: "clinica",
    category: "Salud & Clínicas",
    name: "Sistema clínico",
    tagline: "Expedientes, citas y pagos en un solo lugar.",
    desc: "Gestión de pacientes, agenda inteligente, historial médico cifrado y cobros con facturación automática.",
    accent: "#4ade80",
    tags: ["Neon", "Clerk", "Resend", "Stripe"],
    Icon: IconShield,
    stat: "100%",
    statLabel: "datos cifrados",
  },
  {
    id: "mlm",
    category: "MLM & Redes de distribución",
    name: "Plataforma MLM",
    tagline: "Comisiones automáticas. Red que crece sola.",
    desc: "Árbol de afiliados multinivel, cálculo de comisiones en tiempo real, tienda y panel de distribuidor.",
    accent: "#a78bfa",
    tags: ["Multi-nivel", "Dashboard", "PWA", "Pagos"],
    Icon: IconUsers,
    stat: "N niveles",
    statLabel: "comisiones auto",
  },
  {
    id: "fintech",
    category: "Fintech & Créditos",
    name: "App de créditos",
    tagline: "Solicita, aprueba y cobra en minutos.",
    desc: "Solicitud digital, scoring automático, firmas electrónicas y cobranza con recordatorios por WhatsApp.",
    accent: "#fbbf24",
    tags: ["DocuSign", "WhatsApp", "Neon", "PDF"],
    Icon: IconActivity,
    stat: "< 5 min",
    statLabel: "crédito aprobado",
  },
  {
    id: "servicios",
    category: "Servicios a Domicilio",
    name: "App de servicios",
    tagline: "Agenda, asigna y cobra sin papel.",
    desc: "Calendario de órdenes, asignación de técnicos, bitácora fotográfica de obra y cobro en sitio con QR.",
    accent: "#fb923c",
    tags: ["Maps", "Calendario", "Fotos", "QR"],
    Icon: IconGlobe,
    stat: "0 papel",
    statLabel: "operación digital",
  },
  {
    id: "saas",
    category: "SaaS & Empresarial",
    name: "CRM & Dashboard",
    tagline: "Tu empresa vista desde un solo panel.",
    desc: "Pipeline de ventas, reportes en vivo, roles y permisos por equipo, integraciones con tu stack existente.",
    accent: "#60a5fa",
    tags: ["Multi-rol", "APIs", "Reportes", "SSO"],
    Icon: IconLayers,
    stat: "∞",
    statLabel: "integraciones",
  },
];

export function ProductCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [active, setActive] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      id="productos"
      className="relative overflow-hidden border-b border-app py-16 md:py-20"
      style={{ background: "rgb(var(--color-void))" }}
    >
      {/* Glow ambiental único por sección */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.22) 0%, rgba(34,211,238,0.08) 60%, transparent 80%)",
          filter: "blur(72px)",
        }}
      />

      <div className="mx-auto max-w-container px-5 md:px-margin-desktop">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: EASE as unknown as number[] }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-xl">
            <p className="label-caps mb-3 text-cyber-cyan">Lo que construye VForge</p>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-4xl">
              Productos reales.{" "}
              <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Negocios que funcionan.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
            Desde apps de delivery hasta plataformas MLM. VForge construye lo que tu
            negocio necesita, con código real y deploy a producción.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Fade edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[rgb(var(--color-void))] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[rgb(var(--color-void))] to-transparent"
          />

          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto pb-3 pt-1"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {PRODUCTS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.08 + i * 0.07, ease: EASE as unknown as number[] }}
                onClick={() => setActive(active === p.id ? null : p.id)}
                className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-app bg-ink transition-all duration-300"
                style={{
                  width: "clamp(260px, 30vw, 310px)",
                  scrollSnapAlign: "start",
                  borderColor: active === p.id ? `${p.accent}55` : undefined,
                  boxShadow: active === p.id ? `0 0 40px ${p.accent}18` : undefined,
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Top accent line */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px opacity-60 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
                  }}
                />

                {/* Ambient glow */}
                <div
                  aria-hidden
                  className="absolute -top-8 right-4 h-28 w-28 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle, ${p.accent}25, transparent 70%)`,
                    filter: "blur(20px)",
                  }}
                />

                <div className="relative p-6">
                  {/* Icon + stat */}
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl border transition-all group-hover:scale-110"
                      style={{
                        borderColor: `${p.accent}40`,
                        background: `${p.accent}15`,
                        color: p.accent,
                      }}
                    >
                      <p.Icon size={20} />
                    </div>
                    <div className="text-right">
                      <p
                        className="font-mono text-lg font-bold leading-none"
                        style={{ color: p.accent }}
                      >
                        {p.stat}
                      </p>
                      <p className="mt-0.5 text-[10px] text-on-surface-variant">
                        {p.statLabel}
                      </p>
                    </div>
                  </div>

                  {/* Category badge */}
                  <p
                    className="mt-4 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: p.accent }}
                  >
                    {p.category}
                  </p>

                  {/* Name */}
                  <h3 className="mt-1 text-base font-semibold text-on-surface">
                    {p.name}
                  </h3>
                  <p className="mt-0.5 text-[13px] font-medium text-on-surface-variant">
                    {p.tagline}
                  </p>

                  {/* Desc */}
                  <p className="mt-3 text-[12px] leading-relaxed text-on-surface-variant opacity-75">
                    {p.desc}
                  </p>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] text-on-surface-variant"
                        style={{
                          borderColor: `${p.accent}30`,
                          background: `${p.accent}0d`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expandable CTA */}
                <div
                  className="overflow-hidden border-t border-app px-6 transition-all duration-300"
                  style={{
                    maxHeight: active === p.id ? "56px" : "0px",
                    opacity: active === p.id ? 1 : 0,
                  }}
                >
                  <div className="flex items-center justify-between py-3">
                    <span className="text-[11px] text-on-surface-variant">
                      ¿Te interesa este tipo de app?
                    </span>
                    <a
                      href="/sign-up"
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
                      style={{ background: `${p.accent}22`, color: p.accent }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Empezar →
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scroll dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {PRODUCTS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                const track = trackRef.current;
                if (!track) return;
                const cardW = track.scrollWidth / PRODUCTS.length;
                track.scrollTo({ left: cardW * i, behavior: "smooth" });
              }}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: active === p.id ? "24px" : "6px",
                background:
                  active === p.id ? p.accent : "rgba(255,255,255,0.18)",
              }}
              aria-label={`Ver ${p.name}`}
            />
          ))}
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6, ease: EASE as unknown as number[] }}
          className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-app bg-app md:grid-cols-4"
        >
          {[
            { n: "70+", l: "apps desplegadas" },
            { n: "< 7d", l: "tiempo promedio" },
            { n: "100%", l: "código es tuyo" },
            { n: "24/7", l: "V monitoreando" },
          ].map((s) => (
            <div key={s.l} className="bg-void px-6 py-5 text-center">
              <p className="font-mono text-2xl font-bold text-on-surface">{s.n}</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
