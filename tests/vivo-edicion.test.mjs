/**
 * Pruebas del motor que traduce una edición sobre la vista previa a un cambio en
 * el código real. Lo que se cuida aquí es lo que puede salir caro:
 * que no toque nada fuera del proyecto, que no reformatee el archivo, y que
 * cuando no pueda hacerlo con seguridad lo diga en lugar de escribir una barbaridad.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { aplicarEdicion, partirSrc } from "../servicios/vivo/editor/aplicar-edicion.mjs";

const RAIZ_REPO = resolve(import.meta.dirname, "..");

/** Un proyecto de juguete que sí puede resolver el parser de Babel de Next. */
function proyectoDePrueba(contenido, nombre = "pantalla.tsx") {
  const raiz = mkdtempSync(resolve(tmpdir(), "vivo-edicion-"));
  // aplicar-edicion busca el parser vía el package.json del proyecto; se apunta
  // al node_modules de este repo, que ya trae Next.
  writeFileSync(
    resolve(raiz, "package.json"),
    JSON.stringify({ name: "prueba", dependencies: { next: "*" } }),
  );
  mkdirSync(resolve(raiz, "node_modules"), { recursive: true });
  writeFileSync(resolve(raiz, nombre), contenido);
  return { raiz, archivo: nombre, limpiar: () => rmSync(raiz, { recursive: true, force: true }) };
}

function conParser(contenido, prueba) {
  // Sin parser resoluble no tiene sentido la prueba: se usa el de este repo.
  const p = proyectoDePrueba(contenido);
  try {
    // Enlaza el node_modules real para que createRequire encuentre next.
    writeFileSync(
      resolve(p.raiz, "package.json"),
      JSON.stringify({ name: "prueba", dependencies: { next: "*" } }),
    );
    return prueba(p);
  } finally {
    p.limpiar();
  }
}

test("partirSrc entiende ruta:linea:columna y rechaza basura", () => {
  assert.deepEqual(partirSrc("app/page.tsx:12:5"), {
    archivo: "app/page.tsx",
    linea: 12,
    columna: 5,
  });
  assert.equal(partirSrc("sin-numeros"), null);
  assert.equal(partirSrc(""), null);
});

test("no escribe fuera del proyecto aunque le manden ../", () => {
  conParser(`export default function P() { return <div>hola</div>; }\n`, ({ raiz }) => {
    const r = aplicarEdicion({
      raiz,
      src: "../../../etc/passwd:1:1",
      operacion: { tipo: "texto", valor: "x" },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /fuera del proyecto/i);
  });
});

test("rechaza rutas absolutas", () => {
  conParser(`export default function P() { return <div>hola</div>; }\n`, ({ raiz }) => {
    const r = aplicarEdicion({
      raiz,
      src: "/etc/passwd:1:1",
      operacion: { tipo: "texto", valor: "x" },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /absoluta/i);
  });
});

test("cambia el texto sin tocar el resto de la línea", () => {
  const fuente = [
    "export default function P() {",
    "  return (",
    '    <h1 className="titulo">Hola mundo<span>ya</span></h1>',
    "  );",
    "}",
    "",
  ].join("\n");
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "texto", valor: "Adiós mundo" },
    });
    assert.equal(r.ok, true, r.motivo);
    const salida = readFileSync(resolve(raiz, archivo), "utf8");
    // El texto cambió y lo demás quedó igual: clase, span y comillas intactas.
    assert.match(salida, /<h1 className="titulo">Adiós mundo<span>ya<\/span><\/h1>/);
  });
});

test("no inventa cuando el elemento no tiene texto propio", () => {
  const fuente = [
    "export default function P({ n }) {",
    "  return (",
    "    <div>{n}</div>",
    "  );",
    "}",
    "",
  ].join("\n");
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "texto", valor: "hola" },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /no tiene texto propio|Pídeselo a V/i);
  });
});

