/**
 * Glosario de la Fábrica: qué es y para qué sirve cada cosa que se ve en /app/fabrica.
 *
 * Una línea humana por concepto (≤ 110 caracteres), sin cifras: los números salen
 * siempre de /api/fabrica/estado. Si algo nuevo aparece y no está aquí, la página
 * no inventa explicación (las funciones devuelven null).
 */

/** Tipos de evento del feed de Actividad. */
export const EVENTOS: Record<string, string> = {
  brain: "Algo que se guardó o se aprendió en el Brain, la memoria compartida de todos los agentes.",
  "v-trading": "Aviso del bot V-Trading: sus operaciones y el estado de sus versiones, en modo papel.",
  v: "Movimiento de V, tu asistente de la Sala: encargos que redactó a partir de lo que le pediste.",
  cola: "Movimiento de la cola de trabajos: algo entró, arrancó o terminó con un agente.",
  codex: "Algo que hizo Codex, el agente que escribe código con tu cuenta de ChatGPT Pro.",
  claude: "Algo que hizo Claude, el agente que dirige la arquitectura y el criterio.",
  cerebras: "Algo que pasó en Cerebras, el motor rápido del mesh para el trabajo ligero de texto.",
};

/** Agentes, por la clave que manda el colector (mesh = Cerebras, browser = Navegador). */
export const AGENTES: Record<string, string> = {
  claude: "El director: piensa la arquitectura, cuida el criterio y hace los cambios delicados de código.",
  codex: "Las manos: escribe y corrige código en volumen con tu cuenta de ChatGPT Pro, que tiene límite semanal.",
  mesh: "El obrero: modelos abiertos (gpt-oss) en Cerebras vía el mesh, muy rápidos para texto ligero.",
  v: "Tu asistente en la Sala: platica contigo, redacta el encargo y lo manda a la cola; él no programa.",
  shell: "Corre comandos directo en el servidor Hetzner cuando un trabajo de la cola lo pide.",
  browser: "Navegador automático: abre páginas, las recorre y saca datos o capturas.",
  grok: "Investiga y junta contexto de afuera; también da su veredicto al revisar trabajos.",
};

/** Servicios del servidor (los nombres que manda `servicios`). */
export const SERVICIOS: Record<string, string> = {
  "mesh-router": "Reparte cada pedido de IA al motor que toca (Cerebras u otro) y anota cuánto se gastó.",
  "mesh-mcp": "Expone las herramientas del mesh a los chats y agentes (consultar, inferir, ejecutar).",
  "vulcano-daemon": "El encargado 24/7: toma los trabajos de la cola, lanza a los agentes y guarda lo aprendido.",
  "ojo-api": "La puerta de la cola: por aquí se meten y se consultan los trabajos para los agentes.",
  "brain-relay": "El músculo del chat de V: le da contexto del Brain en cada turno y responde.",
  "vtrading-escaner60.timer": "Temporizador que dispara solo el escáner de V-Trading; si se cae, no busca entradas nuevas.",
  nginx: "La puerta web del servidor: recibe el tráfico con HTTPS y lo pasa a cada servicio.",
};

/** Métricas y etiquetas sueltas. */
export const METRICAS = {
  trabajando: "Agentes que están trabajando en este momento, de la cola o lanzados a mano.",
  enCola: "Trabajos que ya se pidieron y esperan a que un agente los tome.",
  tokensHoy: "Todo lo que han leído y escrito Claude, Codex y Cerebras hoy (día de Cancún).",
  codexSemana: "Cuánto llevas del límite semanal de Codex (ChatGPT Pro); al llegar al 100% toca esperar a que se renueve.",
  tokensHora: "Consumo de hoy hora por hora: la barra marcada es la hora actual en Cancún.",
  entrada: "Entrada: lo que el motor lee nuevo (instrucciones, archivos, contexto).",
  cache: "Caché: lectura repetida que el motor ya tenía guardada; sale mucho más barata.",
  salida: "Salida: lo que el motor escribe (respuestas y código). Es lo más caro.",
} as const;

/** Conceptos de la sección "Trabajando ahora". */
export const CONCEPTOS = {
  motorVivo: "Proyectos con su servidor de prueba encendido para verlos y editarlos en vivo desde la Sala.",
  terminados: "Trabajos de la cola que cerraron en la última media hora, bien o con falla.",
  enJaula: "Corre encerrado: sólo ve la carpeta de su proyecto, sin secretos ni el resto del servidor.",
  sinMedidor: "Este trabajo no reporta porcentaje; la barra sólo indica que sigue vivo, no cuánto le falta.",
} as const;

/** V-Trading. */
export const VTRADING = {
  modoPapel: "Modo papel: opera con dinero simulado para probar la estrategia; no se arriesga dinero real.",
  v60: "v6.0: la versión nueva del bot; aquí se ven las posiciones que tiene abiertas ahora.",
  v59: "v5.9: la versión anterior; su historial cerrado sirve para comparar ganancia y acierto.",
} as const;

/** Qué es cada tarjeta de la página. */
export const SECCIONES = {
  trabajando: "Lo que se está haciendo ahora mismo: quién, en qué proyecto, para qué y cuánto lleva.",
  actividad: "Bitácora de lo último que pasó en la casa, de lo más nuevo a lo más viejo.",
  hoy: "El pulso del día: cuánta gente trabaja, cuánto espera y cuánto se ha consumido.",
  alianza: "Los tres motores principales y qué está haciendo cada uno en este momento.",
  tokens: "Cuánto ha consumido hoy cada motor, separado en entrada, caché y salida.",
  vtrading: "El bot de trading propio: posiciones abiertas de v6.0 y resultado acumulado de v5.9.",
  servicios: "Los programas que mantienen viva la fábrica en el servidor; si uno cae, algo deja de funcionar.",
} as const;

export const queEsEvento = (tipo: string): string | null => EVENTOS[tipo] ?? null;
export const queEsAgente = (agente: string): string | null => AGENTES[agente] ?? null;
export const queEsServicio = (nombre: string): string | null => SERVICIOS[nombre] ?? null;

/** Lo mínimo que la línea "para qué" necesita de un trabajo. */
export type TrabajoParaQue = {
  id: number;
  agente: string;
  proyecto: string | null;
  titulo: string;
  estado: string;
  fueraDeCola?: boolean;
};

/**
 * "Para qué" de un trabajo en curso, armado sólo con lo que ya trae el dato.
 * Sin proyecto no se nombra proyecto; nada se supone.
 */
export function paraQue(t: TrabajoParaQue, nombreAgente: string): string {
  const enProy = t.proyecto ? ` sobre ${t.proyecto}` : "";
  if (/^Encargo de V:/i.test(t.titulo)) {
    return `Cambio que pediste desde la Sala${enProy}; V lo redactó y ${nombreAgente} lo ejecuta.`;
  }
  if (t.fueraDeCola) {
    return `Agente lanzado a mano, fuera de la cola: ${nombreAgente} trabajando en la carpeta ${t.proyecto ?? "del servidor"}.`;
  }
  const num = t.id > 0 ? ` #${t.id}` : "";
  return t.estado === "en cola"
    ? `Trabajo${num} de la cola${enProy}, esperando turno para que lo tome ${nombreAgente}.`
    : `Trabajo${num} de la cola: ${nombreAgente} lo está haciendo${enProy}.`;
}
