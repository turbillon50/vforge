"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconLoader, IconX } from "@/components/brand/VFIcons";
import {
  encargoAbierto,
  TEXTO_ESTADO,
  type EncargoV,
} from "@/components/studio/vivo/encargos-tipos";
import type {
  ElementoSeleccionado,
  OperacionEdicion,
} from "@/components/studio/vivo/useCapaEdicion";

/**
 * Panel del elemento seleccionado. Vive en el Estudio (no dentro del iframe) para
 * que no lo apriete el ancho de la vista móvil ni lo pinte el CSS del proyecto.
 *
 * Tres cosas: editar el texto, mover color/tamaño/espaciado/alineación con
 * controles, y "Encárgalo": V redacta el encargo con este elemento, un agente
 * lo hace encerrado en el worktree vivo, lo revisa dos veces y V anota qué
 * estuvo mal y cómo se corrigió.
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

/**
 * Sin fondo no es fondo negro. El navegador contesta `rgba(0, 0, 0, 0)` para lo
 * transparente, y pintarlo como #000000 es mentirle a quien mira: se vería una
 * muestra negra sólida en algo que no tiene fondo.
 */
function esTransparente(valor: string): boolean {
  const limpio = valor.trim();
  if (limpio === "transparent" || limpio === "") return true;
  const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(limpio);
  return m ? Number(m[1]) === 0 : false;
}

/**
 * `textAlign` calculado devuelve `start`/`end`, no `left`/`right`: sin esto
 * ningún botón de alineación se prendía aunque el texto sí estuviera alineado.
 */
function alineacionReal(valor: string): string {
  if (valor === "start") return "left";
  if (valor === "end") return "right";
  return valor;
}

export function PanelInspector({
  elemento,
  guardando,
  aviso,
  ultimoCambio,
  onEditar,
  onCerrar,
  onEncargar,
  encargos,
  enviando,
}: {
  elemento: ElementoSeleccionado;
  guardando: boolean;
  aviso: string | null;
  ultimoCambio: string | null;
  onEditar: (operacion: OperacionEdicion) => void;
  onCerrar: () => void;
  /** Devuelve null si el encargo entró a la cola, o el motivo si no. */
  onEncargar: (peticion: string) => Promise<string | null>;
  encargos: EncargoV[];
  enviando: boolean;
}) {
  const [texto, setTexto] = useState(elemento.texto);
  const [peticion, setPeticion] = useState("");
  const [errorEncargo, setErrorEncargo] = useState<string | null>(null);

  const mandar = async () => {
    const p = peticion.trim();
    if (p.length < 3 || enviando) return;
    setErrorEncargo(null);
    const error = await onEncargar(p);
    if (error) setErrorEncargo(error);
    else setPeticion("");
  };

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

          <div className="mt-2 flex flex-wrap items-center gap-1">
            {PESOS.map((peso) => (
              <Chip
                key={peso}
                activo={String(elemento.estilos.fontWeight) === peso}
                onClick={() => onEditar({ tipo: "estilo", props: { fontWeight: Number(peso) } })}
              >
                {peso}
              </Chip>
            ))}
            {/* Un peso fuera de la escala (850, por ejemplo) no prende ningún
                botón: si no se dice, parece que el elemento no tiene peso. */}
            {PESOS.includes(String(elemento.estilos.fontWeight)) ? null : (
              <span className="font-mono text-[10px] text-[var(--vf-fg-2)]">
                hoy: {elemento.estilos.fontWeight}
              </span>
            )}
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
              vacio={esTransparente(elemento.estilos.backgroundColor)}
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
                activo={alineacionReal(elemento.estilos.textAlign) === a.id}
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

        {/* ── Encárgalo ─────────────────────────────────────── */}
        <section>
          <Rotulo>Encárgalo</Rotulo>
          <textarea
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void mandar();
              }
            }}
            rows={2}
            placeholder="esto más grande · quita esta tarjeta · ponlo en dos columnas"
            className="w-full resize-none rounded-md border border-[var(--vf-border-1)] bg-white px-2 py-1.5 text-[12px] leading-4 placeholder:text-[var(--vf-fg-2)] focus:border-black focus:outline-none"
          />
          <button
            type="button"
            disabled={peticion.trim().length < 3 || enviando}
            onClick={() => void mandar()}
            className="vf-press mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--vf-fg)] text-[11px] font-medium text-[var(--vf-bg-1)] disabled:opacity-30"
          >
            {enviando ? <IconLoader size={10} className="animate-spin" /> : null}
            Encargar con este elemento
          </button>
          {errorEncargo ? (
            <p className="mt-1 text-[10px] leading-4 text-vf-error">{errorEncargo}</p>
          ) : null}
          <Pista>
            V redacta el encargo con el archivo, la línea y lo que ya aprendió de este proyecto. Lo hace un
            agente encerrado en este proyecto, lo revisa dos veces y se ve aquí solo. Nada sale a producción
            hasta que publiques.
          </Pista>
          {encargos.length ? <ListaEncargos encargos={encargos.slice(0, 4)} /> : null}
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

