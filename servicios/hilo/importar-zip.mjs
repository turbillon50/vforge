#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { Buffer } from "node:buffer";
import { unzipSync } from "fflate";

const MAX_ENTRIES = 20_000;
const MAX_TEXT_BYTES = 20 * 1024 * 1024;
const ZIP_ID_PREFIX = "zip:";

const MEDIA_EXTENSIONS = new Map([
  ["jpg", ["imagen", "image/jpeg"]],
  ["jpeg", ["imagen", "image/jpeg"]],
  ["png", ["imagen", "image/png"]],
  ["gif", ["imagen", "image/gif"]],
  ["webp", ["imagen", "image/webp"]],
  ["heic", ["imagen", "image/heic"]],
  ["opus", ["audio", "audio/opus"]],
  ["ogg", ["audio", "audio/ogg"]],
  ["mp3", ["audio", "audio/mpeg"]],
  ["m4a", ["audio", "audio/mp4"]],
  ["aac", ["audio", "audio/aac"]],
  ["wav", ["audio", "audio/wav"]],
  ["pdf", ["documento", "application/pdf"]],
  ["doc", ["documento", "application/msword"]],
  ["docx", ["documento", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
  ["xls", ["documento", "application/vnd.ms-excel"]],
  ["xlsx", ["documento", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]],
  ["ppt", ["documento", "application/vnd.ms-powerpoint"]],
  ["pptx", ["documento", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]],
  ["csv", ["documento", "text/csv"]],
  ["txt", ["documento", "text/plain"]],
  ["zip", ["documento", "application/zip"]],
]);

function cleanInvisible(value) {
  return String(value ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
    .replace(/\0/g, "");
}

function trimText(value, max = 6000) {
  const s = cleanInvisible(value).trim();
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function extname(name) {
  const ext = path.extname(name).replace(/^\./, "").toLowerCase();
  return ext || "";
}

function mediaInfo(filename) {
  const ext = extname(filename);
  const known = MEDIA_EXTENSIONS.get(ext);
  if (known) return { tipo: known[0], media_tipo: known[1] };
  return { tipo: "documento", media_tipo: ext ? `application/octet-stream; ext=${ext}` : "application/octet-stream" };
}

function isTextEntry(name) {
  const base = path.basename(name).toLowerCase();
  return base.endsWith(".txt");
}

function isLikelyChatText(name) {
  const clean = path.basename(name).toLowerCase();
  return (
    clean === "_chat.txt" ||
    clean.startsWith("whatsapp chat") ||
    clean.startsWith("chat de whatsapp") ||
    clean.includes("whatsapp") ||
    clean.includes("chat")
  );
}

function decodeText(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(start));
}

export function leerZipWhatsApp(input) {
  // fflate ya es dependencia de VForge: el importador corre igual en la ruta de
  // Next (Vercel) que en el servicio del Hetzner, sin paquetes extra.
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const datos = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return new Promise((resolve, reject) => {
    try {
      const entries = [];
      let selected = null;
      let count = 0;
      // Primera pasada: sólo listar (no descomprime nada).
      unzipSync(datos, {
        filter: (file) => {
          count += 1;
          if (count > MAX_ENTRIES) throw new Error(`ZIP demasiado grande: mas de ${MAX_ENTRIES} entradas`);
          if (file.name.endsWith("/")) return false;
          entries.push({ name: cleanInvisible(file.name), size: file.originalSize });
          if (isTextEntry(file.name)) {
            const score = isLikelyChatText(file.name) ? 2 : 1;
            if (!selected || score > selected.score || (score === selected.score && file.originalSize > selected.size)) {
              selected = { name: file.name, size: file.originalSize, score };
            }
          }
          return false;
        },
      });
      if (!selected) throw new Error("El ZIP no trae un archivo .txt de chat de WhatsApp");
      if (selected.size > MAX_TEXT_BYTES) throw new Error(`El TXT de WhatsApp supera ${MAX_TEXT_BYTES} bytes`);
      // Segunda pasada: descomprime sólo el TXT elegido.
      const salida = unzipSync(datos, { filter: (file) => file.name === selected.name });
      const contenido = salida[selected.name];
      if (!contenido) throw new Error("No pude leer el TXT del ZIP");
      resolve({
        textFile: { name: cleanInvisible(selected.name), size: selected.size },
        text: decodeText(Buffer.from(contenido)),
        entries,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      reject(new Error(mensaje.startsWith("El ") || mensaje.startsWith("ZIP") || mensaje.startsWith("No ") ? mensaje : `ZIP invalido: ${mensaje}`));
    }
  });
}

function inferLanguageFromName(name) {
  const lower = cleanInvisible(name).toLowerCase();
  if (lower.includes("chat de whatsapp") || lower.includes("adjunto")) return "es";
  if (lower.includes("whatsapp chat") || lower.includes("media omitted")) return "en";
  return "es";
}

function normalizeAmPm(value) {
  const s = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^apm]/g, "");
  if (s === "am" || s === "a") return "am";
  if (s === "pm" || s === "p") return "pm";
  return null;
}

function parseTimestamp(raw, languageHint) {
  const clean = cleanInvisible(raw).replace(/\s+/g, " ").trim();
  const match = clean.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([^0-9]*)$/i,
  );
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  let year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const secondPart = Number(match[6] ?? "0");
  const ampm = normalizeAmPm(match[7]);

  if (year < 100) year += year >= 70 ? 1900 : 2000;
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  let day;
  let month;
  if (first > 12) {
    day = first;
    month = second;
  } else if (second > 12) {
    month = first;
    day = second;
  } else if (languageHint === "en") {
    month = first;
    day = second;
  } else {
    day = first;
    month = second;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, secondPart));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  // El export trae hora local del teléfono, sin zona. Luis vive en Cancún
  // (UTC-5 todo el año); HILO_TZ_OFFSET_MIN la cambia si hace falta.
  const offsetMin = Number(process.env.HILO_TZ_OFFSET_MIN ?? -300);
  return new Date(date.getTime() - (Number.isFinite(offsetMin) ? offsetMin : -300) * 60_000).toISOString();
}

function splitTimestampLine(line, languageHint) {
  const clean = cleanInvisible(line);
  const bracketed = clean.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketed) {
    const ts = parseTimestamp(bracketed[1], languageHint);
    if (ts) return { ts, rest: bracketed[2] ?? "", bracketed: true };
  }

  const unbracketed = clean.match(
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?|[AaPp][Mm])?)\s+-\s+([\s\S]*)$/,
  );
  if (!unbracketed) return null;
  const ts = parseTimestamp(unbracketed[1], languageHint);
  return ts ? { ts, rest: unbracketed[2] ?? "", bracketed: false } : null;
}

