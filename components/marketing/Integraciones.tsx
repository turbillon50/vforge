"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

type Cat = { title: string; accent: string; items: { name: string; logo: string }[] };

// Logos reales via Google Favicon CDN (siempre disponible, sin CORS)
function logo(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

const CATEGORIES: Cat[] = [
  {
    title: "Inteligencia Artificial", accent: "#d97757",
    items: [
      { name: "OpenAI",     logo: logo("openai.com") },
      { name: "Claude",     logo: logo("claude.ai") },
      { name: "Gemini",     logo: logo("gemini.google.com") },
      { name: "OpenRouter", logo: logo("openrouter.ai") },
      { name: "Grok",       logo: logo("grok.com") },
      { name: "DeepSeek",   logo: logo("deepseek.com") },
    ],
  },
  {
    title: "Infraestructura", accent: "#22d3ee",
    items: [
      { name: "GitHub",  logo: logo("github.com") },
      { name: "Vercel",  logo: logo("vercel.com") },
      { name: "Neon",    logo: logo("neon.tech") },
      { name: "Hetzner", logo: logo("hetzner.com") },
      { name: "Railway", logo: logo("railway.app") },
    ],
  },
  {
    title: "Comunicación", accent: "#22c55e",
    items: [
      { name: "WhatsApp", logo: logo("whatsapp.com") },
      { name: "Twilio",   logo: logo("twilio.com") },
      { name: "Resend",   logo: logo("resend.com") },
      { name: "Gmail",    logo: logo("gmail.com") },
    ],
  },
  {
    title: "Productividad", accent: "#f59e0b",
    items: [
      { name: "Airtable", logo: logo("airtable.com") },
      { name: "HubSpot",  logo: logo("hubspot.com") },
      { name: "ClickUp",  logo: logo("clickup.com") },
      { name: "Slack",    logo: logo("slack.com") },
      { name: "Calendly", logo: logo("calendly.com") },
    ],
  },
  {
    title: "Identidad", accent: "#8b5cf6",
    items: [
      { name: "Clerk",  logo: logo("clerk.com") },
      { name: "Google", logo: logo("google.com") },
      { name: "Apple",  logo: logo("apple.com") },
    ],
  },
  {
    title: "Pagos", accent: "#635bff",
    items: [
      { name: "Stripe",       logo: logo("stripe.com") },
      { name: "Mercado Pago", logo: logo("mercadopago.com.mx") },
      { name: "PayPal",       logo: logo("paypal.com") },
    ],
  },
  {
    title: "Blockchain", accent: "#a855f7",
    items: [
      { name: "Alchemy",  logo: logo("alchemy.com") },
      { name: "Thirdweb", logo: logo("thirdweb.com") },
      { name: "Safe",     logo: logo("safe.global") },
    ],
  },
];

export function Integraciones() {
  return (
    // data-theme="dark" forzado — esta sección siempre oscura
    <section id="integraciones" data-theme="dark" className="relative bg-[#050509] py-20">
      {/* Top separator */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="mx-auto max-w-5xl px-5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/60">
          Centro de integraciones
        </p>
        <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
          Conectado con<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            todo tu ecosistema.
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/40">
          V orquesta más de 30 servicios. Tu stack completo, hablando el mismo idioma.
        </p>

        <div className="mt-12 space-y-10">
          {CATEGORIES.map((cat, ci) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: ci * 0.04, ease: EASE }}
            >
              {/* Category header */}
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ background: cat.accent, boxShadow: `0 0 8px ${cat.accent}80` }} />
                <p className="text-sm font-semibold text-white">{cat.title}</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/30">
                  {cat.items.length}
                </span>
                <div className="ml-1 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              {/* Logo grid */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {cat.items.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, scale: 0.88 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: ci * 0.04 + i * 0.025, ease: EASE }}
                    className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c18] p-4 transition-all hover:border-white/20"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
                  >
                    {/* Hover glow */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: `radial-gradient(circle at 50% 0%, ${cat.accent}20, transparent 65%)` }} />

                    {/* Logo container */}
                    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.05]">
                      <img
                        src={item.logo}
                        alt={item.name}
                        width={28} height={28}
                        className="h-7 w-7 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = "none";
                          if (t.parentElement) {
                            t.parentElement.innerHTML = `<span style="font-size:18px;opacity:0.4">${item.name[0]}</span>`;
                          }
                        }}
                      />
                    </div>
                    <span className="relative text-center text-[11px] font-medium leading-tight text-white/60 group-hover:text-white/85 transition-colors">
                      {item.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom separator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </section>
  );
}
