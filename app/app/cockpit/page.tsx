"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import { GitBranch, Workflow, Boxes, CircleCheck, Plus, Cpu, ArrowUpRight } from "lucide-react";

type Item = { id: number; kind: string; text: string; done?: boolean };
type Data = { services?: Record<string, string>; pending?: any[]; items?: Item[] };

const NICE: Record<string, string> = {
  "vmomentum-hub": "Hub IA", "stitch-worker": "Stitch worker",
  "brain-relay": "Brain", "vmomentum-engine": "Motor", n8n: "n8n flujos",
};

export default function CockpitPage() {
  const [d, setD] = useState<Data>({});
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");

  const load = () =>
    fetch("/api/cockpit", { cache: "no-store" }).then((r) => r.json()).then(setD).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const items = d.items || [];
  const tasks = items.filter((x) => x.kind === "task");
  const notes = items.filter((x) => x.kind === "note");
  const open = tasks.filter((t) => !t.done).length;
  const svc = d.services || {};
  const pending = d.pending || [];
  const paused = svc["stitch-worker"] !== "active" || svc["n8n"] !== "active";

  const add = async (kind: string, text: string) => {
    if (!text.trim()) return;
    await fetch("/api/cockpit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", kind, text }) });
    load();
  };
  const toggle = async (id: number) => {
    await fetch("/api/cockpit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    load();
  };

  const shortcuts = [
    { href: "/app/repovision", label: "RepoVision", desc: "Grafo 3D de proyectos", icon: GitBranch },
    { href: "/app/blueprint", label: "Blueprint", desc: "Flujo de la fabrica", icon: Workflow },
    { href: "/app/projects", label: "Proyectos", desc: "Tu portfolio", icon: Boxes },
    { href: "/app/integrations", label: "Integraciones", desc: "Conectores MCP", icon: Cpu },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="vForge"
        title="Centro de Mando"
        description="Tu cockpit en vivo: servicios, pendientes y aprobaciones conectados en tiempo real."
        actions={
          <span className={`chip ${paused ? "text-amber-300" : "text-emerald-300"}`}>
            {paused ? "Fabrica pausada" : "Fabrica activa"}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3 md:p-8">
        <div className="glass rounded-2xl border border-white/10 p-5 md:col-span-2">
          <p className="label-caps mb-3 text-cyber-cyan">Pendientes · {open} abiertos</p>
          <div className="space-y-1">
            {tasks.length === 0 && <p className="py-2 text-sm text-muted">Sin pendientes</p>}
            {tasks.map((t) => (
              <button key={t.id} onClick={() => toggle(t.id)} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-white/5">
                <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${t.done ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"}`}>
                  {t.done && <CircleCheck size={12} />}
                </span>
                <span className={t.done ? "text-muted line-through" : "text-on-surface"}>{t.text}</span>
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); add("task", val); setVal(""); }} className="mt-3 flex gap-2">
            <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Agregar pendiente..." className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-violet-400" />
            <button type="submit" className="flex w-11 items-center justify-center rounded-xl bg-violet-500 text-white transition active:scale-95"><Plus size={18} /></button>
          </form>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="label-caps mb-3 text-cyber-cyan">Servicios en vivo</p>
          <div className="space-y-1">
            {Object.keys(svc).length === 0 && <p className="py-2 text-sm text-muted">Cargando...</p>}
            {Object.entries(svc).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2.5 border-t border-white/5 py-2 text-sm first:border-0">
                <span className={`h-2 w-2 flex-none rounded-full ${v === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-on-surface">{NICE[k] || k}</span>
                <span className={`ml-auto text-[11px] font-medium ${v === "active" ? "text-emerald-300" : "text-amber-300"}`}>{v === "active" ? "VIVO" : "PAUSA"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="label-caps mb-3 text-cyber-cyan">Aprobaciones · {pending.length}</p>
          {pending.length === 0 && <p className="py-2 text-sm text-muted">Sin demos pendientes</p>}
          {pending.map((p: any, i: number) => (
            <div key={i} className="border-t border-white/5 py-2 text-sm text-on-surface first:border-0">{p.title || p.idea || "lead"}</div>
          ))}
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5 md:col-span-2">
          <p className="label-caps mb-3 text-cyber-cyan">Notas</p>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-on-surface">{n.text}</div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); add("note", note); setNote(""); }} className="mt-3 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una nota..." className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-violet-400" />
            <button type="submit" className="flex w-11 items-center justify-center rounded-xl bg-violet-500 text-white transition active:scale-95"><Plus size={18} /></button>
          </form>
        </div>

        <div className="md:col-span-3">
          <p className="label-caps mb-3 text-muted">Atajos</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {shortcuts.map((sc) => (
              <Link key={sc.href} href={sc.href} className="group glass flex flex-col gap-2 rounded-2xl border border-white/10 p-4 transition hover:border-violet-400/40">
                <div className="flex items-center justify-between">
                  <sc.icon size={20} className="text-violet-300" />
                  <ArrowUpRight size={16} className="text-muted transition group-hover:text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">{sc.label}</p>
                  <p className="text-[12px] text-muted">{sc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
