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

---

## Bloque 2 · `/forja` y `/lab`

Criterio: desborde 0 en las dos; encontrar y bajar los 14 s de `/lab`.

**Cómo se probaron rutas con sesión.** Clerk de VForge es una instancia de producción: el patrón de
`sign_in_tokens` funciona contra `vforge.site` pero **no** contra `localhost:3150` (el ticket vuelve a
`/sign-in`). Para poder medir en local se montaron dos rutas espejo desechables,
`app/(dashboard)/zz-prueba-lab` y `app/(dashboard)/zz-prueba-forja`, que renderizan los mismos
componentes dentro del mismo `WorkspaceShell` sin el guardia de sesión, y se **borraron antes de
commitear** (`git status` limpio de `zz-prueba-*`). Los datos se inyectaron interceptando la red con
Playwright (`page.route`), nunca escribiendo en la base ni en Clerk.

- [x] **B2.1 — `/forja`: 312 px → 0.** Dos causas, las dos medidas:
  1. La fila de pestañas (`Diagnóstico · Ensamblaje · Tester · Preview`) era un `flex` sin `wrap`:
     a 390 px el botón "Preview" terminaba en `right=473` (83 px fuera). Ahora `flexWrap: "wrap"`.
  2. En Diagnóstico, la rejilla `1fr 1.4fr` de "Cola de trabajos / Últimos jobs" no podía encoger:
     el título de cada job usa `whiteSpace: nowrap` con `flex: 1`, y `flex:1` deja `flex-basis` en 0
     pero **`min-width` sigue en `auto`**, así que el min-content de la pista era el texto completo
     (`div right=702 w=584`, es decir 312 px fuera). Ahora `minWidth: 0` en el título y la rejilla es
     `minmax(0,1fr) minmax(0,1.4fr)`, que además pasa a una sola columna por debajo de 760 px.
  **Contraprueba** (con datos inyectados, código viejo vs nuevo, WebKit 390):
  `ov=229` → `ov=0`. Escritorio 1440: `ov=0` antes y después. Captura: `forja-390.png`, `forja-1440.png`.

- [x] **B2.2 — `/lab`: 53 px → 0.** El encabezado metía en una sola fila el título, el contador de
  mensajes y los 4 filtros (`div right=443 w=268`). Ahora el encabezado y el grupo de filtros hacen
  `wrap`, y las tres pastillas de agente llevan `flex: 1 1 0` + `minWidth: 0` con elipsis.
  **Contraprueba**: código viejo `ov=53` → nuevo `ov=0` (WebKit 390). 1440: 0 en ambos.
  Captura: `lab-390.png`, `lab-1440.png`.

- [x] **B2.3 — Los 14 s de `/lab`: qué eran de verdad.**
  No es que la página tarde en pintar. `/lab` abre un `EventSource` permanente contra
  `https://brain.vforge.site/drain/stream` (el feed en vivo de los agentes), así que la red **nunca**
  queda en reposo y el `wait_for_load_state("networkidle", 12 s)` del script de medición agota su
  tiempo: 12 s de espera + 1.5 s fijos ≈ los 14 s del informe. Medido en WebKit, misma página:

  | | networkidle | FCP |
  |---|---|---|
  | con el SSE vivo (como en producción) | **>12 s (timeout)** | **192 ms** |
  | con `brain.vforge.site` bloqueado | **1.3 s** | 254 ms |

  Es decir: el usuario ve la pantalla en ~0.2 s. El 14 era del medidor, no de la app.
  Queda anotado para que la re-medición final no lo cuente como regresión.

- [x] **B2.4 — Aun así `/lab` tenía tres cosas mal, y quedaron arregladas.**
  - **Conexión eterna en segundo plano.** El `EventSource` se abría al montar y no se cerraba nunca.
    Ahora se abre solo con la pestaña visible y se cierra en `visibilitychange`.
  - **Espera infinita (SANIDAD R-007).** Si el canal no conectaba, la pantalla decía
    "Esperando mensajes (desconectado)" para siempre, sin salida. Ahora hay tres estados honestos:
    "Conectando…", "Conectado. Aquí aparecerán los mensajes" y, a los 10 s sin conexión,
    "No se pudo conectar con el canal de agentes" con un botón **Reintentar** de 44 px que vuelve a abrir.
  - **`scrollIntoView` fuera de su contenedor (SANIDAD R-006).** Cada mensaje nuevo llamaba
    `bottomRef.scrollIntoView()`, que mueve la **página entera** (también en horizontal). Ahora el
    scroll es `feed.scrollTo()` dentro del contenedor, y solo si el usuario ya estaba pegado abajo.

- [x] **B2.5 — `/lab` tenía doble barra de scroll.** `AgentMonitor` medía `height: 100dvh` dentro del
  shell, que ya pone un encabezado de 58 px y un pie de 72 px: la página quedaba en 975 px de alto con
  844 de pantalla y el pie fuera de vista. Ahora mide `calc(100svh - 58px - 72px)`, la misma cuenta
  que usa `<main>`. Medido: `scrollHeight` 975 → **845** con `innerHeight` 844.

- [x] **B2.6 — Verificación.** `npx tsc --noEmit -p .` → 0 errores. `npm test` → **90 pruebas, 0 fallos**.
