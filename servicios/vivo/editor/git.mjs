/**
 * Control del preview vivo: cada cambio es un commit en la rama de trabajo del
 * proyecto, con historial, deshacer al instante, comparar antes/después y un
 * Publicar aparte.
 *
 * Reglas que se respetan aquí:
 *   · Nunca se commitea en la rama de producción; se trabaja en `rama` y sólo
 *     Publicar la manda a `produccion`.
 *   · Deshacer no puede pasarse del punto donde arrancó la sesión de trabajo:
 *     el tope es el primer commit que NO hizo el Estudio.
 *   · Commits firmados turbillon50 <turbillon50@gmail.com>, como manda la doctrina.
 */

import { execFile } from "node:child_process";

const AUTOR = ["-c", "user.name=turbillon50", "-c", "user.email=turbillon50@gmail.com"];
const MARCA = "[estudio-vivo]";

function git(raiz, args, limiteMs = 60_000) {
  return new Promise((res) => {
    execFile(
      "git",
      ["-C", raiz, ...args],
      { timeout: limiteMs, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        res({
          ok: !error,
          salida: String(stdout || "").trim(),
          error: error ? String(stderr || error.message).trim() : null,
        });
      },
    );
  });
}

/** ¿En qué rama estamos y hay algo sin guardar? */
export async function estadoGit(raiz) {
  const [rama, sucio, ultimo] = await Promise.all([
    git(raiz, ["rev-parse", "--abbrev-ref", "HEAD"]),
    git(raiz, ["status", "--porcelain"]),
    git(raiz, ["log", "-1", "--pretty=%h|%s|%cI"]),
  ]);
  if (!rama.ok) return { ok: false, error: rama.error || "no es un repo git" };
  const [sha, asunto, fecha] = (ultimo.salida || "").split("|");
  return {
    ok: true,
    rama: rama.salida,
    pendientes: sucio.salida ? sucio.salida.split("\n").length : 0,
    archivosPendientes: sucio.salida ? sucio.salida.split("\n").map((l) => l.slice(3)) : [],
    ultimo: sha ? { sha, asunto, fecha } : null,
  };
}

