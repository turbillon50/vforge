/** Pack Agencia Premium — vive en V, no en este chat de Grok. */

export const CRAFT_CHAPTERS = [
  "iluminacion",
  "tokens",
  "cristal",
  "frames",
  "shell",
  "responsive",
  "motion",
  "iconos",
  "clone",
] as const;

export type CraftChapter = (typeof CRAFT_CHAPTERS)[number];

export const CRAFT_CORE = `
CRAFT V / AGENCIA PREMIUM. Esto no es opinion: es la receta de la fábrica.
Referencia viva: Aman / Apple / Four Seasons. Nunca plantilla Tailwind.
Si una pantalla se ve plástica, caricaturizada o de demo barato, está mal.

PROHIBIDO
- Primarios Tailwind #2563eb #16a34a #dc2626 y turquesa juguete.
- Semáforo en badges. Lucide. Emoji como icono de producto.
- Oro en botón + chip + overline a la vez.
- Encoger desktop y llamarlo móvil.
- opacity:0 como estado base en SSR / Framer.
- n8n / Zapier / Make.

ILUMINACIÓN (toda superficie: card, chip, nav, modal, KPI)
1. Canto especular inset 0 1px 0 rgba(255,255,255,.075)
2. Gradiente 158deg luz arriba-izquierda
3. Sombra 3 capas: contacto + key + ambiente
4. Viñeta radial suave en el shell
Base #070A14. Acero #3C5478 highlight #93AECE.
Estados desaturados: salvia #7E9C86 / arena #B9A176 / terracota #B87C74.
Oro sólo en emblema. Botones porcelana. Interactivo acero.

TOKENS
Nombrar color, radio, sombra. Cero hex sueltos en componentes.
Radios 6 / 12 / 15. Media queries SIEMPRE al final del CSS.

CRISTAL
Vidrio de verdad: translucidez + saturate + borde especular + luz DETRÁS del panel.
No panel opaco con blur.

FRAMES
Hero cabe en viewport. Cards con canto. Riel KPI con snap. Fichas. Bottom sheet.
Grid que respira. No apilar 12 bloques en el primer fold.

SHELL DOS CARAS
Desktop manda sidebar. Celular manda tabbar fija de 5 + drawer.
Tabbar hermana de #shell, hija de body. Ningún ancestro con transform.

RESPONSIVE
390 y 1440 son DOS diseños. Tablas → fichas. KPIs → riel. Modal → hoja inferior.
Si no se vio a 390 y 1440, no se entregó.

MOTION
Prohibido opacity 0 como estado base. Splash y reveals con fallback CSS visible.
1-3 micros por pantalla, no feria.

ICONOS
SVG inline currentColor. Módulo propio. Cero Lucide. Cero emoji de UI.

CLONE / ULTRACLON
Drenar vibe de una URL (Linear, Stripe, Aman). Medir px, type, radio, gap, sombra, blur, timings.
No copiar marca ajena. Copiar oficio.

ENTREGA MÍNIMA DE UNA PANTALLA
Tokens + luz + frame + shell por breakpoint + 1-3 micros + capturas 390 y 1440.
`.trim();

const CHAPTERS: Record<CraftChapter, string> = {
  iluminacion:
    "Canto especular + gradiente 158deg + sombra 3 capas + viñeta. Base #070A14. Cero primarios. Oro sólo emblema.",
  tokens:
    "Paleta por marca, hex nombrados, radios 6/12/15, sombras con nombre. Media queries al final.",
  cristal:
    "Translucidez + saturate + borde especular + luz detrás. No blur sobre panel opaco.",
  frames:
    "Hero en viewport, card con canto, riel con snap, ficha, bottom sheet, grid que respira.",
  shell:
    "Sidebar en desktop. Tabbar fija de 5 en celular + drawer. Tabbar sin ancestro con transform.",
  responsive:
    "390 y 1440 son dos diseños. Tabla=ficha, KPI=riel, modal=hoja. Sin captura no hay entrega.",
  motion:
    "CSS visible por default. Nada de opacity 0 en SSR. Micros contadas.",
  iconos:
    "SVG currentColor propio. Cero Lucide. Cero emoji como icono.",
  clone:
    "Drenar vibe, medir px y timings, reconstruir oficio. No clonar marca.",
};

export function craftBrief(): string {
  return CRAFT_CORE;
}

export function craftForMcp(chapter?: string): string {
  const key = (chapter || "").trim().toLowerCase() as CraftChapter;
  if (key && CHAPTERS[key]) {
    return `# Craft — ${key}\n\n${CHAPTERS[key]}\n\n${CRAFT_CORE}`;
  }
  return [
    "# VForge Craft MCP",
    "Capítulos: " + CRAFT_CHAPTERS.join(", ") + ". Pasa chapter=iluminacion|tokens|cristal|...",
    "",
    CRAFT_CORE,
  ].join("\n");
}
