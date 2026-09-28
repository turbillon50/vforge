"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconLoader, IconRocket, IconX } from "@/components/brand/VFIcons";

/**
 * Control del preview vivo: historial de lo que se cambió, deshacer al instante,
 * comparar antes/después y Publicar.
 *
 * Publicar es el único botón que toca la rama de producción, y pide confirmación
 * escribiendo el nombre del proyecto: es lo que dispara el build de Vercel.
 */

type Commit = {
  sha: string;
  asunto: string;
  fecha: string;
  autor: string;
  delEstudio: boolean;
};

type EstadoRepo = {
  rama?: string;
  pendientes?: number;
  ramaProduccion?: string | null;
  ultimo?: { sha: string; asunto: string; fecha: string } | null;
};

async function pedirGit(proyecto: string, accion: string, extra: Record<string, unknown> = {}) {
  const respuesta = await fetch("/api/vivo/git", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proyecto, accion, ...extra }),
  });
  const datos = (await respuesta.json()) as Record<string, unknown> & { error?: string };
  if (!respuesta.ok) throw new Error(datos.error ?? `HTTP ${respuesta.status}`);
  return datos;
}

function haceCuanto(iso: string): string {
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return `hace ${seg}s`;
  if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.round(seg / 3600)} h`;
  return `hace ${Math.round(seg / 86400)} d`;
}

export function PanelControl({
  proyecto,
  refrescar,
  onCerrar,
  onCambio,
}: {
  proyecto: string;
  refrescar: number;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [estado, setEstado] = useState<EstadoRepo | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [diff, setDiff] = useState<{ sha: string | null; texto: string; cortado: boolean } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [escrito, setEscrito] = useState("");

  // `conservarAviso` existe porque deshacer y publicar dejan un mensaje y luego
  // releen el repo: si releer borrara el aviso, el mensaje se iría antes de que
  // alcance a leerse (pasó de verdad, se vio en la prueba en WebKit).
  const leer = useCallback(async ({ conservarAviso = false } = {}) => {
    if (!proyecto) return;
    setCargando(true);
    if (!conservarAviso) setAviso(null);
    try {
      const [e, h] = await Promise.all([
        pedirGit(proyecto, "estado"),
        pedirGit(proyecto, "historial", { limite: 20 }),
      ]);
      setEstado(e as EstadoRepo);
      setCommits(Array.isArray(h.commits) ? (h.commits as Commit[]) : []);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No pude leer el historial.");
    } finally {
      setCargando(false);
    }
  }, [proyecto]);

  useEffect(() => {
    void leer();
  }, [leer, refrescar]);

  const verDiff = useCallback(
    async (sha: string | null) => {
      setOcupado("diff");
      setAviso(null);
      try {
        const r = await pedirGit(proyecto, "comparar", sha ? { sha } : {});
        setDiff({ sha, texto: String(r.diff ?? ""), cortado: Boolean(r.cortado) });
      } catch (error) {
        setAviso(error instanceof Error ? error.message : "No pude traer la comparación.");
      } finally {
        setOcupado(null);
      }
    },
    [proyecto],
  );

  const deshacer = useCallback(async () => {
    setOcupado("deshacer");
    setAviso(null);
    try {
      const r = await pedirGit(proyecto, "deshacer");
      setAviso(`Deshecho. El proyecto quedó en ${String(r.ahoraEn ?? "?")}.`);
      setDiff(null);
      await leer({ conservarAviso: true });
      onCambio();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No pude deshacer.");
    } finally {
      setOcupado(null);
    }
  }, [proyecto, leer, onCambio]);

  const publicar = useCallback(async () => {
    setOcupado("publicar");
    setAviso(null);
    try {
      const r = await pedirGit(proyecto, "publicar");
      setAviso(
        `Publicado ${String(r.publicado ?? "")} en ${String(r.rama ?? "")}. Vercel ya está construyendo.`,
      );
      setConfirmando(false);
      setEscrito("");
      await leer({ conservarAviso: true });
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No pude publicar.");
    } finally {
      setOcupado(null);
    }
  }, [proyecto, leer]);

  const delEstudio = commits.filter((c) => c.delEstudio).length;
  const puedeDeshacer = commits[0]?.delEstudio === true;

  return (
    <aside className="flex max-h-[62vh] shrink-0 flex-col overflow-hidden border-t border-[var(--vf-border)] bg-[var(--vf-bg-1)] lg:max-h-none lg:w-[320px] lg:border-l lg:border-t-0">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--vf-border)] px-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium">Control · {proyecto}</p>
          <p className="truncate font-mono text-[9px] leading-3 text-[var(--vf-fg-2)]">
            {estado?.rama ?? "—"}
            {estado?.pendientes ? ` · ${estado.pendientes} sin guardar` : ""}
            {delEstudio ? ` · ${delEstudio} cambios del Estudio` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar control"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-[var(--vf-bg-2)]"
        >
          <IconX size={11} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void deshacer()}
            disabled={!puedeDeshacer || ocupado !== null}
            title={
              puedeDeshacer
                ? "Tira el último cambio del Estudio"
                : "El último commit no lo hizo el Estudio"
            }
            className="h-7 flex-1 rounded-md border border-[var(--vf-border-1)] text-[11px] font-medium hover:border-[var(--vf-fg)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {ocupado === "deshacer" ? "Deshaciendo…" : "Deshacer"}
          </button>
          <button
            type="button"
            onClick={() => void verDiff(null)}
            disabled={ocupado !== null}
            className="h-7 flex-1 rounded-md border border-[var(--vf-border-1)] text-[11px] font-medium hover:border-[var(--vf-fg)] disabled:opacity-30"
          >
            {ocupado === "diff" ? "…" : "Ver cambio"}
          </button>
        </div>

        {diff ? (
          <div className="mt-2 rounded-md border border-[var(--vf-border)] bg-[var(--vf-bg-2)]">
            <div className="flex items-center justify-between border-b border-[var(--vf-border)] px-2 py-1">
              <span className="font-mono text-[9px] uppercase text-[var(--vf-fg-2)]">
                {diff.sha ? `commit ${diff.sha}` : "antes / después"}
              </span>
              <button
                type="button"
                onClick={() => setDiff(null)}
                className="font-mono text-[9px] text-[var(--vf-fg-2)] underline"
              >
                cerrar
              </button>
            </div>
            <pre className="max-h-56 overflow-auto p-2 font-mono text-[9px] leading-[1.45]">
              {diff.texto
                ? diff.texto.split("\n").map((linea, i) => (
                    <div
                      key={i}
                      className={cn(
                        linea.startsWith("+") && !linea.startsWith("+++") && "text-[#15803d]",
                        linea.startsWith("-") && !linea.startsWith("---") && "text-[#b91c1c]",
                        linea.startsWith("@@") && "text-[#6d28d9]",
                      )}
                    >
                      {linea || " "}
                    </div>
                  ))
                : "Sin diferencias."}
              {diff.cortado ? "\n… (recortado)" : ""}
            </pre>
          </div>
        ) : null}

        <p className="mb-1.5 mt-4 font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">
          Historial
        </p>
        {cargando ? (
          <div className="grid h-20 place-items-center">
            <IconLoader size={14} className="animate-spin" />
          </div>
        ) : commits.length === 0 ? (
          <p className="text-[10px] text-[var(--vf-fg-2)]">Todavía no hay commits.</p>
        ) : (
          <ul className="space-y-0.5">
            {commits.map((commit) => (
              <li key={commit.sha}>
                <button
                  type="button"
                  onClick={() => void verDiff(commit.sha)}
                  className="w-full rounded px-1.5 py-1 text-left hover:bg-[var(--vf-bg-2)]"
                >
                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        commit.delEstudio ? "bg-[#6d28d9]" : "bg-[var(--vf-border-2)]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] leading-4">{commit.asunto}</span>
                      <span className="block font-mono text-[9px] text-[var(--vf-fg-2)]">
                        {commit.sha} · {haceCuanto(commit.fecha)}
                        {commit.delEstudio ? " · Estudio" : ` · ${commit.autor}`}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Publicar ─────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[var(--vf-border)] p-3">
        {confirmando ? (
          <div>
            <p className="text-[10px] leading-4 text-[var(--vf-fg-1)]">
              Esto empuja <b>{estado?.rama}</b> a <b>{estado?.ramaProduccion ?? "?"}</b> y Vercel va a
              construir. Escribe <b>{proyecto}</b> para confirmar.
            </p>
            <input
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              placeholder={proyecto}
              className="mt-1.5 h-7 w-full rounded-md border border-[var(--vf-border-1)] bg-white px-2 text-[11px] focus:border-black focus:outline-none"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  setEscrito("");
                }}
                className="h-7 flex-1 rounded-md border border-[var(--vf-border-1)] text-[11px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={escrito !== proyecto || ocupado !== null}
                onClick={() => void publicar()}
                className="vf-press h-7 flex-1 rounded-md bg-[var(--vf-fg)] text-[11px] font-medium text-[var(--vf-bg-1)] disabled:opacity-30"
              >
                {ocupado === "publicar" ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={ocupado !== null || !estado?.ramaProduccion}
            className="vf-press inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--vf-fg)] text-[11px] font-medium text-[var(--vf-bg-1)] disabled:opacity-30"
          >
            <IconRocket size={11} /> Publicar a {estado?.ramaProduccion ?? "—"}
          </button>
        )}
        {aviso ? (
          <p className="mt-1.5 text-[10px] leading-4 text-[var(--vf-fg-1)]">{aviso}</p>
        ) : (
          <p className="mt-1.5 text-[9px] leading-3 text-[var(--vf-fg-2)]">
            Editar no publica. Esto es el único botón que toca producción.
          </p>
        )}
      </div>
    </aside>
  );
}