/** Asegura que estamos en la rama de trabajo antes de escribir nada. */
export async function asegurarRama(raiz, rama) {
  if (!rama) return { ok: true };
  const actual = await git(raiz, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (actual.ok && actual.salida === rama) return { ok: true, rama };
  const cambio = await git(raiz, ["checkout", rama]);
  if (cambio.ok) return { ok: true, rama };
  const nueva = await git(raiz, ["checkout", "-b", rama]);
  if (nueva.ok) return { ok: true, rama, creada: true };
  return { ok: false, error: `no pude ponerme en la rama ${rama}: ${nueva.error}` };
}

/** Un commit por cambio. Devuelve null si no había nada que guardar. */
export async function commitear(raiz, mensaje) {
  const sucio = await git(raiz, ["status", "--porcelain"]);
  if (!sucio.salida) return { ok: true, sinCambios: true };

  const add = await git(raiz, ["add", "-A"]);
  if (!add.ok) return { ok: false, error: add.error };

  // Arrastrar un control (tamaño, esquinas…) manda decenas de cambios por
  // segundo: si el último commit es del Estudio, del mismo elemento y propiedad,
  // de hace menos de 20 s y aún no se ha subido, se funde en él en vez de
  // llenar el historial de basura (28-sep: 158 commits en 15 min).
  const texto = `${MARCA} ${mensaje}`;
  let fundir = false;
  const ultimo = await git(raiz, ["log", "-1", "--format=%s%x1f%ct"]);
  if (ultimo.ok && ultimo.salida) {
    const [asunto, cuando] = ultimo.salida.split("\x1f");
    const reciente = Date.now() / 1000 - Number(cuando) < 20;
    if (asunto === texto && reciente) {
      const subido = await git(raiz, ["branch", "-r", "--contains", "HEAD"]);
      fundir = subido.ok && !subido.salida;
    }
  }
  const commit = await git(
    raiz,
    fundir ? [...AUTOR, "commit", "--amend", "-m", texto] : [...AUTOR, "commit", "-m", texto],
  );
  if (!commit.ok) return { ok: false, error: commit.error };

  const sha = await git(raiz, ["rev-parse", "--short", "HEAD"]);
  return { ok: true, sha: sha.salida };
}

/** Historial de la rama de trabajo, marcando lo que hizo el Estudio. */
export async function historial(raiz, limite = 30) {
  const r = await git(raiz, [
    "log",
    `-${Math.min(Math.max(Number(limite) || 30, 1), 100)}`,
    "--pretty=%h%x1f%s%x1f%cI%x1f%an",
  ]);
  if (!r.ok) return { ok: false, error: r.error };
  const commits = r.salida
    ? r.salida.split("\n").map((linea) => {
        const [sha, asunto, fecha, autor] = linea.split("\x1f");
        const delEstudio = asunto.startsWith(MARCA);
        return {
          sha,
          asunto: delEstudio ? asunto.slice(MARCA.length).trim() : asunto,
          fecha,
          autor,
          delEstudio,
        };
      })
    : [];
  return { ok: true, commits };
}

/**
 * Deshacer al instante: tira el último commit del Estudio y deja el árbol como
 * estaba. No pasa del primer commit ajeno (ahí ya no es nuestro trabajo).
 */
export async function deshacer(raiz) {
  const ultimo = await git(raiz, ["log", "-1", "--pretty=%s"]);
  if (!ultimo.ok) return { ok: false, error: ultimo.error };
  if (!ultimo.salida.startsWith(MARCA)) {
    return {
      ok: false,
      error: "El último commit no lo hizo el Estudio. No voy a deshacer trabajo ajeno.",
    };
  }
  const reset = await git(raiz, ["reset", "--hard", "HEAD~1"]);
  if (!reset.ok) return { ok: false, error: reset.error };
  const sha = await git(raiz, ["rev-parse", "--short", "HEAD"]);
  return { ok: true, ahoraEn: sha.salida };
}

/**
 * Comparar antes/después.
 *   · con sha  → el diff de ese commit
 *   · sin sha  → lo que falta por guardar; y si no hay nada pendiente, el diff
 *     del último commit (que es lo que se quiere ver tras editar, porque cada
 *     edición ya se commiteó sola).
 */
export async function comparar(raiz, sha) {
  let args;
  if (sha) {
    args = ["show", "--stat", "--patch", "--pretty=%h %s", String(sha)];
  } else {
    const sucio = await git(raiz, ["status", "--porcelain"]);
    args = sucio.salida
      ? ["diff", "HEAD"]
      : ["show", "--stat", "--patch", "--pretty=%h %s", "HEAD"];
  }
  const r = await git(raiz, args);
  if (!r.ok) return { ok: false, error: r.error };
  // Un diff enorme no le sirve a nadie en pantalla: se corta y se avisa.
  const LIMITE = 120_000;
  const cortado = r.salida.length > LIMITE;
  return {
    ok: true,
    diff: cortado ? r.salida.slice(0, LIMITE) : r.salida,
    cortado,
    bytes: r.salida.length,
  };
}

/**
 * Publicar: manda la rama de trabajo a la de producción, que es la que dispara
 * Vercel. Es el único punto donde este motor toca producción, y va aparte a
 * propósito.
 */
export async function publicar(raiz, ramaTrabajo, ramaProduccion) {
  if (!ramaProduccion) return { ok: false, error: "el proyecto no declara rama de producción" };

  const sucio = await git(raiz, ["status", "--porcelain"]);
  if (sucio.salida) {
    return {
      ok: false,
      error: "Hay cambios sin guardar. Guárdalos (o deshazlos) antes de publicar.",
    };
  }

  // Traer es por cortesía (saber si venimos atrasados). Si la rama de producción
  // todavía no existe en origin, esto falla y NO debe frenar el primer publicado:
  // lo que tiene que salir bien es el push.
  await git(raiz, ["fetch", "origin", ramaProduccion], 120_000);

  // Empuja el árbol de la rama de trabajo a la de producción.
  const empuje = await git(
    raiz,
    ["push", "origin", `${ramaTrabajo}:${ramaProduccion}`],
    180_000,
  );
  if (!empuje.ok) {
    return {
      ok: false,
      error: `Vercel no se enteró: el push falló. ${empuje.error}`,
    };
  }

  const sha = await git(raiz, ["rev-parse", "--short", "HEAD"]);
  return { ok: true, publicado: sha.salida, rama: ramaProduccion };
}
