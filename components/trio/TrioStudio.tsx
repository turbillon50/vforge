"use client";

/**
 * Trío — Luis escribe UNA vez y su mensaje llega en paralelo a Claude, ChatGPT
 * y V. Cada respuesta llega en streaming a su columna (en celular, pestañas).
 * Cada agente lee lo que dijeron los otros dos; con "que se respondan entre
 * ellos" hay además una ronda corta de réplica.
 *
 * La conversación vive en el cliente (estado + localStorage de este navegador,
 * por proyecto). No hay tabla de chats multi-agente en el servidor todavía.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/workspace/chat/Markdown";
import { IconPlus, IconSend, IconStop } from "@/components/brand/VFIcons";
import {
  AGENTES,
  NOMBRE_AGENTE,
  type Agente,
  type IntercambioTrio,
  type ModoTrio,
  type RespuestaTrio,
} from "@/lib/trio/conversacion";

type Respuesta = RespuestaTrio & { escribiendo?: boolean };
type Ronda = Partial<Record<Agente, Respuesta>>;
type Intercambio = Omit<IntercambioTrio, "respuestas" | "replicas"> & {
  respuestas: Ronda;
  replicas?: Ronda | null;
};
type Campo = "respuestas" | "replicas";
type Proyecto = { id: string; name: string };

const LLAVE_PROYECTO = "vforge.activeProject";
const LLAVE_REPLICA = "vforge.trio.replica";
const llaveConversacion = (projectId: string) => `vforge.trio.${projectId || "general"}`;

const SUBTITULO: Record<Agente, string> = {
  claude: "Anthropic",
  chatgpt: "OpenAI",
  v: "La IA de VForge",
};

const MONOGRAMA: Record<Agente, { letra: string; clase: string }> = {
  claude: { letra: "C", clase: "bg-black text-white" },
  chatgpt: { letra: "G", clase: "bg-[#55585d] text-white" },
  v: { letra: "V", clase: "border border-black bg-white text-black" },
};

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

function nuevoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
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
    // sin almacenamiento: la conversación sigue en memoria
  }
}

/** Sólo lo que el servidor necesita: texto de cada respuesta, sin estados de UI. */
function paraServidor(lista: Intercambio[]): IntercambioTrio[] {
  const limpiar = (ronda: Ronda | null | undefined) => {
    if (!ronda) return null;
    const salida: Partial<Record<Agente, RespuestaTrio>> = {};
    AGENTES.forEach((a) => {
      const r = ronda[a];
      if (r?.texto?.trim()) salida[a] = { texto: r.texto };
    });
    return salida;
  };
  return lista.map((i) => ({
    id: i.id,
    pregunta: i.pregunta,
    respuestas: limpiar(i.respuestas) ?? {},
    replicas: limpiar(i.replicas),
  }));
}

function parseSse(bloque: string): Record<string, unknown> | null {
  const data = bloque
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    const v: unknown = JSON.parse(data);
    return esObjeto(v) ? v : null;
  } catch {
    return null;
  }
}

type Estado = "espera" | "escribiendo" | "listo" | "error";

function estadoDe(lista: Intercambio[], agente: Agente): Estado {
  const ultimo = lista[lista.length - 1];
  if (!ultimo) return "espera";
  const r = ultimo.replicas?.[agente] ?? ultimo.respuestas[agente];
  if (!r) return "espera";
  if (r.escribiendo) return "escribiendo";
  if (r.error) return "error";
  return "listo";
}

const ETIQUETA_ESTADO: Record<Estado, string> = {
  espera: "En espera",
  escribiendo: "Escribiendo",
  listo: "Respondió",
  error: "Falló",
};

function Punto({ estado }: { estado: Estado }) {
  return (
    <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
      {estado === "escribiendo" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-black opacity-40" />
      )}
      <span
        className={cn(
          "relative inline-block h-2 w-2 rounded-full",
          estado === "espera" && "bg-[#c4c4c0]",
          estado === "escribiendo" && "bg-black",
          estado === "listo" && "bg-[#1fb95a]",
          estado === "error" && "bg-[#e5484d]",
        )}
      />
    </span>
  );
}

function Monograma({ agente, size = 28 }: { agente: Agente; size?: number }) {
  const m = MONOGRAMA[agente];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-lg font-mono text-[12px] font-semibold", m.clase)}
      style={{ width: size, height: size }}
    >
      {m.letra}
    </span>
  );
}

