# LISTA-B3 — Editor sobre preview en vivo (VForge)

Rama `editor-vivo`. `[x]` sólo con evidencia (comando + número). `[LUIS]` = sólo él puede hacerlo.
Medido el 28-sep-2026 en el Hetzner v-forge (12 CPU, 23 GB RAM, carga ~5 con 25 agentes de Claude activos).

## Proyecto piloto

**MiPipa** (`turbillon50/mipipa-srv`), rama de trabajo `vivo/b3`, worktree `/root/worktrees/vivo-mipipa`.

Por qué éste: es demo PWA de pipas de agua, Next 15.5 (lo más cercano al Next 16 de VForge, así que
lo que se aprenda sirve para los demás), **no está en los 8 proyectos con dinero** de la doctrina §8 y
nadie lo está tocando hoy (los agentes vivos hoy son momentum, exci y vforge). Su producción nunca se
toca: todo el trabajo va en `vivo/b3`.

---

## Fase 1 — Motor vivo

- [x] **Servicio `vf-vivo`** que mantiene dev servers por proyecto en el Hetzner.
      Código en `servicios/vivo/vivo.mjs` (sin dependencias: arranca en un servidor recién barrido).
      Evidencia: `systemctl is-active vf-vivo` → `active`; `curl 127.0.0.1:9311/__vivo/health` → los 3 slots.
- [x] **HTTPS con acceso sólo de Luis.** 3 hosts `vivo1|vivo2|vivo3.178.105.135.26.sslip.io`, certificado
      Let's Encrypt propio cada uno (vencen 2026-12-27). sslip.io resuelve al IP sin tocar DNS de name.com.
      Token HMAC-SHA256 firmado por VForge, 60 s de vida, se cambia por sesión de 12 h al cruzar la puerta.
      Evidencia (contraprueba corrida a mano): sin token `HTTP=403` + `{"error":"Esta vista previa es privada…"}`;
      con token `HTTP=200` y el HTML real de MiPipa.
- [x] **El iframe del Estudio apunta al servidor vivo, no al deploy.** `components/studio/ForgeStudio.tsx`
      usa `useMotorVivo()`: con el motor encendido las 3 vistas (Escritorio / Móvil / Admin) salen del dev
      server; apagado, siguen saliendo del deploy de Vercel como antes.
- [x] **V escribe archivos en el worktree y el cambio aparece solo.** `POST /__vivo/api/write` (candado
      contra `../`, probado). Rutas VForge owner-only: `app/api/vivo/{start,stop,status}/route.ts`.
- [x] **Límites duros.** 3 slots exactos (el 4º recicla el menos usado), apagado tras 20 min sin uso,
      `NODE_OPTIONS=--max-old-space-size=1536`, `MemoryMax=6G` en la unidad.
      Evidencia del barrendero en bitácora: `apagando vivo1 (mipipa) — 20 min sin uso`.
- [x] **RAM medida antes y después.**
      | momento | usado | disponible |
      |---|---|---|
      | línea base (sin motor) | 15 756 MB | 7 700 MB |
      | con 1 proyecto vivo | 17 350 MB | 6 106 MB |
      El dev server de MiPipa pesa **70 MB** de RSS; `vf-vivo` con su hijo, **335 MB**.
      Costo real del primer proyecto vivo: ~1.6 GB contando el `buff/cache` que se lleva la compilación.
- [x] **Meta de los 3 segundos: CUMPLE.** Medido dos veces, de dos maneras:
      · `medir-hmr.mjs` (respuesta HTTP por la URL HTTPS pública): mediana **583 ms**, peor **1 433 ms**.
      · **En WebKit de verdad** (`servicios/vivo/qa/prueba-vivo.mjs`, 10 cambios con cronómetro, sin recargar
        a mano): mediana **240 ms**, mejor **188 ms**, peor **570 ms**, 10 de 10 sin timeout, **0 errores de consola**.
      En el navegador sale más rápido porque la recarga en caliente parcha en su lugar en vez de recargar.
      El peor caso siempre es la primera corrida (recompila en frío).

## Fase 2 — Editar sobre la vista

- [x] **Marca de archivo:línea en dev.** `servicios/vivo/editor/vf-src-loader.cjs`: loader de webpack que
      inyecta `data-vf-src="archivo:linea:columna"` en las etiquetas del DOM. Usa el Babel que Next ya trae
      compilado (**cero dependencias nuevas** en el piloto) y **sólo inserta atributos por posición**, así los
      números de línea que reporta son los de verdad y el archivo no se reformatea.
      Evidencia: **656 marcas** en la portada de MiPipa; el `<h1>` del hero sale como
      `components/marketing.tsx:87:11`, que es exactamente donde vive.
