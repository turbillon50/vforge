"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/vforge/stat-card";
import { SectionHeader } from "@/components/vforge/section-header";
import {
  FolderKanban,
  Rocket,
  Sparkles,
  TrendingUp,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  total_projects: number;
  produccion: number;
  activo: number;
  en_revision: number;
  en_pausa: number;
  archivo: number;
  pendiente_borrado: number;
  forge_turns: number;
  forge_cost_today_usd: number;
}

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
}

export default function HubPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/stats", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/projects", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { projects: [] },
      ),
    ])
      .then(([s, p]) => {
        setStats(s);
        setProjects(p.projects ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const subtitle = stats
    ? stats.total_projects === 0
      ? "Tu fábrica está en ceros — dale de alta tu primer proyecto"
      : `${stats.total_projects} proyecto${stats.total_projects === 1 ? "" : "s"} · ${stats.produccion} en producción · ${stats.en_revision} en revisión`
    : "Cargando…";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Buenos días, Luis
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Tu fábrica
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          {subtitle}
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Proyectos activos"
          value={stats ? stats.produccion + stats.activo : "—"}
          deltaLabel={
            stats ? `${stats.total_projects} en total` : "cargando…"
          }
          deltaTone="neutral"
          delay={150}
        />
        <StatCard
          icon={Rocket}
          label="En producción"
          value={stats ? stats.produccion : "—"}
          deltaLabel={stats ? "live + dominio" : "cargando…"}
          deltaTone="positive"
          delay={200}
        />
        <StatCard
          icon={Sparkles}
          label="Turnos con V (24h)"
          value={stats ? stats.forge_turns : "—"}
          deltaLabel={
            stats ? `$${stats.forge_cost_today_usd.toFixed(4)} costo` : "cargando…"
          }
          deltaTone="positive"
          delay={250}
        />
        <StatCard
          icon={TrendingUp}
          label="En revisión"
          value={stats ? stats.en_revision : "—"}
          deltaLabel={stats ? "necesitan auditoría" : "cargando…"}
          deltaTone="warning"
          delay={300}
        />
      </section>

      {/* Recent Projects */}
      <section>
        <SectionHeader
          title="Proyectos"
          rightCta={{ label: "Ver todos", href: "/projects" }}
        />
        {!loading && projects.length === 0 ? (
          <div className="border border-dashed border-vf-border-1 rounded-xl px-6 py-12 text-center space-y-3">
            <p className="text-vf-fg">Aún no hay proyectos en el tablero.</p>
            <p className="text-vf-fg-2 text-sm">
              Da de alta tu primer proyecto para que aparezca aquí.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-vf-green text-black text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Dar de alta proyecto
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-vf-border">
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between py-3 hover:bg-vf-bg-1 transition-colors px-2 -mx-2 rounded"
              >
                <div className="min-w-0">
                  <div className="text-vf-fg font-medium truncate">{p.name}</div>
                  <div className="font-mono text-[11px] text-vf-fg-2 truncate">
                    {p.github_repo ?? "(sin repo)"}
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase text-vf-fg-2 ml-3 flex-shrink-0">
                  {p.category}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
