"use client";

/**
 * Banco de pruebas de los dos paneles del Estudio, para poder MIRARLOS en un
 * navegador de verdad.
 *
 * Los paneles viven detrás de la sesión de owner de Clerk en `/app/chat`, así que
 * headless no se puede entrar. Este banco monta los MISMOS componentes (sin
 * copiarlos ni tocarlos) y el MISMO hook `useCapaEdicion`, y los deja hablar con
 * el motor vivo de verdad: `/api/vivo/edit` y `/api/vivo/git` los reenvía el
 * servidor del banco al servicio `vf-vivo`, que escribe y commitea en el worktree
 * del piloto.
 *
 * Lo único que NO es real aquí es el gate de Clerk y el iframe del preview (el
 * motor ya está medido aparte). Todo lo demás —render, controles, fetch, git—
 * es el código que corre en producción.
 */

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PanelInspector } from "@/components/studio/vivo/PanelInspector";
import { PanelControl } from "@/components/studio/vivo/PanelControl";
import { useEncargos } from "@/components/studio/vivo/useEncargos";
import {
  useCapaEdicion,
  type ElementoSeleccionado,
} from "@/components/studio/vivo/useCapaEdicion";

const PROYECTO = "mipipa";

/** Retrato tal como lo manda overlay.js desde dentro del iframe. */
const HERO_H1: ElementoSeleccionado = {
  src: "components/marketing.tsx:87:11",
  etiqueta: "h1",
  clase: "",
  texto: "Agua segura,",
  tieneTextoPropio: true,
  estilos: {
    color: "rgb(9, 9, 9)",
    backgroundColor: "rgba(0, 0, 0, 0)",
    fontSize: "62px",
    fontWeight: "850",
    textAlign: "start",
    padding: "0px",
    margin: "0px",
    borderRadius: "0px",
  },
  caja: { ancho: 612, alto: 130 },
};

/** Un elemento sin texto propio, para ver el camino "pídeselo a V". */
const SPAN_PARTIDO: ElementoSeleccionado = {
  ...HERO_H1,
  src: "components/marketing.tsx:89:31",
  etiqueta: "span",
  texto: "directo a tu puerta.",
  tieneTextoPropio: false,
  estilos: { ...HERO_H1.estilos, fontSize: "clamp(36px, 6.4vw, 62px)" },
  caja: { ancho: 420, alto: 62 },
};

declare global {
  interface Window {
    __banco?: {
      seleccionar: (cual: "h1" | "span") => void;
      registro: string[];
    };
  }
}

function Banco() {
  const capa = useCapaEdicion({ proyecto: PROYECTO, activa: true });
  const [verControl, setVerControl] = useState(true);
  const [refrescar, setRefrescar] = useState(0);
  const encargos = useEncargos(PROYECTO, () => setRefrescar((n) => n + 1));
  const [registro, setRegistro] = useState<string[]>([]);

  const apuntar = (linea: string) =>
    setRegistro((previo) => [...previo, linea].slice(-40));

  // La prueba maneja el banco desde fuera con el mismo postMessage que usa la capa.
  useEffect(() => {
    window.__banco = {
      seleccionar: (cual) => {
        window.postMessage(
          {
            canal: "vf-vivo",
            tipo: "seleccion",
            elemento: cual === "h1" ? HERO_H1 : SPAN_PARTIDO,
          },
          "*",
        );
      },
      registro: [],
    };
  }, []);

  useEffect(() => {
    if (window.__banco) window.__banco.registro = registro;
  }, [registro]);

  return (
    <div className="flex h-screen flex-col bg-[var(--vf-bg)] text-[var(--vf-fg)]">
      {/* Barra que imita la del Estudio, para que los paneles se vean en su sitio */}
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-3">
        <span className="text-[12px] font-medium">Banco de paneles · {PROYECTO}</span>
        <span className="rounded bg-[#6d28d9] px-1.5 py-0.5 font-mono text-[9px] text-white">
          motor vivo
        </span>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            data-banco="sel-h1"
            onClick={() => window.__banco?.seleccionar("h1")}
            className="h-7 rounded-md border border-[var(--vf-border-1)] px-2 text-[11px]"
          >
            Seleccionar h1
          </button>
          <button
            type="button"
            data-banco="sel-span"
            onClick={() => window.__banco?.seleccionar("span")}
            className="h-7 rounded-md border border-[var(--vf-border-1)] px-2 text-[11px]"
          >
            Seleccionar span
          </button>
          <button
            type="button"
            data-banco="ver-control"
            onClick={() => setVerControl((v) => !v)}
            className="h-7 rounded-md border border-[var(--vf-border-1)] px-2 text-[11px]"
          >
            Control
          </button>
        </div>
      </header>

      {/* Mismo contenedor que usa ForgeStudio: columna en móvil, fila en lg. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Donde va el iframe del preview vivo (medido aparte). */}
        <div className="grid min-w-0 flex-1 place-items-center p-6">
          <div className="grid h-full w-full place-items-center rounded-lg border border-dashed border-[var(--vf-border-1)] bg-[var(--vf-bg-1)]">
            <div className="text-center">
              <p className="text-[12px] text-[var(--vf-fg-2)]">
                aquí va el iframe del preview vivo
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--vf-fg-2)]">
                mediana medida: 240 ms en WebKit
              </p>
            </div>
          </div>
        </div>

        {/* Los dos paneles de verdad. */}
        {capa.seleccion ? (
          <PanelInspector
            elemento={capa.seleccion}
            guardando={capa.guardando}
            aviso={capa.aviso}
            ultimoCambio={capa.ultimoCambio}
            onEditar={(operacion) => {
              apuntar(`editar ${JSON.stringify(operacion)}`);
              void capa.editar(operacion).then((ok) => {
                apuntar(`editar → ${ok ? "escrito" : "rechazado"}`);
                if (ok) setRefrescar((n) => n + 1);
              });
            }}
            onCerrar={() => capa.limpiar()}
            onEncargar={async (peticion) => {
              apuntar(`encargo ${capa.seleccion?.src} :: ${peticion}`);
              return capa.seleccion ? encargos.encargar(peticion, capa.seleccion) : "sin selección";
            }}
            encargos={encargos.encargos}
            enviando={encargos.enviando}
          />
        ) : null}

        {verControl ? (
          <PanelControl
            proyecto={PROYECTO}
            refrescar={refrescar}
            onCerrar={() => setVerControl(false)}
            onCambio={() => {
              // Igual que ForgeStudio: el repo cambió, el retrato ya no vale.
              apuntar("control: cambió el repo");
              capa.limpiar();
            }}
          />
        ) : null}
      </div>

      {/* Bitácora visible: lo que la prueba comprueba también se ve en la captura. */}
      <footer
        data-banco="registro"
        className="h-16 shrink-0 overflow-y-auto border-t border-[var(--vf-border)] bg-[var(--vf-bg-2)] p-2 font-mono text-[9px] leading-3 text-[var(--vf-fg-2)]"
      >
        {registro.length === 0 ? "— sin acciones todavía —" : registro.map((l, i) => <div key={i}>{l}</div>)}
      </footer>
    </div>
  );
}

const nodo = document.getElementById("raiz");
if (nodo) createRoot(nodo).render(<Banco />);
