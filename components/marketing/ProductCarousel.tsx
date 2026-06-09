"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { IconArrowR, IconBot, IconCheck, IconCpu, IconDatabase, IconSparkles, IconZap, IconX } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

type Product = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  accent: string;
  bgImg?: string;
  sphere?: string;       // imagen de esfera en vez de foto
  icon?: "cpu" | "bot" | "zap" | "db";
  badge?: string;
  isNew?: boolean;
  fullDesc: string;
  timeline?: { phase: string; detail: string; pay?: string }[];
  includes?: string[];
  capabilities?: string[];
  note?: string;
  ctaLabel?: string;
};

const PRODUCTS: Product[] = [
  {
    id: "app",
    name: "Aplicación Personalizada",
    tagline: "De cero a producción",
    priceLabel: "$12,000 MXN",
    accent: "#8b5cf6",
    bgImg: "https://picsum.photos/seed/vforge-apps/800/500",
    badge: "Producto estrella",
    fullDesc: "Construimos tu aplicación completa: PWA premium, base de datos, login, dashboard y todo lo necesario para operar en el mundo real. Empiezas con una demo gratuita y avanzas por etapas con pagos claros.",
    timeline: [
      { phase: "Día 1–4", detail: "Demo gratuita — ves tu app antes de pagar" },
      { phase: "Inicio de contrato", detail: "Arranca el desarrollo", pay: "$4,000" },
      { phase: "Etapa 1", detail: "Desarrollo del núcleo y flujos" },
      { phase: "Etapa 2", detail: "Integraciones y refinamiento", pay: "$4,000" },
      { phase: "Entrega final", detail: "Producción + capacitación", pay: "$4,000" },
    ],
    includes: ["PWA instalable", "Dominio propio", "Diseño premium", "Roles de usuario", "Base de datos", "Login seguro", "Dashboard", "Notificaciones push", "Correos automáticos", "Integraciones", "Manual de uso", "Capacitación"],
  },
  {
    id: "mcp",
    name: "MCP Empresarial",
    tagline: "El cerebro que conecta tus IA",
    priceLabel: "Desde $25,000 MXN",
    accent: "#22d3ee",
    icon: "cpu",
    isNew: true,
    fullDesc: "Diseñamos MCP empresariales para tus procesos, con memoria de empresa y ahorro de tokens por contexto. Un solo cerebro que conecta todas tus IA — Claude, GPT, Gemini — para que trabajen con el conocimiento de tu negocio sin repetir contexto.",
    capabilities: ["Memoria de empresa persistente", "Ahorro de tokens por contexto", "Conecta todas tus IA", "Procesos automatizados", "Acceso a tus datos en tiempo real", "Protocolo seguro (OAuth)"],
    note: "El mismo motor que opera VForge por dentro, ahora para tu empresa.",
    ctaLabel: "Solicita el MCP de VForge",
  },
  {
    id: "ios",
    name: "Publicación iOS",
    tagline: "Tu app en el App Store",
    priceLabel: "$5,000 MXN",
    accent: "#0ea5e9",
    bgImg: "https://picsum.photos/seed/vforge-ios/800/500",
    fullDesc: "Llevamos tu aplicación al App Store de Apple. Configuración de cuenta de desarrollador, build firmado, assets, revisión de Apple y publicación. Tu app lista para iIconBell y iPad.",
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
    bgImg: "https://picsum.photos/seed/vforge-android/800/500",
    fullDesc: "Publicamos tu aplicación en Google Play. Configuración de Play Console, build firmado, ficha de tienda optimizada, revisión y publicación para millones de dispositivos Android.",
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
    tagline: "Pixar, cine y corporativo",
    priceLabel: "Desde $200 MXN",
    accent: "#f59e0b",
    bgImg: "https://picsum.photos/seed/vforge-video/800/500",
    fullDesc: "Producimos videos cinematográficos generados con IA de última generación. Estilo Pixar, cinematográfico realista o corporativo profesional. Perfectos para campañas, presentaciones y lanzamientos.",
    capabilities: ["Estilo Pixar / animación 3D", "Cinematográfico fotorrealista", "Corporativo profesional", "Spots para redes sociales", "Intros y lanzamientos", "Entrega en alta resolución"],
  },
  {
    id: "automations",
    name: "Automatizaciones Empresariales",
    tagline: "Tu empresa operando sola",
    priceLabel: "Desde $20,000 MXN",
    accent: "#a855f7",
    icon: "zap",
    fullDesc: "Automatizamos los procesos de tu empresa de punta a punta. WhatsApp, correo, CRM, telefonía y flujos documentales conectados con IA. Tu operación funciona sola mientras tú creces.",
    capabilities: ["WhatsApp automatizado", "Correo inteligente", "CRM integrado", "Telefonía con IA", "Flujos de trabajo", "Automatización documental", "Integraciones empresariales"],
  },
  {
    id: "bots",
    name: "IconBot Inteligentes",
    tagline: "Atención y ventas 24/7",
    priceLabel: "Desde $1,500 MXN",
    accent: "#06b6d4",
    icon: "bot",
    fullDesc: "IconBot inteligentes que atienden, venden y dan seguimiento sin descanso. En WhatsApp, Telegram o tu sitio web. Responden, califican leads y cierran ventas mientras tu equipo duerme.",
    capabilities: ["Atención al cliente", "Ventas automatizadas", "Seguimiento de leads", "WhatsApp", "Telegram", "Widget web"],
  },
  {
    id: "llm",
    name: "LLMs Empresariales",
    tagline: "Una IA que opera tu empresa",
    priceLabel: "$5,000 – $60,000 MXN",
    accent: "#fb923c",
    sphere: "/sphere-orange.png",
    badge: "Máxima potencia",
    fullDesc: "Construimos un modelo de lenguaje empresarial a la medida, con memoria persistente y capacidad de coordinar tu negocio completo. Conectado a tus datos, tus herramientas y tus procesos.",
    capabilities: ["Memoria persistente", "Memoria semántica", "Memoria vectorial", "Memoria maestra", "OpenRouter / Gemini / Claude / GPT", "Bases documentales", "Automatizaciones integradas"],
    note: "BI es un ejemplo de LLM empresarial capaz de operar y coordinar una empresa completa.",
  },
];