function BloqueRespuesta({ respuesta, agente }: { respuesta: Respuesta | undefined; agente: Agente }) {
  if (!respuesta) {
    return <p className="text-[13px] text-[var(--fg-muted)]">Sin respuesta en esta ronda.</p>;
  }
  if (respuesta.error) {
    return (
      <div role="alert" className="rounded-xl border border-[#f1c4c5] bg-[#fdf3f3] px-3.5 py-3 text-[13px] leading-5 text-[#8f1d22]">
        <p className="font-medium">{NOMBRE_AGENTE[agente]} no pudo responder.</p>
        <p className="mt-1 break-words text-[#8f1d22]/85">{respuesta.error}</p>
        {respuesta.texto ? (
          <div className="mt-3 border-t border-[#f1c4c5] pt-3 text-black">
            <Markdown text={respuesta.texto} />
          </div>
        ) : null}
      </div>
    );
  }
  if (!respuesta.texto && respuesta.escribiendo) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-[#ecece8]" />
        <div className="h-2.5 w-9/12 animate-pulse rounded-full bg-[#ecece8]" />
        <div className="h-2.5 w-10/12 animate-pulse rounded-full bg-[#ecece8]" />
      </div>
    );
  }
  return <Markdown text={respuesta.texto} streaming={respuesta.escribiendo} />;
}

