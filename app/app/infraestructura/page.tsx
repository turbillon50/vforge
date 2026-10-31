"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import type { InfraHouse, InfraSnapshot, InfraSource } from "@/lib/infra/types";

const card = "rounded-xl border border-[var(--border-1)] bg-[var(--color-surface)] p-5";
const muted = "text-sm text-[var(--fg-secondary)]";
function bytes(n: number) { return `${(n / 1024 ** 3).toFixed(1)} GB`; }
function state(value?: string) {
  return ({ ok: "Verificado", warning: "Con observaciones", error: "No disponible", active: "Activo",
    inactive: "Inactivo", failed: "Fallando", not_installed: "Sin instalación local", not_running: "No está activo" } as Record<string, string>)[value || ""] || value || "Sin datos";
}
function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className={card}><p className={muted}>{title}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className={`mt-2 ${muted}`}>{detail}</p></div>;
}
function Source({ title, source }: { title: string; source?: InfraSource }) {
  return <section className={card}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{title}</h2><span className={muted}>{state(source?.status)}</span></div>
    <p className={`mt-2 break-all ${muted}`}>{source?.account || "Cuenta no verificada"}</p>
    {source?.status === "ok" ? <><p className={`mt-2 ${muted}`}>{source.items?.length ?? 0} recursos · {source.complete ? "Inventario completo" : "Inventario parcial"}</p>
      <ul className="mt-4 max-h-96 divide-y divide-[var(--border-1)] overflow-y-auto">{source.items?.map((p) => <li key={p.id} className="py-3 text-sm"><div className="flex items-start justify-between gap-3"><span className="break-all font-medium">{p.name}</span>{p.url && /^https:\/\//.test(p.url) ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0 underline underline-offset-4">Abrir</a> : <span className={muted}>Sin URL</span>}</div>{p.repo && <p className={`mt-1 break-all ${muted}`}>{p.repo}</p>}{p.state && <p className={`mt-1 ${muted}`}>{p.state}</p>}</li>)}</ul></> : <p role="status" className={`mt-4 ${muted}`}>No se pudo verificar esta conexión. {source?.error}</p>}
  </section>;
}
function House({ house }: { house: InfraHouse }) {
  const m = house.memory; const n = house.nginx; const meta = house.metamcp;
  if (house.status !== "ok") return <p role="alert" className={card}>No se pudo consultar {house.name}. El estado anterior no se presenta como actual.</p>;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric title="Disco" value={house.disk ? `${house.disk.percent}%` : "—"} detail={house.disk ? `${bytes(house.disk.used)} de ${bytes(house.disk.total)}` : "Sin lectura"} />
      <Metric title="Memoria disponible" value={m ? bytes(m.available) : "—"} detail={m ? `${bytes(m.total)} instalados` : "Sin lectura"} />
      <Metric title="Carga del servidor" value={house.load?.toFixed(2) ?? "—"} detail={`${house.cpuCount ?? "—"} CPU · ${house.hostname || "Sin nombre"}`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className={card}><h2 className="text-lg font-semibold">Hetzner · Servicios</h2><ul className="mt-4 divide-y divide-[var(--border-1)]">{house.services?.map((s) => <li key={s.name} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="break-all">{s.name}</span><strong>{state(s.state)}</strong></li>)}</ul></section>
      <section className={card}><h2 className="text-lg font-semibold">Nginx</h2><p className={`mt-2 ${muted}`}>{state(n?.status)}</p>{typeof n?.proxyRoutes === "number" && <><p className="mt-4 text-3xl font-semibold">{n.proxyRoutes} rutas</p><p className={`mt-2 ${muted}`}>{n.domains?.length} nombres · {n.conflicts} conflictos · {n.loadedBackups?.length} respaldos cargados</p><details className="mt-4 text-sm"><summary className="cursor-pointer">Dominios y observaciones</summary><p className="mt-3 break-all leading-6">{n.domains?.join(" · ")}</p>{n.loadedBackups?.map((b) => <p key={b} className="mt-2 break-all">Respaldo cargado: {b}</p>)}</details></>}</section>
      <section className={`${card} xl:col-span-2`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">MetaMCP</h2><a href="https://metamcp.vforge.site" target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">Abrir panel</a></div><p className={`mt-2 ${muted}`}>{house.id === "acevedo" && meta?.status === "not_installed" ? "Selene usa el acceso compartido por el túnel; MetaMCP se aloja en Casa Luis." : state(meta?.status)}</p>
        {meta?.status === "ok" && <><p className={`mt-3 ${muted}`}>{meta.endpoints?.length} entradas · {meta.namespaces} espacios · {meta.servers} servidores · Auditoría MCP: {meta.auditAvailable ? "Disponible" : "Pendiente"}</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border-1)]"><th className="py-3 pr-4">Entrada</th><th className="pr-4">Acceso</th><th>Autenticación</th></tr></thead><tbody>{meta.endpoints?.map((e) => <tr key={e.name} className="border-b border-[var(--border-1)]"><td className="py-3 pr-4">{e.name}</td><td className="pr-4">{e.private ? "Privado" : "Compartido"}</td><td>{e.oauth ? "OAuth" : e.authenticated ? "Llave requerida" : "Sin llave"}</td></tr>)}</tbody></table></div></>}
      </section>
    </div>
    {house.inventory && <div className="grid gap-5 xl:grid-cols-2"><Source title="GitHub · Fuente de código" source={house.inventory.github} /><Source title="Vercel · Fuente de despliegues" source={house.inventory.vercel} /></div>}
  </div>;
}
export default function InfrastructurePage() {
  const [snapshot, setSnapshot] = useState<InfraSnapshot | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("acevedo");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const r = await fetch("/api/infra", { cache: "no-store", signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo consultar la infraestructura");
      setSnapshot(d.snapshot); setStale(d.stale); setError("");
    } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Error de conexión"); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const c = new AbortController(); void refresh(c.signal); const timer = setInterval(() => void refresh(c.signal), 60_000); return () => { c.abort(); clearInterval(timer); }; }, [refresh]);
  const house = snapshot?.houses.find((h) => h.id === selected);
  return <div className="w-full min-w-0"><PageHeader eyebrow="Fuentes verificadas" title="Infraestructura" description="Las dos casas, sus conexiones y el estado real de la operación." actions={<><Link href="/app/projects" className="rounded-lg border border-[var(--border-1)] px-4 py-3 text-sm">Proyectos</Link><button disabled={loading} onClick={() => void refresh()} className="rounded-lg bg-[var(--color-ink)] px-4 py-3 text-sm text-[var(--color-surface)] disabled:opacity-50">{loading ? "Consultando…" : "Actualizar lectura"}</button></>} />
    <div className="space-y-5 p-5 md:p-8"><div className="flex flex-wrap gap-2" aria-label="Seleccionar casa">{["acevedo", "luis"].map((id) => <button key={id} aria-pressed={selected === id} onClick={() => setSelected(id)} className={`rounded-full border border-[var(--border-1)] px-5 py-3 text-sm ${selected === id ? "bg-[var(--color-ink)] text-[var(--color-surface)]" : "bg-[var(--color-surface)]"}`}>{id === "luis" ? "Casa Luis" : "Casa Acevedo"}</button>)}</div>
      <p className={muted}>Lectura: {snapshot ? new Date(snapshot.generatedAt).toLocaleString("es-MX", { timeZone: "America/Cancun" }) : "Pendiente"} · Captura cada 2 minutos. La carga del inventario puede tardar más.</p>
      {(stale || error) && <p role="alert" className={card}>{error || "La captura tiene más de 5 minutos. Verifica el colector antes de tomar decisiones."}{snapshot && error ? " Se conserva la última lectura; no está verificada como actual." : ""}</p>}
      {!snapshot && loading && <p role="status" className={muted}>Leyendo fuentes de infraestructura…</p>}
      {house && <House house={house} />}
      {snapshot?.catalog && <section className={card}><h2 className="text-lg font-semibold">Catálogo operativo de Acevedo</h2><p className={`mt-3 ${muted}`}>{snapshot.catalog.status === "ok" ? `${snapshot.catalog.projects} proyectos reconciliados con las fuentes verificadas. Última sincronización: ${snapshot.catalog.syncedAt ? new Date(snapshot.catalog.syncedAt).toLocaleString("es-MX", { timeZone: "America/Cancun" }) : "Sin fecha"}.` : `Sincronización pendiente: ${snapshot.catalog.error || "fuente no disponible"}.`}</p><Link href="/app/projects" className="mt-4 inline-block text-sm underline underline-offset-4">Abrir catálogo de proyectos</Link></section>}
      <section className={card}><h2 className="text-lg font-semibold">Qué fuente manda</h2><p className={`mt-3 leading-6 ${muted}`}>GitHub conserva el código; Vercel confirma los despliegues; Hetzner informa de procesos y recursos; MetaMCP define entradas y herramientas; Nginx define las rutas. VForge reúne las lecturas con fecha y mantiene el catálogo operativo de proyectos. Una conexión fallida se muestra como fallo, nunca como un inventario vacío verificado.</p></section>
    </div></div>;
}
