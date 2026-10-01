#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright-core";
import QRCode from "qrcode";
import { ensureHiloSchema } from "./schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LINEAS = ["personal", "negocio"];
const CHROMIUM_PATH = process.env.HILO_CHROMIUM_PATH ?? "/usr/bin/google-chrome";
const DATA_DIR = process.env.HILO_DATA_DIR ?? "/var/lib/hilo";
const HOST = process.env.HILO_API_HOST ?? "127.0.0.1";
const PORT = Number(process.env.HILO_API_PORT ?? "9320");
const HEADLESS = process.env.HILO_HEADLESS !== "0";
const WATCHDOG_MS = Number(process.env.HILO_WATCHDOG_MS ?? "8000");
const HANG_TIMEOUT_MS = Number(process.env.HILO_HANG_TIMEOUT_MS ?? "12000");
const MAX_RETRY_MS = Number(process.env.HILO_MAX_RETRY_MS ?? "60000");
const HILO_ACTIVO = process.env.HILO_ACTIVO === "1";
const WA_URL = "https://web.whatsapp.com/";

const HILO_SECRET = requiredEnv("HILO_SECRET");
const HILO_DATABASE_URL = requiredEnv("HILO_DATABASE_URL");
const db = neon(HILO_DATABASE_URL);

const estados = new Map(
  LINEAS.map((linea) => [
    linea,
    {
      linea,
      conectado: false,
      estado: "reconectando",
      hook: "none",
      degradado: false,
      motivo_degradado: null,
      ultimo_mensaje: null,
      ultimo_error: null,
      updated_at: new Date().toISOString(),
    },
  ]),
);
const qrPng = new Map();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[hilo] falta ${name}`);
    process.exit(1);
  }
  return value;
}

function log(linea, msg, extra = undefined) {
  const prefix = linea ? `[hilo:${linea}]` : "[hilo]";
  if (extra === undefined) console.log(prefix, msg);
  else console.log(prefix, msg, extra);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function patchEstado(linea, patch) {
  const prev = estados.get(linea);
  estados.set(linea, {
    ...prev,
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function trunc(value, max = 360) {
  if (!value) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

function tsToIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "number") {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function tipoNormalizado(rawTipo, texto) {
  const t = String(rawTipo ?? "").toLowerCase();
  if (t === "chat" || t === "text" || t === "texto") return "texto";
  if (t === "ptt" || t === "audio" || t.includes("voice")) return "audio";
  if (t === "image" || t === "sticker" || t === "imagen") return "imagen";
  if (t === "document" || t === "doc" || t === "documento") return "documento";
  return texto ? "texto" : "otro";
}

function normalizarMensaje(linea, raw) {
  if (!raw || typeof raw !== "object") return null;
  const deMi = Boolean(raw.de_mi ?? raw.fromMe ?? raw.deMi);
  const chatId = String(
    raw.chat_id ??
      raw.chatId ??
      raw.remote ??
      (deMi ? raw.to : raw.from) ??
      raw.from ??
      raw.to ??
      "unknown",
  );
  const texto = trunc(raw.texto ?? raw.body ?? raw.caption ?? raw.preview ?? raw.text ?? "", 6000);
  const tipo = tipoNormalizado(raw.tipo ?? raw.type, texto);
  const idWa =
    raw.id_wa ??
    raw.id ??
    raw.serialized ??
    raw._serialized ??
    `dom:${hashText([linea, chatId, raw.autor ?? "", texto ?? "", raw.ts ?? raw.timestamp ?? ""].join("|")).slice(0, 48)}`;
  const uid = `${linea}:${idWa}`;
  const ts = tsToIso(raw.ts ?? raw.timestamp ?? raw.t);
  const mediaTipo = raw.media_tipo ?? raw.mimetype ?? raw.mimeType ?? (tipo !== "texto" ? tipo : null);
  const mediaRef = raw.media_ref ?? raw.mediaKey ?? raw.clientUrl ?? (mediaTipo ? String(idWa) : null);

  return {
    uid,
    linea,
    chat_id: chatId,
    chat_nombre: trunc(raw.chat_nombre ?? raw.chatName ?? raw.notifyName ?? raw.name ?? chatId, 240),
    es_grupo: Boolean(raw.es_grupo ?? raw.isGroup ?? chatId.includes("@g.us")),
    autor: trunc(raw.autor ?? raw.author ?? raw.sender ?? (deMi ? "me" : null), 240),
    de_mi: deMi,
    tipo,
    texto,
    ts,
    id_wa: String(idWa),
    media_ref: mediaRef ? String(mediaRef) : null,
    media_tipo: mediaTipo ? String(mediaTipo) : null,
    origen: "vivo",
    hilo_chat_id: null,
    raw,
  };
}

async function buscarChatMonitoreado(linea, msg) {
  const rows = await db.query(
    `SELECT id, linea, chat_id, chat_nombre, project_id
       FROM hilo_chats
      WHERE monitorear = true
        AND (
          (linea = $1 AND chat_id = $2)
          OR (linea IS NULL AND chat_id = $2)
          OR (linea IS NULL AND lower(chat_nombre) = lower($3))
        )
      ORDER BY
        CASE
          WHEN linea = $1 AND chat_id = $2 THEN 0
          WHEN linea IS NULL AND chat_id = $2 THEN 1
          ELSE 2
        END,
        creado_en DESC
      LIMIT 1`,
    [linea, msg.chat_id, msg.chat_nombre ?? ""],
  );
  const chat = rows[0];
  if (!chat) return null;

  if (chat.linea !== linea || chat.chat_id !== msg.chat_id) {
    await db.query(
      `UPDATE hilo_chats
          SET linea = $1, chat_id = $2, origen = 'vivo'
        WHERE id = $3`,
      [linea, msg.chat_id, chat.id],
    );
  }
  return chat;
}

async function guardarMensaje(linea, raw) {
  const msg = normalizarMensaje(linea, raw);
  if (!msg || msg.chat_id === "unknown") return false;
  if (!HILO_ACTIVO) return false;

  const chatLigado = await buscarChatMonitoreado(linea, msg);
  if (!chatLigado) return false;
  msg.hilo_chat_id = chatLigado.id;
  msg.raw = {
    ...(msg.raw ?? {}),
    origen: "vivo",
    hilo_chat_id: chatLigado.id,
    project_id: chatLigado.project_id,
  };

  const rows = await db.query(
    `INSERT INTO hilo_mensajes (
       uid, linea, chat_id, chat_nombre, es_grupo, autor, de_mi, tipo, texto,
       ts, id_wa, media_ref, media_tipo, origen, hilo_chat_id, raw
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10::timestamptz, $11, $12, $13, $14, $15, $16::jsonb
     )
     ON CONFLICT (linea, id_wa) DO NOTHING
     RETURNING uid`,
    [
      msg.uid,
      msg.linea,
      msg.chat_id,
      msg.chat_nombre,
      msg.es_grupo,
      msg.autor,
      msg.de_mi,
      msg.tipo,
      msg.texto,
      msg.ts,
      msg.id_wa,
      msg.media_ref,
      msg.media_tipo,
      msg.origen,
      msg.hilo_chat_id,
      JSON.stringify(msg.raw),
    ],
  );
  patchEstado(linea, {
    ultimo_mensaje: {
      chat_id: msg.chat_id,
      chat_nombre: msg.chat_nombre,
      tipo: msg.tipo,
      texto: trunc(msg.texto, 180),
      ts: msg.ts,
      id_wa: msg.id_wa,
    },
  });
  return rows.length > 0;
}

export async function descargarMediaMensaje(_mensaje) {
  throw new Error("TODO hilo media: descargar binarios desde WhatsApp Web en un proceso aislado, cifrarlos y guardar solo referencia en DB.");
}

export async function transcribirAudioMensaje(_mensaje) {
  throw new Error("TODO hilo audio: invocar transcriptor batch sobre media descargada; no se implementa en el listener de solo lectura.");
}

class LineaWhatsApp {
  constructor(linea) {
    this.linea = linea;
    this.context = null;
    this.page = null;
    this.stopRequested = false;
  }

  async start() {
    let delay = 1000;
    while (!this.stopRequested) {
      try {
        await this.runOnce();
        delay = 1000;
      } catch (error) {
        patchEstado(this.linea, {
          estado: "reconectando",
          conectado: false,
          ultimo_error: error instanceof Error ? error.message : String(error),
        });
        log(this.linea, "reinicio por error", error instanceof Error ? error.message : error);
      } finally {
        await this.close();
      }
      if (!this.stopRequested) {
        await sleep(delay);
        delay = Math.min(MAX_RETRY_MS, Math.round(delay * 1.8));
      }
    }
  }

  async runOnce() {
    const userDataDir = path.join(DATA_DIR, this.linea);
    await mkdir(userDataDir, { recursive: true });
    patchEstado(this.linea, {
      estado: "reconectando",
      conectado: false,
      hook: "none",
      degradado: false,
      motivo_degradado: null,
      ultimo_error: null,
    });

    this.context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: CHROMIUM_PATH,
      headless: HEADLESS,
      viewport: { width: 1365, height: 900 },
      locale: "es-MX",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-sync",
        "--mute-audio",
      ],
    });

    await this.context.route("**/*", async (route) => {
      const req = route.request();
      const url = req.url();
      if (req.method() === "POST" && /send(message|text|media)|presence\/available/i.test(url)) {
        log(this.linea, `bloqueado POST sospechoso: ${url}`);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    await this.installNodeBindings();
    await this.installReadOnlyGuards();
    await this.page.goto(WA_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await this.healthCheck();
    await this.installBrowserHook();

    await new Promise((resolve) => {
      const done = () => resolve();
      const interval = setInterval(() => {
        void this.healthCheck()
          .then(() => this.installBrowserHook())
          .catch((error) => {
            patchEstado(this.linea, {
              estado: "reconectando",
              conectado: false,
              ultimo_error: error instanceof Error ? error.message : String(error),
            });
            clearInterval(interval);
            done();
          });
      }, WATCHDOG_MS);

      this.context.once("close", () => {
        clearInterval(interval);
        done();
      });
      this.page.once("crash", () => {
        clearInterval(interval);
        done();
      });
    });
  }

  async installNodeBindings() {
    await this.page.exposeBinding("hiloEmitMessage", async (_source, raw) => {
      try {
        const inserted = await guardarMensaje(this.linea, raw);
        if (inserted) log(this.linea, "mensaje guardado");
      } catch (error) {
        patchEstado(this.linea, {
          ultimo_error: error instanceof Error ? error.message : String(error),
        });
        log(this.linea, "error guardando mensaje", error instanceof Error ? error.message : error);
      }
    });
    await this.page.exposeBinding("hiloEmitState", async (_source, payload) => {
      if (!payload || typeof payload !== "object") return;
      patchEstado(this.linea, payload);
    });
  }

  async installReadOnlyGuards() {
    await this.page.addInitScript(() => {
      const blockedSelector = [
        "[contenteditable='true']",
        "[aria-label*='Send']",
        "[aria-label*='Enviar']",
        "[data-testid*='send']",
        "[data-icon='send']",
        "footer button",
      ].join(",");
      const stop = (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      document.addEventListener(
        "submit",
        (event) => {
          stop(event);
        },
        true,
      );
      document.addEventListener(
        "keydown",
        (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest(blockedSelector)) stop(event);
        },
        true,
      );
      document.addEventListener(
        "beforeinput",
        (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("[contenteditable='true']")) stop(event);
        },
        true,
      );
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest(blockedSelector)) stop(event);
        },
        true,
      );
    });
  }

  async healthCheck() {
    if (!this.page || this.page.isClosed()) throw new Error("page closed");
    const status = await withTimeout(
      this.page.evaluate(() => {
        const hasQr = Boolean(
          document.querySelector("canvas[aria-label*='QR'], canvas[aria-label*='Scan'], [data-ref]"),
        );
        const hasChatList = Boolean(
          document.querySelector("#pane-side, [data-testid='chat-list'], [aria-label='Chat list'], [aria-label='Lista de chats']"),
        );
        const title = document.title;
        return { hasQr, hasChatList, title, href: location.href };
      }),
      HANG_TIMEOUT_MS,
      "healthCheck",
    );

    if (status.hasQr) {
      patchEstado(this.linea, { estado: "esperando_qr", conectado: false });
      await this.captureQr();
      return;
    }
    if (status.hasChatList) {
      qrPng.delete(this.linea);
      patchEstado(this.linea, { estado: "conectado", conectado: true });
      return;
    }
    patchEstado(this.linea, { estado: "reconectando", conectado: false });
  }

  async captureQr() {
    try {
      const qrData = await this.page.evaluate(() => {
        const withData = document.querySelector("[data-ref]");
        const ref = withData?.getAttribute("data-ref");
        if (ref) return ref;
        const canvas = document.querySelector("canvas[aria-label*='QR'], canvas[aria-label*='Scan'], canvas");
        return canvas?.getAttribute("data-ref") ?? null;
      });
      if (qrData) {
        qrPng.set(this.linea, await QRCode.toBuffer(qrData, { type: "png", margin: 2, scale: 8 }));
        return;
      }
      const canvas = await this.page.$("canvas[aria-label*='QR'], canvas[aria-label*='Scan'], canvas");
      if (canvas) qrPng.set(this.linea, await canvas.screenshot({ type: "png" }));
    } catch (error) {
      patchEstado(this.linea, {
        ultimo_error: `qr: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async installBrowserHook() {
    if (!this.page || this.page.isClosed()) return;
    const result = await withTimeout(
      this.page.evaluate(() => {
        if (window.__hiloHook?.installed) return window.__hiloHook;

        const seen = new Set();
        const safeText = (value, max = 6000) => {
          const s = String(value ?? "").replace(/\s+/g, " ").trim();
          return s.length > max ? `${s.slice(0, max - 1)}...` : s;
        };
        const simpleHash = (value) => {
          let h = 2166136261;
          const s = String(value);
          for (let i = 0; i < s.length; i += 1) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
          }
          return (h >>> 0).toString(16);
        };
        const idString = (value) => {
          if (!value) return null;
          if (typeof value === "string") return value;
          return value._serialized ?? value.serialized ?? value.id ?? value.user ?? String(value);
        };
        const emit = (payload) => {
          const key = payload.id_wa ?? payload.id ?? `${payload.chat_id}|${payload.texto}|${payload.ts}`;
          if (!key || seen.has(key)) return;
          seen.add(key);
          void window.hiloEmitMessage(payload);
        };
        const emitState = (payload) => {
          void window.hiloEmitState(payload);
        };
        const looksLikeMsgCollection = (candidate) => {
          if (!candidate || typeof candidate.on !== "function") return false;
          const models = Array.isArray(candidate.models) ? candidate.models : [];
          return models.some((m) => m && m.id && ("fromMe" in m || "body" in m || "type" in m));
        };
        const flattenExport = (exp) => {
          const out = [];
          if (!exp) return out;
          out.push(exp);
          if (exp.default) out.push(exp.default);
          for (const value of Object.values(exp)) {
            if (value && typeof value === "object") out.push(value);
          }
          return out;
        };
        const webpackRequire = () => {
          const key = Object.keys(window).find((name) => name.startsWith("webpackChunk"));
          const chunk = key ? window[key] : null;
          if (!chunk || typeof chunk.push !== "function") return null;
          let req = null;
          try {
            chunk.push([[`hilo_${Date.now()}`], {}, (r) => {
              req = r;
            }]);
          } catch {
            return null;
          }
          return req;
        };
        const discoverStore = () => {
          if (window.Store?.Msg && typeof window.Store.Msg.on === "function") return window.Store;
          const req = webpackRequire();
          if (!req?.c) return null;
          const exportsList = Object.values(req.c).flatMap((m) => flattenExport(m?.exports));
          const store = {};
          for (const exp of exportsList) {
            if (exp?.Msg && typeof exp.Msg.on === "function") store.Msg = exp.Msg;
            if (exp?.Chat && typeof exp.Chat.get === "function") store.Chat = exp.Chat;
            if (!store.Msg && looksLikeMsgCollection(exp)) store.Msg = exp;
          }
          return store.Msg ? store : null;
        };
        const normalizeStoreMsg = (msg) => {
          const idWa = idString(msg.id) ?? idString(msg._serialized) ?? idString(msg.id_wa);
          const fromMe = Boolean(msg.fromMe);
          const from = idString(msg.from);
          const to = idString(msg.to);
          const remote = idString(msg.id?.remote) ?? idString(msg.chatId) ?? (fromMe ? to : from) ?? from ?? to;
          const chat = window.Store?.Chat?.get?.(remote) ?? msg.chat ?? null;
          return {
            source: "store",
            id_wa: idWa,
            chat_id: remote,
            chat_nombre: chat?.formattedTitle ?? chat?.name ?? msg.notifyName ?? remote,
            es_grupo: Boolean(chat?.isGroup || String(remote ?? "").includes("@g.us")),
            autor: idString(msg.author) ?? idString(msg.senderObj?.id) ?? msg.senderObj?.pushname ?? null,
            de_mi: fromMe,
            tipo: msg.type,
            texto: msg.body ?? msg.caption ?? msg.text ?? "",
            ts: msg.t ?? msg.timestamp ?? Date.now(),
            media_ref: msg.mediaKey ?? msg.clientUrl ?? null,
            media_tipo: msg.mimetype ?? msg.mimeType ?? null,
          };
        };
        const installDomFallback = (reason) => {
          const scanNode = (node, source) => {
            if (!(node instanceof Element)) return;
            const candidates = [];
            if (node.matches("[data-id], [role='row']")) candidates.push(node);
            candidates.push(...node.querySelectorAll("[data-id], [role='row']"));
            for (const el of candidates) {
              const text = safeText(el.textContent ?? "");
              if (!text || text.length < 2) continue;
              const rowTitle = el.querySelector("[title]")?.getAttribute("title");
              const activeTitle =
                rowTitle ??
                document.querySelector("header [title]")?.getAttribute("title") ??
                document.querySelector("#pane-side [title]")?.getAttribute("title") ??
                null;
              const rawId = el.getAttribute("data-id") ?? `${source}:${simpleHash([activeTitle, text].join("|"))}`;
              emit({
                source,
                id_wa: `dom:${rawId}`,
                chat_id: activeTitle ?? "dom-active",
                chat_nombre: activeTitle ?? "Conversacion activa",
                es_grupo: false,
                autor: null,
                de_mi: false,
                tipo: "texto",
                texto: text,
                ts: Date.now(),
              });
            }
          };
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) scanNode(node, "dom");
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          document.querySelectorAll("#pane-side [role='row'], [data-id]").forEach((node) => scanNode(node, "dom-list"));
          const hook = {
            installed: true,
            mode: "dom",
            degradado: true,
            reason,
            at: new Date().toISOString(),
          };
          window.__hiloHook = hook;
          emitState({ hook: "dom", degradado: true, motivo_degradado: reason });
          return hook;
        };

        const store = discoverStore();
        if (store?.Msg && typeof store.Msg.on === "function") {
          window.Store = { ...(window.Store ?? {}), ...store };
          store.Msg.on("add", (msg) => emit(normalizeStoreMsg(msg)));
          const hook = {
            installed: true,
            mode: "store",
            degradado: false,
            reason: null,
            at: new Date().toISOString(),
          };
          window.__hiloHook = hook;
          emitState({ hook: "store", degradado: false, motivo_degradado: null });
          return hook;
        }

        return installDomFallback("No se encontro Store.Msg; WhatsApp Web cambio modulos internos.");
      }),
      HANG_TIMEOUT_MS,
      "installBrowserHook",
    );
    patchEstado(this.linea, {
      hook: result.mode,
      degradado: Boolean(result.degradado),
      motivo_degradado: result.reason ?? null,
    });
  }

  async close() {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
      this.page = null;
    }
  }
}

