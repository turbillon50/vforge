"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

/** V flotante para el CLIENTE — chat seguro por tenant (gratis, GPU de V). */
export function ClientV() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hola, soy V. Te ayudo a conectar tus herramientas, crear tu app y cobrar. ¿Qué hacemos?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
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
      setMsgs((m) => [...m, { role: "assistant", content: d.ok ? d.reply : (d.error === "v_unavailable" || d.error === "v_upstream" ? "V está despertando, intenta en un momento." : "No pude responder ahora.") }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "No pude conectar. Intenta de nuevo." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Hablar con V"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "radial-gradient(120% 120% at 30% 25%, #a78bfa, #7c3aed 60%, #4c1d95)", boxShadow: "0 10px 30px -8px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
          <span className="font-display text-[20px] font-bold text-white">V</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl"
          style={{ height: "min(70vh,560px)", background: "rgba(13,13,18,0.96)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)", backdropFilter: "blur(14px)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: "radial-gradient(120% 120% at 30% 25%, #a78bfa, #7c3aed)" }}>V</span>
              V · tu asistente
            </span>
            <button onClick={() => setOpen(false)} className="text-[18px] leading-none" style={{ color: "rgba(255,255,255,0.4)" }}>×</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[88%]"}>
                <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={m.role === "user"
                    ? { background: "#7c3aed", color: "#fff" }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="mr-auto text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>V está pensando…</div>}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Escríbele a V…" autoFocus
              className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={send} disabled={busy || !input.trim()} className="rounded-xl px-3.5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "#fff", color: "#000" }}>→</button>
          </div>
        </div>
      )}
    </>
  );
}
