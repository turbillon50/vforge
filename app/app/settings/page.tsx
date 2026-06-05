"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  CreditCard,
  Receipt,
  Bell,
  Palette,
  ShieldCheck,
  KeyRound,
  Globe2,
  Download,
  ExternalLink,
  ChevronRight,
  LayoutDashboard,
  Map,
  Layers,
  Boxes,
  Bell as BellIcon,
} from "lucide-react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";

type SectionId =
  | "profile"
  | "plan"
  | "billing"
  | "invoices"
  | "notifications"
  | "appearance"
  | "security"
  | "api";

const SECTIONS: { id: SectionId; icon: typeof User }[] = [
  { id: "profile", icon: User },
  { id: "plan", icon: ShieldCheck },
  { id: "billing", icon: CreditCard },
  { id: "invoices", icon: Receipt },
  { id: "notifications", icon: Bell },
  { id: "appearance", icon: Palette },
  { id: "security", icon: KeyRound },
  { id: "api", icon: Globe2 },
];

export default function SettingsPage() {
  const t = useT();
  const [active, setActive] = useState<SectionId>("profile");

  return (
    <>
      <PageHeader
        eyebrow={t.settings.eyebrow}
        title={t.settings.title}
        description={t.settings.body}
      />

      <div className="grid grid-cols-1 gap-6 px-5 py-6 md:grid-cols-[220px_1fr] md:px-8">
        {/* Tabs */}
        <aside className="md:sticky md:top-4 md:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition shrink-0",
                  active === s.id
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30"
                    : "text-on-surface-variant hover:bg-tint-2 hover:text-on-surface",
                )}
              >
                <s.icon size={14} />
                <span>{t.settings.tabs[s.id]}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Panel */}
        <section className="min-w-0">
          {active === "profile" && <ProfilePanel />}
          {active === "plan" && <PlanPanel />}
          {active === "billing" && <BillingPanel />}
          {active === "invoices" && <InvoicesPanel />}
          {active === "notifications" && <NotificationsPanel />}
          {active === "appearance" && <AppearancePanel />}
          {active === "security" && <SecurityPanel />}
          {active === "api" && <ApiPanel />}
          <McpCard />
          <MoreToolsCard />
        </section>
      </div>
    </>
  );
}

function McpCard() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = "https://vforge.site/api/mcp";
  async function gen() {
    setLoading(true);
    try {
      const r = await fetch("/api/mcp/token", { method: "POST" });
      const d = await r.json();
      if (d.token) setToken(d.token);
    } finally {
      setLoading(false);
    }
  }
  const config = token
    ? JSON.stringify({ name: "VForge", url, headers: { Authorization: `Bearer ${token}` } }, null, 2)
    : "";
  return (
    <Card title="VForge MCP">
      <p className="text-[13px] leading-relaxed text-on-surface-variant">
        Conecta v0, Claude o Cursor a VForge por MCP. Genera tu token (se muestra una sola vez),
        pégalo en tu cliente y usa el método de VForge desde ahí.
      </p>
      {!token ? (
        <button
          type="button"
          onClick={gen}
          disabled={loading}
          className="mt-4 flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 text-[14px] font-medium text-white shadow-glow-violet transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar token MCP"}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted">URL del servidor</p>
            <code className="mt-1 block rounded-lg border border-app bg-tint-1 px-3 py-2 font-mono text-[12px] text-on-surface">{url}</code>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted">Tu token (guárdalo ahora, no se vuelve a mostrar)</p>
            <code className="mt-1 block break-all rounded-lg border border-violet-400/30 bg-violet-500/[0.06] px-3 py-2 font-mono text-[12px] text-violet-200">{token}</code>
          </div>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(config); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex h-11 items-center justify-center rounded-xl border border-app bg-tint-1 px-5 text-[14px] text-on-surface transition active:scale-[0.98] hover:border-app-strong"
          >
            {copied ? "Copiado ✓" : "Copiar config para v0"}
          </button>
        </div>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-app bg-tint-1 p-5">
      <h3 className="font-display text-sm font-semibold text-on-surface">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="label-caps mb-1.5 block text-muted">{label}</label>
      <input
        type="text"
        defaultValue={value ?? ""}
        placeholder={placeholder ?? ""}
        className="w-full rounded-md border border-app bg-void px-3 py-2 text-sm text-on-surface placeholder:text-muted focus:border-violet-500/40 focus:outline-none"
        style={{ fontSize: 16, touchAction: "manipulation" }}
      />
    </div>
  );
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-app bg-void px-3 py-2.5 hover:border-app-strong">
      <span className="text-sm text-on-surface">{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-violet-500" />
    </label>
  );
}

