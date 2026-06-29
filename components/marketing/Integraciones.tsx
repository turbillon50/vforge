"use client";
import { motion } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────────────────────
   Integraciones — logos reales, agrupados por categoría.
   Mensaje: VForge no solo conecta herramientas — es un MCP que cualquier IA
   puede usar para operar tu stack completo.
───────────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  {
    label: "IA & Modelos",
    color: "#a78bfa",
    integrations: [
      { name: "Claude",      logo: "/logos/claude.svg" },
      { name: "OpenAI",      logo: "/logos/openai.svg" },
      { name: "Gemini",      logo: "/logos/gemini.svg" },
      { name: "Grok",        logo: "/logos/grok.svg" },
      { name: "DeepSeek",    logo: "/logos/deepseek.svg" },
      { name: "OpenRouter",  logo: "/logos/openrouter.svg" },
    ],
  },
  {
    label: "Infraestructura",
    color: "#22d3ee",
    integrations: [
      { name: "Vercel",    logo: "/logos/vercel.svg" },
      { name: "Neon",      logo: "/logos/neon.svg" },
      { name: "Hetzner",   logo: "/logos/hetzner.svg" },
      { name: "Railway",   logo: "/logos/railway.svg" },
      { name: "GitHub",    logo: "/logos/github.svg" },
    ],
  },
  {
    label: "Auth & Usuarios",
    color: "#818cf8",
    integrations: [
      { name: "Clerk",      logo: "/logos/clerk.svg" },
      { name: "Google",     logo: "/logos/google.svg" },
      { name: "Apple",      logo: "/logos/apple.svg" },
    ],
  },
  {
    label: "Pagos",
    color: "#34d399",
    integrations: [
      { name: "Stripe",        logo: "/logos/stripe.svg" },
      { name: "MercadoPago",   logo: "/logos/mercadopago.svg" },
      { name: "PayPal",        logo: "/logos/paypal.svg" },
    ],
  },
  {
    label: "Comunicación",
    color: "#fb923c",
    integrations: [
      { name: "Twilio",     logo: "/logos/twilio.svg" },
      { name: "Resend",     logo: "/logos/resend.svg" },
      { name: "WhatsApp",   logo: "/logos/whatsapp.svg" },
      { name: "Gmail",      logo: "/logos/gmail.svg" },
      { name: "Slack",      logo: "/logos/slack.svg" },
    ],
  },
  {
    label: "Productividad & CRM",
    color: "#f472b6",
    integrations: [
      { name: "HubSpot",   logo: "/logos/hubspot.svg" },
      { name: "Airtable",  logo: "/logos/airtable.svg" },
      { name: "ClickUp",   logo: "/logos/clickup.svg" },
      { name: "Calendly",  logo: "/logos/calendly.svg" },
    ],
  },
];

const PAIN_POINTS = [
  {
    before: "Abres 12 tabs para revisar un proyecto",
    after:  "V te da el estado de todo en un mensaje",
  },
  {
    before: "Pegas API keys en Notion, Slack o texto plano",
    after:  "Vault cifrado — una sola fuente de verdad",
  },
  {
    before: "Tu IA favorita no sabe nada de tu stack",
    after:  "VForge es MCP: cualquier IA opera tu infra",
  },
  {
    before: "Replit/Bubble: app bonita pero stack ajeno",
    after:  "VForge: el código, la DB y el dominio son tuyos",
  },
];

export function Integraciones() {
  return (
    <section
      id="integraciones"
      className="border-b py-20 md:py-28"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "var(--color-void)" }}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest" style={{ color: "#a78bfa" }}>
            Stack unificado
          </p>
          <h2
            className="font-display font-bold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", color: "#f0ecff" }}
          >
            Un MCP que conecta
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            > todo tu stack.
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
            VForge no es una app más — es el servidor MCP que cualquier IA puede usar
            para operar tu infraestructura. Claude, GPT, Gemini o Grok pueden deployar,
            leer logs, gestionar secrets y crear proyectos por ti.
          </p>
        </motion.div>

        {/* ── Pain points ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {PAIN_POINTS.map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="mb-2 text-[13px] line-through" style={{ color: "rgba(255,255,255,0.25)" }}>
                {p.before}
              </p>
              <p className="flex items-start gap-2 text-[13px]" style={{ color: "#e8e4ff" }}>
                <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                {p.after}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ── Integraciones por categoría ── */}
        <div className="space-y-10">
          {CATEGORIES.map((cat, ci) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: ci * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                className="mb-4 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: cat.color }}
              >
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.integrations.map((intg) => (
                  <div
                    key={intg.name}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}33`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <div className="relative h-5 w-5 shrink-0">
                      <Image
                        src={intg.logo}
                        alt={intg.name}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {intg.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── MCP callout ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 overflow-hidden rounded-2xl p-8 md:p-10"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(34,211,238,0.04) 100%)",
            border: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: "#22d3ee" }}>
                VForge como MCP
              </p>
              <h3 className="font-display text-[1.4rem] font-bold" style={{ color: "#f0ecff" }}>
                Conecta Claude, GPT o Grok a tu infraestructura real.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
                Un endpoint MCP. Tu IA favorita puede deployar a Vercel, crear ramas
                en GitHub, leer secrets del Vault y gestionar tu DB de Neon —
                sin que tú abras una sola terminal.
              </p>
            </div>
            <a
              href="/mcp"
              className="shrink-0 rounded-xl px-6 py-3 text-[14px] font-semibold transition-all"
              style={{
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                color: "#c4b5fd",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.15)";
              }}
            >
              Ver docs MCP →
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
