"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";

type App = { id: string; name: string; deploy_url: string | null; repo_url: string | null };
type Msg = { role: "user" | "assistant"; content: string };

export function WorkspaceStudio() {
  const [leftW, setLeftW] = useState(330);
  const [rightW, setRightW] = useState(300);
  const drag = useRef<null | "left" | "right">(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current) return;
      if (drag.current === "left") setLeftW(Math.max(240, Math.min(540, e.clientX)));
      else setRightW(Math.max(240, Math.min(540, window.innerWidth - e.clientX)));
    };
    const up = () => (drag.current = null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const [apps, setApps] = useState<App[]>([]);
  const [active, setActive] = useState<App | null>(null);
  const [tab, setTab] = useState<"preview" | "codigo" | "consola" | "detalles">("preview");
  const [conn, setConn] = useState<string[]>([]);
  const [files, setFiles] = useState<{ name: string; path: string; type: string }[]>([]);
  const [code, setCode] = useState<{ path: string; content: string } | null>(null);
  useEffect(() => {
    fetch("/api/forja/apps").then(r => r.ok ? r.json() : { apps: [] }).then(d => { setApps(d.apps || []); if (d.apps?.[0]) setActive(d.apps[0]); }).catch(() => {});
    fetch("/api/onboarding/status").then(r => r.ok ? r.json() : { connected: [] }).then(d => setConn(d.connected || [])).catch(() => {});
  }, []);
  useEffect(() => {
    setFiles([]); setCode(null);
    if (active?.id) fetch("/api/forja/app-files?app=" + active.id).then(r => r.ok ? r.json() : { files: [] }).then(d => setFiles(d.files || [])).catch(() => {});
  }, [active]);
  const openFile = (path: string) => {
    if (!active?.id) return;
    setTab("codigo");
    fetch("/api/forja/app-files?app=" + active.id + "&path=" + encodeURIComponent(path)).then(r => r.ok ? r.json() : null).then(d => { if (d && d.content !== undefined) setCode({ path, content: d.content }); }).catch(() => {});
  };

  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Que onda, hermano? Soy V. Dime que construimos o conectame y le entramos." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const send = async () => {
    const t = input.trim(); if (!t || busy) return; setInput("");
    const nx = [...msgs, { role: "user" as const, content: t }]; setMsgs(nx); setBusy(true);
    try { const r = await fetch("/api/v/client-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t, history: nx.slice(0, -1) }) }); const d = await r.json(); setMsgs(m => [...m, { role: "assistant", content: d.ok ? d.reply : "Ando despertando, dame un segundo." }]); }
    catch { setMsgs(m => [...m, { role: "assistant", content: "No pude conectar." }]); } finally { setBusy(false); }
  };

  const Handle = ({ side }: { side: "left" | "right" }) => (
    <div onMouseDown={() => (drag.current = side)} className="w-1.5 cursor-col-resize bg-white/[0.04] transition-colors hover:bg-[#7c3aed]/40" />
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0f] text-white">
      <header className="flex h-12 items-center gap-4 border-b border-white/[0.08] px-4">
        <Link href="/workspace"><VWordmark /></Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Estudio</span>
        <select value={active?.id || ""} onChange={e => setActive(apps.find(a => a.id === e.target.value) || null)} className="ml-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-[12.5px] outline-none">
          {apps.length === 0 && <option value="">Sin apps aun</option>}
          {apps.map(a => <option key={a.id} value={a.id} className="text-black">{a.name}</option>)}
        </select>
        <div className="ml-auto"><UserButton afterSignOutUrl="/" /></div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside style={{ width: leftW }} className="flex shrink-0 flex-col border-r border-white/[0.08]">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>V</span>
            <span className="text-[13px] font-semibold">V - tu copiloto</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[92%]"}>
                <div className="rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed" style={m.role === "user" ? { background: "linear-gradient(135deg,#7c3aed,#6d28d9)" } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="text-[12px] text-white/40">V esta pensando...</div>}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-white/[0.08] p-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Escribele a V..." className="flex-1 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-[13px] outline-none placeholder-white/40 focus:border-[#7c3aed]/50" />
            <button onClick={send} disabled={busy || !input.trim()} className="rounded-full px-4 text-[13px] font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>{">"}</button>
          </div>
        </aside>
        <Handle side="left" />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-white/[0.08] px-3 py-2">
            {([["preview", "Preview"], ["codigo", "Codigo"], ["consola", "Consola"], ["detalles", "Detalles"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors" style={tab === k ? { background: "rgba(255,255,255,0.1)", color: "#fff" } : { color: "rgba(255,255,255,0.55)" }}>{l}</button>
            ))}
            {active?.deploy_url && <a href={active.deploy_url} target="_blank" rel="noreferrer" className="ml-auto rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-white/70 hover:text-white">Abrir</a>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {tab === "preview" ? (
              active?.deploy_url ? <iframe title="preview" src={active.deploy_url} className="h-full w-full border-0 bg-white" />
              : <div className="flex h-full items-center justify-center p-6 text-center text-[14px] text-white/45"><div>Aun no hay app que previsualizar.<br /><Link href="/workspace#crear" className="mt-3 inline-block rounded-full px-4 py-2 text-[13px] font-semibold text-black" style={{ background: "linear-gradient(180deg,#fff,#ededf2)" }}>Crear una app</Link></div></div>
) : tab === "codigo" ? (
              <div className="h-full overflow-auto bg-[#0b0b10] p-4">
                {code ? (
                  <>
                    <p className="mb-2 font-mono text-[11.5px] text-white/40">{code.path}</p>
                    <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/[0.08] bg-[#0d0d12] p-4 font-mono text-[12px] leading-relaxed text-white/85">{code.content}</pre>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-[13px] text-white/40">{active ? "Elige un archivo del panel derecho para ver su codigo." : "Crea o selecciona una app."}</div>
                )}
              </div>
            ) : tab === "consola" ? (
              <div className="h-full overflow-auto bg-[#070709] p-4 font-mono text-[12.5px] leading-relaxed">
                <p className="text-emerald-400">$ vforge dev</p>
                <p className="text-white/50">{active ? "Build OK - " + active.name : "Sin app activa."}</p>
                <p className="text-white/40">{active?.deploy_url ? "Sirviendo en " + active.deploy_url : "Crea una app para ver logs."}</p>
                <p className="mt-2 text-white/30">Proximamente: logs en vivo y shell real.</p>
              </div>
            ) : (
              <div className="p-6 text-[13.5px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Detalles</p>
                <h2 className="mt-2 text-[22px] font-semibold">{active?.name || "-"}</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {active?.deploy_url && <a href={active.deploy_url} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-[12.5px]" style={{ background: "rgba(124,58,237,0.16)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }}>En vivo</a>}
                  {active?.repo_url && <a href={active.repo_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/[0.1] px-4 py-2 text-[12.5px] text-white/70">Repositorio</a>}
                </div>
              </div>
            )}
          </div>
        </main>
        <Handle side="right" />
        <aside style={{ width: rightW }} className="flex shrink-0 flex-col border-l border-white/[0.08]">
          <div className="border-b border-white/[0.08] px-4 py-3 text-[12px] font-semibold text-white/80">Archivos</div>
          <div className="max-h-44 space-y-0.5 overflow-y-auto p-2">
            {!active && <p className="px-2 py-1 text-[12px] text-white/40">Sin app activa.</p>}
            {active && files.length === 0 && <p className="px-2 py-1 text-[12px] text-white/40">Sin archivos / conecta GitHub.</p>}
            {files.map((f) => (
              <button key={f.path} onClick={() => f.type === "file" && openFile(f.path)} className="block w-full truncate rounded-lg px-3 py-1.5 text-left font-mono text-[12px] text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white">{f.type === "dir" ? "📁 " : ""}{f.name}</button>
            ))}
          </div>
          <div className="border-b border-t border-white/[0.08] px-4 py-3 text-[12px] font-semibold text-white/80">Tus apps</div>
          <div className="space-y-1 overflow-y-auto p-2">
            {apps.length === 0 && <p className="px-2 py-2 text-[12.5px] text-white/40">Aun no creas apps.</p>}
            {apps.map(a => (
              <button key={a.id} onClick={() => setActive(a)} className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors" style={active?.id === a.id ? { background: "rgba(255,255,255,0.08)", color: "#fff" } : { color: "rgba(255,255,255,0.6)" }}>{a.name}</button>
            ))}
          </div>
          <div className="border-t border-white/[0.08] px-4 py-3 text-[12px] font-semibold text-white/80">Baul - conexiones</div>
          <div className="space-y-1 p-2">
            {["github", "vercel", "stripe", "mindcontext"].map(s => (
              <div key={s} className="flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px]">
                <span className="capitalize text-white/70">{s}</span>
                <span style={{ color: conn.includes(s) ? "#86efac" : "rgba(255,255,255,0.35)" }}>{conn.includes(s) ? "conectado" : "-"}</span>
              </div>
            ))}
            <Link href="/workspace/conexiones" className="mt-1 block rounded-lg px-3 py-2 text-[12px] text-[#c4b5fd]">Gestionar conexiones</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
