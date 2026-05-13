# Skill: bulk-categorizer

## Cuándo usar
Cuando Luis pide categorizar sus repos de GitHub.

## Categorías válidas
- `produccion` → app viva con usuarios reales
- `activo` → en desarrollo activo
- `en_revision` → necesita revisión antes de decidir
- `en_pausa` → pausado temporalmente
- `archivo` → terminado, sin mantenimiento
- `pendiente_borrado` → basura, borrar cuando Luis confirme

## Pasos
1. `github_list_repos(max=200)` → lista completa
2. Para cada repo (en paralelo con subagentes):
   - Ver nombre, descripción, lenguaje, último push, archived, fork
   - `openrouter_query` con MODEL_CLASSIFY (Llama 3.1 FREE)
   - Asignar categoría + justificación en una línea
3. Presentar tabla a Luis para confirmación
4. `memory_save` con el catálogo final

## Prompt para clasificación (Llama 3.1)
```
Clasifica este repo de GitHub en una categoría:
produccion | activo | en_revision | en_pausa | archivo | pendiente_borrado

Nombre: {nombre}
Descripción: {descripcion}
Lenguaje: {lenguaje}
Último push: {fecha}
Archived: {archived}
Fork: {fork}

Responde SOLO con: categoria|justificacion_en_una_linea
```

## Modelos recomendados
- Clasificación: `MODEL_CLASSIFY` (Llama 3.1 FREE — $0.00)
- Resumen final: `MODEL_FAST` (Gemini Flash)
