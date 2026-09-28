/**
 * Sugerencias de cliente, montos y fechas — propuesta con fuente, nunca invento.
 *
 * Medido el 28-sep-2026: de 339 proyectos, 0 tenían cliente y 0 tenían fecha de
 * entrega, así que filtrar por cliente o por entrega no separaba nada. El dato
 * SÍ existe, pero vive en otras tablas de la misma base:
 *
 *   · `client_project_status` (17 filas) — cliente, total y pagado por proyecto.
 *   · `contracts` + `contract_payments` (5 y 15 filas) — contrato firmado, monto
 *     y la suma de parcialidades pagadas.
 *
 * Este módulo lee esas fuentes, empareja con el catálogo SIN adivinar (id exacto
 * o dominio exacto) y deja una sugerencia por campo con su fuente a la vista.
 * Luis confirma desde la pantalla; hasta entonces `projects` no cambia.
 *
 * Fecha de entrega: revisadas las fuentes, ninguna guarda una fecha de entrega
 * comprometida (`next_milestone` es texto libre del tipo "$4,000 el lunes" y las
 * fechas de `contracts` son de envío/firma, no de entrega). Por eso NO se
 * propone `due_date`: sin fuente, se queda vacío.
 */

export const CAMPOS_SUGERIBLES = ["client_name", "contract_amount", "paid_amount"] as const;
export type CampoSugerible = (typeof CAMPOS_SUGERIBLES)[number];

export interface FilaEstadoCliente {
  project_id: string;
  client_name: string | null;
  status: string | null;
  total_mxn: string | number | null;
  paid_mxn: string | number | null;
  next_milestone?: string | null;
}

export interface FilaContrato {
  id: string;
  project_id: string | null;
  client_name: string | null;
  amount_mxn: string | number | null;
  status: string | null;
  signed_at?: string | null;
  pagado: string | number | null;
}

/** Lo que hace falta de cada proyecto para emparejar y para no pisar lo que ya tiene. */
export interface DestinoSugerencia {
  id: string;
  name?: string | null;
  domain?: string | null;
  client_name?: string | null;
  contract_amount?: number | null;
  paid_amount?: number | null;
}

export interface Sugerencia {
  project_id: string;
  campo: CampoSugerible;
  valor: string;
  /** Tabla y fila de donde salió, tal como se enseña en pantalla. */
  fuente: string;
  /** Contexto extra: empatado por dominio, otra fuente decía otra cosa, etc. */
  detalle: string | null;
}

function texto(v: unknown): string | null {
  const t = typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim();
  return t ? t : null;
}

function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** `castores.info` → `castores.info`; quita protocolo, www, puerto y ruta. */
export function normalizaDominio(v: string | null | undefined): string | null {
  const t = (v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
  return t.includes(".") ? t : null;
}

/**
 * El cliente viene escrito como "APSUS (apsus.live)": el paréntesis es el
 * dominio, que sirve para emparejar. Devuelve nombre limpio y dominio.
 */
export function parteCliente(raw: string | null | undefined): {
  nombre: string | null;
  dominio: string | null;
} {
  const t = texto(raw);
  if (!t) return { nombre: null, dominio: null };
  const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*(.*)$/);
  if (!m) return { nombre: t, dominio: null };
  const dentro = normalizaDominio(m[2]);
  const nombre = texto(`${m[1]} ${m[3]}`.replace(/\s+/g, " ")) ?? t;
  return dentro ? { nombre, dominio: dentro } : { nombre: t, dominio: null };
}

/**
 * Empareja una fila de fuente con un proyecto del catálogo. Sólo dos caminos, y
 * los dos exactos: el id del proyecto, o un dominio que sólo pertenece a un
 * proyecto. Si el dominio está en dos, no se sugiere nada (mejor vacío que mal).
 */
export function emparejar(
  destinos: DestinoSugerencia[],
  projectId: string | null | undefined,
  dominio: string | null | undefined,
): { destino: DestinoSugerencia; como: "id" | "dominio" } | null {
  const pid = texto(projectId)?.toLowerCase();
  if (pid) {
    const porId = destinos.find((d) => d.id.toLowerCase() === pid);
    if (porId) return { destino: porId, como: "id" };
  }
  const dom = normalizaDominio(dominio);
  if (dom) {
    const porDominio = destinos.filter((d) => normalizaDominio(d.domain) === dom);
    if (porDominio.length === 1) return { destino: porDominio[0], como: "dominio" };
  }
  return null;
}

/**
 * Peso de la fuente cuando dos dicen cosas distintas:
 *   contrato FIRMADO > tabla de operación (`client_project_status`) > contrato
 *   en borrador o enviado (es una cotización, todavía no un acuerdo).
 * La que pierde no se borra: queda escrita en el detalle de la que gana.
 */
function peso(fuente: "contrato_firmado" | "contrato" | "estado_cliente"): number {
  return fuente === "contrato_firmado" ? 3 : fuente === "estado_cliente" ? 2 : 1;
}

interface Candidata extends Sugerencia {
  _peso: number;
}

