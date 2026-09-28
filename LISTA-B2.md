# LISTA-B2 — Centro de mando de la fábrica

Fuente de verdad del brief B2. `[x]` solo con evidencia (antes → después, número
o captura mirada). Nada se marca "porque ya lo escribí".

- Rama: `centro-mando` · worktree `/root/worktrees/vforge-b2`
- Verificación: `npx tsc --noEmit -p .` en 0, `npm test`, WebKit a 390×844 y 1440×900
- Datos: los del servidor, medidos. Cero mock.

---

## Bloque 1 · El colector a Git

Criterio: el colector vive en el repo, el cron lo corre desde ahí, y `/root/tablero`
ya no guarda código.

- [x] **B2.1.1 — `servidor/tablero/estado.py` en el repo, reescrito y medido.**
  El colector estaba suelto en `/root/tablero/estado.py`, fuera de Git (DOCTRINA §6.8).
  Ahora la fuente es el repo. Se reescribió para medir avance, tokens y salud
  (bloques 2-4), conservando lo que ya servía: lectura de `/proc/<pid>/cwd` para
  amarrar proceso ↔ worktree, y el barrido de `crontab -l`.

- [x] **B2.1.2 — Instalador idempotente + cron repuntado.**
  `servidor/tablero/instalar.sh` copia a `/usr/local/sbin/vl-tablero` (el mismo
  patrón que `vl-supervisor`) y deja una sola línea de cron.
  Antes: `*/5 * * * * cd /root/tablero && python3 estado.py`
  Después: `*/5 * * * * /usr/local/sbin/vl-tablero >/dev/null 2>&1`
  Verificado idempotente: dos corridas seguidas → `crontab -l | grep -c tablero` = 1.
  (La primera versión del filtro no borraba la línea vieja porque buscaba
  `tablero/estado.py` y la vieja decía `cd /root/tablero && python3 estado.py`.
  Corregido a `grep -vE '/root/tablero.*estado\.py|vl-tablero'`.)

- [x] **B2.1.3 — `/root/tablero` limpio, sin perder nada ajeno.**
  `estado.py` borrado (ya está en Git). Los 7 scripts de otro agente que vivían
  ahí (`captura.py`, `diag.py`, `prueba_*.py`…) NO están en Git y el barrido no
  los respalda: se movieron a `/root/tablero/viejo/` con un LEEME, no se borraron.
  Queda solo salida: `estado.json` + `tokens-cache.json`.

- [x] **B2.1.4 — Caché incremental de tokens.**
  Los `.jsonl` pesan 1,235 MB. Primera corrida 8.25 s; corridas siguientes 0.55 s
  (solo lee el tramo nuevo de cada archivo, guardado por offset en
  `tokens-cache.json`). Sin caché, cada 5 min se releería 1.2 GB.

- [x] **B2.1.5 — README con el mapa y las dos reglas.**
  `servidor/tablero/README.md`: de dónde sale cada dato, cómo se instala, por qué
  solo lee, y por qué nunca inventa un porcentaje.

## Bloque 2 · Cada frente con avance real

- [x] **B2.2.1 — Frentes descubiertos por las tres vías.**
  Un frente ya no es solo una carpeta: es worktree + su lanzador. Se cruzan
  worktrees de `/root/worktrees/*`, crons `sup-*.sh` y servicios `agente-*`
  (`systemctl show -p ExecStart`). De ahí salen tag, worktree, brief y modelo.
  Medido: 22 frentes, 5 crons y 3 servicios.

- [x] **B2.2.2 — Modelo real, no basura del parser.**
  El ExecStart de systemd viene envuelto (`{ path=… ; argv[]=… ; ignore_errors=… }`)
  y el parser ingenuo daba `modelo=";"` en los 3 servicios. Ahora corta en `argv[]`
  y valida contra `^(opus|sonnet|haiku|claude-…)$`.
  Antes: `mod=;` · Después: `mod=por defecto` (los servicios no fijan modelo) y
  `mod=opus` en B1/B2/B3, que sí lo fijan.

