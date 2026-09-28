"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { IconArrowR, IconShield, IconSparkles as _IconSparkles, IconZap as _IconZap, IconBrain as _IconBrain, IconGlobe as _IconGlobe, IconCreditCard as _IconCreditCard, IconChat as _IconChat } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

type Category = "todo" | "apps" | "integraciones" | "llms" | "templates";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "apps", label: "Apps" },
  { id: "integraciones", label: "Integraciones" },
  { id: "llms", label: "LLMs" },
  { id: "templates", label: "Plantillas" },
];

const HF_SPHERE = "/marketplace/6901e1f6e2.jpg";

const ITEMS = [
  // APPS
  { id: "apsus", cat: "apps", name: "APSUS", sub: "Plataforma fintech completa", icon: "💸", color: "#7c3aed", price: "Incluido en Forge", status: "live", img: "/marketplace/12a5602c5b.jpg", desc: "Créditos, facturas, movimientos y perfilamiento crediticio. Listo para desplegar con Clerk + Neon." },
  { id: "csn", cat: "apps", name: "CSN Carnes", sub: "Red de sucursales e-commerce", icon: "🥩", color: "#dc2626", price: "Incluido en Forge", status: "live", img: "/marketplace/1fd124d333.jpg", desc: "App para redes de tiendas. Administración multi-sucursal, catálogo dinámico y dashboard de ventas." },
  { id: "mt", cat: "apps", name: "MT Empresarial", sub: "Traslados ejecutivos PWA", icon: "🚗", color: "#0891b2", price: "Incluido en Forge", status: "live", img: "/marketplace/3065cbab8e.jpg", desc: "Gestión de flotas, reservas y panel de conductores. GPS + notificaciones push incluidas." },
  { id: "rideme", cat: "apps", name: "RideMe", sub: "Réplica InDriver para LATAM", icon: "🛺", color: "#059669", price: "Próximamente", status: "soon", img: "/marketplace/6cb8a5afe1.jpg", desc: "Plataforma de movilidad con modelo de subasta de precio. Administración, conductor y pasajero." },
  // INTEGRACIONES
  { id: "clerk", cat: "integraciones", name: "Clerk Auth", sub: "Autenticación lista para producción", icon: "🔐", color: "#6d28d9", price: "Gratis", status: "live", img: null, desc: "Configuración completa: pk_live_, webhooks y sincronización de usuarios con Neon. V lo configura sola." },
  { id: "neon", cat: "integraciones", name: "Neon Postgres", sub: "Base de datos serverless", icon: "🐘", color: "#00e599", price: "Gratis", status: "live", img: null, desc: "Ramas de base de datos por función, migraciones automáticas e integración con Vercel en un clic." },
  { id: "stripe", cat: "integraciones", name: "Stripe Payments", sub: "Pagos + suscripciones", icon: "💳", color: "#635bff", price: "Gratis", status: "live", img: null, desc: "Checkout, webhooks, portal de facturación y prueba de planes. V inyecta las claves sola." },
  { id: "mp", cat: "integraciones", name: "Mercado Pago", sub: "Pagos LATAM nativos", icon: "🟡", color: "#009ee3", price: "Gratis", status: "live", img: null, desc: "Checkout Pro, suscripciones y notificaciones. Ideal para México, Argentina y Brasil." },
  { id: "resend", cat: "integraciones", name: "Resend Email", sub: "Correos transaccionales", icon: "📧", color: "#000000", price: "Gratis", status: "live", img: null, desc: "Plantillas de bienvenida, recuperación de contraseña y notificaciones. DNS configurado por V." },
  { id: "vapid", cat: "integraciones", name: "Push VAPID", sub: "Notificaciones push PWA", icon: "🔔", color: "#f59e0b", price: "Gratis", status: "live", img: null, desc: "Web push en iOS y Android. Service worker, permisos y segmentación por usuario." },
  // LLMs
  { id: "claude", cat: "llms", name: "Claude (Anthropic)", sub: "El cerebro de V", icon: "🧠", color: "#d97757", price: "API key propia", status: "live", img: null, desc: "Claude Sonnet 4 integrado en el chat de V. Razona, escribe código y orquesta tu stack." },
  { id: "openai", cat: "llms", name: "OpenAI GPT-4o", sub: "Modelo alternativo", icon: "✨", color: "#10a37f", price: "API key propia", status: "live", img: null, desc: "Usa GPT-4o como modelo secundario para tareas específicas dentro de tu workspace." },
  { id: "gemini", cat: "llms", name: "Gemini Pro", sub: "Google AI", icon: "🌟", color: "#4285f4", price: "Próximamente", status: "soon", img: null, desc: "Integración con Gemini Pro para procesamiento multimodal y análisis de documentos." },
  { id: "elevenlabs", cat: "llms", name: "ElevenLabs", sub: "Voz sintética IA", icon: "🎙️", color: "#7c3aed", price: "Próximamente", status: "soon", img: null, desc: "Voz para tu app: onboarding guiado, notificaciones habladas y asistentes de voz." },
  // TEMPLATES
  { id: "pwa-saas", cat: "templates", name: "PWA SaaS Base", sub: "Plantilla completa de arranque", icon: "🚀", color: "#7c3aed", price: "$0 con Studio", status: "live", img: null, desc: "Next.js 14 + Clerk + Neon + Resend + VAPID + panel de administración. El estándar MYMOMENTUM." },
  { id: "landing-pro", cat: "templates", name: "Landing Pro", sub: "Landing de conversión", icon: "🎯", color: "#dc2626", price: "$0 con Studio", status: "live", img: null, desc: "Hero, funciones, precios, testimonios y CTA. Tema oscuro premium, mobile-first." },
  { id: "ecommerce", cat: "templates", name: "E-Commerce LATAM", sub: "Tienda lista para México", icon: "🛍️", color: "#059669", price: "Próximamente", status: "soon", img: null, desc: "Catálogo, carrito, Mercado Pago y panel de administración. Lleva tu tienda en 1 día." },
];

