"use client";
import { useState } from "react";

type Link = {
  name: string;
  amount: number;
  currency: string;
  url: string;
  fee: number;
};

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
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/forja/cobro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: Number(amount),
          currency,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setLinks((l) => [
          {
            name: d.name,
            amount: d.amount,
            currency: d.currency,
            url: d.url,
            fee: d.fee,
          },
          ...l,
        ]);
        setName("");
        setAmount("");
        setMsg(null);
      } else if (d.error === "connect_stripe") {
        setMsg("Conecta Stripe en Conexiones para poder cobrar.");
      } else if (d.error === "monto_minimo") {
        setMsg("El monto mínimo es 10.");
      } else {
        setMsg(d.error || "No se pudo crear el link.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = (u: string) => {
    navigator.clipboard?.writeText(u);
    setCopied(u);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 bg-[var(--color-background)] text-[var(--color-ink)]">
      {/* Header */}
      <p className="font-mono text-xs uppercase tracking-wider text-[var(--fg-secondary)]">
        Stripe Connect · comisión 1.5% en Free
      </p>
      <h1 className="mt-3 mb-2 text-4xl font-semibold">Cobros</h1>
      <p className="mb-8 text-sm text-[var(--fg-secondary)]">
        Crea un link de pago en segundos. El dinero llega directo a tu cuenta de
        Stripe.
      </p>

      {/* Form */}
      <section className="rounded-lg bg-white border border-[var(--border-1)] p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_110px]">
          <label className="sr-only" htmlFor="product-name">
            Nombre del producto o servicio
          </label>
          <input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del producto o servicio"
            className="rounded-lg px-4 py-3 text-sm bg-white border border-[var(--border-1)] focus:outline-none"
          />
          <label className="sr-only" htmlFor="product-amount">
            Monto
          </label>
          <input
            id="product-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Monto"
            className="rounded-lg px-4 py-3 text-sm bg-white border border-[var(--border-1)] focus:outline-none"
          />
          <label className="sr-only" htmlFor="currency-select">
            Moneda
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg px-3 py-3 text-sm bg-white border border-[var(--border-1)] focus:outline-none"
          >
            <option value="mxn">MXN</option>
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
          </select>
        </div>

        <button
          type="button"
          onClick={crear}
          disabled={busy || !name.trim() || !amount}
          className="mt-4 rounded-full bg-black text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50 hover:brightness-90"
          aria-busy={busy}
        >
          {busy ? "Creando…" : "Crear link de pago"}
        </button>

        {msg && (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            {msg}
          </p>
        )}
      </section>

      {/* Links list */}
      {links.length > 0 ? (
        <section className="mt-8 space-y-4">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--fg-secondary)]">
            Links creados
          </p>
          {links.map((l, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-4 rounded-lg bg-white border border-[var(--border-1)] p-5"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-semibold">{l.name}</p>
                <p className="text-xs text-[var(--fg-secondary)]">
                  {l.amount.toLocaleString()} {l.currency.toUpperCase()} ·
                  comisión {l.fee}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white text-black border border-[var(--border-1)] px-3 py-1 text-xs hover:brightness-95"
                >
                  Abrir
                </a>
                <button
                  type="button"
                  onClick={() => copy(l.url)}
                  className="rounded-full bg-white text-black border border-[var(--border-1)] px-3 py-1 text-xs font-semibold hover:brightness-95"
                >
                  {copied === l.url ? "Copiado ✓" : "Copiar link"}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="mt-8 text-center text-[var(--fg-secondary)]">
          <p>No has creado ningún link todavía.</p>
        </section>
      )}
    </main>
  );
}