function publicEstado() {
  const lineas = {};
  for (const [linea, estado] of estados.entries()) {
    lineas[linea] = {
      ...estado,
      qr_disponible: qrPng.has(linea),
    };
  }
  return {
    ok: true,
    readonly: true,
    chromium_path: CHROMIUM_PATH,
    data_dir: DATA_DIR,
    activo: HILO_ACTIVO,
    lineas,
    ts: new Date().toISOString(),
  };
}

function unauthorized(res) {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "unauthorized" }));
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function serveHttp() {
  const server = http.createServer((req, res) => {
    const key = req.headers["x-hilo-key"];
    if (key !== HILO_SECRET) return unauthorized(res);
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
    if (req.method === "GET" && url.pathname === "/estado") {
      return json(res, 200, publicEstado());
    }
    const qrMatch = url.pathname.match(/^\/qr\/([^/]+)$/);
    if (req.method === "GET" && qrMatch) {
      const linea = qrMatch[1];
      if (!LINEAS.includes(linea)) return json(res, 404, { error: "linea desconocida" });
      const png = qrPng.get(linea);
      if (!png) return json(res, 404, { error: "qr no disponible" });
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      });
      res.end(png);
      return undefined;
    }
    return json(res, 404, { error: "not_found" });
  });
  server.listen(PORT, HOST, () => {
    log(null, `api local en http://${HOST}:${PORT}`);
  });
}

async function main() {
  log(null, `servicio desde ${__dirname}`);
  await ensureHiloSchema(db);
  serveHttp();
  if (!HILO_ACTIVO) {
    log(null, "HILO_ACTIVO=0; sesiones WhatsApp apagadas");
    await new Promise(() => {});
    return;
  }
  const sesiones = LINEAS.map((linea) => new LineaWhatsApp(linea));
  await Promise.all(sesiones.map((sesion) => sesion.start()));
}

main().catch((error) => {
  console.error("[hilo] fatal", error);
  process.exit(1);
});
