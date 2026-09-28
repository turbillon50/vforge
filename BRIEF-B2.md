# BRIEF B2 — VForge: centro de mando de la fábrica (28-sep-2026)

Eres el ejecutor de Vulcano en VForge. Worktree `/root/worktrees/vforge-b2`, rama `centro-mando`. Otro agente (B1) trabaja en `/root/worktrees/vforge-b1` sobre otras pantallas: tú NO tocas nada fuera de lo que dice este brief; B1 tiene prohibido tocar `/app/tablero`.

## Antes de tocar código
1. Lee `/root/skills-vault/DOCTRINA.md` (v7) y la skill `metodo-apps` completa (SKILL.md, MUST-500.md, SANIDAD.md, LENTES.md) + `pwa-agencia-premium`.
2. Lee lo que ya existe: `app/app/tablero/page.tsx`, `app/api/tablero/route.ts` y el colector del servidor `/root/tablero/estado.py` (cron cada 5 min, escribe `/root/tablero/estado.json`, VForge lo lee por el relay). Lo que llega funcionando no se tira: se extiende.

## Lo que Luis pidió (literal)
"Quiero tener control del proyecto de Hetzner, ver qué se está haciendo, avances, porcentajes de trabajo, qué existe. Quiero visibilidad de todo." VForge NO se vende por ahora: es SU herramienta interna para llevar la fábrica. Primero función; la estética fina después (sin romper la marca actual: no cambies colores ni tipografía).

## Bloques
1. **Colector a Git.** `/root/tablero` no está en Git (prohibido por doctrina). Muévelo al repo como `servidor/tablero/` (con su README), deja el cron apuntando ahí, y bórralo de `/root/tablero` solo cuando el cron nuevo ya genere el JSON. Nada de llaves en el repo.
2. **Cada frente con avance real.** Por cada worktree en `/root/worktrees/*` y cada servicio `agente-*`: nombre, proyecto, título del brief, modelo, estado (trabajando / pausado / atorado `STALLED-*` / terminado `DONE-*` / pausado por límite de la cuenta `/root/.claude-limite-hasta` / sin freno = no corre con `vl-supervisor`), **porcentaje = `[x]` / total de puntos en su `LISTA-*.md`**, bloque actual, últimos 5 commits con hora, corridas hoy / tope, tiempo trabajando. Si un frente no tiene lista, dilo ("sin lista: no se puede medir avance"), nunca inventes un porcentaje.
3. **Consumo de la cuenta de Claude.** Tokens por día y por frente de los últimos 7 días, leyendo los `.jsonl` de `/root/.claude/projects` (sin duplicar por `message.id`, separa lectura de caché). Qué frente se está comiendo la semana.
4. **Salud del servidor.** Disco, RAM, swap, servicios caídos (`systemctl --failed`), procesos `claude -p` vivos, crons `sup-*`, último reporte de `https://estado.vforge.site/barrido.txt`.
5. **Controles (solo rol dueño = Luis).** Pausar, reanudar, detener y relanzar un frente. Por el servidor, nunca comandos libres: un script `/usr/local/sbin/vl-control <pausar|reanudar|detener|relanzar> <tag>` con lista blanca (también en el repo, en `servidor/`). `pausar` crea `PAUSA-<tag>` en el worktree (Vulcano ya hizo que `vl-supervisor` lo respete) y termina el `claude -p` de ese frente; `detener` además escribe `STALLED-<tag>` con "detenido por Luis"; `relanzar` borra esas marcas. Cada acción queda en una bitácora visible en el tablero. VForge llama al relay (`RELAY_BASE_URL` + `BRAIN_SECRET`, que ya existen en Vercel) solo desde el servidor de Next, nunca desde el navegador.
6. **Avisos al teléfono.** VForge ya tiene "Avisos en el teléfono" (web push). Aviso cuando un frente termina, se atora, topa el límite de la cuenta, o el disco baja de 5 GB.
7. **Escritorio y móvil.** A 390 px Luis lo revisa desde el teléfono: todo legible (mínimo 12 px), sin desborde, controles de 44 px.

## Cómo trabajas
- Node 20, commits firmados `turbillon50 <turbillon50@gmail.com>`, push a `origin centro-mando` al cerrar cada bloque. NO empujes a main: Vulcano revisa y sube.
- RAM del servidor apretada: no corras `next build` local. `npx tsc --noEmit -p .` en 0 y `npm test`; `next dev` solo mientras pruebas y lo matas al terminar.
- Pruebas con Playwright WebKit a 390 y 1440, con sesión real (patrón en `/root/vulcano-audit/vforge-rescate/medir.py`), MIRANDO la captura. Datos reales del servidor, cero inventos.
- Los controles se prueban contra un frente de prueba que creas tú (`/root/worktrees/zz-prueba-b2`, con un `claude -p` corto) y borras al final. Nunca pruebes pausar/detener sobre un frente real de Luis.
- Lista maestra `LISTA-B2.md`: `[x]` solo con evidencia. Al terminar: `DONE-B2` con resumen.
