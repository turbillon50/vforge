/**
 * Sugerencias: sólo dato con fuente, emparejado sin adivinar, sin pisar lo que
 * ya está capturado.
 *
 * Los casos copian la FORMA de las filas reales (`client_project_status` y
 * `contracts`: cliente con su dominio entre paréntesis, montos en texto, id que
 * a veces no existe en el catálogo), pero con nombres y cifras inventados: este
 * repositorio es público y los datos de los clientes de Luis no se publican.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularSugerencias,
  emparejar,
  normalizaDominio,
  parteCliente,
} from "@/lib/projects/sugerencias";
import { validarLote, MAX_LOTE } from "@/lib/projects/lote";

const DESTINOS = [
  { id: "alfa", name: "alfa", domain: "alfa-demo.info", client_name: null, contract_amount: null, paid_amount: null },
  { id: "final-beta", name: "FINAL-BETA", domain: "beta-demo.info", client_name: null, contract_amount: null, paid_amount: null },
  { id: "gama", name: "gama", domain: "gama-demo.info", client_name: null, contract_amount: null, paid_amount: null },
  { id: "delta", name: "delta", domain: "delta-demo.info", client_name: "Ya capturado", contract_amount: 9999, paid_amount: null },
];

test("el cliente se separa de su dominio", () => {
  assert.deepEqual(parteCliente("ALFA (alfa-demo.info)"), {
    nombre: "ALFA",
    dominio: "alfa-demo.info",
  });
  assert.deepEqual(parteCliente("Gama (gama-demo.info) — socio"), {
    nombre: "Gama — socio",
    dominio: "gama-demo.info",
  });
  assert.deepEqual(parteCliente("Persona — Gama"), { nombre: "Persona — Gama", dominio: null });
  assert.deepEqual(parteCliente("  "), { nombre: null, dominio: null });
});

test("normalizar dominio quita protocolo, www y ruta", () => {
  assert.equal(normalizaDominio("https://www.beta-demo.info/algo"), "beta-demo.info");
  assert.equal(normalizaDominio("sinpunto"), null);
});

test("empareja por id exacto o por dominio único, nunca a medias", () => {
  assert.equal(emparejar(DESTINOS, "alfa", null)?.destino.id, "alfa");
  assert.equal(emparejar(DESTINOS, "beta-bitacora", "beta-demo.info")?.destino.id, "final-beta");
  assert.equal(emparejar(DESTINOS, "beta-bitacora", "beta-demo.info")?.como, "dominio");
  assert.equal(
    emparejar(DESTINOS, "beta-tienda", "beta-tienda.live"),
    null,
    "dominio que no existe no se adivina",
  );
  const repetido = [
    { id: "uno", domain: "repetido.info", client_name: null, contract_amount: null, paid_amount: null },
    { id: "dos", domain: "repetido.info", client_name: null, contract_amount: null, paid_amount: null },
  ];
  assert.equal(emparejar(repetido, null, "repetido.info"), null, "dominio ambiguo no sugiere");
});

test("propone cliente y montos con su fuente, y deja fuera lo que no empareja", () => {
  const { sugerencias, sin_emparejar } = calcularSugerencias(
    DESTINOS,
    [
      { project_id: "alfa", client_name: "ALFA (alfa-demo.info)", status: "arranque", total_mxn: "12000", paid_mxn: "0" },
      { project_id: "beta-bitacora", client_name: "Beta Bitácora (beta-demo.info)", status: "liquidado", total_mxn: "5000", paid_mxn: "5000" },
      { project_id: "sin-proyecto", client_name: "Proyecto que no está en el catálogo", status: "en obra", total_mxn: "12000", paid_mxn: "9000" },
    ],
    [],
  );

  const cliente = sugerencias.find((s) => s.project_id === "alfa" && s.campo === "client_name");
  assert.equal(cliente?.valor, "ALFA");
  assert.match(cliente!.fuente, /client_project_status · alfa/);

  const monto = sugerencias.find((s) => s.project_id === "alfa" && s.campo === "contract_amount");
  assert.equal(monto?.valor, "12000");

  const pagado = sugerencias.find((s) => s.project_id === "alfa" && s.campo === "paid_amount");
  assert.equal(pagado?.valor, "0", "cero cobrado también es dato");

  const porDominio = sugerencias.find(
    (s) => s.project_id === "final-beta" && s.campo === "client_name",
  );
  assert.match(porDominio!.detalle!, /empatado por dominio beta-demo\.info/);

  assert.deepEqual(sin_emparejar, [
    { fuente: "client_project_status", referencia: "sin-proyecto" },
  ]);
});

test("nunca pisa un dato ya capturado", () => {
  const { sugerencias } = calcularSugerencias(
    DESTINOS,
    [{ project_id: "delta", client_name: "Delta (delta-demo.info)", status: "entrega", total_mxn: "12000", paid_mxn: "4500" }],
    [],
  );
  assert.equal(sugerencias.some((s) => s.campo === "client_name"), false, "ya tenía cliente");
  assert.equal(sugerencias.some((s) => s.campo === "contract_amount"), false, "ya tenía monto");
  assert.equal(
    sugerencias.find((s) => s.campo === "paid_amount")?.valor,
    "4500",
    "lo vacío sí se propone",
  );
});

test("el contrato firmado gana a la tabla de operación y el conflicto queda escrito", () => {
  const { sugerencias } = calcularSugerencias(
    [DESTINOS[2]],
    [{ project_id: "gama", client_name: "Gama (gama-demo.info)", status: "en obra", total_mxn: "12000", paid_mxn: "4000" }],
    [
      {
        id: "c-1",
        project_id: "gama",
        client_name: "Persona — Gama",
        amount_mxn: "17000",
        status: "signed",
        signed_at: "2026-04-28T00:00:00.000Z",
        pagado: "11000",
      },
    ],
  );
  const monto = sugerencias.find((s) => s.campo === "contract_amount");
  assert.equal(monto?.valor, "17000");
  assert.match(monto!.fuente, /contracts · signed/);
  assert.match(monto!.detalle!, /otra fuente dice 12000/);
});

test("un contrato sin firmar NO le gana a la tabla de operación, pero se anota", () => {
  const { sugerencias } = calcularSugerencias(
    [DESTINOS[2]],
    [{ project_id: "gama", client_name: "Gama (gama-demo.info)", status: "entregado", total_mxn: "9000", paid_mxn: "6000" }],
    [
      {
        id: "c-2",
        project_id: "gama",
        client_name: "Persona — Gama",
        amount_mxn: "25000",
        status: "draft",
        signed_at: null,
        pagado: null,
      },
    ],
  );
  const monto = sugerencias.find((s) => s.campo === "contract_amount");
  assert.equal(monto?.valor, "9000");
  assert.match(monto!.detalle!, /otra fuente dice 25000 \(contracts · draft\)/);
});

test("sin fuente no hay sugerencia (ni fecha de entrega)", () => {
  const { sugerencias } = calcularSugerencias(DESTINOS, [], []);
  assert.deepEqual(sugerencias, []);
  const conFuente = calcularSugerencias(
    DESTINOS,
    [{ project_id: "alfa", client_name: "ALFA (alfa-demo.info)", status: null, total_mxn: null, paid_mxn: null }],
    [],
  );
  assert.deepEqual(
    conFuente.sugerencias.map((s) => s.campo),
    ["client_name"],
    "no se inventa monto ni fecha",
  );
});

test("el lote valida ids, campos y tope", () => {
  assert.deepEqual(validarLote({ ids: [], patch: { category: "activo" } }), { error: "sin_proyectos" });
  assert.deepEqual(validarLote({ ids: ["a"], patch: {} }), { error: "nada_que_cambiar" });
  assert.deepEqual(validarLote({ ids: ["a"], patch: { category: "inventada" } }), {
    error: "categoria_invalida",
  });
  assert.deepEqual(validarLote({ ids: ["ok", "mal id"], patch: { category: "activo" } }), {
    error: "id_invalido",
  });
  assert.deepEqual(
    validarLote({ ids: Array.from({ length: MAX_LOTE + 1 }, (_, i) => `p${i}`), patch: { category: "activo" } }),
    { error: "lote_demasiado_grande" },
  );
  assert.deepEqual(validarLote({ ids: ["a"], patch: { delivery_priority: "sí" } }), {
    error: "prioridad_invalida",
  });

  const ok = validarLote({ ids: ["a", "a", "b"], patch: { category: "activo", family_code: " VLIVING " } });
  assert.ok(!("error" in ok));
  assert.deepEqual(ok.ids, ["a", "b"], "ids repetidos se colapsan");
  assert.equal(ok.manual, true, "fijar estado cuenta como clasificar a mano");
  assert.deepEqual(ok.sets, [
    { col: "category", valor: "activo" },
    { col: "family_code", valor: "vliving" },
  ]);

  const sinEstado = validarLote({ ids: ["a"], patch: { client_name: "  Cliente  Ejemplo " } });
  assert.ok(!("error" in sinEstado));
  assert.equal(sinEstado.manual, false);
  assert.deepEqual(sinEstado.sets, [{ col: "client_name", valor: "Cliente Ejemplo" }]);
});
