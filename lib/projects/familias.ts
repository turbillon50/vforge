/**
 * Familias de proyectos.
 *
 * Una app de Luis vive partida en varios registros del catálogo porque cada
 * repo y cada proyecto de Vercel entra como proyecto aparte (medido 28-sep:
 * `vliving` aparece 14 veces — `vliving-2026`, `vliving-admin`, `vliving-rentas`,
 * `vliving-vindex`, `vliving-estudio-merge`…). Agrupar por familia es lo que
 * hace que la lista se pueda leer.
 *
 * Orden de las señales, de la más confiable a la más débil:
 *   1. `family_code` puesto a mano → familia explícita.
 *   2. dominio (la raíz registrable: `admin.vliving.site` → `vliving`).
 *   3. nombre del repositorio, sin dueño y sin sufijos de trabajo.
 *   4. nombre / id del proyecto, con el mismo recorte.
 *
 * Reglas para no inventar familias: una raíz genérica (`app`, `demo`, `admin`…)
 * o de menos de 3 letras nunca agrupa, y un grupo con un solo miembro no es
 * familia: se pinta como proyecto suelto.
 *
 * Módulo puro: sin base ni red, probado en `npm test`.
 */

export interface ProyectoFamilia {
  id: string;
  name?: string | null;
  github_repo?: string | null;
  domain?: string | null;
  family_code?: string | null;
}

export type SenalFamilia = "codigo" | "dominio" | "repo" | "nombre" | "solo";

export interface ClaveFamilia {
  /** Clave de agrupado. Los `solo:*` nunca se juntan con nadie. */
  clave: string;
  /**
   * Raíz común, sin guiones: es la cubeta real. Así `ruta618` (por dominio) y
   * `ruta-618` (por repo) caen en la misma familia.
   */
  raiz: string;
  /** Etiqueta corta de la familia (lo que se lee en la fila). */
  etiqueta: string;
  senal: SenalFamilia;
  /** Por qué se agrupó, en palabras. */
  motivo: string;
}

export interface Familia<T extends ProyectoFamilia> {
  clave: string;
  etiqueta: string;
  senal: SenalFamilia;
  motivo: string;
  /** true cuando son 2 o más y de verdad se agruparon. */
  agrupada: boolean;
  miembros: T[];
}

/**
 * Palabras que describen una PARTE de una app, no la app. Se recortan del final
 * del nombre para encontrar la raíz común.
 */
const SUFIJOS = new Set([
  "admin",
  "administrador",
  "api",
  "app",
  "apps",
  "back",
  "backend",
  "clean",
  "cliente",
  "copia",
  "copy",
  "demo",
  "dev",
  "estudio",
  "final",
  "fix",
  "front",
  "frontend",
  "landing",
  "merge",
  "new",
  "next",
  "nextjs",
  "nuevo",
  "old",
  "panel",
  "plataforma",
  "preview",
  "prod",
  "proyecto",
  "pwa",
  "qa",
  "server",
  "site",
  "sitio",
  "store",
  "test",
  "tests",
  "ui",
  "web",
  "www",
]);

/** Prefijos que ponen las herramientas (v0, bolt…) y no dicen nada de la app. */
const PREFIJOS = new Set(["v0", "final", "nuevo", "new", "copia", "copy", "demo", "mi", "the"]);

/** Raíces demasiado generales para agrupar nada. */
const GENERICAS = new Set([
  ...SUFIJOS,
  "proyectos",
  "vercel",
  "github",
  "template",
  "plantilla",
  "starter",
  "boilerplate",
  "main",
  "master",
  "repo",
  "code",
  "lab",
]);

/** Sufijos de dominio de dos niveles: `algo.com.mx` → la raíz es `algo`. */
const TLD_DOBLE = new Set([
  "com.mx",
  "org.mx",
  "net.mx",
  "gob.mx",
  "com.ar",
  "com.br",
  "com.co",
  "co.uk",
  "com.es",
  "com.pe",
]);

function sinAcentos(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function trozos(value: string): string[] {
  return sinAcentos(value.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean);
}

/**
 * Basura de máquina: `a57c166`, `2026`, `v3`. Ojo: un número puede ser parte de
 * la marca (`ruta-618`), así que sólo se tira lo que parece año o versión.
 */
function esRuido(t: string): boolean {
  if (/^v\d+$/.test(t)) return true;
  if (/^(19|20)\d{2}$/.test(t)) return true;
  if (/^[0-9a-f]{6,}$/.test(t) && /\d/.test(t) && /[a-f]/.test(t)) return true;
  return false;
}

/**
 * Raíz de un nombre: recorta prefijos de herramienta, sufijos de parte y ruido
 * de máquina. `vliving-estudio-clean-a57c166` → `vliving`.
 */
export function raizNombre(value: string | null | undefined): string | null {
  const partes = trozos(value ?? "");
  while (partes.length > 1 && (PREFIJOS.has(partes[0]) || esRuido(partes[0]))) partes.shift();
  while (partes.length > 1) {
    const ultimo = partes[partes.length - 1];
    if (SUFIJOS.has(ultimo) || esRuido(ultimo)) partes.pop();
    else break;
  }
  const raiz = partes.join("-");
  if (!raiz || raiz.length < 3) return null;
  if (GENERICAS.has(raiz)) return null;
  return raiz;
}

/**
 * Raíz de un dominio.
 *
 * `admin.vliving.site` → `vliving`: el subdominio es una PARTE de la app.
 * `ehecatl.vmomentum.site` → `ehecatl`: un subdominio con nombre propio es OTRA
 * app hospedada en el mismo dominio (medido: ehecatl, lsm, valores y protrack
 * viven bajo vmomentum.site y vforge.site y no son la misma app).
 */
export function raizDominio(value: string | null | undefined): string | null {
  const limpio = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!limpio || !limpio.includes(".")) return null;
  const partes = limpio.split(".").filter(Boolean);
  if (partes.length < 2) return null;

  const tld = TLD_DOBLE.has(partes.slice(-2).join(".")) ? 2 : 1;
  const etiquetas = partes.slice(0, partes.length - tld);
  const registrable = etiquetas[etiquetas.length - 1];
  if (!registrable) return null;
  // `vercel.app` no identifica a nadie: la raíz útil es el nombre del proyecto.
  if (registrable === "vercel" || registrable === "netlify" || registrable === "github") return null;

  // Del subdominio, la etiqueta más pegada al dominio que NO sea una parte
  // (`www`, `admin`, `app`, `api`…). Si todas son partes, manda el registrable.
  for (const sub of etiquetas.slice(0, -1).reverse()) {
    if (sub === "www" || SUFIJOS.has(sub) || esRuido(sub)) continue;
    const raiz = raizNombre(sub);
    if (raiz) return raiz;
  }
  return raizNombre(registrable);
}

