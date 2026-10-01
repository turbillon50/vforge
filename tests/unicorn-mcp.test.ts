import test from "node:test";
import assert from "node:assert/strict";
import { ANON_PRINCIPAL, TOOL_KIND, canCallTool, toolsVisibleFor, type McpPrincipal } from "../lib/mcp/rbac";
import { MCP_TOOLS } from "../lib/mcp/registry";
import {
  UNICORN_TOOLS,
  __resetUnicornEnsure,
  decodeCursor,
  encodeCursor,
  runUnicornTool,
  type UnicornDb,
  type UnicornDbs,
} from "../lib/mcp/unicorn";

const OWNER: McpPrincipal = { userId: "user_owner", scope: "admin", orgId: null };
const CLIENT: McpPrincipal = { userId: "user_client", scope: "client", orgId: "user_client" };

/* ---------------------------- doble de base ---------------------------- */

interface FakeEvento {
  clave: string;
  ref: string;
  project_id: string | null;
  tipo: string;
  titulo: string;
  detalle: unknown;
  origen: string | null;
  severidad: string | null;
  ts_iso: string;
}

interface FakeOpts {
  projects?: Array<Record<string, unknown>>;
  fuentes?: Record<string, FakeEvento[]>;
  rotas?: string[];
}

/** Base en memoria que entiende sólo las consultas de unicorn.ts. Aplica el
 *  cursor (ts, clave) y el orden ASC/DESC como lo haría Postgres con COLLATE "C". */
function fakeDb(opts: FakeOpts = {}) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const inserted: unknown[][] = [];
  const projects = opts.projects ?? [];
  const tablaDe: Record<string, string> = {
    unicorn: "FROM unicorn_eventos",
    auditoria: "FROM audit_events",
    actividad: "FROM v_project_activity",
    salud: "FROM project_events",
  };
  const db: UnicornDb = {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      calls.push({ sql, params });
      if (/^\s*CREATE/.test(sql)) return [];
      if (sql.includes("INSERT INTO unicorn_eventos")) {
        inserted.push(params);
        return [{ id: String(inserted.length), ts_iso: "2026-09-30T12:00:00.123456Z" }] as T[];
      }
      if (sql.includes("SELECT id FROM projects")) {
        return projects.filter((p) => p.id === params[0]).map((p) => ({ id: p.id })) as T[];
      }
      if (sql.includes("to_jsonb(p)")) {
        if (sql.includes("WHERE p.id = $1")) return projects.filter((p) => p.id === params[0]).map((p) => ({ p })) as T[];
        return projects.map((p) => ({ p })) as T[];
      }
      if (sql.includes("FROM project_repositories")) return [] as T[];
      if (sql.includes("GROUP BY category, status")) return [] as T[];
      if (sql.includes("count(*)::int AS n FROM unicorn_eventos")) return [{ n: inserted.length }] as T[];
      for (const [fuente, marca] of Object.entries(tablaDe)) {
        if (!sql.includes(marca)) continue;
        if (opts.rotas?.includes(fuente)) throw new Error(`relation "${fuente}" does not exist`);
        const [t, k, proyecto, limit] = params as [string | null, string, string | null, number];
        const cmp = (a: FakeEvento, b: { ts_iso: string; clave: string }) =>
          a.ts_iso !== b.ts_iso ? (a.ts_iso < b.ts_iso ? -1 : 1) : a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0;
        let rows = (opts.fuentes?.[fuente] ?? []).filter(
          (e) => (t === null || cmp(e, { ts_iso: t, clave: k }) > 0) && (proyecto === null || e.project_id === proyecto),
        );
        rows = rows.sort((a, b) => cmp(a, b));
        if (sql.includes("DESC")) rows.reverse();
        return rows.slice(0, limit) as unknown as T[];
      }
      throw new Error("consulta no esperada en el doble: " + sql.slice(0, 80));
    },
  };
  return { db, calls, inserted };
}

function ev(fuente: string, id: string, ts: string, proyecto = "vforge", tipo = "feature"): FakeEvento {
  return {
    clave: `${fuente}:${id}`,
    ref: id,
    project_id: proyecto,
    tipo,
    titulo: `${fuente} ${id}`,
    detalle: { n: id },
    origen: "vforge",
    severidad: null,
    ts_iso: ts,
  };
}

function parse(r: { content: Array<{ text: string }>; isError?: boolean }) {
  assert.notEqual(r.isError, true, r.content[0]?.text);
  return JSON.parse(r.content[0].text);
}

/* -------------------------------- RBAC -------------------------------- */

test("unicorn: todas registradas, clasificadas como data y solo Owner puede llamarlas", () => {
  for (const name of UNICORN_TOOLS) {
    assert.ok(MCP_TOOLS.some((t) => t.name === name), `${name} falta en registry`);
    assert.equal(TOOL_KIND[name], "data");
    assert.equal(canCallTool(OWNER, name), true);
    assert.equal(canCallTool(CLIENT, name), false);
    assert.equal(canCallTool(ANON_PRINCIPAL, name), false);
  }
});

