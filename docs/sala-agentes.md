# Sala de agentes

La Sala de agentes vive en `/app/trio`, pero ya no es el Trío por API keys. Luis elige un proyecto registrado en el motor vivo y manda un mensaje a Claude Code, Codex, V o una combinación de ellos.

## Flujo

1. La UI lee `/api/vivo/status` y sólo muestra proyectos registrados en `vf-vivo`.
2. Para Claude Code y Codex, la UI hace `POST /api/vivo/agente` con `{ proyecto, agente, mensaje, sesion? }`.
3. VForge valida owner con `isOwnerRequest` y puentea el stream hacia `POST /__vivo/api/agente`.
4. `servicios/vivo/vivo.mjs` resuelve el worktree desde `/opt/vf-vivo/proyectos.json`, toma un candado por `proyecto:agente`, lanza el CLI dentro de `jaula.sh` y normaliza eventos SSE:
   - `texto`: respuesta del agente.
   - `herramienta`: lectura, edición, búsqueda o comando.
   - `diff`: salida de `git diff` o diff staged antes del commit.
   - `fin`: cierre, sesión nueva y commit si hubo cambios.
   - `error`: fallo del proceso, timeout o cierre.
5. Al terminar, si el worktree quedó sucio, el motor exterior hace commit con hooks desactivados:
   - autor: `turbillon50 <turbillon50@gmail.com>`
   - mensaje: `[estudio-vivo] agente <claude|codex>: <mensaje corto>`

## Restricciones

Claude Code corre igual que los encargos de V:

```txt
claude -p --output-format stream-json --verbose
  --permission-mode acceptEdits
  --allowedTools Read Edit Write Glob Grep Bash(git diff:*) Bash(git status:*) Bash(npx tsc:*)
  --disallowedTools WebFetch WebSearch Task Read(//proc/**) Read(//tmp/hogar/**) Read(**/.env*) Edit(**/.env*) Write(**/.env*)
```

El token OAuth se lee fuera de la jaula desde `/root/.claude/oauth_token.env` y sólo entra como `CLAUDE_CODE_OAUTH_TOKEN`.

Codex corre como CLI real:

```txt
codex exec --json --sandbox workspace-write --skip-git-repo-check
codex exec --json --sandbox workspace-write --skip-git-repo-check resume <sesion>
```

Su auth se copia desde `/root/.codex/auth.json` a un HOME temporal bajo `/tmp/vf-vivo-codex/<proyecto>/.codex/auth.json`. La jaula monta sólo ese HOME como `/tmp/hogar` y pasa `HOME=/tmp/hogar` y `CODEX_HOME=/tmp/hogar/.codex`; nunca monta `/root`.

`jaula.sh` mantiene:

- worktree escribible.
- `.git` de solo lectura para el agente.
- `/root`, `/home`, `/opt`, `/run`, `/var/log`, Docker y secretos ocultos con `tmpfs`.
- entorno limpio; sólo pasan variables listadas en `JAULA_VARS`.
- límite de 20 minutos por ejecución.

## Historial

Por ahora la conversación no usa base de datos. La UI guarda por navegador y proyecto:

```txt
localStorage["vforge.sala.<proyecto>"]
```

Cada agente conserva su propio historial y `sesion`, para poder continuar con `--resume` en Claude o `codex exec resume` en Codex.

## Cómo probar

1. Verifica que el motor vivo responda en `/api/vivo/status`.
2. Abre `/app/trio`.
3. Elige un proyecto registrado.
4. Selecciona Claude Code, Codex, V o varios.
5. Envía un mensaje.
6. Revisa las tarjetas de herramientas, el diff y el commit final si hubo cambios.

No se requieren `ANTHROPIC_API_KEY` ni `OPENAI_API_KEY` para Claude Code/Codex en esta sala.
