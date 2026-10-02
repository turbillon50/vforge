"use client";

/**
 * V — una sola pantalla para todo: platicas con ella (voz en tiempo real o escrito), y lo que hace aparece en el LIENZO:
 * búsquedas en internet con fuentes, correos, proyectos y páginas abiertas, el chat del colectivo, y los encargos
 * que manda a trabajar (Trío, V con GLM, Fábrica) con su avance. Lo que platican queda en la memoria de la casa.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Estado = "apagado" | "conectando" | "escuchando" | "hablando";
type Turno = { quien: "tu" | "v"; texto: string };
type Encargo = { tarea: string; quien?: string; estado: string; hace_min?: number; ultimo?: string };
type Item = {
  id: string; tipo: "busqueda" | "correos" | "borrador" | "sitio" | "colectivo"; titulo: string;
  texto?: string; fuentes?: { titulo: string; url: string }[]; correos?: { de: string; asunto: string; fecha: string; resumen: string }[];
  url?: string; para?: string; ok?: boolean;
};
type Sesion = { endSession: () => Promise<void>; setMicMuted: (m: boolean) => void; getInputVolume: () => number; getOutputVolume: () => number; sendUserMessage: (t: string) => void };

const HERRAMIENTA: Record<string, string> = {
  recordar: "Buscando en la memoria…", anotar: "Anotando…", encargar: "Encargándolo al colectivo…", encargos: "Revisando los encargos…",
  casa: "Revisando la casa…", buscar_web: "Buscando en internet…", correo: "Revisando tu correo…", borrador_correo: "Escribiendo el borrador…",
  mostrar: "Poniéndolo en el lienzo…", proyecto: "Revisando el proyecto…",
};

function Lienzo({ item, encargos }: { item: Item | null; encargos: Encargo[] }) {
  const [colectivo, setColectivo] = useState<string | null>(null);
  useEffect(() => {
    if (item?.tipo !== "colectivo" || colectivo) return;
    fetch("/api/colectivo/pase", { cache: "no-store" }).then((r) => r.json()).then((d) => d.ok && setColectivo(d.url)).catch(() => {});
  }, [item, colectivo]);

  if (!item) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
        <div>
          <p className="text-sm font-semibold text-black">Lienzo</p>
          <p className="mt-1 text-sm text-neutral-600">Aquí aparece lo que V hace: búsquedas, correos, proyectos y páginas que le pidas ver, y el chat del colectivo.</p>
        </div>
        <Encargos encargos={encargos} />
      </div>
    );
  }
  if (item.tipo === "sitio" && item.url) return <iframe key={item.id} title={item.titulo} src={item.url} className="h-full w-full border-0 bg-white" />;
  if (item.tipo === "colectivo") return colectivo ? <iframe title="Colectivo" src={colectivo} className="h-full w-full border-0" allow="clipboard-read; clipboard-write" /> : <p className="p-6 text-sm text-neutral-600">Abriendo el colectivo…</p>;
  return (
    <div className="h-full overflow-y-auto p-6">
      <p className="text-lg font-semibold leading-6 text-black">{item.titulo}</p>
      {item.tipo === "busqueda" && (
        <>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-black">{(item.texto || "").replace(/\*+/g, "")}</p>
          {!!item.fuentes?.length && (
            <ul className="mt-4 space-y-1.5">
              {item.fuentes.map((f, i) => (
                <li key={i}><a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-[#7c3aed] underline underline-offset-2">{f.titulo || f.url}</a></li>
              ))}
            </ul>
          )}
        </>
      )}
      {item.tipo === "correos" && (
        <ul className="mt-4 space-y-2.5">
          {(item.correos || []).map((c, i) => (
            <li key={i} className="rounded-xl border border-neutral-300 p-3">
              <p className="text-xs text-neutral-600">{c.de} · {c.fecha ? new Date(c.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : ""}</p>
              <p className="mt-1 text-sm font-semibold text-black">{c.asunto}</p>
              {c.resumen && <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-700">{c.resumen}</p>}
            </li>
          ))}
          {!item.correos?.length && <li className="text-sm text-neutral-600">No encontré correos con esa búsqueda.</li>}
        </ul>
      )}
      {item.tipo === "borrador" && (
        <div className="mt-4 rounded-xl border border-neutral-300 p-4">
          <p className="text-xs text-neutral-600">Para: {item.para} · {item.ok ? "Guardado en Borradores de Gmail" : "No se pudo guardar"}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-black">{item.texto}</p>
        </div>
      )}
    </div>
  );
}

function Encargos({ encargos }: { encargos: Encargo[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black">Encargos</p>
      <ul className="mt-3 space-y-2.5">
        {encargos.length === 0 && <li className="text-sm text-neutral-600">Nada en marcha.</li>}
        {encargos.map((e, i) => (
          <li key={i} className="rounded-xl border border-neutral-300 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-black">
              <span className={`h-2 w-2 rounded-full ${e.estado === "trabajando" ? "bg-[#7c3aed]" : "bg-black"}`} />
              {e.estado === "trabajando" ? "Trabajando" : "Terminado"} · {e.quien ?? "Trío"}{typeof e.hace_min === "number" ? ` · hace ${e.hace_min} min` : ""}
            </div>
            <p className="mt-1.5 text-sm font-medium leading-5 text-black">{e.tarea}</p>
            {e.ultimo && <p className="mt-1.5 line-clamp-4 text-xs leading-5 text-neutral-700">{e.ultimo}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Jarvis() {
  const [estado, setEstado] = useState<Estado>("apagado");
  const [aviso, setAviso] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mudo, setMudo] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [verId, setVerId] = useState<string | null>(null);
  const [vistaMovil, setVistaMovil] = useState<"platica" | "lienzo">("platica");
  const sesion = useRef<Sesion | null>(null);
  const lienzoVisto = useRef<string | null>(null); // null = todavía no se lee el lienzo por primera vez
  const lista = useRef<HTMLDivElement | null>(null);
  const linea = useRef<HTMLCanvasElement | null>(null);
  const conectado = estado === "escuchando" || estado === "hablando";

  // Lienzo y encargos: rápido mientras platican, lento si no
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      try {
        const d = await (await fetch("/api/jarvis/panel", { cache: "no-store" })).json();
        if (!vivo) return;
        setEncargos(Array.isArray(d.encargos) ? d.encargos : []);
        const L: Item[] = Array.isArray(d.lienzo) ? d.lienzo : [];
        setItems(L);
        const ultimo = L[L.length - 1]?.id;
        if (lienzoVisto.current === null) lienzoVisto.current = ultimo ?? "";
        else if (ultimo && ultimo !== lienzoVisto.current) { lienzoVisto.current = ultimo; setVerId(ultimo); setVistaMovil("lienzo"); }
      } catch {}
    };
    void leer();
    const t = setInterval(leer, conectado ? 2500 : 10000);
    return () => { vivo = false; clearInterval(t); };
  }, [conectado]);

  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" }); }, [turnos]);

  // Línea que respira con la voz
  useEffect(() => {
    let raf = 0;
    const pintar = () => {
      const c = linea.current, s = sesion.current;
      if (c) {
        const g = c.getContext("2d")!, w = c.width, h = c.height;
        g.clearRect(0, 0, w, h);
        const v = s ? Math.min(1, (estado === "hablando" ? s.getOutputVolume() : s.getInputVolume()) * 2.2) : 0;
        const t = performance.now() / 260;
        g.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const k = Math.sin((x / w) * Math.PI);
          const y = h / 2 + Math.sin(x / 18 + t) * k * (1.5 + v * h * 0.4);
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = conectado ? "#000" : "#bdbdbd"; g.lineWidth = 2; g.stroke();
      }
      raf = requestAnimationFrame(pintar);
    };
    raf = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(raf);
  }, [estado, conectado]);

  const colgar = useCallback(async () => {
    try { await sesion.current?.endSession(); } catch {}
    sesion.current = null; setEstado("apagado"); setAviso(""); setMudo(false);
  }, []);
  useEffect(() => () => { void colgar(); }, [colgar]);

  const hablar = useCallback(async (primerTexto?: string) => {
    setEstado("conectando"); setAviso("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const d = await (await fetch("/api/jarvis/sesion", { cache: "no-store" })).json();
      if (!d.ok) throw new Error(d.error || "sin_sesion");
      const { Conversation } = await import("@elevenlabs/client");
      sesion.current = (await Conversation.startSession({
        signedUrl: d.signedUrl,
        dynamicVariables: { contexto: d.contexto || "" },
        onConnect: () => { setEstado("escuchando"); if (primerTexto) setTimeout(() => sesion.current?.sendUserMessage(primerTexto), 600); },
        onDisconnect: () => { sesion.current = null; setEstado("apagado"); setAviso(""); },
        onError: (m: string) => setAviso(String(m || "Se cortó la conexión")),
        onModeChange: ({ mode }: { mode: string }) => { setEstado(mode === "speaking" ? "hablando" : "escuchando"); },
        onMessage: (m: { message: string; source?: string; role?: string }) => {
          if (!m.message || /^[\s.…]*$/.test(m.message)) return;
          const quien: Turno["quien"] = (m.role ?? m.source) === "agent" || m.source === "ai" ? "v" : "tu";
          setTurnos((t) => [...t, { quien, texto: m.message }].slice(-80));
        },
        onAgentToolRequest: (p: { tool_name?: string }) => setAviso(HERRAMIENTA[p?.tool_name ?? ""] || "Trabajando…"),
        onAgentToolResponse: () => setAviso(""),
      } as never)) as unknown as Sesion;
    } catch (e) {
      setEstado("apagado");
      setAviso(e instanceof Error && e.name === "NotAllowedError" ? "Necesito permiso del micrófono" : "No pude conectar con V. Intenta otra vez.");
    }
  }, []);

  const enviarTexto = (e: React.FormEvent) => {
    e.preventDefault();
    const t = escrito.trim(); if (!t) return;
    setEscrito("");
    if (sesion.current) { setTurnos((x) => [...x, { quien: "tu", texto: t }]); sesion.current.sendUserMessage(t); }
    else { setTurnos((x) => [...x, { quien: "tu", texto: t }]); void hablar(t); }
  };

  const item = useMemo(() => items.find((i) => i.id === verId) ?? null, [items, verId]);
  const estadoTexto = aviso || { apagado: "Toca el micrófono para hablar con V", conectando: "Conectando…", escuchando: "Te escucho", hablando: "V está hablando — interrúmpela cuando quieras" }[estado];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex border-b border-neutral-200 md:hidden">
        {(["platica", "lienzo"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setVistaMovil(v)}
            className={`flex-1 py-2.5 text-sm font-semibold ${vistaMovil === v ? "border-b-2 border-black text-black" : "text-neutral-500"}`}>
            {v === "platica" ? "Plática" : "Lienzo"}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        {/* Plática */}
        <section className={`${vistaMovil === "platica" ? "flex" : "hidden"} min-h-0 w-full flex-col md:flex md:w-[44%] md:max-w-[560px] md:border-r md:border-neutral-200`}>
          <div ref={lista} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {turnos.length === 0 && (
              <div className="pt-10 text-center">
                <p className="font-display text-[72px] font-semibold leading-none text-black">V</p>
                <p className="mx-auto mt-4 max-w-[340px] text-sm leading-6 text-neutral-600">
                  Háblale como a una persona. Busca en internet, revisa tu correo, te pone proyectos en el lienzo, recuerda lo que deciden y manda trabajo al colectivo.
                </p>
              </div>
            )}
            {turnos.map((t, i) => (
              <div key={i} className={t.quien === "tu" ? "flex justify-end" : "flex justify-start"}>
                <p className={t.quien === "tu"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5 text-[15px] leading-6 text-black"
                  : "max-w-[90%] text-[16px] leading-7 text-black"}>{t.texto}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-200 px-4 pb-4 pt-3">
            <div className="mb-2 flex items-center gap-3">
              <canvas ref={linea} width={300} height={28} className="h-7 w-[150px] shrink-0" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-black">{estadoTexto}</p>
            </div>
            <form onSubmit={enviarTexto} className="flex items-end gap-2">
              <button type="button" aria-label={conectado ? "Colgar" : "Hablar con V"} onClick={() => (conectado ? colgar() : hablar())} disabled={estado === "conectando"}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${conectado ? "bg-[#7c3aed] text-white" : "bg-black text-white"} disabled:opacity-50`}>
                {conectado ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                )}
              </button>
              <input value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder={conectado ? "O escríbele…" : "Escríbele o toca el micrófono…"}
                className="min-w-0 flex-1 rounded-2xl border border-neutral-400 px-4 py-3 text-[15px] text-black placeholder:text-neutral-500 focus:border-black focus:outline-none" />
              {conectado && (
                <button type="button" onClick={() => { const m = !mudo; sesion.current?.setMicMuted(m); setMudo(m); }}
                  className="h-12 shrink-0 rounded-2xl border border-black px-3 text-xs font-semibold text-black">{mudo ? "Abrir mic" : "Silenciar"}</button>
              )}
            </form>
          </div>
        </section>

        {/* Lienzo */}
        <section className={`${vistaMovil === "lienzo" ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex`}>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 px-3 py-2">
            <button type="button" onClick={() => setVerId(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!item ? "bg-black text-white" : "border border-neutral-300 text-black"}`}>
              Encargos{encargos.some((e) => e.estado === "trabajando") ? " ·" : ""}
            </button>
            {[...items].reverse().map((i) => (
              <button key={i.id} type="button" onClick={() => setVerId(i.id)}
                className={`max-w-[200px] shrink-0 truncate rounded-full px-3 py-1.5 text-xs font-semibold ${verId === i.id ? "bg-black text-white" : "border border-neutral-300 text-black"}`}>
                {i.titulo}
              </button>
            ))}
            {item?.tipo === "sitio" && item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-xs font-semibold text-black underline">Abrir aparte</a>
            )}
          </div>
          <div className="min-h-0 flex-1"><Lienzo item={item} encargos={encargos} /></div>
        </section>
      </div>
    </div>
  );
}
