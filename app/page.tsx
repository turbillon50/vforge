import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    label: "AI Copilot",
    title: "Habla con V. Construye más rápido.",
    desc: "Acceso directo a repos, deployments, DNS y secrets. Sin cambiar de contexto.",
    code: `// V conoce tu stack completo
await v.run("Deploy crede-ti a producción");
// → crea PR, corre build, asigna dominio`,
    accent: "#7c3aed",
  },
  {
    label: "Vault",
    title: "Secrets organizados por proyecto.",
    desc: "Una fuente de verdad para API keys, tokens y variables. Accesible desde cualquier agente.",
    code: `const key = await vault.get("STRIPE_KEY", {
  project: "crede-ti",
  env: "production",
});`,
    accent: "#2563eb",
  },
  {
    label: "Automations",
    title: "Flows, crons y bridges.",
    desc: "WhatsApp inbound, crons de mantenimiento, bridges con Vercel y GitHub.",
    code: `flow.on("deploy:success", async (ctx) => {
  await notify.whatsapp(ctx.owner, ctx.url);
});`,
    accent: "#059669",
  },
];

const STEPS = [
  { n: "01", title: "Crea tu cuenta", desc: "Sign up en segundos. Sin tarjeta de crédito." },
  { n: "02", title: "Conecta tus herramientas", desc: "GitHub, Vercel, Stripe — un clic por integración." },
  { n: "03", title: "Trabaja con V", desc: "Tu AI copilot ya conoce todos tus proyectos." },
];

export default async function HomePage() {
  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      const { userId } = await auth();
      if (userId) redirect("/forge");
    }
  } catch {
    // Clerk no disponible — mostrar landing
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e5e5", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(10,10,15,0.95)", backdropFilter: "blur(8px)", zIndex: 100 }}>
        <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>VForge</span>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {["Docs", "Pricing", "Changelog"].map((l) => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: "13px", color: "#555", textDecoration: "none" }}>{l}</Link>
          ))}
          <Link href="/sign-in" style={{ fontSize: "13px", color: "#888", textDecoration: "none" }}>Sign in</Link>
          <Link href="/sign-up" style={{ fontSize: "13px", fontWeight: 500, color: "#000", background: "#e5e5e5", padding: "6px 14px", borderRadius: "6px", textDecoration: "none" }}>Get started</Link>
        </div>
      </nav>
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "100px 32px 80px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", fontSize: "11px", color: "#555", fontFamily: "monospace", marginBottom: "32px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7c3aed" }} />
          v2.0 — Ahora con V copilot integrado
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff", margin: "0 0 20px" }}>
          La plataforma para<br />
          <span style={{ color: "#555" }}>desarrolladores serios.</span>
        </h1>
        <p style={{ fontSize: "17px", color: "#555", lineHeight: 1.6, maxWidth: "520px", margin: "0 0 40px" }}>
          Gestiona proyectos, conversa con tu AI copilot, controla secrets y automatiza deployments — todo desde un solo workspace.
        </p>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href="/sign-up" style={{ fontSize: "14px", fontWeight: 500, color: "#000", background: "#e5e5e5", padding: "9px 20px", borderRadius: "8px", textDecoration: "none" }}>Empieza gratis</Link>
          <Link href="/docs" style={{ fontSize: "14px", color: "#444", textDecoration: "none" }}>Ver documentación →</Link>
        </div>
      </section>
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        {FEATURES.map((f) => (
          <div key={f.label} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "24px", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "10px", fontFamily: "monospace", color: f.accent, letterSpacing: "0.1em", textTransform: "uppercase" as const, display: "block", marginBottom: "10px" }}>{f.label}</span>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#e5e5e5", margin: "0 0 8px" }}>{f.title}</h3>
            <p style={{ fontSize: "13px", color: "#4a4a4a", margin: "0 0 20px", lineHeight: 1.6 }}>{f.desc}</p>
            <pre style={{ fontSize: "11px", fontFamily: "monospace", background: "rgba(0,0,0,0.3)", border: `1px solid ${f.accent}22`, borderRadius: "6px", padding: "12px", color: `${f.accent}cc`, overflowX: "auto" as const, lineHeight: 1.6, margin: 0 }}>{f.code}</pre>
          </div>
        ))}
      </section>
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "0 32px 100px", textAlign: "center" as const }}>
        <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#333", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "40px" }}>Cómo funciona</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: "left" as const }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#2a2a2a", display: "block", marginBottom: "8px" }}>{s.n}</span>
              <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#ccc", margin: "0 0 6px" }}>{s.title}</h4>
              <p style={{ fontSize: "12px", color: "#444", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#222", fontFamily: "monospace" }}>VForge · All Global Holding LLC</span>
        <span style={{ fontSize: "12px", color: "#222" }}>vforge.site</span>
      </footer>
    </div>
  );
}
