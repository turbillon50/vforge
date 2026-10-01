import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Clock3,
  Database,
  ExternalLink,
  GitBranch,
  Github,
  Globe2,
  ImageIcon,
  Lock,
  MessageSquare,
  Plug,
  Radio,
  Unlock,
} from "lucide-react";
import type {
  ConexionExpediente,
  DatoEstado,
  ExpedienteProyecto,
  RepositorioExpediente,
  ValorExpediente,
} from "@/lib/unicorn/expediente";
import { PROJECT_REPOSITORY_ROLE_LABEL } from "@/lib/projects/repository-groups";

const TZ = "America/Cancun";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function estadoTexto(state: DatoEstado) {
  if (state === "por_conectar") return "por conectar";
  if (state === "sin_dato") return "sin dato";
  return "real";
}

function statusLabel(status: string | null | undefined) {
  if (status === "live") return "En producción";
  if (status === "building") return "Construyendo";
  if (status === "error") return "Requiere revisión";
  if (status === "idle") return "En pausa";
  return status || "sin dato";
}

function roleLabel(role: string) {
  return PROJECT_REPOSITORY_ROLE_LABEL[
    role as keyof typeof PROJECT_REPOSITORY_ROLE_LABEL
  ] ?? role;
}

function fmtDate(value: string | null | undefined, withTime = false) {
  if (!value) return "sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function host(value: string | null | undefined) {
  if (!value) return "sin dato";
  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function display(value: ValorExpediente | string | null | undefined) {
  if (!value) return "sin dato";
  if (typeof value === "string") return value || "sin dato";
  return value.value || estadoTexto(value.state);
}

function StateBadge({ state }: { state: DatoEstado }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
        state === "real"
          ? "border-[var(--border-1)] bg-white text-black"
          : "border-dashed border-[var(--border-1)] bg-[var(--color-surface-2)] text-[var(--fg-muted)]",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {estadoTexto(state)}
    </span>
  );
}

function BrowserFrame({
  expediente,
  compact,
}: {
  expediente: ExpedienteProyecto;
  compact?: boolean;
}) {
  const title = host(expediente.cover.url);
  return (
    <figure
      className={cx(
        "relative isolate flex min-h-0 flex-col overflow-hidden border border-[var(--border-1)] bg-[var(--color-surface-2)]",
        compact ? "aspect-[16/10] rounded-md" : "aspect-[21/8] rounded-none md:aspect-[21/7]",
      )}
    >
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[var(--border-1)] bg-white px-3 font-mono text-[11px] text-[var(--fg-muted)]">
        <span className="h-2 w-2 rounded-full bg-[var(--border-2)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--border-1)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--surface-2)]" />
        <span className="ml-2 min-w-0 truncate rounded-full bg-[var(--color-surface-2)] px-2 py-1">
          {title}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {expediente.cover.src ? (
          <Image
            src={expediente.cover.src}
            alt={`Captura real de ${expediente.project.name}`}
            fill
            unoptimized
            sizes={compact ? "(max-width: 768px) 100vw, 40vw" : "100vw"}
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-md border border-[var(--border-1)] bg-white">
              <ImageIcon size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="break-words text-[15px] font-semibold text-black">
                {expediente.project.name}
              </p>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                {expediente.cover.label}
              </p>
            </div>
          </div>
        )}
      </div>

      <figcaption className="absolute bottom-3 left-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-[var(--border-1)] bg-white/95 px-3 py-1 text-[12px] font-medium text-black">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span className="truncate">{expediente.cover.label}</span>
      </figcaption>
    </figure>
  );
}

