"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

/** V flotante para el CLIENTE — chat real seguro por tenant. Look premium + alma de hermana. */
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
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
          style={{ background: "radial-gradient(120% 120% at 30% 25%, #a78bfa, #7c3aed 60%, #4c1d95)", boxShadow: "0 10px 30px -8px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
          <span className="font-display text-[20px] font-bold text-white">V</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] flex w-[min(92vw,390px)] flex-col overflow-hidden rounded-3xl"
          style={{ height: "min(72vh,580px)", background: "rgba(10,8,16,0.97)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)", backdropFilter: "blur(18px)" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>
              <span className="absolute inset-0 animate-pulse rounded-full" style={{ background: "rgba(124,58,237,0.35)" }} />
              <span className="relative font-bold text-white">V</span>
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-white">V</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> En línea · tu hermana IA
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[18px] leading-none text-white/40 hover:text-white/70">×</button>
          </div>
          {/* Mensajes */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              m.role === "assistant" ? (
                <div key={i} className="flex gap-2.5">
                  <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }} />
                  <div className="max-w-[82%] rounded-3xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-[13.5px] leading-relaxed text-white/90 backdrop-blur-md">{m.content}</div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[82%] rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>{m.content}</div>
                </div>
              )
            ))}
            {msgs.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-2 pl-9">
                {["¿Cómo creo mi app?", "Conectar mi Stripe", "¿Qué puedo hacer aquí?"].map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border px-3 py-1.5 text-[12px] transition-colors" style={{ background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.32)", color: "#c4b5fd" }}>{q}</button>
                ))}
              </div>
            )}
            {busy && <div className="pl-9 text-[12px] text-white/40">V está pensando…</div>}
            <div ref={endRef} />
          </div>
          {/* Input */}
          <div className="border-t border-white/[0.08] p-3">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pregúntale algo a V…" autoFocus
                className="flex-1 rounded-2xl border border-white/[0.1] bg-white/[0.06] px-4 py-2.5 text-[13.5px] text-white placeholder-white/40 outline-none focus:border-[rgba(124,58,237,0.5)]" />
              <button onClick={() => send()} disabled={busy || !input.trim()} className="rounded-2xl px-5 text-[13px] font-semibold text-white transition-transform hover:scale-105 disabled:opacity-50" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