function ProfilePanel() {
  return (
    <>
      <Card title="Tu identidad como operador">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
          <div>
            <p className="font-display text-lg font-semibold text-on-surface">
              Luis de la Torre Herrera
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              operator_luis · turbillon50
            </p>
          </div>
        </div>
        <Field label="Nombre" value="Luis de la Torre Herrera" />
        <Field label="Email" placeholder="luis@allglobal.ec" />
        <Field label="Usuario GitHub" value="turbillon50" />
        <button className="btn-primary mt-2 !px-4 !py-2">Guardar cambios</button>
      </Card>

      <Card title="Empresa">
        <Field label="Razón social" value="All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V." />
        <Field label="País fiscal" value="México · Estados Unidos" />
      </Card>
    </>
  );
}

function PlanPanel() {
  const [me, setMe] = useState<{
    plan: string;
    status: string | null;
    current_period_end: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const planNames: Record<string, string> = {
    free: "Free",
    studio: "Studio",
    forge: "Forge",
    payg: "Pay-as-you-go",
  };
  const plan = me?.plan ?? "free";
  const nextCharge = me?.current_period_end
    ? new Date(me.current_period_end).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Card title="Tu plan">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Consultando tu plan…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-500/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-violet-300 ring-1 ring-violet-500/30">
              {planNames[plan] ?? plan}
            </span>
            {me?.status && (
              <span className="chip text-success-emerald">{me.status}</span>
            )}
            {nextCharge && (
              <span className="text-[12px] tabular-nums text-on-surface-variant">
                Próximo cobro: {nextCharge}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {plan === "free" ? (
            <Link
              href="/pricing"
              className="btn-primary !px-4 !py-2"
              style={{ minHeight: 44, touchAction: "manipulation" }}
            >
              Subir de plan
            </Link>
          ) : (
            <a
              href="/api/billing/portal"
              className="btn-primary !px-4 !py-2"
              style={{ minHeight: 44, touchAction: "manipulation" }}
            >
              <CreditCard size={14} /> Gestionar suscripción
            </a>
          )}
          <Link
            href="/pricing"
            className="btn-ghost !px-4 !py-2"
            style={{ minHeight: 44, touchAction: "manipulation" }}
          >
            Ver planes
          </Link>
        </div>
      </Card>

      <Card title="Uso este mes">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Proyectos" value="—" />
          <Stat label="Tokens V" value="—" />
          <Stat label="Deploys" value="—" />
          <Stat label="Sub-agentes" value="—" />
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Cuando V conecte el contador real, estos valores se actualizan en vivo.
        </p>
      </Card>
    </>
  );
}

function BillingPanel() {
  return (
    <>
      <Card title="Método de pago">
        <div className="rounded-md border border-app bg-void p-4">
          <p className="text-sm text-on-surface">No hay tarjeta registrada.</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Cuando habilitemos Stripe en producción, podrás agregar tu método de pago aquí.
          </p>
          <button className="btn-primary mt-3 !px-3 !py-1.5 text-[12px]">
            <CreditCard size={13} /> Agregar tarjeta
          </button>
        </div>
      </Card>

      <Card title="Dirección de facturación">
        <Field label="Razón social" placeholder="All Global Holding LLC" />
        <Field label="RFC / Tax ID" placeholder="—" />
        <Field label="Dirección" placeholder="Calle, número, colonia" />
        <Field label="Ciudad" placeholder="" />
        <Field label="País" placeholder="México" />
        <button className="btn-ghost mt-2 !px-3 !py-1.5 text-[12px]">Guardar</button>
      </Card>
    </>
  );
}

function InvoicesPanel() {
  const invoices: { id: string; date: string; amount: string; status: "paid" | "due" }[] = [];

  return (
    <Card title="Historial de facturas">
      {invoices.length === 0 ? (
        <div className="rounded-md border border-app bg-void p-6 text-center">
          <Receipt className="mx-auto mb-2 text-violet-300" size={20} />
          <p className="text-sm text-on-surface">Aún no hay facturas emitidas</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Cuando empieces a operar en plan pago, tus facturas aparecen aquí en
            PDF + opción a descargar.
          </p>
        </div>
      ) : (
        <ul>
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 border-b border-app py-3 last:border-0"
            >
              <div>
                <p className="font-mono text-[13px] text-on-surface">{inv.id}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {inv.date}
                </p>
              </div>
              <span className="font-display font-semibold text-on-surface">
                {inv.amount}
              </span>
              <span
                className={
                  inv.status === "paid"
                    ? "chip text-success-emerald"
                    : "chip text-cyber-cyan"
                }
              >
                {inv.status}
              </span>
              <button className="rounded-md border border-app p-2 text-on-surface-variant hover:bg-tint-2 hover:text-on-surface">
                <Download size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotificationsPanel() {
  return (
    <Card title="Notificaciones">
      <Toggle label="V terminó una tarea importante" defaultChecked />
      <Toggle label="Build de producción falló" defaultChecked />
      <Toggle label="Deploy completado" />
      <Toggle label="Secreto a punto de expirar" defaultChecked />
      <Toggle label="Resumen semanal por email" />
      <Toggle label="Push del navegador" />
    </Card>
  );
}

function AppearancePanel() {
  return (
    <>
      <Card title="Tema">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Cambia entre modo día y noche. Se guarda en tu navegador.
        </p>
        <ThemeToggle />
      </Card>

      <Card title="Idioma">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Selecciona el idioma de la interfaz.
        </p>
        <LocaleToggle />
      </Card>
    </>
  );
}

function SecurityPanel() {
  return (
    <>
      <Card title="Operator token (vault)">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Token Bearer para desbloquear la bóveda de secretos en este navegador.
          Cuando aterrice Clerk con cableado real al user_id, este token migra
          a sesión Clerk.
        </p>
        <div className="rounded-md border border-app bg-void p-3 font-mono text-[11px] text-on-surface-variant">
          Configurado vía /app/secrets → Unlock vault
        </div>
      </Card>

      <Card title="Sesiones activas">
        <p className="text-[12px] text-on-surface-variant">
          Hoy la sesión se identifica con operator_luis hardcoded. Próximamente:
          lista de devices con timestamps + revoke individual.
        </p>
      </Card>

      <Card title="Two-factor authentication">
        <p className="text-[12px] text-on-surface-variant">
          Llegará junto con Clerk (M11). Hoy V ejecuta directo y el audit log
          registra cada acción; las irreversibles las avisa en el chat. Sin 2FA
          adicional todavía.
        </p>
      </Card>
    </>
  );
}

function ApiPanel() {
  return (
    <>
      <Card title="Dominios conectados">
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-md border border-app bg-void px-3 py-2">
            <span className="font-mono text-[13px] text-on-surface">vforge.site</span>
            <span className="chip text-success-emerald">activo</span>
          </li>
        </ul>
        <button className="btn-ghost mt-3 !px-3 !py-1.5 text-[12px]">
          <Globe2 size={13} /> Conectar dominio
        </button>
      </Card>

      <Card title="API & integraciones">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Las claves de tus integraciones viven encriptadas en{" "}
          <a href="/app/secrets" className="text-cyber-cyan hover:underline">
            /app/secrets
          </a>{" "}
          (AES-256-GCM). V las usa para operar sin que tengas que copiarlas.
        </p>
        <a
          href="https://github.com/turbillon50/vforge/blob/main/docs/backend-contract.md"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cyber-cyan hover:underline"
        >
          <ExternalLink size={13} /> Contrato del backend (docs)
        </a>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-app bg-void p-3">
      <p className="label-caps text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}


function MoreToolsCard() {
  const tools = [
    { href: "/app/cockpit", label: "Centro de Mando", icon: LayoutDashboard },
    { href: "/app/blueprint", label: "Blueprint", icon: Map },
    { href: "/app/marketplace", label: "Marketplace", icon: Layers },
    { href: "/app/integrations", label: "Integraciones", icon: Boxes },
    { href: "/app/secrets", label: "Bóveda", icon: ShieldCheck },
    { href: "/app/activity", label: "Actividad", icon: BellIcon },
  ];
  return (
    <Card title="Más herramientas">
      <div className="-mx-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface"
            style={{ minHeight: 44, touchAction: "manipulation" }}
          >
            <tool.icon size={15} className="text-violet-300" />
            <span className="flex-1">{tool.label}</span>
            <ChevronRight size={13} className="text-muted" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
