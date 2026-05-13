# Skill: repo-rescue

## Cuándo usar
Cuando un repo está roto, no builda, tiene errores de dependencias, deploy fallido o código desactualizado.

## Pasos
1. `github_get_repo` → ver stack, lenguaje, último push
2. `github_list_directory` → ver estructura completa
3. `github_read_file(package.json)` → ver dependencias
4. `github_read_file(vite.config / next.config)` → ver build config
5. `github_list_commits` → ver últimos cambios
6. Diagnosticar root cause
7. Parche mínimo primero (no rewrite)
8. `github_create_branch` → branch `claude/rescue-<repo>`
9. `github_create_file` → aplicar fix
10. `github_create_pull_request` → PR draft para Luis

## Reglas
- Parche mínimo > rewrite completo
- Citar archivo:línea del problema
- Un PR por problema, no mezclar fixes
- Si el stack es irrecuperable → proponer rewrite con justificación

## Modelos recomendados
- Diagnóstico: `MODEL_FAST` (Gemini Flash)
- Generación de fix: `MODEL_CODE` (DeepSeek)
- Revisión final: `MODEL_CHAT_MAIN` (Sonnet)
