/**
 * Sala de agentes — Claude Code, Codex y V sobre un proyecto.
 *
 * Este módulo es puro (sin red, sin "server-only") para que lo compartan la
 * página y el route handler: define la forma de la conversación compartida y
 * cómo se traduce al historial de CADA agente, de modo que cada uno vea lo que
 * dijo Luis, lo que dijo él mismo (como assistant) y lo que dijeron los otros
 * dos (como contexto del lado user, con nombre), para que se lean entre ellos.
 */

export const AGENTES = ["claude", "codex", "v"] as const;
export type Agente = (typeof AGENTES)[number];

export const NOMBRE_AGENTE: Record<Agente, string> = {
  claude: "Claude Code",
  codex: "Codex",
  v: "V",
};

export function esAgente(valor: unknown): valor is Agente {
  return typeof valor === "string" && (AGENTES as readonly string[]).includes(valor);
}

/** Lo que respondió un agente en una ronda. `texto` vacío = no respondió. */
export interface RespuestaTrio {
  texto: string;
  error?: string | null;
  modelo?: string | null;
}

/** Un intercambio: Luis escribe una vez; responden los tres; réplica opcional. */
export interface IntercambioTrio {
  id: string;
  pregunta: string;
  respuestas: Partial<Record<Agente, RespuestaTrio>>;
  /** Ronda opcional en la que cada uno comenta lo de los otros dos. */
  replicas?: Partial<Record<Agente, RespuestaTrio>> | null;
}

export type ModoTrio = "responder" | "replicar";

export interface TurnoChat {
  role: "user" | "assistant";
  content: string;
}

/** Límites para que el historial no crezca sin freno. */
export const MAX_INTERCAMBIOS = 12;
export const MAX_CARACTERES_TEXTO = 8000;

const recortar = (texto: string) =>
  texto.length > MAX_CARACTERES_TEXTO ? `${texto.slice(0, MAX_CARACTERES_TEXTO)}…` : texto;

function textoValido(respuesta: RespuestaTrio | undefined): string | null {
  const t = respuesta?.texto?.trim();
  return t ? recortar(t) : null;
}

function bloqueOtros(
  agente: Agente,
  ronda: Partial<Record<Agente, RespuestaTrio>> | null | undefined,
  encabezado: string,
): string | null {
  if (!ronda) return null;
  const lineas = AGENTES.filter((otro) => otro !== agente).map((otro) => {
    const t = textoValido(ronda[otro]);
    return t ? `[${NOMBRE_AGENTE[otro]}]:\n${t}` : `[${NOMBRE_AGENTE[otro]}]: (no respondió en esta ronda)`;
  });
  return `${encabezado}\n\n${lineas.join("\n\n")}`;
}

export const INSTRUCCION_REPLICA =
  "Ronda de réplica (una sola): lee lo que respondieron los otros dos y comenta brevemente — " +
  "en qué coincides, qué corregirías o qué le falta a cada uno, y qué agregarías tú. " +
  "Máximo 120 palabras. No repitas tu respuesta anterior.";

/**
 * Construye el historial que recibe `agente`, alternando user/assistant (los
 * turnos consecutivos del mismo rol se funden, como exige la Messages API).
 *
 * - `responder`: el último intercambio es la pregunta nueva (sin respuestas).
 * - `replicar`: el último intercambio ya tiene respuestas; se pide la réplica.
 */
export function historialPara(
  agente: Agente,
  intercambios: IntercambioTrio[],
  modo: ModoTrio,
): TurnoChat[] {
  const turnos: TurnoChat[] = [];
  const empujar = (role: TurnoChat["role"], content: string | null) => {
    if (!content) return;
    const ultimo = turnos[turnos.length - 1];
    if (ultimo && ultimo.role === role) {
      ultimo.content = `${ultimo.content}\n\n${content}`;
    } else {
      turnos.push({ role, content });
    }
  };

  const recientes = intercambios.slice(-MAX_INTERCAMBIOS);
  recientes.forEach((intercambio, i) => {
    const esUltimo = i === recientes.length - 1;
    empujar("user", `[Luis]:\n${recortar(intercambio.pregunta.trim())}`);
    if (esUltimo && modo === "responder") return;

    empujar("assistant", textoValido(intercambio.respuestas[agente]));
    empujar(
      "user",
      bloqueOtros(
        agente,
        intercambio.respuestas,
        "Lo que respondieron los otros dos en esa misma ronda (en paralelo a ti):",
      ),
    );
    if (esUltimo && modo === "replicar") {
      empujar("user", INSTRUCCION_REPLICA);
      return;
    }
    if (intercambio.replicas) {
      empujar("assistant", textoValido(intercambio.replicas[agente]));
      empujar(
        "user",
        bloqueOtros(agente, intercambio.replicas, "Las réplicas de los otros dos:"),
      );
    }
  });

  return turnos;
}

/** Contexto corto del proyecto: sólo campos reales de la fila. */
export interface ProyectoTrio {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  github_repo?: string | null;
  github_url?: string | null;
  vercel_url?: string | null;
  domain?: string | null;
}

export function contextoProyecto(proyecto: ProyectoTrio | null): string {
  if (!proyecto) {
    return "Proyecto: ninguno elegido (conversación general sobre VForge y el trabajo de Luis).";
  }
  const filas: Array<[string, string | null | undefined]> = [
    ["Nombre", proyecto.name],
    ["Descripción", proyecto.description],
    ["Categoría", proyecto.category],
    ["Estado", proyecto.status],
    ["Repo", proyecto.github_repo],
    ["GitHub", proyecto.github_url],
    ["Vercel", proyecto.vercel_url],
    ["Dominio", proyecto.domain],
  ];
  const lineas = filas
    .filter(([, valor]) => typeof valor === "string" && valor.trim())
    .map(([etiqueta, valor]) => `- ${etiqueta}: ${(valor as string).trim().slice(0, 400)}`);
  return `Proyecto sobre el que se conversa:\n${lineas.join("\n")}`;
}

/** Reglas de la mesa, comunes a los tres. */
export function reglasDeLaMesa(agente: Agente): string {
  const otros = AGENTES.filter((a) => a !== agente)
    .map((a) => NOMBRE_AGENTE[a])
    .join(" y ");
  return [
    `Estás en la "Sala de agentes" de VForge, donde Luis (el dueño) coordina a Claude Code, Codex y V sobre un proyecto vivo. Tú eres ${NOMBRE_AGENTE[agente]}.`,
    `Luis escribe una vez y los tres responden en paralelo. En el historial verás lo que dijeron ${otros}, marcado con su nombre: léelos, complementa, corrige o debate con argumentos; nómbralos cuando te refieras a ellos.`,
    agente === "v"
      ? "En esta columna V conversa con su motor actual; Claude Code y Codex trabajan por otra ruta con herramientas reales. No finjas haber ejecutado herramientas desde V."
      : "Claude Code y Codex trabajan encerrados por el motor vivo; sé preciso sobre lo que hiciste y lo que quedó pendiente.",
    "No inventes estados, avances ni cifras del proyecto: si no lo sabes, dilo.",
    "Responde en español mexicano casual y cercano (trata a Luis de tú; nunca le digas \"jefe\"). Ve al grano: respuestas concisas, en Markdown cuando ayude.",
  ].join("\n");
}
