"use client";
import { useEffect, useState } from "react";

const OAUTH = [
  { id: "github", label: "GitHub", desc: "Para crear y guardar tus repos." },
  { id: "vercel", label: "Vercel", desc: "Para publicar (deploy) tus apps." },
  { id: "stripe", label: "Stripe", desc: "Para cobrar con links de pago." },
];
const LLMS: [string, string][] = [["gemini", "Gemini"], ["openai", "OpenAI"], ["anthropic", "Anthropic"]];

export function ConexionesView() {
  const [conn, setConn] = useState<string[]>([]);
  const [provider, setProvider] = useState("gemini");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [llmDone, setLlmDone] = useState(false);

  const load = () => fetch("/api/onboarding/status").then(r => r.ok ? r.json() : { connected: [] }).then(d => setConn(d.connected || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const saveLlm = async () => {
    if (!key.trim() || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/forja/connect-llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: key.trim() }) });
      const d = await r.json();
      if (d.ok) { setLlmDone(true); setMsg("Conectado. V correrá con tu " + provider + "."); setKey(""); }
      else setMsg(d.error || "No se pudo validar la key.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-12 md:px-8">
      <p className="font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.46)", letterSpacing: "0.22em" }}>Tu infraestructura</p>
      <h1 className="font-display mb-2 mt-3" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.045em", color: "#f4f4f6", fontWeight: 600 }}>Conexiones</h1>
      <p className="mb-8 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>Conecta tus cuentas. Todo queda en tu bóveda, cifrado; solo tú lo usas.</p>

      <div className="space-y-3">
        {OAUTH.map((s) => {
          const on = conn.includes(s.id);
          return (
            <div key={s.id} className="glossy lift flex items-center gap-4 rounded-2xl p-5">
              <img src={`/logos/${s.id}.svg`} alt={s.label} className="h-9 w-9 shrink-0" />
              <div>
                <p className="text-[15px] font-semibold text-white">{s.label}</p>
                <p className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>{s.desc}</p>
              </div>
              <div className="ml-auto">
                {on
                  ? <span className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>Conectado</span>
                  : <a href={`/api/auth/${s.id}/start`} className="rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5)" }}>Conectar &rarr;</a>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mb-3 mt-10 font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.46)", letterSpacing: "0.18em" }}>Tu IA (opcional)</p>
      <div className="glossy rounded-2xl p-5">
        <p className="mb-3 text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>Trae tu propia key y V corre con tu modelo. Sin key, usa el V de la casa gratis.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg px-3 py-2.5 text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
            {LLMS.map(([v, l]) => <option key={v} value={v} style={{ color: "#000" }}>{l}</option>)}
          </select>
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="Tu API key" className="flex-1 rounded-lg px-3.5 py-2.5 text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
          <button onClick={saveLlm} disabled={busy || !key.trim()} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: llmDone ? "#16a34a" : "linear-gradient(180deg,#ffffff,#ededf2)", color: llmDone ? "#fff" : "#0a0810" }}>{busy ? "Validando…" : llmDone ? "Conectado" : "Conectar"}</button>
        </div>
        {msg && <p className="mt-2 text-[12px]" style={{ color: llmDone ? "#86efac" : "#fca5a5" }}>{msg}</p>}
      </div>
    </main>
  );
}
