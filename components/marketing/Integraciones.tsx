"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

type Cat = {
  title: string;
  accent: string;
  items: { name: string; domain: string }[];
};

// domain → logo oficial vía Clearbit (logos reales de cada servicio)
const CATEGORIES: Cat[] = [
  {
    title: "Inteligencia Artificial",
    accent: "#d97757",
    items: [
      { name: "OpenAI", domain: "openai.com" },
      { name: "Claude", domain: "anthropic.com" },
      { name: "Gemini", domain: "deepmind.google" },
      { name: "OpenRouter", domain: "openrouter.ai" },
      { name: "Grok", domain: "x.ai" },
      { name: "DeepSeek", domain: "deepseek.com" },
    ],
  },
  {
    title: "Infraestructura",
    accent: "#22d3ee",
    items: [
      { name: "GitHub", domain: "github.com" },
      { name: "Vercel", domain: "vercel.com" },
      { name: "Railway", domain: "railway.app" },
      { name: "Hetzner", domain: "hetzner.com" },
      { name: "Neon", domain: "neon.tech" },
    ],
  },
  {
    title: "Comunicación",
    accent: "#22c55e",
    items: [
      { name: "WhatsApp", domain: "whatsapp.com" },
      { name: "Twilio", domain: "twilio.com" },
      { name: "Resend", domain: "resend.com" },
      { name: "Gmail", domain: "gmail.com" },
    ],
  },
  {
    title: "Productividad",
    accent: "#f59e0b",
    items: [
      { name: "Airtable", domain: "airtable.com" },
      { name: "HubSpot", domain: "hubspot.com" },
      { name: "ClickUp", domain: "clickup.com" },
      { name: "Slack", domain: "slack.com" },
      { name: "Calendly", domain: "calendly.com" },
    ],
  },
  {
    title: "Identidad",
    accent: "#8b5cf6",
    items: [
      { name: "Clerk", domain: "clerk.com" },
      { name: "Google", domain: "google.com" },
      { name: "Apple", domain: "apple.com" },
    ],
  },
  {
    title: "Pagos",
    accent: "#635bff",
    items: [
      { name: "Stripe", domain: "stripe.com" },
      { name: "Mercado Pago", domain: "mercadopago.com" },
      { name: "PayPal", domain: "paypal.com" },
    ],
  },
  {
    title: "Blockchain",
    accent: "#a855f7",
    items: [
      { name: "Alchemy", domain: "alchemy.com" },
      { name: "Thirdweb", domain: "thirdweb.com" },
      { name: "Safe", domain: "safe.global" },
      { name: "LiFi", domain: "li.fi" },
      { name: "Turnkey", domain: "turnkey.com" },
    ],
  },
];

function logoUrl(domain: string) {
  return `https://logo.clearbit.com/${domain}?size=80`;
}

export function Integraciones() {
  return (
    <section id="integraciones" className="relative py-20">
      <div className="mx-auto max-w-5xl px-5">
        <p className="text-center text-[11px] font-semibold tracking-[0.25em] text-cyan-400/60 uppercase">Centro de integraciones</p>
        <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
          Conectado con<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">todo tu ecosistema.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/40">
          V orquesta más de 30 servicios. Tu stack completo, hablando el mismo idioma.
        </p>

        <div className="mt-12 space-y-10">
          {CATEGORIES.map((cat, ci) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.05, ease: EASE }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.accent, boxShadow: `0 0 8px ${cat.accent}` }} />
                <p className="text-sm font-semibold text-white">{cat.title}</p>
                <span className="text-xs text-white/25">{cat.items.length}</span>
                <div className="ml-2 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {cat.items.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: ci * 0.05 + i * 0.03, ease: EASE }}
                    className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                    style={{ ["--accent" as any]: cat.accent }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: `radial-gradient(circle at 50% 0%, ${cat.accent}18, transparent 70%)` }}
                    />
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      <img
                        src={logoUrl(item.domain)}
                        alt={item.name}
                        className="h-7 w-7 object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                      />
                    </div>
                    <span className="relative text-center text-[11px] font-medium text-white/55 leading-tight">{item.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
