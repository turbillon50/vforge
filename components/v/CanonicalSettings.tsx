"use client";
import { useEffect, useState } from "react";
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
};
type Config = {
  engine: "cerebras" | "mesh";
  model: string;
  connections: Connection[];
};
export function CanonicalSettings() {
  const [open, setOpen] = useState(false),
    [config, setConfig] = useState<Config | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/v/canonical", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (live) setConfig(d);
      })
      .catch((e) => {
        if (live) setNotice(e.message || "No se pudo cargar.");
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
  async function request(body: unknown) {
    const r = await fetch("/api/v/canonical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "No se pudo guardar.");
    setConfig(d);
    return d as Config;
  }
  async function save() {
    if (!config) return;
    setBusy(true);
    setNotice("");
    try {
      await request(config);
      setDirty(false);
      setNotice("Configuración guardada.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function test(id: string) {
    setBusy(true);
    setNotice("");
    try {
      if (dirty && config) {
        await request(config);
        setDirty(false);
      }
      const d = await request({ action: "test", id });
      setNotice(
        d.connections.find((c) => c.id === id)?.detail || "Prueba terminada.",
      );
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
                ? "Skills"
                : "MCP",
          kind,
          endpoint: "",
          enabled: true,
          status: "pending",
        },
      ],
    });
  }
  const field =
    "w-full rounded-xl border border-[var(--border-1)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg-primary)]";
  return (
    <section className="mx-auto flex min-h-0 max-h-[55%] w-full max-w-3xl shrink-0 flex-col border-b border-[var(--border-1)] bg-white px-4 py-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--fg-secondary)]">
            CASA OFICIAL · ACCESO OWNER
          </p>
          <h1 className="text-xl font-semibold">V canónica</h1>
          <p className="mt-1 text-sm text-[var(--fg-secondary)]">
            Una identidad, un historial. Conexiones y motor a tu elección.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-11 rounded-xl border border-[var(--border-1)] px-4 text-sm"
        >
          {open ? "Cerrar conexiones" : "Conexiones y motor"}
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      )}
      {open && config && (
        <div className="mt-4 min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Motor de V
              <select
                className={field + " mt-1"}
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
                <option value="mesh">Mesh · GPU / router</option>
              </select>
            </label>
            <label className="text-sm">
              Modelo
              <input
                className={field + " mt-1"}
                value={config.model}
                disabled={busy}
                placeholder="Usar modelo del servidor"
                onChange={(e) => edit({ model: e.target.value })}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--fg-secondary)]">
            Cambiar el motor conserva tus conversaciones y el archivo de V. Las
            conexiones sólo se marcan disponibles después de responder.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => add("mcp")}
              className="min-h-11 rounded-xl border border-[var(--border-1)] px-3 text-sm"
            >
              + MCP
            </button>
            <button
              disabled={
                busy ||
                config.connections.filter((c) => c.kind === "database")
                  .length >= 5
              }
              onClick={() => add("database")}
              className="min-h-11 rounded-xl border border-[var(--border-1)] px-3 text-sm disabled:opacity-40"
            >
              + Base (
              {config.connections.filter((c) => c.kind === "database").length}
              /5)
            </button>
            <button
              disabled={busy}
              onClick={() => add("repository")}
              className="min-h-11 rounded-xl border border-[var(--border-1)] px-3 text-sm"
            >
              + Repositorio / skills
            </button>
          </div>
          {config.connections.map((c) => (
            <fieldset
              key={c.id}
              disabled={busy}
              className="space-y-3 rounded-2xl border border-[var(--border-1)] p-4"
            >
              <legend className="px-1 text-xs uppercase text-[var(--fg-secondary)]">
                {c.kind === "database"
                  ? "PostgreSQL"
                  : c.kind === "repository"
                    ? "Repositorio"
                    : "MCP"}{" "}
                ·{" "}
                {c.status === "ready"
                  ? "Verificada"
                  : c.status === "error"
                    ? "Revisar"
                    : "Pendiente"}
              </legend>
              <label className="block text-xs">
                Nombre
                <input
                  className={field + " mt-1"}
                  value={c.name}
                  onChange={(e) => patch(c.id, { name: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                {c.kind === "database"
                  ? "Connection string"
                  : c.kind === "repository"
                    ? "Repositorio GitHub"
                    : "Dirección MCP"}
                <input
                  type={c.kind === "database" ? "password" : "url"}
                  autoComplete="off"
                  spellCheck={false}
                  className={field + " mt-1"}
                  value={c.endpoint}
                  placeholder={
                    c.kind === "database"
                      ? c.hasEndpoint
                        ? "Guardada · escribe para reemplazar"
                        : "postgresql://…"
                      : c.kind === "repository"
                        ? "https://github.com/turbillon50/skills-vault"
                        : "https://…/mcp"
                  }
                  onChange={(e) => patch(c.id, { endpoint: e.target.value })}
                />
              </label>
              {c.kind !== "database" && (
                <label className="block text-xs">
                  {c.kind === "repository"
                    ? "Token GitHub (repos privados)"
                    : "Token Bearer"}
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={field + " mt-1"}
                    value={c.secret || ""}
                    placeholder={
                      c.hasSecret
                        ? "Guardado · escribe para reemplazar"
                        : "Token si la conexión lo requiere"
                    }
                    onChange={(e) => patch(c.id, { secret: e.target.value })}
                  />
                </label>
              )}
              {c.detail && (
                <p className="break-words text-xs text-[var(--fg-secondary)]">
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
                    onChange={(e) => patch(c.id, { enabled: e.target.checked })}
                  />
                  Conectar al chat
                </label>
                <button
                  type="button"
                  onClick={() => test(c.id)}
                  className="min-h-11 rounded-xl border border-[var(--border-1)] px-3 text-sm"
                >
                  Probar conexión
                </button>
                <button
                  type="button"
                  onClick={() =>
                    edit({
                      connections: config.connections.filter(
                        (x) => x.id !== c.id,
                      ),
                    })
                  }
                  className="min-h-11 px-2 text-xs"
                >
                  Quitar
                </button>
              </div>
            </fieldset>
          ))}
          <div className="sticky bottom-0 flex items-center gap-3 bg-[var(--bg)] py-3">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={save}
              className="min-h-11 rounded-xl bg-[var(--fg-primary)] px-5 text-sm font-medium text-[var(--bg)] disabled:opacity-40"
            >
              {busy ? "Procesando…" : "Guardar conexiones"}
            </button>
            {dirty && <span className="text-xs">Cambios sin guardar</span>}
          </div>
        </div>
      )}
      {open && !config && !notice && (
        <p className="mt-4 text-sm">Abriendo conexiones…</p>
      )}
    </section>
  );
}
