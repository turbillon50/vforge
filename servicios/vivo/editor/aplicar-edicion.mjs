/**
 * Aplica una edición hecha sobre la vista previa al CÓDIGO DE VERDAD.
 *
 * Recibe un `data-vf-src` ("ruta:linea:columna", que puso vf-src-loader), ubica
 * ese mismo elemento en el archivo original y cambia lo que se pidió:
 *   · texto  → reemplaza el texto visible del elemento
 *   · estilo → mezcla propiedades en su `style={{ … }}`
 *   · clase  → reemplaza su `className`
 *
 * Nunca regenera el archivo: corta e inserta por posición, así el resto del
 * código queda intacto (sin reformateos ni comillas cambiadas).
 *
 * Si no puede hacerlo con seguridad, devuelve `{ ok:false, motivo }` para que el
 * Estudio ofrezca "dile a V" en lugar de escribir una barbaridad.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { createRequire } from "node:module";

/** Busca el parser de Babel que Next ya trae compilado dentro del proyecto. */
function cargarParser(raiz) {
  const intentos = [
    () => createRequire(resolve(raiz, "package.json"))("next/dist/compiled/babel/parser"),
    () => createRequire(import.meta.url)("next/dist/compiled/babel/parser"),
  ];
  for (const intento of intentos) {
    try {
      const p = intento();
      if (p?.parse) return p;
    } catch {
      /* siguiente intento */
    }
  }
  return null;
}

function recorrerConPadres(nodo, visita, padre = null) {
  if (!nodo || typeof nodo !== "object") return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) recorrerConPadres(hijo, visita, padre);
    return;
  }
  if (typeof nodo.type === "string") {
    visita(nodo, padre);
    padre = nodo;
  }
  for (const llave of Object.keys(nodo)) {
    if (llave === "loc" || llave === "leadingComments" || llave === "trailingComments") continue;
    recorrerConPadres(nodo[llave], visita, padre);
  }
}

/** "app/page.tsx:12:5" → { archivo, linea, columna } */
export function partirSrc(src) {
  const m = /^(.*):(\d+):(\d+)$/.exec(String(src || ""));
  if (!m) return null;
  return { archivo: m[1], linea: Number(m[2]), columna: Number(m[3]) };
}