- [x] **Nunca en producción.** El loader sólo se activa con `VF_VIVO=1` (lo pone únicamente el motor) **y**
      `contexto.dev`. En cualquier build normal `conVivo()` devuelve la config intacta.
- [x] **Capa de resaltado y selección.** `servicios/vivo/editor/overlay.js`: al pasar el mouse resalta y
      dice qué etiqueta y archivo es; al hacer clic selecciona y le manda al Estudio el archivo:línea, el
      texto propio y los estilos calculados. La **inyecta la pasarela** en el HTML, así el piloto no carga
      con código de edición. Evidencia: la capa se sirve (`HTTP=200`, 8 654 bytes) y va inyectada 1 vez.
- [x] **La edición escribe código de verdad.** `servicios/vivo/editor/aplicar-edicion.mjs` + `POST /__vivo/api/edit`.
      Evidencia medida sobre el hero de MiPipa:
      · texto: `Agua segura,` → `Agua limpia y medida,` dejando intactos el `<br/>` y el `<span>` de al lado.
      · estilo: `fontWeight: 850` → `400` en su lugar, y `textAlign: "center"` agregado sin desordenar la línea.
      · contraprueba 1 (línea que no existe) → `422` con motivo entendible, no escribe.
      · contraprueba 2 (`../../../etc/passwd`) → `El archivo queda fuera del proyecto.`, no escribe.
      Cuando no puede hacerlo con seguridad (texto partido, `style` que viene de variable) devuelve el motivo
      y el Estudio ofrece "dile a V" en lugar de escribir una barbaridad.
- [x] **El clic llega al Estudio con su archivo:línea**, probado en la topología real (iframe con padre en
      origen permitido, que es como vive en el Estudio). Evidencia en WebKit: la capa saluda al padre con
      **656 marcados**; al hacer clic sobre el hero, el Estudio recibe
      `<span> en components/marketing.tsx:89:31 · texto "directo a tu puerta." · 62px`, que es exactamente
      donde vive ese span. Capturas **miradas**: `capturas/vivo/vivo-iframe-seleccion.png` (marco verde sobre
      el elemento y etiqueta morada `span · marketing.tsx:89:31`) y `vivo-capa-resaltado.png`.
- [x] **Escritorio y móvil (390) lado a lado**: vista nueva "Escritorio + móvil" en el Estudio
      (`ParPreview`), con el móvil a 390 de verdad y no una columna estrecha. La capa se enciende en las dos
      vistas a la vez (`data-vf-vista` en cada iframe).
- [x] **Panel de inspección en el Estudio** (`components/studio/vivo/PanelInspector.tsx`): texto en vivo,
      tamaño, peso, color de texto y fondo, alineación, relleno, margen, esquinas, y "dile a V" que manda el
      archivo:línea del elemento como contexto.
      **Visto en WebKit y probado contra el motor de verdad** (banco de paneles, ver abajo): el retrato sale
      como `<h1> 612×130 · marketing.tsx:87 · 62px`; escribir en la caja de texto **cambió el archivo en
      disco en 75–97 ms** (se comprueba leyendo `components/marketing.tsx`, no el mensaje de la pantalla) sin
      llevarse el `<br/>` ni el `<span>` de al lado; un elemento sin texto propio no ofrece editar a ciegas y
      manda a "dile a V" con `components/marketing.tsx:89:31`. Captura **mirada**: `capturas/vivo/banco-paneles.png`.

## Fase 3 — Control

- [x] **Cada cambio es un commit en la rama de trabajo.** La edición commitea sola con mensaje legible.
      Evidencia: una edición de texto devolvió `commit: c8bb8d0` y el historial la muestra como
      `texto en components/marketing.tsx:87: "Agua medida y puntual,"`, autor `turbillon50`, marcada `delEstudio`.
      Al arrancar, el motor se pone en la rama de trabajo (`vivo/b3`): nunca se edita sobre producción.
- [x] **Historial visible y deshacer al instante.** `deshacer` regresó a `4bc40aa` y el texto del archivo
      volvió a `Agua segura,` — comprobado leyendo el archivo, no el mensaje. Se niega a deshacer un commit
      que no hizo el Estudio (probado: devuelve el motivo).
- [x] **Comparar antes/después.** Devuelve el diff con `--stat` y el parche (1 177 bytes en la prueba),
      pintado en verde/rojo en el panel. Bug encontrado y corregido durante la prueba: sin `sha` devolvía
      vacío porque comparaba el árbol de trabajo, que ya estaba limpio por el commit automático.
