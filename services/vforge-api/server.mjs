import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { resolveProjectViewportUrls } from "./viewport-url.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
const internalToken = process.env.VFORGE_API_INTERNAL_TOKEN?.trim();
const host = process.env.HOST?.trim() || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "3110", 10);

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!internalToken) throw new Error("VFORGE_API_INTERNAL_TOKEN is required");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT is invalid");
}

const ownerEmails = new Set(
  (process.env.VFORGE_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const sql = neon(databaseUrl);
const liveRoles = new Set(["owner", "reviewer", "observer"]);
const commentMaxLength = 4_000;
const jsonBodyMaxBytes = 8_192;
const contextMaxLength = 100_000;
const extractedTextMaxLength = 2_097_152;
const assetFinalizeMaxBytes = 2_300_000;
const archiveMaxBytes = 50 * 1024 * 1024;
const archiveContentTypes = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

function json(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  res.end(payload);
}

function hasInternalAccess(req) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(
    String(req.headers.authorization || "").trim(),
  );
  if (!match) return false;

  const provided = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(internalToken, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function cleanProjectId(rawValue) {
  let value;
  try {
    value = decodeURIComponent(rawValue).trim();
  } catch {
    return null;
  }

  if (
    value.length < 1 ||
    value.length > 120 ||
    !/^[a-zA-Z0-9._-]+$/.test(value)
  ) {
    return null;
  }
  return value;
}

function projectRoute(pathname) {
  const match = /^\/api\/v1\/projects\/([^/]+)\/(live|events|events\/stream|comments|context|assets)(?:\/([^/]+))?$/.exec(
    pathname,
  );
  if (!match) return null;

  const projectId = cleanProjectId(match[1]);
  if (!projectId) return null;
  const assetId = match[3] || null;
  if (assetId && match[2] !== "assets") return null;
  if (assetId && !/^[0-9a-f-]{36}$/i.test(assetId)) return null;
  return { projectId, resource: match[2], assetId };
}

function canWriteContext(role) {
  return role === "owner" || role === "reviewer";
}

function cleanAnchor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const viewport = String(value.viewport || "");
  const x = value.x;
  const y = value.y;
  const rawUrl = typeof value.url === "string" ? value.url : "";
  if (
    !["desktop", "mobile", "admin"].includes(viewport) ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 || x > 1 || y < 0 || y > 1 ||
    rawUrl.length > 2048
  ) return null;
  let url;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    url = parsed.href;
  } catch {
    return null;
  }
  const label = typeof value.label === "string"
    ? value.label.replace(/[\r\n]/g, " ").trim().slice(0, 120)
    : "";
  return {
    viewport,
    x: Math.round(x * 10_000) / 10_000,
    y: Math.round(y * 10_000) / 10_000,
    url,
    label: label || `${viewport} · ${Math.round(x * 100)}%, ${Math.round(y * 100)}%`,
  };
}

function requestIdentity(req) {
  const userId = String(req.headers["x-vforge-user-id"] || "").trim();
  const email = String(req.headers["x-vforge-user-email"] || "")
    .trim()
    .toLowerCase();
  const name =
    String(req.headers["x-vforge-user-name"] || "")
      .replace(/[\r\n]/g, " ")
      .trim()
      .slice(0, 160) || email;

  if (
    !userId ||
    userId.length > 200 ||
    !email ||
    email.length > 320 ||
    !email.includes("@")
  ) {
    return null;
  }
  return { userId, email, name };
}

async function health(res) {
  try {
    await sql.query("SELECT 1 AS ok");
    json(res, 200, {
      service: "vforge-api",
      status: "ok",
      database: "ok",
      time: new Date().toISOString(),
    });
  } catch {
    json(res, 503, {
      service: "vforge-api",
      status: "degraded",
      database: "error",
      time: new Date().toISOString(),
    });
  }
}

async function resolveRole(projectId, email) {
  if (ownerEmails.has(email)) return "owner";

  const rows = await sql.query(
    `SELECT role, status, expires_at
       FROM project_live_members
      WHERE project_id = $1 AND lower(email) = lower($2)
      LIMIT 1`,
    [projectId, email],
  );
  const membership = rows[0];
  if (
    !membership ||
    membership.status !== "active" ||
    !liveRoles.has(membership.role)
  ) {
    return null;
  }

  if (
    membership.expires_at &&
    new Date(membership.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }
  return membership.role;
}

async function authorizeProject(req, res, projectId) {
  if (!hasInternalAccess(req)) {
    json(res, 401, { error: "unauthorized" });
    return null;
  }

  const identity = requestIdentity(req);
  if (!identity) {
    json(res, 400, { error: "invalid_identity" });
    return null;
  }

  const role = await resolveRole(projectId, identity.email);
  if (!role) {
    json(res, 404, { error: "not_found" });
    return null;
  }
  return { ...identity, role };
}

function parsedSince(url) {
  const raw = url.searchParams.get("since");
  if (!raw) return { ok: true, value: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { ok: false, value: null };
  return { ok: true, value: raw.trim() };
}

async function queryEvents(projectId, since, limit = 40, ascending = false) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  if (since) {
    return sql.query(
      `SELECT id,
              event_type,
              details,
              severity,
              to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ts
         FROM project_events
        WHERE project_id = $1 AND ts > $2
        ORDER BY ts ${ascending ? "ASC" : "DESC"}
        LIMIT $3`,
      [projectId, since, safeLimit],
    );
  }
  return sql.query(
    `SELECT id,
            event_type,
            details,
            severity,
            to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ts
       FROM project_events
      WHERE project_id = $1
      ORDER BY ts ${ascending ? "ASC" : "DESC"}
      LIMIT $2`,
    [projectId, safeLimit],
  );
}

async function liveProject(req, res, projectId) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  const rows = await sql.query(
    `SELECT id, name, status,
            desktop_url, mobile_url, admin_url, vercel_url, domain
       FROM projects
      WHERE id = $1
      LIMIT 1`,
    [projectId],
  );
  const project = rows[0];
  if (!project) {
    json(res, 404, { error: "not_found" });
    return;
  }

  const canSeeAdmin = access.role === "owner" || access.role === "reviewer";
  const viewports = resolveProjectViewportUrls(project);
  json(res, 200, {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      desktop_url: viewports.desktop_url,
      mobile_url: viewports.mobile_url,
      admin_url: canSeeAdmin ? viewports.admin_url : null,
    },
    me: {
      name: access.name,
      role: access.role,
      isPlatformOwner:
        access.role === "owner" && ownerEmails.has(access.email),
    },
  });
}