const ICONS = { cpu: IconCpu, bot: IconBot, zap: IconZap, db: IconDatabase };

export function ProductCarousel() {
  const [active, setActive] = useState<string | null>(null);
  const activeProduct = PRODUCTS.find((p) => p.id === active);

  return (
    <section id="productos" className="relative py-20">
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/70 uppercase">Nuestros productos</p>
        <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
          Una fábrica completa de<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">tecnología e IA.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/50">
          Desliza. Toca cualquier producto para ver todo el proceso.
        </p>
      </div>

      <div className="mt-10 flex gap-5 overflow-x-auto px-5 pb-10 no-scrollbar snap-x snap-mandatory">
        {PRODUCTS.map((p, i) => {
          const Icon = p.icon ? ICONS[p.icon] : null;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, ease: EASE }}
              onClick={() => setActive(p.id)}
              className="group relative h-[440px] w-[310px] shrink-0 snap-center overflow-hidden rounded-[2rem] border text-left transition-all duration-500 hover:scale-[1.03]"
              style={{
                borderColor: `${p.accent}40`,
                background: `linear-gradient(165deg, ${p.accent}1f 0%, #0a0612 55%)`,
                boxShadow: `0 24px 70px ${p.accent}30, inset 0 1px 0 ${p.accent}30`,
              }}
            >
              {/* Imagen o esfera o icono */}
              {p.bgImg && (
                <>
                  <img src={p.bgImg} alt={p.name} className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #0a0612 8%, ${p.accent}10 55%, transparent 100%)` }} />
                </>
              )}
              {p.sphere && (
                <div className="absolute inset-x-0 top-6 flex h-48 items-center justify-center">
                  <motion.img
                    src={p.sphere} alt={p.name}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="h-44 w-44 object-contain"
                    style={{ mixBlendMode: "screen", filter: `drop-shadow(0 0 40px ${p.accent}90) saturate(1.2)` }}
                  />
                </div>
              )}
              {Icon && (
                <div className="absolute inset-x-0 top-10 flex items-center justify-center">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem]"
                    style={{ background: `radial-gradient(circle, ${p.accent}30, transparent 70%)` }}>
                    <div className="absolute inset-0 rounded-[2rem] blur-2xl" style={{ background: `${p.accent}40` }} />
                    <Icon size={56} strokeWidth={1.5} className="relative" style={{ color: p.accent }} />
                  </div>
                </div>
              )}

              {/* Glow inferior */}
              <div className="absolute -bottom-16 left-1/2 h-40 w-48 -translate-x-1/2 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-90" style={{ background: p.accent }} />

              {/* Badges */}
              <div className="absolute left-3 right-3 top-3 flex items-start justify-between">
                {p.isNew ? (
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black" style={{ background: p.accent, boxShadow: `0 0 16px ${p.accent}` }}>
                    NEW
                  </span>
                ) : <span />}
                {p.badge && (
                  <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-xl">
                    {p.badge}
                  </span>
                )}
              </div>

              {/* Contenido */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: p.accent }}>{p.tagline}</p>
                <h3 className="mt-1.5 text-2xl font-bold leading-tight text-white">{p.name}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-white">{p.priceLabel}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border transition-all group-hover:scale-110"
                    style={{ borderColor: `${p.accent}60`, background: `${p.accent}20` }}>
                    <IconArrowR size={15} className="text-white" />
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* POPUP FULLSCREEN */}
      <AnimatePresence>
        {active && activeProduct && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActive(null)} className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ ease: EASE, duration: 0.4 }}
              className="fixed inset-0 z-[81] flex items-end justify-center md:items-center"
            >
              <div className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border bg-[#06040f] md:rounded-[2rem]"
                style={{ borderColor: `${activeProduct.accent}40`, boxShadow: `0 0 120px ${activeProduct.accent}40` }}>
                {/* Hero del popup */}
                <div className="relative h-52 overflow-hidden">
                  {activeProduct.bgImg && <img src={activeProduct.bgImg} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  {(activeProduct.sphere || activeProduct.icon) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 40%, ${activeProduct.accent}25, transparent 70%)` }}>
                      {activeProduct.sphere
                        ? <img src={activeProduct.sphere} alt="" className="h-40 w-40 object-contain" style={{ mixBlendMode: "screen", filter: `drop-shadow(0 0 40px ${activeProduct.accent}) saturate(1.2)` }} />
                        : (() => { const I = ICONS[activeProduct.icon!]; return <I size={72} strokeWidth={1.5} style={{ color: activeProduct.accent }} />; })()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06040f] via-[#06040f]/40 to-transparent" />
                  <button onClick={() => setActive(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70">
                    <IconX size={16} />
                  </button>
                  <div className="absolute bottom-4 left-5 right-5">
                    {activeProduct.isNew && <span className="mb-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-black" style={{ background: activeProduct.accent }}>NEW</span>}
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: activeProduct.accent }}>{activeProduct.tagline}</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">{activeProduct.name}</h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                    <span className="text-sm text-white/50">Inversión</span>
                    <span className="text-2xl font-bold" style={{ color: activeProduct.accent }}>{activeProduct.priceLabel}</span>
                  </div>

                  <p className="text-sm font-light leading-relaxed text-white/70">{activeProduct.fullDesc}</p>

                  {activeProduct.timeline && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Proceso y pagos</p>
                      <div className="space-y-3">
                        {activeProduct.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold" style={{ borderColor: `${activeProduct.accent}60`, color: activeProduct.accent }}>{i + 1}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-white">{t.phase}</p>
                                {t.pay && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white">{t.pay}</span>}
                              </div>
                              <p className="text-xs text-white/50">{t.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.includes && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Incluye</p>
                      <div className="grid grid-cols-2 gap-2">
                        {activeProduct.includes.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-xs text-white/70">
                            <IconCheck size={12} style={{ color: activeProduct.accent }} className="shrink-0" />{f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.capabilities && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Capacidades</p>
                      <div className="flex flex-wrap gap-2">
                        {activeProduct.capabilities.map((c) => (
                          <span key={c} className="rounded-full border px-3 py-1.5 text-xs text-white/70" style={{ borderColor: `${activeProduct.accent}30`, background: `${activeProduct.accent}10` }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.note && (
                    <div className="mt-5 rounded-2xl border px-4 py-3" style={{ borderColor: `${activeProduct.accent}40`, background: `${activeProduct.accent}12` }}>
                      <p className="flex items-start gap-2 text-xs font-light leading-relaxed text-white/80">
                        <IconSparkles size={13} style={{ color: activeProduct.accent }} className="mt-0.5 shrink-0" />{activeProduct.note}
                      </p>
                    </div>
                  )}

                  <Link href="/sign-up" onClick={() => setActive(null)}
                    className="mt-6 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${activeProduct.accent}, ${activeProduct.accent}cc)`, boxShadow: `0 0 40px ${activeProduct.accent}50` }}>
                    {activeProduct.ctaLabel || "Solicitar este producto"} <IconArrowR size={14} />
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
