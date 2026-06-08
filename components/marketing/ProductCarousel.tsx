"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Check, ArrowRight, Sparkles, Smartphone, Apple, Bot, Workflow, Film, BrainCircuit, Network } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Product = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  accent: string;
  icon: any;
  // visual del card: esfera (img) o gradiente con icono
  sphere?: string;
  badge?: string;
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
    icon: Smartphone,
    sphere: "/sphere-violet.png",
    badge: "Producto estrella",
    fullDesc: "Construimos tu aplicación completa: PWA premium, base de datos, login, dashboard y todo lo que necesita para operar en el mundo real. Empiezas con una demo gratuita y avanzas por etapas con pagos claros.",
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
    name: "MCP Empresariales",
    tagline: "Conecta todas tus IA",
    priceLabel: "Desde $25,000 MXN",
    accent: "#22d3ee",
    icon: Network,
    badge: "NEW",
    fullDesc: "Diseñamos MCP empresariales para tus procesos, la memoria de tu empresa y ahorro de tokens por contexto. Un solo protocolo que conecta todas tus inteligencias artificiales — Claude, GPT, Gemini — a tus datos y herramientas reales, sin repetir contexto en cada llamada.",
    capabilities: ["Procesos empresariales", "Memoria de la empresa", "Ahorro de tokens por contexto", "Conecta todas tus IA", "Acceso a tus herramientas", "Protocolo seguro y privado"],
    note: "Un MCP es la diferencia entre una IA que olvida todo y una que conoce tu empresa completa.",
    ctaLabel: "Solicita el MCP de VForge",
  },
  {
    id: "ios",
    name: "Publicación iOS",
    tagline: "Tu app en el App Store",
    priceLabel: "$5,000 MXN",
    accent: "#38bdf8",
    icon: Apple,
    fullDesc: "Llevamos tu aplicación al App Store de Apple. Nos encargamos de todo: configuración de cuenta de desarrollador, build firmado, assets, revisión de Apple y publicación. Tu app lista para iPhone y iPad.",
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
    accent: "#34d399",
    icon: Smartphone,
    fullDesc: "Publicamos tu aplicación en Google Play. Configuración de Play Console, build firmado, ficha de tienda optimizada, revisión y publicación. Disponible para millones de dispositivos Android.",
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
    accent: "#fbbf24",
    icon: Film,
    fullDesc: "Producimos videos cinematográficos generados con IA de última generación. Estilo Pixar, cinematográfico realista o corporativo profesional. Perfectos para campañas, presentaciones, redes sociales o lanzamientos.",
    capabilities: ["Estilo Pixar / animación 3D", "Cinematográfico fotorrealista", "Corporativo profesional", "Spots para redes", "Intros y lanzamientos", "Alta resolución"],
  },
  {
    id: "automations",
    name: "Automatizaciones Empresariales",
    tagline: "Tu empresa operando sola",
    priceLabel: "Desde $20,000 MXN",
    accent: "#a78bfa",
    icon: Workflow,
    fullDesc: "Automatizamos los procesos de tu empresa de punta a punta. WhatsApp, correo, CRM, telefonía y flujos documentales conectados con IA. Tu operación funciona sola mientras tú creces.",
    capabilities: ["WhatsApp automatizado", "Correo inteligente", "CRM integrado", "Telefonía con IA", "Flujos de trabajo", "Automatización documental", "Integraciones empresariales"],
  },
  {
    id: "bots",
    name: "Bots Empresariales",
    tagline: "Atención y ventas 24/7",
    priceLabel: "Desde $1,500 MXN",
    accent: "#2dd4bf",
    icon: Bot,
    fullDesc: "Bots inteligentes que atienden, venden y dan seguimiento sin descanso. En WhatsApp, Telegram o tu sitio web. Responden, califican leads y cierran ventas mientras tu equipo duerme.",
    capabilities: ["Atención al cliente", "Ventas automatizadas", "Seguimiento de leads", "WhatsApp", "Telegram", "Widget web"],
  },
  {
    id: "llm",
    name: "LLMs Empresariales",
    tagline: "Una IA que opera tu empresa",
    priceLabel: "$5,000 – $60,000 MXN",
    accent: "#fb923c",
    icon: BrainCircuit,
    sphere: "/sphere-orange.png",
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
    <section id="productos" className="relative py-20">
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/70 uppercase">Nuestros productos</p>
        <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
          Una fábrica completa de<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">tecnología e IA.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/45">
          Desliza. Toca cualquier producto para conocer todo el proceso.
        </p>
      </div>

      {/* Carrusel horizontal */}
      <div className="mt-10 flex gap-5 overflow-x-auto px-5 pb-8 no-scrollbar snap-x snap-mandatory">
        {PRODUCTS.map((p, i) => {
          const Icon = p.icon;
          const isNew = p.badge === "NEW";
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
                background: `radial-gradient(130% 100% at 50% 0%, ${p.accent}28 0%, #0a0712 55%, #07050f 100%)`,
                boxShadow: `0 24px 70px ${p.accent}30, inset 0 1px 0 ${p.accent}30`,
              }}
            >
              {/* Glow superior vivo */}
              <div className="absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full opacity-60 blur-[60px] transition-opacity duration-500 group-hover:opacity-90" style={{ background: p.accent }} />

              {/* Badge */}
              {p.badge && (
                <div className="absolute right-4 top-4 z-10">
                  <span
                    className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xl"
                    style={ isNew
                      ? { borderColor: "#22d3ee", background: "#22d3ee20", color: "#67e8f9", boxShadow: "0 0 16px #22d3ee60" }
                      : { borderColor: `${p.accent}50`, background: `${p.accent}18`, color: "#fff" }
                    }
                  >
                    {p.badge}
                  </span>
                </div>
              )}

              {/* Visual central: esfera o icono glassmorphic */}
              <div className="relative flex h-[230px] items-center justify-center">
                {p.sphere ? (
                  <motion.img
                    src={p.sphere}
                    alt={p.name}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="h-[180px] w-[180px] object-contain"
                    style={{ filter: `drop-shadow(0 0 40px ${p.accent}90)` }}
                  />
                ) : (
                  <div
                    className="flex h-[120px] w-[120px] items-center justify-center rounded-[2rem] border backdrop-blur-xl transition-transform duration-500 group-hover:scale-110"
                    style={{
                      borderColor: `${p.accent}50`,
                      background: `linear-gradient(145deg, ${p.accent}30, ${p.accent}08)`,
                      boxShadow: `0 0 50px ${p.accent}50, inset 0 1px 0 ${p.accent}40`,
                    }}
                  >
                    <Icon size={52} strokeWidth={1.4} style={{ color: p.accent, filter: `drop-shadow(0 0 12px ${p.accent})` }} />
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: p.accent }}>{p.tagline}</p>
                <h3 className="mt-1.5 text-[1.35rem] font-bold leading-tight text-white">{p.name}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-white">{p.priceLabel}</span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 group-hover:translate-x-0.5"
                    style={{ borderColor: `${p.accent}50`, background: `${p.accent}20` }}
                  >
                    <ArrowRight size={15} style={{ color: p.accent }} />
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* POPUP FULLSCREEN PREMIUM */}
      <AnimatePresence>
        {active && activeProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ ease: EASE, duration: 0.4 }}
              className="fixed inset-0 z-[81] flex items-end justify-center md:items-center"
            >
              <div
                className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border bg-[#07050f] md:rounded-[2rem]"
                style={{ borderColor: `${activeProduct.accent}40`, boxShadow: `0 0 100px ${activeProduct.accent}35` }}
              >
                {/* Hero del popup */}
                <div className="relative flex h-52 items-center justify-center overflow-hidden">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${activeProduct.accent}35, #07050f 70%)` }} />
                  <div className="absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-70 blur-[60px]" style={{ background: activeProduct.accent }} />
                  {activeProduct.sphere ? (
                    <img src={activeProduct.sphere} alt="" className="relative h-36 w-36 object-contain" style={{ filter: `drop-shadow(0 0 40px ${activeProduct.accent})` }} />
                  ) : (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border backdrop-blur-xl" style={{ borderColor: `${activeProduct.accent}50`, background: `${activeProduct.accent}20` }}>
                      <activeProduct.icon size={44} strokeWidth={1.4} style={{ color: activeProduct.accent, filter: `drop-shadow(0 0 10px ${activeProduct.accent})` }} />
                    </div>
                  )}
                  <button
                    onClick={() => setActive(null)}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-6 pb-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: activeProduct.accent }}>{activeProduct.tagline}</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{activeProduct.name}</h2>

                  {/* Precio */}
                  <div className="mb-5 mt-4 flex items-center justify-between rounded-2xl border px-5 py-4" style={{ borderColor: `${activeProduct.accent}30`, background: `${activeProduct.accent}10` }}>
                    <span className="text-sm text-white/50">Inversión</span>
                    <span className="text-2xl font-bold" style={{ color: activeProduct.accent }}>{activeProduct.priceLabel}</span>
                  </div>

                  <p className="text-sm font-light leading-relaxed text-white/65">{activeProduct.fullDesc}</p>

                  {activeProduct.timeline && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Proceso y pagos</p>
                      <div className="space-y-3">
                        {activeProduct.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold" style={{ borderColor: `${activeProduct.accent}60`, color: activeProduct.accent }}>{i + 1}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-white">{t.phase}</p>
                                {t.pay && <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: `${activeProduct.accent}30` }}>{t.pay}</span>}
                              </div>
                              <p className="text-xs text-white/45">{t.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.includes && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Incluye</p>
                      <div className="grid grid-cols-2 gap-2">
                        {activeProduct.includes.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-xs text-white/65">
                            <Check size={12} style={{ color: activeProduct.accent }} className="shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.capabilities && (
                    <div className="mt-6">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Capacidades</p>
                      <div className="flex flex-wrap gap-2">
                        {activeProduct.capabilities.map((c) => (
                          <span key={c} className="rounded-full border px-3 py-1.5 text-xs text-white/70" style={{ borderColor: `${activeProduct.accent}25`, background: `${activeProduct.accent}0c` }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeProduct.note && (
                    <div className="mt-5 rounded-2xl border px-4 py-3" style={{ borderColor: `${activeProduct.accent}40`, background: `${activeProduct.accent}12` }}>
                      <p className="flex items-start gap-2 text-xs font-light leading-relaxed text-white/75">
                        <Sparkles size={13} style={{ color: activeProduct.accent }} className="mt-0.5 shrink-0" />
                        {activeProduct.note}
                      </p>
                    </div>
                  )}

                  <Link
                    href="/sign-up"
                    onClick={() => setActive(null)}
                    className="mt-6 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${activeProduct.accent}, ${activeProduct.accent}cc)`, boxShadow: `0 0 40px ${activeProduct.accent}50` }}
                  >
                    {activeProduct.ctaLabel || "Solicitar este producto"} <ArrowRight size={14} />
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
