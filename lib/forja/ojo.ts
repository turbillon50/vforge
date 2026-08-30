"server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

const DEFAULT_OJO_BASE = "https://metamcp.vforge.site/ojo";
const REQUEST_TIMEOUT_MS = 20_000;

function resolveOjoBase(): string {
  const raw = (process.env.OJO_BASE ?? DEFAULT_OJO_BASE).trim();
  const url = new URL(raw);
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (url.protocol !== "https:" && !isLocalDev) {
    throw new Error("OJO_BASE must use HTTPS outside local development");
  }

  return url.toString().replace(/\/$/, "");
}

function requireOjoToken(): string {
  const token = process.env.OJO_TOKEN?.trim();
  if (!token) {
    throw new Error("OJO_TOKEN is required");
  }
  return token;
}

function resolveOjoUrl(path: string): string {
  const relative = path.trim().replace(/^\/+/, "");
  if (
    !relative ||
    /^[a-z][a-z\d+.-]*:/i.test(relative) ||
    relative.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(relative)
  ) {
    throw new Error("Invalid Ojo path");
  }

  const pathname = relative.split(/[?#]/, 1)[0];
  if (pathname.split("/").some((segment) => segment === "..")) {
    throw new Error("Invalid Ojo path");
  }

  const base = `${OJO_BASE}/`;
  const url = new URL(relative, base);
  if (!url.toString().startsWith(base)) {
    throw new Error("Invalid Ojo path");
  }
  return url.toString();
}

export const OJO_BASE = resolveOjoBase();

/** Solo el owner (Luis/Jaime) puede tocar la Forja. */
export async function isOwnerRequest(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    return isOwnerUser(u);
  } catch {
    return false;
  }
}

/** GET a un path del Ojo con el token exclusivamente en header. */
export async function ojoGet(path: string): Promise<Response> {
  return fetch(resolveOjoUrl(path), {
    headers: { "X-Ojo-Token": requireOjoToken() },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** POST a un path del Ojo con el token exclusivamente en header. */
export async function ojoPost(path: string, body: unknown): Promise<Response> {
  return fetch(resolveOjoUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ojo-Token": requireOjoToken(),
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}
