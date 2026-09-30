"use client";

/**
 * VentanaDispositivo — un dispositivo completo con la app viva adentro.
 *
 * - El celular es un clon fiel: la pantalla mide lo mismo que el viewport real
 *   (iPhone 15 Pro 393×852, Pixel 8 412×915…), con isla, barra de estado e
 *   indicador de inicio; se escala para caber en la ventana sin deformar nada.
 * - Pide su propia entrada al motor vivo (el servidor reutiliza el mismo dev
 *   server), así que TODAS las ventanas ven el mismo código: una edición en
 *   cualquier ventana aparece en las demás por recarga en caliente.
 * - BroadcastChannel sincroniza entre ventanas: recargar y cambio de ruta.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Dispositivo = {
  id: string;
  nombre: string;
  ancho: number;
  alto: number;
  tipo: "telefono" | "tablet" | "escritorio";
  radio: number;
};

const DISPOSITIVOS: Dispositivo[] = [
  { id: "iphone", nombre: "iPhone 15 Pro", ancho: 393, alto: 852, tipo: "telefono", radio: 55 },
  { id: "iphone-se", nombre: "iPhone SE", ancho: 375, alto: 667, tipo: "telefono", radio: 38 },
  { id: "pixel", nombre: "Pixel 8", ancho: 412, alto: 915, tipo: "telefono", radio: 46 },
  { id: "ipad", nombre: "iPad mini", ancho: 744, alto: 1133, tipo: "tablet", radio: 36 },
  { id: "escritorio", nombre: "Escritorio", ancho: 1440, alto: 900, tipo: "escritorio", radio: 14 },
];

type Mensaje = { tipo: "recargar" } | { tipo: "ruta"; ruta: string };

function hora(): string {
  return new Date().toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: false });
}

export function VentanaDispositivo({
  projectId,
  nombre,
  urlRespaldo,
  dispositivoInicial,
  rutaInicial,
}: {
  projectId: string;
  nombre: string;
  urlRespaldo: { movil: string | null; escritorio: string | null };
  dispositivoInicial: string;
  rutaInicial: string;
}) {
  const [dispId, setDispId] = useState(DISPOSITIVOS.some((d) => d.id === dispositivoInicial) ? dispositivoInicial : "iphone");
  const disp = DISPOSITIVOS.find((d) => d.id === dispId) ?? DISPOSITIVOS[0];
  const [horizontal, setHorizontal] = useState(false);
  const [zoom, setZoom] = useState<"ajustar" | number>("ajustar");
  const [ruta, setRuta] = useState(rutaInicial);
  const [rutaEscrita, setRutaEscrita] = useState(rutaInicial);
  const [entrada, setEntrada] = useState<string | null>(null);
  const [estado, setEstado] = useState<"conectando" | "vivo" | "respaldo" | "error">("conectando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [reloj, setReloj] = useState(hora());
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 800, h: 800 });
  const canal = useRef<BroadcastChannel | null>(null);

  const nombreVivo = useMemo(
    () => projectId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 63),
    [projectId],
  );

  // Entrada propia al motor vivo (reutiliza el servidor si ya está encendido).
  const conectar = useCallback(async () => {
    setEstado("conectando");
    setMensaje(null);
    try {
      const r = await fetch("/api/vivo/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proyecto: nombreVivo }),
      });
      const d = (await r.json()) as { entrada?: string; error?: string };
      if (!r.ok || !d.entrada) throw new Error(d.error ?? `HTTP ${r.status}`);
      setEntrada(d.entrada);
      setEstado("vivo");
    } catch (e) {
      if (urlRespaldo.movil || urlRespaldo.escritorio) {
        setEstado("respaldo");
        setMensaje("Motor vivo apagado: mostrando el último deploy. Enciéndelo desde la Sala para editar.");
      } else {
        setEstado("error");
        setMensaje(e instanceof Error ? e.message : "No se pudo conectar.");
      }
    }
  }, [nombreVivo, urlRespaldo.movil, urlRespaldo.escritorio]);

  useEffect(() => {
    void conectar();
  }, [conectar]);

  useEffect(() => {
    document.title = `${nombre} · ${disp.nombre}`;
  }, [nombre, disp.nombre]);

  useEffect(() => {
    const id = setInterval(() => setReloj(hora()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Sincronización entre ventanas de la misma Sala.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel(`vf-sala-${projectId}`);
    canal.current = c;
    c.onmessage = (ev: MessageEvent<Mensaje>) => {
      const m = ev.data;
      if (m?.tipo === "recargar") setRecarga((n) => n + 1);
      if (m?.tipo === "ruta" && typeof m.ruta === "string") {
        setRuta(m.ruta);
        setRutaEscrita(m.ruta);
      }
    };
    return () => {
      c.close();
      canal.current = null;
    };
  }, [projectId]);

  const avisar = (m: Mensaje) => canal.current?.postMessage(m);

  // Medir el área disponible para escalar el dispositivo sin deformarlo.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setArea({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const ancho = horizontal ? disp.alto : disp.ancho;
  const alto = horizontal ? disp.ancho : disp.alto;
  const bisel = disp.tipo === "telefono" ? 14 : disp.tipo === "tablet" ? 18 : 0;
  const barra = disp.tipo === "escritorio" ? 36 : 0;
  const totalW = ancho + bisel * 2;
  const totalH = alto + bisel * 2 + barra;
  const escalaAjuste = Math.min(1, (area.w - 32) / totalW, (area.h - 32) / totalH);
  const escala = zoom === "ajustar" ? Math.max(0.2, escalaAjuste) : zoom;

  const src = useMemo(() => {
    if (estado === "vivo" && entrada) {
      const sep = entrada.includes("?") ? "&" : "?";
      return `${entrada}${sep}to=${encodeURIComponent(ruta)}`;
    }
    if (estado === "respaldo") {
      const base = (disp.tipo === "escritorio" ? urlRespaldo.escritorio : urlRespaldo.movil) ?? urlRespaldo.escritorio;
      if (!base) return null;
      try {
        return new URL(ruta, base).toString();
      } catch {
        return base;
      }
    }
    return null;
  }, [estado, entrada, ruta, disp.tipo, urlRespaldo.escritorio, urlRespaldo.movil]);

  const irARuta = (r: string) => {
    const limpia = r.startsWith("/") ? r : `/${r}`;
    setRuta(limpia);
    setRutaEscrita(limpia);
    avisar({ tipo: "ruta", ruta: limpia });
  };

  const abrirOtra = () => {
    const url = `/ventana/${encodeURIComponent(projectId)}?device=${encodeURIComponent(dispId)}&ruta=${encodeURIComponent(ruta)}`;
    window.open(url, `vf-${projectId}-${Date.now()}`, "popup,width=520,height=980");
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#ecebe7] text-black">
      {/* Barra de herramientas */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-1)] bg-white px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 pr-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              estado === "vivo" ? "bg-[#1fb95a]" : estado === "respaldo" ? "bg-[#f5a623]" : estado === "error" ? "bg-[#e5484d]" : "bg-[#c4c4c0]",
            )}
          />
          <span className="truncate text-[13px] font-medium">{nombre}</span>
        </span>
        <select
          value={dispId}
          onChange={(e) => setDispId(e.target.value)}
          aria-label="Dispositivo"
          className="h-9 rounded-md border border-[var(--border-1)] bg-white px-2 text-[13px]"
        >
          {DISPOSITIVOS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre} · {d.ancho}×{d.alto}
            </option>
          ))}
        </select>
        {disp.tipo !== "escritorio" && (
          <button
            type="button"
            onClick={() => setHorizontal((v) => !v)}
            className="h-9 rounded-md border border-[var(--border-1)] px-3 text-[13px] hover:bg-[#f7f7f5]"
          >
            {horizontal ? "Vertical" : "Horizontal"}
          </button>
        )}
        <select
          value={String(zoom)}
          onChange={(e) => setZoom(e.target.value === "ajustar" ? "ajustar" : Number(e.target.value))}
          aria-label="Zoom"
          className="h-9 rounded-md border border-[var(--border-1)] bg-white px-2 text-[13px]"
        >
          <option value="ajustar">Ajustar</option>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
        </select>
        <form
          className="flex min-w-[160px] flex-1 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            irARuta(rutaEscrita || "/");
          }}
        >
          <label className="sr-only" htmlFor="ruta-ventana">
            Ruta
          </label>
          <input
            id="ruta-ventana"
            value={rutaEscrita}
            onChange={(e) => setRutaEscrita(e.target.value)}
            className="h-9 w-full rounded-md border border-[var(--border-1)] bg-[#f7f7f5] px-3 font-mono text-[12px] outline-none focus:border-black"
          />
        </form>
        <button
          type="button"
          onClick={() => {
            setRecarga((n) => n + 1);
            avisar({ tipo: "recargar" });
          }}
          className="h-9 rounded-md border border-[var(--border-1)] px-3 text-[13px] hover:bg-[#f7f7f5]"
          title="Recarga esta y las demás ventanas de la Sala"
        >
          Recargar todas
        </button>
        <button
          type="button"
          onClick={abrirOtra}
          className="h-9 rounded-md bg-[var(--accent,#ff5a1f)] px-3 text-[13px] font-medium text-white hover:bg-[var(--accent-hover,#e84d14)]"
        >
          Otra ventana
        </button>
      </header>

      {mensaje && (
        <p className="shrink-0 border-b border-[var(--border-1)] bg-[#fff8ec] px-3 py-2 text-[12px] text-[#7a4b00]">
          {mensaje}{" "}
          {estado !== "vivo" && (
            <button type="button" onClick={() => void conectar()} className="underline">
              Reintentar
            </button>
          )}
        </p>
      )}

      {/* Mesa de trabajo */}
      <div ref={areaRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full min-w-full items-center justify-center p-4">
          <div style={{ width: totalW * escala, height: totalH * escala }} className="relative shrink-0">
            <div
              style={{ width: totalW, height: totalH, transform: `scale(${escala})`, transformOrigin: "top left", borderRadius: disp.radio + bisel }}
              className={cn(
                "absolute left-0 top-0 overflow-hidden",
                disp.tipo === "escritorio"
                  ? "border border-[#cfcfca] bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,.45)]"
                  : "bg-[#0b0b0c] shadow-[0_40px_90px_-30px_rgba(0,0,0,.6),inset_0_0_0_2px_#2a2a2c]",
              )}
            >
              {disp.tipo === "escritorio" && (
                <div className="flex items-center gap-1.5 border-b border-[#e3e3de] bg-[#f4f4f1] px-3" style={{ height: barra }}>
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="ml-3 truncate font-mono text-[11px] text-[#8a8a85]">{ruta}</span>
                </div>
              )}
              <div
                className="relative overflow-hidden bg-white"
                style={{
                  position: "absolute",
                  left: bisel,
                  top: bisel + barra,
                  width: ancho,
                  height: alto,
                  borderRadius: disp.tipo === "escritorio" ? 0 : disp.radio,
                }}
              >
                {(() => {
                  // Barra de estado real del teléfono: la página vive debajo, como en Safari.
                  const conBarra = disp.tipo === "telefono" && !horizontal;
                  const altoBarra = conBarra ? 54 : 0;
                  return (
                    <>
                      {conBarra && (
                        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-white px-[30px] text-black" style={{ height: altoBarra }}>
                          <span className="pt-1 text-[15px] font-semibold tabular-nums">{reloj}</span>
                          <span className="flex items-center gap-1.5 pt-1" aria-hidden>
                            <span className="flex items-end gap-[2px]">
                              {[5, 7, 9, 11].map((h) => (
                                <span key={h} className="w-[3px] rounded-sm bg-black" style={{ height: h }} />
                              ))}
                            </span>
                            <span className="relative ml-1 h-[12px] w-[24px] rounded-[4px] border border-black/60 p-[1.5px]">
                              <span className="block h-full w-[75%] rounded-[2px] bg-black" />
                            </span>
                          </span>
                          <div className="pointer-events-none absolute left-1/2 top-[11px] h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0" style={{ top: altoBarra }}>
                        {src ? (
                          <iframe
                            key={`${src}-${recarga}-${dispId}-${horizontal}`}
                            src={src}
                            title={`${nombre} en ${disp.nombre}`}
                            data-vf-vista="ventana"
                            className="h-full w-full border-0"
                            allow="clipboard-read; clipboard-write; geolocation; camera; microphone"
                          />
                        ) : (
                          <div className="grid h-full place-items-center p-6 text-center text-[13px] text-[#6b6b66]">
                            {estado === "conectando" ? "Conectando con el motor vivo…" : "Sin vista disponible."}
                          </div>
                        )}
                      </div>
                      {disp.tipo === "telefono" && (
                        <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-10 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/85" />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
