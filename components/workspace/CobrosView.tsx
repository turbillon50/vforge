"use client";
import { useState } from "react";

type Link = { name: string; amount: number; currency: string; url: string; fee: number };

export function CobrosView() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("mxn");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const crear = async () => {
    if (!name.trim() || !amount || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/forja/cobro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), amount: Number(amount), currency }) });
      const d = await r.json();
      if (d.ok) { setLinks((l) => [{ name: d.name, amount: d.amount, currency: d.currency, url: d.url, fee: d.fee }, ...l]); setName(""); setAmount(""); setMsg(null); }
      else if (d.error === "connect_stripe") setMsg("Conecta Stripe en Conexiones para poder cobrar.");
      else if (d.error === "monto_minimo") setMsg("El monto mínimo es 10.");
      else setMsg(d.error || "No se pudo crear el link.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };
  const copy = (u: string) => { navigator.clipboard?.writeText(u); setCopied(u); setTimeout(() => setCopied(null), 1500); };

  return (
    <main className="relative mx-auto w-full max-w-3xl">
      <p className="vf-reveal font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">Stripe Connect · comisión 1.5% en Free</p>
      <h1 className="vf-reveal vf-hgrad mb-2 mt-3 font-semibold" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.045em" }}>Cobros</h1>
      <p className="vf-reveal mb-8 text-[13px] text-white/60">Crea un link de pago en segundos. El dinero llega directo a tu cuenta de Stripe.</p>

      <div className="vf-card vf-reveal p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_110px]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto o servicio" className="rounded-xl px-4 py-3 text-[14px] outline-none" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }} />
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Monto" className="rounded-xl px-4 py-3 text-[14px] outline-none" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }} />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl px-3 py-3 text-[14px] outline-none" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }}>
            <option value="mxn" style={{ color: "#000" }}>MXN</option><option value="usd" style={{ color: "#000" }}>USD</option><option value="eur" style={{ color: "#000" }}>EUR</option>
          </select>
        </div>
        <button onClick={crear} disabled={busy || !name.trim() || !amount} className="vf-btn mt-4 rounded-full px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50">{busy ? "Creando…" : "Crear link de pago"}</button>
        {msg && <p className="mt-3 text-[13px] text-rose-300">{msg}</p>}
      </div>

      {links.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">Links creados</p>
          {links.map((l, i) => (
            <div key={i} className="vf-card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{l.name}</p>
                <p className="text-[12.5px] text-white/55">{l.amount.toLocaleString()} {l.currency.toUpperCase()} · comisión {l.fee}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a href={l.url} target="_blank" rel="noreferrer" className="vf-chip text-[12.5px] text-white/85">Abrir</a>
                <button onClick={() => copy(l.url)} className="vf-btn rounded-full px-4 py-2 text-[12.5px] font-semibold text-white">{copied === l.url ? "Copiado ✓" : "Copiar link"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
