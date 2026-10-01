import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import { publishUnicornEvent } from "@/lib/mcp/unicorn-shared.mjs";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";
import {
  PROJECT_ETAPA_LABELS,
  isProjectEtapa,
  type ProjectEtapa,
  type ProjectEtapaHistoryItem,
} from "@/lib/projects/etapas";

interface ProjectEtapaRow {
  id: string;
  name: string;
  etapa: ProjectEtapa | null;
  demo_url: string | null;
  contrato_url: string | null;
}

export interface SetProjectEtapaArgs {
  projectId: string;
  etapa: ProjectEtapa;
  nota?: string | null;
  creadoPor?: string | null;
  demoUrl?: string | null;
  contratoUrl?: string | null;
  insertWhenSame?: boolean;
}

interface SetProjectEtapaResult {
  project: ProjectEtapaRow;
  previous: ProjectEtapa | null;
  changed: boolean;
  history: ProjectEtapaHistoryItem | null;
}

function cleanText(value: string | null | undefined, max: number) {
  const text = value?.replace(/\s+/g, " ").trim().slice(0, max) ?? "";
  return text || null;
}

export function cleanUrl(value: string | null | undefined) {
  const text = cleanText(value, 500);
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function dbForUnicorn() {
  return {
    query: <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
      queryAll<T>(text, params ?? []),
  };
}

export async function listProjectEtapas(projectId: string) {
  await ensureProjectCarteraSchema();
  return queryAll<ProjectEtapaHistoryItem>(
    `SELECT id::text, project_id, etapa, nota, creado_por,
            to_char(creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS creado_en
       FROM project_etapas
      WHERE project_id = $1
      ORDER BY creado_en ASC, id ASC`,
    [projectId],
  );
}

export async function setProjectEtapa({
  projectId,
  etapa,
  nota,
  creadoPor,
  demoUrl,
  contratoUrl,
  insertWhenSame,
}: SetProjectEtapaArgs): Promise<SetProjectEtapaResult | null> {
  await ensureProjectCarteraSchema();
  if (!isProjectEtapa(etapa)) return null;

  const current = await queryOne<ProjectEtapaRow>(
    `SELECT id, name, etapa, demo_url, contrato_url
       FROM projects
      WHERE id = $1
        AND COALESCE(es_demo, false) = false
      LIMIT 1`,
    [projectId],
  );
  if (!current) return null;

  const nextDemoUrl = demoUrl === undefined ? current.demo_url : cleanUrl(demoUrl);
  const nextContratoUrl = contratoUrl === undefined ? current.contrato_url : cleanUrl(contratoUrl);
  const changed =
    current.etapa !== etapa ||
    nextDemoUrl !== current.demo_url ||
    nextContratoUrl !== current.contrato_url;

  if (!changed && !insertWhenSame) {
    return { project: current, previous: current.etapa, changed: false, history: null };
  }

  const updated = await queryOne<ProjectEtapaRow>(
    `UPDATE projects
        SET etapa = $1,
            demo_url = $2,
            contrato_url = $3,
            updated_at = now()
      WHERE id = $4
      RETURNING id, name, etapa, demo_url, contrato_url`,
    [etapa, nextDemoUrl, nextContratoUrl, projectId],
  );
  if (!updated) return null;

  const cleanNota = cleanText(nota, 1000);
  const history = await queryOne<ProjectEtapaHistoryItem>(
    `INSERT INTO project_etapas (project_id, etapa, nota, creado_por)
     VALUES ($1, $2, $3, $4)
     RETURNING id::text, project_id, etapa, nota, creado_por,
       to_char(creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS creado_en`,
    [projectId, etapa, cleanNota, cleanText(creadoPor, 160)],
  );

  const detalle = {
    anterior: current.etapa,
    nueva: etapa,
    nota: cleanNota,
    demo_url: nextDemoUrl,
    contrato_url: nextContratoUrl,
  };

  await publishUnicornEvent(
    dbForUnicorn(),
    {
      proyecto: projectId,
      tipo: "etapa",
      titulo: `Etapa: ${PROJECT_ETAPA_LABELS[etapa]}`,
      detalle,
      origen: "vforge",
    },
    { autor: creadoPor ?? null, defaultOrigen: "vforge" },
  );

  await queryAll(
    `INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
     VALUES ($1, 'project.etapa.change', 'project', $2, 1, $3::jsonb)`,
    [creadoPor ?? null, projectId, JSON.stringify(detalle)],
  );

  return {
    project: updated,
    previous: current.etapa,
    changed,
    history,
  };
}
