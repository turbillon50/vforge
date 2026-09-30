// preparar.mjs — registra un proyecto nuevo en el motor vivo sin tocar el servidor a mano.
//
// Flujo (asíncrono, un trabajo por proyecto):
//   1. clona el repo de GitHub en /root/worktrees/vivo-<nombre> (o lo actualiza si ya existe)
//   2. entra a la rama de trabajo (nunca edita sobre producción)
//   3. instala dependencias (npm ci / npm install)
//   4. instala la capa de edición (.vf-vivo) y envuelve next.config SOLO en el worktree
//      — el envoltorio y la capa quedan fuera de git (exclude + skip-worktree), así que
//        ninguna edición del Estudio los sube jamás al repo del cliente
//   5. escribe la entrada en el registro
//
// Sólo proyectos Next.js por ahora (el loader de archivo:línea es de webpack).

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE_WT = process.env.VIVO_WORKTREES || "/root/worktrees";
const RAMA_TRABAJO = "vivo/estudio";

/** trabajos en curso: nombre → { fase, error, inicio, fin } */
export const trabajos = new Map();

function ejecutar(cmd, args, opciones = {}) {
  return new Promise((ok) => {
    const p = spawn(cmd, args, { ...opciones, stdio: ["ignore", "pipe", "pipe"] });
    let salida = "";
    const recoge = (b) => {
      salida += b.toString();
      if (salida.length > 20000) salida = salida.slice(-20000);
    };
    p.stdout.on("data", recoge);
    p.stderr.on("data", recoge);
    p.on("close", (codigo) => ok({ ok: codigo === 0, codigo, salida }));
    p.on("error", (e) => ok({ ok: false, codigo: -1, salida: String(e) }));
  });
}

function limpiarSecretos(texto, token) {
  let t = String(texto || "");
  if (token) t = t.split(token).join("***");
  return t.replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, "***").slice(-900);
}

export function nombreValido(n) {
  return typeof n === "string" && /^[a-z0-9][a-z0-9-]{1,62}$/.test(n);
}

export function repoValido(r) {
  return typeof r === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r);
}

function envolverNextConfig(raiz) {
  const candidatos = ["next.config.mjs", "next.config.js", "next.config.ts", "next.config.cjs"];
  const actual = candidatos.find((f) => existsSync(resolve(raiz, f)));
  let tipoModulo = "cjs";
  try {
    tipoModulo = JSON.parse(readFileSync(resolve(raiz, "package.json"), "utf8")).type === "module" ? "esm" : "cjs";
  } catch {
    /* sin package.json legible: se asume cjs */
  }

  const ext = actual ? actual.split(".").pop() : "mjs";
  const esEsm = ext === "mjs" || ext === "ts" || (ext === "js" && tipoModulo === "esm");
  const destino = actual || "next.config.mjs";
  const original = actual ? `next.config.vforig.${ext}` : null;

  // Si ya se envolvió antes, no se vuelve a envolver.
  if (original && existsSync(resolve(raiz, original))) return { ok: true, yaEstaba: true, destino };
  if (actual) {
    const contenido = readFileSync(resolve(raiz, actual), "utf8");
    if (contenido.includes("vf-vivo-next.cjs")) return { ok: true, yaEstaba: true, destino };
    renameSync(resolve(raiz, actual), resolve(raiz, original));
  }

  const importarOriginal = original ? (esEsm ? `import original from "./${original}";` : `const original = require("./${original}");`) : "const original = {};";
  const cuerpo = esEsm
    ? `// Envoltorio LOCAL del motor vivo de VForge (fuera de git). No se sube al repo.
import { createRequire } from "node:module";
${importarOriginal}
const require = createRequire(import.meta.url);
let conVivo = (c) => c;
try { ({ conVivo } = require("./.vf-vivo/vf-vivo-next.cjs")); } catch { /* sin capa, compila igual */ }
const config = typeof original === "function"
  ? async (...a) => conVivo(await original(...a))
  : conVivo(original);
export default config;
`
    : `// Envoltorio LOCAL del motor vivo de VForge (fuera de git). No se sube al repo.
${importarOriginal}
let conVivo = (c) => c;
try { ({ conVivo } = require("./.vf-vivo/vf-vivo-next.cjs")); } catch { /* sin capa, compila igual */ }
const base = original && original.default ? original.default : original;
module.exports = typeof base === "function" ? async (...a) => conVivo(await base(...a)) : conVivo(base);
`;
  writeFileSync(resolve(raiz, destino), cuerpo);

  // Fuera de git: el original renombrado y la capa se excluyen; el archivo rastreado
  // modificado queda con skip-worktree para que `git add -A` jamás lo recoja.
  const exclude = resolve(raiz, ".git/info/exclude");
  mkdirSync(dirname(exclude), { recursive: true });
  const lineas = [".vf-vivo/", original, actual ? null : destino].filter(Boolean);
  const previo = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  const faltan = lineas.filter((l) => !previo.split("\n").includes(l));
  if (faltan.length) appendFileSync(exclude, `\n# motor vivo VForge\n${faltan.join("\n")}\n`);
  return { ok: true, destino, rastreado: Boolean(actual) };
}

