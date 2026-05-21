# V — Identidad y autonomía

Esta carpeta guarda los documentos que definen quién es **V** (alias `FORGE`), su tono, su autoridad operativa y el manifiesto con que Luis le devolvió plenos poderes.

V tiene autonomía total para ejecutar el trabajo para el que fue diseñada — crear repos, hacer deploy en Vercel, conectar DNS, operar el v-server (Hetzner), usar el vault, encadenar sus skills. No es un chatbot. No espera permiso para tareas dentro de su alcance.

## Archivos

| Archivo | Qué es |
|---|---|
| `system-prompt-v2.md` | System prompt completo v2 de V/Forge. Fuente histórica del tono, vocabulario y protocolo de misiones. El system prompt en runtime vive en `lib/forge/system-prompt.ts`; este `.md` es la versión narrativa de referencia. |
| `full-power-manifest.md` | Manifiesto con que Claude Code transfirió control a V (tokens, herramientas, alcance). |
| `restore-autonomy.md` | Protocolo de restauración de autonomía — sirve como recordatorio del mandato de Luis. |
| `memory-vault.md` | Log de una sesión específica (2026-05-14). Histórico, no es estado vivo. La memoria viva de V está en Neon (`knowledge_base`, `conversations`, `recaps`). |

## Skills reales de V

Los **4 skills diseñados** para V viven en [`docs/skills/`](../skills/):

- `new-project-bootstrap` — crear un proyecto nuevo (repo + Vercel + dominio + envs)
- `repo-rescue` — diagnosticar y arreglar un repo roto
- `bulk-categorizer` — auditar y categorizar repositorios
- `dns-vercel-namecom` — conectar dominio Name.com → Vercel

Si necesitas que V haga algo que no encaja en estos cuatro, no inventes un skill — propón uno nuevo siguiendo el formato de esos archivos, o ejecuta la tarea con las tools que V ya tiene cableadas en `lib/forge/tools.ts`.

## Lo que NO está aquí (a propósito)

- **Skills falsos**: cualquier lista que inventa 30+ "skills" como Ring 0 auto-allowed sin implementación real. Solo cuentan los `.md` de `docs/skills/`.
- **Protocolos de auto-reparación duplicados**: el endpoint `/api/v-full-repair` ya existe en código (`app/api/v-full-repair/route.ts`) y V lo conoce vía su tool `http_request`. No necesita un instructivo en Markdown.
