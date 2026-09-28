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

---

## Bloque 6 · Splash

Criterio: visitas repetidas se lo saltan; primera visita corto; el fallback sin JavaScript sigue
funcionando.

**Cómo se midió.** `next dev` en `:3150` con el entorno sin llaves de Clerk (`.env.nocl`), que es
lo que deja renderizar la portada pública (`app/page.tsx` sólo llama a `auth()` si hay
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`). WebKit, 390×844 y 1440×900. Dos scripts:
`medir_splash.py` (línea base, `med-b6-antes.json`) y `verif_splash.py` (contraprueba fina, muestreo
cada 16 ms = 1 frame, `med-b6-verif.json`).

- [x] **B6.1 — La primera visita duraba más de 5 s. Ahora 2.7 s.**
  Eran dos relojes en paralelo, los dos por encima del límite de 3 s (MUST-500 §2):
  el de React (`DUR = 4200` en `MonochromeHome.tsx`) y el respaldo en CSS puro
  (`animation:fxSplashOut .7s 4.6s` = 5.3 s). La secuencia interna también iba larga:
  cimientos `2.4s` con retardos `.3s`/`.5s`, y "nace VForge" `1.5s` con retardo `2.5s`.
  Se comprimió la misma animación (mismos fotogramas, mismo orden, misma marca), no se rediseñó:

  | | antes | después |
  |---|---|---|
  | cimientos GitHub / Vercel | `2.4s` @ `.3s` / `.5s` | `1.3s` @ `.15s` / `.25s` |
  | "nace" VForge | `1.5s` @ `2.5s` | `.85s` @ `1.35s` |
  | reloj de React (`DUR`) | `4200 ms` | `2350 ms` |
  | respaldo CSS sin JS | `4.6s` + `.7s` salida | `2.5s` + `.45s` salida |

  **Medido con muestreo por frame (16 ms), la capa que tapa la pantalla:**

  | vista | antes | después |
  |---|---|---|
  | 390 | nunca se quitó dentro de la muestra (>5.3 s) | **de 183 ms a 2,712 ms** |
  | 1440 | nunca se quitó dentro de la muestra (>5.3 s) | **de 181 ms a 2,698 ms** |

  Capturas miradas: `cap-b6-antes/390-visita1.png` (a los 3 s **sólo se ve el splash**) →
  `cap-b6-despues/390-v1-1200ms.png` (splash) y `390-v1-3500ms.png` (portada completa).

- [x] **B6.2 — Las visitas repetidas NO se lo saltaban. Ahora no pintan ni un frame.**
  El splash de la portada no consultaba ningún almacenamiento: salía **siempre**, en cada recarga y
  en cada pestaña nueva. Medido antes: `splash_v2_visto=true`, `splash_recarga_visto=true` en 390 y 1440.
  Ahora un `<script>` en línea colocado **antes** del `div` del splash en el DOM marca
  `<html data-vf-splash="off">` y el CSS lo esconde con `display:none`, así que el navegador nunca
  llega a pintarlo. `localStorage`, no `sessionStorage`: "visita repetida" es por aparato, no por pestaña
  (la misma lección de B4.2).

  | | antes | después |
  |---|---|---|
  | pestaña nueva, mismo dispositivo | visible | **no visible** |
  | recarga | visible | **no visible** |
  | frames tapados en la visita repetida (muestreo 16 ms) | — | **0** en 390 y 1440 |

  Si `localStorage` está bloqueado (Safari privado) el `try/catch` no marca nada y el splash sale:
  degrada al comportamiento de hoy, nunca rompe la portada.

- [x] **B6.3 — Al saltar el splash la portada se quedaba en blanco hasta que hidrataba React.**
  Lo encontró la contraprueba, no el criterio: con el splash ya escondido, la captura a 150 ms
  mostraba **sólo el encabezado** y el resto vacío. El hero es `.fx-reveal` (opacity 0) y dependía del
  `IntersectionObserver`, que sólo corre al hidratar; el respaldo en CSS estaba a 3 s.
  Arreglo acotado al hero: `html[data-vf-splash="off"] .fx-hero .fx-reveal{ animation-delay:.1s }`.
  Las demás secciones conservan su aparición por scroll. Antes/después en
  `cap-b6-despues/390-repetida-150ms.png` (hero legible) y `1440-repetida-150ms.png`.

- [x] **B6.4 — El fallback sin JavaScript sigue funcionando, y ahora dentro del límite.**
  Antes: a los 1.5 s la pantalla seguía tapada (`sinjs_tapado=true`) y no se despejaba hasta 5.3 s.
  Después: **a los 2.9 s el splash ya no está** y se leen marca, "Entrar" y "Empezar gratis"; a los
  3.1 s el hero está completo. Medido `sinjs_tapado=false` a 390 y 1440.
  Texto servido sin JS: 2,339 caracteres (390) y 2,384 (1440) — el HTML inicial ya trae la portada
  (MUST-500 §21). Capturas: `cap-b6-despues/390-sinjs-2900ms.png` y `390-sinjs-3100ms.png`.

- [x] **B6.5 — No había `<noscript>` en ninguna ruta** (MUST-500 §4). Medido antes: `noscript: []`.
  Ahora el layout raíz trae uno en español, con el contacto **real** que ya usan `/support`,
  `/privacidad` y `/terminos` (`luisdelator@vmomentums.info`) — no un correo inventado.
  Va anclado **abajo**: puesto arriba se encimaba con el encabezado `position:fixed` de la portada
  (se vio en la primera captura de verificación). Lleva `env(safe-area-inset-bottom)`.

- [x] **B6.6 — Había DOS splash montados sobre la misma visita.**
  `app/layout.tsx` monta `<SplashScreen />` (blanco, `z-9999`, framer-motion) en **todas** las rutas,
  y la portada además pinta el suyo (`#fx-splash`, negro, `z-9999`). En la portada el negro tapaba al
  blanco por orden del DOM, así que no se notaba — pero al saltarse el negro en visitas repetidas
  (B6.2) el blanco habría quedado al descubierto: un destello blanco de 560 ms
  (MUST-500 §5 "sin destello blanco" y §17 "un aviso a la vez"). Ahora `SplashScreen` no se monta en
  `/`, que tiene el suyo. La ruta se lee al montar (no con `usePathname`) porque el componente vive en
  el layout raíz y no se vuelve a montar al navegar: con `usePathname` el splash habría aparecido a
  media navegación.
  De paso: dejaba de escribir `vf-monochrome-splash-v1` en `sessionStorage` desde la portada, que
  suprimía el splash de `/app/*` en la misma sesión sin que nadie lo hubiera visto.

- [x] **B6.7 — El "TOCA PARA SALTAR" no cumplía contraste ni tamaño.**
  `11 px` en `#565656` sobre `#0A0A0A` = **2.6:1** (MUST-500 §144 y §270).
  Ahora `12 px` en `#8A8A8A` = **5.7:1**. Sigue siendo el mismo gris discreto de la pieza.

- [x] **B6.8 — Verificación.** `npx tsc --noEmit -p .` → 0 errores.
  `npm test` → **90 pruebas, 0 fallos**. FCP de la portada: **171 ms** (390) y **147 ms** (1440).

### Pendiente detectado en el bloque 6

- [ ] `.fx-reveal` tiene un respaldo en CSS (`fxRevealIn … forwards`) que corre **siempre**, no sólo
  sin JavaScript: a los 3 s del arranque vuelve visibles **todas** las secciones, también las que están
  fuera de pantalla, así que la aparición por scroll queda en adorno. Es anterior a este barrido
  (antes pasaba a los 5.4 s, misma distancia del final del splash) y no es criterio del bloque 6.
  Se anota para el bloque 10.

---

## Bloque 7 · `/app/projects` en móvil

Criterio: letra mínima 12 px (MUST-500 §144) y la lista paginada o virtualizada.

**Cómo se midió.** `next dev` en `:3150` con `.env.nocl`. El catálogo se inyectó interceptando
`**/api/projects` con Playwright: **339 proyectos `zz-prueba-*` fabricados en el script**, nunca
escritos en la base ni en Clerk, con la misma forma que devuelve la API (categorías, avance, montos,
repos, fechas). Scripts: `medir_projects.py` (medición) y `verif_projects.py` (el botón y el núcleo).
Resultados: `med-b7-antes.json`, `med-b7-despues.json`, `med-b7-final.json`.

- [x] **B7.1 — 4,588 textos por debajo de 12 px → 0.**
  El brief hablaba de "más de 2,400"; medido en WebKit con el catálogo completo son **4,588** nodos de
  texto con `font-size < 12px` (se cuentan los de las 339 filas, por eso sube). Tres fuentes, las tres
  arregladas en su origen y no fila por fila:

  | origen | antes | después |
  |---|---|---|
  | `text-[9px]` / `[10px]` / `[11px]` escritos a mano en `app/app/projects/page.tsx` | 9 px, 10 px, 11 px | **12 px** |
  | token `label-caps` de `tailwind.config.ts` (lo usa todo el shell) | 11 px | **12 px** |
  | clase `.mono-label` de `app/globals.css` | 10 px (`0.625rem`) | **12 px** (`0.75rem`) |

  Quedaba un último rezagado fuera de la página: la pastilla "Sesión local" de `WorkspaceShell`
  con `text-[9px]` → 12 px. Medición por pasos: **4,588 → 6 → 0** en 390 y en 1440.
  `grep -noE 'text-\[(9|10|11)px\]' app/app/projects/page.tsx` → **0 coincidencias**.

- [x] **B7.2 — 339 proyectos pintados de golpe → tandas de 40.**
  Cada fila monta un `ProjectRow` completo (pastillas, barra de avance, acciones y, al abrirla, un
  `Detail`). Medido a 390 px:

  | | antes | después |
  |---|---|---|
  | filas pintadas | **339** | **40** |
  | nodos del DOM | **13,266** | **1,775** (−87 %) |
  | alto de la página (390) | **132,631 px** | **17,799 px** |
  | alto de la página (1440) | 39,512 px | **5,915 px** |

  Los filtros y el orden siguen actuando sobre **todo** el catálogo, no sobre lo que se ve: se pagina
  al pintar, no al filtrar. Se eligió paginar y no virtualizar porque las filas se expanden a alturas
  distintas (el `Detail` abierto), y una lista virtualizada con alturas variables habría roto el
  acordeón que ya funciona (Doctrina §6.3: lo que llega funcionando no se toca).

- [x] **B7.3 — El botón hace lo que dice y deja su consecuencia** (SANIDAD §0.2).
  Verificado con `verif_projects.py` en WebKit 390:
  - filas **40 → 80** al tocar "Ver 40 más";
  - el contador dice la verdad: **"40 de 339 proyectos en pantalla" → "80 de 339"**, con `aria-live="polite"`;
  - el botón mide **112 × 44 px** (MUST-500 §274: ≥ 44);
  - al agotarse el catálogo el botón desaparece y queda "Se muestran los N proyectos" (sin botón muerto).

- [x] **B7.4 — Al filtrar se vuelve a la primera tanda.**
  Sin esto el usuario expandía a 80, buscaba, y seguía viendo la lista "expandida" de la búsqueda
  anterior. Verificado: tras expandir a 80 y escribir en el buscador, **80 → 14 filas**.

- [x] **B7.5 — Verificación.** `npx tsc --noEmit -p .` → **0 errores**.
  `npm test` → **90 pruebas, 0 fallos**. Desborde horizontal de `/app/projects`: **0** a 390
  (a 1440 da −8, que es el ancho de la barra de scroll, no un desborde).

### De paso en el bloque 7

- [x] **B7.6 — El `SplashScreen` del layout raíz podía quedarse pintado para siempre**
  (MUST-500 §8, SANIDAD R-007). El efecto hacía `return` a media función cuando ya había marca en
  `sessionStorage`, **antes** de programar el temporizador que retira la capa. En el camino en que
  `setVisible(true)` ya había corrido (montaje doble del modo estricto, o una segunda pasada del
  efecto), nadie volvía a apagarlo. Ahora se lee y se escribe el almacenamiento primero, se decide
  después, y la limpieza del efecto siempre apaga la capa.

### Pendientes detectados en el bloque 7 (entran al bloque 10)

- [ ] La letra chica no es sólo de `/app/projects`. Medido en el núcleo con el mismo contador
  (`verif_projects.py`), nodos con `font-size < 12px`:

  | ruta | 390 | 1440 |
  |---|---|---|
  | /app/chat | **80** | **387** |
  | /app/activity | **200** | **200** |
  | /app/integrations | **37** | **37** |
  | /app/setup | **8** | **8** |
  | /app/projects · /app/tablero · /app/settings · /app/admin | 0 | 0 |

---

## Bloque 8 · Marketplace

Criterio: títulos de tarjetas con contraste ≥ 4.5:1; texto del encabezado sin cortarse en móvil.

**Cómo se midió.** Se escribió un medidor de contraste que **lee el píxel del fondo** en vez de
deducirlo del CSS: `contraste.py`. Pinta todos los textos en transparente, toma una captura, y el
fondo de cada texto es el píxel de esa captura en el centro de su caja. Hizo falta porque la primera
versión subía por los ancestros leyendo `backgroundColor` y **daba el pie de página por blanco**
(el pie no tiene color de fondo: su oscuro lo pinta un degradado de un ancestro) — 25 rojos falsos
que se vieron al mirar la captura. Mínimo WCAG AA de MUST-500 §270: 4.5:1, o 3:1 si el texto es
≥ 24 px o ≥ 18.66 px en negrita. Resultados: `med-b8-antes.json`, `med-b8-despues.json`,
`med-b8-appmk.json`, `med-b8-appmk-despues.json`.

**Dos correcciones al propio medidor, las dos encontradas mirando:**
1. El contenido detrás de un diálogo abierto está bajo un velo a propósito (`bg-black/60`): medirlo
   daba rojos donde no se lee ni se toca nada. La hoja se mide acotada a su subárbol.
2. `nextjs-portal` (el indicador de `next dev`, que **no existe en producción**) colaba su insignia
   roja como "fondo" de los textos que caían debajo: 2 rojos falsos. Se oculta antes de medir.

**Y una corrección al método.** Las primeras capturas salieron **en inglés**: la app cae a
`navigator.language` (`i18n/AppProviders.tsx:41`) y el WebKit de pruebas pide `en-US`. No es un fallo
del producto —el diccionario `es` está completo y es el `defaultLocale`— era el navegador de pruebas.
Desde aquí todos los contextos se abren con `locale="es-MX"`, que es lo que ve Luis.

- [x] **B8.1 — Los títulos no eran "gris sobre blanco": eran BLANCO sobre blanco.**
  `text-white` (#ffffff) sobre la tarjeta `--surface-1` (#f7f7f5) = **1.07:1**. No es poco contraste,
  es texto invisible. Se ve en `cap-b8-antes/390-marketplace.png`: donde debería decir "APSUS" no hay
  nada. Causa: la página fija un fondo oscuro a mano (`bg-[#03020a]`) pero usa los tokens del tema,
  que en VForge son **monocromos y claros** (`[data-theme="light"]` y `[data-theme="dark"]` comparten
  el mismo bloque en `globals.css:6`). La página se escribió para un tema violeta que ya no existe.
  Arreglo: el texto de la tarjeta clara va oscuro (`--fg-primary`, #090909 → **18.6:1**).

- [x] **B8.2 — Un velo de imagen estaba oscureciendo la tarjeta entera.**
  El degradado `absolute inset-0 bg-gradient-to-t from-black/60` debía cubrir la foto, pero el
  contenedor de la foto no era `relative`: se anclaba a la **tarjeta** (que sí lo es). Por eso las
  tarjetas con foto medían un fondo gris medio (rgb(146,146,145)) en vez de blanco, y el título
  quedaba en 3.11:1. Arreglo: `relative` en el contenedor de la foto.

- [x] **B8.3 — Contraste de `/marketplace`: 42 textos bajo mínimo → 0.**

  | texto | antes | después |
  |---|---|---|
  | Título de tarjeta ("APSUS", "Clerk Auth"…) | **1.07:1** (blanco sobre blanco) | **18.6:1** |
  | Título sobre tarjeta con foto | **2.56–3.11:1** | **18.6:1** |
  | Subtítulo de tarjeta | **1.96–2.21:1** | **7.0:1** |
  | "● Disponible" (`text-emerald-400`, que el tema aplana a gris) | **1.02:1** | **18.6:1** |
  | Precio ("Incluido en Forge") | **1.02:1** | **7.0:1** |
  | "◌ Próximamente" (`text-violet-300/60` → casi negro) | **4.26:1** | **7.0:1** |
  | Antetítulo "V-Shop" (`text-violet-400/60` → #4f5257) | **1.61:1** | **5.7:1** |
  | Bajada del hero | **4.29:1** | **5.7:1** |

- [x] **B8.4 — El titular "tu próxima app." era un degradado de un solo color.**
  `bg-gradient-to-r from-violet-400 to-violet-400` (los dos extremos iguales) pintado con
  `bg-clip-text text-transparent`. Con el tema monocromo, `violet-400` es **#4f5257**: el titular
  salía gris oscuro sobre fondo casi negro. Ahora es un color sólido del tema (`--fg-subtle`),
  que mantiene los dos tonos del titular y se lee. Se ve en las dos capturas.

- [x] **B8.5 — La hoja de detalle sí es oscura, y ahí el texto iba oscuro.**
  Sobre `#0b0614`, `--fg-tertiary` (#55585d) daba **2.8:1**. Arreglo: en esa hoja el texto va claro.
  Medido con la hoja abierta: **0 bajo mínimo** a 390 y 1440. Captura `cap-b8-despues/390-hoja.png`.

- [x] **B8.6 — El encabezado en móvil: el texto iba pegado a los dos bordes.**
  El hero no tenía padding horizontal, así que la bajada se pintaba de borde a borde a 390
  (margen 0 px). Ahora **20 px** de margen a cada lado; `h1` y bajada sin recorte
  (`scrollWidth ≤ clientWidth`), desborde 0.

  | | antes | después |
  |---|---|---|
  | margen mínimo al borde (390) | **0 px** | **20 px** |
  | `h1` recortado / bajada recortada | no / no | no / no |

- [x] **B8.7 — El marketplace del workspace (`/app/marketplace`) tenía el mismo fallo, peor.**
  `MarketplaceGrid` está escrito entero para tema oscuro (`text-white`, `text-white/60`,
  `text-white/40`) y vive en el workspace **claro**: **53 textos bajo mínimo**, los nombres de módulo
  a 1.07:1 y las descripciones a 1.04:1. Además traía acentos violeta escritos a mano
  (`#c4b5fd`, `#a78bfa`, `rgba(139,92,246,…)`) que el tema monocromo no aplana porque no pasan por
  los tokens. Todo pasó a tokens del tema. Medido: **53 → 0** a 390 y 1440.
  `grep -c 'text-white\|rgba(139,92,246\|emerald' components/workspace/MarketplaceGrid.tsx` → **0**.

- [x] **B8.8 — De paso, la letra de las dos pantallas.** `text-[10px]` y `text-[11px]` → **12 px**
  (MUST-500 §144), igual que en el bloque 7. En las tarjetas, estado y precio pasaron a columna:
  a 390 la tarjeta mide ~155 px y los dos juntos en una fila se partían a la vez.

- [x] **B8.9 — Contraprueba del verde** (SANIDAD §0.5). Con todo en 0, se volvió a poner
  `color:#fff` en los 17 títulos y el medidor los marcó otra vez: **1.07:1 'APSUS'**, 2 rojos a 390
  y 8 a 1440. La prueba sabe fallar, así que el 0 vale.

- [x] **B8.10 — Verificación.** `npx tsc --noEmit -p .` → **0 errores**.
  `npm test` → **90 pruebas, 0 fallos**. Desborde `/marketplace`: 0 a 390.
  Capturas miradas: `cap-b8-antes/` y `cap-b8-despues/` (390 y 1440, página y hoja).

### Pendiente detectado en el bloque 8

- [ ] El medidor de contraste del repo (`scripts/contrast_audit.py`, enganchado como `pre-commit`)
  **audita `/root/vforge`, no el directorio que se está commiteando** (`cd /root/vforge` fijo en el
  hook). Trabajando en un worktree, la compuerta pasa siempre sin mirar tu código: en este mismo
  barrido reportó "OK: 114 issues" sobre otro checkout. Es una compuerta decorativa. **[Vulcano]**