function ListaEncargos({ encargos }: { encargos: EncargoV[] }) {
  return (
    <ul className="mt-2.5 space-y-1.5">
      {encargos.map((e) => {
        const abierto = encargoAbierto(e);
        const bien = e.estado === "listo";
        return (
          <li key={e.id} className="rounded-md border border-[var(--vf-border)] bg-white px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[11px] leading-4">{e.pedido}</p>
              <span
                className={cn(
                  "shrink-0 font-mono text-[9px]",
                  bien ? "text-vf-green" : e.estado === "fallo" ? "text-vf-error" : "text-[var(--vf-fg-2)]",
                )}
              >
                {TEXTO_ESTADO[e.estado] ?? e.estado}
              </span>
            </div>
            {abierto ? (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--vf-bg-3)]">
                <div
                  className="h-full rounded-full bg-[var(--vf-fg)] transition-[width] duration-700"
                  style={{ width: `${Math.max(6, Math.min(100, e.progreso ?? 6))}%` }}
                />
              </div>
            ) : null}
            {abierto && e.rastro ? (
              <p className="mt-1 truncate font-mono text-[9px] text-[var(--vf-fg-2)]">
                {e.rastro.split("\n").filter(Boolean).pop()}
              </p>
            ) : null}
            {!abierto && e.leccion ? (
              <p className="mt-1 text-[10px] leading-4 text-[var(--vf-fg-1)]">
                <span className="font-medium">V aprendió:</span> {e.leccion}
              </p>
            ) : null}
            {!abierto && e.mal && e.mal.toLowerCase() !== "nada" ? (
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--vf-fg-2)]">
                Estaba mal: {e.mal} → {e.correccion ?? "—"}
              </p>
            ) : null}
            {e.estado === "fallo" && e.error ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-vf-error">{e.error}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
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
  vacio = false,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  vacio?: boolean;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] text-[var(--vf-fg-2)]">{etiqueta}</span>
      <span
        className={cn(
          "relative h-7 w-10 shrink-0 overflow-hidden rounded border border-[var(--vf-border-1)] p-0.5",
          // Damero: se ve que NO hay fondo, en vez de un negro que no existe.
          vacio &&
            "bg-[linear-gradient(45deg,#d4d4d4_25%,transparent_25%,transparent_75%,#d4d4d4_75%),linear-gradient(45deg,#d4d4d4_25%,transparent_25%,transparent_75%,#d4d4d4_75%)] bg-[length:8px_8px] bg-[position:0_0,4px_4px]",
        )}
      >
        <input
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-full w-full cursor-pointer bg-transparent p-0", vacio && "opacity-0")}
        />
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--vf-fg-2)]">
        {vacio ? "sin fondo" : valor}
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