function splitAuthor(rest) {
  const clean = cleanInvisible(rest).trim();
  const match = clean.match(/^([^:\n]{1,180}):\s*([\s\S]*)$/);
  if (!match) {
    return { autor: null, texto: clean, sistema: true };
  }
  return {
    autor: trimText(match[1], 240),
    texto: trimText(match[2], 6000),
    sistema: false,
  };
}

function attachmentFromText(text) {
  const clean = cleanInvisible(text).trim();
  const attached = clean.match(/^<\s*(?:adjunto|attached|archivo adjunto|media attached)\s*:\s*([^>]+?)\s*>/i);
  if (attached) return attached[1].trim();
  return null;
}

function isMediaOmitted(text) {
  return /<\s*(?:media omitted|multimedia omitid[ao]|imagen omitida|video omitido|audio omitido)\s*>/i.test(
    cleanInvisible(text),
  );
}

function classify(text, attachmentName) {
  if (attachmentName) {
    return mediaInfo(attachmentName);
  }
  if (isMediaOmitted(text)) {
    return { tipo: "otro", media_tipo: "media/omitted" };
  }
  return cleanInvisible(text).trim() ? { tipo: "texto", media_tipo: null } : { tipo: "otro", media_tipo: null };
}

function detectChatName(textFileName, participants) {
  const base = cleanInvisible(path.basename(textFileName, path.extname(textFileName))).trim();
  const parent = cleanInvisible(path.basename(path.dirname(textFileName))).trim();
  const candidates = [base, parent].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/^WhatsApp Chat with\s+/i, "")
      .replace(/^Chat de WhatsApp con\s+/i, "")
      .replace(/^_chat$/i, "")
      .trim();
    if (normalized && normalized !== "." && normalized !== "/") return normalized;
  }

  if (participants.length) return participants.slice(0, 3).join(", ");
  return "Chat WhatsApp";
}

