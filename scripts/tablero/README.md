# Tablero de agentes

Generador del estado que muestra `/app/tablero`.

- Vive en el Hetzner como `/root/tablero/estado.py` (copia de este archivo).
- Cron: `*/5 * * * * cd /root/tablero && python3 estado.py`
- Escribe `/root/tablero/estado.json`; `/api/tablero` lo lee por el relay `/brain/exec` (owner-only).
- Solo lee: worktrees, crontab, procesos `claude -p` y transcripciones de `~/.claude/projects`.

Si cambias este archivo, cópialo al servidor: `cp scripts/tablero/estado.py /root/tablero/estado.py`.
