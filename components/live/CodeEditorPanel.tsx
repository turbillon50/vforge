"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconCode, IconLoader, IconRefresh, IconX } from "@/components/brand/VFIcons";

type Repository = {
  repo_full_name: string;
  role: string;
  is_primary: boolean;
  default_branch: string | null;
};

type TreeFile = { path: string; size: number | null; sha: string | null };
type OpenFile = {
  key: string;
  repository: string;
  branch: string;
  path: string;
  content: string;
  savedContent: string;
  sha: string;
};

function languageFor(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", css: "css", scss: "scss", html: "html", md: "markdown",
    mdx: "markdown", yml: "yaml", yaml: "yaml", sql: "sql", py: "python",
    sh: "shell", bash: "shell", mjs: "javascript", cjs: "javascript",
  };
  return map[extension || ""] || "plaintext";
}

function friendlyError(code: string) {
  const messages: Record<string, string> = {
    connect_github: "Reconecta GitHub para leer y guardar código.",
    github_forbidden: "GitHub no dio acceso a este repositorio. Revisa la instalación de VForge.",
    github_not_found: "GitHub no encontró este repositorio o rama.",
    file_too_large: "Este archivo supera 1 MB y no se abre en el editor web.",
    binary_file: "Este archivo es binario y no se puede editar como texto.",
    conflict: "El archivo cambió en GitHub. Recárgalo antes de volver a guardar.",
    forbidden: "Tu rol permite revisar, pero no modificar código.",
  };
  return messages[code] || "No se pudo completar la operación con GitHub.";
}

