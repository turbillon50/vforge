/**
 * Verificación REAL de conexiones del cliente. Cada función hace una llamada
 * de solo-lectura al servicio con la credencial provista y devuelve la
 * identidad pública (login/usuario/proyectos) si es válida. CERO mock: si el
 * servicio no responde 2xx, la conexión NO se marca verificada.
 */
import type { Service } from "./credentials";

export interface PingResult {
  ok: boolean;
  identity: string | null;
  error: string | null;
}

const TIMEOUT_MS = 12_000;

async function withTimeout(input: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** GitHub: GET /user → login. Token PAT (classic/fine-grained) o OAuth. */
export async function pingGithub(token: string): Promise<PingResult> {
  try {
    const res = await withTimeout("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "vforge-esferas/1.0",
      },
    });
    if (!res.ok) {
      return { ok: false, identity: null, error: `GitHub respondió ${res.status}` };
    }
    const body = (await res.json()) as { login?: string };
    return { ok: true, identity: body.login ?? null, error: null };
  } catch (e) {
    return { ok: false, identity: null, error: netErr(e) };
  }
}

/** Vercel: GET /v2/user → username/email. */
export async function pingVercel(token: string): Promise<PingResult> {
  try {
    const res = await withTimeout("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { ok: false, identity: null, error: `Vercel respondió ${res.status}` };
    }
    const body = (await res.json()) as { user?: { username?: string; email?: string } };
    return { ok: true, identity: body.user?.username ?? body.user?.email ?? null, error: null };
  } catch (e) {
    return { ok: false, identity: null, error: netErr(e) };
  }
}

/** Neon: GET /api/v2/projects → cuenta de proyectos accesibles. */
export async function pingNeon(apiKey: string): Promise<PingResult> {
  try {
    const res = await withTimeout("https://console.neon.tech/api/v2/projects?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, identity: null, error: `Neon respondió ${res.status}` };
    }
    const body = (await res.json()) as { projects?: Array<{ name?: string }> };
    const n = body.projects?.length ?? 0;
    const sample = body.projects?.[0]?.name;
    return { ok: true, identity: sample ? `proyecto: ${sample}` : `${n} proyecto(s)`, error: null };
  } catch (e) {
    return { ok: false, identity: null, error: netErr(e) };
  }
}

export async function pingService(service: Service, secret: string): Promise<PingResult> {
  switch (service) {
    case "github":
      return pingGithub(secret);
    case "vercel":
      return pingVercel(secret);
    case "neon":
      return pingNeon(secret);
  }
}

function netErr(e: unknown): string {
  if (e instanceof Error && e.name === "AbortError") return "timeout de red";
  return "no se pudo contactar al servicio";
}