- [x] **B2.2.3 — Porcentaje = `[x]` ÷ total de `LISTA-<tag>.md`, o nada.**
  Primer intento: caía a la lista más reciente del worktree. Como los worktrees
  se clonan entre sí, `vforge-b2` y `vforge-b3` leían `LISTA-B1.md` y reportaban
  **83%** de un trabajo que no era suyo — justo el número inventado que el brief
  prohíbe. Corregido: exige `LISTA-<tag>.md`; si no está, `pct=null` y el motivo
  dice qué listas hay y de quién son.
  Antes: `B3 → 83%`, `B2 → 83%`, `M8 → 100%`
  Después: `B3 → sin LISTA-B3.md (las que hay — LISTA-B1.md — son de otro frente)`

- [x] **B2.2.4 — Estado con las 6 formas reales de estar.**
  `trabajando` (proceso vivo en `/proc`) · `terminado` (`DONE-<tag>`) ·
  `atorado` (`STALLED-<tag>`, con el motivo que escribió el supervisor) ·
  `pausado` (`PAUSA-<tag>`) · `pausado por límite` (`/root/.claude-limite-hasta`
  en el futuro) · `en espera` / `quieto`. Manda lo que se ve en el piso: si hay
  proceso vivo, está trabajando, diga lo que diga el cron.

- [x] **B2.2.5 — `sin freno` como bandera, no como estado.**
  Un frente puede estar trabajando Y sin freno a la vez, así que va aparte:
  `supervisado=false` cuando su lanzador no pasa por `vl-supervisor` (sin tope
  diario ni pausa por límite de cuenta). Genera alerta propia.

- [x] **B2.2.6 — Corridas hoy / tope, bloque actual, commits y tiempo.**
  Corridas de `/root/.sup-<tag>.dia` contra `VL_MAX_DIA` (10) — medido `M8 → 10/10`
  (agotado) y `B1 → 4/10`. Bloque actual = el `##` donde vive el primer punto sin
  marcar. Últimos 5 commits con hora. Minutos trabajando del `st_mtime` del proceso.

## Bloque 3 · Consumo de la cuenta de Claude

- [x] **B2.3.1 — Tokens por día y por frente, 7 días, sin duplicar.**
  Un `message.id` aparece repetido en los `.jsonl` (parciales del streaming);
  contarlos todos multiplicaba el gasto. Se cuenta una vez por id.
  Entrada, salida, caché nuevo y caché leído van separados.
  Medido 22-28 sep: **8,840,373,235 tokens**, de los cuales 8,725 M son lectura
  de caché — el 98.7%. Contar "tokens" sin separar caché habría dado un número
  sin sentido.

- [x] **B2.3.2 — Quién se come la semana.**
  Ranking por frente con su % de la semana. Medido: **M8 (momentum-b1) 55.9%**
  con 4,943 M de 8,840 M. Los siguientes 7 frentes juntos no llegan a 15%.

- [x] **B2.3.3 — Lo que gasta fuera de los frentes.**
  Sesiones que no cuelgan de ningún worktree vivo (worktrees que ya borró el
  barrido, repos sueltos, chats). Medido: `momentum-sanidad` 930 M, `momentum-f1`
  410 M, `momentum-i18n` 322 M. La ruta se resuelve contra el disco, no partiendo
  guiones: antes salía `/root/worktrees/momentum/sanidad` (carpeta que no existe),
  ahora `/root/worktrees/momentum-sanidad`.

## Bloque 4 · Salud del servidor

- [x] **B2.4.1 — Disco, RAM, swap, carga, servicios caídos, barrido.**
  `df -B1`, `free -b`, `/proc/loadavg`, `systemctl --failed`, y el último
  `https://estado.vforge.site/barrido.txt`. Alerta de disco por debajo de 5 GB
  (medido ahora: 4.7 GB libres, 94% — la alerta está encendida y es real).

## Bloque 5 · Controles (solo Luis)

- [x] **B2.5.1 — `servidor/vl-control` con lista blanca, en el repo.**
  Cuatro verbos y nada más. La lista blanca son los frentes que el colector ya
  midió: el `tag` que llega de fuera **nunca** se pega a una ruta — la ruta del
  worktree se saca del JSON. Instalador `servidor/instalar-control.sh`.
  Probado: `vl-control pausar no-existe-este-frente` →
  `"'no-existe-este-frente' no es un frente del tablero. No hago nada."`, sin ejecutar nada.

- [x] **B2.5.2 — Guardia anti-suicidio.**
  Si quien llama vive dentro del frente, rehúsa. Medido desde el propio B2:
  `vl-control pausar B2` → `"'B2' es el frente desde el que me estás llamando:
  no me voy a matar solo"` (y este agente siguió vivo para escribirlo).

