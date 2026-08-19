"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Github, Globe2, Plus, Search, Users, X } from "lucide-react";
import InviteModal, { MemberStack, scopeColor, scopeLabel, type Member } from "@/components/projects/InviteModal";

interface RealProject {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

type DisplayStatus = "live" | "preview" | "draft" | "archived";
type FilterTab = "all" | Exclude<DisplayStatus, "archived">;

const STATUS_FROM_CATEGORY: Record<string, DisplayStatus> = {
  produccion: "live",
  activo: "preview",
  en_revision: "preview",
  en_pausa: "draft",
  archivo: "archived",
  pendiente_borrado: "archived",
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  live: "En vivo",
  preview: "Preview",
  draft: "Borrador",
  archived: "Archivado",
};

function initials(name: string) {
  return name.split(/ +|-+|_+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function projectStatus(project: RealProject): DisplayStatus {
  return STATUS_FROM_CATEGORY[project.category] ?? "draft";
}

function Status({ value }: { value: DisplayStatus }) {
  const color = value === "live" ? "bg-[#4ca873]" : value === "preview" ? "bg-[#ff7b5d]" : "bg-[#aaa49b]";
  return <span className="inline-flex items-center gap-2 text-xs text-[#625e56]"><span className={`h-2 w-2 rounded-full ${color}`} />{STATUS_LABEL[value]}</span>;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [inviteProject, setInviteProject] = useState<{ id: string; name: string } | null>(null);
  const [detailProject, setDetailProject] = useState<RealProject | null>(null);
  const [membersByProject, setMembersByProject] = useState<Record<string, Member[]>>({});

  const handleMembersChange = useCallback((projectId: string, members: Member[]) => {
    setMembersByProject((current) => ({ ...current, [projectId]: members }));
  }, []);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: { projects: RealProject[] }) => setProjects(data.projects ?? []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(projects.map(async (project) => {
        try {
          const response = await fetch(`/api/invitations?project_id=${encodeURIComponent(project.id)}`, { cache: "no-store" });
          if (!response.ok) return null;
          const data = (await response.json()) as { members: Member[] };
          return [project.id, data.members ?? []] as const;
        } catch {
          return null;
        }
      }));
      if (cancelled) return;
      const next: Record<string, Member[]> = {};
      for (const entry of entries) if (entry) next[entry[0]] = entry[1];
      setMembersByProject(next);
    })();
    return () => { cancelled = true; };
  }, [projects]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = filter === "all" || projectStatus(project) === filter;
      const matchesSearch = !query || project.name.toLowerCase().includes(query) || (project.domain ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [filter, projects, search]);

