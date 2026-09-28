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

- [ ] **B2.5.1 — `vl-control` con lista blanca, en el repo.**
- [ ] **B2.5.2 — API server-side por el relay, nunca desde el navegador.**
- [ ] **B2.5.3 — Bitácora de cada acción, visible en el tablero.**
- [ ] **B2.5.4 — Probado contra `zz-prueba-b2`, jamás contra un frente real.**

## Bloque 6 · Avisos al teléfono

- [ ] **B2.6.1 — Aviso cuando un frente termina, se atora o topa el límite.**
- [ ] **B2.6.2 — Aviso cuando el disco baja de 5 GB.**
- [ ] **B2.6.3 — Sin repetir el mismo aviso cada 5 minutos.**

## Bloque 7 · Escritorio y móvil

- [ ] **B2.7.1 — 390 px: sin desborde, nada por debajo de 12 px.**
- [ ] **B2.7.2 — Controles de 44×44 px mínimo.**
- [ ] **B2.7.3 — 1440 px sin romper lo que ya existía.**
