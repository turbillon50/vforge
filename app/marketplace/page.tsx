"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { IconArrowR, IconShield, IconSparkles, IconZap, IconBrain, IconGlobe, IconCreditCard, IconChat } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

type Category = "todo" | "apps" | "integraciones" | "llms" | "templates";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "apps", label: "Apps" },
  { id: "integraciones", label: "Integraciones" },
  { id: "llms", label: "LLMs" },
  { id: "templates", label: "Templates" },
];

const HF_SPHERE = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_60084359-8811-4bc5-8d6b-a3ab56409de3.png";

const ITEMS = [
  // APPS
  { id: "apsus", cat: "apps", name: "APSUS", sub: "Plataforma fintech completa", icon: "💸", color: "#7c3aed", price: "Incluido en Forge", status: "live", img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=80", desc: "Créditos, facturas, movimientos y perfilamiento crediticio. Listo para deploy con Clerk + Neon." },
  { id: "csn", cat: "apps", name: "CSN Carnes", sub: "Red de sucursales E-Commerce", icon: "🥩", color: "#dc2626", price: "Incluido en Forge", status: "live", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80", desc: "App para redes de tiendas. Admin multi-sucursal, catálogo dinámico y dashboard de ventas." },
  { id: "mt", cat: "apps", name: "MT Empresarial", sub: "Traslados ejecutivos PWA", icon: "🚗", color: "#0891b2", price: "Incluido en Forge", status: "live", img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=300&q=80", desc: "Gestión de flotas, reservas y driver panel. GPS + notificaciones push incluidas." },
  { id: "rideme", cat: "apps", name: "RideMe", sub: "Réplica InDriver para LATAM", icon: "🛺", color: "#059669", price: "Próximamente", status: "soon", img: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=300&q=80", desc: "Plataforma de movilidad con modelo de subasta de precio. Admin, driver y pasajero." },
  // INTEGRACIONES
  { id: "clerk", cat: "integraciones", name: "Clerk Auth", sub: "Autenticación production-ready", icon: "🔐", color: "#6d28d9", price: "Gratis", status: "live", img: null, desc: "Setup completo: pk_live_, webhooks, user sync con Neon. V lo configura sola." },
  { id: "neon", cat: "integraciones", name: "Neon Postgres", sub: "Base de datos serverless", icon: "🐘", color: "#00e599", price: "Gratis", status: "live", img: null, desc: "Branching de DB por feature. Migrations automáticas. Integrado con Vercel en un click." },
  { id: "stripe", cat: "integraciones", name: "Stripe Payments", sub: "Pagos + suscripciones", icon: "💳", color: "#635bff", price: "Gratis", status: "live", img: null, desc: "Checkout, webhooks, billing portal y prueba de planes. V inyecta las claves sola." },
  { id: "mp", cat: "integraciones", name: "Mercado Pago", sub: "Pagos LATAM nativos", icon: "🟡", color: "#009ee3", price: "Gratis", status: "live", img: null, desc: "Checkout Pro, Subscriptions y notificaciones. Ideal para México, Argentina y Brasil." },
  { id: "resend", cat: "integraciones", name: "Resend Email", sub: "Emails transaccionales", icon: "📧", color: "#000000", price: "Gratis", status: "live", img: null, desc: "Templates de bienvenida, recuperación de contraseña y notificaciones. DNS configurado por V." },
  { id: "vapid", cat: "integraciones", name: "Push VAPID", sub: "Notificaciones push PWA", icon: "🔔", color: "#f59e0b", price: "Gratis", status: "live", img: null, desc: "Web push en iOS y Android. Service worker, permisos y targeting por usuario." },
  // LLMs
  { id: "claude", cat: "llms", name: "Claude (Anthropic)", sub: "El cerebro de V", icon: "🧠", color: "#d97757", price: "API key propia", status: "live", img: null, desc: "Claude Sonnet 4 integrado en el chat de V. Razona, escribe código y orquesta tu stack." },
  { id: "openai", cat: "llms", name: "OpenAI GPT-4o", sub: "Modelo alternativo", icon: "✨", color: "#10a37f", price: "API key propia", status: "live", img: null, desc: "Usa GPT-4o como modelo secundario para tareas específicas dentro de tu workspace." },
  { id: "gemini", cat: "llms", name: "Gemini Pro", sub: "Google AI", icon: "🌟", color: "#4285f4", price: "Próximamente", status: "soon", img: null, desc: "Integración con Gemini Pro para procesamiento multimodal y análisis de documentos." },
  { id: "elevenlabs", cat: "llms", name: "ElevenLabs", sub: "Voz sintética IA", icon: "🎙️", color: "#7c3aed", price: "Próximamente", status: "soon", img: null, desc: "Voz para tu app: onboarding guiado, notificaciones habladas y asistentes de voz." },
  // TEMPLATES
  { id: "pwa-saas", cat: "templates", name: "PWA SaaS Base", sub: "Template completo de arranque", icon: "🚀", color: "#7c3aed", price: "$0 con Studio", status: "live", img: null, desc: "Next.js 14 + Clerk + Neon + Resend + VAPID + admin panel. El estándar MYMOMENTUM." },
  { id: "landing-pro", cat: "templates", name: "Landing Pro", sub: "Landing de conversión", icon: "🎯", color: "#dc2626", price: "$0 con Studio", status: "live", img: null, desc: "Hero + features + pricing + testimonials + CTA. Dark premium mobile-first." },
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
        <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-violet-600/8 to-transparent py-16 text-center">
          <div className="pointer-events-none absolute inset-0">
            <img src={HF_SPHERE} alt="" className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover opacity-[0.06] blur-[60px]" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }} className="relative z-10">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-violet-400/60 uppercase">V-Shop</p>
            <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-tight text-white">
              Todo lo que necesita<br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">tu próxima app.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm font-light text-white/35">
              Apps listas, integraciones, LLMs y templates. V los conecta a tu proyecto en segundos.
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
                className={`shrink-0 rounded-2xl px-5 py-2 text-sm font-medium transition-all ${cat === c.id ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/80"}`}
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
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-all hover:border-violet-400/30 hover:bg-white/[0.05]"
                >
                  {item.img && (
                    <div className="mb-3 h-24 w-full overflow-hidden rounded-xl">
                      <img src={item.img} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  {!item.img && (
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-2xl">
                      {item.icon}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-white leading-tight">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/40 leading-tight">{item.sub}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold ${item.status === "live" ? "text-emerald-400" : "text-violet-300/60"}`}>
                      {item.status === "live" ? "● Disponible" : "◌ Próximamente"}
                    </span>
                    <span className="text-[10px] text-white/25">{item.price}</span>
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
                className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-auto rounded-t-3xl border-t border-white/10 bg-[#0b0614]/95 p-6 backdrop-blur-2xl"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-3xl">
                    {activeItem.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-white">{activeItem.name}</p>
                    <p className="text-sm text-white/40">{activeItem.sub}</p>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${activeItem.status === "live" ? "bg-emerald-500/15 text-emerald-400" : "bg-violet-500/15 text-violet-300"}`}>
                      {activeItem.status === "live" ? "Disponible" : "Próximamente"}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/55">{activeItem.desc}</p>
                <div className="mt-4 flex items-center gap-3">
                  {activeItem.status === "live" ? (
                    <Link href="/sign-up"
                      onClick={() => setActive(null)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]"
                    >
                      Agregar a mi proyecto <IconArrowR size={13} />
                    </Link>
                  ) : (
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 py-3.5 text-sm font-medium text-violet-300">
                      <IconShield size={13} /> Notificarme cuando esté listo
                    </button>
                  )}
                  <button onClick={() => setActive(null)} className="rounded-2xl border border-white/10 px-4 py-3.5 text-sm text-white/40 hover:text-white/70">
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
