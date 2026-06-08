"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Check, ArrowRight, Sparkles } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Product = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  accent: string;
  gradient: string;
  bgImg: string;
  badge?: string;
  // popup
  fullDesc: string;
  timeline?: { phase: string; detail: string; pay?: string }[];
  includes?: string[];
  capabilities?: string[];
  note?: string;
};

const PRODUCTS: Product[] = [
  {
    id: "app",
    name: "Aplicación Personalizada",
    tagline: "Tu producto digital, de cero a producción",
    priceLabel: "$12,000 MXN",
    accent: "#7c3aed",
    gradient: "from-violet-600/30 to-[#080614]",
    bgImg: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80",
    badge: "Producto estrella",
    fullDesc: "Construimos tu aplicación completa: PWA premium, base de datos, login, dashboard y todo lo que necesita para operar en el mundo real. Empiezas con una demo gratuita y avanzas por etapas con pagos claros.",
    timeline: [
      { phase: "Día 1–4", detail: "Demo gratuita — ves tu app antes de pagar" },
      { phase: "Inicio de contrato", detail: "Arranca el desarrollo", pay: "$4,000" },
      { phase: "Etapa 1", detail: "Desarrollo del núcleo y flujos" },
      { phase: "Etapa 2", detail: "Integraciones y refinamiento", pay: "$4,000" },
      { phase: "Entrega final", detail: "Producción + capacitación", pay: "$4,000" },
    ],
    includes: ["PWA instalable", "Dominio propio", "Diseño premium", "Roles de usuario", "Base de datos", "Login seguro", "Dashboard", "Notificaciones push", "Correos automáticos", "Integraciones", "Manual de uso", "Capacitación básica"],
  },
  {
    id: "ios",
    name: "Publicación iOS",
    tagline: "Tu app en el App Store de Apple",
    priceLabel: "$5,000 MXN",
    accent: "#0ea5e9",
    gradient: "from-sky-600/25 to-[#060810]",
    bgImg: "https://images.unsplash.com/photo-1592434134753-a70baf7979d5?w=600&q=80",
    fullDesc: "Llevamos tu aplicación al App Store de Apple. Nos encargamos de todo el proceso: configuración de cuenta de desarrollador, build firmado, assets, revisión de Apple y publicación. Tu app lista para descargar en iPhone y iPad.",
    timeline: [
      { phase: "Preparación", detail: "Configuración de App Store Connect" },
      { phase: "Build", detail: "Compilación y firma del paquete" },
      { phase: "Revisión", detail: "Envío y seguimiento con Apple" },
      { phase: "Publicación", detail: "Tu app en vivo en el App Store" },
    ],
  },
  {
    id: "android",
    name: "Publicación Android",
    tagline: "Tu app en Google Play",
    priceLabel: "$3,000 MXN",
    accent: "#22c55e",
    gradient: "from-emerald-600/25 to-[#060a08]",
    bgImg: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=600&q=80",
    fullDesc: "Publicamos tu aplicación en Google Play. Configuración de Play Console, build firmado, ficha de tienda optimizada, revisión y publicación. Tu app disponible para millones de dispositivos Android.",
    timeline: [
      { phase: "Preparación", detail: "Configuración de Play Console" },
      { phase: "Build", detail: "APK/AAB firmado" },
      { phase: "Ficha", detail: "Store listing optimizado" },
      { phase: "Publicación", detail: "Tu app en vivo en Google Play" },
    ],
  },
  {
    id: "videos",
    name: "Videos IA Cinematográficos",
    tagline: "Pixar, cine y corporativo con IA",
    priceLabel: "Desde $200 MXN",
    accent: "#f59e0b",
    gradient: "from-amber-600/25 to-[#0a0806]",
    bgImg: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80",
    fullDesc: "Producimos videos cinematográficos generados con IA de última generación. Estilo Pixar, cinematográfico realista o corporativo profesional. Perfectos para campañas, presentaciones, redes sociales o lanzamientos de producto.",
    capabilities: ["Estilo Pixar / animación 3D", "Cinematográfico fotorrealista", "Corporativo profesional", "Spots para redes sociales", "Intros y lanzamientos", "Entrega en alta resolución"],
  },
  {
    id: "automations",
    name: "Automatizaciones Empresariales",
    tagline: "Tu empresa operando sola",
    priceLabel: "Desde $20,000 MXN",
    accent: "#8b5cf6",
    gradient: "from-violet-600/25 to-[#080614]",
    bgImg: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    fullDesc: "Automatizamos los procesos de tu empresa de punta a punta. WhatsApp, correo, CRM, telefonía y flujos documentales conectados con IA. Tu operación funciona sola mientras tú te enfocas en crecer.",
    capabilities: ["WhatsApp automatizado", "Correo inteligente", "CRM integrado", "Telefonía con IA", "Flujos de trabajo", "Automatización documental", "Integraciones empresariales"],
  },
  {
    id: "bots",
    name: "Bots Empresariales",
    tagline: "Atención y ventas 24/7",
    priceLabel: "Desde $1,500 MXN",
    accent: "#06b6d4",
    gradient: "from-cyan-600/25 to-[#06080a]",
    bgImg: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=600&q=80",
    fullDesc: "Bots inteligentes que atienden, venden y dan seguimiento sin descanso. En WhatsApp, Telegram o tu sitio web. Responden, califican leads y cierran ventas mientras tu equipo duerme.",
    capabilities: ["Atención al cliente", "Ventas automatizadas", "Seguimiento de leads", "WhatsApp", "Telegram", "Widget web"],
  },
  {
    id: "llm",
    name: "LLMs Empresariales",
    tagline: "Una IA que opera tu empresa",
    priceLabel: "$5,000 – $60,000 MXN",
    accent: "#a855f7",
    gradient: "from-fuchsia-600/25 to-[#0a0612]",
    bgImg: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80",
    badge: "Máxima potencia",
    fullDesc: "Construimos un modelo de lenguaje empresarial a la medida, con memoria persistente y capacidad de coordinar tu negocio completo. Conectado a tus datos, tus herramientas y tus procesos.",
    capabilities: ["Memoria persistente", "Memoria semántica", "Memoria vectorial", "Memoria maestra", "OpenRouter / Gemini / Claude / GPT", "Bases documentales", "Automatizaciones integradas"],
    note: "BI es un ejemplo de LLM empresarial capaz de operar y coordinar una empresa completa.",
  },
];