async function liveEvents(req, res, projectId, url) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  const since = parsedSince(url);
  if (!since.ok) {
    json(res, 400, { error: "invalid_since" });
    return;
  }

  const events = await queryEvents(projectId, since.value);
  json(res, 200, { events, serverTime: new Date().toISOString() });
}

async function streamEvents(req, res, projectId, url) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  const since = parsedSince(url);
  if (!since.ok) {
    json(res, 400, { error: "invalid_since" });
    return;
  }

  let cursor = since.value || new Date().toISOString();
  let closed = false;
  let pumping = false;

  res.writeHead(200, {
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  });
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");

  const pump = async () => {
    if (closed || pumping) return;
    pumping = true;
    try {
      const events = await queryEvents(projectId, cursor, 100, true);
      for (const event of events) {
        if (closed) break;
        res.write(`data: ${JSON.stringify({ event })}\n\n`);
        cursor = String(event.ts);
      }
    } catch (error) {
      console.error(
        "[vforge-api] event stream poll failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    } finally {
      pumping = false;
    }
  };

  await pump();
  const pollTimer = setInterval(pump, 2_000);
  const heartbeatTimer = setInterval(() => {
    if (!closed) res.write(": heartbeat\n\n");
  }, 15_000);

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
    if (!res.writableEnded) res.end();
  };
  req.once("close", close);
  res.once("close", close);
}

async function readJsonBody(req, maxBytes = jsonBodyMaxBytes) {
  const contentType = String(req.headers["content-type"] || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    const error = new Error("unsupported_media_type");
    error.statusCode = 415;
    throw error;
  }

  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("payload_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("invalid_json");
    error.statusCode = 400;
    throw error;
  }
}

