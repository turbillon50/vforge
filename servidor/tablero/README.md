# servidor/tablero — el colector del Centro de Mando

Este es el que mide la fábrica. Corre en el Hetzner cada 5 minutos, escribe
`/root/tablero/estado.json`, y VForge lo lee por el relay en `/api/tablero`.

## Por qué está aquí y no en /root

El Hetzner es manos, no almacén (DOCTRINA v7 §6.7): el barrido diario borra lo
que ya está en GitHub, y lo que no está en GitHub no existe (§6.8). El colector
vivía suelto en `/root/tablero` — un barrido con mala suerte se lo llevaba.
Ahora la fuente es este directorio del repo y en el servidor solo queda la copia
instalada, igual que `vl-supervisor`.

```
repo  servidor/tablero/estado.py   ← se edita aquí, se commitea aquí
  ↓   servidor/tablero/instalar.sh
srv   /usr/local/sbin/vl-tablero   ← copia ejecutable, la pisa el instalador
srv   /root/tablero/               ← SOLO salida: estado.json, cachés, bitácora
```

`/root/tablero/` es desechable: si se borra, la siguiente corrida lo rehace
(la primera tarda ~8 s porque reconstruye la caché de tokens; después, <1 s).

## Instalar o actualizar

```bash
cd /ruta/al/clon/vforge && ./servidor/tablero/instalar.sh
```

Copia el colector a `/usr/local/sbin/vl-tablero` y deja el cron en:

```cron
*/5 * * * * /usr/local/sbin/vl-tablero >/dev/null 2>&1
```

El instalador es idempotente: correrlo dos veces no duplica el cron.

## Qué mide

| Bloque | De dónde sale |
|---|---|
| Frentes | worktrees de `/root/worktrees/*` + crons `sup-*.sh` + servicios `agente-*` |
| Estado | procesos `claude -p` vivos (`/proc/<pid>/cwd`) y las marcas `DONE-` / `STALLED-` / `PAUSA-` |
| Avance % | `[x]` ÷ total de puntos de `LISTA-<tag>.md` del propio frente |
| Corridas | `/root/.sup-<tag>.dia` contra el tope `VL_MAX_DIA` (10) |
| Consumo | `usage` de los `.jsonl` de `/root/.claude/projects`, 7 días |
| Salud | `df`, `free`, `systemctl --failed`, `/proc/loadavg`, `barrido.txt` |
| Bitácora | `/root/tablero/control.log`, que escribe `vl-control` |

## Las dos reglas del colector

1. **Solo lee.** No toca un worktree, un cron ni un proceso. Lo único que
   escribe está bajo `/root/tablero/`. Quien actúa es `vl-control`, aparte.
2. **Nada de números inventados.** Si un dato no se puede medir sale `null`
   con su motivo. Un frente sin `LISTA-<tag>.md` no tiene porcentaje: dice
   *"sin lista: no se puede medir avance"*. Los worktrees se clonan entre sí y
   arrastran la lista de otro agente — medir con esa daría un avance que no es
   de ese frente.

## Cómo cuenta los tokens sin morir en el intento

Los `.jsonl` pesan más de 1 GB y crecen. El colector guarda en
`/root/tablero/tokens-cache.json` el resumen por archivo más el offset en bytes
ya leídos, así que en cada corrida solo parsea lo nuevo. Un mismo `message.id`
aparece repetido (son los parciales del streaming): se cuenta una sola vez.
La lectura de caché se reporta aparte de la entrada real, porque cuesta distinto.

## Probarlo sin pisar la producción

```bash
mkdir -p /tmp/tb && VL_TABLERO_DATA=/tmp/tb python3 servidor/tablero/estado.py | head -c 400
```