export function ProductCarousel() {
  const [active, setActive] = useState<string | null>(null);
  const activeProduct = PRODUCTS.find(p => p.id === active);

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/60 uppercase">Nuestros productos</p>
        <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
          Una fábrica completa de<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">tecnología e IA.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/40">
          Desliza. Toca cualquier producto para conocer todo el proceso.
        </p>
      </div>

      {/* Carrusel horizontal */}
      <div className="mt-10 flex gap-4 overflow-x-auto px-5 pb-8 no-scrollbar snap-x snap-mandatory">
        {PRODUCTS.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, ease: EASE }}
            onClick={() => setActive(p.id)}
            className="group relative h-[420px] w-[300px] shrink-0 snap-center overflow-hidden rounded-[1.75rem] border border-white/10 text-left transition-transform duration-500 hover:scale-[1.02]"
            style={{ boxShadow: `0 20px 60px ${p.accent}25` }}
          >
            {/* Imagen de fondo */}
            <img src={p.bgImg} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            {/* Overlay degradado */}
            <div className={`absolute inset-0 bg-gradient-to-t ${p.gradient}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
            {/* Glow del color */}
            <div className="absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70" style={{ background: p.accent }} />

            {/* Badge */}
            {p.badge && (
              <div className="absolute right-3 top-3">
                <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-xl">
                  {p.badge}
                </span>
              </div>
            )}

            {/* Contenido */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: p.accent }}>{p.tagline}</p>
              <h3 className="mt-1 text-xl font-bold leading-tight text-white">{p.name}</h3>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-white">{p.priceLabel}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl transition-all group-hover:bg-white/20">
                  <ArrowRight size={14} className="text-white" />
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* POPUP FULLSCREEN PREMIUM */}
      <AnimatePresence>
        {active && activeProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ ease: EASE, duration: 0.4 }}
              className="fixed inset-0 z-[81] flex items-end justify-center md:items-center"
            >
              <div className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border border-white/10 bg-[#06040f] md:rounded-[2rem]"
                style={{ boxShadow: `0 0 100px ${activeProduct.accent}30` }}
              >
                {/* Hero del popup */}
                <div className="relative h-48 overflow-hidden">
                  <img src={activeProduct.bgImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06040f] via-[#06040f]/50 to-transparent" />
                  <button
                    onClick={() => setActive(null)}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-4 left-5 right-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: activeProduct.accent }}>{activeProduct.tagline}</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">{activeProduct.name}</h2>
                  </div>
                </div>

                <div className="p-6">
                  {/* Precio */}
                  <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                    <span className="text-sm text-white/40">Inversión</span>
                    <span className="text-2xl font-bold" style={{ color: activeProduct.accent }}>{activeProduct.priceLabel}</span>
                  </div>

                  <p className="text-sm font-light leading-relaxed text-white/60">{activeProduct.fullDesc}</p>

                  {/* Timeline de pagos */}
                  {activeProduct.timeline && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Proceso y pagos</p>
                      <div className="space-y-3">
                        {activeProduct.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold" style={{ borderColor: activeProduct.accent + "60", color: activeProduct.accent }}>{i + 1}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-white">{t.phase}</p>
                                {t.pay && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{t.pay}</span>}
                              </div>
                              <p className="text-xs text-white/40">{t.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incluye */}
                  {activeProduct.includes && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Incluye</p>
                      <div className="grid grid-cols-2 gap-2">
                        {activeProduct.includes.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-xs text-white/60">
                            <Check size={12} style={{ color: activeProduct.accent }} className="shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capacidades */}
                  {activeProduct.capabilities && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Capacidades</p>
                      <div className="flex flex-wrap gap-2">
                        {activeProduct.capabilities.map((c) => (
                          <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nota destacada */}
                  {activeProduct.note && (
                    <div className="mt-5 rounded-2xl border px-4 py-3" style={{ borderColor: activeProduct.accent + "40", background: activeProduct.accent + "12" }}>
                      <p className="flex items-start gap-2 text-xs font-light leading-relaxed text-white/70">
                        <Sparkles size={13} style={{ color: activeProduct.accent }} className="mt-0.5 shrink-0" />
                        {activeProduct.note}
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href="/sign-up"
                    onClick={() => setActive(null)}
                    className="mt-6 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${activeProduct.accent}, ${activeProduct.accent}cc)`, boxShadow: `0 0 40px ${activeProduct.accent}50` }}
                  >
                    Solicitar este producto <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
