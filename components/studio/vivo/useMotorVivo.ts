"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Motor vivo: el estado del preview sin deploy.
 *
 * Antes el iframe del Estudio apuntaba a la URL de Vercel, así que cada cambio
 * costaba commit + build (1–3 min). Con el motor vivo apunta a un dev server en
 * el Hetzner y el cambio se ve por recarga en caliente.
 */

export type SlotVivo = {
  id: string;
  host: string;
  puerto: number;
  proyecto: string | null;
  vivo: boolean;
  listo: boolean;
  arrancado: number | null;
  ociosoSeg: number | null;
};

export type PreparacionMotor = {
  fase: "clonando" | "rama" | "instalando" | "capa" | "registro" | "listo" | "error";
  error: string | null;
  inicio: number;
  fin: number | null;
};

export type EstadoMotor = {
  maxSlots: number;
  ocioMin: number;
  memMb: number;
  proyectos: string[];
  preparando?: Record<string, PreparacionMotor>;
  slots: SlotVivo[];
};

export const TEXTO_FASE: Record<PreparacionMotor["fase"], string> = {
  clonando: "Clonando el repo en el servidor…",
  rama: "Creando la rama de trabajo…",
  instalando: "Instalando dependencias (la primera vez tarda 1–3 min)…",
  capa: "Instalando la capa de edición…",
  registro: "Registrando el proyecto…",
  listo: "Listo.",
  error: "No se pudo preparar.",
};

type Fase = "apagado" | "arrancando" | "vivo" | "error";

const LLAVE_PROYECTO = "vf-vivo-proyecto";

export function useMotorVivo(opciones?: { auto?: string | null }) {
  const auto = opciones?.auto ?? null;
  const [encendido, setEncendido] = useState(false);
  const [fase, setFase] = useState<Fase>("apagado");
  const [proyecto, setProyecto] = useState("");
  const [motor, setMotor] = useState<EstadoMotor | null>(null);
  const [urlEntrada, setUrlEntrada] = useState<string | null>(null);
  const [urlBase, setUrlBase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [preparandoId, setPreparandoId] = useState<string | null>(null);
  const [errorPreparar, setErrorPreparar] = useState<string | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  // Recuerda el último proyecto que Luis abrió en vivo.
  useEffect(() => {
    const guardado = window.localStorage.getItem(LLAVE_PROYECTO);
    if (guardado) setProyecto(guardado);
  }, []);

  const leerEstado = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/vivo/status", { cache: "no-store" });
      if (respuesta.status === 403) {
        if (montado.current) setDisponible(false);
        return null;
      }
      const datos = (await respuesta.json()) as EstadoMotor & { error?: string };
      if (!respuesta.ok) {
        if (montado.current) {
          setDisponible(false);
          setError(datos.error ?? "El motor vivo no responde.");
        }
        return null;
      }
      if (montado.current) {
        setMotor(datos);
        setDisponible(true);
      }
      return datos;
    } catch {
      if (montado.current) setDisponible(false);
      return null;
    }
  }, []);

  useEffect(() => {
    void leerEstado();
  }, [leerEstado]);

  // Mientras hay algo vivo, refresca el estado para ver el reloj de ocio.
  useEffect(() => {
    if (fase !== "vivo") return;
    const reloj = setInterval(() => void leerEstado(), 20_000);
    return () => clearInterval(reloj);
  }, [fase, leerEstado]);

  const encender = useCallback(
    async (nombre: string) => {
      const elegido = nombre.trim();
      if (!elegido) {
        setError("Elige qué proyecto abrir en vivo.");
        return;
      }
      setFase("arrancando");
      setError(null);
      setEncendido(true);
      window.localStorage.setItem(LLAVE_PROYECTO, elegido);
      setProyecto(elegido);
      try {
        const respuesta = await fetch("/api/vivo/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proyecto: elegido }),
        });
        const datos = (await respuesta.json()) as {
          entrada?: string;
          url?: string;
          error?: string;
        };
        if (!respuesta.ok || !datos.entrada) {
          throw new Error(datos.error ?? `No se pudo encender (HTTP ${respuesta.status}).`);
        }
        if (!montado.current) return;
        setUrlEntrada(datos.entrada);
        setUrlBase(datos.url ?? null);
        setFase("vivo");
        void leerEstado();
      } catch (caught) {
        if (!montado.current) return;
        setFase("error");
        setEncendido(false);
        setError(caught instanceof Error ? caught.message : "No se pudo encender el motor vivo.");
      }
    },
    [leerEstado],
  );

  const apagar = useCallback(async () => {
    setEncendido(false);
    setFase("apagado");
    setUrlEntrada(null);
    setUrlBase(null);
    if (!proyecto) return;
    try {
      await fetch("/api/vivo/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proyecto }),
      });
    } catch {
      /* si falla, el barrendero del motor lo apaga por ocio */
    }
    void leerEstado();
  }, [proyecto, leerEstado]);

  /**
   * Prepara un proyecto que todavía no está en el motor: el servidor clona su repo,
   * instala y deja la capa de edición. Al terminar, se enciende solo.
   */
  const preparar = useCallback(
    async (projectId: string) => {
      if (!projectId) return;
      setErrorPreparar(null);
      setPreparandoId(projectId);
      try {
        const respuesta = await fetch("/api/vivo/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const datos = (await respuesta.json()) as { nombre?: string; error?: string };
        if (!respuesta.ok || !datos.nombre) {
          throw new Error(datos.error ?? `No se pudo preparar (HTTP ${respuesta.status}).`);
        }
        const nombre = datos.nombre;
        // Sondeo del avance: el primer clon + instalación puede tardar unos minutos.
        for (let i = 0; i < 90 && montado.current; i += 1) {
          await new Promise((ok) => setTimeout(ok, 4000));
          const estado = await leerEstado();
          const p = estado?.preparando?.[nombre];
          if (p?.fase === "error") throw new Error(p.error ?? "No se pudo preparar el proyecto.");
          if (p?.fase === "listo" || estado?.proyectos.includes(nombre)) {
            if (!montado.current) return;
            setPreparandoId(null);
            await encender(nombre);
            return;
          }
        }
        throw new Error("La preparación está tardando demasiado. Vuelve a intentar en un momento.");
      } catch (caught) {
        if (!montado.current) return;
        setPreparandoId(null);
        setErrorPreparar(caught instanceof Error ? caught.message : "No se pudo preparar el proyecto.");
      }
    },
    [leerEstado, encender],
  );

  // Si la pantalla sabe qué proyecto es (o viene ?vivo=), se enciende sola:
  // Luis no debería tener que elegirlo en un combo para ver su app viva.
  const autoIntentado = useRef(false);
  useEffect(() => {
    if (autoIntentado.current || !motor) return;
    let pedido = auto;
    if (!pedido) {
      try {
        pedido = new URLSearchParams(window.location.search).get("vivo");
      } catch {
        pedido = null;
      }
    }
    if (!pedido || !motor.proyectos.includes(pedido)) return;
    autoIntentado.current = true;
    if (fase === "apagado") void encender(pedido);
  }, [auto, motor, fase, encender]);

  return {
    encendido,
    fase,
    proyecto,
    setProyecto,
    motor,
    urlEntrada,
    urlBase,
    error,
    disponible,
    encender,
    apagar,
    preparar,
    preparandoId,
    errorPreparar,
    refrescarEstado: leerEstado,
  };
}