function buildMessages(text, textFileName) {
  const languageHint = inferLanguageFromName(textFileName);
  const lines = cleanInvisible(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const parsed = [];

  for (const line of lines) {
    const first = splitTimestampLine(line, languageHint);
    if (first) {
      const body = splitAuthor(first.rest);
      parsed.push({
        ts: first.ts,
        autor: body.autor,
        texto: body.texto,
        sistema: body.sistema,
      });
      continue;
    }
    if (parsed.length === 0) continue;
    const prev = parsed[parsed.length - 1];
    prev.texto = trimText([prev.texto, cleanInvisible(line)].filter(Boolean).join("\n"), 6000);
  }

  return parsed.filter((message) => message.texto || message.autor);
}

function attachmentsFromEntries(entries, textFileName) {
  const txt = cleanInvisible(textFileName);
  return entries
    .filter((entry) => entry.name !== txt && !isTextEntry(entry.name))
    .map((entry) => {
      const info = mediaInfo(entry.name);
      return {
        nombre: entry.name,
        tipo: info.tipo,
        media_tipo: info.media_tipo,
      };
    });
}

export function parseWhatsAppChatText(text, options = {}) {
  const textFileName = options.textFileName ?? "_chat.txt";
  const rawMessages = buildMessages(text, textFileName);
  const participants = [...new Set(rawMessages.map((m) => m.autor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const chatNombre = trimText(options.chatNombre ?? detectChatName(textFileName, participants), 240);
  const chatIdentity = [options.projectId ?? "", chatNombre, participants.join("|")].join("|");
  const hiloChatId = `${ZIP_ID_PREFIX}${hash(chatIdentity).slice(0, 32)}`;
  const chatId = `${ZIP_ID_PREFIX}${hash([chatNombre, participants.join("|")].join("|")).slice(0, 32)}`;

  const messages = rawMessages.map((message) => {
    const attachmentName = attachmentFromText(message.texto);
    const info = classify(message.texto, attachmentName);
    const bodyText = trimText(message.texto, 6000);
    const idHash = hash([chatId, message.autor ?? "sistema", message.ts, bodyText].join("|"));
    return {
      uid: `${ZIP_ID_PREFIX}${idHash}`,
      linea: null,
      chat_id: chatId,
      chat_nombre: chatNombre,
      es_grupo: participants.length > 2,
      autor: message.autor,
      de_mi: false,
      tipo: message.sistema ? "otro" : info.tipo,
      texto: bodyText,
      ts: message.ts,
      id_wa: `${ZIP_ID_PREFIX}${idHash}`,
      media_ref: attachmentName,
      media_tipo: info.media_tipo,
      origen: "zip",
      hilo_chat_id: hiloChatId,
      raw: {
        source: "zip",
        origen: "zip",
        sistema: message.sistema,
        text_file: textFileName,
        attachment_name: attachmentName,
      },
    };
  });

  const timestamps = messages.map((message) => message.ts).sort();
  return {
    chat: {
      id: hiloChatId,
      linea: null,
      chat_id: chatId,
      chat_nombre: chatNombre,
      origen: "zip",
    },
    participants,
    range: {
      desde: timestamps[0] ?? null,
      hasta: timestamps[timestamps.length - 1] ?? null,
    },
    messages,
  };
}

export async function importarZipWhatsApp(input, options = {}) {
  const zip = await leerZipWhatsApp(input);
  const parsed = parseWhatsAppChatText(zip.text, {
    projectId: options.projectId,
    chatNombre: options.chatNombre,
    textFileName: zip.textFile.name,
  });
  const attachments = attachmentsFromEntries(zip.entries, zip.textFile.name);
  return {
    ...parsed,
    textFile: zip.textFile,
    attachments,
    source: {
      filename: options.filename ?? null,
      entries: zip.entries.length,
    },
  };
}
