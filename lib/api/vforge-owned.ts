import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { LiveRole } from "@/lib/projects/roles";

const defaultOrigin = "https://api.vforge.site";
const requestTimeoutMs = 10_000;

export interface VForgeIdentity {
  userId: string;
  email: string;
  name: string;
}

export interface VForgeLivePayload {
  project: {
    id: string;
    name: string;
    status: string;
    desktop_url: string | null;
    mobile_url: string | null;
    admin_url: string | null;
  };
  me: {
    name: string;
    role: LiveRole;
    isPlatformOwner: boolean;
  };
}

function safeHeader(value: string, maxLength: number): string {
  return value.replace(/[\r\n]/g, " ").trim().slice(0, maxLength);
}

function apiOrigin(): URL {
  const configured = process.env.VFORGE_API_ORIGIN?.trim() || defaultOrigin;
  const origin = new URL(configured);
  const isLocal = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";

  if ((origin.protocol !== "https:" && !isLocal) || origin.username || origin.password) {
    throw new Error("VFORGE_API_ORIGIN is invalid");
  }
  origin.pathname = "/";
  origin.search = "";
  origin.hash = "";
  return origin;
}

function internalToken(): string {
  const token = process.env.VFORGE_API_INTERNAL_TOKEN?.trim();
  if (!token) throw new Error("VFORGE_API_INTERNAL_TOKEN is required");
  return token;
}

export async function getCurrentVForgeIdentity(): Promise<VForgeIdentity | null> {
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    return null;
  }
  if (!user) return null;

  const primary = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  const email = (primary?.emailAddress || user.emailAddresses[0]?.emailAddress)
    ?.trim()
    .toLowerCase();
  if (!email) return null;

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name = fullName || user.username || email;

  return {
    userId: safeHeader(user.id, 200),
    email: safeHeader(email, 320),
    name: safeHeader(name, 160),
  };
}

export function projectApiPath(
  projectId: string,
  resource: "live" | "events" | "events/stream" | "comments" | "context" | "assets",
): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/${resource}`;
}

export function projectAssetApiPath(projectId: string, assetId: string): string {
  return `${projectApiPath(projectId, "assets")}/${encodeURIComponent(assetId)}`;
}

export async function fetchVForgeApi(
  path: string,
  identity: VForgeIdentity,
  init: RequestInit = {},
): Promise<Response> {
  if (!path.startsWith("/api/v1/") || path.startsWith("//")) {
    throw new Error("VForge API path is invalid");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${internalToken()}`);
  headers.set("X-VForge-User-Id", safeHeader(identity.userId, 200));
  headers.set("X-VForge-User-Email", safeHeader(identity.email, 320));
  headers.set("X-VForge-User-Name", safeHeader(identity.name, 160));
  headers.set("Accept", headers.get("Accept") || "application/json");

  return fetch(new URL(path, apiOrigin()), {
    ...init,
    headers,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(requestTimeoutMs),
  });
}

function isLiveRole(value: unknown): value is LiveRole {
  return value === "owner" || value === "reviewer" || value === "observer";
}

function isLivePayload(value: unknown): value is VForgeLivePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<VForgeLivePayload>;
  return Boolean(
    payload.project &&
      typeof payload.project.id === "string" &&
      typeof payload.project.name === "string" &&
      typeof payload.project.status === "string" &&
      payload.me &&
      typeof payload.me.name === "string" &&
      isLiveRole(payload.me.role) &&
      typeof payload.me.isPlatformOwner === "boolean",
  );
}

export async function loadVForgeLiveProject(
  projectId: string,
): Promise<VForgeLivePayload | null> {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return null;

  const response = await fetchVForgeApi(
    projectApiPath(projectId, "live"),
    identity,
  );
  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`VForge API returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isLivePayload(payload) || payload.project.id !== projectId) {
    throw new Error("VForge API returned an invalid live payload");
  }
  return payload;
}

export function mirrorJsonResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
