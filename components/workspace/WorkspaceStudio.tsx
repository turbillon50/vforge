"use client";
import { useState, useRef, useEffect } from "react";

type App = {
  id: string;
  name: string;
  deploy_url: string | null;
  repo_url: string | null;
};

type Msg = { role: "user" | "assistant"; content: string };

export function WorkspaceStudio() {
  // Layout state
  const [leftW, setLeftW] = useState(300);
  const [rightW, setRightW] = useState(300);
  const drag = useRef<null | "left" | "right">(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current) return;
      if (drag.current === "left") {
        setLeftW(Math.max(200, Math.min(500, e.clientX)));
      } else {
        setRightW(Math.max(200, Math.min(500, window.innerWidth - e.clientX)));
      }
    };
    const up = () => (drag.current = null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // Data state
  const [apps, setApps] = useState<App[]>([]);
  const [active, setActive] = useState<App | null>(null);
  const [tab, setTab] = useState<"preview" | "codigo" | "consola" | "detalles">(
    "preview"
  );
  const [conn, setConn] = useState<string[]>([]);
  const [files, setFiles] = useState<
    { name: string; path: string; type: string }[]
  >([]);
  const [code, setCode] = useState<{ path: string; content: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [split, setSplit] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [depMsg, setDepMsg] = useState<string | null>(null);

  // Chat state
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy V. Cuéntame qué deseas crear o conecta una cuenta y empezamos.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    fetch("/api/forja/apps")
      .then((r) => (r.ok ? r.json() : { apps: [] }))
      .then((d) => {
        setApps(d.apps || []);
        if (d.apps?.[0]) setActive(d.apps[0]);
      })
      .catch(() => {});

    fetch("/api/onboarding/status")
      .then((r) => (r.ok ? r.json() : { connected: [] }))
      .then((d) => setConn(d.connected || []))
      .catch(() => {});
  }, []);

  // Load files when app changes
  useEffect(() => {
    setFiles([]);
    setCode(null);
    if (active?.id) {
      fetch("/api/forja/app-files?app=" + active.id)
        .then((r) => (r.ok ? r.json() : { files: [] }))
        .then((d) => setFiles(d.files || []))
        .catch(() => {});
    }
  }, [active]);

  const openFile = (path: string) => {
    if (!active?.id) return;
    setTab("codigo");
    fetch(
      "/api/forja/app-files?app=" +
        active.id +
        "&path=" +
        encodeURIComponent(path)
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.content !== undefined) {
          setCode({ path, content: d.content });
        }
      })
      .catch(() => {});
  };

  const saveFile = async () => {
    if (!code || !active?.id || saving) return;
    setSaving(true);
    try {
      await fetch("/api/forja/app-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: active.id,
          path: code.path,
          content: code.content,
        }),
      });
    } catch {}
    setSaving(false);
  };

  const deploy = async () => {
    if (!active?.id || deploying) return;
    setDeploying(true);
    setDepMsg(null);
    try {
      const r = await fetch("/api/forja/app-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: active.id }),
      });
      const d = await r.json();
      setDepMsg(
        d.ok
          ? "Publicado" + (d.url ? ": " + d.url : "")
          : "Error: " + (d.error || "deploy")
      );
    } catch {
      setDepMsg("Error de red");
    }
    setDeploying(false);
  };

  // Chat helpers
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const send = async () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    const next = [...msgs, { role: "user", content: t }];
    setMsgs(next);
    setBusy(true);
    try {
      const r = await fetch("/api/v/client-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, history: next.slice(0, -1) }),
      });
      const d = await r.json();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: d.ok ? d.reply : "Estoy procesando, dame un momento.",
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "No se pudo conectar al servidor." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const Handle = ({ side }: { side: "left" | "right" }) => (
    <div
      onMouseDown={() => (drag.current = side)}
      className="w-1.5 cursor-col-resize bg-[var(--border-1)] hover:bg-[var(--border-1)]/70 transition-colors"
      aria-label={`Resize ${side} pane`}
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--color-background)] text-[var(--color-ink)]">
      {/* Toolbar */}
      <header className="flex h-14 items-center gap-4 border-b border-[var(--border-1)] px-4 bg-[var(--color-surface)]">
        <h1 className="text-lg font-medium">Estudio VForge</h1>
        <select
          aria-label="Seleccionar aplicación"
          value={active?.id || ""}
          onChange={(e) =>
            setActive(apps.find((a) => a.id === e.target.value) || null)
          }
          className="rounded border border-[var(--border-1)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          {apps.length === 0 && <option value="">Sin apps</option>}
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <nav className="flex gap-2">
          {(
            [
              ["preview", "Preview"],
              ["codigo", "Código"],
              ["consola", "Consola"],
              ["detalles", "Detalles"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1 text-sm rounded border border-[var(--border-1)] ${
                tab === k
                  ? "bg-black text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface)]/80"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>

        <button
          onClick={deploy}
          disabled={!active || deploying}
          className={`ml-auto px-3 py-1 text-sm rounded ${
            deploying ? "bg-black opacity-55" : "bg-black"
          } text-white disabled:opacity-50`}
        >
          {deploying ? "Publicando…" : "Deploy"}
        </button>

        {depMsg && (
          <span
            className="ml-2 text-sm"
            style={{
              color: depMsg.startsWith("Error") ? "#fca5a5" : "#86efac",
            }}
          >
            {depMsg}
          </span>
        )}
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat panel */}
        <aside
          style={{ width: leftW }}
          className="flex shrink-0 flex-col border-r border-[var(--border-1)] bg-[var(--color-surface)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-1)] px-3 py-2">
            <span className="h-6 w-6 flex items-center justify-center rounded bg-black text-sm font-semibold text-white">
              V
            </span>
            <span className="text-sm font-medium">Asistente V</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] ${
                  m.role === "user" ? "ml-auto text-right" : "mr-auto"
                }`}
              >
                <div
                  className={`rounded px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-black text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-ink)]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <p className="text-sm text-[var(--fg-muted)]">V está procesando…</p>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-[var(--border-1)] p-3">
            <input
              aria-label="Mensaje al asistente"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded border border-[var(--border-1)] bg-[var(--color-surface)] px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            >
              ►
            </button>
          </div>
        </aside>

        <Handle side="left" />

        {/* Central content */}
        <section className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border-1)] px-3 py-2 bg-[var(--color-surface)]">
            <button
              onClick={() => setSplit((s) => !s)}
              className="ml-auto px-3 py-1 text-sm rounded bg-[var(--color-surface)] border border-[var(--border-1)] text-[var(--color-ink)]"
            >
              {split ? "Unir" : "Dividir"}
            </button>
            {active?.deploy_url && (
              <a
                href={active.deploy_url}
                target="_blank"
                rel="noreferrer"
                className="rounded px-3 py-1 text-sm border border-[var(--border-1)] text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
              >
                Abrir preview
              </a>
            )}
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {split && (
              <div className="w-1/2 border-r border-[var(--border-1)] overflow-auto bg-white">
                {active?.deploy_url ? (
                  <iframe
                    title="preview-2"
                    src={active.deploy_url}
                    className="h-full w-full border-0"
                  />
                ) : (
                  <p className="flex h-full items-center justify-center text-[var(--fg-muted)]">
                    Sin preview disponible
                  </p>
                )}
              </div>
            )}

            <div
              className={`flex-1 overflow-auto ${
                split ? "w-1/2" : "w-full"
              } bg-white p-4`}
            >
              {tab === "preview" ? (
                active?.deploy_url ? (
                  <iframe
                    title="preview"
                    src={active.deploy_url}
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-[var(--fg-muted)]">
                    <p>Aún no hay aplicación para previsualizar.</p>
                    <a
                      href="/workspace#crear"
                      className="mt-3 rounded px-4 py-2 bg-[var(--color-surface)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]/80"
                    >
                      Crear una app
                    </a>
                  </div>
                )
              ) : tab === "codigo" ? (
                <div className="h-full">
                  {code ? (
                    <div className="flex h-full flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-[var(--fg-muted)]">
                          {code.path}
                        </span>
                        <button
                          onClick={saveFile}
                          disabled={saving}
                          className="px-3 py-1 rounded bg-black text-sm text-white disabled:opacity-50"
                        >
                          {saving ? "Guardando…" : "Guardar"}
                        </button>
                      </div>
                      <textarea
                        value={code.content}
                        onChange={(e) =>
                          setCode({ path: code.path, content: e.target.value })
                        }
                        className="flex-1 w-full rounded resize-none border border-[var(--border-1)] bg-[var(--color-surface)] p-3 font-mono text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-black"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <p className="text-center text-[var(--fg-muted)]">
                      {active
                        ? "Selecciona un archivo del panel derecho para editar."
                        : "Crea o selecciona una aplicación."}
                    </p>
                  )}
                </div>
              ) : tab === "consola" ? (
                <pre className="font-mono text-sm text-[var(--color-ink)]">
                  <code>
                    $ vforge dev{"\n"}
                    {active
                      ? `Build OK - ${active.name}`
                      : "Sin app activa."}
                    {"\n"}
                    {active?.deploy_url
                      ? `Sirviendo en ${active.deploy_url}`
                      : "Crea una app para ver logs."}
                  </code>
                </pre>
              ) : (
                // Detalles
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">
                    {active?.name || "—"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {active?.deploy_url && (
                      <a
                        href={active.deploy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded bg-[var(--color-surface)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]/80"
                      >
                        En vivo
                      </a>
                    )}
                    {active?.repo_url && (
                      <a
                        href={active.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded border border-[var(--border-1)] text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                      >
                        Repositorio
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <Handle side="right" />

        {/* Files & apps side panel */}
        <aside
          style={{ width: rightW }}
          className="flex shrink-0 flex-col border-l border-[var(--border-1)] bg-[var(--color-surface)]"
        >
          <div className="px-3 py-2 border-b border-[var(--border-1)] font-medium text-[var(--color-ink)]">
            Archivos
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!active && (
              <p className="text-sm text-[var(--fg-muted)]">
                Sin aplicación activa.
              </p>
            )}
            {active && files.length === 0 && (
              <p className="text-sm text-[var(--fg-muted)]">
                No hay archivos. Conecta GitHub para obtener contenido.
              </p>
            )}
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => f.type === "file" && openFile(f.path)}
                className="block w-full text-left truncate rounded px-2 py-1 text-sm font-mono text-[var(--color-ink)] hover:bg-[var(--color-surface)]/80"
              >
                {f.type === "dir" ? "📁 " : ""}
                {f.name}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-b border-[var(--border-1)] font-medium text-[var(--color-ink)]">
            Tus apps
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {apps.length === 0 && (
              <p className="text-sm text-[var(--fg-muted)]">
                Aún no tienes aplicaciones.
              </p>
            )}
            {apps.map((a) => (
              <button
                key={a.id}
                onClick={() => setActive(a)}
                className={`block w-full text-left rounded px-2 py-1 text-sm ${
                  active?.id === a.id
                    ? "bg-black text-white"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-surface)]/80"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-[var(--border-1)] font-medium text-[var(--color-ink)]">
            Conexiones
          </div>
          <div className="p-2 space-y-1">
            {["github", "vercel", "stripe", "mindcontext"].map((s) => (
              <div
                key={s}
                className="flex justify-between items-center rounded px-2 py-1 text-sm text-[var(--color-ink)]"
              >
                <span className="capitalize">{s}</span>
                <span
                  className="font-medium"
                  style={{
                    color: conn.includes(s) ? "#86efac" : "rgba(0,0,0,0.35)",
                  }}
                >
                  {conn.includes(s) ? "conectado" : "-"}
                </span>
              </div>
            ))}
            <a
              href="/workspace/conexiones"
              className="block mt-1 text-sm text-[var(--color-ink)] hover:underline"
            >
              Gestionar conexiones
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}