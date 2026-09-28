/**
 * vf-src-loader — marca cada etiqueta del JSX con el archivo y la línea donde vive.
 *
 * Para qué: la capa de edición del Estudio necesita saber, al hacer clic en algo
 * de la vista previa, en qué archivo y renglón está ese elemento. Este loader
 * agrega `data-vf-src="ruta:linea:columna"` mientras compila, sólo en dev.
 *
 * Cómo: parsea con el Babel que Next ya trae compilado (cero dependencias nuevas
 * en el proyecto) y **sólo inserta atributos** por posición, sin regenerar el
 * código. Así el archivo queda idéntico salvo lo agregado y los números de línea
 * que reportamos siguen siendo los de verdad.
 */

const path = require("node:path");

// Etiquetas que sí aceptan data-* sin quejarse: las del DOM.
const ETIQUETAS_DOM = new Set([
  "a","abbr","address","area","article","aside","audio","b","bdi","bdo","blockquote","body","br",
  "button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details",
  "dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1",
  "h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","img","input","ins",
  "kbd","label","legend","li","link","main","map","mark","menu","meta","meter","nav","noscript",
  "object","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby",
  "s","samp","script","section","select","slot","small","source","span","strong","style","sub",
  "summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","title",
  "tr","track","u","ul","var","video","wbr",
  // SVG de uso común
  "svg","path","circle","rect","g","line","polyline","polygon","ellipse","defs","use","text",
]);

/** Recorre el AST sin @babel/traverse: basta con visitar objetos y arreglos. */
function recorrer(nodo, visita) {
  if (!nodo || typeof nodo !== "object") return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) recorrer(hijo, visita);
    return;
  }
  if (typeof nodo.type === "string") visita(nodo);
  for (const llave of Object.keys(nodo)) {
    if (llave === "loc" || llave === "leadingComments" || llave === "trailingComments") continue;
    recorrer(nodo[llave], visita);
  }
}

/** ¿Es una etiqueta a la que le podemos colgar data-vf-src sin romper nada? */
function etiquetaAnotable(nombre) {
  if (!nombre) return false;
  // <div>, <h1>: elementos del DOM.
  if (nombre.type === "JSXIdentifier") return ETIQUETAS_DOM.has(nombre.name);
  // <motion.h1>: componentes que reenvían props al DOM (framer-motion, styled).
  if (nombre.type === "JSXMemberExpression") {
    return nombre.property?.type === "JSXIdentifier" && ETIQUETAS_DOM.has(nombre.property.name);
  }
  return false;
}

module.exports = function vfSrcLoader(codigo) {
  const recurso = this.resourcePath || "";

  // Nunca toca dependencias ni archivos sin JSX.
  if (recurso.includes("node_modules")) return codigo;
  if (!/\.[jt]sx$/.test(recurso)) return codigo;
  if (!codigo.includes("<")) return codigo;

  let parser;
  try {
    parser = require("next/dist/compiled/babel/parser");
  } catch {
    // Sin parser no hay marcas, pero la compilación sigue: el preview vivo
    // funciona, sólo se pierde el clic-a-código.
    return codigo;
  }

  let ast;
  try {
    ast = parser.parse(codigo, {
      sourceType: "module",
      errorRecovery: true,
      plugins: ["jsx", "typescript", "decorators-legacy", "classProperties"],
    });
  } catch {
    return codigo;
  }

  const relativo = path
    .relative(this.rootContext || process.cwd(), recurso)
    .split(path.sep)
    .join("/");

  const inserciones = [];
  recorrer(ast.program, (nodo) => {
    if (nodo.type !== "JSXOpeningElement") return;
    if (!etiquetaAnotable(nodo.name)) return;
    const yaTiene = (nodo.attributes || []).some(
      (a) => a.type === "JSXAttribute" && a.name?.name === "data-vf-src",
    );
    if (yaTiene) return;
    const linea = nodo.loc?.start?.line ?? 0;
    const columna = (nodo.loc?.start?.column ?? 0) + 1;
    // Se inserta justo después del nombre de la etiqueta: <div| ...>
    inserciones.push({ pos: nodo.name.end, texto: ` data-vf-src="${relativo}:${linea}:${columna}"` });
  });

  if (inserciones.length === 0) return codigo;

  // De atrás hacia adelante para que las posiciones no se corran.
  inserciones.sort((a, b) => b.pos - a.pos);
  let salida = codigo;
  for (const { pos, texto } of inserciones) {
    salida = salida.slice(0, pos) + texto + salida.slice(pos);
  }
  return salida;
};