function camelACss(llave) {
  return llave.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function comoLiteralJs(valor) {
  if (typeof valor === "number") return String(valor);
  const texto = String(valor);
  // Números puros van sin comillas; lo demás como cadena con comillas dobles.
  if (/^-?\d+(\.\d+)?$/.test(texto)) return texto;
  return JSON.stringify(texto);
}

export function aplicarEdicion({ raiz, src, operacion }) {
  const partes = partirSrc(src);
  if (!partes) return { ok: false, motivo: "El data-vf-src no tiene forma de ruta:linea:columna." };

  const raizAbs = resolve(raiz);
  if (isAbsolute(partes.archivo)) return { ok: false, motivo: "Ruta absoluta no permitida." };
  const destino = resolve(raizAbs, partes.archivo);
  const dentro = relative(raizAbs, destino);
  if (dentro.startsWith("..") || isAbsolute(dentro)) {
    return { ok: false, motivo: "El archivo queda fuera del proyecto." };
  }

  const parser = cargarParser(raizAbs);
  if (!parser) return { ok: false, motivo: "No encontré el parser de Babel del proyecto." };

  let codigo;
  try {
    codigo = readFileSync(destino, "utf8");
  } catch (error) {
    return { ok: false, motivo: `No pude leer ${dentro}: ${error.message}` };
  }

  let ast;
  try {
    ast = parser.parse(codigo, {
      sourceType: "module",
      errorRecovery: true,
      plugins: ["jsx", "typescript", "decorators-legacy", "classProperties"],
    });
  } catch (error) {
    return { ok: false, motivo: `No pude parsear ${dentro}: ${error.message}` };
  }

  // Ubica el elemento exacto por línea y columna.
  let apertura = null;
  let padreElemento = null;
  recorrerConPadres(ast.program, (nodo, padre) => {
    if (apertura) return;
    if (nodo.type !== "JSXOpeningElement") return;
    const linea = nodo.loc?.start?.line;
    const columna = (nodo.loc?.start?.column ?? 0) + 1;
    if (linea === partes.linea && columna === partes.columna) {
      apertura = nodo;
      padreElemento = padre;
    }
  });

  if (!apertura) {
    return {
      ok: false,
      motivo: `Ya no encontré el elemento en ${dentro}:${partes.linea}. Refresca la vista y vuelve a seleccionarlo.`,
    };
  }

  const inserciones = [];

  if (operacion.tipo === "texto") {
    const elemento = padreElemento?.type === "JSXElement" ? padreElemento : null;
    if (!elemento) return { ok: false, motivo: "Ese elemento no tiene cuerpo de texto editable." };
    const textos = (elemento.children || []).filter(
      (h) => h.type === "JSXText" && h.value.trim().length > 0,
    );
    if (textos.length === 0) {
      return {
        ok: false,
        motivo: "Ese elemento no tiene texto propio (su contenido viene de una variable o de otro componente). Pídeselo a V.",
      };
    }
    if (textos.length > 1) {
      return {
        ok: false,
        motivo: "Ese elemento tiene el texto partido en varios pedazos. Pídeselo a V.",
      };
    }
    const nodoTexto = textos[0];
    // Respeta los espacios/saltos de línea alrededor del texto original.
    const bruto = nodoTexto.value;
    const izquierda = bruto.slice(0, bruto.length - bruto.trimStart().length);
    const derecha = bruto.slice(bruto.trimEnd().length);
    const nuevo = String(operacion.valor ?? "");
    if (/[<>{}]/.test(nuevo)) {
      return { ok: false, motivo: "El texto no puede traer < > { }. Pídeselo a V." };
    }
    inserciones.push({ desde: nodoTexto.start, hasta: nodoTexto.end, texto: izquierda + nuevo + derecha });
  } else if (operacion.tipo === "estilo") {
    const props = operacion.props && typeof operacion.props === "object" ? operacion.props : {};
    const llaves = Object.keys(props);
    if (llaves.length === 0) return { ok: false, motivo: "No mandaste propiedades de estilo." };

    const attr = (apertura.attributes || []).find(
      (a) => a.type === "JSXAttribute" && a.name?.name === "style",
    );

    if (!attr) {
      // No tiene style: se lo agregamos después del nombre de la etiqueta.
      const cuerpo = llaves.map((k) => `${k}: ${comoLiteralJs(props[k])}`).join(", ");
      inserciones.push({ desde: apertura.name.end, hasta: apertura.name.end, texto: ` style={{ ${cuerpo} }}` });
    } else {
      const valor = attr.value;
      const objeto =
        valor?.type === "JSXExpressionContainer" && valor.expression?.type === "ObjectExpression"
          ? valor.expression
          : null;
      if (!objeto) {
        return {
          ok: false,
          motivo: "El style de ese elemento no es un objeto literal (viene de una variable). Pídeselo a V.",
        };
      }
      const pendientes = new Set(llaves);
      for (const prop of objeto.properties) {
        if (prop.type !== "ObjectProperty") continue;
        const nombre =
          prop.key.type === "Identifier"
            ? prop.key.name
            : prop.key.type === "StringLiteral"
              ? prop.key.value
              : null;
        if (!nombre || !pendientes.has(nombre)) continue;
        inserciones.push({
          desde: prop.value.start,
          hasta: prop.value.end,
          texto: comoLiteralJs(props[nombre]),
        });
        pendientes.delete(nombre);
      }
      if (pendientes.size > 0) {
        const cuerpo = [...pendientes].map((k) => `${k}: ${comoLiteralJs(props[k])}`).join(", ");
        const ultima = objeto.properties[objeto.properties.length - 1];
        if (ultima) {
          // Justo después de la última propiedad, no antes de la llave: así no
          // queda el espacio suelto de `"var(--fg)" , textAlign: …`.
          inserciones.push({ desde: ultima.end, hasta: ultima.end, texto: `, ${cuerpo}` });
        } else {
          const posCierre = objeto.end - 1;
          inserciones.push({ desde: posCierre, hasta: posCierre, texto: ` ${cuerpo} ` });
        }
      }
    }
  } else if (operacion.tipo === "clase") {
    const nueva = String(operacion.valor ?? "");
    if (/["'{}<>]/.test(nueva)) return { ok: false, motivo: "Esa clase trae caracteres que no puedo escribir." };
    const attr = (apertura.attributes || []).find(
      (a) => a.type === "JSXAttribute" && a.name?.name === "className",
    );
    if (!attr) {
      inserciones.push({
        desde: apertura.name.end,
        hasta: apertura.name.end,
        texto: ` className="${nueva}"`,
      });
    } else if (attr.value?.type === "StringLiteral") {
      inserciones.push({ desde: attr.value.start, hasta: attr.value.end, texto: `"${nueva}"` });
    } else {
      return {
        ok: false,
        motivo: "El className de ese elemento se arma con código. Pídeselo a V.",
      };
    }
  } else {
    return { ok: false, motivo: `Operación desconocida: ${operacion.tipo}` };
  }

  // De atrás hacia adelante: así ninguna posición se corre.
  inserciones.sort((a, b) => b.desde - a.desde);
  let salida = codigo;
  for (const { desde, hasta, texto } of inserciones) {
    salida = salida.slice(0, desde) + texto + salida.slice(hasta);
  }

  if (salida === codigo) return { ok: true, archivo: dentro, sinCambio: true };

  try {
    writeFileSync(destino, salida);
  } catch (error) {
    return { ok: false, motivo: `No pude escribir ${dentro}: ${error.message}` };
  }

  return { ok: true, archivo: dentro, linea: partes.linea };
}
