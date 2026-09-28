/**
 * Estado real de un proyecto.
 *
 * El catálogo se llena sincronizando GitHub y Vercel, y ahí todo nace en
 * `en_revision` (el valor por defecto de la tabla). Medido el 28-sep-2026: de
 * 339 proyectos, 326 seguían en `en_revision`, así que filtrar por estado no
 * separaba nada.
 *
 * Regla: **lo que se clasificó a mano manda siempre**. Un proyecto se considera
 * clasificado a mano cuando tiene `category_manual_at` (lo estampa el PATCH de
 * /meta y la edición masiva). Si nadie lo tocó, el estado se CALCULA con
 * señales medibles — dominio que responde, deploy en Vercel, edad del último
 * push — y se marca como calculado para que en pantalla nunca se confunda con
 * una decisión de Luis. El cálculo nunca se escribe en `projects.category`.
 *
 * Módulo puro: no toca base ni red, así se puede probar con `npm test`.
 */

export const CATEGORIAS = [
  "produccion",
  "activo",
  "en_revision",
  "en_pausa",
  "archivo",
  "pendiente_borrado",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Una fecha puede llegar como texto (JSON de la API) o como `Date` (el driver de
 * Postgres devuelve `timestamptz` ya convertido). El cálculo acepta las dos.
 */
export type FechaEntrada = string | Date | null | undefined;

/** Señales medibles que entran al cálculo. Todo viene de la base, nada se adivina. */
export interface SenalesEstado {
  /** Categoría guardada en la tabla (por defecto `en_revision`). */
  category?: string | null;
  /** Fecha en que alguien la clasificó a mano. Si existe, gana. */
  category_manual_at?: FechaEntrada;
  domain?: string | null;
  vercel_url?: string | null;
  vercel_project_id?: string | null;
  /** Deploys en estado `ready` registrados en `project_deploys`. */
  deploys_ready?: number | null;
  /** Último sondeo HTTP del dominio (`project_health_checks`). */
  health_status?: number | null;
  health_ok?: boolean | null;
  health_checked_at?: FechaEntrada;
  /** `max(pushed_at)` de sus repositorios. */
  last_push?: FechaEntrada;
  github_repo?: string | null;
  repository_count?: number | null;
}

export type FuenteEstado = "manual" | "calculado";

export interface EstadoReal {
  estado: Categoria;
  fuente: FuenteEstado;
  /** Frase corta y medible que explica de dónde salió el estado. */
  motivo: string;
  /** true cuando hay dominio pero nunca se sondeó: el cálculo puede mejorar. */
  sondeo_pendiente: boolean;
}

const DIA_MS = 86_400_000;
/** Hasta 30 días desde el último push, el proyecto está vivo. */
export const DIAS_ACTIVO = 30;
/** Entre 31 y 90 días, está en pausa. Más allá, archivado. */
export const DIAS_PAUSA = 90;
/** Un sondeo de dominio vale 7 días; después se vuelve a medir. */
export const VIGENCIA_SONDEO_MS = 7 * DIA_MS;

function ms(value: FechaEntrada): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function esCategoria(value: string | null | undefined): value is Categoria {
  return Boolean(value) && (CATEGORIAS as readonly string[]).includes(value as string);
}

function dias(n: number): string {
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

const FMT_FECHA = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Cancun",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fechaCorta(t: number): string {
  return FMT_FECHA.format(new Date(t));
}

/** ¿Hay algo desplegado en Vercel? Proyecto ligado, URL o un deploy `ready`. */
export function hayDeployVercel(s: SenalesEstado): boolean {
  return Boolean(
    texto(s.vercel_project_id) || texto(s.vercel_url) || (s.deploys_ready ?? 0) > 0,
  );
}

/** ¿El dominio respondió 2xx en un sondeo vigente? */
export function dominioVivo(s: SenalesEstado, ahora: number): boolean {
  if (!texto(s.domain)) return false;
  const checked = ms(s.health_checked_at);
  if (checked === null || ahora - checked > VIGENCIA_SONDEO_MS) return false;
  const status = s.health_status ?? 0;
  return s.health_ok === true && status >= 200 && status < 300;
}

function tieneRepo(s: SenalesEstado): boolean {
  return Boolean(texto(s.github_repo)) || (s.repository_count ?? 0) > 0;
}

/**
 * Estado calculado con las señales. Sin base, sin red: sólo aritmética sobre
 * lo que ya se midió. Devuelve también el motivo que se enseña en la tarjeta.
 */
export function estadoCalculado(
  s: SenalesEstado,
  ahora: number = Date.now(),
): { estado: Categoria; motivo: string; sondeo_pendiente: boolean } {
  const conDominio = Boolean(texto(s.domain));
  const sondeo = ms(s.health_checked_at);
  const sondeoVigente = sondeo !== null && ahora - sondeo <= VIGENCIA_SONDEO_MS;
  const sondeo_pendiente = conDominio && !sondeoVigente;
  const vivo = dominioVivo(s, ahora);
  const enVercel = hayDeployVercel(s);

  if (vivo && enVercel) {
    return {
      estado: "produccion",
      motivo: `${texto(s.domain)} responde ${s.health_status} y hay deploy en Vercel`,
      sondeo_pendiente: false,
    };
  }

  const push = ms(s.last_push);
  const nota = sondeo_pendiente ? " · dominio sin sondear" : "";

  if (push === null) {
    return {
      estado: "archivo",
      motivo: tieneRepo(s) ? `repo sin push registrado${nota}` : `sin repositorio${nota}`,
      sondeo_pendiente,
    };
  }

  const edad = Math.floor(Math.max(0, ahora - push) / DIA_MS);
  if (edad <= DIAS_ACTIVO) {
    return { estado: "activo", motivo: `push ${dias(edad)}${nota}`, sondeo_pendiente };
  }
  if (edad <= DIAS_PAUSA) {
    return { estado: "en_pausa", motivo: `sin push ${dias(edad)}${nota}`, sondeo_pendiente };
  }
  return { estado: "archivo", motivo: `sin push ${dias(edad)}${nota}`, sondeo_pendiente };
}

/**
 * Estado que manda en la pantalla y en los filtros: el de Luis si existe, el
 * calculado si nadie lo clasificó.
 */
export function estadoReal(s: SenalesEstado, ahora: number = Date.now()): EstadoReal {
  const manual = ms(s.category_manual_at);
  if (manual !== null && esCategoria(s.category)) {
    return {
      estado: s.category,
      fuente: "manual",
      motivo: `clasificado a mano el ${fechaCorta(manual)}`,
      sondeo_pendiente: false,
    };
  }
  const calc = estadoCalculado(s, ahora);
  return { ...calc, fuente: "calculado" };
}
