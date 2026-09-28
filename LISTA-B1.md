# LISTA-B1 — Barrido 1 de producción de VForge

Fuente de verdad del barrido. `[x]` solo con evidencia (antes → después, número o captura).
`[LUIS]` = decisión que solo él puede tomar.

- Rama: `barrido-1` · worktree `/root/worktrees/vforge-b1`
- Línea base: `/root/vulcano-audit/vforge-rescate/medicion.json` (54 rutas × 390/1440 × sin/con sesión, 28-sep-2026)
- Verificación: WebKit (Playwright python3) a 390×844 y 1440×900, `npx tsc --noEmit -p .`, `npm test`
- Script de medición reutilizable: `/root/vulcano-audit/vforge-rescate/medir_local.py`

---

## Bloque 1 · Header de marketing en móvil

Criterio: desborde horizontal 0 en las 13 rutas a 390 y 1440.

- [x] **B1.1 — Causa raíz del desborde de 157 px: no era el header, era el footer.**
  `MarketingFooter` pintaba sus 4 columnas con `gridTemplateColumns:"2fr 1fr 1fr 1fr"` y `gap:48`
  fijos, sin media query. A 390 px eso mide 547 px de ancho.
  Medición del elemento culpable (WebKit 390, `/blog`):
  `div > footer > div > div > div > div` → `right=547`, `scrollWidth=547`, `clientWidth=390`.
  Arreglo: clase `.vf-mf-cols` con el mismo grid en escritorio y `1fr 1fr` (+ marca a todo el ancho)
  por debajo de 900 px. Escritorio queda idéntico (captura `ftr-1440.png`).

- [x] **B1.2 — Menú colapsado en móvil, mismos colores.**
  `MarketingHeader` metía logo + 4 enlaces + GitHub + Entrar + Empezar gratis en una sola fila a
  cualquier ancho. Ahora por debajo de 900 px se colapsa en un botón de 44×44 px que abre un panel
  con los mismos enlaces. Colores idénticos (`rgba(5,10,20,.97)`, `rgba(200,215,255,.75/.8/.85)`,
  gradiente `#3b82f6 → #6d28d9`). Capturas: `hdr-390-cerrado.png`, `hdr-390-abierto.png`, `hdr-1440.png`.
  Comportamiento verificado: cierra con Escape (`panel.hidden === true`), cierra al cambiar de ruta,
  cierra al pasar de 900 px, `aria-expanded` / `aria-controls` / `aria-label` presentes,
  `overscroll-behavior: contain` y `env(safe-area-inset-bottom)` en el panel.

- [x] **B1.3 — El panel abierto dejaba ver el texto de la página a través del header.**
  El header usa `backdrop-filter: blur(16px)` con fondo `rgba(5,10,20,0.97)`; en WebKit el contenido
  de la página se leía a través del panel (variante de SANIDAD R-002). Arreglo: fondo opaco propio
  `#050a14` en `.vf-mh-panel`. Antes/después en `hdr-390-abierto.png`.

- [x] **B1.4 — `/mcp` seguía desbordando 84 px después de arreglar el footer.**
  `<pre>` con `overflow-x-auto` dentro de un `div.flex-1`: un ítem flex no encoge por debajo de su
  contenido (`min-width:auto`). Arreglo: `min-w-0 flex-1` en `app/mcp/page.tsx:160`.

- [x] **B1.5 — Resultado medido.**
  13 rutas × 2 vistas = 26 medidas. Antes: 13 con desborde de 157 px a 390.
  Después: **0 medidas con desborde** (`med-b1hdr.json`).

  | ruta | 390 antes | 390 después | 1440 antes | 1440 después |
  |---|---|---|---|---|
  | /mcp /marketplace /blog /docs /billing /developers /labs /manifiesto /privacidad /privacy /support /terminos /terms | 157 | **0** | 0 | **0** |

### De paso en el mismo footer (evidencia en el diff)

- [x] **B1.6 — 3 enlaces muertos del footer ahora llevan a donde dicen.**
  `API href="#"` → `/developers` · `Status href="#"` → `/status` (y en español, "Estado") ·
  `Contacto href="#"` → `/support`. Las tres rutas responden 200.
- [x] **B1.7 — "Todos los sistemas operativos" era una mala traducción de *all systems operational*
  y afirmaba un estado que nadie medía.** Ahora es un enlace a `/status`, que sí lo mide.
- [x] **B1.8 — Año del footer dinámico** (MUST-500 §375): `2026` escrito a mano → `new Date().getFullYear()`.

### Pendientes detectados en el bloque 1 (no se tocan aquí)

- [ ] **[LUIS] Redes sociales del footer con `href="#"`** (TikTok, LinkedIn, X). Son 3 promesas rotas
  (SANIDAD: `MUERTO`). No hay cuentas reales que poner. Decisión: dar las URLs o quitar los íconos.