  const counts = useMemo(() => ({
    live: projects.filter((project) => projectStatus(project) === "live").length,
    preview: projects.filter((project) => projectStatus(project) === "preview").length,
    draft: projects.filter((project) => projectStatus(project) === "draft").length,
  }), [projects]);

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: "all", label: "Todos", count: projects.length },
    { key: "live", label: "En vivo", count: counts.live },
    { key: "preview", label: "Preview", count: counts.preview },
    { key: "draft", label: "Borrador", count: counts.draft },
  ];

  const detailMembers = detailProject ? membersByProject[detailProject.id] ?? [] : [];

  return (
    <div className="px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-[#ff5c35]">Espacio de trabajo</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1b1a17] sm:text-5xl">Tus proyectos</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#777168]">Abre una sala, compara las tres vistas e invita a las personas que necesitan mirar.</p></div>
          <div className="flex gap-2">
            <Link href="/app/integrations" className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfc9be] bg-white/65 px-4 text-sm font-medium text-[#1b1a17] transition hover:bg-white">Conectar repositorio</Link>
            <Link href="/app/chat" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1b1a17] px-4 text-sm font-semibold text-white transition hover:bg-[#ff5c35]"><Plus className="h-4 w-4" />Nuevo proyecto</Link>
          </div>
        </header>

        <div className="mt-9 flex flex-col gap-3 rounded-[18px] border border-[#d9d4c9] bg-[#fbfaf7] p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${filter === tab.key ? "bg-[#1b1a17] text-white" : "text-[#777168] hover:bg-[#eeebe4] hover:text-[#1b1a17]"}`}>{tab.label} <span className={filter === tab.key ? "text-white/60" : "text-[#aaa49b]"}>{tab.count}</span></button>
            ))}
          </div>
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-[#ded9cf] bg-white px-3 sm:w-[250px]"><Search className="h-4 w-4 shrink-0 text-[#8a847a]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proyecto" className="min-w-0 flex-1 bg-transparent text-sm text-[#1b1a17] outline-none placeholder:text-[#aaa49b]" /></label>
        </div>

        {error ? <div className="mt-4 rounded-[16px] border border-[#e7aaa0] bg-[#fff3f0] px-4 py-3 text-sm text-[#9f2d1b]">No pudimos cargar los proyectos: {error}</div> : null}

        <section className="mt-4 overflow-hidden rounded-[22px] border border-[#d9d4c9] bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_130px_150px_150px] border-b border-[#e3dfd6] bg-[#f7f5ef] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#918b82] md:grid">
            <span>Proyecto</span><span>Estado</span><span>Participantes</span><span className="text-right">Acciones</span>
          </div>

          {loading ? Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-[#eeeae3] px-5 py-5 last:border-b-0"><span className="h-10 w-10 rounded-[12px] bg-[#ebe7df]" /><div className="flex-1"><span className="block h-3 w-36 rounded bg-[#ebe7df]" /><span className="mt-2 block h-2.5 w-52 rounded bg-[#f0ede6]" /></div></div>
          )) : null}

          {!loading && filtered.length === 0 && !error ? (
            <div className="px-5 py-20 text-center"><p className="text-lg font-semibold text-[#1b1a17]">No hay proyectos aquí</p><p className="mt-2 text-sm text-[#777168]">{search ? "Prueba con otra búsqueda." : "Conecta un repositorio o crea tu primer proyecto."}</p></div>
          ) : null}

          {!loading ? filtered.map((project) => {
            const status = projectStatus(project);
            const domain = project.domain || project.vercel_url?.replace(/^https?:\/\//, "") || "Sin dominio";
            const members = membersByProject[project.id] ?? [];
            return (
              <article key={project.id} className="group grid gap-4 border-b border-[#eeeae3] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_130px_150px_150px] md:items-center">
                <button onClick={() => setDetailProject(project)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#ebe7df] text-xs font-semibold text-[#1b1a17]">{initials(project.name)}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#1b1a17]">{project.name}</span><span className="mt-1 block truncate text-xs text-[#8a847a]">{domain}</span></span>
                </button>
                <Status value={status} />
                <div>{members.length ? <MemberStack members={members} /> : <span className="text-xs text-[#aaa49b]">Solo tú</span>}</div>
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <button onClick={() => setInviteProject({ id: project.id, name: project.name })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d9d4c9] px-3 text-xs font-medium text-[#625e56] transition hover:border-[#ff5c35] hover:text-[#1b1a17]"><Users className="h-3.5 w-3.5" />Invitar</button>
                  <Link href={`/app/live/${project.id}`} aria-label={`Abrir sala de ${project.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1a17] text-white transition hover:bg-[#ff5c35]"><ArrowRight className="h-4 w-4" /></Link>
                </div>
              </article>
            );
          }) : null}
        </section>
      </div>

      {detailProject ? (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <button aria-label="Cerrar detalle" onClick={() => setDetailProject(null)} className="absolute inset-0 bg-[#1b1a17]/35 backdrop-blur-sm" />
          <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col overflow-y-auto border-l border-[#d9d4c9] bg-[#fbfaf7] shadow-[-24px_0_70px_rgba(37,32,25,.12)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#ded9cf] px-6 py-6">
              <div className="min-w-0"><p className="text-xs font-medium text-[#ff5c35]">Detalle del proyecto</p><h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.045em] text-[#1b1a17]">{detailProject.name}</h2><p className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#777168]"><Globe2 className="h-3.5 w-3.5" />{detailProject.domain || detailProject.vercel_url?.replace(/^https?:\/\//, "") || "Sin dominio"}</p></div>
              <button onClick={() => setDetailProject(null)} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9d4c9] text-[#625e56] hover:bg-[#f0ede6]"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-6 px-6 py-6">
              {detailProject.github_repo ? <div className="flex items-center gap-2 rounded-[14px] border border-[#ded9cf] bg-white px-3 py-3 text-xs text-[#625e56]"><Github className="h-4 w-4" /><span className="truncate">{detailProject.github_repo}</span></div> : null}
              <div className="grid gap-2">
                <Link href={`/app/live/${detailProject.id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff5c35] px-4 text-sm font-semibold text-white hover:bg-[#e84a27]">Abrir sala en vivo<ArrowRight className="h-4 w-4" /></Link>
                {detailProject.vercel_url ? <a href={detailProject.vercel_url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#d9d4c9] bg-white px-4 text-sm font-medium text-[#1b1a17] hover:bg-[#f7f5ef]">Abrir despliegue<ExternalLink className="h-4 w-4" /></a> : null}
                <button onClick={() => { setInviteProject({ id: detailProject.id, name: detailProject.name }); setDetailProject(null); }} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#d9d4c9] px-4 text-sm font-medium text-[#1b1a17] hover:border-[#ff5c35]"><Users className="h-4 w-4" />Invitar participante</button>
              </div>

              <div className="border-t border-[#ded9cf] pt-5"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#918b82]">Participantes {detailMembers.length ? `(${detailMembers.length})` : ""}</p>
                {detailMembers.length ? <ul className="mt-3 space-y-2">{detailMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 rounded-[14px] border border-[#ded9cf] bg-white p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: scopeColor(member.scope) }}>{(member.contact || member.email || "?").replace(/^\+/, "")[0]?.toUpperCase() ?? "?"}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-[#1b1a17]">{member.contact || member.email}</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: scopeColor(member.scope) }}>{scopeLabel(member.scope)}</p></div>
                    <span className="text-[10px] text-[#777168]">{member.status === "active" ? "Activo" : member.status === "revoked" ? "Revocado" : "Invitado"}</span>
                  </li>
                ))}</ul> : <p className="mt-3 text-sm text-[#777168]">Aún no has invitado a nadie.</p>}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <InviteModal project={inviteProject} open={inviteProject !== null} onClose={() => setInviteProject(null)} onMembersChange={handleMembersChange} />
    </div>
  );
}