- [x] **B2.5.3 — Identificar procesos por argumento y cwd, no por "menciona la ruta".**
  El primer intento marcaba como supervisor a todo proceso cuyo cmdline
  contuviera el worktree. El brief que se le pasa a `claude -p` **trae la ruta
  escrita**, así que ese filtro se llevaba de corbata hasta el shell desde el que
  estabas mirando (medido: 5 PIDs ajenos marcados como supervisor de B2).
  Ahora el supervisor se reconoce por su ARGUMENTO de worktree y el `claude` por
  su `cwd`. Además se matan los descendientes: matar el supervisor no mata al
  `timeout claude -p` que cuelga de él.

- [x] **B2.5.4 — API server-side, el navegador nunca ve el secreto.**
  `/api/tablero/control`: gate de dueño, los 4 verbos en lista blanca, regex del
  tag, y `BRAIN_SECRET` solo en el servidor de Next. El shell real es
  `vl-control`, que solo sabe hacer cuatro cosas.
  El gate (`lib/auth/tablero-gate.ts`) acepta sesión de Clerk de dueño **o** el
  `VFORGE_OPERATOR_TOKEN` que ya usan `/api/admin/*` — no inventé una llave nueva.
  Medido: `/api/tablero` sin token → **401**; con token → **200** con datos reales.

- [x] **B2.5.5 — Bitácora visible.**
  Cada acción deja renglón JSON en `/root/tablero/control.log` (se poda sola a
  300 renglones) y el tablero la pinta. Las 4 acciones de la prueba quedaron ahí.

- [x] **B2.5.6 — Probado de punta a punta contra un frente de prueba propio.**
  Creé `zz-prueba-b2` (worktree + brief corto + `LISTA-zz-prueba-b2.md` + cron con
  `vl-supervisor … haiku`). **Nunca se tocó un frente de Luis.**
  | acción | resultado medido |
  |---|---|
  | `pausar` | `PAUSA-zz-prueba-b2` + murieron **1 supervisor y 5 procesos** (PIDs 1431922/1435301/1435302 verificados muertos uno por uno) |
  | con la marca puesta | el supervisor sale en **0 s** sin lanzar `claude` |
  | `detener` | además `STALLED-zz-prueba-b2` con "detenido por Luis desde el tablero" |
  | `reanudar` | quita `PAUSA` y avisa que sigue `STALLED` |
  | `relanzar` | quita ambas y relanza: **corridas 1 → 2** |
  Al terminar se borró todo: worktree, `sup-zz-prueba-b2.sh`, su línea de cron y
  sus contadores. Verificado: 0 supervisores vivos, 0 líneas de cron.

- [x] **B2.5.7 — Un STALLED de Luis no es un frente atorado.**
  `detener` marcaba `STALLED` y el tablero lo leía como "Atorado", como si se
  hubiera roto. Ahora, si la marca dice "detenido por Luis", el estado es
  **"detenido por ti"**: una decisión no es un problema.

- [x] **B2.5.8 — Las marcas de otro frente ya no se cuentan como propias.**
  Un worktree arrastra marcas de los tags que pasaron por él: `momentum-b1` tiene
  **9** marcas de otros frentes. Con el `startswith` original, M8 heredaba estado
  ajeno y en `exci-onb-calidad-2` (que corre ahora) el botón **Relanzar** salía
  habilitado por el `DONE-` de *otro* tag.
  Antes: `M8 → terminado/atorado` según marca ajena · `exci-onb-calidad-2 → Relanzar activo`
  Después: `M8 → en espera (marcas_mias=[])` · `exci-onb-calidad-2 → Relanzar apagado`

## Bloque 6 · Avisos al teléfono

- [x] **B2.6.1 — Aviso cuando un frente termina, se atora o topa el límite.**
  `/api/tablero/avisos` sobre `sendPushToOwners` (lo que ya existía). El colector
  marca qué es noticia con una `clave` estable; solo viajan al teléfono
  `fin:`, `atorado:`, `limite`, `disco`.
  Medido ahora: 6 alertas vivas, 5 de ellas para teléfono
  (`fin:exci-carril-b`, `fin:exci-carril-a`, `fin:exci-front`, `fin:exci-carril-c`,
  `caido:vtrading-paper-mtm.service`).

