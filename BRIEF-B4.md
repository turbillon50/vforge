# BRIEF B4 — VForge: Proyectos con datos reales para que los filtros sirvan (28-sep-2026)

Eres el ejecutor de Vulcano en VForge. Worktree `/root/worktrees/vforge-b4`, rama `proyectos-reales`. Solo tocas `/app/projects`, `app/api/projects/*` y lo que crees para esto. B2 (tablero) y B3 (editor) trabajan en otras partes: no las toques.

## Antes de tocar código
Lee `/root/skills-vault/DOCTRINA.md` (v7) y la skill `metodo-apps` completa (SKILL.md, MUST-500.md, SANIDAD.md, LENTES.md).

## Lo que dijo Luis
"Los filtros por proyecto no filtran adecuadamente."

## Lo que Vulcano ya midió (28-sep, en producción, con su sesión)
- La mecánica de los filtros está bien: 9 de 9 combinaciones dan el número exacto contra la API (script `/root/vulcano-audit/vforge-rescate/filtros.py`, salida en `filtros.log`).
- **El problema son los datos.** De 339 proyectos: 326 están en "En revisión" (el valor por defecto al sincronizar) y 13 en "Producción"; **0** tienen cliente, **0** tienen fecha de entrega, 324 están en 0% de avance, **0** tienen comentarios. Por eso filtrar por estado, cliente, entrega o avance no separa nada. Además hay familias partidas en muchos proyectos (ej. `vliving-2026`, `vliving-admin`, `vliving-rentas`, `vliving-vindex`…).

## Bloques
1. **Estado real calculado.** Si un proyecto nunca fue clasificado a mano (sigue en el `en_revision` por defecto), calcula un estado sugerido con señales medibles: dominio vivo respondiendo 200 + deploy en Vercel → Producción; push en los últimos 30 días → Activo; 31–90 días → En pausa; más de 90 días o sin repo → Archivado. El filtro de estado usa el estado real (manual si existe; si no, el calculado) y la tarjeta dice "estado calculado" cuando no es manual. **Nunca sobrescribas lo que Luis puso a mano.**
2. **Familias.** Agrupa los proyectos que son de la misma app (usa `family_code`, prefijos de repo y dominio). En la lista se ve una fila por familia, expandible. El filtro "Familia / duplicados" enseña cuáles se agruparon.
3. **Clientes, montos y fechas: propuesta, no invento.** Busca estos datos en fuentes reales ya existentes (tabla `projects` del Brain: `purpose`, `relacion`, `phase`; contratos en `/root/skills-vault` o en el repo de contratos; notas). Donde encuentres dato con fuente, créalo como **sugerencia** con su fuente visible. Luis las confirma de un jalón desde la pantalla ("Confirmar sugerencias"). Sin fuente, se queda vacío. Cero datos inventados.
4. **Edición masiva.** Seleccionar varios proyectos y cambiarles estado, cliente, prioridad o familia a la vez (hoy es uno por uno).
5. **SANIDAD de la pantalla.** Cada filtro, orden, búsqueda y botón de `/app/projects` hace lo que dice y su consecuencia se ve (contadores, URL compartible, "Limpiar filtros", estado vacío con mensaje humano). Escritorio y móvil 390.

## Cómo trabajas
- Node 20, commits firmados `turbillon50 <turbillon50@gmail.com>`, push a `origin proyectos-reales` al cerrar cada bloque. NO empujes a main: Vulcano revisa y sube.
- Nada de `next build` local (RAM). `npx tsc --noEmit -p .` en 0 y `npm test`.
- Migraciones solo aditivas y con `pg_dump` previo de las tablas que toques. No borras datos.
- Pruebas con Playwright WebKit 390 y 1440 y sesión real (patrón en `filtros.py`). Re-corre `filtros.py` ampliado con los filtros nuevos: todo en OK.
- Lista maestra `LISTA-B4.md`, `[x]` solo con evidencia. `DONE-B4` al terminar.
