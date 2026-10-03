const TIPO_RE = /^[a-z0-9][a-z0-9_.:-]{0,59}$/;
const ORIGEN_RE = /^[a-z0-9][a-z0-9_.-]{0,39}$/;
const PROYECTO_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}$/;
const DETALLE_MAX = 8000;

const TS_ISO = (col) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export class UnicornParamError extends Error {}

export const UNICORN_DDL = [
  `CREATE TABLE IF NOT EXISTS unicorn_eventos (
    id       bigserial PRIMARY KEY,
    proyecto text NOT NULL,
    tipo     text NOT NULL,
    titulo   text NOT NULL,
    detalle  jsonb NOT NULL DEFAULT '{}'::jsonb,
    origen   text,
    autor    text,
    ts       timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_unicorn_eventos_ts ON unicorn_eventos (ts, id)`,
  `CREATE INDEX IF NOT EXISTS idx_unicorn_eventos_proyecto ON unicorn_eventos (proyecto, ts DESC)`,
];

let ensured = false;

export function encodeCursor(c) {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export async function ensureUnicornTable(db) {
  if (ensured) return;
  for (const ddl of UNICORN_DDL) await db.query(ddl);
  ensured = true;
}

export function resetUnicornEnsureForTests() {
  ensured = false;
}

function optString(v, field, max = 200) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new UnicornParamError(`'${field}' debe ser texto.`);
  const s = v.trim();
  if (s.length > max) throw new UnicornParamError(`'${field}' excede ${max} caracteres.`);
  return s || null;
}

function reqProyecto(v, field = "proyecto") {
  const s = optString(v, field, 160);
  if (!s) throw new UnicornParamError(`Falta '${field}' (id del proyecto, p. ej. vforge).`);
  if (!PROYECTO_RE.test(s)) throw new UnicornParamError(`'${field}' no es un id de proyecto válido.`);
  return s;
}

export async function publishUnicornEvent(db, args, opts = {}) {
  const proyecto = reqProyecto(args.proyecto);
  const tipo = optString(args.tipo, "tipo", 60);
  if (!tipo || !TIPO_RE.test(tipo)) {
    throw new UnicornParamError("'tipo' es obligatorio: minusculas, numeros y _ . : - (p. ej. feature, valor, deploy, precio).");
  }
  const titulo = optString(args.titulo, "titulo", 200);
  if (!titulo) throw new UnicornParamError("Falta 'titulo' (1-200 caracteres).");
  const origen = optString(args.origen ?? opts.defaultOrigen, "origen", 40);
  if (origen && !ORIGEN_RE.test(origen)) throw new UnicornParamError("'origen' debe ser un slug (p. ej. vforge, momentum, mindcontext).");

  let detalle = {};
  if (args.detalle !== undefined && args.detalle !== null) {
    if (typeof args.detalle === "string") detalle = { texto: args.detalle };
    else if (typeof args.detalle === "object") detalle = args.detalle;
    else throw new UnicornParamError("'detalle' debe ser texto u objeto JSON.");
  }
  const detalleJson = JSON.stringify(detalle);
  if (detalleJson.length > DETALLE_MAX) throw new UnicornParamError(`'detalle' excede ${DETALLE_MAX} caracteres serializado.`);

  const existe = await db.query("SELECT id FROM projects WHERE id = $1 LIMIT 1", [proyecto]);
  if (existe.length === 0) {
    return { ok: false, error: `Proyecto '${proyecto}' no existe en VForge; no se publica un evento huerfano.` };
  }

  await ensureUnicornTable(db);
  const rows = await db.query(
    `INSERT INTO unicorn_eventos (proyecto, tipo, titulo, detalle, origen, autor)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id::text AS id, ${TS_ISO("ts")} AS ts_iso`,
    [proyecto, tipo, titulo, detalleJson, origen ?? "vforge", opts.autor ?? null],
  );
  const r = rows[0];
  if (!r) return { ok: false, error: "No se pudo registrar el evento." };
  return {
    ok: true,
    evento: {
      fuente: "unicorn",
      id: r.id,
      proyecto,
      tipo,
      titulo,
      detalle,
      origen: origen ?? "vforge",
      ts: r.ts_iso,
      cursor: encodeCursor({ t: r.ts_iso, k: `unicorn:${r.id}` }),
    },
  };
}