test("tools/list: client y public nunca ven unicorn; owner sí", () => {
  const nombres = (p: McpPrincipal) => toolsVisibleFor(p, MCP_TOOLS).map((t) => t.name);
  for (const name of UNICORN_TOOLS) {
    assert.ok(nombres(OWNER).includes(name));
    assert.ok(!nombres(CLIENT).includes(name));
    assert.ok(!nombres(ANON_PRINCIPAL).includes(name));
  }
  assert.deepEqual(nombres(ANON_PRINCIPAL).sort(), ["getting_started", "help", "vforge_method"]);
});

test("runUnicornTool revalida scope: client y public reciben 401 sin tocar la base", async () => {
  for (const p of [CLIENT, ANON_PRINCIPAL]) {
    const { db, calls } = fakeDb();
    const r = await runUnicornTool("unicorn_proyectos", {}, p, { app: db });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /^401/);
    assert.equal(calls.length, 0);
  }
});

/* ---------------------------- validación ---------------------------- */

test("publicar: valida parámetros antes de escribir", async () => {
  const { db, inserted } = fakeDb({ projects: [{ id: "vforge", name: "VForge" }] });
  const dbs: UnicornDbs = { app: db };
  const casos: Array<[Record<string, unknown>, RegExp]> = [
    [{ tipo: "feature", titulo: "x" }, /Falta 'proyecto'/],
    [{ proyecto: "vforge", titulo: "x" }, /'tipo' es obligatorio/],
    [{ proyecto: "vforge", tipo: "Feature Nueva", titulo: "x" }, /'tipo' es obligatorio/],
    [{ proyecto: "vforge", tipo: "feature" }, /Falta 'titulo'/],
    [{ proyecto: "vforge", tipo: "feature", titulo: "x".repeat(201) }, /excede 200/],
    [{ proyecto: "vforge", tipo: "feature", titulo: "x", origen: "Momentum App" }, /'origen'/],
    [{ proyecto: "vforge", tipo: "feature", titulo: "x", detalle: { big: "y".repeat(9000) } }, /excede 8000/],
    [{ proyecto: "vforge", tipo: "feature", titulo: "x", detalle: 42 }, /texto u objeto/],
    [{ proyecto: "drop table;", tipo: "feature", titulo: "x" }, /id de proyecto válido/],
  ];
  for (const [args, re] of casos) {
    const r = await runUnicornTool("unicorn_publicar_evento", args, OWNER, dbs);
    assert.equal(r.isError, true, JSON.stringify(args));
    assert.match(r.content[0].text, re);
  }
  const huerfano = await runUnicornTool("unicorn_publicar_evento", { proyecto: "no-existe", tipo: "feature", titulo: "x" }, OWNER, dbs);
  assert.equal(huerfano.isError, true);
  assert.match(huerfano.content[0].text, /no existe/);
  assert.equal(inserted.length, 0);
});

test("publicar: inserta con autor del token y devuelve cursor del evento", async () => {
  __resetUnicornEnsure();
  const { db, inserted, calls } = fakeDb({ projects: [{ id: "vforge", name: "VForge" }] });
  const out = parse(
    await runUnicornTool(
      "unicorn_publicar_evento",
      { proyecto: "vforge", tipo: "feature", titulo: "Nuevo tablero", detalle: "visible en Momentum", origen: "vforge" },
      OWNER,
      { app: db },
    ),
  );
  assert.equal(out.ok, true);
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0], ["vforge", "feature", "Nuevo tablero", JSON.stringify({ texto: "visible en Momentum" }), "vforge", "user_owner"]);
  assert.ok(calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS unicorn_eventos")));
  assert.deepEqual(decodeCursor(out.evento.cursor), { t: "2026-09-30T12:00:00.123456Z", k: "unicorn:1" });
});

test("eventos: cursor inválido, cursor+desde y fuentes desconocidas se rechazan", async () => {
  const { db } = fakeDb();
  const dbs: UnicornDbs = { app: db, nervous: db };
  const bad = await runUnicornTool("unicorn_eventos", { cursor: "no-es-cursor" }, OWNER, dbs);
  assert.match(bad.content[0].text, /'cursor' inválido/);
  const both = await runUnicornTool(
    "unicorn_eventos",
    { cursor: encodeCursor({ t: "2026-09-30T00:00:00.000000Z", k: "" }), desde: "2026-09-29" },
    OWNER,
    dbs,
  );
  assert.match(both.content[0].text, /no ambos/);
  const fu = await runUnicornTool("unicorn_eventos", { fuentes: ["unicorn", "slack"] }, OWNER, dbs);
  assert.match(fu.content[0].text, /desconocidas: slack/);
  const desde = await runUnicornTool("unicorn_eventos", { desde: "ayer" }, OWNER, dbs);
  assert.match(desde.content[0].text, /fecha ISO/);
});

