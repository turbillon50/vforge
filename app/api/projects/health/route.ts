/**
 * Sondeo real de los dominios del catálogo.
 *
 * GET  → cuántos dominios hay, cuántos están sondeados y con qué antigüedad.
 * POST → sondea por tandas los que llevan más tiempo sin medirse y guarda el
 *        resultado en `project_health_checks` (una fila por proyecto, la última
 *        medición). Devuelve `restantes` para que la pantalla pueda seguir
 *        llamando hasta terminar sin pasarse del tiempo de la función.
 *
 * Es la señal que permite decir "Producción" sin que nadie lo escriba a mano:
 * dominio que responde 2xx + deploy en Vercel (ver lib/projects/estado-real.ts).
 */
import { queryAll, queryOne, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { requireOperatorAuth } from "@/lib/auth/operator-token";
import { ensureEstadoRealSchema } from "@/lib/projects/estado-schema";
import { VIGENCIA_SONDEO_MS } from "@/lib/projects/estado-real";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TANDA = 30;
const TANDA_MAX = 100;
const ESPERA_MS = 8000;
const EN_PARALELO = 8;

interface Objetivo {
  id: string;
  url: string;
}

async function quien(req: Request): Promise<{ userId: string } | Response> {
  const token = requireOperatorAuth(req);
  if (token.ok) return { userId: token.userId };
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  return { userId: access.userId };
}

function url(domain: string): string {
  const t = domain.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export async function GET(req: Request) {
  const acceso = await quien(req);
  if (acceso instanceof Response) return acceso;
  await ensureEstadoRealSchema();

  const row = await queryOne<{
    con_dominio: number;
    sondeados: number;
    vigentes: number;
    vivos: number;
    ultimo: string | null;
  }>(
    `SELECT count(*)::int AS con_dominio,
            count(h.project_id)::int AS sondeados,
            count(h.project_id) FILTER (WHERE h.checked_at > now() - $1::interval)::int AS vigentes,
            count(h.project_id) FILTER (WHERE h.ok)::int AS vivos,
            max(h.checked_at)::text AS ultimo
       FROM projects p
       LEFT JOIN project_health_checks h ON h.project_id = p.id
      WHERE trim(coalesce(p.domain, '')) <> ''`,
    [`${Math.round(VIGENCIA_SONDEO_MS / 1000)} seconds`],
  );

  return Response.json(row ?? {}, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const acceso = await quien(req);
  if (acceso instanceof Response) return acceso;
  await ensureEstadoRealSchema();

  const body = (await req.json().catch(() => null)) as { limite?: number; todos?: boolean } | null;
  const limite = Math.max(1, Math.min(TANDA_MAX, Number(body?.limite) || TANDA));
  const vigencia = `${Math.round(VIGENCIA_SONDEO_MS / 1000)} seconds`;

  // Los que nunca se sondearon primero; luego los más viejos. Con `todos` se
  // fuerza la remedición completa.
  const objetivos = await queryAll<Objetivo>(
    `SELECT p.id, trim(p.domain) AS url
       FROM projects p
       LEFT JOIN project_health_checks h ON h.project_id = p.id
      WHERE trim(coalesce(p.domain, '')) <> ''
        ${body?.todos ? "" : "AND (h.checked_at IS NULL OR h.checked_at <= now() - $2::interval)"}
      ORDER BY h.checked_at ASC NULLS FIRST, p.id
      LIMIT $1`,
    body?.todos ? [limite] : [limite, vigencia],
  );

  const resultados: Array<{ id: string; status: number | null; ok: boolean; error?: string }> = [];
  for (let i = 0; i < objetivos.length; i += EN_PARALELO) {
    const tanda = objetivos.slice(i, i + EN_PARALELO);
    const medidas = await Promise.all(tanda.map((o) => sondear(o)));
    for (const m of medidas) {
      await sql`
        INSERT INTO project_health_checks (project_id, url, http_status, ok, ms, error, checked_at)
        VALUES (${m.id}, ${m.url}, ${m.status}, ${m.ok}, ${m.ms}, ${m.error}, now())
        ON CONFLICT (project_id) DO UPDATE SET
          url = EXCLUDED.url,
          http_status = EXCLUDED.http_status,
          ok = EXCLUDED.ok,
          ms = EXCLUDED.ms,
          error = EXCLUDED.error,
          checked_at = now()
      `;
      resultados.push({ id: m.id, status: m.status, ok: m.ok, error: m.error ?? undefined });
    }
  }

  const pendientes = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM projects p
       LEFT JOIN project_health_checks h ON h.project_id = p.id
      WHERE trim(coalesce(p.domain, '')) <> ''
        AND (h.checked_at IS NULL OR h.checked_at <= now() - $1::interval)`,
    [vigencia],
  );

  return Response.json(
    {
      sondeados: resultados.length,
      vivos: resultados.filter((r) => r.ok).length,
      restantes: pendientes?.n ?? 0,
      resultados,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function sondear(o: Objetivo): Promise<{
  id: string;
  url: string;
  status: number | null;
  ok: boolean;
  ms: number;
  error: string | null;
}> {
  const destino = url(o.url);
  const t0 = Date.now();
  try {
    // HEAD primero (barato); varios hosts no lo soportan y contestan 405: en
    // ese caso se reintenta con GET para no marcar muerto lo que está vivo.
    let res = await fetch(destino, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(ESPERA_MS),
      headers: { "User-Agent": "VForge-health/1.0" },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(destino, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(ESPERA_MS),
        headers: { "User-Agent": "VForge-health/1.0" },
      });
    }
    return {
      id: o.id,
      url: destino,
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      ms: Date.now() - t0,
      error: null,
    };
  } catch (e) {
    return {
      id: o.id,
      url: destino,
      status: null,
      ok: false,
      ms: Date.now() - t0,
      error: (e instanceof Error ? e.message : String(e)).slice(0, 200),
    };
  }
}