- [ ] **Los formularios "Partners" y "Asociados" del footer no envían nada.**
  `handleSubmit` solo hace `setSent(true)` y muestra "Mensaje recibido. Te contactamos pronto."
  sin una sola petición de red. Es una promesa rota grave. Se atiende en el bloque 10.
- [ ] `/pricing` no existe; hoy lo salva un `redirect` 307 a `/mcp` en `next.config.mjs`.
  Funciona, pero el enlace del header/footer dice "Precios" y aterriza en la documentación del MCP.
  **[LUIS]**: o hay página de precios, o el enlace se llama como lo que abre.

---

## Bloque 3 · `/mcp` sin inventos

Criterio: cero métricas no medidas; el número de herramientas sale del registro real del código.

- [x] **B3.1 — Fuera las 4 tarjetas de "ahorro" inventadas.**
  Se borró el array `SAVINGS` completo: `40% Reducción en consumo de tokens`,
  `70% Menos turnos por tarea`, `8min Scaffold de proyecto nuevo`,
  `30s Generar contrato completo`. Ninguna estaba medida.
- [x] **B3.2 — Fuera la pastilla verde "Ahorra hasta 40% en consumo de tokens bajo el Método VForge".**
- [x] **B3.3 — Fuera los "5 minutos"** del `<title>`/description, del encabezado
  "Instalación — 5 minutos" y del CTA final ("Todo en menos de 5 minutos"). Nadie los cronometró.
- [x] **B3.4 — El número de herramientas ya no se escribe a mano.**
  Antes: `TOOLS` era un array inventado de 14 nombres (`list_projects`, `get_project`,
  `trigger_deploy`…) que **no existen** en el servidor MCP, y el título decía "14 herramientas reales".
  Ahora la página importa `MCP_TOOLS` del registro real y pinta `MCP_TOOLS.length`.
  Para que la página pública no arrastre Neon/GitHub/`node:crypto`, el registro se extrajo a
  `lib/mcp/registry.ts` (solo datos); `lib/mcp/tools.ts` lo importa y lo re-exporta —
  ningún consumidor cambia. Medición del registro hoy: **30 tools** (3 públicas, 27 con token).
  Comprobado contra el endpoint vivo: `POST /api/mcp/public → tools/list` devuelve exactamente las
  3 públicas (`getting_started`, `vforge_method`, `help`).
  *Nota para Vulcano:* el brief decía "el MCP real expone 17"; medido hoy en esta rama son 30.
  El punto se cumple igual: el número ya no se escribe, se lee.
- [x] **B3.5 — Un token MCP real estaba escrito en el código de una página pública.**
  Un `vfmcp_` con 28 caracteres reales estaba escrito en `app/mcp/page.tsx` (paso 02).
  No se reproduce aquí; se ve en el diff de este commit. Sustituido por un
  formato obviamente falso (`vfmcp_xxxx…`) con la advertencia de no compartirlo.
  **[LUIS / Vulcano]: ese prefijo ya está en el historial público de git. Hay que revocar ese token
  en la tabla de tokens MCP aunque esté truncado.**
- [x] **B3.6 — La sección "Ejemplo real de conversación" era ficción, y con datos de un cliente.**
  Pintaba respuestas inventadas del agente ("Encontré 17 proyectos", "Estado: construyendo · ~45
  segundos", "ID: dpl_8kQm…") y publicaba **nombre de cliente, proyecto y monto**
  ("cliente Hilda, proyecto happytoc.life, $8,000 MXN con anticipo de $2,000") — MUST-500 §203.
  Sustituida por "Qué le puedes pedir con el MCP conectado": solo las peticiones, cada una con la
  tool real que la atiende, y la aclaración de que la respuesta la da la infraestructura del usuario.
- [x] **B3.7 — El paso 05 también pintaba una "respuesta esperada" inventada** con proyectos reales
  de Luis (`istore-pro`, `happytoc.life`, `ruta618.life`). Se quedó solo la petición.
- [x] **B3.8 — Verificación.** `grep -nE "40%|70%|8min|30s|45 segundos|5 minutos|14 herramientas|17 proyectos|Hilda|8,000|istore-pro|happytoc|ruta618|vfmcp_[0-9a-f]" app/mcp/page.tsx`
  → **0 coincidencias**. `npx tsc --noEmit -p .` → 0 errores. Desborde `/mcp`: 0 a 390 y 1440.
  Capturas: `mcp-390-hero.png`, `mcp-390-tools.png`, `mcp-1440.png`.

### Pendiente detectado en el bloque 3

- [ ] Las tarjetas de herramientas usan `bg-[var(--surface-1)]`, que en el tema claro sale **blanca
  sobre la página negra** `#03020a`. Se lee, pero desentona. Es anterior a este barrido y toca tema
  de marca → **[LUIS]**.
- [ ] `/mcp` tiene 12 textos por debajo de 12 px (`text-[10px]`, `text-[11px]`). Se atiende con el
  resto del barrido de tipografía (bloque 7/10).
