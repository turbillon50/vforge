import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

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
  const match = /^\/api\/v1\/projects\/([^/]+)\/(live|events|events\/stream|comments)$/.exec(
    pathname,
  );
  if (!match) return null;

  const projectId = cleanProjectId(match[1]);
  if (!projectId) return null;
  return { projectId, resource: match[2] };
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
  return { ok: true, value: date.toISOString() };
}

async function queryEvents(projectId, since, limit = 40, ascending = false) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  if (since) {
    return sql.query(
      `SELECT id, event_type, details, severity, ts
         FROM project_events
        WHERE project_id = $1 AND ts > $2
        ORDER BY ts ${ascending ? "ASC" : "DESC"}
        LIMIT $3`,
      [projectId, since, safeLimit],
    );
  }
  return sql.query(
    `SELECT id, event_type, details, severity, ts
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
    `SELECT id, name, status, desktop_url, mobile_url, admin_url
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
  json(res, 200, {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      desktop_url: project.desktop_url,
      mobile_url: project.mobile_url,
      admin_url: canSeeAdmin ? project.admin_url : null,
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
        cursor = new Date(event.ts).toISOString();
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

async function readJsonBody(req) {
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
    if (size > jsonBodyMaxBytes) {
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

async function liveComments(req, res, projectId) {
  const access = await authorizeProject(req, res, projectId);
  if (!access) return;

  if (req.method === "GET") {
    const comments = await sql.query(
      `SELECT id, author_email, author_name, body, created_at
         FROM project_comments
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [projectId],
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
  const rows = await sql.query(
    `WITH created AS (
       INSERT INTO project_comments
         (project_id, author_clerk_id, author_email, author_name, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, author_email, author_name, body, created_at
     ), activity AS (
       INSERT INTO project_events (project_id, event_type, details, severity)
       SELECT $1,
              'comment.created',
              jsonb_build_object(
                'message', 'Nuevo comentario de ' || COALESCE(author_name, author_email),
                'comment_id', id
              ),
              'low'
         FROM created
     )
     SELECT id, author_email, author_name, body, created_at FROM created`,
    [projectId, access.userId, access.email, access.name, body],
  );

  json(res, 201, { comment: rows[0] });
}

function methodNotAllowed(res, allowed) {
  json(res, 405, { error: "method_not_allowed" }, { Allow: allowed });
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
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
    await liveComments(req, res, route.projectId);
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
