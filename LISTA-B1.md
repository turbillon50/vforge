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

---

## Bloque 4 · El aviso "Avisos en el teléfono"

Criterio: que no tape nada, que al cerrarlo no vuelva, safe-area en móvil.
Capturas de `/app/chat`, `/app/projects` y `/app/tablero` a 390 y 1440.

**Cómo se midió.** Con el `next dev` en `:3150` y el entorno sin llaves de Clerk
(`.env.nocl`), que es lo que deja renderizar `/app/*` en local. Para que el aviso se
pintara en WebKit headless se sustituyeron **solo dos capacidades del entorno** que ahí no
existen —la sesión de Clerk y `PushManager`—; la lógica de descarte y el conteo de visitas
se probaron **sin tocar**. El parche se revirtió antes de commitear
(`grep -rn FORZADO components/ app/ lib/` → 0 coincidencias en código de la app).
Scripts: `/root/vulcano-audit/vforge-rescate/medir_push.py` y `verif_push.py`.

- [x] **B4.1 — Dejó de flotar: ahora es una franja del shell.**
  Era un `position: fixed` abajo a la derecha, montado desde `app/layout.tsx` sobre TODA la
  app. Ahora vive dentro de `WorkspaceShell`, entre el encabezado y `<main>`, en el flujo
  normal. En el Estudio el contenedor pasó a `flex flex-col` y `<main>` a `min-h-0 flex-1`,
  así que el Estudio **se encoge solo** en vez de quedar tapado.
  Medición (rejilla de puntos dentro de la caja del aviso; `elementsFromPoint` dice qué
  queda debajo):

  | ruta | vista | antes: posición | antes: área tapada | después: posición | después: área tapada |
  |---|---|---|---|---|---|
  | /app/chat | 390 | `fixed` | **2,752 px²** (el compositor) | `static` | **0** |
  | /app/projects | 390 | `fixed` | 0 | `static` | **0** |
  | /app/tablero | 390 | `fixed` | 0 | `static` | **0** |
  | /app/chat | 1440 | `fixed` | 0 | `static` | **0** |
  | /app/projects | 1440 | `fixed` | **1,920 px²** (el pie) | `static` | **0** |
  | /app/tablero | 1440 | `fixed` | **1,920 px²** (el pie) | `static` | **0** |

  El solape contra `<main>` pasó de **50–51 px** a **0** en las 6 medidas.
  En la captura de antes (`cap-b4-antes/390-app_chat.png`) se ve el aviso partiendo por la
  mitad el texto del compositor ("Crea o selecciona un proyecto para trabajar con
  contexto…"); en la de después (`cap-b4-despues/390-app_chat.png`) el compositor se lee
  completo. Archivos: `cap-b4-antes/` y `cap-b4-despues/`, 6 capturas cada uno, miradas.

- [x] **B4.2 — Al cerrarlo ya no vuelve.** Guardaba el descarte en `sessionStorage`, que es
  **por pestaña**: abrir una pestaña nueva lo resucitaba. Ahora es `localStorage`.
  Verificado (`verif_push.py`): desaparece al tocar Cerrar · sigue cerrado al recargar ·
  sigue cerrado al navegar a las 3 rutas · **sigue cerrado en una pestaña nueva**.

- [x] **B4.3 — Ya no salta en la primera carga** (MUST-500 §18). Antes aparecía en cuanto
  había sesión. Ahora cuenta pantallas de `/app` y sale a partir de la **3.ª**.
  Medido: visita 1 → oculto · visita 2 → oculto · visita 3 → visible.
  **Contraprueba del verde** (SANIDAD §0.5): en un perfil limpio la prueba confirma que a la
  3.ª visita **sí** aparece, así que no es un falso verde por estar siempre oculto.

- [x] **B4.4 — Nunca pide el permiso de notificaciones solo** (MUST-500 §19).
  Medido interceptando `Notification.requestPermission`: **0 llamadas** sin que el usuario
  toque "Activar".

- [x] **B4.5 — Si el dispositivo no soporta push, la franja ya no se pinta.**
  Antes se mostraba el aviso y `EnablePush` devolvía `null` en su variante compacta: una
  franja con título y una × y **ningún botón que hiciera algo** (MUST-500 §269, SANIDAD
  "botón muerto"). Ahora el propio aviso comprueba `serviceWorker` + `PushManager`.
  Se vio en la medición: WebKit headless no expone `PushManager` y la franja no apareció.

- [x] **B4.6 — Letra y área táctil dentro de norma.** La franja tenía título de **11 px** y
  subtítulo de **9 px** (este último escondido en móvil, así que en el celular el aviso no
  explicaba nada). Ahora 13 px y 12 px, visibles en las dos vistas.
  El botón de cerrar medía **32×32 px** → ahora **44×44** (MUST-500 §274), medido en las 6
  corridas. El botón "Activar" de `EnablePush` compacto tenía letra de **10 px** y 32 px de
  alto → **14 px** y 44 px (MUST-500 §144 y §274); los textos de 11 px del mismo componente
  pasaron a 12 px.

- [x] **B4.7 — Safe-area.** Al estar en el flujo y arriba, el aviso ya no compite por
  `env(safe-area-inset-bottom)`: el único dueño vuelve a ser el pie del shell. Antes el
  aviso lo sumaba por su cuenta (`bottom-[calc(8rem+env(...))]`) y aun así se encimaba.

- [x] **B4.8 — Verificación.** `npx tsc --noEmit -p .` → 0 errores.
  `npm test` → **90 pruebas, 0 fallos**. Desborde horizontal: 0 en las 6 medidas.

### De paso en el bloque 4

- [x] **B4.9 — `.env.nocl` traía secretos reales y NO estaba ignorado por git.**
  `.gitignore` sólo tenía `.env*.local`, que no cubre `.env.nocl` (ni `.env.produccion`).
  El archivo tiene 69 claves reales bajadas de Vercel (`STRIPE_SECRET_KEY`, `BRAIN_SECRET`,
  `CLERK_*`, `GITHUB_TOKEN`…). Ahora la regla es `.env` + `.env.*` con `!.env.example`.
  Doctrina §6.9. No llegó a subirse: estaba sin rastrear.

### Pendiente detectado en el bloque 4 (se atiende en el bloque 10)

- [ ] `/app/tablero` muestra el error crudo del sistema al usuario:
  **"No pude leer el servidor — The string did not match the expected pattern."**
  Mensaje técnico y en inglés (MUST-500 §236 y §358), sin botón de reintentar.
  Visto en `cap-b4-despues/1440-app_tablero.png`.
- [ ] `/app/projects` muestra "Tu sesión no está autorizada para ver el catálogo." con un
  enlace "Volver a intentar" que no es un botón. Revisar en el bloque 10.

---

## Bloque 5 · `/workspace/studio` en móvil

Criterio: en móvil una columna con pestañas (Chat / Vista / Archivos). Escritorio igual que hoy.

**Cómo se probó.** `ClientShell` usa `useUser()` de Clerk y en local revienta ("Esta vista del
workspace falló"), así que se montó una ruta espejo desechable `app/zz-prueba-studio` que
renderiza `<WorkspaceStudio />` con la misma altura que le da el shell real. Los datos
(`/api/forja/apps`, `/api/forja/app-files`, `/api/onboarding/status`) se inyectaron
interceptando la red con Playwright, nunca escribiendo en la base ni en Clerk. La ruta se
**borró antes de commitear** (`grep -rn zz-prueba app/ components/ lib/` → 0).
Script: `/root/vulcano-audit/vforge-rescate/medir_studio.py`.

- [x] **B5.1 — En móvil el panel central medía 0 px de ancho: la vista previa no existía.**
  Las tres columnas son `300 px + centro + 300 px`; a 390 px las dos laterales se comían la
  pantalla entera y el centro quedaba en **0**. Medido:

  | | 390 antes | 390 después | 1440 antes | 1440 después |
  |---|---|---|---|---|
  | panel Chat | 300 | **390** | 300 | 300 |
  | panel central | **0** | **390** (pestaña Vista) | 828 | 828 |
  | panel Archivos | 300 | **390** (pestaña Archivos) | 300 | 300 |
  | paneles visibles | 2 (uno vacío) | **1** | 3 | **3** |

  **El escritorio quedó idéntico: 300 / 828 / 300 antes y después**, y la barra de pestañas
  no se pinta (altura 0 a 1440). Capturas: `cap-b5-antes/390-studio.png`,
  `cap-b5-despues/390-studio.png`, `cap-b5-despues/1440-studio-verif.png`.

- [x] **B5.2 — 18 elementos cortados → 0.** El desborde no salía en `scrollWidth` porque los
  contenedores lo recortaban con `overflow:hidden`: la página no se corría de lado, el
  contenido simplemente **se cortaba**. Medido buscando cajas de texto que se salen de su
  contenedor recortante. A 390 px: "Código" terminaba en x=426, "Consola" en 512,
  "Detalles" en 598, "Deploy" en 683 y el panel "Archivos" en 600, todos contra un límite de
  390. Ahora **0 cortados** a 390 y a 1440.

- [x] **B5.3 — Pestañas Chat / Vista / Archivos por debajo de 1024 px.**
  `role="tablist"` con `aria-selected` y `aria-controls` (MUST-500 §293). Verificado: arranca
  en Chat con un solo panel visible; al tocar cada pestaña **solo** su panel mide > 0 px y su
  `aria-selected` pasa a `true`; a 1440 la barra no se pinta y los 3 paneles siguen visibles.
  El ancho arrastrable de escritorio pasó de `style={{width}}` a una variable CSS aplicada
  solo en `lg:`, para que móvil use el ancho completo sin tocar el comportamiento de ratón.

- [x] **B5.4 — Tocar un archivo en móvil no hacía nada visible.** "Archivos" abría el fichero
  en el panel central… que en móvil estaba oculto (SANIDAD: `MUERTO`). Ahora `openFile`
  también cambia a la pestaña **Vista**. Verificado: tras tocar `package.json` el panel Vista
  mide > 0.

- [x] **B5.5 — Las 4 vistas (Preview/Código/Consola/Detalles) se salían de la barra superior.**
  En móvil se pintan dentro del propio panel "Vista", que es a lo que pertenecen; en
  escritorio siguen en la barra de arriba, igual que hoy. La barra superior ahora envuelve en
  varias filas en móvil y conserva su fila única de 56 px en `lg:`.

- [x] **B5.6 — 15 controles por debajo de 44 px → 0** (MUST-500 §274). Eran de 28–38 px:
  el selector de app (38), las 4 pestañas de vista (30), Deploy (28), el campo de mensaje (31)
  y el botón de enviar (31), más los de archivos y apps. Medido a 390 y 1440: **0 controles
  por debajo de 44 px** en las dos vistas.

- [x] **B5.7 — Los campos hacían zoom en iOS.** El campo de mensaje y el selector median
  **14 px**; por debajo de 16 px Safari hace zoom al enfocar (MUST-500 §145).
  Medido: `inputFont` 14 → **16** en móvil (en escritorio se queda en 14, donde no aplica).

- [x] **B5.8 — El chat corría la página entera** (SANIDAD R-006, el mismo bug que `/lab`).
  `endRef.current.scrollIntoView()` mueve el documento completo. Ahora el scroll es
  `feed.scrollTo()` dentro del contenedor, con `overscroll-contain`.

- [x] **B5.9 — Botones sin nombre accesible y textos en inglés.** El botón de enviar era solo
  "►" sin `aria-label` (MUST-500 §282); los tiradores de ancho decían "Resize left pane" en
  inglés (§358) y eran `div` con `onMouseDown` sin rol (§281) → ahora `role="separator"` con
  etiqueta en español, y ocultos en móvil, donde no hay columnas que redimensionar.
  Los `target="_blank"` pasaron de `rel="noreferrer"` a `rel="noopener noreferrer"` (§91).

- [x] **B5.10 — Verificación.** `npx tsc --noEmit -p .` → 0 errores.
  `npm test` → **90 pruebas, 0 fallos**. Desborde 0 a 390 y 1440.

### Pendiente detectado en el bloque 5 (se atiende en el bloque 8/10)

- [ ] El estado de las conexiones se pinta con un verde genérico `#86efac` sobre blanco
  (≈1.6:1 de contraste, ilegible) y el "-" de no conectado con `rgba(0,0,0,0.35)`.
  Fuera de paleta (MUST-500 §162) y por debajo de 4.5:1 (§270).
- [ ] La pestaña "Consola" pinta un log fijo escrito a mano (`$ vforge dev`, `Build OK`) que
  no viene de ninguna ejecución real. Es un dato inventado: o sale del servidor o se omite.