function RepoMeta({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function RepoTile({
  repo,
  large,
}: {
  repo: RepositorioExpediente;
  large?: boolean;
}) {
  const privacyIcon =
    repo.private.value === "Privado" ? <Lock size={13} /> : <Unlock size={13} />;

  return (
    <article
      className={cx(
        "min-w-0 border border-[var(--border-1)] bg-white p-3",
        large ? "grid gap-4 rounded-md md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "rounded-md",
      )}
    >
      <div className={large ? "min-w-0" : "min-w-0"}>
        <BrowserMini repo={repo} />
      </div>

      <div className="mt-3 min-w-0 md:mt-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cx("truncate font-semibold text-black", large ? "text-[18px]" : "text-[14px]")}>
              {repo.fullName}
            </h3>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              {repo.isPrimary ? "Repositorio principal" : roleLabel(repo.role)}
            </p>
          </div>
          {repo.isPrimary ? (
            <span className="shrink-0 rounded-full border border-black px-2 py-1 text-[10px] font-medium text-black">
              principal
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid min-w-0 gap-2">
          <RepoMeta icon={<GitBranch size={13} />}>{display(repo.defaultBranch)}</RepoMeta>
          <RepoMeta icon={privacyIcon}>{display(repo.private)}</RepoMeta>
          <RepoMeta icon={<Radio size={13} />}>{display(repo.language)}</RepoMeta>
          <RepoMeta icon={<Clock3 size={13} />}>
            {repo.latestCommit.message
              ? `${repo.latestCommit.message} · ${fmtDate(repo.latestCommit.date, true)}`
              : estadoTexto(repo.latestCommit.state)}
          </RepoMeta>
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
          <StateBadge state={repo.githubState} />
          {repo.url ? (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--border-1)] px-2 text-[12px] font-medium text-black hover:border-black"
            >
              <Github size={13} />
              GitHub
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BrowserMini({ repo }: { repo: RepositorioExpediente }) {
  const lines = [56, 78, 42, 64, 34, 70, 48];
  return (
    <div className="aspect-[16/10] overflow-hidden rounded-md border border-[var(--border-1)] bg-[var(--color-surface-2)]">
      <div className="flex h-7 items-center gap-1.5 border-b border-[var(--border-1)] bg-white px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-2)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-1)]" />
        <span className="ml-1 min-w-0 truncate font-mono text-[10px] text-[var(--fg-muted)]">
          {repo.fullName}
        </span>
      </div>
      <div className="grid h-[calc(100%-1.75rem)] content-center gap-1.5 px-5">
        {lines.map((width, index) => (
          <span
            key={`${repo.fullName}-${index}`}
            className="h-1.5 rounded-full bg-[var(--border-1)]"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function LinkedSystems({ expediente }: { expediente: ExpedienteProyecto }) {
  const items = [...expediente.mcpConnections, ...expediente.conversations];
  return (
    <div className="min-w-0 rounded-md border border-[var(--border-1)] bg-[var(--color-surface-2)] p-4">
      <h3 className="text-[14px] font-semibold text-black">Ligado con</h3>
      <div className="mt-2 divide-y divide-[var(--border-1)]">
        {items.map((item) => (
          <div key={item.name} className="flex min-w-0 items-center gap-3 py-2.5">
            {item.name === "TRAMA" ? <MessageSquare size={15} /> : <Plug size={15} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-black">{item.name}</p>
              <p className="truncate text-[12px] text-[var(--fg-muted)]">{item.detail}</p>
            </div>
            <span className="shrink-0 text-[12px] text-[var(--fg-muted)]">
              {estadoTexto(item.state)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TarjetaProyecto({ expediente }: { expediente: ExpedienteProyecto }) {
  const project = expediente.project;
  const primary = expediente.repositories.find((repo) => repo.isPrimary) ?? expediente.repositories[0];
  const secondary = expediente.repositories.filter((repo) => repo !== primary).slice(0, 4);

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border-1)] bg-white">
      <div className="relative">
        <BrowserFrame expediente={expediente} />
        <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border-1)] bg-white/95 px-3 text-[12px] font-semibold text-black">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel(project.status)}
          </span>
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border-1)] bg-white/95 px-3 text-[12px] font-semibold text-black">
            <BookOpen size={13} />
            {expediente.repositories.length} repositorios
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-8 md:py-7">
        <div className="min-w-0">
          <h2 className="break-words text-[34px] font-semibold leading-none text-black md:text-[40px]">
            {project.name}
          </h2>
          <p className="mt-2 max-w-2xl break-words text-[15px] text-[var(--fg-muted)]">
            {project.description || "Expediente real del proyecto en VForge."}
          </p>
        </div>
        <Link
          href={`/app/projects/${encodeURIComponent(project.id)}/expediente`}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-5 text-[14px] font-semibold text-white"
        >
          Abrir expediente
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid min-w-0 gap-3 px-4 pb-5 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)] md:px-8 md:pb-7 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(220px,.9fr)]">
        {primary ? <RepoTile repo={primary} large /> : null}
        {secondary.map((repo) => (
          <RepoTile key={repo.fullName} repo={repo} />
        ))}
        <LinkedSystems expediente={expediente} />
      </div>

      <div className="grid border-t border-[var(--border-1)] md:grid-cols-4">
        <Stat label="Último cambio" value={fmtDate(project.updated_at, true)} />
        <Stat label="Dominio" value={project.domain || "sin dato"} />
        <Stat label="Repositorio principal" value={primary?.fullName || "sin dato"} />
        <Stat label="TRAMA" value="por conectar" />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-r border-[var(--border-1)] px-4 py-4 md:border-b-0 md:px-8">
      <p className="text-[12px] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 truncate text-[17px] font-semibold text-black">{value}</p>
    </div>
  );
}

function Chapter({
  num,
  title,
  body,
  children,
}: {
  num: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-[var(--border-1)] py-8 last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10 md:py-11">
      <div className="min-w-0">
        <span className="font-mono text-[13px] text-[var(--fg-subtle)]">{num}</span>
        <h2 className="mt-2 text-[24px] font-semibold leading-tight text-black">{title}</h2>
        <p className="mt-2 text-[13px] text-[var(--fg-muted)]">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function InfraCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-black">
        {icon}
        {title}
      </h3>
      <div className="mt-3 divide-y divide-[var(--border-1)]">{children}</div>
    </div>
  );
}

function KeyValueRow({
  label,
  value,
  state,
  href,
}: {
  label: string;
  value: string | null;
  state: DatoEstado;
  href?: string | null;
}) {
  const text = value || estadoTexto(state);
  return (
    <div className="min-w-0 py-2.5">
      <p className="text-[12px] text-[var(--fg-muted)]">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-[13px] font-medium text-black hover:underline"
        >
          <span className="min-w-0 truncate font-mono">{text}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ) : (
        <p className="mt-0.5 min-w-0 break-words font-mono text-[13px] font-medium text-black">
          {text}
        </p>
      )}
    </div>
  );
}

function ConnectionGrid({ items }: { items: ConexionExpediente[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.name} className="min-w-0 rounded-md border border-[var(--border-1)] p-4">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] bg-[var(--color-surface-2)]">
            {item.name === "TRAMA" ? <MessageSquare size={16} /> : <Plug size={16} />}
          </div>
          <h3 className="mt-3 truncate text-[15px] font-semibold text-black">{item.name}</h3>
          <p className="mt-1 text-[13px] text-[var(--fg-muted)]">{item.detail}</p>
          <div className="mt-3">
            <StateBadge state={item.state} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExpedienteProyectoView({ expediente }: { expediente: ExpedienteProyecto }) {
  const project = expediente.project;
  const primary = expediente.repositories.find((repo) => repo.isPrimary) ?? expediente.repositories[0];

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border-1)] bg-white">
      <BrowserFrame expediente={expediente} />
      <div className="px-4 py-7 md:px-10 md:py-10 xl:px-14">
        <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase text-[var(--fg-muted)]">
              Expediente de proyecto
            </p>
            <h1 className="mt-3 break-words text-[48px] font-semibold leading-none text-black md:text-[72px]">
              {project.name}
            </h1>
            <p className="mt-4 max-w-2xl break-words text-[16px] leading-7 text-[var(--fg-secondary)]">
              {project.description || "Proyecto registrado en VForge con datos reales disponibles."}
            </p>
          </div>
          <Link
            href={`/app/live/${encodeURIComponent(project.id)}`}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-5 text-[14px] font-semibold text-white"
          >
            Entrar a la Sala
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-8 grid border-y border-black md:grid-cols-5">
          <Ficha label="Dominio" value={project.domain || "sin dato"} />
          <Ficha label="Estado" value={statusLabel(project.status)} />
          <Ficha label="Repositorios" value={String(expediente.repositories.length)} />
          <Ficha label="Principal" value={primary?.fullName || "sin dato"} />
          <Ficha label="Base de datos" value={display(expediente.infra.database)} />
        </div>

        <Chapter
          num="01"
          title="Repositorios"
          body="Todo lo que forma este proyecto, agrupado desde la tabla de repositorios."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            {expediente.repositories.length ? (
              expediente.repositories.map((repo, index) => (
                <RepoTile key={repo.fullName} repo={repo} large={index === 0} />
              ))
            ) : (
              <EmptyLine label="sin dato" />
            )}
          </div>
        </Chapter>

        <Chapter
          num="02"
          title="Infraestructura"
          body="Dominios, URLs de Vercel y visores capturados desde la fila del proyecto."
        >
          <div className="grid gap-7 md:grid-cols-3">
            <InfraCard icon={<Globe2 size={15} />} title="URLs">
              {expediente.infra.urls.map((item) => (
                <KeyValueRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  href={item.href}
                  state={item.state}
                />
              ))}
            </InfraCard>
            <InfraCard icon={<Database size={15} />} title="Neon Postgres">
              <KeyValueRow label="Proyecto" value={null} state={expediente.infra.database.state} />
              <KeyValueRow label="Rama" value={null} state="sin_dato" />
              <KeyValueRow label="Región" value={null} state="sin_dato" />
            </InfraCard>
            <InfraCard icon={<ImageIcon size={15} />} title="Captura">
              <KeyValueRow label="Fuente" value={expediente.cover.label} state={expediente.cover.state} />
              <KeyValueRow label="URL fotografiada" value={expediente.cover.url} href={expediente.cover.url} state={expediente.cover.state} />
            </InfraCard>
          </div>
        </Chapter>

        <Chapter
          num="03"
          title="Ahora mismo"
          body="Estado operativo registrado en VForge. Sin tokens ni agentes inventados."
        >
          <div className="grid gap-3 md:grid-cols-4">
            {expediente.now.map((item) => (
              <div key={item.label} className="min-w-0 rounded-md border border-[var(--border-1)] p-4">
                <p className="text-[12px] text-[var(--fg-muted)]">{item.label}</p>
                <p className="mt-2 break-words text-[18px] font-semibold text-black">
                  {item.label === "Último cambio" ? fmtDate(item.value, true) : item.value || estadoTexto(item.state)}
                </p>
                <div className="mt-3">
                  <StateBadge state={item.state} />
                </div>
              </div>
            ))}
          </div>
        </Chapter>

        <Chapter
          num="04"
          title="Conversaciones y memoria"
          body="TRAMA y MCPs quedan declarados como pendientes de conexión."
        >
          <div className="grid gap-5">
            <ConnectionGrid items={expediente.conversations} />
            <ConnectionGrid items={expediente.mcpConnections} />
          </div>
        </Chapter>

        <Chapter
          num="05"
          title="Línea de tiempo"
          body="Eventos reales leídos por Unicorn desde las fuentes disponibles."
        >
          {expediente.timeline.length ? (
            <div className="grid gap-0 md:grid-cols-5">
              {expediente.timeline.slice(-5).map((event) => (
                <div key={`${event.fuente}-${event.id}`} className="relative min-w-0 border-l border-black pb-5 pl-4 md:border-l-0 md:border-t md:pb-0 md:pl-0 md:pr-4 md:pt-4">
                  <p className="font-mono text-[12px] text-[var(--fg-muted)]">{fmtDate(event.ts)}</p>
                  <p className="mt-2 break-words text-[15px] font-medium leading-5 text-black">{event.titulo}</p>
                  <p className="mt-2 text-[12px] text-[var(--fg-muted)]">{event.fuente}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine label="sin dato" />
          )}
          {expediente.eventSourcesUnavailable.length ? (
            <div className="mt-5 rounded-md border border-dashed border-[var(--border-1)] bg-[var(--color-surface-2)] p-3">
              <p className="text-[12px] font-medium text-black">Fuentes sin dato</p>
              <div className="mt-2 grid gap-1">
                {expediente.eventSourcesUnavailable.map((item) => (
                  <p key={item.fuente} className="text-[12px] text-[var(--fg-muted)]">
                    {item.fuente}: {item.motivo}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Chapter>
      </div>
    </article>
  );
}

function Ficha({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[var(--border-1)] py-3 md:border-b-0 md:border-r md:px-4 md:first:pl-0 md:last:border-r-0">
      <p className="text-[12px] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-black">{value}</p>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-1)] bg-[var(--color-surface-2)] p-5 text-[13px] text-[var(--fg-muted)]">
      {label}
    </div>
  );
}

export function ExpedienteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-background)] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[1180px] min-w-0">{children}</div>
    </main>
  );
}

export function FeaturedProjectShell({
  children,
  title = "Proyectos agrupados",
  kicker = "Tarjeta C",
}: {
  children: ReactNode;
  title?: string;
  kicker?: string;
}) {
  return (
    <section className="overflow-x-hidden bg-[var(--color-background)] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[1180px] min-w-0">
        <div className="mb-4 flex min-w-0 items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase text-[var(--fg-muted)]">{kicker}</p>
            <h2 className="mt-1 text-[22px] font-semibold text-black">{title}</h2>
          </div>
          <div className="hidden items-center gap-2 text-[12px] text-[var(--fg-muted)] md:flex">
            <Activity size={14} />
            Datos reales disponibles
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