/** Nombre del repo sin el dueño: `turbillon50/vliving-admin` → `vliving-admin`. */
function repoSolo(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const parte = t.includes("/") ? t.slice(t.indexOf("/") + 1) : t;
  return parte || null;
}

function bonito(raiz: string): string {
  return raiz
    .split("-")
    .map((p) => (p.length > 2 ? p[0].toUpperCase() + p.slice(1) : p.toUpperCase()))
    .join(" ");
}

/** Sin guiones: es la forma con la que se compara una raíz con otra. */
function compacta(raiz: string): string {
  return raiz.replace(/-/g, "");
}

/** Clave de familia de UN proyecto, con la señal que la produjo. */
export function claveFamilia(p: ProyectoFamilia): ClaveFamilia {
  const codigo = p.family_code?.trim().toLowerCase();
  if (codigo) {
    return {
      clave: `codigo:${codigo}`,
      raiz: compacta(codigo),
      etiqueta: bonito(codigo),
      senal: "codigo",
      motivo: `código de familia "${codigo}"`,
    };
  }

  const porDominio = raizDominio(p.domain);
  if (porDominio) {
    return {
      clave: `dominio:${porDominio}`,
      raiz: compacta(porDominio),
      etiqueta: bonito(porDominio),
      senal: "dominio",
      motivo: `mismo dominio raíz "${porDominio}"`,
    };
  }

  const porRepo = raizNombre(repoSolo(p.github_repo));
  if (porRepo) {
    return {
      clave: `repo:${porRepo}`,
      raiz: compacta(porRepo),
      etiqueta: bonito(porRepo),
      senal: "repo",
      motivo: `repos que empiezan con "${porRepo}"`,
    };
  }

  const porNombre = raizNombre(p.name || p.id);
  if (porNombre) {
    return {
      clave: `nombre:${porNombre}`,
      raiz: compacta(porNombre),
      etiqueta: bonito(porNombre),
      senal: "nombre",
      motivo: `nombres que empiezan con "${porNombre}"`,
    };
  }

  return {
    clave: `solo:${p.id}`,
    raiz: `solo:${p.id}`,
    etiqueta: p.name || p.id,
    senal: "solo",
    motivo: "sin familia",
  };
}

/**
 * Agrupa una lista respetando su orden: la familia aparece donde aparecía su
 * primer miembro, así el orden que eligió el usuario se sigue viendo.
 *
 * Todas las señales caen en la misma cubeta cuando comparten raíz: el problema
 * que reportó Luis es justo que una app aparece partida en muchos proyectos, y
 * la raíz (`vliving`, `castores`, `ruta618`) es lo que los reúne, venga del
 * código, del dominio o del nombre del repo. La etiqueta y el motivo los pone la
 * señal más fuerte de la familia.
 */
export function agruparFamilias<T extends ProyectoFamilia>(lista: T[]): Familia<T>[] {
  const fuerza: Record<SenalFamilia, number> = {
    codigo: 4,
    dominio: 3,
    repo: 2,
    nombre: 1,
    solo: 0,
  };

  const orden: string[] = [];
  const mapa = new Map<string, { claves: ClaveFamilia[]; miembros: T[] }>();

  for (const p of lista) {
    const c = claveFamilia(p);
    const k = `raiz:${c.raiz}`;
    const actual = mapa.get(k);
    if (actual) {
      actual.claves.push(c);
      actual.miembros.push(p);
    } else {
      mapa.set(k, { claves: [c], miembros: [p] });
      orden.push(k);
    }
  }

  return orden.map((k) => {
    const { claves, miembros } = mapa.get(k)!;
    const manda = claves.reduce((a, b) => (fuerza[b.senal] > fuerza[a.senal] ? b : a), claves[0]);
    const agrupada = miembros.length > 1 && manda.senal !== "solo";
    return {
      clave: k,
      etiqueta: agrupada ? manda.etiqueta : miembros[0].name || miembros[0].id,
      senal: manda.senal,
      motivo: manda.motivo,
      agrupada,
      miembros,
    };
  });
}

/**
 * ¿Este proyecto comparte familia con otro? Una sola función para la pastilla
 * de la fila y para el filtro "Familia / duplicados", para que nunca se
 * contradigan.
 */
export function mapaFamilias<T extends ProyectoFamilia>(lista: T[]): Map<string, Familia<T>> {
  const out = new Map<string, Familia<T>>();
  for (const fam of agruparFamilias(lista)) {
    for (const m of fam.miembros) out.set(m.id, fam);
  }
  return out;
}