function Columna({
  agente,
  intercambios,
  estado,
  modelo,
  oculta,
  idPanel,
  idPestana,
}: {
  agente: Agente;
  intercambios: Intercambio[];
  estado: Estado;
  modelo: string | null;
  oculta: boolean;
  idPanel: string;
  idPestana: string;
}) {
  const vistaRef = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);
  const ultimo = intercambios[intercambios.length - 1];
  const huella = ultimo
    ? `${intercambios.length}:${ultimo.respuestas[agente]?.texto.length ?? 0}:${ultimo.replicas?.[agente]?.texto.length ?? 0}`
    : "0";

  useEffect(() => {
    const vista = vistaRef.current;
    if (vista && pegadoAbajo.current) vista.scrollTop = vista.scrollHeight;
  }, [huella, oculta]);

  return (
    <section
      id={idPanel}
      role="tabpanel"
      aria-labelledby={idPestana}
      aria-busy={estado === "escribiendo"}
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white",
        oculta ? "hidden xl:flex" : "flex",
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-1)] px-4 py-3">
        <Monograma agente={agente} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium leading-5 tracking-[-0.01em] text-black">{NOMBRE_AGENTE[agente]}</h2>
          <p className="truncate font-mono text-[11px] text-[var(--fg-muted)]">{modelo ?? SUBTITULO[agente]}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-1)] px-2.5 py-1 text-[12px] text-[var(--fg-secondary)]">
          <Punto estado={estado} />
          {ETIQUETA_ESTADO[estado]}
        </span>
      </header>

      <div
        ref={vistaRef}
        onScroll={(e) => {
          const v = e.currentTarget;
          pegadoAbajo.current = v.scrollHeight - v.scrollTop - v.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {intercambios.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
            <Monograma agente={agente} size={40} />
            <p className="mt-3 max-w-[260px] text-[13px] leading-5 text-[var(--fg-muted)]">
              {NOMBRE_AGENTE[agente]} espera tu primer mensaje. Lo que escribas abajo le llega a los tres al mismo tiempo.
            </p>
          </div>
        ) : (
          <ol className="space-y-6">
            {intercambios.map((i) => (
              <li key={i.id} className="space-y-3">
                <div className="rounded-xl bg-[#f2f2f0] px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">Tú</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-black">{i.pregunta}</p>
                </div>
                <BloqueRespuesta respuesta={i.respuestas[agente]} agente={agente} />
                {i.replicas?.[agente] ? (
                  <div className="border-l-2 border-black pl-3">
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                      Réplica a los otros dos
                    </p>
                    <BloqueRespuesta respuesta={i.replicas[agente]} agente={agente} />
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
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargandoProyectos, setCargandoProyectos] = useState(true);
  const [errorProyectos, setErrorProyectos] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [intercambios, setIntercambios] = useState<Intercambio[]>([]);
  // De qué proyecto es la mesa cargada: evita guardar la de un proyecto en otro.
  const [claveCargada, setClaveCargada] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Partial<Record<Agente, string>>>({});
  const [replica, setReplica] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pestana, setPestana] = useState<Agente>("claude");
  const controladores = useRef<AbortController[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const base = useId();
  const idSelect = `${base}-proyecto`;
  const idTexto = `${base}-mensaje`;
  const idAyuda = `${base}-ayuda`;

  // Proyectos reales del dueño + el proyecto activo recordado (mismo que el Estudio).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/projects", { cache: "no-store" });
        const p: unknown = await r.json().catch(() => null);
        if (!r.ok || !esObjeto(p) || !Array.isArray(p.projects)) {
          throw new Error(`No se pudieron cargar los proyectos (HTTP ${r.status}).`);
        }
        const lista = p.projects
          .filter((x): x is Proyecto => esObjeto(x) && typeof x.id === "string" && typeof x.name === "string")
          .map((x) => ({ id: x.id, name: x.name }));
        if (!vivo) return;
        setProyectos(lista);
        let recordado = "";
        try {
          recordado = new URLSearchParams(window.location.search).get("project") ?? leerLocal(LLAVE_PROYECTO) ?? "";
        } catch {
          recordado = "";
        }
        if (recordado && lista.some((x) => x.id === recordado)) setProjectId(recordado);
      } catch (e) {
        if (vivo) setErrorProyectos(e instanceof Error ? e.message : "No se pudieron cargar los proyectos.");
      } finally {
        if (vivo) setCargandoProyectos(false);
      }
    })();
    setReplica(leerLocal(LLAVE_REPLICA) === "1");
    return () => {
      vivo = false;
    };
  }, []);

  // Cada proyecto tiene su propia mesa (guardada en este navegador).
  useEffect(() => {
    if (cargandoProyectos) return;
    const crudo = leerLocal(llaveConversacion(projectId));
    let lista: Intercambio[] = [];
    if (crudo) {
      try {
        const v: unknown = JSON.parse(crudo);
        if (Array.isArray(v)) {
          lista = v.filter(
            (x): x is Intercambio =>
              esObjeto(x) && typeof x.id === "string" && typeof x.pregunta === "string" && esObjeto(x.respuestas),
          );
        }
      } catch {
        lista = [];
      }
    }
    setIntercambios(lista);
    setClaveCargada(llaveConversacion(projectId));
    setModelos({});
  }, [projectId, cargandoProyectos]);

  // Persistencia local cuando nada está escribiendo.
  useEffect(() => {
    const clave = llaveConversacion(projectId);
    if (enviando || claveCargada !== clave) return;
    guardarLocal(clave, intercambios.length ? JSON.stringify(paraServidor(intercambios)) : null);
  }, [intercambios, enviando, projectId, claveCargada]);

  useEffect(() => () => controladores.current.forEach((c) => c.abort()), []);

  const actualizar = useCallback(
    (idIntercambio: string, campo: Campo, agente: Agente, cambio: (r: Respuesta) => Respuesta) => {
      setIntercambios((lista) =>
        lista.map((i) => {
          if (i.id !== idIntercambio) return i;
          const ronda: Ronda = { ...(i[campo] ?? {}) };
          ronda[agente] = cambio(ronda[agente] ?? { texto: "" });
          return { ...i, [campo]: ronda };
        }),
      );
    },
    [],
  );

  /** Corre un agente y devuelve lo que respondió (para armar la réplica). */
  const correr = useCallback(
    async (
      agente: Agente,
      lista: Intercambio[],
      modo: ModoTrio,
      proyecto: string,
    ): Promise<Respuesta> => {
      const idIntercambio = lista[lista.length - 1].id;
      const campo: Campo = modo === "replicar" ? "replicas" : "respuestas";
      const control = new AbortController();
      controladores.current.push(control);
      let texto = "";
      let error: string | null = null;
      try {
        const r = await fetch("/api/forge/trio", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ agente, modo, projectId: proyecto || null, intercambios: paraServidor(lista) }),
          signal: control.signal,
        });
        if (!r.ok || !r.body) {
          const p: unknown = await r.json().catch(() => null);
          throw new Error(esObjeto(p) && typeof p.error === "string" ? p.error : `HTTP ${r.status}`);
        }
        const lector = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const aplicar = (ev: Record<string, unknown>) => {
          if (ev.type === "meta" && typeof ev.model === "string") {
            const modelo = ev.model;
            setModelos((m) => ({ ...m, [agente]: modelo }));
          } else if (ev.type === "text" && typeof ev.value === "string") {
            const valor = ev.value;
            texto += valor;
            actualizar(idIntercambio, campo, agente, (x) => ({ ...x, texto: x.texto + valor }));
          } else if (ev.type === "error") {
            error = typeof ev.message === "string" ? ev.message : "El proveedor no respondió.";
          }
        };
        while (true) {
          const { value, done } = await lector.read();
          buffer += decoder.decode(value, { stream: !done });
          const bloques = buffer.split("\n\n");
          buffer = bloques.pop() ?? "";
          bloques.forEach((b) => {
            const ev = parseSse(b);
            if (ev) aplicar(ev);
          });
          if (done) break;
        }
        const resto = parseSse(buffer);
        if (resto) aplicar(resto);
      } catch (e) {
        error = control.signal.aborted
          ? "Detenido."
          : e instanceof Error
            ? e.message
            : "No se pudo contactar al proveedor.";
      } finally {
        controladores.current = controladores.current.filter((c) => c !== control);
      }
      if (!error && !texto.trim()) error = "Respondió vacío.";
      const final: Respuesta = { texto, error, escribiendo: false };
      actualizar(idIntercambio, campo, agente, (x) => ({ ...x, error, escribiendo: false }));
      return final;
    },
    [actualizar],
  );

  async function enviar() {
    const pregunta = borrador.trim();
    if (!pregunta || enviando) return;
    const nuevo: Intercambio = {
      id: nuevoId(),
      pregunta,
      respuestas: Object.fromEntries(AGENTES.map((a) => [a, { texto: "", escribiendo: true }])) as Ronda,
      replicas: null,
    };
    const lista = [...intercambios, nuevo];
    setIntercambios(lista);
    setBorrador("");
    setEnviando(true);
    try {
      const resultados = await Promise.all(AGENTES.map((a) => correr(a, lista, "responder", projectId)));
      const respuestas = Object.fromEntries(AGENTES.map((a, i) => [a, resultados[i]])) as Ronda;
      const quienes = AGENTES.filter((a) => !respuestas[a]?.error && respuestas[a]?.texto.trim());
      if (replica && quienes.length >= 2) {
        const conRespuestas: Intercambio[] = [...intercambios, { ...nuevo, respuestas }];
        setIntercambios((actual) =>
          actual.map((i) =>
            i.id === nuevo.id
              ? { ...i, replicas: Object.fromEntries(quienes.map((a) => [a, { texto: "", escribiendo: true }])) as Ronda }
              : i,
          ),
        );
        await Promise.all(quienes.map((a) => correr(a, conRespuestas, "replicar", projectId)));
      }
    } finally {
      setEnviando(false);
      textareaRef.current?.focus();
    }
  }

  function detener() {
    controladores.current.forEach((c) => c.abort());
  }

  function nuevaConversacion() {
    if (enviando) return;
    setIntercambios([]);
    setModelos({});
    guardarLocal(llaveConversacion(projectId), null);
    textareaRef.current?.focus();
  }

  function elegirProyecto(id: string) {
    if (enviando) return;
    setProjectId(id);
    guardarLocal(LLAVE_PROYECTO, id || null);
  }

  function alternarReplica() {
    setReplica((v) => {
      guardarLocal(LLAVE_REPLICA, v ? "0" : "1");
      return !v;
    });
  }

  const estados = useMemo(
    () => Object.fromEntries(AGENTES.map((a) => [a, estadoDe(intercambios, a)])) as Record<Agente, Estado>,
    [intercambios],
  );

  // Alto automático del cuadro de texto (hasta ~6 líneas).
  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 168)}px`;
  }, [borrador]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-[#f7f7f5]">
      {/* Barra: proyecto, réplica y nueva conversación */}
      <div className="shrink-0 border-b border-[var(--border-1)] bg-white px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <div className="min-w-0 flex-1 basis-full sm:basis-[220px]">
            <label htmlFor={idSelect} className="sr-only">
              Proyecto
            </label>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)] sm:inline">
                Proyecto
              </span>
              <select
                id={idSelect}
                value={projectId}
                onChange={(e) => elegirProyecto(e.target.value)}
                disabled={cargandoProyectos || enviando}
                className="h-11 min-w-0 flex-1 truncate rounded-lg border border-[var(--border-2)] bg-white px-3 text-[14px] text-black outline-none transition focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-60 sm:max-w-[360px]"
              >
                <option value="">{cargandoProyectos ? "Cargando proyectos…" : "Sin proyecto (general)"}</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {errorProyectos ? (
              <p role="alert" className="mt-1 text-[12px] text-[#8f1d22]">
                {errorProyectos}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={replica}
            onClick={alternarReplica}
            disabled={enviando}
            className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-lg px-1 text-left text-[13px] text-black disabled:opacity-60"
          >
            <span
              aria-hidden
              className={cn(
                "relative inline-flex h-6 w-10 shrink-0 rounded-full border transition",
                replica ? "border-black bg-black" : "border-[var(--border-2)] bg-[#ededeb]",
              )}
            >
              <span
                className={cn(
                  "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                  replica ? "left-[19px]" : "left-[3px]",
                )}
              />
            </span>
            <span className="leading-4">
              Que se respondan entre ellos
              <span className="block text-[11px] text-[var(--fg-muted)]">1 ronda de réplica corta</span>
            </span>
          </button>

          <button
            type="button"
            onClick={nuevaConversacion}
            disabled={enviando || intercambios.length === 0}
            className="btn-ghost ml-auto disabled:opacity-50"
          >
            <IconPlus size={14} /> <span className="hidden sm:inline">Nueva conversación</span>
            <span className="sr-only sm:hidden">Nueva conversación</span>
          </button>
        </div>
      </div>

      {/* Pestañas (celular y tablet): las tres siempre a la vista con su estado */}
      <div
        role="tablist"
        aria-label="Agentes"
        className="grid shrink-0 grid-cols-3 gap-1.5 px-4 pt-3 md:px-6 xl:hidden"
      >
        {AGENTES.map((a) => {
          const activa = pestana === a;
          return (
            <button
              key={a}
              id={`${base}-tab-${a}`}
              type="button"
              role="tab"
              aria-selected={activa}
              aria-controls={`${base}-panel-${a}`}
              onClick={() => setPestana(a)}
              className={cn(
                "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-[13px] font-medium transition",
                activa ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black hover:border-black",
              )}
            >
              <span className="truncate">{NOMBRE_AGENTE[a]}</span>
              <Punto estado={estados[a]} />
              <span className="sr-only">· {ETIQUETA_ESTADO[estados[a]]}</span>
            </button>
          );
        })}
      </div>

      {/* Columnas: tres en escritorio, una (la de la pestaña) en celular */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 md:px-6 xl:grid-cols-3 xl:gap-4 xl:py-4">
        {AGENTES.map((a) => (
          <Columna
            key={a}
            agente={a}
            intercambios={intercambios}
            estado={estados[a]}
            modelo={modelos[a] ?? null}
            oculta={pestana !== a}
            idPanel={`${base}-panel-${a}`}
            idPestana={`${base}-tab-${a}`}
          />
        ))}
      </div>

      {/* Compositor: un mensaje, tres destinatarios */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="shrink-0 border-t border-[var(--border-1)] bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-6"
      >
        <label htmlFor={idTexto} className="sr-only">
          Mensaje para Claude, ChatGPT y V
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
            aria-describedby={idAyuda}
            placeholder="Escribe una vez; responden los tres…"
            className="min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-[var(--border-2)] bg-[#f7f7f5] px-3.5 py-[11px] text-[14px] leading-5 text-black transition placeholder:text-[var(--fg-muted)] focus:border-black focus:bg-white focus:outline-none"
          />
          {enviando ? (
            <button type="button" onClick={detener} className="btn-ink min-h-[44px] shrink-0">
              <IconStop size={14} /> <span className="hidden sm:inline">Detener</span>
              <span className="sr-only sm:hidden">Detener</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!borrador.trim()}
              className="btn-primary min-h-[44px] shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconSend size={14} /> <span className="hidden sm:inline">Enviar a los tres</span>
              <span className="sr-only sm:hidden">Enviar a los tres</span>
            </button>
          )}
        </div>
        <p id={idAyuda} className="mt-1.5 hidden text-[11px] text-[var(--fg-muted)] sm:block">
          Enter envía · Shift+Enter nueva línea · Cada uno lee lo que dijeron los otros dos · Sin herramientas: sólo conversación.
        </p>
      </form>
    </div>
  );
}
