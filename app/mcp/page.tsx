
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MCP_TOOLS } from "@/lib/mcp/registry";
import { isPublicTool } from "@/lib/mcp/rbac";

/* El catálogo se lee del registro real del servidor MCP (lib/mcp/registry.ts),
   el mismo que responde `tools/list`. Ningún número de esta página se escribe
   a mano: si mañana se agrega o se quita una tool, esto se mueve solo. */
/** La descripción del registro está escrita para el agente (párrafos largos con
 *  instrucciones de uso). Para el catálogo humano se muestra la primera frase. */
function primeraFrase(d: string): string {
  const limpio = d.replace(/^(PÚBLICA|PUBLICA):\s*/, "").trim();
  const corte = limpio.search(/[.;]\s/);
  return corte > 20 ? limpio.slice(0, corte + 1) : limpio;
}

const TODAS = MCP_TOOLS.map((t) => ({
  name: t.name,
  desc: primeraFrase(t.description),
  publica: isPublicTool(t.name),
}));
const TOTAL_TOOLS = TODAS.length;
/* Seguridad: la página es pública. Solo se listan por nombre las tools públicas;
   las que requieren token (incluidas las internas de operación) se cuentan, nunca se nombran. */
const TOOLS = TODAS.filter((t) => t.publica);
const TOOLS_PUBLICAS = TOOLS.length;

export const metadata: Metadata = {
  title: "Instalar MCP",
  description:
    "Conecta Claude Desktop con VForge. Guía oficial de instalación del Model Context Protocol de VForge.",
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
    code: `// Formato del token (el tuyo es distinto, no lo compartas):
vfmcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
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
"Lista mis proyectos de VForge"`,
    cta: null,
  },
];

/* Qué le puedes pedir a Claude con el MCP conectado. Son las peticiones que
   cubren tools que existen en el registro; no se pinta ninguna respuesta
   inventada del agente. */
const PETICIONES = [
  { texto: "Lista mis proyectos activos en VForge", tool: "vforge_project_status" },
  { texto: "Dame el contexto del proyecto X: repo, stack y despliegue", tool: "vforge_project_context" },
  { texto: "Dispara el despliegue del proyecto X", tool: "vforge_deploy" },
  { texto: "Crea el repositorio del proyecto X", tool: "vforge_create_repo" },
  { texto: "¿Cómo están de salud mis apps?", tool: "vforge_apps_health" },
  { texto: "¿Qué integraciones me faltan para cobrar con Stripe?", tool: "vforge_integration_plan" },
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
            <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-violet-300">
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
            VForge MCP expone {TOTAL_TOOLS} herramientas que permiten a Claude operar tu
            infraestructura real. Proyectos, despliegues, contratos y más — desde cualquier
            conversación.
          </p>
        </div>

        {/* ── INSTALLATION STEPS ── */}
        <div className="mx-auto mt-20 max-w-2xl px-5">
          <p className="mb-10 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Instalación
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
                  <div className="min-w-0 flex-1 pb-2">
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

        {/* ── HERRAMIENTAS (del registro real del servidor MCP) ── */}
        <div className="mx-auto mt-24 max-w-4xl px-5">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--fg-muted)] mb-1">
                Herramientas disponibles
              </p>
              <h2 className="text-2xl font-bold text-white">{TOTAL_TOOLS} herramientas</h2>
            </div>
            <span className="font-mono text-[12px] text-[var(--fg-muted)]">
              {TOOLS_PUBLICAS} a la vista · {TOTAL_TOOLS - TOOLS_PUBLICAS} más al conectar tu token
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 transition-all hover:border-violet-500/25 hover:bg-violet-500/4"
              >
                <code className="mt-0.5 shrink-0 rounded-lg bg-violet-500/12 px-2 py-0.5 font-mono text-[12px] text-violet-400">
                  {tool.name}
                </code>
                <p className="min-w-0 break-words text-[12px] text-[var(--fg-tertiary)] leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUÉ PEDIRLE ── */}
        <div className="mx-auto mt-24 max-w-2xl px-5">
          <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Qué le puedes pedir con el MCP conectado
          </p>
          <p className="mb-6 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            La respuesta la da tu propia infraestructura, con tus datos. Aquí solo van las
            peticiones; lo que conteste depende de lo que tengas en tu cuenta.
          </p>
          <div className="space-y-3">
            {PETICIONES.map((p) => (
              <div key={p.tool} className="flex justify-end">
                <div className="max-w-[82%] rounded-xl bg-gradient-to-br from-violet-600 to-violet-500 px-4 py-2.5 text-[13px] leading-relaxed text-white">
                  {p.texto}
                  <span className="mt-1 block font-mono text-[12px] text-white/70">{p.tool}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA FINAL ── */}
        <div className="mx-auto mt-24 max-w-xl px-5 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/8 to-transparent p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <p className="font-mono text-[12px] uppercase tracking-widest text-violet-400/60 mb-3">
              Empieza ahora
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">
              Tu primera conversación operacional
            </h2>
            <p className="text-sm text-[var(--fg-tertiary)] mb-6">
              Crea tu cuenta, instala el MCP y dile a Claude que liste tus proyectos.
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
