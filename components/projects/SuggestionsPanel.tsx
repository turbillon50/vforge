"use client";

/**
 * Sugerencias con fuente: cliente y montos que SÍ existen en la base pero no
 * estaban en el catálogo. Cada renglón dice de dónde salió el dato; Luis
 * confirma todas de un jalón o descarta las que no.
 *
 * No inventa nada: esta pieza sólo pinta lo que el escáner encontró con fuente.
 */
import { IconCheck, IconChevD, IconRefresh, IconX } from "@/components/brand/VFIcons";
import { ETIQUETA_SUGERENCIA, valorSugerido } from "@/lib/projects/vista";

export interface SugerenciaLista {
  id: string;
  project_id: string;
  project_name: string | null;
  campo: string;
  valor: string;
  fuente: string;
  detalle: string | null;
}

export function SuggestionsPanel({
  sugerencias,
  abierto,
  ocupado,
  aviso,
  onAbrir,
  onEscanear,
  onConfirmar,
  onRechazar,
}: {
  sugerencias: SugerenciaLista[];
  abierto: boolean;
  ocupado: boolean;
  aviso: string | null;
  onAbrir: () => void;
  onEscanear: () => void;
  onConfirmar: (ids: string[] | "todas") => void;
  onRechazar: (ids: string[]) => void;
}) {
  const n = sugerencias.length;
  const porProyecto = new Map<string, SugerenciaLista[]>();
  for (const s of sugerencias) {
    porProyecto.set(s.project_id, [...(porProyecto.get(s.project_id) ?? []), s]);
  }

  return (
    <section className="border-b border-[var(--border-1)] bg-white px-page-sm md:px-page-md py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAbrir}
          aria-expanded={abierto}
          className="inline-flex min-h-9 items-center gap-2 text-left text-[13px] font-medium text-black"
        >
          {n > 0
            ? `${n} sugerencia${n === 1 ? "" : "s"} con fuente`
            : "Sin sugerencias pendientes"}
          <IconChevD size={13} className={abierto ? "rotate-180 transition" : "transition"} />
        </button>
        <span className="text-[12px] text-[var(--fg-tertiary)]">
          {n > 0
            ? "cliente y montos que ya existen en la base, sin capturar en el catálogo"
            : "se busca en client_project_status y contracts; sin fuente no se propone nada"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEscanear}
            disabled={ocupado}
            className="btn-ghost !min-h-9 !px-3"
          >
            <IconRefresh size={12} className={ocupado ? "animate-spin" : ""} />
            Buscar en las fuentes
          </button>
          {n > 0 ? (
            <button
              type="button"
              onClick={() => onConfirmar("todas")}
              disabled={ocupado}
              className="btn-primary !min-h-9 !px-4"
            >
              <IconCheck size={12} /> Confirmar {n}
            </button>
          ) : null}
        </div>
      </div>

      {aviso ? <p className="mt-2 text-[12px] text-[var(--fg-secondary)]">{aviso}</p> : null}

      {abierto && n > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {[...porProyecto.entries()].map(([projectId, lista]) => (
            <li
              key={projectId}
              className="rounded-md border border-[var(--border-1)] bg-[#fafaf8] px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-black">
                  {lista[0].project_name ?? projectId}
                  <span className="ml-2 font-mono text-[12px] text-[var(--fg-muted)]">
                    {projectId}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirmar(lista.map((s) => s.id))}
                    disabled={ocupado}
                    className="btn-ghost !min-h-8 !px-3"
                  >
                    <IconCheck size={11} /> Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => onRechazar(lista.map((s) => s.id))}
                    disabled={ocupado}
                    className="btn-ghost !min-h-8 !px-3"
                  >
                    <IconX size={11} /> Descartar
                  </button>
                </div>
              </div>
              <dl className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {lista.map((s) => (
                  <div key={s.id} className="min-w-0">
                    <dt className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                      {ETIQUETA_SUGERENCIA[s.campo] ?? s.campo}
                    </dt>
                    <dd className="text-[13px] text-black">{valorSugerido(s.campo, s.valor)}</dd>
                    <dd className="text-[12px] text-[var(--fg-tertiary)]">
                      fuente: {s.fuente}
                      {s.detalle ? ` · ${s.detalle}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
