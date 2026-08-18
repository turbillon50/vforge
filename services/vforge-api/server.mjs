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

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "X-Content-Type-Options": "nosniff",
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

function projectIdFrom(pathname) {
  const match = /^\/api\/v1\/projects\/([^/]+)\/live$/.exec(pathname);
  if (!match) return null;

  let value;
  try {
    value = decodeURIComponent(match[1]).trim();
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

async function liveProject(req, res, projectId) {
  if (!hasInternalAccess(req)) {
    json(res, 401, { error: "unauthorized" });
    return;
  }

  const userId = String(req.headers["x-vforge-user-id"] || "").trim();
  const email = String(req.headers["x-vforge-user-email"] || "")
    .trim()
    .toLowerCase();
  const name =
    String(req.headers["x-vforge-user-name"] || "").trim().slice(0, 160) ||
    email;

  if (!userId || userId.length > 200 || !email || email.length > 320) {
    json(res, 400, { error: "invalid_identity" });
    return;
  }

  const role = await resolveRole(projectId, email);
  if (!role) {
    json(res, 404, { error: "not_found" });
    return;
  }

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

  const canSeeAdmin = role === "owner" || role === "reviewer";
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
      name,
      role,
      isPlatformOwner: role === "owner" && ownerEmails.has(email),
    },
  });
}

async function handle(req, res) {
  if (req.method !== "GET") {
    json(res, 404, { error: "not_found" });
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/api/v1/health") {
    await health(res);
    return;
  }

  const projectId = projectIdFrom(url.pathname);
  if (projectId) {
    await liveProject(req, res, projectId);
    return;
  }

  json(res, 404, { error: "not_found" });
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(
      "[vforge-api] request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    if (!res.headersSent) json(res, 500, { error: "internal_error" });
    else res.end();
  });
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

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
