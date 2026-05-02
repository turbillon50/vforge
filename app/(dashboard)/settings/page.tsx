"use client";

import {
  User,
  Mail,
  Building2,
  Globe,
  Shield,
  ChevronRight,
  Key,
  FileText,
  Smartphone,
  Trash2,
  CheckCircle2,
  Database,
} from "lucide-react";

// Brand icons as simple components
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function VercelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L24 22H0L12 1z" />
    </svg>
  );
}

function NeonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 19h6l4-8 4 8h6L12 2z" />
    </svg>
  );
}

function CloudflareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 15.5c.3-.8.2-1.5-.3-2-.4-.4-1-.6-1.7-.6l-8.2.1c-.1 0-.2-.1-.2-.1 0-.1 0-.2.1-.2.1-.1.2-.2.3-.2l8.3-.1c1.2-.1 2.5-.9 3-2.1.5-1.1.4-2.3-.2-3.2-.4-.6-1-1-1.7-1.2-.1-.6-.4-1.2-.8-1.6C14.2 3.4 13.1 3 12 3c-1.4 0-2.7.7-3.5 1.8-.4-.2-.9-.3-1.4-.3-1.4 0-2.6.9-3 2.2C2.3 7.1 1 8.6 1 10.5c0 2.2 1.8 4 4 4h11c.2 0 .4-.1.5-.2.2-.2.2-.5 0-.8z" />
    </svg>
  );
}

const accountRows = [
  { icon: User, label: "Nombre", value: "Luis Humberto de la Torre Herrera" },
  { icon: Mail, label: "Email", value: "luis@allglobal.ec" },
  {
    icon: Building2,
    label: "Organización",
    value: "All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.",
  },
  { icon: Globe, label: "Idioma", value: "Español MX" },
  { icon: Shield, label: "2FA", value: "Activo", badge: true },
];

const integrations = [
  {
    icon: GitHubIcon,
    name: "GitHub",
    detail: "turbillon50",
    status: "conectado",
  },
  {
    icon: VercelIcon,
    name: "Vercel",
    detail: "luis-team",
    status: "conectado",
  },
  {
    icon: NeonIcon,
    name: "Neon",
    detail: "3 proyectos",
    status: "conectado",
  },
  {
    icon: AnthropicIcon,
    name: "Anthropic",
    detail: "API activa",
    status: "conectado",
  },
  {
    icon: CloudflareIcon,
    name: "Cloudflare",
    detail: "R2 + Workers",
    status: "conectado",
  },
];

const securityRows = [
  {
    icon: Key,
    label: "Master key",
    value: "••••••••••••••••",
    mono: true,
    action: "Rotar",
  },
  { icon: FileText, label: "Audit log", value: "Ver registros", link: true },
  {
    icon: Smartphone,
    label: "Sesiones activas",
    value: "2 dispositivos",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Sistema
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Configuración
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Tu cuenta, integraciones y seguridad
        </p>
      </header>

      {/* Cuenta Section */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="text-sm font-medium text-vf-fg mb-3">Cuenta</h2>
        <div className="bg-vf-bg-1 rounded-lg border border-vf-border overflow-hidden">
          {accountRows.map((row, index) => (
            <button
              key={row.label}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-vf-bg-2 transition-colors duration-150 text-left min-h-[56px]"
              style={{
                borderTop: index > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <row.icon className="w-5 h-5 text-vf-fg-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-vf-fg-2 mb-0.5">{row.label}</div>
                <div className="text-sm text-vf-fg truncate">{row.value}</div>
              </div>
              {row.badge ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-vf-green-dim text-vf-green text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-vf-fg-3 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Integraciones Section */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-sm font-medium text-vf-fg mb-3">
          Integraciones conectadas
        </h2>
        <div className="bg-vf-bg-1 rounded-lg border border-vf-border overflow-hidden">
          {integrations.map((integration, index) => (
            <button
              key={integration.name}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-vf-bg-2 transition-colors duration-150 text-left min-h-[56px]"
              style={{
                borderTop: index > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div className="w-8 h-8 rounded-md bg-vf-bg-2 flex items-center justify-center flex-shrink-0">
                <integration.icon className="w-4 h-4 text-vf-fg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-vf-fg">
                  {integration.name}
                </div>
                <div className="text-xs text-vf-fg-2 font-mono">
                  {integration.detail}
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-vf-green-dim text-vf-green text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-vf-green dot-live" />
                {integration.status}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Seguridad Section */}
      <section
        className="stagger-fade-up"
        style={{ animationDelay: "250ms" }}
      >
        <h2 className="text-sm font-medium text-vf-fg mb-3">Seguridad</h2>
        <div className="bg-vf-bg-1 rounded-lg border border-vf-border overflow-hidden">
          {securityRows.map((row, index) => (
            <button
              key={row.label}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-vf-bg-2 transition-colors duration-150 text-left min-h-[56px]"
              style={{
                borderTop: index > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <row.icon className="w-5 h-5 text-vf-fg-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-vf-fg-2 mb-0.5">{row.label}</div>
                <div
                  className={`text-sm truncate ${
                    row.mono ? "font-mono text-vf-fg-2" : "text-vf-fg"
                  } ${row.link ? "text-vf-green" : ""}`}
                >
                  {row.value}
                </div>
              </div>
              {row.action ? (
                <span className="px-3 py-1.5 rounded-md border border-vf-border-1 text-xs font-medium text-vf-fg hover:bg-vf-bg-2 transition-colors">
                  {row.action}
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-vf-fg-3 flex-shrink-0" />
              )}
            </button>
          ))}

          {/* Danger Zone: Borrar cuenta */}
          <div
            className="px-4 py-4 hover:bg-vf-bg-2 transition-colors duration-150"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button className="w-full flex items-center gap-4 text-left min-h-[40px]">
              <Trash2 className="w-5 h-5 text-vf-error flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-vf-fg-2 mb-0.5">Zona de peligro</div>
                <div className="text-sm text-vf-error font-medium">
                  Borrar cuenta
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-vf-error/50 flex-shrink-0" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
