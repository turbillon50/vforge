
import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Instalar VForge MCP — Documentación",
  description: "Conecta Claude Desktop con VForge en 5 minutos. Guía oficial de instalación del Model Context Protocol de VForge.",
};

const STEPS = [
  {
    n: "01",
    title: "Crea tu cuenta",
    body: "Regístrate gratis en vforge.site. No necesitas tarjeta de crédito.",
    code: null,
    cta: { label: "Crear cuenta →", href: "/sign-up" },
  },
  {
    n: "02",
    title: "Obtén tu token MCP",
    body: "En tu dashboard → Configuración → Token MCP. El token empieza con vfmcp_",
    code: `// Tu token se ve así:
vfmcp_10731b2b8eee26a32b8dc97d855b...`,
    cta: null,
  },
  {
    n: "03",
    title: "Edita claude_desktop_config.json",
    body: "Abre Claude Desktop → Configuración → Desarrollador → Editar configuración. Agrega el bloque:",
    code: `{
  "mcpServers": {
    "vforge": {
      "url": "https://vforge.site/api/mcp",
      "headers": {
        "Authorization": "Bearer TU_TOKEN_AQUI"
      }
    }
  }
}`,
    cta: null,
  },
  {
    n: "04",
    title: "Reinicia Claude Desktop",
    body: "Cierra completamente y vuelve a abrir. Verás el ícono de VForge en la barra de herramientas MCP.",
    code: null,
    cta: null,
  },
  {
    n: "05",
    title: "Prueba la conexión",
    body: "Escribe esto en Claude y verás tus proyectos reales:",
    code: `// En Claude Desktop:
"Lista mis proyectos de VForge"

// Respuesta esperada:
→ istore-pro (TypeScript · Vercel · producción)
→ happytoc.life (TypeScript · Vercel · producción)
→ ruta618.life (TypeScript · Vercel · preview)
...`,
    cta: null,
  },
];

const TOOLS = [
  { name: "list_projects", desc: "Lista todos tus proyectos con estado, tecnologías y URL" },
  { name: "get_project", desc: "Detalle completo de un proyecto: repo, DB y variables de entorno" },
  { name: "create_project", desc: "Crea un nuevo proyecto en la base de datos de VForge" },
  { name: "trigger_deploy", desc: "Triggerear deploy en Vercel para un proyecto" },
  { name: "get_deploy_status", desc: "Estado actual del último despliegue" },
  { name: "list_deployments", desc: "Historial de despliegues con URLs de preview" },
  { name: "generate_contract", desc: "Genera contrato-compendio .docx para un cliente" },
  { name: "get_blueprint", desc: "Obtiene el blueprint visual de un proyecto" },
  { name: "update_scope", desc: "Actualiza el alcance y funciones de un proyecto" },
  { name: "list_integrations", desc: "Integraciones activas: Clerk, Stripe, Neon, Resend" },
  { name: "get_workspace", desc: "Accede al workspace del proyecto en VForge" },
  { name: "create_task", desc: "Crea una tarea en la cola de dispatch" },
  { name: "get_credentials_registry", desc: "Consulta qué credenciales están configuradas" },
  { name: "send_notification", desc: "Envía notificación al cliente vía Resend" },
];

const SAVINGS = [
  { pct: "40%", label: "Reducción en consumo de tokens", desc: "El contexto comprimido de VForge elimina relectura de archivos." },
  { pct: "70%", label: "Menos turnos por tarea", desc: "V conoce tu stack técnico. No necesita 5 preguntas para entender el contexto." },
  { pct: "8min", label: "Scaffold de proyecto nuevo", desc: "Repo + Neon + Vercel + Clerk configurados en una sola conversación." },
  { pct: "30s", label: "Generar contrato completo", desc: "Compendio editorial + legal + técnico en 30 segundos." },
];