async function liveComments(req, res, projectId, url) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  if (req.method === "GET") {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const comments = await sql.query(
      `SELECT id, author_email, author_name, body, anchor, created_at
         FROM project_comments
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [projectId, limit],
    );
    json(res, 200, { comments });
    return;
  }

  const payload = await readJsonBody(req);
  const rawBody = payload && typeof payload === "object" ? payload.body : null;
  if (typeof rawBody !== "string" || !rawBody.trim()) {
    json(res, 400, { error: "empty" });
    return;
  }
  if (rawBody.length > commentMaxLength) {
    json(res, 413, { error: "too_long" });
    return;
  }

  const body = rawBody.trim();
  const anchor = payload.anchor == null ? null : cleanAnchor(payload.anchor);
  if (payload.anchor != null && !anchor) {
    json(res, 400, { error: "invalid_anchor" });
    return;
  }
  const rows = await sql.query(
    `WITH created AS (
       INSERT INTO project_comments
         (project_id, author_clerk_id, author_email, author_name, body, anchor)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, author_email, author_name, body, anchor, created_at
     ), activity AS (
       INSERT INTO project_events (project_id, event_type, details, severity)
       SELECT $1,
              'comment.created',
              jsonb_build_object(
                'message', 'Nuevo comentario de ' || COALESCE(author_name, author_email),
                'comment_id', id,
                'anchor', anchor
              ),
              'low'
         FROM created
     )
     SELECT id, author_email, author_name, body, anchor, created_at FROM created`,
    [projectId, access.userId, access.email, access.name, body, anchor ? JSON.stringify(anchor) : null],
  );

  json(res, 201, { comment: rows[0] });
}

async function liveContext(req, res, projectId) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  if (req.method === "PUT") {
    if (!canWriteContext(access.role)) {
      json(res, 403, { error: "forbidden" });
      return;
    }
    const payload = await readJsonBody(req, 120_000);
    const content = payload && typeof payload === "object" ? payload.content : null;
    if (typeof content !== "string" || content.length > contextMaxLength) {
      json(res, 400, { error: "invalid_content" });
      return;
    }
    const rows = await sql.query(
      `INSERT INTO project_context_documents (project_id, content, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id) DO UPDATE
         SET content = EXCLUDED.content,
             updated_by = EXCLUDED.updated_by,
             updated_at = now()
       RETURNING content, updated_by, updated_at`,
      [projectId, content, access.email],
    );
    await sql.query(
      `INSERT INTO project_events (project_id, event_type, details, severity)
       VALUES ($1, 'context.updated', jsonb_build_object('message', 'CONTENIDO.md actualizado'), 'low')`,
      [projectId],
    );
    json(res, 200, { document: rows[0] });
    return;
  }

  const [projects, integrations, documents, assets] = await Promise.all([
    sql.query(
      `SELECT id, name, description, github_repo, github_default_branch,
              github_url, vercel_url, domain, status, last_audit_score, last_audit_at
         FROM projects WHERE id = $1 LIMIT 1`,
      [projectId],
    ),
    sql.query(
      `SELECT kind, label, status
         FROM project_integrations
        WHERE project_id = $1
        ORDER BY kind`,
      [projectId],
    ),
    sql.query(
      `SELECT content, updated_by, updated_at
         FROM project_context_documents
        WHERE project_id = $1 LIMIT 1`,
      [projectId],
    ),
    sql.query(
      `SELECT id, filename, content_type, size_bytes, extracted_text_bytes,
              uploaded_by_email, created_at
         FROM project_context_assets
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [projectId],
    ),
  ]);
  if (!projects[0]) {
    json(res, 404, { error: "not_found" });
    return;
  }
  json(res, 200, {
    project: projects[0],
    integrations,
    document: documents[0] || { content: "", updated_by: null, updated_at: null },
    assets,
    me: { role: access.role, canWrite: canWriteContext(access.role) },
  });
}

