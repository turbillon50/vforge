"use client";
import Link from "next/link";
import {
  GithubConnection,
  CerebrasModules,
  ArchiveSources,
  type ExtraConfig,
} from "./ConfigurationExtras";
import { useEffect, useState } from "react";
type Purpose = "skills" | "components" | "examples" | "ai-module" | "reference";
type Connection = {
  id: string;
  name: string;
  kind: "mcp" | "database" | "repository";
  endpoint: string;
  secret?: string;
  hasSecret?: boolean;
  hasEndpoint?: boolean;
  enabled: boolean;
  status: string;
  detail?: string;
  checkedAt?: string;
  purpose?: Purpose;
};
type Config = ExtraConfig & {
  engine: "cerebras" | "mesh" | "custom";
  model: string;
  customEndpoint?: string;
  customSecret?: string;
  hasCustomSecret?: boolean;
  connections: Connection[];
};
type Tab = "engine" | "modules" | "mcp" | "database" | "repository";
const tabs: { id: Tab; label: string }[] = [
  { id: "engine", label: "Motor y modelo" },
  { id: "modules", label: "Microtareas" },
  { id: "mcp", label: "MCP" },
  { id: "database", label: "Memoria" },
  { id: "repository", label: "Repositorios" },
];
const purposes: Record<Purpose, string> = {
  skills: "Skills",
  components: "Componentes",
  examples: "Ejemplos",
  "ai-module": "Módulos de IA",
  reference: "Referencia",
};
export function CanonicalSettings({ room = false }: { room?: boolean }) {
  const [config, setConfig] = useState<Config | null>(null),
    [tab, setTab] = useState<Tab>("engine"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/v/canonical", {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (live) setConfig(d);
      })
      .catch((e) => {
        if (live) setNotice(e.message || "No se pudo abrir la configuración.");
      });
    return () => {
      live = false;
    };
  }, []);
  function edit(p: Partial<Config>) {
    setConfig((c) => (c ? { ...c, ...p } : c));
    setDirty(true);
  }
  function patch(id: string, p: Partial<Connection>) {
    if (config)
      edit({
        connections: config.connections.map((c) =>
          c.id === id ? { ...c, ...p } : c,
        ),
      });
  }
  async function post(body: unknown) {
    const r = await fetch("/api/v/canonical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "No se pudo completar.");
    return d;
  }
  async function store() {
    if (!config) return;
    const d = await post(config);
    setConfig(d);
    setDirty(false);
  }
  async function save() {
    setBusy(true);
    setNotice("");
    try {
      await store();
      setNotice("Configuración guardada.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function test(id?: string) {
    setBusy(true);
    setNotice("");
    try {
      if (dirty) await store();
      const d = await post(
        id ? { action: "test", id } : { action: "test-engine" },
      );
      if (id) {
        setConfig(d);
        setNotice(
          d.connections.find((c: Connection) => c.id === id)?.detail ||
            "Prueba terminada.",
        );
      } else setNotice("Motor verificado · " + d.model);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "No se pudo probar.");
    } finally {
      setBusy(false);
    }
  }
  function add(kind: Connection["kind"]) {
    if (!config) return;
    if (
      kind === "database" &&
      config.connections.filter((c) => c.kind === "database").length >= 5
    )
      return;
    edit({
      connections: [
        ...config.connections,
        {
          id: crypto.randomUUID(),
          name:
            kind === "database"
              ? "Base de memoria"
              : kind === "repository"
                ? "Repositorio"
                : "MCP",
          kind,
          endpoint: "",
          enabled: true,
          status: "pending",
          ...(kind === "repository" ? { purpose: "skills" as Purpose } : {}),
        },
      ],
    });
  }
  const field =
    "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-1)] bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/20";
  const button =
    "min-h-11 rounded-xl border border-[var(--border-1)] bg-white px-4 text-sm text-black transition hover:bg-black/5 disabled:opacity-40";
  if (!room)
    return (
      <section className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] bg-white px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-black">V canónica</h1>
          <p className="mt-1 text-xs text-black/65">
            {config
              ? (config.engine === "custom"
                  ? "Motor propio"
                  : config.engine === "mesh"
                    ? "Mesh"
                    : "Cerebras") +
                " · " +
                config.connections.filter(
                  (c) => c.enabled && c.status === "ready",
                ).length +
                " conexiones verificadas"
              : "Chat y memoria de V"}
          </p>
        </div>
        <Link
          className={button + " flex shrink-0 items-center"}
          href="/app/v-canonica/configuracion"
        >
          Conexiones y motor
        </Link>
      </section>
    );
  const list = config?.connections.filter((c) => c.kind === tab) || [];
  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col bg-white text-black">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-1)] px-5 py-4">
        <div>
          <p className="text-xs text-black/60">V CANÓNICA</p>
          <h1 className="mt-1 text-xl font-semibold">Sala de configuración</h1>
        </div>
        <Link href="/app/v-canonica" className={button + " flex items-center"}>
          Volver al chat
        </Link>
      </header>
      <nav
        aria-label="Secciones de configuración"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-1)] px-4 py-2"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "min-h-11 shrink-0 rounded-xl px-4 text-sm " +
              (tab === t.id
                ? "bg-black text-white"
                : "text-black/70 hover:bg-black/5")
            }
          >
            {t.label}
            {config && t.id !== "engine" && t.id !== "modules"
              ? " · " + config.connections.filter((c) => c.kind === t.id).length
              : ""}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {!config ? (
          <p role="status">{notice || "Abriendo la sala…"}</p>
        ) : tab === "modules" ? (
          <CerebrasModules
            config={config}
            busy={busy}
            dirty={dirty}
            edit={edit}
            post={post}
            save={store}
            setBusy={setBusy}
            setNotice={setNotice}
          />
        ) : tab === "engine" ? (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Qué IA le da motor a V</h2>
              <p className="mt-1 text-sm text-black/65">
                El motor se puede cambiar conservando el historial y las fuentes
                de memoria.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Proveedor
                <select
                  className={field}
                  value={config.engine}
                  disabled={busy}
                  onChange={(e) =>
                    edit({
                      engine: e.target.value as Config["engine"],
                      model: "",
                    })
                  }
                >
                  <option value="cerebras">Cerebras</option>
                  <option value="mesh">Mesh · router de modelos</option>
                  <option value="custom">
                    Otro proveedor compatible con OpenAI
                  </option>
                </select>
              </label>
              <label className="text-sm">
                Modelo
                <input
                  className={field}
                  value={config.model}
                  disabled={busy}
                  placeholder={
                    config.engine === "mesh" ? "auto" : "gpt-oss-120b"
                  }
                  onChange={(e) => edit({ model: e.target.value })}
                />
              </label>
            </div>
            {config.engine === "custom" && (
              <div className="space-y-4">
                <label className="block text-sm">
                  URL base de la API
                  <input
                    type="url"
                    className={field}
                    value={config.customEndpoint || ""}
                    placeholder="https://proveedor.com/v1"
                    onChange={(e) => edit({ customEndpoint: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  API key
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={field}
                    value={config.customSecret || ""}
                    placeholder={
                      config.hasCustomSecret
                        ? "Guardada · escribe para reemplazar"
                        : "API key del proveedor"
                    }
                    onChange={(e) => edit({ customSecret: e.target.value })}
                  />
                </label>
              </div>
            )}
            <p className="text-xs text-black/65">
              {config.engine === "mesh"
                ? "Mesh puede enrutar a Cerebras o a las GPU que tenga disponibles. La prueba muestra el modelo que respondió."
                : config.engine === "custom"
                  ? "Admite APIs de chat compatibles con OpenAI. La key queda cifrada en servidor."
                  : "Utiliza la conexión de Cerebras configurada en VForge."}
            </p>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => test()}
            >
              Probar motor
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "repository" && (
              <GithubConnection
                config={config}
                busy={busy}
                dirty={dirty}
                edit={edit}
                post={post}
                save={store}
                setBusy={setBusy}
                setNotice={setNotice}
              />
            )}
            {tab === "database" && (
              <ArchiveSources
                busy={busy}
                post={post}
                setBusy={setBusy}
                setNotice={setNotice}
              />
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {tab === "mcp"
                    ? "Herramientas y MCP"
                    : tab === "database"
                      ? "Fuentes de memoria"
                      : "Repositorios y su función"}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-black/65">
                  {tab === "mcp"
                    ? "Vulcano, VForge, Mesh y los conectores que agregues."
                    : tab === "database"
                      ? "Hasta cinco bases PostgreSQL. Las consultas desde el chat son de sólo lectura."
                      : "Organiza cada repositorio como skills, componentes, ejemplos, módulos de IA o referencia. V puede consultar sus archivos mediante las herramientas conectadas."}
                </p>
              </div>
              <button
                type="button"
                className={button}
                disabled={busy || (tab === "database" && list.length >= 5)}
                onClick={() => add(tab as Connection["kind"])}
              >
                +{" "}
                {tab === "mcp"
                  ? "MCP"
                  : tab === "database"
                    ? "Base (" + list.length + "/5)"
                    : "Repositorio"}
              </button>
            </div>
            {!list.length && (
              <div className="rounded-2xl border border-dashed border-[var(--border-1)] p-6 text-sm text-black/65">
                Todavía no hay{" "}
                {tab === "database"
                  ? "bases de memoria"
                  : tab === "repository"
                    ? "repositorios"
                    : "MCP"}{" "}
                en esta sección.
              </div>
            )}
            {list.map((c) => (
              <details
                key={c.id}
                open={!c.hasEndpoint}
                className="rounded-2xl border border-[var(--border-1)] p-4"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {c.name}
                  <span className="ml-2 text-xs font-normal text-black/60">
                    {c.kind === "repository"
                      ? purposes[c.purpose || "reference"] + " · "
                      : ""}
                    {c.status === "ready"
                      ? "Verificada"
                      : c.status === "error"
                        ? "Revisar"
                        : "Pendiente"}
                  </span>
                </summary>
                <fieldset disabled={busy} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      Nombre
                      <input
                        className={field}
                        value={c.name}
                        onChange={(e) => patch(c.id, { name: e.target.value })}
                      />
                    </label>
                    {c.kind === "repository" && (
                      <label className="text-sm">
                        Función del repositorio
                        <select
                          className={field}
                          value={c.purpose || "reference"}
                          onChange={(e) =>
                            patch(c.id, { purpose: e.target.value as Purpose })
                          }
                        >
                          {Object.entries(purposes).map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <label className="block text-sm">
                    {c.kind === "database"
                      ? "Connection string"
                      : c.kind === "repository"
                        ? "Repositorio GitHub"
                        : "Dirección MCP"}
                    <input
                      type={c.kind === "database" ? "password" : "url"}
                      autoComplete="off"
                      spellCheck={false}
                      className={field}
                      value={c.endpoint}
                      placeholder={
                        c.kind === "database"
                          ? c.hasEndpoint
                            ? "Guardada · escribe para reemplazar"
                            : "postgresql://…"
                          : c.kind === "repository"
                            ? "https://github.com/owner/repo"
                            : "https://…/mcp"
                      }
                      onChange={(e) =>
                        patch(c.id, { endpoint: e.target.value })
                      }
                    />
                  </label>
                  {c.kind === "mcp" && (
                    <label className="block text-sm">
                      Token Bearer
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={field}
                        value={c.secret || ""}
                        placeholder={
                          c.hasSecret
                            ? "Guardado · escribe para reemplazar"
                            : "Credencial de la conexión"
                        }
                        onChange={(e) =>
                          patch(c.id, { secret: e.target.value })
                        }
                      />
                    </label>
                  )}
                  {c.detail && (
                    <p className="break-words text-xs text-black/65">
                      {c.detail}
                      {c.checkedAt
                        ? " · " + new Date(c.checkedAt).toLocaleString("es-MX")
                        : ""}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={(e) =>
                          patch(c.id, { enabled: e.target.checked })
                        }
                      />
                      Disponible para V
                    </label>
                    <button
                      className={button}
                      type="button"
                      onClick={() => test(c.id)}
                    >
                      Probar conexión
                    </button>
                    <button
                      className="min-h-11 px-3 text-sm text-black/65"
                      type="button"
                      onClick={() =>
                        edit({
                          connections: config.connections.filter(
                            (x) => x.id !== c.id,
                          ),
                        })
                      }
                    >
                      Quitar
                    </button>
                  </div>
                </fieldset>
              </details>
            ))}
          </div>
        )}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[var(--border-1)] bg-white px-5 py-3">
        {config && (
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={save}
            className="min-h-11 rounded-xl bg-black px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Procesando…" : "Guardar configuración"}
          </button>
        )}
        <p role="status" aria-live="polite" className="text-sm text-black/70">
          {notice ||
            (dirty
              ? "Cambios sin guardar"
              : "Los cambios guardados se aplican al siguiente mensaje.")}
        </p>
      </footer>
    </section>
  );
}