export default function MCPDocsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pb-32 pt-24">

        {/* ── HERO ── */}
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/8 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300">
              Model Context Protocol · VForge
            </span>
          </div>
          <h1 className="text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
            Conecta Claude Desktop<br />
            <span className="bg-gradient-to-r from-violet-400 to-violet-400 bg-clip-text text-transparent">
              con tu fábrica de apps.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[1rem] font-light leading-relaxed text-[var(--fg-tertiary)]">
            VForge MCP expone 14 herramientas que permiten a Claude operar tu infraestructura real.
            Proyectos, despliegues, contratos y más — desde cualquier conversación.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-emerald-400">
              Ahorra hasta 40% en consumo de tokens bajo el Método VForge
            </span>
          </div>
        </div>

        {/* ── SAVINGS CARDS ── */}
        <div className="mx-auto mt-16 max-w-4xl px-5">
          <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Lo que cambia cuando instalas VForge MCP
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {SAVINGS.map((s) => (
              <div
                key={s.pct}
                className="relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white/[0.025] p-5 text-center"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/15 to-transparent" />
                <p className="text-[2rem] font-bold leading-none tracking-tight text-white">{s.pct}</p>
                <p className="mt-2 text-[11px] font-semibold text-[var(--fg-secondary)]">{s.label}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--fg-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── INSTALLATION STEPS ── */}
        <div className="mx-auto mt-20 max-w-2xl px-5">
          <p className="mb-10 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Instalación — 5 minutos
          </p>
          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[19px] top-10 h-full w-px bg-gradient-to-b from-violet-500/30 to-transparent" />
                )}
                <div className="flex gap-5">
                  {/* Number */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/8 font-mono text-[12px] font-bold text-violet-400">
                    {step.n}
                  </div>
                  <div className="flex-1 pb-2">
                    <h3 className="font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-tertiary)]">{step.body}</p>
                    {step.code && (
                      <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-4 font-mono text-[12px] leading-relaxed text-emerald-300/80">
                        {step.code}
                      </pre>
                    )}
                    {step.cta && (
                      <Link
                        href={step.cta.href}
                        className="mt-3 inline-flex items-center rounded-lg border border-violet-500/30 bg-violet-500/8 px-4 py-2 font-mono text-[12px] text-violet-400 transition-all hover:bg-violet-500/15"
                      >
                        {step.cta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 14 TOOLS ── */}
        <div className="mx-auto mt-24 max-w-4xl px-5">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)] mb-1">
                Herramientas disponibles
              </p>
              <h2 className="text-2xl font-bold text-white">14 herramientas reales</h2>
            </div>
            <span className="font-mono text-[11px] text-[var(--fg-muted)]">{TOOLS.length} herramientas</span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="group flex items-start gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 transition-all hover:border-violet-500/25 hover:bg-violet-500/4"
              >
                <code className="mt-0.5 shrink-0 rounded-lg bg-violet-500/12 px-2 py-0.5 font-mono text-[11px] text-violet-400">
                  {tool.name}
                </code>
                <p className="text-[12px] text-[var(--fg-tertiary)] leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── EJEMPLO DE USO ── */}
        <div className="mx-auto mt-24 max-w-2xl px-5">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Ejemplo real de conversación con MCP activo
          </p>
          <div className="space-y-3">
            {[
              { from: "user", text: "Lista mis proyectos activos en VForge" },
              { from: "v", text: "Encontré 17 proyectos. Los 3 más recientes: istore-pro (producción · Vercel), happytoc.life (producción · Vercel), ruta618.life (preview · Vercel). ¿Quieres detalle de alguno?" },
              { from: "user", text: "Genera el contrato para el cliente Hilda, proyecto happytoc.life, $8,000 MXN con anticipo de $2,000" },
              { from: "v", text: "Generando contrato-compendio... ✓ Contrato generado: happytoc-hilda-2026.docx — incluye portada, guía del proceso, stack técnico, variables de entorno y contrato legal con cláusula de transferencia IP." },
              { from: "user", text: "Triggerear deploy de ruta618 en Vercel" },
              { from: "v", text: "✓ Despliegue disparado — ID: dpl_8kQm... · Estado: construyendo · Verás el resultado en ~45 segundos en ruta618.life" },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start gap-2.5"}`}>
                {msg.from === "v" && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-500 text-[10px]">
                    ⚡
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.from === "user"
                      ? "bg-gradient-to-br from-violet-600 to-violet-500 text-white"
                      : "border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA FINAL ── */}
        <div className="mx-auto mt-24 max-w-xl px-5 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/8 to-transparent p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/60 mb-3">
              Empieza ahora
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">
              Tu primera conversación operacional
            </h2>
            <p className="text-sm text-[var(--fg-tertiary)] mb-6">
              Crea tu cuenta, instala el MCP y dile a Claude que liste tus proyectos.
              Todo en menos de 5 minutos.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/sign-up" prefetch={false}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-4 text-sm font-semibold text-white shadow-[0_8px_40px_rgba(124,58,237,0.4)]"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/mcp#docs"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] py-4 text-sm text-[var(--fg-tertiary)] transition-all hover:text-[var(--fg-primary)]"
              >
                Leer qué es MCP primero
              </Link>
            </div>
          </div>
        </div>

      </main>
      <MarketingFooter />
    </>
  );
}
