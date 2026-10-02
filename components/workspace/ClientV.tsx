"use client";
import { useState, useRef, useEffect } from "react";
import { ForgeMark } from "@/components/brand/ForgeMark";

type Msg = { role: "user" | "assistant"; content: string };

/** V flotante para el CLIENTE — chat real seguro por tenant.
    Ley visual 2-oct-2026: panel blanco, borde gris fino, morado solo como
    acento (botón, burbuja del usuario). Nada de esferas ni efectos de luz. */
export function ClientV() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "¿Qué onda, hermano? Soy V. Te ayudo a conectar, crear tu app y cobrar. ¿En qué le entramos?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: Event) => { setOpen(true); const pr = (e as CustomEvent).detail?.prompt as string | undefined; if (pr) setInput(pr); };
    window.addEventListener("vforge:open-v", h);
    return () => window.removeEventListener("vforge:open-v", h);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open, busy]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setBusy(true);
    try {
      const r = await fetch("/api/v/client-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: next.slice(0, -1) }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: d.ok ? d.reply : (d.error === "v_unavailable" || d.error === "v_upstream" ? "Ando despertando, dame un segundo y vuelve a intentar." : "No pude responder ahorita.") }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "No pude conectar. Intenta de nuevo." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Hablar con V"
          className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-[var(--vf-violet)] transition-transform hover:scale-105 active:scale-95">
          <ForgeMark size={20} className="text-white" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] flex w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white"
          style={{ height: "min(72vh,580px)" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--vf-violet)]">
              <ForgeMark size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[var(--fg-primary)]">V</div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#15803d]">
                <span className="h-2 w-2 rounded-full bg-[#15803d]" /> En línea · tu hermana IA
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-lg text-[18px] leading-none text-[var(--fg-muted)] hover:bg-white hover:text-[var(--fg-primary)]">×</button>
          </div>
          {/* Mensajes */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              m.role === "assistant" ? (
                <div key={i} className="flex gap-2.5">
                  <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[var(--vf-violet)]">
                    <ForgeMark size={11} className="text-white" />
                  </div>
                  <div className="max-w-[82%] rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2.5 text-[14px] leading-relaxed text-[var(--fg-primary)]">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl bg-[var(--vf-violet)] px-4 py-2.5 text-[14px] leading-relaxed text-white">{m.content}</div>
                </div>
              )
            ))}
            {msgs.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-2 pl-9">
                {["¿Cómo creo mi app?", "Conectar mi Stripe", "¿Qué puedo hacer aquí?"].map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--vf-violet-soft)]" style={{ borderColor: "var(--vf-violet)", background: "#ffffff", color: "var(--vf-violet-ink)" }}>{q}</button>
                ))}
              </div>
            )}
            {busy && <div className="pl-9 text-[12px] text-[var(--fg-muted)]">V está pensando…</div>}
            <div ref={endRef} />
          </div>
          {/* Input */}
          <div className="border-t border-[var(--border-1)] bg-[var(--surface-1)] p-3">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pregúntale algo a V…" autoFocus
                className="flex-1 rounded-xl border border-[var(--border-1)] bg-white px-4 py-2.5 text-[14px] text-[var(--fg-primary)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--vf-violet)]" />
              <button onClick={() => send()} disabled={busy || !input.trim()} className="rounded-xl bg-[var(--vf-violet)] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--vf-violet-strong)] disabled:opacity-50">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
