"use client";
import { useEffect, useState } from "react";

type App = { id: string; name: string; repo_url: string | null; deploy_url: string | null; template: string | null; created_at: string };

export function MisAppsView() {
  const [apps, setApps] = useState<App[] | null>(null);
  useEffect(() => { fetch("/api/forja/apps").then(r => r.ok ? r.json() : { apps: [] }).then(d => setApps(d.apps || [])).catch(() => setApps([])); }, []);
  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-12 md:px-8">
      <p className="font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.46)", letterSpacing: "0.22em" }}>Tu trabajo</p>
      <h1 className="vf-hgrad font-display mb-6 mt-3" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.045em", fontWeight: 600 }}>Mis apps</h1>
      {apps === null ? (
        <div className="vf-card vf-reveal p-8 text-center text-[13px]" style={{ color: "rgba(255,255,255,0.58)" }}>Cargando…</div>
      ) : apps.length === 0 ? (
        <div className="vf-card vf-reveal p-10 text-center">
          <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>Aún no creas ninguna app.</p>
          <a href="/workspace#crear" className="vf-btn mt-4 inline-block rounded-full px-5 py-2.5 text-[13px] font-semibold text-white">Crear mi primera app &rarr;</a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((a) => (
            <div key={a.id} className="vf-card vf-reveal overflow-hidden">
              {a.deploy_url && <iframe title={a.name} src={a.deploy_url} className="h-40 w-full" style={{ border: "none", background: "#fff" }} />}
              <div className="p-4">
                <p className="text-[14px] font-semibold text-white">{a.name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                  {a.deploy_url && <a href={a.deploy_url} target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>Ver en vivo &rarr;</a>}
                  {a.repo_url && <a href={a.repo_url} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.55)" }}>Repo &rarr;</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
