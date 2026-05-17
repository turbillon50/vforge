"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink, GitBranch, Lock, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { openV } from "@/components/V/VDock";

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  github_url?: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

type CategoryFilter =
  | "all"
  | "produccion"
  | "activo"
  | "en_revision"
  | "en_pausa"
  | "archivo"
  | "pendiente_borrado";

const CATEGORIES: { id: CategoryFilter; label: string; emoji: string }[] = [
  { id: "all", label: "Todos", emoji: "•" },
  { id: "produccion", label: "Producción", emoji: "🟢" },
  { id: "activo", label: "Activo", emoji: "🔵" },
  { id: "en_revision", label: "En revisión", emoji: "🟡" },
  { id: "en_pausa", label: "En pausa", emoji: "⏸️" },
  { id: "archivo", label: "Archivo", emoji: "📦" },
  { id: "pendiente_borrado", label: "Pendiente borrado", emoji: "🗑️" },
];

const OPERATOR_TOKEN_KEY = "vforge_operator_token";

function getOperatorToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OPERATOR_TOKEN_KEY);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CategoryFilter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { projects: Project[] };
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    const token = getOperatorToken();
    if (!token) {
      setSyncMsg("Necesitas desbloquear el Vault primero (operator token)");
      setTimeout(() => setSyncMsg(null), 6000);
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/projects/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        inserted?: number;
        updated?: number;
        total?: number;
        error?: string;
        errors?: Array<{ id: string; message: string }>;
      };
      if (data.error) {
        setSyncMsg(`error: ${data.error}`);
      } else {
        setSyncMsg(
          `+${data.inserted ?? 0} nuevos · ${data.updated ?? 0} actualizados · ${data.total ?? 0} total`,
        );
        await load();
      }
    } catch (err) {
      setSyncMsg(
        `error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 8000);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (active === "all" ? projects : projects.filter((p) => p.category === active)),
    [projects, active],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2">
          Biblioteca
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight-vf text-vf-fg">
            {loading
              ? "Cargando proyectos…"
              : projects.length === 0
                ? "Sin proyectos"
                : `${projects.length} proyecto${projects.length === 1 ? "" : "s"}`}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              title="Cruzar Vercel + GitHub e insertar/actualizar la tabla projects"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-vf-bg-2 border border-vf-border-1 text-vf-fg-1 text-xs disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-vf-green text-black text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Dar de alta
            </button>
          </div>
        </div>
        <p className="text-sm text-vf-fg-2">
          Filtra por categoría · sincroniza para traer Vercel + GitHub
        </p>
        {syncMsg && (
          <div className="text-xs font-mono text-vf-fg-1 bg-vf-bg-2 border border-vf-border-1 rounded-md px-2 py-1.5 mt-1">
            {syncMsg}
          </div>
        )}
      </header>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
              "min-h-[44px] touch-manipulation",
              active === c.id
                ? "bg-vf-green text-black"
                : "bg-vf-bg-1 text-vf-fg-1 hover:bg-vf-bg-2",
            )}
          >
            <span className="mr-1.5">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* List or empty state */}
      <section>
        {!loading && projects.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : !loading && filtered.length === 0 ? (
          <div className="py-12 text-center text-vf-fg-2">
            No hay proyectos en esta categoría.
          </div>
        ) : (
          <div className="border-t border-vf-border">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-4 px-4 -mx-4 md:mx-0 hover:bg-vf-bg-1 transition-colors border-b border-vf-border"
              >
                <Link
                  href={`/projects/${p.id}`}
                  className="min-w-0 flex-1 pr-3 block group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-vf-fg font-medium truncate group-hover:underline">
                      {p.name}
                    </span>
                    {p.github_private && (
                      <Lock className="w-3 h-3 text-vf-fg-2 flex-shrink-0" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-vf-fg-2 truncate flex items-center gap-1.5 mt-0.5">
                    <GitBranch className="w-3 h-3 flex-shrink-0" />
                    {p.github_repo ?? "(sin repo)"}
                    {p.github_language && (
                      <span className="ml-1 px-1.5 py-0 text-[10px] bg-vf-bg-2 rounded">
                        {p.github_language}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.vercel_url && (
                    <ExternalLink className="w-3.5 h-3.5 text-vf-green-quiet" />
                  )}
                  <span className="font-mono text-[10px] uppercase text-vf-fg-2 mr-1">
                    {p.category}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      openV({
                        label: "PROYECTO",
                        value: `${p.name} · ${p.github_repo ?? "sin repo"}`,
                        prompt: `Cuéntame el estado actual de ${p.name} (repo ${p.github_repo ?? "n/a"}, deploy ${p.vercel_url ?? "n/a"}, categoría ${p.category}). ¿Algo que necesite atención?`,
                      });
                    }}
                    title="Preguntar a V sobre este proyecto"
                    aria-label="Preguntar a V"
                    className="inline-flex items-center gap-1 h-8 px-2 rounded text-vf-green hover:bg-vf-green/10 transition-colors"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-medium">V</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-vf-border-1 rounded-xl px-6 py-16 text-center space-y-4">
      <div className="text-3xl">📭</div>
      <div>
        <h2 className="text-vf-fg font-semibold text-lg">El tablero está limpio</h2>
        <p className="text-vf-fg-2 text-sm mt-1 max-w-md mx-auto">
          Da de alta tus proyectos uno por uno. V los irá conociendo conforme
          los agregues y podrá ayudarte con cada uno.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-vf-green text-black text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Dar de alta el primer proyecto
      </button>
    </div>
  );
}

function AddProjectModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    github_repo: "",
    vercel_url: "",
    domain: "",
    category: "en_revision",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.id.trim() || !form.name.trim()) {
      setError("ID y nombre son requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          github_repo: form.github_repo || null,
          vercel_url: form.vercel_url || null,
          domain: form.domain || null,
          description: form.description || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `error ${res.status}`);
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-vf-bg-1 border border-vf-border rounded-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-vf-fg">Dar de alta proyecto</h2>
        <form onSubmit={submit} className="space-y-3">
          <Field
            label="ID (slug, lowercase, sin espacios)"
            value={form.id}
            placeholder="ej. rideme"
            onChange={(v) => setForm({ ...form, id: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
          />
          <Field
            label="Nombre"
            value={form.name}
            placeholder="ej. RideMe"
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Descripción (opcional)"
            value={form.description}
            placeholder="Plataforma de transportación"
            onChange={(v) => setForm({ ...form, description: v })}
          />
          <Field
            label="Repo GitHub (turbillon50/...)"
            value={form.github_repo}
            placeholder="turbillon50/rideme"
            onChange={(v) => setForm({ ...form, github_repo: v })}
          />
          <Field
            label="URL deploy Vercel (opcional)"
            value={form.vercel_url}
            placeholder="https://..."
            onChange={(v) => setForm({ ...form, vercel_url: v })}
          />
          <Field
            label="Dominio custom (opcional)"
            value={form.domain}
            placeholder="rideme.allglobal.ec"
            onChange={(v) => setForm({ ...form, domain: v })}
          />
          <div>
            <label className="block text-xs text-vf-fg-2 mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg focus:outline-none focus:border-vf-border-2"
            >
              <option value="produccion">🟢 Producción</option>
              <option value="activo">🔵 Activo</option>
              <option value="en_revision">🟡 En revisión</option>
              <option value="en_pausa">⏸️ En pausa</option>
              <option value="archivo">📦 Archivo</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-vf-error font-mono" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-md border border-vf-border bg-vf-bg-2 text-vf-fg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-md bg-vf-green text-black text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Dar de alta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-vf-fg-2 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-vf-bg-2 border border-vf-border-1 rounded-md px-3 py-2 text-sm text-vf-fg placeholder:text-vf-fg-3 focus:outline-none focus:border-vf-border-2"
      />
    </div>
  );
}
