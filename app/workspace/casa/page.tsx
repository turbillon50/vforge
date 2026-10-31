import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClientShell } from "@/components/workspace/ClientShell";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { PageHeader } from "@/components/workspace/PageHeader";
import { PersonalInfrastructure } from "@/components/workspace/PersonalInfrastructure";
import { currentPersonalActor, resolvePersonalSpace } from "@/lib/workspace/personal";
import { listScopedProjects } from "@/lib/projects/scoped-catalog";
import { listUserConnections } from "@/lib/connect/user-vault";
export const dynamic = "force-dynamic";

export default async function PersonalSpacePage({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  const actor = await currentPersonalActor();
  if (!actor) redirect("/sign-in");
  const requested = (await searchParams).space;
  const space = await resolvePersonalSpace(actor, requested);
  if (!space) notFound();
  const [projects, connections] = await Promise.all([
    listScopedProjects(space.owner_email), listUserConnections(space.owner_clerk_user_id),
  ]);
  const Shell = actor.isPlatformOwner ? WorkspaceShell : ClientShell;
  return <Shell><div className="w-full min-w-0">
    <PageHeader eyebrow="Espacio personal de trabajo" title={space.name}
      description={`${space.owner_email} · ${space.assistant_name}, tu IA personal.`}
      actions={actor.isPlatformOwner ? <Link href="/app/projects" className="rounded-lg border border-[var(--border-1)] px-4 py-3 text-sm">Fábrica completa</Link> : <Link href="/workspace/studio" className="rounded-lg bg-[var(--color-ink)] px-4 py-3 text-sm text-[var(--color-surface)]">Abrir estudio</Link>} />
    <div className="space-y-8 p-5 md:p-8">
      {actor.isPlatformOwner && <p className="text-sm text-[var(--fg-secondary)]">Vista del propietario global. Tu sesión sigue siendo {actor.email}.</p>}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Resumen del espacio">
        <article className="rounded-xl border border-[var(--border-1)] p-5"><p className="text-sm text-[var(--fg-secondary)]">Proyectos de este espacio</p><p className="mt-3 text-4xl font-semibold">{projects.length}</p></article>
        <article className="rounded-xl border border-[var(--border-1)] p-5"><p className="text-sm text-[var(--fg-secondary)]">Vínculos de cuenta guardados</p><p className="mt-3 text-4xl font-semibold">{connections.length}</p><p className="mt-2 text-sm">{connections.join(" · ") || "Sin conexiones guardadas"}</p></article>
        <article className="rounded-xl border border-[var(--border-1)] p-5"><p className="text-sm text-[var(--fg-secondary)]">IA personal</p><h2 className="mt-3 text-3xl font-semibold">{space.assistant_name}</h2><p className="mt-3 text-sm">{space.memory_provider || "Memoria"} · {space.memory_status === "connected" ? "Vinculada" : space.memory_status === "error" ? "Requiere revisión" : "Integración en preparación"}</p><p className="mt-2 text-xs text-[var(--fg-secondary)]">La bóveda existente se vincula por separado; esta vista no la reemplaza.</p></article>
      </section>
      <section aria-labelledby="personal-projects"><h2 id="personal-projects" className="text-2xl font-semibold tracking-tight">Proyectos</h2>
        {projects.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <Link key={p.id} href={p.access_kind === "live" ? `/app/live/${encodeURIComponent(p.id)}` : `/workspace/proyecto/${encodeURIComponent(p.id)}`} className="rounded-xl border border-[var(--border-1)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-ink)]"><p className="text-xs text-[var(--fg-secondary)]">{p.member_role === "owner" ? "Propietario del proyecto" : p.member_role}</p><h3 className="mt-4 break-all text-lg font-semibold">{p.name}</h3><p className="mt-3 break-all text-xs text-[var(--fg-secondary)]">{p.github_repo || "Sin repositorio vinculado"}</p><p className="mt-4 text-sm underline underline-offset-4">Abrir sala</p></Link>)}</div> : <p className="mt-4 text-sm">Todavía no hay proyectos vinculados a este espacio.</p>}
      </section>
      <PersonalInfrastructure spaceId={space.id} />
    </div>
  </div></Shell>;
}
