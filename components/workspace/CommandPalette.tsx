"use client";
/**
 * CommandPalette — Cmd+K al estilo Linear.
 * Abre con ⌘K / Ctrl+K (o el evento global "vf:command-palette"), busca en vivo,
 * navega con ↑/↓, ejecuta con Enter y cierra con Esc.
 * VFIcons inline, Framer Motion, paleta VForge (tokens CSS semánticos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconChat, IconCpu, IconWorkflow, IconBranch, IconLayers,
  IconDatabase, IconUsers, IconSearch, IconActivity, IconMoon, IconSun,
} from "@/components/brand/VFIcons";

type IconCmp = typeof IconChat;
const ICONS: Record<string, IconCmp> = {
  chat: IconChat, cpu: IconCpu, workflow: IconWorkflow, branch: IconBranch,
  layers: IconLayers, database: IconDatabase, users: IconUsers, search: IconSearch,
  activity: IconActivity, moon: IconMoon, sun: IconSun,
};

type Command = {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  group: string;
  kbd?: string;
  action: (ctx: CommandContext) => void;
};

type CommandContext = {
  router: ReturnType<typeof useRouter>;
  close: () => void;
  setMode: (m: Mode) => void;
};
type Mode = "all" | "brain";

function applyTheme(t: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("vf-theme", t); } catch {}
}

const COMMANDS: Command[] = [
  // Navegación
  { id:"nav-chat",      label:"Ir a Conversación", icon:"chat",     group:"Navegar", kbd:"G C", action:c=>c.router.push("/app/chat") },
  { id:"nav-taller",    label:"Ir a Taller",       icon:"cpu",      group:"Navegar", kbd:"G T", action:c=>c.router.push("/app/taller") },
  { id:"nav-blueprint", label:"Ir a Blueprint",    icon:"workflow", group:"Navegar", kbd:"G B", action:c=>c.router.push("/app/blueprint") },
  { id:"nav-repovision",label:"Ir a RepoVisión",   icon:"branch",   group:"Navegar", kbd:"G R", action:c=>c.router.push("/app/repovision") },
  { id:"nav-projects",  label:"Ir a Proyectos",    icon:"layers",   group:"Navegar", kbd:"G P", action:c=>c.router.push("/app/projects") },
  { id:"nav-secrets",   label:"Ir a Bóveda",       icon:"database", group:"Navegar", kbd:"G E", action:c=>c.router.push("/app/secrets") },
  { id:"nav-admin",     label:"Ir a Usuarios",     icon:"users",    group:"Navegar", kbd:"G A", action:c=>c.router.push("/app/admin") },
  // Brain
  { id:"brain-search",  label:"Buscar en Brain…",  icon:"search",   group:"Brain", action:c=>c.setMode("brain") },
  { id:"brain-status",  label:"Estado del Brain",  icon:"activity", group:"Brain", action:c=>c.router.push("/app/activity") },
  // Apariencia
  { id:"theme-dark",    label:"Modo Oscuro",       icon:"moon",     group:"Apariencia", action:()=>applyTheme("dark") },
  { id:"theme-light",   label:"Modo Claro",        icon:"sun",      group:"Apariencia", action:()=>applyTheme("light") },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Trigger global: ⌘K / Ctrl+K + evento custom desde otros botones
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("vf:command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("vf:command-palette", onOpen);
    };
  }, []);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setMode("all");
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (mode === "brain") return [];
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [query, mode]);

  // Mantener el índice activo dentro de rango
  useEffect(() => { setActive(0); }, [query, mode]);

  const run = useCallback((cmd: Command) => {
    cmd.action({ router, close, setMode });
    // brain-search no cierra: pasa a modo búsqueda en Brain
    if (cmd.id !== "brain-search") {
      setOpen(false);
    } else {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [router, close]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (mode === "brain") {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = query.trim();
        setOpen(false);
        router.push(q ? `/esfera?q=${encodeURIComponent(q)}` : "/esfera");
      }
      if (e.key === "Backspace" && query === "") setMode("all");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) run(cmd);
    }
  };

  // Scroll al item activo
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.15 }}
          onMouseDown={close}
          role="dialog" aria-modal="true" aria-label="Paleta de comandos"
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
        >
          <motion.div
            initial={{ opacity:0, scale:0.96, y:-8 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.96, y:-8 }}
            transition={{ duration:0.15 }}
            onMouseDown={e=>e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-2)] bg-[var(--color-surface-elev)] shadow-2xl"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              {mode === "brain"
                ? <IconDatabase size={18} className="shrink-0 text-[var(--color-violet-300)]"/>
                : <IconSearch size={18} className="shrink-0 text-[var(--fg-tertiary)]"/>}
              {mode === "brain" && (
                <span className="shrink-0 rounded-md bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-violet-300)]">Brain</span>
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder={mode === "brain" ? "Buscar en Brain…" : "Buscar comando o navegar…"}
                className="flex-1 bg-transparent text-lg text-[var(--fg-primary)] placeholder:text-[var(--fg-subtle)] outline-none"
                autoComplete="off" spellCheck={false}
              />
              <kbd className="hidden shrink-0 rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-xs text-[var(--fg-tertiary)] sm:inline">Esc</kbd>
            </div>
            <div className="border-t border-[var(--border-1)]" />

            {/* Resultados */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2 no-scrollbar">
              {mode === "brain" ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--fg-subtle)]">
                  Escribe tu consulta y pulsa <span className="font-mono text-[var(--fg-tertiary)]">Enter</span> para buscar en el Brain.
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--fg-subtle)]">Sin resultados</p>
              ) : (
                filtered.map((cmd, idx) => {
                  const Icon = ICONS[cmd.icon];
                  const isActive = idx === active;
                  const prevGroup = idx > 0 ? filtered[idx - 1].group : null;
                  const showGroup = cmd.group !== prevGroup;
                  return (
                    <div key={cmd.id}>
                      {showGroup && (
                        <p className="px-3 pb-1 pt-2 font-mono text-xs uppercase tracking-wider text-[var(--fg-subtle)]">{cmd.group}</p>
                      )}
                      <button
                        data-idx={idx}
                        onMouseEnter={()=>setActive(idx)}
                        onClick={()=>run(cmd)}
                        className={[
                          "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition",
                          isActive
                            ? "border-l-2 border-violet-500 bg-violet-500/10"
                            : "border-l-2 border-transparent hover:bg-[var(--surface-2)]",
                        ].join(" ")}
                      >
                        <Icon size={16} className="shrink-0 text-[var(--fg-tertiary)]"/>
                        <span className="flex-1 truncate text-sm text-[var(--fg-primary)]">{cmd.label}</span>
                        {cmd.kbd && (
                          <kbd className="shrink-0 rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-xs text-[var(--fg-tertiary)]">{cmd.kbd}</kbd>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