- [x] **Publicar** (push de la rama de trabajo a la de producción → Vercel), con confirmación escribiendo el
      nombre del proyecto. **Probado de verdad contra GitHub** apuntando la producción a una rama desechable
      (`vivo/b3-prueba-publicar`): `{"ok":true,"publicado":"f3e339f"}` y la rama apareció en el remoto.
      Después se borró la rama y el remoto quedó sólo con `master` en `822150f`, **intacto**.
      Ahí salió un error real: el registro decía que la producción de MiPipa era `main`, y es `master`;
      publicar habría creado una rama nueva en vez de actualizar producción. Ya está corregido.
- [x] **Panel de control en el Estudio** (`components/studio/vivo/PanelControl.tsx`): historial con los
      commits del Estudio marcados, deshacer, ver el diff y Publicar con confirmación.
      **Visto en WebKit contra el repo de verdad**: pinta los 7 commits reales del piloto con los del Estudio
      marcados en morado, la cabecera dice `vivo/b3 · 1 cambios del Estudio` (la rama de trabajo, no
      producción), el diff sale con el `-` rojo y el `+` verde, **deshacer dejó el archivo idéntico al de
      antes** (comparado carácter por carácter, no por el mensaje) y Publicar dice `Publicar a master`.
      Capturas **miradas**: `capturas/vivo/banco-control.png`, `banco-diff.png`, `banco-publicar.png`.

---

## El banco de paneles (cómo se vieron sin poder entrar a Clerk)

El Estudio vive detrás de sesión de owner de Clerk en `/app/chat`, así que headless no se entra. En vez de
dejarlo en "compila", se montó un **banco**: `servicios/vivo/qa/banco/` arma los **mismos** componentes (no
copias — importa `PanelInspector`, `PanelControl` y el hook `useCapaEdicion` tal cual) y los sirve en una
página normal, y su servidor **reenvía `/api/vivo/*` al servicio `vf-vivo` de verdad**. O sea: el render, los
controles, el fetch, el archivo que se escribe y los commits son los de producción. Lo único sustituido es el
gate de Clerk y el iframe (el motor ya está medido aparte).

Sin esbuild en el servidor y sin `next build` (RAM), se arma con lo que ya hay: `tsc` a CommonJS, un
empaquetador de 100 líneas (`empacar.mjs`, 23 módulos) y el Tailwind del propio proyecto, para que se vea con
el CSS real. **Cero dependencias nuevas.**

Correrlo: `bash servicios/vivo/qa/banco/correr.sh` (o los pasos sueltos, ver "Notas de operación").
Resultado: **31 de 31 comprobaciones en verde**, 0 errores de consola, y el worktree del piloto queda
limpio en `f3e339f` porque la propia prueba deshace lo que hizo.

**Contraprueba (regla 6 de la doctrina, desconfiar del 100 %):** se volvió a meter a mano el bug del aviso y
la prueba **falla con EXIT=1**. No es una prueba que aprueba todo.

### Lo que salió de MIRAR, no de que compilara

Cuatro cosas que `tsc` no podía ver, encontradas y corregidas:

1. **El aviso de "Deshecho…" y "Publicado…" no se veía nunca.** `leer()` arranca con `setAviso(null)` y
   deshacer/publicar releen el repo justo después de poner el mensaje: se borraba solo. La acción sí pasaba,
   pero en pantalla no quedaba rastro. Ahora `leer({ conservarAviso: true })`.
2. **Un fondo transparente se pintaba negro.** El navegador contesta `rgba(0, 0, 0, 0)` y la muestra salía
   `#000000` sólido: parecía que el `<h1>` tenía fondo negro. Peor, invitaba a escribir un negro real en el
   código. Ahora sale un damero y dice **"sin fondo"**.
3. **Un peso fuera de la escala no se decía.** El hero pesa `850`, que no es ninguno de los botones
   300–900: no se prendía ninguno y parecía que no tenía peso. Ahora dice **"hoy: 850"**.
4. **Ningún botón de alineación se prendía.** El valor calculado es `start`, no `left`. Ahora se normaliza
   (`start`→izquierda, `end`→derecha) y el botón correcto sale prendido.

Y una quinta de comportamiento: **después de deshacer, el inspector seguía enseñando el texto viejo**, que ya
no existía en el archivo. Ahora `onCambio` suelta la selección (en `ForgeStudio` y en el banco): la capa se
vuelve a anunciar al recargar y se hace clic otra vez.

**Lo que sigue tocándole a Luis [LUIS]:** entrar a `/app/chat` en el deploy de esta rama con su cuenta,
encender el motor con MiPipa y hacerlo con el iframe de verdad enfrente. El banco prueba los paneles y el
motor; lo que **no** puede probar es el Estudio completo con sesión de Clerk y el preview vivo dentro del
iframe al mismo tiempo. Eso son dos piezas medidas por separado, no una medida entera.