async function liveAssets(req, res, projectId, assetId) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;
  if (req.method === "GET") {
    if (!assetId) {
      json(res, 404, { error: "not_found" });
      return;
    }
    const rows = await sql.query(
      `SELECT id, filename, blob_pathname, content_type, size_bytes,
              extracted_text_bytes, uploaded_by_email, created_at
         FROM project_context_assets
        WHERE project_id = $1 AND id = $2
        LIMIT 1`,
      [projectId, assetId],
    );
    if (!rows[0]) {
      json(res, 404, { error: "not_found" });
      return;
    }
    json(res, 200, { asset: rows[0] });
    return;
  }
  if (!canWriteContext(access.role)) {
    json(res, 403, { error: "forbidden" });
    return;
  }
  const payload = await readJsonBody(req, assetFinalizeMaxBytes);
  const filename = typeof payload.filename === "string" ? payload.filename.trim().slice(0, 180) : "";
  const blobPathname = typeof payload.blobPathname === "string" ? payload.blobPathname.trim() : "";
  const contentType = typeof payload.contentType === "string" ? payload.contentType.trim().toLowerCase() : "";
  const size = Number(payload.size);
  const extractedText = typeof payload.extractedText === "string" ? payload.extractedText : "";
  const prefix = `context/${projectId}/`;
  if (
    !filename.toLowerCase().endsWith(".zip") ||
    !blobPathname.startsWith(prefix) ||
    blobPathname.includes("..") || blobPathname.includes("\\") ||
    /%2e|%5c/i.test(blobPathname) ||
    !archiveContentTypes.has(contentType) ||
    !Number.isInteger(size) || size < 1 || size > archiveMaxBytes ||
    extractedText.length > extractedTextMaxLength
  ) {
    json(res, 400, { error: "invalid_asset" });
    return;
  }
  const extractedBytes = Buffer.byteLength(extractedText, "utf8");
  const rows = await sql.query(
    `WITH created AS (
       INSERT INTO project_context_assets
         (project_id, filename, blob_pathname, content_type, size_bytes,
          extracted_text, extracted_text_bytes, uploaded_by_user_id, uploaded_by_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, filename, content_type, size_bytes, extracted_text_bytes,
                 uploaded_by_email, created_at
     ), activity AS (
       INSERT INTO project_events (project_id, event_type, details, severity)
       SELECT $1, 'context.archive_uploaded',
              jsonb_build_object('message', 'Conversación de cliente cargada', 'asset_id', id),
              'low'
         FROM created
     )
     SELECT * FROM created`,
    [projectId, filename, blobPathname, contentType, size, extractedText,
      extractedBytes, access.userId, access.email],
  );
  json(res, 201, { asset: rows[0] });
}

function methodNotAllowed(res, allowed) {
  json(res, 405, { error: "method_not_allowed" }, { Allow: allowed });
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }
    json(res, 200, {
      service: "vforge-api",
      status: "ok",
      app: "https://vforge.site",
      health: "https://api.vforge.site/api/v1/health",
      version: "v1",
    });
    return;
  }

  if (url.pathname === "/api/v1/health") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }
    await health(res);
    return;
  }

  const route = projectRoute(url.pathname);
  if (!route) {
    json(res, 404, { error: "not_found" });
    return;
  }

  if (route.resource === "live") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }
    await liveProject(req, res, route.projectId);
    return;
  }

  if (route.resource === "events") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }
    await liveEvents(req, res, route.projectId, url);
    return;
  }

  if (route.resource === "events/stream") {
    if (req.method !== "GET") {
      methodNotAllowed(res, "GET");
      return;
    }
    await streamEvents(req, res, route.projectId, url);
    return;
  }

  if (route.resource === "comments") {
    if (req.method !== "GET" && req.method !== "POST") {
      methodNotAllowed(res, "GET, POST");
      return;
    }
    await liveComments(req, res, route.projectId, url);
    return;
  }

  if (route.resource === "context") {
    if (req.method !== "GET" && req.method !== "PUT") {
      methodNotAllowed(res, "GET, PUT");
      return;
    }
    await liveContext(req, res, route.projectId);
    return;
  }

  if (route.resource === "assets") {
    if (req.method !== "POST" && req.method !== "GET") {
      methodNotAllowed(res, "GET, POST");
      return;
    }
    await liveAssets(req, res, route.projectId, route.assetId);
    return;
  }

  json(res, 404, { error: "not_found" });
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    const status =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 500;
    if (status === 500) {
      console.error(
        "[vforge-api] request failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
    if (!res.headersSent) {
      json(res, status, {
        error: status === 500 ? "internal_error" : error.message,
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;

server.listen(port, host, () => {
  console.log(`[vforge-api] listening on ${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[vforge-api] stopping on ${signal}`);
  server.close(() => process.exit(0));
  setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