- [x] **B2.6.2 — Aviso cuando el disco baja de 5 GB.**
  Alerta real disparada durante este trabajo: **3.5 GB libres** en una medición
  y 4.5 GB en otra, siempre por debajo del umbral.

- [x] **B2.6.3 — Sin repetir el mismo aviso cada 15 minutos.**
  Tabla `tablero_avisos` (clave = PK): una alerta suena la primera vez que
  aparece y no se repite mientras siga viva. Cuando se resuelve se borra su
  renglón, así que si el problema vuelve, vuelve a sonar. Cron de Vercel cada
  15 min en `vercel.json` + el propio tablero al refrescar, para no depender de
  una sola vía.

## Bloque 7 · Escritorio y móvil

Cómo se midió: `next dev` **no hidrata en este sandbox** (0 llamadas a `/api`,
ni en WebKit ni en Chromium — el cliente de dev no levanta). Comprobado que no es
cosa del navegador. Así que la pantalla se midió como pieza: el **componente
real** empacado con esbuild, alimentado con el **`estado.json` real del servidor**,
servido estático y medido en **WebKit** a 390×844 y 1440×900.
Script reutilizable: `scripts/medir-tablero.py`.

- [x] **B2.7.1 — Sin desborde y nada por debajo de 12 px.**
  Desborde horizontal **0 px** a 390 y a 1440.
  Textos < 12 px: **7 → 0**. Los 7 eran `mono-label`, que la marca define a 10 px
  (`0.625rem`). No se cambió el tamaño de marca: se sube a 12 px **solo dentro de
  esta pantalla**, con `[&_.mono-label]:!text-[12px]` en el contenedor. Va con `!`
  a propósito porque `.mono-label` vive en `globals.css` *después* de las
  utilidades de Tailwind y sin eso gana ella. Así entra también el "OPERACIÓN"
  que pinta `PageHeader`, sin tocar `PageHeader` — que es de toda la app y de otro frente.

- [x] **B2.7.2 — Controles de 44 px.**
  **0 controles por debajo de 44 px** de 57, en ambas vistas
  (constante `BOTON` con `h-11 min-h-[44px]`).

- [x] **B2.7.3 — 1440 px sin romper nada, y sin pantallas kilométricas.**
  Un frente quieto o cerrado no admite ninguna de las cuatro acciones, pero se le
  pintaban igual 4 botones muertos: con 17 frentes dormidos la página medía
  **12,270 px** de alto. Ahora la fila de controles solo aparece si hay algo que
  hacer: **116 → 57 controles**. Además, "Apagado" ahora se ve apagado: un
  `Relanzar` negro al 50% de opacidad seguía leyéndose como el botón principal.
  **0 errores de consola** en ambas vistas.

- [x] **B2.7.4 — Capturas miradas, no solo tomadas.**
  `/root/vulcano-audit/vforge-rescate/`: `tb-final-390.png`, `tb-final-1440.png`
  (página completa), `tb-vista-*.png` y `tb-frentes-*.png` (lo que se ve al entrar
  y las tarjetas). Miradas una por una; de ahí salieron B2.7.3 y B2.5.8.

---

## Lo que dejo anotado para Vulcano

1. **`.gitignore`**: `vercel link` agregó `.env*` (antes solo `.env.*`). Se queda:
   cubre también un `.env` pelón. Es la única línea que toqué de ese archivo.
2. **`CRON_SECRET` en Vercel**: el cron de avisos manda
   `Authorization: Bearer $CRON_SECRET`. Si no está puesto, el endpoint acepta
   `BRAIN_SECRET` como respaldo, pero lo limpio es ponerlo.
3. **Frentes sin `LISTA-<tag>.md`**: hoy **19 de 22** no se pueden medir, incluido
   M8, que se come el **55.9%** de la semana. El tablero lo dice en vez de
   inventar un número, pero el arreglo de fondo es que cada brief traiga su lista
   con el nombre del tag.
4. **No revisé la pantalla dentro del shell de Next con sesión de Clerk**: las
   llaves de VForge son `pk_live`/`sk_live` (atadas a vforge.site) y en localhost
   rebotan a `/sign-in`; el `next dev` local además no hidrata. Queda pendiente
   una pasada en la vista previa de Vercel de esta rama.
