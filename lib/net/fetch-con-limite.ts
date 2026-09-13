/**
 * fetch con tiempo límite y reintento.
 *
 * El `fetch` pelón no se rinde nunca: si el otro extremo acepta la conexión y
 * se queda callado, la promesa no resuelve jamás y la pantalla se queda
 * "cargando" para siempre. Eso es lo que hace que un sistema se sienta
 * inestable aunque casi todo funcione.
 *
 * Aquí toda llamada tiene un final: responde, o falla con un mensaje que se
 * puede enseñar tal cual a una persona.
 */

export class FallaDeRed extends Error {
  readonly causa: "tiempo" | "red" | "http";
  readonly status?: number;
  constructor(mensaje: string, causa: "tiempo" | "red" | "http", status?: number) {
    super(mensaje);
    this.name = "FallaDeRed";
    this.causa = causa;
    this.status = status;
  }
}

export type OpcionesLimite = RequestInit & {
  /** Milisegundos antes de rendirse. Por defecto 15 s. */
  limiteMs?: number;
  /** Reintentos ante timeout o error de red (no ante 4xx). Por defecto 1. */
  reintentos?: number;
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchConLimite(
  url: string,
  opciones: OpcionesLimite = {},
): Promise<Response> {
  const { limiteMs = 15_000, reintentos = 1, ...init } = opciones;
  let ultimo: unknown;

  for (let intento = 0; intento <= reintentos; intento++) {
    const control = new AbortController();
    const alarma = setTimeout(() => control.abort(), limiteMs);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ?? control.signal });
      clearTimeout(alarma);
      return res;
    } catch (e) {
      clearTimeout(alarma);
      ultimo = e;
      const abortado = e instanceof Error && e.name === "AbortError";
      if (intento < reintentos) {
        // Espera corta y creciente: 300 ms, 600 ms…
        await dormir(300 * (intento + 1));
        continue;
      }
      if (abortado) {
        throw new FallaDeRed(
          `El servidor no respondió en ${Math.round(limiteMs / 1000)} segundos.`,
          "tiempo",
        );
      }
      throw new FallaDeRed("No se pudo llegar al servidor.", "red");
    }
  }
  throw (ultimo instanceof Error ? ultimo : new FallaDeRed("Falla de red.", "red"));
}

/** Igual que arriba, pero además exige respuesta OK y devuelve el JSON. */
export async function pedirJSON<T = unknown>(
  url: string,
  opciones: OpcionesLimite = {},
): Promise<T> {
  const res = await fetchConLimite(url, opciones);
  if (!res.ok) {
    let extra = "";
    try {
      const cuerpo = await res.text();
      extra = cuerpo.slice(0, 200);
    } catch {
      /* el cuerpo es lo de menos si ya falló */
    }
    throw new FallaDeRed(
      `El servidor respondió ${res.status}.${extra ? " " + extra : ""}`,
      "http",
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** Traduce cualquier tronido a una frase que se le puede enseñar a alguien. */
export function mensajeHumano(e: unknown): string {
  if (e instanceof FallaDeRed) {
    if (e.causa === "tiempo") return "El servidor tardó demasiado. Reintenta en un momento.";
    if (e.causa === "red") return "No hay conexión con el servidor. Revisa tu red y reintenta.";
    if (e.status === 401 || e.status === 403) return "Tu sesión ya no es válida. Vuelve a entrar.";
    if (e.status === 404) return "Eso ya no existe o cambió de lugar.";
    if (e.status && e.status >= 500) return "El servidor falló de su lado. No es tu culpa; reintenta.";
    return e.message;
  }
  if (e instanceof Error && e.message) return e.message;
  return "Algo falló y no dejó rastro. Reintenta.";
}