test("proyectos: filtros validados y nunca expone org_id ni montos", async () => {
  const { db } = fakeDb({
    projects: [
      { id: "vforge", name: "VForge", category: "produccion", status: "live", vercel_url: "https://vforge.site", org_id: "x", contract_amount: 1000, paid_amount: 10, github_repo: "turbillon50/vforge" },
    ],
  });
  const bad = await runUnicornTool("unicorn_proyectos", { categoria: "viva" }, OWNER, { app: db });
  assert.match(bad.content[0].text, /'categoria' debe ser/);
  const out = parse(await runUnicornTool("unicorn_proyectos", {}, OWNER, { app: db }));
  assert.equal(out.total, 1);
  const p = out.proyectos[0];
  assert.equal(p.vercel_url, "https://vforge.site");
  assert.equal("org_id" in p, false);
  assert.equal("contract_amount" in p, false);
  assert.equal("paid_amount" in p, false);
  assert.deepEqual(p.repos, [{ repo_full_name: "turbillon50/vforge", role: "app", is_primary: true }]);
});

/* ------------------------------ polling ------------------------------ */

test("eventos: polling con cursor recorre todas las fuentes sin perder ni duplicar (empates de ts)", async () => {
  const T1 = "2026-09-30T10:00:00.000001Z";
  const T2 = "2026-09-30T10:00:00.000002Z";
  const { db } = fakeDb({
    fuentes: {
      unicorn: [ev("unicorn", "1", T1), ev("unicorn", "2", T2)],
      auditoria: [ev("auditoria", "a", T1), ev("auditoria", "b", "2026-09-30T11:00:00.000000Z")],
      actividad: [ev("actividad", "9", T2)],
      salud: [ev("salud", "s1", "2026-09-30T09:00:00.000000Z")],
    },
  });
  const dbs: UnicornDbs = { app: db, nervous: db };
  const vistos: string[] = [];
  let cursor = encodeCursor({ t: "2026-09-01T00:00:00.000000Z", k: "" });
  for (let i = 0; i < 10; i++) {
    const out = parse(await runUnicornTool("unicorn_eventos", { cursor, limit: 2 }, OWNER, dbs));
    for (const e of out.eventos) vistos.push(`${e.fuente}:${e.id}`);
    cursor = out.cursor;
    if (!out.hay_mas) break;
  }
  assert.deepEqual(vistos, [
    "salud:s1",
    "auditoria:a",
    "unicorn:1",
    "actividad:9",
    "unicorn:2",
    "auditoria:b",
  ]);
  // Polling sin novedades: lista vacía y el cursor no se mueve.
  const quieto = parse(await runUnicornTool("unicorn_eventos", { cursor, limit: 2 }, OWNER, dbs));
  assert.equal(quieto.eventos.length, 0);
  assert.equal(quieto.cursor, cursor);
});

test("eventos sin cursor: los N más recientes en orden ascendente + cursor del último", async () => {
  const { db } = fakeDb({
    fuentes: {
      unicorn: [ev("unicorn", "1", "2026-09-30T01:00:00.000000Z"), ev("unicorn", "2", "2026-09-30T03:00:00.000000Z")],
      auditoria: [ev("auditoria", "a", "2026-09-30T02:00:00.000000Z")],
    },
  });
  const out = parse(await runUnicornTool("unicorn_eventos", { limit: 2 }, OWNER, { app: db, nervous: db }));
  assert.deepEqual(out.eventos.map((e: { id: string }) => e.id), ["a", "2"]);
  assert.equal(out.hay_mas, true);
  assert.deepEqual(decodeCursor(out.cursor), { t: "2026-09-30T03:00:00.000000Z", k: "unicorn:2" });
});

test("eventos: fuente caída o sin base se declara, no tumba la respuesta; detalle de secretos se omite", async () => {
  const secreto = { ...ev("auditoria", "z", "2026-09-30T05:00:00.000000Z", "vforge", "vault.secret.rotate"), detalle: { value: "sk_live_x" } };
  const { db } = fakeDb({ fuentes: { auditoria: [secreto] }, rotas: ["actividad"] });
  const out = parse(await runUnicornTool("unicorn_eventos", {}, OWNER, { app: db, nervous: null }));
  assert.deepEqual(
    out.fuentes_no_disponibles.map((f: { fuente: string }) => f.fuente),
    ["actividad", "salud"],
  );
  assert.equal(out.eventos.length, 1);
  assert.equal(JSON.stringify(out.eventos[0].detalle).includes("sk_live"), false);
});
