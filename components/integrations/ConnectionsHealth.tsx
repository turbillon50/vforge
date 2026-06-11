"use client";

import { motion } from "framer-motion";
import {
  IconGithub,
  IconGlobe,
  IconDatabase,
  IconFingerprint,
  IconActivity,
  IconCreditCard,
  IconCheck,
  IconClock,
  IconWarn,
  IconCrown,
  IconPlus,
} from "@/components/brand/VFIcons";
import type { ComponentType } from "react";
import type { SVGProps } from "react";

/* ─────────────────────────────────────────────────────────────
 *  ConnectionsHealth — status visual de conexiones (auths)
 *  Grilla de tarjetas glassmorphism, una por servicio.
 * ───────────────────────────────────────────────────────────── */

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type ConnectionStatus = "conectado" | "pendiente" | "error";

export type ConnectionService =
  | "GitHub"
  | "Vercel"
  | "Neon"
  | "Clerk"
  | "Resend"
  | "Stripe";

export interface Connection {
  service: ConnectionService;
  status: ConnectionStatus;
  detail?: string;
}

interface OwnerAccount {
  provider: "GitHub" | "Vercel";
  label: string;
  handle: string;
}

/* Icono real por servicio (solo VFIcons) */
const SERVICE_ICON: Record<ConnectionService, IconType> = {
  GitHub: IconGithub,
  Vercel: IconGlobe,
  Neon: IconDatabase,
  Clerk: IconFingerprint,
  Resend: IconActivity,
  Stripe: IconCreditCard,
};

/* Estilos por estado del badge */
const STATUS_STYLES: Record<
  ConnectionStatus,
  { label: string; dot: string; chip: string; Icon: IconType }
> = {
  conectado: {
    label: "Conectado",
    dot: "bg-vf-green",
    chip: "bg-vf-green/10 text-vf-green border-vf-green/30",
    Icon: IconCheck,
  },
  pendiente: {
    label: "Pendiente",
    dot: "bg-amber-400",
    chip: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    Icon: IconClock,
  },
  error: {
    label: "Error",
    dot: "bg-vf-error",
    chip: "bg-vf-error/10 text-vf-error border-vf-error/30",
    Icon: IconWarn,
  },
};

/* Datos demo plausibles cuando no se reciben props */
const DEMO_CONNECTIONS: Connection[] = [
  { service: "GitHub", status: "conectado", detail: "turbillon50 · 12 repos" },
  { service: "Vercel", status: "conectado", detail: "team_gK8R · 43 proyectos" },
  { service: "Neon", status: "conectado", detail: "Postgres · branch main" },
  { service: "Clerk", status: "conectado", detail: "Producción · passkeys" },
  { service: "Resend", status: "pendiente", detail: "Falta verificar dominio" },
  { service: "Stripe", status: "pendiente", detail: "Webhook sin configurar" },
];

const DEMO_OWNERS: OwnerAccount[] = [
  { provider: "GitHub", label: "All Global Holding", handle: "@turbillon50" },
  { provider: "Vercel", label: "V·Forge", handle: "team_gK8RSuGh" },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function ConnectionsHealth({
  connections,
}: {
  connections?: Connection[];
}) {
  const items =
    connections && connections.length > 0 ? connections : DEMO_CONNECTIONS;

  const onlineCount = items.filter((c) => c.status === "conectado").length;

  return (
    <section className="w-full">
      {/* Encabezado */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-vf-fg">
            Estado de conexiones
          </h2>
          <p className="mt-0.5 text-sm text-vf-fg-2">
            {onlineCount} de {items.length} servicios activos
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-vf-border bg-vf-bg-2/60 px-3 py-1 text-xs text-vf-fg-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vf-green/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-vf-green" />
          </span>
          Live
        </span>
      </div>

      {/* Grilla de tarjetas */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((conn) => {
          const Icon = SERVICE_ICON[conn.service];
          const st = STATUS_STYLES[conn.status];
          return (
            <motion.div
              key={conn.service}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl border border-vf-border bg-vf-bg-2/40 p-4 backdrop-blur-xl transition-colors hover:border-vf-border-2"
            >
              {/* glow sutil */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-vf-green/5 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-vf-border bg-vf-bg-3/60 text-vf-fg">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-vf-fg">
                      {conn.service}
                    </p>
                    <span className="flex items-center gap-1.5 text-xs text-vf-fg-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.chip}`}
                >
                  <st.Icon size={12} />
                  {st.label}
                </span>
              </div>

              {conn.detail ? (
                <p className="mt-3 truncate text-xs text-vf-fg-2">
                  {conn.detail}
                </p>
              ) : null}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Mini-sección Multicuenta (owners) */}
      <div className="mt-7 rounded-2xl border border-vf-border bg-vf-bg-2/30 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-vf-border bg-vf-bg-3/60 text-amber-300">
            <IconCrown size={15} />
          </span>
          <div>
            <p className="text-sm font-medium text-vf-fg">Multicuenta (owners)</p>
            <p className="text-xs text-vf-fg-2">
              Cuentas vinculadas para deploy y repos
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {DEMO_OWNERS.map((acc) => {
            const Icon = acc.provider === "GitHub" ? IconGithub : IconGlobe;
            return (
              <li
                key={`${acc.provider}-${acc.handle}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-vf-border bg-vf-bg-3/40 px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-vf-border bg-vf-bg-2/60 text-vf-fg">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm text-vf-fg">{acc.label}</p>
                    <p className="text-xs text-vf-fg-2">
                      {acc.provider} · {acc.handle}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-vf-green/30 bg-vf-green/10 px-2 py-0.5 text-[11px] font-medium text-vf-green">
                  <IconCheck size={12} />
                  Activa
                </span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          // TODO: abrir flujo de OAuth para vincular una cuenta nueva (GitHub/Vercel)
          onClick={() => {}}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-vf-border-2 bg-transparent px-3 py-2 text-sm text-vf-fg-2 transition-colors hover:border-vf-green/50 hover:text-vf-fg"
        >
          <IconPlus size={16} />
          Agregar cuenta
        </button>
      </div>
    </section>
  );
}
