/**
 * El estado real: lo de Luis manda; lo demás se calcula con señales medibles.
 * Cada caso es una regla del brief B4, con su contraprueba.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIAS_ACTIVO,
  DIAS_PAUSA,
  VIGENCIA_SONDEO_MS,
  dominioVivo,
  estadoCalculado,
  estadoReal,
  hayDeployVercel,
} from "@/lib/projects/estado-real";

const AHORA = Date.parse("2026-09-28T12:00:00Z");
const DIA = 86_400_000;
const haceDias = (n: number) => new Date(AHORA - n * DIA).toISOString();

test("lo clasificado a mano gana, aunque las señales digan otra cosa", () => {
  const e = estadoReal(
    {
      category: "en_pausa",
      category_manual_at: haceDias(3),
      domain: "vliving.site",
      vercel_project_id: "prj_1",
      health_ok: true,
      health_status: 200,
      health_checked_at: haceDias(0),
      last_push: haceDias(1),
    },
    AHORA,
  );
  assert.equal(e.estado, "en_pausa");
  assert.equal(e.fuente, "manual");
  assert.match(e.motivo, /a mano/);
});

test("sin clasificar a mano: dominio vivo 200 + deploy en Vercel = Producción", () => {
  const e = estadoReal(
    {
      category: "en_revision",
      category_manual_at: null,
      domain: "ruta618.life",
      vercel_project_id: "prj_x",
      health_ok: true,
      health_status: 200,
      health_checked_at: haceDias(1),
      last_push: haceDias(400),
    },
    AHORA,
  );
  assert.equal(e.estado, "produccion");
  assert.equal(e.fuente, "calculado");
  assert.match(e.motivo, /ruta618\.life responde 200/);
});

test("dominio vivo sin deploy en Vercel no alcanza Producción: cae a la regla del push", () => {
  const e = estadoCalculado(
    {
      domain: "algo.info",
      health_ok: true,
      health_status: 200,
      health_checked_at: haceDias(1),
      last_push: haceDias(5),
      github_repo: "turbillon50/algo",
    },
    AHORA,
  );
  assert.equal(e.estado, "activo");
});

test("dominio que contesta 500 no es Producción", () => {
  const e = estadoCalculado(
    {
      domain: "roto.info",
      vercel_url: "https://roto.vercel.app",
      health_ok: false,
      health_status: 500,
      health_checked_at: haceDias(1),
      last_push: haceDias(200),
      github_repo: "turbillon50/roto",
    },
    AHORA,
  );
  assert.equal(e.estado, "archivo");
  assert.match(e.motivo, /sin push/);
});

test("un sondeo viejo no cuenta como dominio vivo y se avisa", () => {
  const senales = {
    domain: "viejo.info",
    vercel_project_id: "prj_v",
    health_ok: true,
    health_status: 200,
    health_checked_at: new Date(AHORA - VIGENCIA_SONDEO_MS - DIA).toISOString(),
    last_push: haceDias(2),
    github_repo: "turbillon50/viejo",
  };
  assert.equal(dominioVivo(senales, AHORA), false);
  const e = estadoCalculado(senales, AHORA);
  assert.equal(e.estado, "activo");
  assert.equal(e.sondeo_pendiente, true);
  assert.match(e.motivo, /dominio sin sondear/);
});

test("push reciente = Activo; 31–90 días = En pausa; más de 90 = Archivado", () => {
  const base = { github_repo: "turbillon50/x", repository_count: 1 };
  assert.equal(estadoCalculado({ ...base, last_push: haceDias(0) }, AHORA).estado, "activo");
  assert.equal(
    estadoCalculado({ ...base, last_push: haceDias(DIAS_ACTIVO) }, AHORA).estado,
    "activo",
  );
  assert.equal(
    estadoCalculado({ ...base, last_push: haceDias(DIAS_ACTIVO + 1) }, AHORA).estado,
    "en_pausa",
  );
  assert.equal(estadoCalculado({ ...base, last_push: haceDias(DIAS_PAUSA) }, AHORA).estado, "en_pausa");
  assert.equal(
    estadoCalculado({ ...base, last_push: haceDias(DIAS_PAUSA + 1) }, AHORA).estado,
    "archivo",
  );
});

test("sin repo y sin push = Archivado, y lo dice", () => {
  const e = estadoCalculado({}, AHORA);
  assert.equal(e.estado, "archivo");
  assert.equal(e.motivo, "sin repositorio");
});

test("con repo pero sin push registrado también es Archivado, con otro motivo", () => {
  const e = estadoCalculado({ github_repo: "turbillon50/nuevo" }, AHORA);
  assert.equal(e.estado, "archivo");
  assert.match(e.motivo, /sin push registrado/);
});

test("un deploy ready cuenta como Vercel aunque no haya URL guardada", () => {
  assert.equal(hayDeployVercel({ deploys_ready: 2 }), true);
  assert.equal(hayDeployVercel({ deploys_ready: 0 }), false);
  assert.equal(hayDeployVercel({ vercel_url: "https://x.vercel.app" }), true);
});

test("el motivo del push se lee en español y sin números raros", () => {
  assert.match(estadoCalculado({ last_push: haceDias(0), github_repo: "a/b" }, AHORA).motivo, /hoy/);
  assert.match(estadoCalculado({ last_push: haceDias(1), github_repo: "a/b" }, AHORA).motivo, /ayer/);
  assert.match(
    estadoCalculado({ last_push: haceDias(9), github_repo: "a/b" }, AHORA).motivo,
    /hace 9 días/,
  );
});

test("una categoría inválida guardada no se toma como manual", () => {
  const e = estadoReal(
    { category: "lo_que_sea", category_manual_at: haceDias(1), last_push: haceDias(2), github_repo: "a/b" },
    AHORA,
  );
  assert.equal(e.fuente, "calculado");
  assert.equal(e.estado, "activo");
});
