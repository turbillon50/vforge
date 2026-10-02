"use client";

/**
 * Hablar con V — el Jarvis de VForge.
 * Conversación de voz en tiempo real (agente de ElevenLabs: escucha continua, turnos naturales, la interrumpes cuando quieras).
 * V platica rápido y, cuando hay trabajo de verdad, lo ENCARGA al colectivo (Trío, V con GLM, Fábrica) que trabaja
 * con manos en segundo plano; aquí ves cómo va cada encargo. Lo que platican queda en la memoria de la casa.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Estado = "apagado" | "conectando" | "escuchando" | "hablando" | "error";
type Encargo = { tarea: string; quien?: string; estado: string; hace_min?: number; ultimo?: string };
type Sesion = {
  endSession: () => Promise<void>;
  setMicMuted: (m: boolean) => void;
  getInputVolume: () => number;
  getOutputVolume: () => number;
  sendUserMessage: (t: string) => void;
};

const HERRAMIENTA: Record<string, string> = {
  recordar: "Buscando en la memoria…",
  anotar: "Anotando…",
  encargar: "Encargándolo al colectivo…",
  encargos: "Revisando cómo van los encargos…",
  casa: "Revisando la casa…",
};

export function Jarvis() {
  const [estado, setEstado] = useState<Estado>("apagado");
  const [aviso, setAviso] = useState<string>("");
  const [tuyo, setTuyo] = useState("");
  const [suyo, setSuyo] = useState("");
  const [mudo, setMudo] = useState(false);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [escrito, setEscrito] = useState("");
  const sesion = useRef<Sesion | null>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  // Encargos: se refrescan solos mientras la pantalla está abierta
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      try {
        const d = await (await fetch("/api/jarvis/panel", { cache: "no-store" })).json();
        if (vivo) setEncargos(Array.isArray(d.encargos) ? d.encargos : []);
      } catch {}
    };
    void leer();
    const t = setInterval(leer, 8000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  // Una sola línea negra que respira con la voz (tuya cuando hablas, de V cuando ella habla)
  useEffect(() => {
    let raf = 0;
    const pintar = () => {
      const c = lienzo.current, s = sesion.current;
      if (c) {
        const g = c.getContext("2d")!, w = c.width, h = c.height;
        g.clearRect(0, 0, w, h);
        const v = s ? Math.min(1, (estado === "hablando" ? s.getOutputVolume() : s.getInputVolume()) * 2.2) : 0;
        const t = performance.now() / 260;
        g.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const k = Math.sin((x / w) * Math.PI);
          const y = h / 2 + Math.sin(x / 22 + t) * k * (2 + v * h * 0.38) + Math.sin(x / 9 - t * 1.7) * k * v * h * 0.12;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = estado === "apagado" ? "#c4c4c4" : "#000";
        g.lineWidth = 2;
        g.stroke();
      }
      raf = requestAnimationFrame(pintar);
    };
    raf = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(raf);
  }, [estado]);

  const colgar = useCallback(async () => {
    try { await sesion.current?.endSession(); } catch {}
    sesion.current = null;
    setEstado("apagado"); setAviso(""); setMudo(false);
  }, []);

  useEffect(() => () => { void colgar(); }, [colgar]);

  const hablar = useCallback(async () => {
    setEstado("conectando"); setAviso(""); setTuyo(""); setSuyo("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const d = await (await fetch("/api/jarvis/sesion", { cache: "no-store" })).json();
      if (!d.ok) throw new Error(d.error || "sin_sesion");
      const { Conversation } = await import("@elevenlabs/client");
      sesion.current = (await Conversation.startSession({
        signedUrl: d.signedUrl,
        dynamicVariables: { contexto: d.contexto || "" },
        onConnect: () => setEstado("escuchando"),
        onDisconnect: () => { sesion.current = null; setEstado("apagado"); setAviso(""); },
        onError: (m: string) => { setAviso(String(m || "Se cortó la conexión")); },
        onModeChange: ({ mode }: { mode: string }) => { setEstado(mode === "speaking" ? "hablando" : "escuchando"); if (mode === "speaking") setAviso(""); },
        onMessage: (m: { message: string; source?: string; role?: string }) => {
          if (!m.message || /^[\s.…]*$/.test(m.message)) return; // silencios ("...") no se pintan
          const deV = (m.role ?? m.source) === "agent" || m.source === "ai";
          deV ? setSuyo(m.message) : setTuyo(m.message);
        },
        onAgentToolRequest: (p: { tool_name?: string }) => setAviso(HERRAMIENTA[p?.tool_name ?? ""] || "Trabajando…"),
        onAgentToolResponse: () => setAviso(""),
      } as never)) as unknown as Sesion;
    } catch (e) {
      setEstado("error");
      setAviso(e instanceof Error && e.name === "NotAllowedError" ? "Necesito permiso del micrófono" : "No pude conectar con V. Intenta otra vez.");
    }
  }, []);

  const conectado = estado === "escuchando" || estado === "hablando";
  const linea = { apagado: "Toca para hablar con V", conectando: "Conectando…", escuchando: "Te escucho", hablando: "V está hablando — interrúmpela cuando quieras", error: "" }[estado];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white md:flex-row">
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <p className="font-display text-[96px] font-semibold leading-none tracking-tight text-black">V</p>
        <canvas ref={lienzo} width={520} height={90} className="h-[90px] w-full max-w-[520px]" aria-hidden />
        <div className="min-h-[24px] text-sm font-medium text-black">
          {aviso || linea}
          {conectado && estado === "escuchando" && !aviso && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#7c3aed] align-middle" />}
        </div>
        <div className="w-full max-w-[620px] space-y-3">
          {tuyo && <p className="text-[15px] leading-6 text-neutral-500">{tuyo}</p>}
          {suyo && <p className="text-[19px] leading-7 text-black">{suyo}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!conectado ? (
            <button type="button" onClick={hablar} disabled={estado === "conectando"}
              className="rounded-full bg-black px-8 py-3.5 text-[15px] font-semibold text-white disabled:opacity-50">
              {estado === "conectando" ? "Conectando…" : "Hablar con V"}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => { const m = !mudo; sesion.current?.setMicMuted(m); setMudo(m); }}
                className="rounded-full border border-black px-6 py-3 text-sm font-semibold text-black">
                {mudo ? "Activar micrófono" : "Silenciar micrófono"}
              </button>
              <button type="button" onClick={colgar} className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Colgar</button>
            </>
          )}
        </div>
        {conectado && (
          <form className="flex w-full max-w-[620px] gap-2" onSubmit={(e) => { e.preventDefault(); if (escrito.trim()) { sesion.current?.sendUserMessage(escrito.trim()); setTuyo(escrito.trim()); setEscrito(""); } }}>
            <input value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder="O escríbele aquí…"
              className="min-w-0 flex-1 rounded-xl border border-neutral-400 px-4 py-2.5 text-sm text-black placeholder:text-neutral-500 focus:border-black focus:outline-none" />
            <button type="submit" className="rounded-xl bg-black px-4 text-sm font-semibold text-white">Enviar</button>
          </form>
        )}
      </section>

      <aside className="min-h-0 border-t border-neutral-200 px-5 py-6 md:w-[360px] md:overflow-y-auto md:border-l md:border-t-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black">Encargos</p>
        <p className="mt-1 text-xs text-neutral-500">Lo que V mandó a trabajar al colectivo. Se actualiza solo.</p>
        <ul className="mt-4 space-y-3">
          {encargos.length === 0 && <li className="text-sm text-neutral-500">Nada en marcha. Pídele algo a V y aparece aquí.</li>}
          {encargos.map((e, i) => (
            <li key={i} className="rounded-xl border border-neutral-300 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-black">
                <span className={`h-2 w-2 rounded-full ${e.estado === "trabajando" ? "bg-[#7c3aed]" : "bg-black"}`} />
                {e.estado === "trabajando" ? "Trabajando" : "Terminado"} · {e.quien ?? "Trío"}{typeof e.hace_min === "number" ? ` · hace ${e.hace_min} min` : ""}
              </div>
              <p className="mt-1.5 text-sm font-medium leading-5 text-black">{e.tarea}</p>
              {e.ultimo && <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-neutral-600">{e.ultimo}</p>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
