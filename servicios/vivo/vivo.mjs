#!/usr/bin/env node
// vf-vivo — motor de preview en vivo para el Estudio de VForge.
//
// Qué hace: mantiene hasta MAX_SLOTS servidores de desarrollo (uno por proyecto)
// corriendo en worktrees del Hetzner, y los expone por HTTPS detrás de nginx con
// acceso sólo para quien traiga un token firmado por VForge.
//
// Por qué existe: antes cada cambio del Estudio era commit + build en Vercel (1–3 min).
// Con esto el cambio se ve por recarga en caliente en menos de 3 s, sin deploy.
//
// Sin dependencias a propósito: este servicio tiene que poder arrancar en un
// servidor recién barrido sin `npm install`.

import { createServer, request as httpRequest } from "node:http";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { aplicarEdicion } from "./editor/aplicar-edicion.mjs";
import { prepararProyecto, trabajos, nombreValido, repoValido } from "./editor/preparar.mjs";
import {
  asegurarRama,
  commitear,
  comparar,
  deshacer,
  estadoGit,
  historial,
  publicar,
} from "./editor/git.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

const PUERTO = Number(process.env.VIVO_PORT || 9311);
const MAX_SLOTS = Number(process.env.VIVO_MAX_SLOTS || 3);
const OCIO_MS = Number(process.env.VIVO_IDLE_MS || 20 * 60 * 1000); // 20 min sin uso → se apaga
const MEM_MB = Number(process.env.VIVO_MEM_MB || 1536);
const SECRETO = process.env.VIVO_SECRET || "";
const REGISTRO = process.env.VIVO_REGISTRY || "/opt/vf-vivo/proyectos.json";
const BITACORA = process.env.VIVO_LOG || "/var/log/vf-vivo.log";
const DOMINIO_BASE = process.env.VIVO_BASE_HOST || "178.105.135.26.sslip.io";
const NVM_NODE = process.env.VIVO_NODE_BIN || "/root/.nvm/versions/node/v20.20.2/bin";

if (!SECRETO || SECRETO.length < 32) {
  console.error("VIVO_SECRET falta o es muy corto (mínimo 32 caracteres).");
  process.exit(1);
}

function log(...partes) {
  const linea = `[${new Date().toISOString()}] ${partes.join(" ")}`;
  console.log(linea);
  try {
    appendFileSync(BITACORA, `${linea}\n`);
  } catch {
    /* si no hay permiso de bitácora, con stdout basta */
  }
}

// ── Firma y verificación de tokens ──────────────────────────────────────────

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function firmar(carga) {
  const cuerpo = b64url(JSON.stringify(carga));
  const mac = createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");
  return `${cuerpo}.${mac}`;
}

function verificar(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const corte = token.lastIndexOf(".");
  const cuerpo = token.slice(0, corte);
  const mac = token.slice(corte + 1);
  const esperado = createHmac("sha256", SECRETO).update(cuerpo).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let carga;
  try {
    carga = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof carga?.exp !== "number" || Date.now() > carga.exp) return null;
  return carga;
}

// ── Registro de proyectos ───────────────────────────────────────────────────

function leerRegistro() {
  try {
    const bruto = JSON.parse(readFileSync(REGISTRO, "utf8"));
    const proyectos = bruto?.proyectos && typeof bruto.proyectos === "object" ? bruto.proyectos : {};
    return proyectos;
  } catch (error) {
    log("AVISO no pude leer el registro:", error.message);
    return {};
  }
}

// ── Slots (cada slot es un host con su certificado) ──────────────────────────

const slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({
  id: `vivo${i + 1}`,
  host: `vivo${i + 1}.${DOMINIO_BASE}`,
  puerto: 4301 + i,
  proyecto: null,
  proc: null,
  listo: false,
  arrancado: 0,
  ultimoUso: 0,
  salida: [],
}));

/** Mensaje de commit que se entiende al leer el historial meses después. */
function describirOperacion(operacion, resultado) {
  const donde = `${resultado.archivo}:${resultado.linea ?? "?"}`;
  const tipo = operacion?.tipo;
  if (tipo === "texto") {
    const valor = String(operacion.valor ?? "").slice(0, 60);
    return `texto en ${donde}: "${valor}"`;
  }
  if (tipo === "estilo") {
    const llaves = Object.keys(operacion.props || {}).join(", ");
    return `estilo en ${donde}: ${llaves}`;
  }
  if (tipo === "clase") return `clase en ${donde}`;
  return `cambio en ${donde}`;
}

