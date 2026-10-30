"use client";
import { useState } from "react";
import type { MicrotaskConfig } from "@/lib/v-canonical/microtasks";
type Purpose = "skills" | "components" | "examples" | "ai-module" | "reference";
const roles: Record<Purpose, string> = {
  skills: "Skills",
  components: "Componentes",
  examples: "Ejemplos",
  "ai-module": "Módulos de IA",
  reference: "Referencia",
};
export interface ExtraConfig {
  githubSecret?: string;
  hasGithubSecret?: boolean;
  githubRoles?: Record<string, Purpose>;
  microtasks?: MicrotaskConfig[];
}
export interface ExtraProps {
  config: ExtraConfig;
  busy: boolean;
  dirty: boolean;
  edit: (p: Partial<ExtraConfig>) => void;
  post: (body: unknown) => Promise<unknown>;
  save: () => Promise<void>;
  setBusy: (b: boolean) => void;
  setNotice: (s: string) => void;
}
const button =
  "min-h-11 rounded-xl border border-black/15 bg-white px-4 text-sm disabled:opacity-40";
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-black";
interface RepoList {
  account: string;
  page: number;
  next_page: number | null;
  repositories: Array<{
    name: string;
    url: string;
    private: boolean;
    purpose: Purpose;
  }>;
}
export function GithubConnection(p: ExtraProps) {
  const [repos, setRepos] = useState<RepoList | null>(null);
  async function load(page = 1) {
    p.setBusy(true);
    p.setNotice("");
    try {
      if (p.dirty) await p.save();
      const d = (await p.post({ action: "github-list", page })) as RepoList;
      setRepos(d);
      p.setNotice(
        "GitHub conectado: " +
          d.account +
          ". El mismo acceso sirve para todos los repositorios autorizados.",
      );
    } catch (e) {
      p.setNotice(
        e instanceof Error ? e.message : "No se pudo conectar GitHub.",
      );
    } finally {
      p.setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-black/15 p-4">
      <div>
        <h3 className="font-semibold">Una conexión GitHub para V</h3>
        <p className="mt-1 text-sm text-black/65">
          Guarda el token una vez. V podrá listar y leer todos los repositorios
          que autorice esa cuenta; también se usará en los repositorios que
          agregues abajo.
        </p>
      </div>
      <label className="block text-sm">
        Token GitHub compartido
        <input
          type="password"
          autoComplete="new-password"
          className={field}
          disabled={p.busy}
          value={p.config.githubSecret || ""}
          placeholder={
            p.config.hasGithubSecret
              ? "Conexión guardada · escribe sólo para reemplazar"
              : "Token con acceso de lectura a tus repositorios"
          }
          onChange={(e) => p.edit({ githubSecret: e.target.value })}
        />
      </label>
      <button
        type="button"
        className={button}
        disabled={p.busy}
        onClick={() => load()}
      >
        Conectar y cargar repositorios
      </button>
      {repos && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Cuenta: {repos.account} · página {repos.page}
          </p>
          {repos.repositories.map((r) => (
            <div
              key={r.name}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 py-2"
            >
              <div className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm underline underline-offset-4"
                >
                  {r.name}
                </a>
                <p className="text-xs text-black/60">
                  {r.private ? "Privado" : "Público"} · lectura autorizada por
                  GitHub
                </p>
              </div>
              <label className="text-xs">
                Función
                <select
                  className={field}
                  disabled={p.busy}
                  value={
                    p.config.githubRoles?.[r.name] || r.purpose || "reference"
                  }
                  onChange={(e) =>
                    p.edit({
                      githubRoles: {
                        ...p.config.githubRoles,
                        [r.name]: e.target.value as Purpose,
                      },
                    })
                  }
                >
                  {Object.entries(roles).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <div className="flex gap-2">
            {repos.page > 1 && (
              <button
                className={button}
                disabled={p.busy}
                onClick={() => load(repos.page - 1)}
              >
                Anterior
              </button>
            )}
            {repos.next_page && (
              <button
                className={button}
                disabled={p.busy}
                onClick={() => load(repos.next_page!)}
              >
                Más repositorios
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export function CerebrasModules(p: ExtraProps) {
  async function test(id: string) {
    p.setBusy(true);
    p.setNotice("");
    try {
      if (p.dirty) await p.save();
      const d = (await p.post({ action: "test-microtask", id })) as {
        model: string;
      };
      p.setNotice("Microtarea verificada · " + d.model);
    } catch (e) {
      p.setNotice(
        e instanceof Error ? e.message : "La microtarea no respondió.",
      );
    } finally {
      p.setBusy(false);
    }
  }
  return (
    <section className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Microtareas de Cerebras</h2>
        <p className="mt-1 text-sm text-black/65">
          Funciones auxiliares de V para buscar en el archivo, ordenar
          información y preparar gráficas. Conservan las fuentes y el motor
          principal de la conversación.
        </p>
      </div>
      {(p.config.microtasks || []).map((m, i) => (
        <fieldset
          key={m.id}
          disabled={p.busy}
          className="space-y-3 rounded-2xl border border-black/15 p-4"
        >
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) =>
                p.edit({
                  microtasks: p.config.microtasks!.map((x, j) =>
                    j === i ? { ...x, enabled: e.target.checked } : x,
                  ),
                })
              }
            />
            {m.name}
          </label>
          <label className="block text-sm">
            Modelo Cerebras
            <input
              className={field}
              value={m.model}
              onChange={(e) =>
                p.edit({
                  microtasks: p.config.microtasks!.map((x, j) =>
                    j === i ? { ...x, model: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className={button}
            disabled={!m.enabled || p.busy}
            onClick={() => test(m.id)}
          >
            Probar microtarea
          </button>
        </fieldset>
      ))}
    </section>
  );
}
interface Sources {
  archive: Array<{
    source: string;
    records: number;
    first: string;
    last: string;
  }>;
  recovered: Array<{
    source: string;
    records: number;
    first: string;
    last: string;
  }>;
  note: string;
}
export function ArchiveSources(
  p: Pick<ExtraProps, "busy" | "post" | "setBusy" | "setNotice">,
) {
  const [sources, setSources] = useState<Sources | null>(null);
  async function load() {
    p.setBusy(true);
    try {
      setSources((await p.post({ action: "memory-sources" })) as Sources);
    } catch (e) {
      p.setNotice(
        e instanceof Error ? e.message : "No se pudo consultar el archivo.",
      );
    } finally {
      p.setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-black/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          Archivo propio y respaldos recuperados
        </h3>
        <button className={button} disabled={p.busy} onClick={load}>
          Verificar fuentes
        </button>
      </div>
      {sources ? (
        <>
          <p className="text-xs text-black/65">{sources.note}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2">Fuente</th>
                  <th className="px-3">Registros</th>
                  <th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...sources.archive,
                  ...sources.recovered.map((x) => ({
                    ...x,
                    source: "Respaldos · " + x.source,
                  })),
                ].map((r, i) => (
                  <tr key={i} className="border-t border-black/10">
                    <td className="py-2">{r.source}</td>
                    <td className="px-3 tabular-nums">
                      {r.records.toLocaleString("es-MX")}
                    </td>
                    <td>
                      {r.first
                        ? new Date(r.first).toLocaleDateString("es-MX")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-black/65">
          Comprueba las fuentes que V puede consultar y sus fechas, sin
          reemplazar las memorias originales.
        </p>
      )}
    </section>
  );
}
