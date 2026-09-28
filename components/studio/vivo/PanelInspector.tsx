"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconLoader, IconX } from "@/components/brand/VFIcons";
import type {
  ElementoSeleccionado,
  OperacionEdicion,
} from "@/components/studio/vivo/useCapaEdicion";

/**
 * Panel del elemento seleccionado. Vive en el Estudio (no dentro del iframe) para
 * que no lo apriete el ancho de la vista móvil ni lo pinte el CSS del proyecto.
 *
 * Tres cosas: editar el texto, mover color/tamaño/espaciado/alineación con
 * controles, y "dile a V" con el elemento como contexto.
 */

const PESOS = ["300", "400", "500", "600", "700", "800", "900"];
const ALINEACIONES: Array<{ id: string; etiqueta: string }> = [
  { id: "left", etiqueta: "Izq." },
  { id: "center", etiqueta: "Centro" },
  { id: "right", etiqueta: "Der." },
];

/** "24px" → 24 */
function aNumero(valor: string): number | null {
  const m = /^(-?[\d.]+)px$/.exec(valor.trim());
  return m ? Number(m[1]) : null;
}

/** rgb(a) del navegador → #rrggbb para el <input type=color> */
function aHex(valor: string): string {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(valor);
  if (!m) return "#000000";
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

export function PanelInspector({
  elemento,
  guardando,
  aviso,
  ultimoCambio,
  onEditar,
  onCerrar,
  onDileAV,
}: {
  elemento: ElementoSeleccionado;
  guardando: boolean;
  aviso: string | null;
  ultimoCambio: string | null;
  onEditar: (operacion: OperacionEdicion) => void;
  onCerrar: () => void;
  onDileAV: (peticion: string) => void;
}) {
  const [texto, setTexto] = useState(elemento.texto);
  const [peticion, setPeticion] = useState("");

  // Al cambiar de elemento, los campos siguen al nuevo.
  useEffect(() => {
    setTexto(elemento.texto);
    setPeticion("");
  }, [elemento.src, elemento.texto]);

  const tamano = aNumero(elemento.estilos.fontSize);
  const redondeo = aNumero(elemento.estilos.borderRadius);
  const archivo = elemento.src.split(":")[0];
  const linea = elemento.src.split(":")[1];

  return (
    <aside className="flex max-h-[62vh] shrink-0 flex-col overflow-hidden border-t border-[var(--vf-border)] bg-[var(--vf-bg-1)] lg:max-h-none lg:w-[288px] lg:border-l lg:border-t-0">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--vf-border)] px-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium">
            &lt;{elemento.etiqueta}&gt;{" "}
            <span className="text-[var(--vf-fg-2)]">
              {elemento.caja.ancho}×{elemento.caja.alto}
            </span>
          </p>
          <p className="truncate font-mono text-[9px] leading-3 text-[var(--vf-fg-2)]">
            {archivo.split("/").pop()}:{linea}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Quitar selección"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-[var(--vf-bg-2)]"
        >
          <IconX size={11} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
        {/* ── Texto ─────────────────────────────────────────── */}
        {elemento.tieneTextoPropio ? (
          <section>
            <Rotulo>Texto</Rotulo>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onBlur={() => {
                if (texto !== elemento.texto) onEditar({ tipo: "texto", valor: texto });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--vf-border-1)] bg-white px-2 py-1.5 text-[12px] leading-4 focus:border-black focus:outline-none"
            />
            <Pista>Enter guarda · el cambio se ve en la vista al instante</Pista>
          </section>
        ) : (
          <section>
            <Rotulo>Texto</Rotulo>
            <Pista>
              Este elemento no tiene texto propio (viene de una variable o de otro componente).
              Pídeselo a V aquí abajo.
            </Pista>
          </section>
        )}

        {/* ── Tamaño y peso ─────────────────────────────────── */}
        <section>
          <Rotulo>Tamaño</Rotulo>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={96}
              value={tamano ?? 16}
              disabled={tamano === null}
              onChange={(e) => onEditar({ tipo: "estilo", props: { fontSize: `${e.target.value}px` } })}
              className="min-w-0 flex-1 accent-black"
              aria-label="Tamaño de letra"
            />
            <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[var(--vf-fg-2)]">
              {tamano !== null ? `${tamano}px` : elemento.estilos.fontSize}
            </span>
          </div>
          {tamano === null ? (
            <Pista>El tamaño viene en otra unidad (clamp, em): usa &quot;dile a V&quot;.</Pista>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-1">
            {PESOS.map((peso) => (
              <Chip
                key={peso}
                activo={String(elemento.estilos.fontWeight) === peso}
                onClick={() => onEditar({ tipo: "estilo", props: { fontWeight: Number(peso) } })}
              >
                {peso}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Color ─────────────────────────────────────────── */}
        <section>
          <Rotulo>Color</Rotulo>
          <div className="space-y-2">
            <FilaColor
              etiqueta="Texto"
              valor={aHex(elemento.estilos.color)}
              onChange={(hex) => onEditar({ tipo: "estilo", props: { color: hex } })}
            />
            <FilaColor
              etiqueta="Fondo"
              valor={aHex(elemento.estilos.backgroundColor)}
              onChange={(hex) => onEditar({ tipo: "estilo", props: { backgroundColor: hex } })}
            />
          </div>
        </section>

        {/* ── Alineación ────────────────────────────────────── */}
        <section>
          <Rotulo>Alineación</Rotulo>
          <div className="flex gap-1">
            {ALINEACIONES.map((a) => (
              <Chip
                key={a.id}
                activo={elemento.estilos.textAlign === a.id}
                onClick={() => onEditar({ tipo: "estilo", props: { textAlign: a.id } })}
              >
                {a.etiqueta}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Espaciado ─────────────────────────────────────── */}
        <section>
          <Rotulo>Espaciado</Rotulo>
          <div className="grid grid-cols-2 gap-2">
            <CampoTexto
              etiqueta="Relleno"
              valor={elemento.estilos.padding}
              onGuardar={(v) => onEditar({ tipo: "estilo", props: { padding: v } })}
            />
            <CampoTexto
              etiqueta="Margen"
              valor={elemento.estilos.margin}
              onGuardar={(v) => onEditar({ tipo: "estilo", props: { margin: v } })}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] text-[var(--vf-fg-2)]">Esquinas</span>
            <input
              type="range"
              min={0}
              max={48}
              value={redondeo ?? 0}
              onChange={(e) =>
                onEditar({ tipo: "estilo", props: { borderRadius: `${e.target.value}px` } })
              }
              className="min-w-0 flex-1 accent-black"
              aria-label="Redondeo de esquinas"
            />
            <span className="w-10 shrink-0 text-right font-mono text-[10px] text-[var(--vf-fg-2)]">
              {redondeo ?? 0}px
            </span>
          </div>
        </section>

        {/* ── Dile a V ──────────────────────────────────────── */}
        <section>
          <Rotulo>Dile a V</Rotulo>
          <textarea
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && peticion.trim()) {
                e.preventDefault();
                onDileAV(peticion.trim());
                setPeticion("");
              }
            }}
            rows={2}
            placeholder="esto más grande · quita esta tarjeta · ponlo en dos columnas"
            className="w-full resize-none rounded-md border border-[var(--vf-border-1)] bg-white px-2 py-1.5 text-[12px] leading-4 placeholder:text-[var(--vf-fg-2)] focus:border-black focus:outline-none"
          />
          <button
            type="button"
            disabled={!peticion.trim()}
            onClick={() => {
              onDileAV(peticion.trim());
              setPeticion("");
            }}
            className="vf-press mt-1.5 h-8 w-full rounded-md bg-[var(--vf-fg)] text-[11px] font-medium text-[var(--vf-bg-1)] disabled:opacity-30"
          >
            Mandar con este elemento
          </button>
          <Pista>V recibe el archivo, la línea y la etiqueta del elemento seleccionado.</Pista>
        </section>
      </div>

      <footer className="min-h-8 shrink-0 border-t border-[var(--vf-border)] px-3 py-1.5">
        {guardando ? (
          <p className="flex items-center gap-1.5 text-[10px] text-[var(--vf-fg-2)]">
            <IconLoader size={9} className="animate-spin" /> escribiendo en el código…
          </p>
        ) : aviso ? (
          <p className="text-[10px] leading-4 text-[var(--vf-fg-1)]">{aviso}</p>
        ) : ultimoCambio ? (
          <p className="truncate font-mono text-[10px] text-[var(--vf-fg-2)]">
            guardado en {ultimoCambio}
          </p>
        ) : (
          <p className="font-mono text-[10px] text-[var(--vf-fg-2)]">{elemento.src}</p>
        )}
      </footer>
    </aside>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">{children}</p>
  );
}

function Pista({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[9px] leading-3 text-[var(--vf-fg-2)]">{children}</p>;
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-6 rounded border px-1.5 font-mono text-[10px] transition",
        activo
          ? "border-[var(--vf-fg)] bg-[var(--vf-fg)] text-[var(--vf-bg-1)]"
          : "border-[var(--vf-border-1)] text-[var(--vf-fg-2)] hover:border-[var(--vf-fg)] hover:text-[var(--vf-fg)]",
      )}
    >
      {children}
    </button>
  );
}

function FilaColor({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] text-[var(--vf-fg-2)]">{etiqueta}</span>
      <input
        type="color"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 shrink-0 cursor-pointer rounded border border-[var(--vf-border-1)] bg-transparent p-0.5"
      />
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--vf-fg-2)]">
        {valor}
      </span>
    </label>
  );
}

function CampoTexto({
  etiqueta,
  valor,
  onGuardar,
}: {
  etiqueta: string;
  valor: string;
  onGuardar: (valor: string) => void;
}) {
  const [borrador, setBorrador] = useState(valor);
  useEffect(() => setBorrador(valor), [valor]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] text-[var(--vf-fg-2)]">{etiqueta}</span>
      <input
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={() => {
          if (borrador !== valor) onGuardar(borrador);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-full rounded-md border border-[var(--vf-border-1)] bg-white px-2 py-1 font-mono text-[10px] focus:border-black focus:outline-none"
      />
    </label>
  );
}
