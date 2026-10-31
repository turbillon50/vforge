"use client";
import { useEffect, useState } from "react";
import type { InfraHouse } from "@/lib/infra/types";

type Reading = { generatedAt: string; stale: boolean; house: InfraHouse; gateway: { status: string; shared: boolean } };
const card = "rounded-xl border border-[var(--border-1)] bg-[var(--color-surface)] p-5";
export function PersonalInfrastructure({ spaceId }: { spaceId: string }) {
  const [data, setData] = useState<Reading | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      try {
        const r = await fetch(`/api/workspace/infra?space=${encodeURIComponent(spaceId)}`, { cache: "no-store", signal: controller.signal });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Fuente no disponible");
        setData(d); setError("");
      } catch (e) { if (e instanceof Error && e.name !== "AbortError") setError(e.message); }
    };
    void read(); const timer = setInterval(() => void read(), 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [spaceId]);
  const house = data?.house;
  return <section className="space-y-4" aria-label="Infraestructura del espacio">
    <div><h2 className="text-2xl font-semibold tracking-tight">Tu infraestructura</h2><p className="mt-2 text-sm text-[var(--fg-secondary)]">Lecturas de esta casa y sus conexiones asignadas.</p></div>
    {error && <p role="alert" className={card}>{error}{data ? " Se conserva la lectura anterior." : ""}</p>}
    {data?.stale && <p role="alert" className={card}>La lectura tiene más de cinco minutos; verifica su actualización.</p>}
    {house && house.status !== "ok" && <p role="alert" className={card}>No se pudo verificar el estado de esta casa. Los valores ausentes no indican que el servicio esté funcionando.</p>}
    {!data && !error && <p role="status">Consultando las fuentes…</p>}
    {house && <><p className="text-xs text-[var(--fg-secondary)]">{house.hostname} · {new Date(data!.generatedAt).toLocaleString("es-MX", { timeZone: "America/Cancun" })}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <article className={card}><h3 className="font-semibold">Hetzner</h3><p className="mt-3 text-3xl font-semibold">{house.disk?.percent ?? "—"}%</p><p className="mt-2 text-sm">Disco utilizado · {house.cpuCount ?? "—"} CPU</p><ul className="mt-4 space-y-2 text-xs">{house.services?.map((s) => <li key={s.name} className="flex justify-between gap-2"><span className="break-all">{s.name}</span><span>{s.state === "active" ? "Activo" : s.state}</span></li>)}</ul></article>
        <article className={card}><h3 className="font-semibold">Nginx</h3><p className="mt-3 text-3xl font-semibold">{house.nginx?.proxyRoutes ?? "—"}</p><p className="mt-2 text-sm">Rutas · {house.nginx?.conflicts ?? "—"} conflictos</p><p className="mt-4 text-sm">{house.nginx?.valid ? "Configuración válida" : "Lectura sin verificar"}</p></article>
        <article className={card}><h3 className="font-semibold">MetaMCP · Selene</h3><p className="mt-3 text-lg font-semibold">{data!.gateway.status === "ok" ? "Gateway verificado" : "Gateway sin verificar"}</p><p className="mt-3 text-sm text-[var(--fg-secondary)]">Servicio central compartido. Los proyectos y accesos de esta vista pertenecen a {house.name}.</p></article>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{Object.entries(house.inventory || {}).map(([provider, source]) => <article key={provider} className={card}>
        <h3 className="font-semibold">{provider === "github" ? "GitHub" : "Vercel"}</h3><p className="mt-2 break-all text-sm">{source.account || "Cuenta sin verificar"}</p>
        <p className="mt-2 text-sm text-[var(--fg-secondary)]">{source.status === "ok" ? `${source.items?.length ?? 0} recursos verificados${source.complete ? "" : " · inventario parcial"}` : "No se pudo verificar la conexión"}</p>
        <ul className="mt-4 max-h-72 divide-y divide-[var(--border-1)] overflow-auto">{source.items?.map((p) => <li key={p.id} className="py-3 text-sm"><p className="break-all font-medium">{p.name}</p>{p.state && <p className="mt-1 text-xs">{p.state}</p>}{p.url && /^https:\/\//.test(p.url) && <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-4">Abrir recurso</a>}</li>)}</ul>
      </article>)}</div>
    </>}
  </section>;
}