export default function MarketplacePage() {
  const [cat, setCat] = useState<Category>("todo");
  const [active, setActive] = useState<string | null>(null);

  const filtered = cat === "todo" ? ITEMS : ITEMS.filter(i => i.cat === cat);
  const activeItem = ITEMS.find(i => i.id === active);

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pb-24 pt-20">

        {/* Hero del shop */}
        <div className="relative overflow-hidden border-b border-[var(--border-1)] bg-gradient-to-b from-violet-600/8 to-transparent px-5 py-16 text-center">
          <div className="pointer-events-none absolute inset-0">
            <img src={HF_SPHERE} alt="" className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover opacity-[0.06] blur-[60px]" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }} className="relative z-10">
            <p className="mb-3 text-[12px] font-semibold tracking-[0.25em] text-[var(--fg-subtle)] uppercase">V-Shop</p>
            <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-tight text-white">
              Todo lo que necesita<br />
              {/* Segundo tono del titular. Antes era un degradado de violet-400 a
                  violet-400 (los dos extremos iguales) pintado con bg-clip-text:
                  el tema monocromo deja violet-400 en #4f5257, asi que el titular
                  salia gris oscuro sobre el fondo casi negro, a 1.6:1. */}
              <span className="text-[var(--fg-subtle)]">tu próxima app.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm font-light text-[var(--fg-subtle)]">
              Apps listas, integraciones, LLMs y plantillas. V los conecta a tu proyecto en segundos.
            </p>
          </motion.div>
        </div>

        {/* Categorías */}
        <div className="mx-auto max-w-5xl px-5">
          <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-2xl px-5 py-2 text-sm font-medium transition-all ${cat === c.id ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: i * 0.04, ease: EASE }}
                  onClick={() => setActive(item.id)}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] p-4 text-left transition-all hover:border-violet-400/30 hover:bg-[var(--surface-1)]"
                >
                  {item.img && (
                    // `relative`: el velo de abajo es `absolute inset-0` y sin esto se
                    // anclaba a la TARJETA entera (que si es `relative`), no a la foto.
                    // Oscurecia el fondo completo y dejaba el titulo a 3.1:1.
                    <div className="relative mb-3 h-24 w-full overflow-hidden rounded-xl">
                      <img src={item.img} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  {!item.img && (
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] text-2xl">
                      {item.icon}
                    </div>
                  )}
                  {/* La tarjeta es clara (--surface-1 = #f7f7f5): el texto va oscuro.
                      Antes el titulo era text-white sobre la tarjeta blanca: 1.07:1. */}
                  <p className="text-sm font-semibold text-[var(--fg-primary)] leading-tight">{item.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)] leading-tight">{item.sub}</p>
                  {/* En columna: a 390 la tarjeta mide ~155px y el estado y el precio
                      juntos no caben en una fila sin partirse los dos a la vez. */}
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className={`text-[12px] font-semibold ${item.status === "live" ? "text-[var(--fg-primary)]" : "text-[var(--fg-tertiary)]"}`}>
                      {item.status === "live" ? "● Disponible" : "◌ Próximamente"}
                    </span>
                    <span className="text-[12px] text-[var(--fg-tertiary)]">{item.price}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Drawer de detalle */}
        <AnimatePresence>
          {active && activeItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActive(null)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ ease: EASE, duration: 0.4 }}
                className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-auto rounded-t-3xl border-t border-[var(--border-1)] bg-[#0b0614]/95 p-6 backdrop-blur-2xl"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] text-3xl">
                    {activeItem.icon}
                  </div>
                  {/* Esta hoja SI es oscura (#0b0614): aqui el texto va claro.
                      --fg-tertiary (#55585d) sobre este fondo daba 2.8:1. */}
                  <div className="flex-1">
                    <p className="text-lg font-bold text-white">{activeItem.name}</p>
                    <p className="text-sm text-[var(--fg-subtle)]">{activeItem.sub}</p>
                    <span className="mt-1 inline-block rounded-full border border-white/25 px-2.5 py-0.5 text-[12px] font-semibold text-white">
                      {activeItem.status === "live" ? "Disponible" : "Próximamente"}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm font-light leading-relaxed text-[var(--fg-subtle)]">{activeItem.desc}</p>
                <div className="mt-4 flex items-center gap-3">
                  {activeItem.status === "live" ? (
                    <Link href="/sign-up" prefetch={false}
                      onClick={() => setActive(null)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]"
                    >
                      Agregar a mi proyecto <IconArrowR size={13} />
                    </Link>
                  ) : (
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3.5 text-sm font-medium text-white">
                      <IconShield size={13} /> Notificarme cuando esté listo
                    </button>
                  )}
                  <button onClick={() => setActive(null)} className="rounded-2xl border border-white/25 px-4 py-3.5 text-sm text-white hover:bg-white/10">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
      <MarketingFooter />
    </>
  );
}