const FMT = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Cancun",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fecha(v: string | null | undefined): string | null {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? FMT.format(new Date(t)) : null;
}

/**
 * Arma las sugerencias. Puro: recibe las filas ya leídas y devuelve la
 * propuesta. Sólo propone donde el proyecto tiene el campo VACÍO: nunca pisa un
 * dato que ya está capturado.
 */
export function calcularSugerencias(
  destinos: DestinoSugerencia[],
  estados: FilaEstadoCliente[],
  contratos: FilaContrato[],
): { sugerencias: Sugerencia[]; sin_emparejar: Array<{ fuente: string; referencia: string }> } {
  const mejores = new Map<string, Candidata>();
  const sinEmparejar: Array<{ fuente: string; referencia: string }> = [];

  const proponer = (c: Candidata) => {
    const k = `${c.project_id}|${c.campo}`;
    const previa = mejores.get(k);
    if (!previa) {
      mejores.set(k, c);
      return;
    }
    const gana = c._peso > previa._peso;
    const queda = gana ? c : previa;
    const otra = gana ? previa : c;
    // Si dos fuentes reales no coinciden, la ganadora lo dice en su detalle:
    // el dato se confirma con los ojos abiertos.
    const nota =
      otra.valor !== queda.valor ? `otra fuente dice ${otra.valor} (${otra.fuente})` : null;
    mejores.set(k, {
      ...queda,
      detalle: [queda.detalle, nota].filter(Boolean).join(" · ") || null,
    });
  };

  for (const fila of estados) {
    const cli = parteCliente(fila.client_name);
    const par = emparejar(destinos, fila.project_id, cli.dominio);
    if (!par) {
      sinEmparejar.push({
        fuente: "client_project_status",
        referencia: fila.project_id ?? fila.client_name ?? "—",
      });
      continue;
    }
    const fuente = `client_project_status · ${fila.project_id}`;
    const detalle = [
      par.como === "dominio" ? `empatado por dominio ${cli.dominio}` : null,
      texto(fila.status) ? `estado en la fuente: ${texto(fila.status)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (cli.nombre && !texto(par.destino.client_name)) {
      proponer({
        project_id: par.destino.id,
        campo: "client_name",
        valor: cli.nombre,
        fuente,
        detalle: detalle || null,
        _peso: peso("estado_cliente"),
      });
    }
    const total = numero(fila.total_mxn);
    if (total !== null && par.destino.contract_amount === null) {
      proponer({
        project_id: par.destino.id,
        campo: "contract_amount",
        valor: String(total),
        fuente,
        detalle: detalle || null,
        _peso: peso("estado_cliente"),
      });
    }
    const pagado = numero(fila.paid_mxn);
    if (pagado !== null && par.destino.paid_amount === null) {
      proponer({
        project_id: par.destino.id,
        campo: "paid_amount",
        valor: String(pagado),
        fuente,
        detalle: detalle || null,
        _peso: peso("estado_cliente"),
      });
    }
  }

  for (const c of contratos) {
    const cli = parteCliente(c.client_name);
    const par = emparejar(destinos, c.project_id, cli.dominio);
    if (!par) {
      sinEmparejar.push({ fuente: "contracts", referencia: c.project_id ?? c.id });
      continue;
    }
    const firmado = texto(c.status) === "signed";
    const w = peso(firmado ? "contrato_firmado" : "contrato");
    const cuando = fecha(c.signed_at);
    const fuente = `contracts · ${texto(c.status) ?? "sin estado"}${cuando ? ` ${cuando}` : ""}`;
    const detalle = par.como === "dominio" ? `empatado por dominio ${cli.dominio}` : null;

    if (cli.nombre && !texto(par.destino.client_name)) {
      proponer({
        project_id: par.destino.id,
        campo: "client_name",
        valor: cli.nombre,
        fuente,
        detalle,
        _peso: w,
      });
    }
    const monto = numero(c.amount_mxn);
    if (monto !== null && par.destino.contract_amount === null) {
      proponer({
        project_id: par.destino.id,
        campo: "contract_amount",
        valor: String(monto),
        fuente,
        detalle,
        _peso: w,
      });
    }
    const pagado = numero(c.pagado);
    if (pagado !== null && par.destino.paid_amount === null) {
      proponer({
        project_id: par.destino.id,
        campo: "paid_amount",
        valor: String(pagado),
        fuente: `${fuente} · parcialidades pagadas`,
        detalle,
        _peso: w,
      });
    }
  }

  const sugerencias: Sugerencia[] = [...mejores.values()]
    .map((c) => ({
      project_id: c.project_id,
      campo: c.campo,
      valor: c.valor,
      fuente: c.fuente,
      detalle: c.detalle,
    }))
    .sort((a, b) => a.project_id.localeCompare(b.project_id) || a.campo.localeCompare(b.campo));

  return { sugerencias, sin_emparejar: sinEmparejar };
}

/** Etiqueta en español de cada campo, para la pantalla y para la auditoría. */
export const ETIQUETA_CAMPO: Record<CampoSugerible, string> = {
  client_name: "Cliente",
  contract_amount: "Monto del contrato",
  paid_amount: "Cobrado",
};