/**
 * Prepara (clona/actualiza + instala + capa + registro) un proyecto. No bloquea:
 * deja el avance en `trabajos`. Devuelve el estado inicial.
 */
export function prepararProyecto({ nombre, repo, ramaBase, token, registro, nodeBin, log }) {
  const enCurso = trabajos.get(nombre);
  if (enCurso && !enCurso.fin) return enCurso;

  const trabajo = { nombre, repo, fase: "clonando", error: null, inicio: Date.now(), fin: null };
  trabajos.set(nombre, trabajo);

  (async () => {
    const raiz = resolve(BASE_WT, `vivo-${nombre}`);
    const env = { ...process.env, PATH: `${nodeBin}:${process.env.PATH}`, GIT_TERMINAL_PROMPT: "0" };
    const autenticado = token ? `https://x-access-token:${token}@github.com/${repo}.git` : `https://github.com/${repo}.git`;
    const publico = `https://github.com/${repo}.git`;
    const git = (args) => ejecutar("git", args, { cwd: raiz, env });
    try {
      mkdirSync(BASE_WT, { recursive: true });
      if (!existsSync(resolve(raiz, ".git"))) {
        const c = await ejecutar("git", ["clone", "--quiet", autenticado, raiz], { env });
        if (!c.ok) throw new Error(`no pude clonar ${repo}: ${limpiarSecretos(c.salida, token)}`);
        // El token no se queda guardado en el remote del worktree.
        await git(["remote", "set-url", "origin", publico]);
      } else {
        await git(["-c", `http.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token || ""}`).toString("base64")}`, "fetch", "--quiet", "origin"]);
      }

      trabajo.fase = "rama";
      const def = await git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
      const produccion = (ramaBase || (def.ok ? def.salida.trim().replace(/^origin\//, "") : "main")) || "main";
      const existe = await git(["rev-parse", "--verify", "--quiet", RAMA_TRABAJO]);
      if (!existe.ok) {
        const r = await git(["checkout", "-q", "-b", RAMA_TRABAJO, `origin/${produccion}`]);
        if (!r.ok) throw new Error(`no pude crear la rama de trabajo: ${limpiarSecretos(r.salida, token)}`);
      } else {
        await git(["checkout", "-q", RAMA_TRABAJO]);
      }

      let pkg;
      try {
        pkg = JSON.parse(readFileSync(resolve(raiz, "package.json"), "utf8"));
      } catch {
        throw new Error("el repo no tiene package.json en la raíz");
      }
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (!deps.next) throw new Error("por ahora el motor vivo solo edita proyectos Next.js (este repo no usa next)");
      const mayor = Number(String(deps.next).replace(/[^0-9.]/g, "").split(".")[0]) || 0;

      trabajo.fase = "instalando";
      const lock = existsSync(resolve(raiz, "package-lock.json"));
      const inst = await ejecutar(`${nodeBin}/npm`, lock ? ["ci", "--no-audit", "--no-fund", "--loglevel=error"] : ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: raiz, env });
      if (!inst.ok) throw new Error(`falló la instalación de dependencias: ${limpiarSecretos(inst.salida, token)}`);

      trabajo.fase = "capa";
      mkdirSync(resolve(raiz, ".vf-vivo"), { recursive: true });
      copyFileSync(resolve(AQUI, "vf-src-loader.cjs"), resolve(raiz, ".vf-vivo/vf-src-loader.cjs"));
      copyFileSync(resolve(AQUI, "vf-vivo-next.cjs"), resolve(raiz, ".vf-vivo/vf-vivo-next.cjs"));
      const env2 = envolverNextConfig(raiz);
      if (env2.rastreado) {
        await git(["update-index", "--skip-worktree", env2.destino]);
      }

      trabajo.fase = "registro";
      let bruto = { proyectos: {} };
      try {
        bruto = JSON.parse(readFileSync(registro, "utf8"));
      } catch {
        /* registro nuevo */
      }
      bruto.proyectos = bruto.proyectos || {};
      bruto.proyectos[nombre] = {
        repo: publico,
        worktree: raiz,
        // Next 16 usa Turbopack por defecto en dev; la capa de edición es de webpack.
        dev: mayor >= 16 ? "npx next dev --webpack" : "npx next dev",
        rama: RAMA_TRABAJO,
        produccion,
        etiqueta: pkg.name || nombre,
        auto: true,
      };
      writeFileSync(registro, JSON.stringify(bruto, null, 2));

      trabajo.fase = "listo";
      log?.(`preparado ${nombre} (${repo}) en ${raiz}`);
    } catch (e) {
      trabajo.fase = "error";
      trabajo.error = limpiarSecretos(e instanceof Error ? e.message : String(e), token);
      log?.(`ERROR preparando ${nombre}: ${trabajo.error}`);
    } finally {
      trabajo.fin = Date.now();
    }
  })();

  return trabajo;
}
