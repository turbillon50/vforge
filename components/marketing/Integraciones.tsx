"use client";
import { motion } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────────────────────
   Integraciones — paleta única: blanco/gris sobre negro.
   Un solo acento: violeta #7c3aed. Sin colores por categoría.
───────────────────────────────────────────────────────────────────────────── */

const INTEGRATIONS = [
  // Infra
  { name: "GitHub",       logo: "/logos/github.svg" },
  { name: "Vercel",       logo: "/logos/vercel.svg" },
  { name: "Neon",         logo: "/logos/neon.svg" },
  { name: "Hetzner",      logo: "/logos/hetzner.svg" },
  { name: "Railway",      logo: "/logos/railway.svg" },
  // IA
  { name: "Claude",       logo: "/logos/claude.svg" },
  { name: "OpenAI",       logo: "/logos/openai.svg" },
  { name: "Gemini",       logo: "/logos/gemini.svg" },
  { name: "Grok",         logo: "/logos/grok.svg" },
  { name: "DeepSeek",     logo: "/logos/deepseek.svg" },
  { name: "OpenRouter",   logo: "/logos/openrouter.svg" },
  // Auth & pagos
  { name: "Clerk",        logo: "/logos/clerk.svg" },
  { name: "Stripe",       logo: "/logos/stripe.svg" },
  { name: "MercadoPago",  logo: "/logos/mercadopago.svg" },
  { name: "PayPal",       logo: "/logos/paypal.svg" },
  // Comunicación
  { name: "Twilio",       logo: "/logos/twilio.svg" },
  { name: "Resend",       logo: "/logos/resend.svg" },
  { name: "WhatsApp",     logo: "/logos/whatsapp.svg" },
  // Productividad
  { name: "HubSpot",      logo: "/logos/hubspot.svg" },
  { name: "Airtable",     logo: "/logos/airtable.svg" },
  { name: "Slack",        logo: "/logos/slack.svg" },
  { name: "Google",       logo: "/logos/google.svg" },
];

const PAIN_POINTS = [
  { before: "Pegas API keys en Slack o Notion", after: "Vault cifrado — una sola fuente de verdad" },
  { before: "12 tabs abiertos para un solo proyecto", after: "V te da el estado de todo en un mensaje" },
  { before: "Tu IA no sabe nada de tu infraestructura", after: "VForge es MCP: cualquier IA opera tu stack" },
  { before: "Replit/Bubble: app bonita, stack ajeno", after: "El código, la DB y el dominio son tuyos" },
];

export function Integraciones() {
  return (
    <section
      id="integraciones"
      className="border-b py-24 md:py-32"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "#000" }}
    >
      <div className="mx-auto max-w-5xl px-5 md:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Stack unificado
          </p>
          <h2
            className="font-display font-bold leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#fff" }}
          >
            Un MCP que conecta
            <br />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>todo tu stack.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)", maxWidth: "480px" }}>
            VForge no es otra herramienta — es el servidor MCP que Claude, GPT,
            Gemini o Grok usan para operar tu infraestructura real sin que abras una terminal.
          </p>
        </motion.div>

        {/* Pain points */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PAIN_POINTS.map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="mb-2 text-[13px] line-through" style={{ color: "rgba(255,255,255,0.2)" }}>
                {p.before}
              </p>
              <p className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>→</span>
                {p.after}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Grid de logos — todos iguales, una sola paleta */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap gap-2"
        >
          {INTEGRATIONS.map((intg) => (
            <div
              key={intg.name}
              className="flex items-center gap-2.5 rounded-lg px-3.5 py-2 transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(255,255,255,0.06)";
                el.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(255,255,255,0.03)";
                el.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <div className="relative h-4 w-4 shrink-0">
                <Image
                  src={intg.logo}
                  alt={intg.name}
                  fill
                  sizes="16px"
                  className="object-contain"
                  style={{ filter: "brightness(0) invert(1)", opacity: 0.6 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                {intg.name}
              </span>
            </div>
          ))}
        </motion.div>

        {/* MCP callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 rounded-2xl p-8 md:p-10"
          style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.18)",
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "rgba(124,58,237,0.8)" }}>
                VForge como MCP
              </p>
              <h3 className="font-display text-[1.3rem] font-bold" style={{ color: "#fff" }}>
                Conecta Claude, GPT o Grok a tu infra real.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                Un endpoint. Tu IA favorita puede deployar, leer secrets y
                gestionar tu DB — sin abrir una terminal.
              </p>
            </div>
            <a
              href="/mcp"
              className="shrink-0 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-all"
              style={{
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "rgba(167,139,250,0.9)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)"; }}
            >
              Ver docs MCP →
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