function slotPorId(id) {
  return slots.find((s) => s.id === id) || null;
}

function slotDeProyecto(nombre) {
  return slots.find((s) => s.proyecto === nombre) || null;
}

function urlDeSlot(slot) {
  return `https://${slot.host}`;
}

async function esperaPuerto(puerto, limiteMs = 90000) {
  const t0 = Date.now();
  for (;;) {
    const abierto = await new Promise((res) => {
      const sock = createConnection({ host: "127.0.0.1", port: puerto }, () => {
        sock.destroy();
        res(true);
      });
      sock.on("error", () => res(false));
      sock.setTimeout(1000, () => {
        sock.destroy();
        res(false);
      });
    });
    if (abierto) return true;
    if (Date.now() - t0 > limiteMs) return false;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function apagarSlot(slot, motivo) {
  if (!slot.proc) return;
  log(`apagando ${slot.id} (${slot.proyecto}) — ${motivo}`);
  try {
    // El dev server arranca con setsid: se mata el grupo entero o quedan huérfanos.
    process.kill(-slot.proc.pid, "SIGTERM");
  } catch {
    try {
      slot.proc.kill("SIGTERM");
    } catch {
      /* ya se fue */
    }
  }
  slot.proc = null;
  slot.proyecto = null;
  slot.listo = false;
  slot.salida = [];
}

async function arrancarProyecto(nombre) {
  const proyectos = leerRegistro();
  const conf = proyectos[nombre];
  if (!conf) return { error: `El proyecto "${nombre}" no está en el registro.` };

  const raiz = conf.worktree;
  if (!raiz || !existsSync(raiz)) {
    return { error: `El worktree de "${nombre}" no existe en el servidor: ${raiz}` };
  }
  if (!existsSync(resolve(raiz, "node_modules"))) {
    return { error: `"${nombre}" no tiene node_modules. Corre npm install en ${raiz}.` };
  }

  const yaVivo = slotDeProyecto(nombre);
  if (yaVivo?.proc) {
    yaVivo.ultimoUso = Date.now();
    return { slot: yaVivo.id, url: urlDeSlot(yaVivo), reutilizado: true };
  }

  // Nunca se edita sobre la rama de producción: se entra a la de trabajo.
  if (conf.rama) {
    const rama = await asegurarRama(raiz, conf.rama);
    if (!rama.ok) return { error: rama.error };
  }

  // Slot libre; si no hay, se recicla el menos usado (tope duro de MAX_SLOTS).
  let slot = slots.find((s) => !s.proc);
  if (!slot) {
    slot = slots.slice().sort((a, b) => a.ultimoUso - b.ultimoUso)[0];
    apagarSlot(slot, `reciclado para ${nombre} (tope de ${MAX_SLOTS} vivos)`);
  }

  const comando = conf.dev || "npx next dev";
  const args = ["-lc", `${comando} -p ${slot.puerto}`];
  const proc = spawn("/bin/bash", args, {
    cwd: raiz,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PATH: `${NVM_NODE}:${process.env.PATH}`,
      NODE_OPTIONS: `--max-old-space-size=${MEM_MB}`,
      PORT: String(slot.puerto),
      // Marca que el proyecto puede leer para encender la capa de edición.
      VF_VIVO: "1",
      VF_VIVO_PROJECT: nombre,
      BROWSER: "none",
    },
  });

  slot.proc = proc;
  slot.proyecto = nombre;
  slot.listo = false;
  slot.arrancado = Date.now();
  slot.ultimoUso = Date.now();
  slot.salida = [];

  const recoge = (buf) => {
    const texto = buf.toString();
    slot.salida.push(texto);
    if (slot.salida.length > 200) slot.salida.shift();
  };
  proc.stdout.on("data", recoge);
  proc.stderr.on("data", recoge);
  proc.on("exit", (code) => {
    log(`${slot.id} (${nombre}) terminó con código ${code}`);
    if (slot.proc === proc) {
      slot.proc = null;
      slot.proyecto = null;
      slot.listo = false;
    }
  });

  log(`arrancando ${nombre} en ${slot.id} puerto ${slot.puerto} (${raiz})`);
  const vivo = await esperaPuerto(slot.puerto);
  if (!vivo) {
    const cola = slot.salida.join("").slice(-1200);
    apagarSlot(slot, "no abrió el puerto");
    return { error: `El dev server de "${nombre}" no abrió el puerto ${slot.puerto}.`, salida: cola };
  }
  slot.listo = true;
  slot.ultimoUso = Date.now();
  return { slot: slot.id, url: urlDeSlot(slot), reutilizado: false };
}

// Barrendero: apaga lo que lleva OCIO_MS sin una sola petición.
setInterval(() => {
  const ahora = Date.now();
  for (const slot of slots) {
    if (slot.proc && ahora - slot.ultimoUso > OCIO_MS) {
      apagarSlot(slot, `${Math.round(OCIO_MS / 60000)} min sin uso`);
    }
  }
}, 30000).unref();

// ── Utilidades HTTP ─────────────────────────────────────────────────────────

function json(res, codigo, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(texto),
  });
  res.end(texto);
}