export function CodeEditorPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const encodedProjectId = encodeURIComponent(projectId);
  const saveRef = useRef<() => void>(() => undefined);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repository, setRepository] = useState("");
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState<TreeFile[]>([]);
  const [tabs, setTabs] = useState<OpenFile[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = tabs.find((tab) => tab.key === activeKey) ?? null;
  const dirty = active ? active.content !== active.savedContent : false;
  const hasDirtyTabs = tabs.some((tab) => tab.content !== tab.savedContent);
  const matchedFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? files.filter((file) => file.path.toLowerCase().includes(needle)) : files;
  }, [files, query]);
  const visibleFiles = matchedFiles.slice(0, 1_000);

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(payload.error || "request_failed"));
    return payload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void request(`/api/live/${encodedProjectId}/code?action=repositories`)
      .then((payload) => {
        if (cancelled) return;
        const list = (payload.repositories as Repository[]) || [];
        setRepositories(list);
        setCanWrite(Boolean(payload.canWrite));
        setRepository((list.find((item) => item.is_primary) ?? list[0])?.repo_full_name || "");
      })
      .catch((caught) => !cancelled && setError(friendlyError(caught instanceof Error ? caught.message : "")))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [encodedProjectId, request]);

  const loadTree = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await request(`/api/live/${encodedProjectId}/code?action=tree&repo=${encodeURIComponent(repository)}`);
      setFiles((payload.files as TreeFile[]) || []);
      setBranch(String(payload.branch || "main"));
    } catch (caught) {
      setFiles([]);
      setError(friendlyError(caught instanceof Error ? caught.message : ""));
    } finally {
      setLoading(false);
    }
  }, [encodedProjectId, repository, request]);

  useEffect(() => { void loadTree(); }, [loadTree]);

  useEffect(() => {
    if (!hasDirtyTabs) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDirtyTabs]);

  function closeEditor() {
    if (hasDirtyTabs && !window.confirm("Cerrar el editor sin guardar los cambios pendientes?")) return;
    onClose();
  }

  async function openFile(path: string) {
    const key = `${repository}:${path}`;
    if (tabs.some((tab) => tab.key === key)) {
      setActiveKey(key);
      return;
    }
    setOpening(true);
    setError(null);
    try {
      const payload = await request(`/api/live/${encodedProjectId}/code?action=file&repo=${encodeURIComponent(repository)}&path=${encodeURIComponent(path)}`);
      const tab: OpenFile = {
        key,
        repository,
        branch: String(payload.branch || branch),
        path,
        content: String(payload.content ?? ""),
        savedContent: String(payload.content ?? ""),
        sha: String(payload.sha || ""),
      };
      setTabs((current) => [...current, tab]);
      setActiveKey(key);
    } catch (caught) {
      setError(friendlyError(caught instanceof Error ? caught.message : ""));
    } finally {
      setOpening(false);
    }
  }

  function closeTab(key: string) {
    const target = tabs.find((tab) => tab.key === key);
    if (target && target.content !== target.savedContent && !window.confirm(`Cerrar ${target.path} sin guardar cambios?`)) return;
    const index = tabs.findIndex((tab) => tab.key === key);
    const next = tabs.filter((tab) => tab.key !== key);
    setTabs(next);
    if (activeKey === key) setActiveKey(next[Math.min(index, next.length - 1)]?.key ?? null);
  }

  const save = useCallback(async () => {
    if (!active || !dirty || !canWrite || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await request(`/api/live/${encodedProjectId}/code`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: active.repository, path: active.path, content: active.content, sha: active.sha }),
      });
      setTabs((current) => current.map((tab) => tab.key === active.key ? {
        ...tab,
        savedContent: tab.content,
        sha: String(payload.sha || tab.sha),
      } : tab));
      setNotice(`Commit ${String(payload.commitSha || "").slice(0, 7)} creado en ${active.branch}`);
    } catch (caught) {
      setError(friendlyError(caught instanceof Error ? caught.message : ""));
    } finally {
      setSaving(false);
    }
  }, [active, canWrite, dirty, encodedProjectId, request, saving]);

  saveRef.current = () => { void save(); };
  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border-1)] px-3">
        <IconCode size={13} />
        <h2 className="text-[12px] font-medium">Código</h2>
        <select aria-label="Repositorio" value={repository} onChange={(event) => setRepository(event.target.value)} className="ml-2 max-w-[280px] rounded-md border border-[var(--border-1)] bg-white px-2 py-1 font-mono text-[9px]">
          {repositories.map((item) => <option key={item.repo_full_name} value={item.repo_full_name}>{item.repo_full_name}{item.is_primary ? " · principal" : ""}</option>)}
        </select>
        <span className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)] sm:inline">{branch || "—"}</span>
        <button type="button" onClick={() => void loadTree()} className="ml-auto grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Actualizar archivos" title="Actualizar archivos"><IconRefresh size={11} /></button>
        <button type="button" onClick={() => void save()} disabled={!dirty || !canWrite || saving} className="inline-flex h-7 items-center gap-1 rounded-md bg-black px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] text-white disabled:opacity-30">
          {saving ? <IconLoader size={10} className="animate-spin" /> : <IconCheck size={10} />} Guardar
        </button>
        <button type="button" onClick={closeEditor} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Cerrar editor" title="Cerrar editor"><IconX size={11} /></button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[250px] shrink-0 flex-col border-r border-[var(--border-1)] bg-[var(--color-background)]">
          <div className="border-b border-[var(--border-1)] p-2">
            <input aria-label="Buscar archivo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar archivo…" className="h-8 w-full rounded-md border border-[var(--border-1)] bg-white px-2 font-mono text-[9px] outline-none focus:border-black" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {loading ? <div className="grid h-24 place-items-center"><IconLoader size={14} className="animate-spin" /></div> : visibleFiles.length ? visibleFiles.map((file) => (
              <button key={file.path} type="button" onClick={() => void openFile(file.path)} className={cn("block w-full truncate px-3 py-1.5 text-left font-mono text-[9px] hover:bg-white", active?.key === `${repository}:${file.path}` && "bg-white font-medium")} title={file.path}>{file.path}</button>
            )) : <p className="p-3 text-[10px] text-[var(--fg-muted)]">{repositories.length ? "No hay archivos visibles." : "Este proyecto no tiene repositorios enlazados."}</p>}
          </div>
          {matchedFiles.length > visibleFiles.length ? <p className="shrink-0 border-t border-[var(--border-1)] p-2 font-mono text-[8px] text-[var(--fg-muted)]">Mostrando 1,000 de {matchedFiles.length}. Usa el buscador.</p> : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 overflow-x-auto border-b border-[var(--border-1)] bg-[var(--color-background)]">
            {tabs.map((tab) => {
              const isDirty = tab.content !== tab.savedContent;
              return <div key={tab.key} className={cn("flex min-w-[140px] max-w-[240px] border-r border-[var(--border-1)] font-mono text-[9px]", tab.key === activeKey && "bg-white")}><button type="button" onClick={() => setActiveKey(tab.key)} className="flex min-w-0 flex-1 items-center gap-2 px-3" title={`${tab.repository}/${tab.path}`}><span className="truncate">{tab.path.split("/").pop()}</span>{isDirty ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" /> : null}</button><button type="button" onClick={() => closeTab(tab.key)} className="grid w-7 shrink-0 place-items-center opacity-50 hover:opacity-100" aria-label={`Cerrar ${tab.path}`}><IconX size={9} /></button></div>;
            })}
          </div>
          <div className="relative min-h-0 flex-1">
            {active ? (
              <Editor
                path={active.key}
                value={active.content}
                language={languageFor(active.path)}
                theme="vs-light"
                onMount={onMount}
                onChange={(value) => setTabs((current) => current.map((tab) => tab.key === active.key ? { ...tab, content: value ?? "" } : tab))}
                loading={<IconLoader size={16} className="animate-spin" />}
                options={{ automaticLayout: true, fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, lineHeight: 20, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 }, wordWrap: "off", tabSize: 2, renderWhitespace: "selection" }}
              />
            ) : <div className="grid h-full place-items-center text-center"><div><IconCode size={20} className="mx-auto mb-3" /><p className="text-[12px]">Selecciona un archivo</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">Monaco · varias pestañas · Ctrl+S</p></div></div>}
            {opening ? <div className="absolute inset-0 grid place-items-center bg-white/70"><IconLoader size={16} className="animate-spin" /></div> : null}
          </div>
          {(notice || error || (active && !canWrite)) ? <div className="flex min-h-8 shrink-0 items-center border-t border-[var(--border-1)] px-3 font-mono text-[9px]"><span>{error || notice || "Modo lectura para tu rol"}</span>{error ? <button type="button" onClick={() => setError(null)} className="ml-auto"><IconX size={10} /></button> : null}</div> : null}
        </div>
      </div>
    </section>
  );
}
