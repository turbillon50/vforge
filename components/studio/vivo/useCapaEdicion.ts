"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Capa de edición, lado Estudio.
 *
 * La capa que corre dentro del iframe (overlay.js) resalta y selecciona; este
 * hook es el otro lado de la conversación: recibe la selección por postMessage,
 * manda el cambio a /api/vivo/edit (que escribe el código de verdad) y pinta el
 * cambio de inmediato en la vista para que se sienta instantáneo — lo definitivo
 * llega por recarga en caliente.
 */

export type ElementoSeleccionado = {
  src: string;
  etiqueta: string;
  clase: string;
  texto: string;
  tieneTextoPropio: boolean;
  estilos: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
    padding: string;
    margin: string;
    borderRadius: string;
  };
  caja: { ancho: number; alto: number };
};

export type OperacionEdicion =
  | { tipo: "texto"; valor: string }
  | { tipo: "estilo"; props: Record<string, string | number> }
  | { tipo: "clase"; valor: string };

/** Le habla a todos los iframes del preview (escritorio y móvil a la vez). */
function hablarConVistas(mensaje: Record<string, unknown>) {
  const marcos = document.querySelectorAll<HTMLIFrameElement>("iframe[data-vf-vista]");
  marcos.forEach((marco) => {
    try {
      marco.contentWindow?.postMessage({ canal: "vf-vivo-estudio", ...mensaje }, "*");
    } catch {
      /* ese marco todavía no carga */
    }
  });
}

export function useCapaEdicion({
  proyecto,
  activa,
}: {
  proyecto: string;
  activa: boolean;
}) {
  const [seleccion, setSeleccion] = useState<ElementoSeleccionado | null>(null);
  const [marcados, setMarcados] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ultimoCambio, setUltimoCambio] = useState<string | null>(null);
  const activaRef = useRef(activa);

  useEffect(() => {
    activaRef.current = activa;
  }, [activa]);

  // Escucha a la capa dentro del iframe.
  useEffect(() => {
    function alMensaje(evento: MessageEvent) {
      const datos = evento.data as
        | { canal?: string; tipo?: string; elemento?: ElementoSeleccionado; marcados?: number }
        | null;
      if (!datos || datos.canal !== "vf-vivo") return;

      if (datos.tipo === "listo" || datos.tipo === "pong") {
        if (typeof datos.marcados === "number") setMarcados(datos.marcados);
        // Si el modo edición ya estaba puesto, la vista recién cargada se entera.
        if (activaRef.current) hablarConVistas({ tipo: "modo", activo: true });
        return;
      }
      if (datos.tipo === "seleccion" && datos.elemento) {
        setSeleccion(datos.elemento);
        setAviso(null);
        return;
      }
      if (datos.tipo === "seleccion-perdida") {
        setSeleccion(null);
        return;
      }
    }
    window.addEventListener("message", alMensaje);
    return () => window.removeEventListener("message", alMensaje);
  }, []);

  // Enciende o apaga la capa en todas las vistas.
  useEffect(() => {
    hablarConVistas({ tipo: "modo", activo: activa });
    if (!activa) setSeleccion(null);
  }, [activa]);

  const limpiar = useCallback(() => {
    setSeleccion(null);
    hablarConVistas({ tipo: "limpiar" });
  }, []);

  /** Pinta el cambio ya (optimista) y lo escribe en el código. */
  const editar = useCallback(
    async (operacion: OperacionEdicion) => {
      if (!seleccion || !proyecto) return;
      setGuardando(true);
      setAviso(null);

      // 1. Se ve de inmediato.
      if (operacion.tipo === "texto") {
        hablarConVistas({ tipo: "vista-previa", texto: operacion.valor });
      } else if (operacion.tipo === "estilo") {
        hablarConVistas({ tipo: "vista-previa", estilos: operacion.props });
      }

      // 2. Se escribe de verdad.
      try {
        const respuesta = await fetch("/api/vivo/edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proyecto, src: seleccion.src, operacion }),
        });
        const datos = (await respuesta.json()) as { error?: string; archivo?: string; linea?: number };
        if (!respuesta.ok) {
          setAviso(datos.error ?? "No se pudo escribir el cambio.");
          return false;
        }
        setUltimoCambio(
          datos.archivo ? `${datos.archivo}${datos.linea ? `:${datos.linea}` : ""}` : null,
        );
        // Deja el retrato local al día para que los controles no se vean atrasados.
        setSeleccion((actual) => {
          if (!actual) return actual;
          if (operacion.tipo === "texto") return { ...actual, texto: operacion.valor };
          if (operacion.tipo === "estilo") {
            return { ...actual, estilos: { ...actual.estilos, ...toTexto(operacion.props) } };
          }
          if (operacion.tipo === "clase") return { ...actual, clase: operacion.valor };
          return actual;
        });
        return true;
      } catch (caught) {
        setAviso(caught instanceof Error ? caught.message : "El motor vivo no respondió.");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [proyecto, seleccion],
  );

  return { seleccion, marcados, guardando, aviso, ultimoCambio, editar, limpiar, setAviso };
}

function toTexto(props: Record<string, string | number>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [llave, valor] of Object.entries(props)) salida[llave] = String(valor);
  return salida;
}