function leerCuerpo(req, limite = 2 * 1024 * 1024) {
  return new Promise((res, rej) => {
    let total = 0;
    const trozos = [];
    req.on("data", (d) => {
      total += d.length;
      if (total > limite) {
        rej(new Error("cuerpo demasiado grande"));
        req.destroy();
        return;
      }
      trozos.push(d);
    });
    req.on("end", () => res(Buffer.concat(trozos).toString("utf8")));
    req.on("error", rej);
  });
}

function galletas(req) {
  const crudo = req.headers.cookie || "";
  const salida = {};
  for (const parte of crudo.split(";")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    salida[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return salida;
}

// Concesiones por IP. La galleta de sesión viaja como "third-party" dentro del
// iframe del Estudio y WebKit la bloquea de cajón, así que al cruzar la puerta
// también se apunta la IP. Es más grueso que una galleta (quien comparta salida
// a internet con Luis entra), por eso dura poco y sólo abre el slot que pidió.
const concesiones = new Map();
const CONCESION_MS = Number(process.env.VIVO_GRANT_MS || 4 * 60 * 60 * 1000);

function ipDe(req) {
  const reenviado = req.headers["x-real-ip"] || req.headers["x-forwarded-for"];
  if (typeof reenviado === "string" && reenviado.trim()) return reenviado.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

function concede(req, slot, proyecto) {
  const ip = ipDe(req);
  if (!ip) return;
  concesiones.set(ip, { slot: slot.id, proyecto, exp: Date.now() + CONCESION_MS });
}

function concesionValida(req, slot) {
  const c = concesiones.get(ipDe(req));
  if (!c) return false;
  if (Date.now() > c.exp) {
    concesiones.delete(ipDe(req));
    return false;
  }
  if (c.slot !== slot.id) return false;
  c.exp = Date.now() + CONCESION_MS; // se refresca mientras se use
  return true;
}

function esAdmin(req) {
  const llave = req.headers["x-vivo-key"];
  if (typeof llave !== "string" || llave.length !== SECRETO.length) return false;
  return timingSafeEqual(Buffer.from(llave), Buffer.from(SECRETO));
}

// El slot lo dice nginx (X-Vivo-Slot) o, si no, el Host.
function slotDePeticion(req) {
  const cabecera = req.headers["x-vivo-slot"];
  if (typeof cabecera === "string" && slotPorId(cabecera)) return slotPorId(cabecera);
  const host = String(req.headers.host || "").split(":")[0];
  return slots.find((s) => s.host === host) || null;
}

// ── Servidor ────────────────────────────────────────────────────────────────

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const ruta = url.pathname;

  // Salud: sin autenticación, para el monitoreo.
  if (ruta === "/__vivo/health") {
    return json(res, 200, {
      ok: true,
      slots: slots.map((s) => ({
        id: s.id,
        proyecto: s.proyecto,
        vivo: Boolean(s.proc),
        listo: s.listo,
        ociosoSeg: s.proc ? Math.round((Date.now() - s.ultimoUso) / 1000) : null,
      })),
    });
  }

  // API de control: sólo con la llave del servicio.
  if (ruta.startsWith("/__vivo/api/")) {
    if (!esAdmin(req)) return json(res, 404, { error: "no existe" });

    if (ruta === "/__vivo/api/status") {
      return json(res, 200, {
        maxSlots: MAX_SLOTS,
        ocioMin: Math.round(OCIO_MS / 60000),
        memMb: MEM_MB,
        proyectos: Object.keys(leerRegistro()),
        preparando: Object.fromEntries(
          [...trabajos.entries()].map(([n, t]) => [n, { fase: t.fase, error: t.error, inicio: t.inicio, fin: t.fin }]),
        ),
        slots: slots.map((s) => ({
          id: s.id,
          host: s.host,
          puerto: s.puerto,
          proyecto: s.proyecto,
          vivo: Boolean(s.proc),
          listo: s.listo,
          arrancado: s.arrancado || null,
          ociosoSeg: s.proc ? Math.round((Date.now() - s.ultimoUso) / 1000) : null,
        })),
      });
    }

    if (req.method !== "POST") return json(res, 405, { error: "usa POST" });

    let cuerpo;
    try {
      cuerpo = JSON.parse((await leerCuerpo(req)) || "{}");
    } catch {
      return json(res, 400, { error: "JSON inválido" });
    }

    if (ruta === "/__vivo/api/start") {
      const nombre = String(cuerpo.project || "");
      const r = await arrancarProyecto(nombre);
      if (r.error) return json(res, 400, r);
      // Token corto de entrada: sólo sirve para cruzar la puerta.
      const token = firmar({ p: nombre, s: r.slot, exp: Date.now() + 60_000, jti: randomUUID() });
      return json(res, 200, { ...r, entrada: `${r.url}/__vivo/enter?t=${encodeURIComponent(token)}` });
    }

    // Registro automático: clona el repo del proyecto, instala y lo deja editable.
    if (ruta === "/__vivo/api/register") {
      const nombre = String(cuerpo.project || "").toLowerCase();
      const repo = String(cuerpo.repo || "");
      if (!nombreValido(nombre)) return json(res, 400, { error: "nombre de proyecto inválido" });
      if (!repoValido(repo)) return json(res, 400, { error: "repo inválido (usa owner/repo)" });
      const t = prepararProyecto({
        nombre,
        repo,
        ramaBase: typeof cuerpo.branch === "string" && /^[A-Za-z0-9._\/-]{1,100}$/.test(cuerpo.branch) ? cuerpo.branch : null,
        token: process.env.VIVO_GIT_TOKEN || "",
        registro: REGISTRO,
        nodeBin: NVM_NODE,
        log,
      });
      return json(res, 202, { ok: true, project: nombre, fase: t.fase, error: t.error });
    }

    if (ruta === "/__vivo/api/stop") {
      const slot = slotDeProyecto(String(cuerpo.project || ""));
      if (!slot) return json(res, 404, { error: "ese proyecto no está vivo" });
      apagarSlot(slot, "lo pidió el Estudio");
      return json(res, 200, { ok: true });
    }

    // Escritura de archivos dentro del worktree: así V y la capa de edición
    // cambian el código de verdad y el cambio aparece por recarga en caliente.
    if (ruta === "/__vivo/api/write") {
      const nombre = String(cuerpo.project || "");
      const conf = leerRegistro()[nombre];
      if (!conf) return json(res, 400, { error: "proyecto desconocido" });
      const raiz = resolve(conf.worktree);
      const archivos = Array.isArray(cuerpo.files) ? cuerpo.files : [];
      if (archivos.length === 0) return json(res, 400, { error: "no mandaste archivos" });

      const escritos = [];
      for (const archivo of archivos) {
        const rel = String(archivo?.path || "");
        if (!rel || isAbsolute(rel)) return json(res, 400, { error: `ruta inválida: ${rel}` });
        const destino = resolve(raiz, rel);
        // Candado contra ../: el destino tiene que quedar dentro del worktree.
        const dentro = relative(raiz, destino);
        if (dentro.startsWith("..") || isAbsolute(dentro)) {
          return json(res, 400, { error: `ruta fuera del proyecto: ${rel}` });
        }
        if (typeof archivo.content !== "string") {
          return json(res, 400, { error: `falta el contenido de ${rel}` });
        }
        mkdirSync(dirname(destino), { recursive: true });
        writeFileSync(destino, archivo.content);
        escritos.push(dentro);
      }
      const slot = slotDeProyecto(nombre);
      if (slot) slot.ultimoUso = Date.now();
      log(`escritura en ${nombre}: ${escritos.join(", ")}`);
      return json(res, 200, { ok: true, escritos });
    }

    // Edición hecha sobre la vista: se traduce a un cambio en el código real.
    if (ruta === "/__vivo/api/edit") {
      const nombre = String(cuerpo.project || "");
      const conf = leerRegistro()[nombre];
      if (!conf) return json(res, 400, { error: "proyecto desconocido" });
      const resultado = aplicarEdicion({
        raiz: conf.worktree,
        src: cuerpo.src,
        operacion: cuerpo.operacion || {},
      });
      if (!resultado.ok) return json(res, 422, { error: resultado.motivo });
      const slot = slotDeProyecto(nombre);
      if (slot) slot.ultimoUso = Date.now();
      log(`edición en ${nombre}: ${resultado.archivo}:${resultado.linea ?? "?"}`);

      // Cada cambio es un commit en la rama de trabajo: así hay historial y
      // deshacer de verdad, no un "ctrl+z" que vive sólo en la pantalla.
      let commit = null;
      if (!resultado.sinCambio) {
        const descripcion = describirOperacion(cuerpo.operacion, resultado);
        const hecho = await commitear(conf.worktree, descripcion);
        if (hecho.ok && hecho.sha) commit = hecho.sha;
        else if (!hecho.ok) log(`AVISO no pude commitear en ${nombre}: ${hecho.error}`);
      }
      return json(res, 200, { ...resultado, commit });
    }

    // ── Control: historial, deshacer, comparar, publicar ──────────────────
    if (ruta === "/__vivo/api/git") {
      const nombre = String(cuerpo.project || "");
      const conf = leerRegistro()[nombre];
      if (!conf) return json(res, 400, { error: "proyecto desconocido" });
      const raiz = conf.worktree;
      const accion = String(cuerpo.accion || "");

      if (accion === "estado") {
        const r = await estadoGit(raiz);
        return json(res, r.ok ? 200 : 400, { ...r, ramaProduccion: conf.produccion ?? null });
      }
      if (accion === "historial") {
        const r = await historial(raiz, cuerpo.limite);
        return json(res, r.ok ? 200 : 400, r);
      }
      if (accion === "comparar") {
        const r = await comparar(raiz, cuerpo.sha);
        return json(res, r.ok ? 200 : 400, r);
      }
      if (accion === "commit") {
        const r = await commitear(raiz, String(cuerpo.mensaje || "cambio a mano"));
        return json(res, r.ok ? 200 : 400, r);
      }
      if (accion === "deshacer") {
        const r = await deshacer(raiz);
        if (r.ok) {
          log(`deshecho en ${nombre}: ahora en ${r.ahoraEn}`);
          const slot = slotDeProyecto(nombre);
          if (slot) slot.ultimoUso = Date.now();
        }
        return json(res, r.ok ? 200 : 409, r);
      }
      if (accion === "publicar") {
        const r = await publicar(raiz, conf.rama, conf.produccion);
        if (r.ok) log(`PUBLICADO ${nombre}: ${r.publicado} → ${r.rama}`);
        return json(res, r.ok ? 200 : 409, r);
      }
      return json(res, 400, { error: `acción desconocida: ${accion}` });
    }

    return json(res, 404, { error: "no existe" });
  }

  const slot = slotDePeticion(req);
  if (!slot) return json(res, 404, { error: "host sin slot" });

  // Puerta de entrada: cambia el token corto por una galleta de sesión.
  if (ruta === "/__vivo/enter") {
    const carga = verificar(url.searchParams.get("t"));
    if (!carga) return json(res, 403, { error: "token inválido o vencido" });
    if (carga.s && carga.s !== slot.id) return json(res, 403, { error: "token de otro slot" });
    const sesion = firmar({ p: carga.p, s: slot.id, exp: Date.now() + 12 * 60 * 60 * 1000 });
    concede(req, slot, carga.p);
    res.writeHead(302, {
      location: url.searchParams.get("to") || "/",
      // Partitioned = CHIPS: deja que Chrome guarde la galleta aunque sea de
      // tercero dentro del iframe. Si el navegador la tira, manda la concesión por IP.
      "set-cookie": `vf_vivo=${encodeURIComponent(sesion)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=43200`,
      "cache-control": "no-store",
    });
    return res.end();
  }

  // De aquí en adelante hay que traer sesión válida. Nada público.
  const sesion = verificar(galletas(req).vf_vivo);
  const autorizado = (sesion && sesion.s === slot.id) || concesionValida(req, slot);
  if (!autorizado) {
    return json(res, 403, {
      error: "Esta vista previa es privada. Ábrela desde el Estudio de VForge.",
    });
  }

  if (!slot.proc || !slot.listo) {
    return json(res, 503, {
      error: "El servidor vivo de este proyecto está apagado. Vuelve a abrirlo desde el Estudio.",
    });
  }

  slot.ultimoUso = Date.now();

  // La capa de edición: la sirve el motor, no el proyecto. Así el piloto no
  // carga con código de edición y en producción no existe.
  if (ruta === "/__vivo/overlay.js") {
    try {
      const js = readFileSync(resolve(AQUI, "editor/overlay.js"));
      res.writeHead(200, {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
        "content-length": js.length,
      });
      return res.end(js);
    } catch (error) {
      return json(res, 500, { error: `no pude leer la capa: ${error.message}` });
    }
  }

  // Proxy al dev server. `identity` porque si viene comprimido no podríamos
  // inyectar la capa de edición en el HTML.
  const salida = httpRequest(
    {
      host: "127.0.0.1",
      port: slot.puerto,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${slot.puerto}`, "accept-encoding": "identity" },
    },
    (respuesta) => {
      const tipo = String(respuesta.headers["content-type"] || "");
      const esHtml = tipo.includes("text/html");

      if (!esHtml) {
        res.writeHead(respuesta.statusCode || 502, respuesta.headers);
        respuesta.pipe(res);
        return;
      }

      // HTML: se junta, se le inyecta la capa y se manda.
      const trozos = [];
      respuesta.on("data", (d) => trozos.push(d));
      respuesta.on("end", () => {
        let html = Buffer.concat(trozos).toString("utf8");
        const etiquetaCapa = `<script src="/__vivo/overlay.js" defer></script>`;
        if (!html.includes("/__vivo/overlay.js")) {
          if (html.includes("</body>")) html = html.replace("</body>", `${etiquetaCapa}</body>`);
          else html += etiquetaCapa;
        }
        const cuerpo = Buffer.from(html, "utf8");
        const cabeceras = { ...respuesta.headers };
        // Ya no es en trozos ni comprimido: si dejamos transfer-encoding junto al
        // content-length que ponemos, nginx tira 502.
        delete cabeceras["content-length"];
        delete cabeceras["content-encoding"];
        delete cabeceras["transfer-encoding"];
        res.writeHead(respuesta.statusCode || 502, {
          ...cabeceras,
          "content-length": cuerpo.length,
        });
        res.end(cuerpo);
      });
      respuesta.on("error", () => {
        if (!res.headersSent) json(res, 502, { error: "el dev server cortó la respuesta" });
        else res.end();
      });
    },
  );
  salida.on("error", (error) => {
    if (!res.headersSent) json(res, 502, { error: `el dev server no respondió: ${error.message}` });
    else res.end();
  });
  req.pipe(salida);
});

// La recarga en caliente de Next viaja por WebSocket: sin esto no hay "se ve solo".
servidor.on("upgrade", (req, socket, head) => {
  const slot = slotDePeticion(req);
  if (!slot || !slot.proc) {
    socket.destroy();
    return;
  }
  const sesion = verificar(galletas(req).vf_vivo);
  if (!((sesion && sesion.s === slot.id) || concesionValida(req, slot))) {
    socket.destroy();
    return;
  }
  slot.ultimoUso = Date.now();

  const arriba = httpRequest({
    host: "127.0.0.1",
    port: slot.puerto,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${slot.puerto}` },
  });
  arriba.on("upgrade", (respuesta, socketArriba, cabezaArriba) => {
    const lineas = Object.entries(respuesta.headers).map(([k, v]) => `${k}: ${v}`);
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${lineas.join("\r\n")}\r\n\r\n`);
    if (cabezaArriba?.length) socket.unshift(cabezaArriba);
    socketArriba.pipe(socket);
    socket.pipe(socketArriba);
    socketArriba.on("error", () => socket.destroy());
    socket.on("error", () => socketArriba.destroy());
  });
  arriba.on("error", () => socket.destroy());
  if (head?.length) arriba.write(head);
  arriba.end();
});

for (const senal of ["SIGTERM", "SIGINT"]) {
  process.on(senal, () => {
    log(`recibí ${senal}: apagando los servidores vivos`);
    for (const slot of slots) apagarSlot(slot, "el servicio se detiene");
    process.exit(0);
  });
}

servidor.listen(PUERTO, "127.0.0.1", () => {
  log(`vf-vivo escuchando en 127.0.0.1:${PUERTO} · ${MAX_SLOTS} slots · ocio ${OCIO_MS / 60000} min · ${MEM_MB} MB`);
});