## Lo que NO se puede hacer bien con lo que hay (con el número que lo demuestra)

1. **El disco está al 93 %** (`df -h /` → 67 G usados de 75 G, **5.6 G libres**). Cada proyecto vivo se lleva
   ~540 MB de `node_modules` (medido en MiPipa) más su `.next`. Con los 3 slots llenos de proyectos distintos
   son ~2 GB, y el barrido diario borra worktrees ya subidos, así que **hay que reinstalar deps seguido**.
   Consecuencia real: el tope de 3 slots no es capricho, es lo que cabe.
2. **La swap está al 100 %** (5 119 MB de 5 119 usados, medido dos veces con una hora de diferencia). No la
   llenó este trabajo — ya estaba así con 25 procesos de Claude corriendo. Mientras siga así, el servidor
   está paginando y los tiempos de compilación en frío van a ser peores que los medidos.
3. **La galleta de sesión no sobrevive dentro del iframe en WebKit**, que bloquea cookies de tercero de
   cajón. Por eso la autorización tiene dos caminos: galleta con `Partitioned` (CHIPS, para Chrome) **y**
   concesión por IP de 4 h que se apunta al cruzar la puerta. La concesión por IP es **más gruesa que una
   galleta**: quien comparta salida a internet con Luis podría abrir ese slot mientras dure. Es un preview
   de desarrollo de sus propios proyectos, no producción, y por eso dura poco y sólo abre el slot pedido;
   pero queda escrito porque es una decisión de seguridad, no un detalle.
4. **El loader es de webpack, no de turbopack.** MiPipa corre `next dev` con webpack (verificado: el log de
   arranque no dice "Turbopack"). Un proyecto que arranque con `--turbo` tendría el preview vivo y la recarga
   en caliente, pero **no** las marcas `data-vf-src`, así que no habría clic-a-código. VForge mismo es Next 16,
   donde turbopack es el de cajón: cuando toque meter VForge al motor, esto hay que resolverlo.
5. **`next build` de VForge no se corre aquí** (es la instrucción del brief por RAM). La verificación es
   `npx tsc --noEmit -p .` en 0 y `npm test`.

6. **`correr.sh` completo se muere con EXIT=144 en la sesión del agente** (la trampa conocida de este
   entorno con node/nvm encadenados; le pasa igual a `next`). Medido: el script en primer plano muere; los
   mismos pasos sueltos corren en verde. Por eso el banco se corre así: el servidor por un lado
   (`node servicios/vivo/qa/banco/servidor.mjs 9345`) y la prueba por otro
   (`node servicios/vivo/qa/banco/prueba-paneles.mjs`). El script queda igual porque **fuera de la sesión del
   agente sí corre de un jalón**, pero está escrito aquí para que nadie pierda media hora averiguándolo.

## Notas de operación

- Todo el servicio se reinstala con `bash servicios/vivo/instalar.sh` (idempotente: respeta el secreto y el
  registro que ya existan). Es lo que cumple "el Hetzner es manos, no almacén".
- El secreto vive en `/etc/vl-secrets/vivo.env` (600) y ya está en Vercel como `VF_VIVO_SECRET`
  (+ `VIVO_API_BASE`), en production, preview y development.
- Registro de proyectos: `servicios/vivo/proyectos.json` → `/opt/vf-vivo/proyectos.json`.
- **Banco de paneles** (`servicios/vivo/qa/banco/`), paso a paso si `correr.sh` se muere:
  1. `./node_modules/.bin/tsc -p servicios/vivo/qa/banco/tsconfig.banco.json`
  2. `node servicios/vivo/qa/banco/empacar.mjs`
  3. `./node_modules/.bin/tailwindcss -c tailwind.config.ts -i app/globals.css -o servicios/vivo/qa/banco/publico/banco.css --content "./components/studio/vivo/*.tsx,./servicios/vivo/qa/banco/entrada.tsx"`
  4. `node servicios/vivo/qa/banco/servidor.mjs 9345` (necesita `vf-vivo` encendido)
  5. `node servicios/vivo/qa/banco/prueba-paneles.mjs`
  Lo generado (`.banco-dist`, `publico/banco.js`, `publico/banco.css`) va en `.gitignore`: se rearma solo.
- **Publicar, en el banco, NO empuja.** El servidor del banco contesta `publicar` con la forma real marcada
  `simulado: true`, para ver el camino de la confirmación sin tocar la producción del piloto. El push de
  verdad ya se probó aparte contra una rama desechable. Comprobado después de correr la prueba:
  `git ls-remote origin master` del piloto sigue en `822150f`, intacto.
