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
import { spawn, execFile } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  appendFileSync,
  copyFileSync,
  chmodSync,
} from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
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
const JAULA = process.env.VIVO_JAULA || resolve(dirname(fileURLToPath(import.meta.url)), "jaula.sh");
const LIMITE_AGENTE_MS = Number(process.env.VIVO_AGENT_TIMEOUT_MS || 20 * 60 * 1000);
const CODEX_HOME_RAIZ = process.env.VIVO_CODEX_HOME_ROOT || resolve(tmpdir(), "vf-vivo-codex");

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
  // El dev server corre el código del proyecto: va ENCERRADO (jaula.sh) y con
  // un entorno limpio. Antes heredaba el entorno del servicio (token de GitHub,
  // secreto del motor) y veía todo el disco como root.
  const proc = spawn(JAULA, [raiz, "/bin/bash", "-c", `${comando} -p ${slot.puerto}`], {
    cwd: raiz,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      PATH: `${NVM_NODE}:/usr/local/bin:/usr/bin:/bin`,
      VIVO_NODE_BIN: NVM_NODE,
      JAULA_VARS: "NODE_OPTIONS PORT VF_VIVO VF_VIVO_PROJECT BROWSER NEXT_TELEMETRY_DISABLED",
      NODE_OPTIONS: `--max-old-space-size=${MEM_MB}`,
      PORT: String(slot.puerto),
      // Marca que el proyecto puede leer para encender la capa de edición.
      VF_VIVO: "1",
      VF_VIVO_PROJECT: nombre,
      BROWSER: "none",
      NEXT_TELEMETRY_DISABLED: "1",
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

/** Corre editor/encargo.py con JSON por stdin y devuelve su JSON. */
function correrEncargo(accion, entrada) {
  return new Promise((ok) => {
    const p = spawn("python3", [resolve(AQUI, "editor/encargo.py"), accion], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let salida = "";
    let errores = "";
    const reloj = setTimeout(() => p.kill("SIGKILL"), 30_000);
    p.stdout.on("data", (b) => (salida += b.toString()));
    p.stderr.on("data", (b) => (errores += b.toString()));
    p.on("error", () => ok({ error: "no pude correr el despachador de V" }));
    p.on("close", () => {
      clearTimeout(reloj);
      try {
        ok(JSON.parse(salida.trim().split("\n").pop() || "{}"));
      } catch {
        log(`ERROR encargo.py ${accion}: ${errores.slice(-300)}`);
        ok({ error: "el despachador de V no respondió bien" });
      }
    });
    p.stdin.end(JSON.stringify(entrada));
  });
}

// ── Sala de agentes: Claude Code y Codex reales, encerrados ────────────────

const AGENTES_SALA = new Set(["claude", "codex"]);
const CLAUDE_SI = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(git diff:*)",
  "Bash(git status:*)",
  "Bash(npx tsc:*)",
];
const CLAUDE_NO = [
  "WebFetch",
  "WebSearch",
  "Task",
  "Read(//proc/**)",
  "Read(//tmp/hogar/**)",
  "Read(**/.env*)",
  "Edit(**/.env*)",
  "Write(**/.env*)",
];
const candadosAgente = new Set();

function sesionValida(valor) {
  if (valor == null || valor === "") return null;
  const sesion = String(valor).trim();
  if (!/^[A-Za-z0-9._:@/-]{1,200}$/.test(sesion)) return false;
  return sesion;
}

function mensajeCorto(mensaje) {
  return String(mensaje || "cambio")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70) || "cambio";
}

function mandarSse(res, evento) {
  if (res.destroyed || res.writableEnded) return;
  res.write(`data: ${JSON.stringify(evento)}\n\n`);
}

function recortarTexto(texto, limite = 120_000) {
  const valor = String(texto || "");
  return {
    texto: valor.length > limite ? valor.slice(0, limite) : valor,
    cortado: valor.length > limite,
  };
}

function extraerSesion(obj) {
  if (!obj || typeof obj !== "object") return null;
  const o = obj;
  const candidatos = [
    o.session_id,
    o.sessionId,
    o.thread_id,
    o.threadId,
    o.conversation_id,
    o.conversationId,
    o.id && String(o.type || "").includes("session") ? o.id : null,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function textoDeBloque(valor) {
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor)) {
    return valor
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if (typeof item.text === "string") return item.text;
          if (typeof item.content === "string") return item.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (valor && typeof valor === "object") {
    if (typeof valor.text === "string") return valor.text;
    if (typeof valor.content === "string") return valor.content;
    if (typeof valor.message === "string") return valor.message;
  }
  return "";
}

function comandoComoTexto(comando) {
  if (Array.isArray(comando)) return comando.map((p) => String(p)).join(" ");
  if (typeof comando === "string") return comando;
  return "";
}

function esGitDiff(comando) {
  return /\bgit\s+(?:-[A-Za-z]\s+\S+\s+)*diff\b/.test(comandoComoTexto(comando));
}

function herramientaNormalizada(agente, nombre, entrada = {}) {
  const herramienta = String(nombre || "tool");
  const archivo = typeof entrada.file_path === "string" ? entrada.file_path : typeof entrada.path === "string" ? entrada.path : null;
  const comando = comandoComoTexto(entrada.command);
  const patron = typeof entrada.pattern === "string" ? entrada.pattern : null;
  let accion = "usó";
  if (herramienta === "Read") accion = "leyó";
  else if (herramienta === "Edit" || herramienta === "MultiEdit") accion = "editó";
  else if (herramienta === "Write") accion = "escribió";
  else if (herramienta === "Bash") accion = "corrió";
  else if (herramienta === "Glob" || herramienta === "Grep") accion = "buscó";
  return {
    tipo: "herramienta",
    agente,
    herramienta,
    accion,
    archivo,
    comando: comando || null,
    patron,
  };
}

function eventosClaude(obj, ctx) {
  const salida = [];
  ctx.sesion = extraerSesion(obj) || ctx.sesion;
  const tipo = String(obj?.type || "");

  if (tipo === "assistant") {
    const bloques = Array.isArray(obj?.message?.content) ? obj.message.content : [];
    for (const bloque of bloques) {
      if (!bloque || typeof bloque !== "object") continue;
      if (bloque.type === "text" && typeof bloque.text === "string") {
        ctx.textoVisto = true;
        salida.push({ tipo: "texto", agente: "claude", texto: bloque.text });
      } else if (bloque.type === "tool_use") {
        const entrada = bloque.input && typeof bloque.input === "object" ? bloque.input : {};
        if (bloque.id) ctx.herramientas.set(String(bloque.id), { nombre: bloque.name, entrada });
        salida.push(herramientaNormalizada("claude", bloque.name, entrada));
      }
    }
  }

  if (tipo === "user") {
    const bloques = Array.isArray(obj?.message?.content) ? obj.message.content : [];
    for (const bloque of bloques) {
      if (!bloque || typeof bloque !== "object" || bloque.type !== "tool_result") continue;
      const uso = ctx.herramientas.get(String(bloque.tool_use_id || ""));
      const contenido = textoDeBloque(bloque.content);
      if (uso?.nombre === "Bash" && esGitDiff(uso.entrada?.command) && contenido.trim()) {
        const diff = recortarTexto(contenido);
        salida.push({ tipo: "diff", agente: "claude", archivo: "git diff", contenido: diff.texto, cortado: diff.cortado });
      }
    }
  }

  if (tipo === "result") {
    ctx.sesion = extraerSesion(obj) || ctx.sesion;
    if (!ctx.textoVisto && typeof obj.result === "string" && obj.result.trim()) {
      salida.push({ tipo: "texto", agente: "claude", texto: obj.result });
      ctx.textoVisto = true;
    }
  }
  return salida;
}

function eventosCodex(obj, ctx) {
  const ev = obj?.msg && typeof obj.msg === "object" ? obj.msg : obj;
  const salida = [];
  ctx.sesion = extraerSesion(obj) || extraerSesion(ev) || ctx.sesion;
  const tipo = String(ev?.type || obj?.type || "");
  const id = String(ev?.call_id || ev?.id || obj?.id || "");
  const item = ev?.item && typeof ev.item === "object" ? ev.item : null;
  const comando = comandoComoTexto(ev?.command ?? item?.command);

  if (/agent_message|assistant_message|message_delta|output_text_delta|response\.output_text\.delta/.test(tipo)) {
    const texto = textoDeBloque(ev?.message ?? ev?.text ?? ev?.delta ?? ev?.value ?? item?.text ?? item?.message);
    if (texto) salida.push({ tipo: "texto", agente: "codex", texto });
  }

  if (/exec_command_begin|command_started|command_execution|tool_call_started|item\.started/.test(tipo) && comando) {
    ctx.herramientas.set(id, { comando });
    salida.push({
      tipo: "herramienta",
      agente: "codex",
      herramienta: "Bash",
      accion: "corrió",
      archivo: null,
      comando,
      patron: null,
    });
  }

  if (/exec_command_end|command_finished|tool_call_completed|item\.completed/.test(tipo)) {
    const previo = ctx.herramientas.get(id);
    const comandoFinal = comando || previo?.comando || "";
    const contenido = textoDeBloque(ev?.stdout) || textoDeBloque(ev?.output) || textoDeBloque(ev?.aggregated_output);
    if (esGitDiff(comandoFinal) && contenido.trim()) {
      const diff = recortarTexto(contenido);
      salida.push({ tipo: "diff", agente: "codex", archivo: "git diff", contenido: diff.texto, cortado: diff.cortado });
    }
  }

  if (/patch_apply|file_change|edit/.test(tipo) && !comando) {
    salida.push({
      tipo: "herramienta",
      agente: "codex",
      herramienta: "Patch",
      accion: "editó",
      archivo: typeof ev?.path === "string" ? ev.path : typeof item?.path === "string" ? item.path : null,
      comando: null,
      patron: null,
    });
  }

  return salida;
}

function gitAgente(raiz, args, limiteMs = 60_000) {
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

async function commitearAgente(raiz, agente, mensaje) {
  const sucio = await gitAgente(raiz, ["status", "--porcelain"]);
  if (!sucio.ok) return { ok: false, error: sucio.error || "no pude leer git status" };
  if (!sucio.salida) return { ok: true, sinCambios: true, archivos: [] };
  const archivos = sucio.salida
    .split("\n")
    .map((linea) => linea.slice(3).trim())
    .filter(Boolean);

  const add = await gitAgente(raiz, ["add", "-A"], 60_000);
  if (!add.ok) return { ok: false, error: add.error || "git add falló", archivos };

  const diffCrudo = await gitAgente(raiz, ["diff", "--cached", "--stat", "--patch", "--no-ext-diff"], 60_000);
  const diff = recortarTexto(diffCrudo.ok ? diffCrudo.salida : "");
  const asunto = `[estudio-vivo] agente ${agente}: ${mensajeCorto(mensaje)}`;
  const commit = await gitAgente(
    raiz,
    [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "user.name=turbillon50",
      "-c",
      "user.email=turbillon50@gmail.com",
      "commit",
      "-m",
      asunto,
    ],
    90_000,
  );
  if (!commit.ok) return { ok: false, error: commit.error || "git commit falló", archivos, diff: diff.texto, cortado: diff.cortado };
  const sha = await gitAgente(raiz, ["rev-parse", "--short", "HEAD"], 15_000);
  return { ok: true, sha: sha.salida || null, archivos, diff: diff.texto, cortado: diff.cortado };
}

function tokenClaude() {
  try {
    for (const linea of readFileSync("/root/.claude/oauth_token.env", "utf8").split("\n")) {
      const limpia = linea.trim();
      if (limpia.includes("CLAUDE_CODE_OAUTH_TOKEN=")) {
        return limpia.split("=", 2)[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    /* falta token */
  }
  return "";
}

function prepararHomeCodex(nombre) {
  const seguro = nombre.replace(/[^a-z0-9-]/g, "_");
  const hogar = resolve(CODEX_HOME_RAIZ, seguro);
  const codexHome = resolve(hogar, ".codex");
  mkdirSync(codexHome, { recursive: true, mode: 0o700 });
  chmodSync(hogar, 0o700);
  chmodSync(codexHome, 0o700);
  copyFileSync("/root/.codex/auth.json", resolve(codexHome, "auth.json"));
  chmodSync(resolve(codexHome, "auth.json"), 0o600);
  return hogar;
}

async function correrAgente(req, res, cuerpo) {
  const nombre = String(cuerpo.project || "");
  const agente = String(cuerpo.agente || "");
  const mensaje = String(cuerpo.mensaje || "").trim().slice(0, 30_000);
  const sesion = sesionValida(cuerpo.sesion);
  if (!nombreValido(nombre)) return json(res, 400, { error: "proyecto inválido" });
  if (!AGENTES_SALA.has(agente)) return json(res, 400, { error: "agente debe ser claude o codex" });
  if (!mensaje) return json(res, 400, { error: "mensaje vacío" });
  if (sesion === false) return json(res, 400, { error: "sesión inválida" });

  const conf = leerRegistro()[nombre];
  if (!conf) return json(res, 400, { error: "proyecto desconocido" });
  const raiz = resolve(conf.worktree || "");
  if (!existsSync(resolve(raiz, ".git"))) return json(res, 400, { error: "worktree inválido" });

  const llave = `${nombre}:${agente}`;
  if (candadosAgente.has(llave)) {
    return json(res, 409, { error: `${agente} ya está trabajando en ${nombre}` });
  }
  candadosAgente.add(llave);

  let cmd;
  let env;
  try {
    if (agente === "claude") {
      const token = tokenClaude();
      if (!token) {
        candadosAgente.delete(llave);
        return json(res, 500, { error: "falta el token de Claude Code" });
      }
      cmd = [
        JAULA,
        raiz,
        "claude",
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        "acceptEdits",
        "--max-turns",
        "80",
        "--allowedTools",
        ...CLAUDE_SI,
        "--disallowedTools",
        ...CLAUDE_NO,
      ];
      if (sesion) cmd.push("--resume", sesion);
      env = {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        VIVO_NODE_BIN: NVM_NODE,
        CLAUDE_CODE_OAUTH_TOKEN: token,
        DISABLE_AUTOUPDATER: "1",
        JAULA_VARS: "CLAUDE_CODE_OAUTH_TOKEN DISABLE_AUTOUPDATER",
      };
    } else {
      const hogarCodex = prepararHomeCodex(nombre);
      cmd = [
        JAULA,
        raiz,
        "codex",
        "exec",
        "--json",
        "--sandbox",
        "workspace-write",
        "--skip-git-repo-check",
      ];
      if (sesion) cmd.push("resume", sesion, "-");
      else cmd.push("-");
      env = {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        VIVO_NODE_BIN: NVM_NODE,
        JAULA_HOME_SRC: hogarCodex,
        HOME: "/tmp/hogar",
        CODEX_HOME: "/tmp/hogar/.codex",
        JAULA_VARS: "HOME CODEX_HOME",
      };
    }
  } catch (error) {
    candadosAgente.delete(llave);
    return json(res, 500, { error: error instanceof Error ? error.message : "no pude preparar el agente" });
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store, no-transform",
    "x-accel-buffering": "no",
  });
  mandarSse(res, { tipo: "herramienta", agente, accion: "entró", herramienta: "jaula", archivo: nombre, comando: null, patron: null });

  const ctx = { sesion: sesion || null, herramientas: new Map(), textoVisto: false };
  const proc = spawn(cmd[0], cmd.slice(1), { cwd: raiz, env, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let terminado = false;
  let agotado = false;

  const matar = (signal = "SIGTERM") => {
    if (terminado) return;
    try {
      proc.kill(signal);
    } catch {
      /* ya terminó */
    }
  };

  const reloj = setTimeout(() => {
    agotado = true;
    mandarSse(res, { tipo: "error", agente, mensaje: "Tiempo límite de 20 minutos agotado." });
    matar("SIGTERM");
    setTimeout(() => matar("SIGKILL"), 3000).unref();
  }, LIMITE_AGENTE_MS);

  res.on("close", () => {
    if (!terminado) matar("SIGTERM");
  });

  proc.stdin.end(mensaje);
  proc.stderr.on("data", (buf) => {
    stderr += buf.toString();
    if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
  });
  proc.stdout.on("data", (buf) => {
    stdout += buf.toString();
    const lineas = stdout.split(/\r?\n/);
    stdout = lineas.pop() || "";
    for (const linea of lineas) {
      const limpia = linea.trim();
      if (!limpia) continue;
      try {
        const obj = JSON.parse(limpia);
        const eventos = agente === "claude" ? eventosClaude(obj, ctx) : eventosCodex(obj, ctx);
        for (const ev of eventos) mandarSse(res, ev);
      } catch {
        mandarSse(res, { tipo: "texto", agente, texto: `${limpia}\n` });
      }
    }
  });

  proc.on("error", (error) => {
    if (terminado) return;
    terminado = true;
    clearTimeout(reloj);
    mandarSse(res, { tipo: "error", agente, mensaje: error.message });
    candadosAgente.delete(llave);
    try {
      res.end();
    } catch {
      /* ya cerrado */
    }
  });

  proc.on("close", async (codigo, signal) => {
    if (terminado) return;
    terminado = true;
    clearTimeout(reloj);
    try {
      if (stdout.trim()) {
        try {
          const obj = JSON.parse(stdout.trim());
          const eventos = agente === "claude" ? eventosClaude(obj, ctx) : eventosCodex(obj, ctx);
          for (const ev of eventos) mandarSse(res, ev);
        } catch {
          mandarSse(res, { tipo: "texto", agente, texto: `${stdout.trim()}\n` });
        }
      }

      if ((codigo && codigo !== 0) || signal || agotado) {
        const detalle = stderr.trim().slice(-1200);
        mandarSse(res, {
          tipo: "error",
          agente,
          mensaje: detalle || `El proceso terminó con código ${codigo ?? "?"}${signal ? ` (${signal})` : ""}.`,
        });
      }

      const guardado = await commitearAgente(raiz, agente, mensaje);
      if (guardado.diff) {
        mandarSse(res, { tipo: "diff", agente, archivo: "cambios guardados", contenido: guardado.diff, cortado: guardado.cortado });
      }
      if (!guardado.ok) {
        mandarSse(res, { tipo: "error", agente, mensaje: `No pude commitear: ${guardado.error}` });
      }
      if (guardado.sha) log(`agente ${agente} en ${nombre}: commit ${guardado.sha}`);
      mandarSse(res, {
        tipo: "fin",
        agente,
        sesion: ctx.sesion,
        codigo,
        signal,
        commit: guardado.sha || null,
        sinCambios: Boolean(guardado.sinCambios),
        archivos: guardado.archivos || [],
      });
    } catch (error) {
      mandarSse(res, { tipo: "error", agente, mensaje: error instanceof Error ? error.message : "falló el cierre del agente" });
    } finally {
      candadosAgente.delete(llave);
      try {
        res.end();
      } catch {
        /* ya cerrado */
      }
    }
  });
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

    if (ruta === "/__vivo/api/agente") {
      return correrAgente(req, res, cuerpo);
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

    // Encargos de V: V redacta el encargo con el elemento señalado y lo mete a
    // la cola del daemon; un agente lo ejecuta en el worktree vivo y V anota
    // qué estuvo mal y cómo se corrigió (editor/encargo.py).
    if (ruta === "/__vivo/api/encargo" || ruta === "/__vivo/api/encargos") {
      const nombre = String(cuerpo.project || "");
      const conf = leerRegistro()[nombre];
      if (!conf) return json(res, 400, { error: "proyecto desconocido" });
      const crear = ruta === "/__vivo/api/encargo";
      const entrada = crear
        ? {
            proyecto: nombre,
            etiquetaProyecto: conf.etiqueta || nombre,
            pedido: cuerpo.pedido,
            elemento: cuerpo.elemento,
            agente: cuerpo.agente,
          }
        : { proyecto: nombre, limite: cuerpo.limite };
      const r = await correrEncargo(crear ? "crear" : "lista", entrada);
      return json(res, r.error ? 400 : crear ? 202 : 200, r);
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
