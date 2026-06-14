"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBell, IconBoxes, IconChevR, IconCreditCard, IconDownload, IconExtLink, IconFile, IconGlobe, IconKey, IconLayers, IconMap, IconShield, IconSparkles, IconUsers } from "@/components/brand/VFIcons";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/AppProviders";
import { useUser, useReverification, useClerk } from "@clerk/nextjs";
import { TokenReconnectCard } from "@/components/workspace/TokenHealth";
import DesignCanvas from "@/components/workspace/DesignCanvas";

type SectionId =
  | "profile"
  | "plan"
  | "billing"
  | "invoices"
  | "notifications"
  | "appearance"
  | "security"
  | "api";

const SECTIONS: { id: SectionId; icon: typeof IconUsers }[] = [
  { id: "profile", icon: IconUsers },
  { id: "plan", icon: IconShield },
  { id: "billing", icon: IconCreditCard },
  { id: "invoices", icon: IconFile },
  { id: "notifications", icon: IconBell },
  { id: "appearance", icon: IconSparkles },
  { id: "security", icon: IconKey },
  { id: "api", icon: IconGlobe },
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
          <TokenReconnectCard />
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
            <Link href="/pricing"
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
              <IconCreditCard size={14} /> Gestionar suscripción
            </a>
          )}
          <Link href="/pricing"
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
            <IconCreditCard size={13} /> Agregar tarjeta
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
          <IconFile className="mx-auto mb-2 text-violet-300" size={20} />
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
                <IconDownload size={13} />
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
  const { user, isLoaded } = useUser();
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? "";
  const isOwner = true; // Canvas visible para Owner autenticado

  return (
    <>
      {isOwner && (
        <Card title="Canvas de Diseno">
          <DesignCanvas />
        </Card>
      )}

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
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const [passkeyStatus, setPasskeyStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [passkeyMsg, setPasskeyMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPasskeys: { id: string; name?: string }[] = ((user as any)?.passkeys ?? []).map((p: any) => ({ id: p.id, name: p.name }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPasskeyWithReverify = useReverification(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (user as any)!.createPasskey()
  );

  async function addPasskey() {
    setPasskeyStatus("loading");
    setPasskeyMsg("");
    try {
      if (!user) throw new Error("Sesión no disponible — recarga la página");
      await createPasskeyWithReverify();
      setPasskeyStatus("done");
      setPasskeyMsg("✓ Passkey creada y registrada en este dispositivo");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("cancel")) {
        setPasskeyStatus("idle");
        setPasskeyMsg("");
        return;
      }
      // Si falla por reverificación, abrir el portal nativo de Clerk
      // donde el flujo de passkey + reverificación funciona garantizado
      if (msg.includes("additional verification") || msg.includes("reverification") || msg.includes("verification")) {
        setPasskeyStatus("idle");
        setPasskeyMsg("");
        clerk.openUserProfile();
        return;
      }
      // Passkey ya existe = no es error, ya está activo
      if (msg.includes("already_exists") || msg.includes("already exists") || msg.includes("invalid state")) {
        setPasskeyStatus("done");
        setPasskeyMsg("✓ Ya tienes un passkey activo en este dispositivo");
        return;
      }
      setPasskeyStatus("error");
      if (msg.includes("not supported") || msg.includes("NotSupported")) {
        setPasskeyMsg("Este dispositivo o navegador no soporta passkeys.");
      } else {
        setPasskeyMsg(msg.slice(0, 140));
      }
    }
  }

  return (
    <>
      <Card title="Passkey (Face ID / Touch ID)">
        <p className="mb-4 text-[12px] text-on-surface-variant leading-relaxed">
          Inicia sesión con tu huella, Face ID o llave de seguridad física.
          Sin contraseña, sin SMS. Solo tú y tu dispositivo.
        </p>
        {passkeyStatus === "done" ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-400">
            {passkeyMsg}
          </div>
        ) : passkeyStatus === "error" ? (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            {passkeyMsg}
          </div>
        ) : null}
        {existingPasskeys.length > 0 && (
          <div className="mb-3 space-y-2">
            {existingPasskeys.map((pk) => (
              <div key={pk.id} className="flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
                <IconKey size={14} className="text-emerald-400 shrink-0" />
                <p className="min-w-0 flex-1 text-[13px] text-on-surface truncate">{pk.name || "Passkey de este dispositivo"}</p>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide shrink-0">activo</span>
              </div>
            ))}
          </div>
        )}
        {passkeyStatus !== "done" && (
          <div className="flex flex-col gap-2">
            <button
              onClick={addPasskey}
              disabled={passkeyStatus === "loading"}
              className="btn-primary !px-4 !py-2 text-[13px] disabled:opacity-50"
              style={{ minHeight: 44, touchAction: "manipulation" }}
            >
              <IconKey size={14} />
              {passkeyStatus === "loading" ? "Activando…" : existingPasskeys.length > 0 ? "Agregar otro dispositivo" : "Agregar Passkey a este dispositivo"}
            </button>
            <button
              onClick={() => clerk.openUserProfile()}
              className="text-[12px] text-violet-300/70 hover:text-violet-300 transition text-left"
              style={{ minHeight: 36, touchAction: "manipulation" }}
            >
              ¿Problemas? Administra passkeys en tu perfil de seguridad →
            </button>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Puedes agregar múltiples dispositivos. Cada uno se registra por separado.
        </p>
      </Card>

      <Card title="Sesiones activas">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Gestiona tus sesiones y dispositivos conectados.
        </p>
        <button
          onClick={() => clerk.openUserProfile()}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/8 px-4 py-2 text-sm text-violet-300 transition hover:bg-violet-500/15"
          style={{ minHeight: 44, touchAction: "manipulation" }}
        >
          <IconShield size={14} /> Ver sesiones y dispositivos
        </button>
      </Card>

      <Card title="Bóveda de secretos">
        <p className="mb-3 text-[12px] text-on-surface-variant">
          Tus API keys viven encriptadas con AES-256-GCM. Solo tú puedes descifrarlas.
        </p>
        <Link
          href="/app/secrets"
          className="inline-flex items-center gap-2 rounded-lg border border-app bg-tint-1 px-4 py-2 text-sm text-on-surface transition hover:bg-tint-2"
          style={{ minHeight: 44, touchAction: "manipulation" }}
        >
          <IconKey size={14} className="text-violet-300" /> Abrir bóveda
        </Link>
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
          <IconGlobe size={13} /> Conectar dominio
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
          <IconExtLink size={13} /> Contrato del backend (docs)
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
  const { user: currentUser } = useUser();
  const tools = [
    { href: "/app/blueprint", label: "Blueprint", icon: IconMap },
    { href: "/app/marketplace", label: "Marketplace", icon: IconLayers },
    { href: "/app/integrations", label: "Integraciones", icon: IconBoxes },
    { href: "/app/secrets", label: "Bóveda", icon: IconShield },
    { href: "/app/activity", label: "Actividad", icon: IconBell },
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
            <IconChevR size={13} className="text-muted" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