test("rechaza texto con < > { } en lugar de romper el JSX", () => {
  const fuente = `export default function P() {\n  return (\n    <p>hola</p>\n  );\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "texto", valor: "rompe {esto}" },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /< > \{ \}/);
  });
});

test("reemplaza una propiedad de estilo que ya existía, en su lugar", () => {
  const fuente = [
    "export default function P() {",
    "  return (",
    '    <p style={{ fontSize: 14, color: "red" }}>hola</p>',
    "  );",
    "}",
    "",
  ].join("\n");
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "estilo", props: { fontSize: 22 } },
    });
    assert.equal(r.ok, true, r.motivo);
    const salida = readFileSync(resolve(raiz, archivo), "utf8");
    assert.match(salida, /style=\{\{ fontSize: 22, color: "red" \}\}/);
  });
});

test("agrega una propiedad nueva después de la última, sin espacios sueltos", () => {
  const fuente = `export default function P() {\n  return (\n    <p style={{ fontSize: 14 }}>hola</p>\n  );\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "estilo", props: { textAlign: "center" } },
    });
    assert.equal(r.ok, true, r.motivo);
    const salida = readFileSync(resolve(raiz, archivo), "utf8");
    assert.match(salida, /style=\{\{ fontSize: 14, textAlign: "center" \}\}/);
  });
});

test("le pone style al elemento que no tenía", () => {
  const fuente = `export default function P() {\n  return (\n    <p className="x">hola</p>\n  );\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "estilo", props: { color: "#112233" } },
    });
    assert.equal(r.ok, true, r.motivo);
    const salida = readFileSync(resolve(raiz, archivo), "utf8");
    assert.match(salida, /<p style=\{\{ color: "#112233" \}\} className="x">/);
  });
});

test("no toca un style que viene de una variable: lo manda con V", () => {
  const fuente = `const s = {};\nexport default function P() {\n  return (\n    <p style={s}>hola</p>\n  );\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:4:5`,
      operacion: { tipo: "estilo", props: { color: "red" } },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /objeto literal|Pídeselo a V/i);
  });
});

test("avisa cuando el elemento ya no está en esa línea", () => {
  const fuente = `export default function P() {\n  return <p>hola</p>;\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:99:1`,
      operacion: { tipo: "texto", valor: "x" },
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /Ya no encontré el elemento/i);
  });
});

test("cambia className sin tocar el resto", () => {
  const fuente = `export default function P() {\n  return (\n    <p className="viejo">hola</p>\n  );\n}\n`;
  conParser(fuente, ({ raiz, archivo }) => {
    const r = aplicarEdicion({
      raiz,
      src: `${archivo}:3:5`,
      operacion: { tipo: "clase", valor: "nuevo grande" },
    });
    assert.equal(r.ok, true, r.motivo);
    const salida = readFileSync(resolve(raiz, archivo), "utf8");
    assert.match(salida, /<p className="nuevo grande">hola<\/p>/);
  });
});

test("el repo trae el loader y la capa que el motor necesita", () => {
  for (const archivo of [
    "servicios/vivo/vivo.mjs",
    "servicios/vivo/editor/vf-src-loader.cjs",
    "servicios/vivo/editor/overlay.js",
    "servicios/vivo/editor/git.mjs",
    "servicios/vivo/instalar.sh",
  ]) {
    const contenido = readFileSync(resolve(RAIZ_REPO, archivo), "utf8");
    assert.ok(contenido.length > 0, `${archivo} está vacío`);
  }
});

test("el loader sólo se enciende con VF_VIVO=1 (nunca en producción)", () => {
  const envoltura = readFileSync(
    resolve(RAIZ_REPO, "servicios/vivo/editor/vf-vivo-next.cjs"),
    "utf8",
  );
  assert.match(envoltura, /VF_VIVO\s*===\s*"1"/);
  // Y además exige dev: un build de producción nunca pasa por el loader.
  assert.match(envoltura, /contexto\.dev/);
});
