"use client";

/**
 * Sala de agentes — Claude Code y Codex reales por proyecto, más la columna V.
 *
 * Claude/Codex streamean desde el motor vivo y pueden tocar el worktree dentro
 * de jaula. V conserva su motor conversacional actual. El historial vive por
 * proyecto y por agente en localStorage, incluyendo el id de sesión.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  Code2,
  FileText,
  GitBranch,
  Loader2,
  RotateCcw,
  Send,
  Square,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/workspace/chat/Markdown";
import { useMotorVivo } from "@/components/studio/vivo/useMotorVivo";
import {
  AGENTES,
  NOMBRE_AGENTE,
  type Agente,
  type IntercambioTrio,
  type RespuestaTrio,
} from "@/lib/trio/conversacion";

type EstadoItem = "trabajando" | "listo" | "error";

type EventoSala =
  | { id: string; tipo: "texto"; texto: string; fecha: number }
  | {
      id: string;
      tipo: "herramienta";
      fecha: number;
      herramienta?: string | null;
      accion?: string | null;
      archivo?: string | null;
      comando?: string | null;
      patron?: string | null;
    }
  | { id: string; tipo: "diff"; fecha: number; archivo?: string | null; contenido: string; cortado?: boolean | null }
  | {
      id: string;
      tipo: "fin";
      fecha: number;
      sesion?: string | null;
      commit?: string | null;
      sinCambios?: boolean | null;
      archivos?: string[];
    }
  | { id: string; tipo: "error"; fecha: number; mensaje: string };

type ItemAgente = {
  id: string;
  pregunta: string;
  creado: number;
  estado: EstadoItem;
  eventos: EventoSala[];
};

type HistorialAgente = {
  sesion: string | null;
  items: ItemAgente[];
};

type HistorialSala = Record<Agente, HistorialAgente>;
type Destinos = Record<Agente, boolean>;

const LLAVE_PROYECTO = "vforge.sala.proyecto";
const llaveHistorial = (proyecto: string) => `vforge.sala.${proyecto}`;
const AGENTES_REALES: Agente[] = ["claude", "codex"];
const TODOS_APAGADOS: Destinos = { claude: true, codex: true, v: false };

const ICONO_AGENTE: Record<Agente, LucideIcon> = {
  claude: Code2,
  codex: Terminal,
  v: Bot,
};

function nuevoId(prefijo = "ev"): string {
  try {
    return `${prefijo}-${crypto.randomUUID()}`;
  } catch {
    return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function baseHistorial(): HistorialSala {
  return {
    claude: { sesion: null, items: [] },
    codex: { sesion: null, items: [] },
    v: { sesion: null, items: [] },
  };
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function leerLocal(llave: string): string | null {
  try {
    return window.localStorage.getItem(llave);
  } catch {
    return null;
  }
}

function guardarLocal(llave: string, valor: string | null) {
  try {
    if (valor === null) window.localStorage.removeItem(llave);
    else window.localStorage.setItem(llave, valor);
  } catch {
    // Si el navegador bloquea storage, la sala sigue en memoria.
  }
}

function normalizarHistorial(valor: unknown): HistorialSala {
  const base = baseHistorial();
  if (!esObjeto(valor)) return base;
  for (const agente of AGENTES) {
    const bruto = valor[agente];
    if (!esObjeto(bruto)) continue;
    const sesion = typeof bruto.sesion === "string" && bruto.sesion.trim() ? bruto.sesion.trim() : null;
    const items = Array.isArray(bruto.items)
      ? bruto.items
          .filter((item): item is ItemAgente => esObjeto(item) && typeof item.id === "string" && typeof item.pregunta === "string")
          .slice(-60)
          .map((item) => ({
            id: item.id,
            pregunta: item.pregunta,
            creado: typeof item.creado === "number" ? item.creado : Date.now(),
            estado: item.estado === "trabajando" ? "error" : item.estado === "error" ? "error" : "listo",
            eventos: Array.isArray(item.eventos) ? (item.eventos as EventoSala[]).slice(-120) : [],
          }))
      : [];
    base[agente] = { sesion, items };
  }
  return base;
}

function parseSse(bloque: string): Record<string, unknown> | null {
  const data = bloque
    .split("\n")
    .filter((linea) => linea.startsWith("data:"))
    .map((linea) => linea.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    const valor: unknown = JSON.parse(data);
    return esObjeto(valor) ? valor : null;
  } catch {
    return null;
  }
}

function textoItem(item: ItemAgente | undefined): string {
  if (!item) return "";
  return item.eventos
    .filter((ev): ev is Extract<EventoSala, { tipo: "texto" }> => ev.tipo === "texto")
    .map((ev) => ev.texto)
    .join("")
    .trim();
}

function estadoAgente(historial: HistorialAgente): "espera" | "trabajando" | "listo" | "error" {
  const ultimo = historial.items[historial.items.length - 1];
  if (!ultimo) return "espera";
  if (ultimo.estado === "trabajando") return "trabajando";
  if (ultimo.estado === "error") return "error";
  return "listo";
}

function etiquetaHerramienta(ev: Extract<EventoSala, { tipo: "herramienta" }>): string {
  if (ev.comando) return `${ev.accion || "corrió"} ${ev.comando}`;
  if (ev.archivo) return `${ev.accion || "tocó"} ${ev.archivo}`;
  if (ev.patron) return `${ev.accion || "buscó"} ${ev.patron}`;
  return `${ev.accion || "usó"} ${ev.herramienta || "herramienta"}`;
}

function intercambiosParaV(historiales: HistorialSala, actual?: { id: string; pregunta: string; creado: number }): IntercambioTrio[] {
  const porId = new Map<string, IntercambioTrio & { creado: number }>();
  for (const agente of AGENTES) {
    for (const item of historiales[agente].items) {
      const existente =
        porId.get(item.id) ??
        ({
          id: item.id,
          pregunta: item.pregunta,
          respuestas: {},
          replicas: null,
          creado: item.creado,
        } satisfies IntercambioTrio & { creado: number });
      existente.pregunta = existente.pregunta || item.pregunta;
      existente.creado = Math.min(existente.creado, item.creado);
      const texto = textoItem(item);
      if (texto) existente.respuestas[agente] = { texto } satisfies RespuestaTrio;
      porId.set(item.id, existente);
    }
  }
  if (actual && !porId.has(actual.id)) {
    porId.set(actual.id, { id: actual.id, pregunta: actual.pregunta, respuestas: {}, replicas: null, creado: actual.creado });
  }
  return [...porId.values()]
    .sort((a, b) => a.creado - b.creado)
    .slice(-12)
    .map(({ creado: _creado, ...intercambio }) => intercambio);
}

function PuntoEstado({ estado }: { estado: ReturnType<typeof estadoAgente> }) {
  return (
    <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
      {estado === "trabajando" ? <span className="absolute inset-0 animate-ping rounded-full bg-black opacity-30" /> : null}
      <span
        className={cn(
          "relative inline-block h-2 w-2 rounded-full",
          estado === "espera" && "bg-[var(--fg-subtle)]",
          estado === "trabajando" && "bg-black",
          estado === "listo" && "bg-[var(--fg-secondary)]",
          estado === "error" && "bg-[var(--fg-tertiary)]",
        )}
      />
    </span>
  );
}

function EventoVista({ evento }: { evento: EventoSala }) {
  if (evento.tipo === "texto") {
    return (
      <div className="text-[13px] leading-5 text-[var(--fg-primary)]">
        <Markdown text={evento.texto} streaming />
      </div>
    );
  }
  if (evento.tipo === "herramienta") {
    return (
      <div className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <Wrench size={14} className="mt-0.5 shrink-0 text-[var(--fg-tertiary)]" />
          <p className="min-w-0 break-words font-mono text-[11px] leading-5 text-[var(--fg-secondary)]">
            {etiquetaHerramienta(evento)}
          </p>
        </div>
      </div>
    );
  }
  if (evento.tipo === "diff") {
    return (
      <details className="rounded-lg border border-[var(--border-1)] bg-white">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 font-mono text-[11px] text-[var(--fg-secondary)]">
          <GitBranch size={14} className="shrink-0" />
          <span className="truncate">{evento.archivo || "diff"}</span>
          {evento.cortado ? <span className="ml-auto shrink-0 text-[var(--fg-muted)]">cortado</span> : null}
        </summary>
        <pre className="max-h-[320px] overflow-auto border-t border-[var(--border-1)] bg-[var(--surface-1)] p-3 text-[11px] leading-5 text-[var(--fg-primary)]">
          {evento.contenido || "Sin diff disponible."}
        </pre>
      </details>
    );
  }
  if (evento.tipo === "error") {
    return (
      <div role="alert" className="rounded-lg border border-[var(--border-2)] bg-[var(--surface-1)] px-3 py-2.5">
        <p className="break-words text-[13px] leading-5 text-[var(--fg-primary)]">{evento.mensaje}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--fg-secondary)]">
        <Check size={14} />
        <span>{evento.sinCambios ? "Terminó sin cambios" : "Terminó"}</span>
        {evento.commit ? <span className="font-mono text-[var(--fg-muted)]">{evento.commit}</span> : null}
        {evento.sesion ? <span className="ml-auto font-mono text-[var(--fg-muted)]">sesión {evento.sesion.slice(0, 8)}</span> : null}
      </div>
    </div>
  );
}

function ColumnaAgente({
  agente,
  historial,
  estado,
  modelo,
  oculta,
  idPanel,
  idPestana,
}: {
  agente: Agente;
  historial: HistorialAgente;
  estado: ReturnType<typeof estadoAgente>;
  modelo?: string | null;
  oculta: boolean;
  idPanel: string;
  idPestana: string;
}) {
  const Icono = ICONO_AGENTE[agente];
  const vistaRef = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);
  const ultimoItem = historial.items[historial.items.length - 1];
  const huella = `${historial.items.length}:${ultimoItem?.eventos.length ?? 0}:${ultimoItem?.estado ?? ""}`;

  useEffect(() => {
    const vista = vistaRef.current;
    if (vista && pegadoAbajo.current) vista.scrollTop = vista.scrollHeight;
  }, [huella, oculta]);

  return (
    <section
      id={idPanel}
      role="tabpanel"
      aria-labelledby={idPestana}
      aria-busy={estado === "trabajando"}
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border-1)] bg-white",
        oculta ? "hidden xl:flex" : "flex",
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-1)] px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]">
          <Icono size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-medium leading-5 text-black">{NOMBRE_AGENTE[agente]}</h2>
          <p className="truncate font-mono text-[11px] text-[var(--fg-muted)]">
            {modelo || (historial.sesion ? `sesión ${historial.sesion.slice(0, 8)}` : agente === "v" ? "motor V" : "sin sesión")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-1)] px-2 py-1 text-[12px] text-[var(--fg-secondary)]">
          <PuntoEstado estado={estado} />
          {estado === "trabajando" ? "Trabajando" : estado === "listo" ? "Listo" : estado === "error" ? "Error" : "Espera"}
        </span>
      </header>

      <div
        ref={vistaRef}
        onScroll={(e) => {
          const vista = e.currentTarget;
          pegadoAbajo.current = vista.scrollHeight - vista.scrollTop - vista.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {historial.items.length === 0 ? (
          <div className="grid h-full min-h-[180px] place-items-center text-center">
            <div>
              <Icono size={22} className="mx-auto text-[var(--fg-muted)]" />
              <p className="mt-3 text-[13px] text-[var(--fg-muted)]">Sin historial todavía.</p>
            </div>
          </div>
        ) : (
          <ol className="space-y-5">
            {historial.items.map((item) => (
              <li key={item.id} className="space-y-3 border-b border-[var(--border-1)] pb-5 last:border-b-0 last:pb-0">
                <div className="rounded-lg bg-[var(--surface-1)] px-3 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">Luis</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-black">{item.pregunta}</p>
                </div>
                {item.eventos.length ? (
                  <div className="space-y-3">
                    {item.eventos.map((evento) => (
                      <EventoVista key={evento.id} evento={evento} />
                    ))}
                  </div>
                ) : item.estado === "trabajando" ? (
                  <div className="space-y-2" aria-hidden>
                    <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-2.5 w-8/12 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-2.5 w-10/12 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export function TrioStudio() {
  const vivo = useMotorVivo();
  const [proyecto, setProyecto] = useState("");
  const [historiales, setHistoriales] = useState<HistorialSala>(() => baseHistorial());
  const [destinos, setDestinos] = useState<Destinos>(TODOS_APAGADOS);
  const [borrador, setBorrador] = useState("");
  const [pestana, setPestana] = useState<Agente>("claude");
  const [enviando, setEnviando] = useState(false);
  const [claveCargada, setClaveCargada] = useState<string | null>(null);
  const [modeloV, setModeloV] = useState<string | null>(null);
  const controladores = useRef<AbortController[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const base = useId();
  const idSelect = `${base}-proyecto`;
  const idTexto = `${base}-texto`;

  const proyectos = vivo.motor?.proyectos ?? [];

  useEffect(() => {
    if (!vivo.motor || proyecto) return;
    let recordado = "";
    try {
      const params = new URLSearchParams(window.location.search);
      recordado = params.get("project") ?? params.get("vivo") ?? leerLocal(LLAVE_PROYECTO) ?? "";
    } catch {
      recordado = "";
    }
    const elegido = recordado && proyectos.includes(recordado) ? recordado : proyectos[0] ?? "";
    if (elegido) setProyecto(elegido);
  }, [vivo.motor, proyecto, proyectos]);

  useEffect(() => {
    if (!proyecto) {
      setHistoriales(baseHistorial());
      setClaveCargada(null);
      return;
    }
    const llave = llaveHistorial(proyecto);
    const crudo = leerLocal(llave);
    try {
      setHistoriales(crudo ? normalizarHistorial(JSON.parse(crudo)) : baseHistorial());
    } catch {
      setHistoriales(baseHistorial());
    }
    setClaveCargada(llave);
    guardarLocal(LLAVE_PROYECTO, proyecto);
    setModeloV(null);
  }, [proyecto]);

  useEffect(() => {
    if (!proyecto || claveCargada !== llaveHistorial(proyecto)) return;
    guardarLocal(claveCargada, JSON.stringify(historiales));
  }, [historiales, proyecto, claveCargada]);

  useEffect(() => () => controladores.current.forEach((control) => control.abort()), []);

  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  }, [borrador]);

  const anexarEvento = useCallback((agente: Agente, itemId: string, evento: Omit<EventoSala, "id" | "fecha">) => {
    setHistoriales((actual) => {
      const copia = { ...actual, [agente]: { ...actual[agente], items: [...actual[agente].items] } };
      const idx = copia[agente].items.findIndex((item) => item.id === itemId);
      if (idx < 0) return actual;
      const item = { ...copia[agente].items[idx], eventos: [...copia[agente].items[idx].eventos] };
      const nuevo = { ...evento, id: nuevoId("ev"), fecha: Date.now() } as EventoSala;
      const ultimo = item.eventos[item.eventos.length - 1];
      if (nuevo.tipo === "texto" && ultimo?.tipo === "texto") {
        item.eventos[item.eventos.length - 1] = { ...ultimo, texto: ultimo.texto + nuevo.texto };
      } else {
        item.eventos.push(nuevo);
      }
      if (nuevo.tipo === "error") item.estado = "error";
      if (nuevo.tipo === "fin") {
        item.estado = item.estado === "error" ? "error" : "listo";
        if (nuevo.sesion) copia[agente].sesion = nuevo.sesion;
      }
      copia[agente].items[idx] = item;
      return copia;
    });
  }, []);

  const marcarCierre = useCallback((agente: Agente, itemId: string, estado: EstadoItem) => {
    setHistoriales((actual) => {
      const copia = { ...actual, [agente]: { ...actual[agente], items: [...actual[agente].items] } };
      const idx = copia[agente].items.findIndex((item) => item.id === itemId);
      if (idx < 0) return actual;
      const previo = copia[agente].items[idx];
      copia[agente].items[idx] = { ...previo, estado: estado === "listo" && previo.estado === "error" ? "error" : estado };
      return copia;
    });
  }, []);

  const correrAgenteReal = useCallback(
    async (agente: "claude" | "codex", itemId: string, pregunta: string, sesion: string | null) => {
      const control = new AbortController();
      controladores.current.push(control);
      try {
        const respuesta = await fetch("/api/vivo/agente", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ proyecto, agente, mensaje: pregunta, sesion }),
          signal: control.signal,
        });
        if (!respuesta.ok || !respuesta.body) {
          const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
          throw new Error(datos?.error ?? `HTTP ${respuesta.status}`);
        }
        const lector = respuesta.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await lector.read();
          buffer += decoder.decode(value, { stream: !done });
          const bloques = buffer.split("\n\n");
          buffer = bloques.pop() ?? "";
          for (const bloque of bloques) {
            const ev = parseSse(bloque);
            if (!ev) continue;
            if (ev.tipo === "texto") anexarEvento(agente, itemId, { tipo: "texto", texto: String(ev.texto ?? "") });
            else if (ev.tipo === "herramienta") {
              anexarEvento(agente, itemId, {
                tipo: "herramienta",
                herramienta: typeof ev.herramienta === "string" ? ev.herramienta : null,
                accion: typeof ev.accion === "string" ? ev.accion : null,
                archivo: typeof ev.archivo === "string" ? ev.archivo : null,
                comando: typeof ev.comando === "string" ? ev.comando : null,
                patron: typeof ev.patron === "string" ? ev.patron : null,
              });
            } else if (ev.tipo === "diff") {
              anexarEvento(agente, itemId, {
                tipo: "diff",
                archivo: typeof ev.archivo === "string" ? ev.archivo : null,
                contenido: String(ev.contenido ?? ""),
                cortado: Boolean(ev.cortado),
              });
            } else if (ev.tipo === "error") {
              anexarEvento(agente, itemId, { tipo: "error", mensaje: String(ev.mensaje ?? "El agente falló.") });
            } else if (ev.tipo === "fin") {
              anexarEvento(agente, itemId, {
                tipo: "fin",
                sesion: typeof ev.sesion === "string" ? ev.sesion : null,
                commit: typeof ev.commit === "string" ? ev.commit : null,
                sinCambios: Boolean(ev.sinCambios),
                archivos: Array.isArray(ev.archivos) ? ev.archivos.map(String) : [],
              });
            }
          }
          if (done) break;
        }
        const resto = parseSse(buffer);
        if (resto?.tipo === "fin") {
          anexarEvento(agente, itemId, {
            tipo: "fin",
            sesion: typeof resto.sesion === "string" ? resto.sesion : null,
            commit: typeof resto.commit === "string" ? resto.commit : null,
            sinCambios: Boolean(resto.sinCambios),
            archivos: Array.isArray(resto.archivos) ? resto.archivos.map(String) : [],
          });
        }
      } catch (error) {
        anexarEvento(agente, itemId, {
          tipo: "error",
          mensaje: control.signal.aborted ? "Detenido." : error instanceof Error ? error.message : "No se pudo contactar al agente.",
        });
      } finally {
        controladores.current = controladores.current.filter((c) => c !== control);
        marcarCierre(agente, itemId, "listo");
      }
    },
    [anexarEvento, marcarCierre, proyecto],
  );

  const correrV = useCallback(
    async (itemId: string, pregunta: string, historiaBase: HistorialSala) => {
      const control = new AbortController();
      controladores.current.push(control);
      try {
        const intercambios = intercambiosParaV(historiaBase, { id: itemId, pregunta, creado: Date.now() });
        const respuesta = await fetch("/api/forge/trio", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ agente: "v", modo: "responder", projectId: proyecto || null, intercambios }),
          signal: control.signal,
        });
        if (!respuesta.ok || !respuesta.body) {
          const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
          throw new Error(datos?.error ?? `HTTP ${respuesta.status}`);
        }
        const lector = respuesta.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await lector.read();
          buffer += decoder.decode(value, { stream: !done });
          const bloques = buffer.split("\n\n");
          buffer = bloques.pop() ?? "";
          for (const bloque of bloques) {
            const ev = parseSse(bloque);
            if (!ev) continue;
            if (ev.type === "meta" && typeof ev.model === "string") setModeloV(ev.model);
            if (ev.type === "text" && typeof ev.value === "string") anexarEvento("v", itemId, { tipo: "texto", texto: ev.value });
            if (ev.type === "error") anexarEvento("v", itemId, { tipo: "error", mensaje: String(ev.message ?? "V no respondió.") });
            if (ev.type === "done") anexarEvento("v", itemId, { tipo: "fin", sesion: null, commit: null, sinCambios: true, archivos: [] });
          }
          if (done) break;
        }
      } catch (error) {
        anexarEvento("v", itemId, {
          tipo: "error",
          mensaje: control.signal.aborted ? "Detenido." : error instanceof Error ? error.message : "V no respondió.",
        });
      } finally {
        controladores.current = controladores.current.filter((c) => c !== control);
        marcarCierre("v", itemId, "listo");
      }
    },
    [anexarEvento, marcarCierre, proyecto],
  );

  function elegirProyecto(valor: string) {
    if (enviando) return;
    setProyecto(valor);
  }

  function alternarDestino(agente: Agente) {
    if (enviando) return;
    setDestinos((actual) => {
      const siguiente = { ...actual, [agente]: !actual[agente] };
      if (!AGENTES.some((a) => siguiente[a])) return actual;
      return siguiente;
    });
  }

  async function enviar() {
    const pregunta = borrador.trim();
    const elegidos = AGENTES.filter((agente) => destinos[agente]);
    if (!pregunta || !proyecto || !elegidos.length || enviando) return;
    const itemId = nuevoId("turno");
    const creado = Date.now();
    const item: ItemAgente = { id: itemId, pregunta, creado, estado: "trabajando", eventos: [] };
    const historiaBase: HistorialSala = {
      ...historiales,
      claude: { ...historiales.claude, items: destinos.claude ? [...historiales.claude.items, item] : historiales.claude.items },
      codex: { ...historiales.codex, items: destinos.codex ? [...historiales.codex.items, item] : historiales.codex.items },
      v: { ...historiales.v, items: destinos.v ? [...historiales.v.items, item] : historiales.v.items },
    };
    setHistoriales(historiaBase);
    setBorrador("");
    setEnviando(true);
    try {
      const trabajos: Promise<unknown>[] = [];
      if (destinos.claude) trabajos.push(correrAgenteReal("claude", itemId, pregunta, historiales.claude.sesion));
      if (destinos.codex) trabajos.push(correrAgenteReal("codex", itemId, pregunta, historiales.codex.sesion));
      if (destinos.v) trabajos.push(correrV(itemId, pregunta, historiaBase));
      await Promise.allSettled(trabajos);
    } finally {
      setEnviando(false);
      textareaRef.current?.focus();
      void vivo.refrescarEstado();
    }
  }

  function detener() {
    controladores.current.forEach((control) => control.abort());
  }

  function nuevaSala() {
    if (enviando || !proyecto) return;
    const vacia = baseHistorial();
    setHistoriales(vacia);
    guardarLocal(llaveHistorial(proyecto), null);
    textareaRef.current?.focus();
  }

  const estados = useMemo(
    () => Object.fromEntries(AGENTES.map((agente) => [agente, estadoAgente(historiales[agente])])) as Record<Agente, ReturnType<typeof estadoAgente>>,
    [historiales],
  );
  const puedeEnviar = !!borrador.trim() && !!proyecto && AGENTES.some((agente) => destinos[agente]) && !enviando;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-[var(--color-background)]">
      <div className="shrink-0 border-b border-[var(--border-1)] bg-white px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-full lg:basis-[260px]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-[17px] font-semibold leading-6 text-black">Sala de agentes</h1>
                <p className="truncate text-[12px] text-[var(--fg-muted)]">Claude Code · Codex · V</p>
              </div>
              <label htmlFor={idSelect} className="sr-only">
                Proyecto vivo
              </label>
              <select
                id={idSelect}
                value={proyecto}
                onChange={(e) => elegirProyecto(e.target.value)}
                disabled={enviando || vivo.disponible === false || !proyectos.length}
                className="ml-auto h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-2)] bg-white px-3 text-[14px] text-black outline-none transition focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-60 sm:max-w-[340px]"
              >
                <option value="">{vivo.disponible === false ? "Motor no disponible" : proyectos.length ? "Elige proyecto" : "Sin proyectos vivos"}</option>
                {proyectos.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            {vivo.error ? <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{vivo.error}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {AGENTES.map((agente) => {
              const activo = destinos[agente];
              const Icono = ICONO_AGENTE[agente];
              return (
                <button
                  key={agente}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => alternarDestino(agente)}
                  disabled={enviando}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px] transition disabled:opacity-50",
                    activo ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black hover:border-black",
                  )}
                >
                  <Icono size={14} />
                  {NOMBRE_AGENTE[agente]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={nuevaSala}
            disabled={enviando || !proyecto || !AGENTES.some((agente) => historiales[agente].items.length)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border-1)] bg-white px-3 text-[13px] text-black transition hover:border-black disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Nueva sala
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Agentes" className="grid shrink-0 grid-cols-3 gap-1.5 px-4 pt-3 md:px-6 xl:hidden">
        {AGENTES.map((agente) => {
          const activa = pestana === agente;
          return (
            <button
              key={agente}
              id={`${base}-tab-${agente}`}
              type="button"
              role="tab"
              aria-selected={activa}
              aria-controls={`${base}-panel-${agente}`}
              onClick={() => setPestana(agente)}
              className={cn(
                "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-[13px] font-medium transition",
                activa ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black hover:border-black",
              )}
            >
              <span className="truncate">{NOMBRE_AGENTE[agente]}</span>
              <PuntoEstado estado={estados[agente]} />
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 md:px-6 xl:grid-cols-3 xl:gap-4 xl:py-4">
        {AGENTES.map((agente) => (
          <ColumnaAgente
            key={agente}
            agente={agente}
            historial={historiales[agente]}
            estado={estados[agente]}
            modelo={agente === "v" ? modeloV : null}
            oculta={pestana !== agente}
            idPanel={`${base}-panel-${agente}`}
            idPestana={`${base}-tab-${agente}`}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="shrink-0 border-t border-[var(--border-1)] bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-6"
      >
        <label htmlFor={idTexto} className="sr-only">
          Mensaje para la sala
        </label>
        <div className="flex items-end gap-2.5">
          <textarea
            id={idTexto}
            ref={textareaRef}
            rows={1}
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void enviar();
              }
            }}
            placeholder={proyecto ? "Mensaje para los agentes seleccionados" : "Elige un proyecto vivo"}
            disabled={!proyecto || enviando}
            className="min-h-[44px] min-w-0 flex-1 resize-none rounded-lg border border-[var(--border-2)] bg-[var(--color-background)] px-3.5 py-[11px] text-[14px] leading-5 text-black transition placeholder:text-[var(--fg-muted)] focus:border-black focus:bg-white focus:outline-none disabled:opacity-60"
          />
          {enviando ? (
            <button
              type="button"
              onClick={detener}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-black px-4 text-[14px] font-medium text-white transition active:scale-[0.98]"
            >
              <Square size={14} /> <span className="hidden sm:inline">Detener</span>
              <span className="sr-only sm:hidden">Detener</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!puedeEnviar}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[14px] font-medium text-white transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {vivo.disponible === null ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span className="hidden sm:inline">Enviar</span>
              <span className="sr-only sm:hidden">Enviar</span>
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)]">
          <FileText size={13} />
          <span>{AGENTES_REALES.filter((agente) => destinos[agente]).map((agente) => NOMBRE_AGENTE[agente]).join(" + ") || "sin agentes reales"}</span>
          {destinos.v ? <span>+ V</span> : null}
          {vivo.motor ? <span className="ml-auto font-mono">{proyectos.length} proyectos registrados</span> : null}
        </div>
      </form>
    </div>
  );
}
