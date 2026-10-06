# LISTA-B4 — Proyectos con datos reales para que los filtros sirvan

Rama `proyectos-reales`. `[x]` sólo con evidencia (comando + número + captura mirada).
Medición de arranque (28-sep, Neon `projects`, 339 filas): 326 `en_revision` · 13 `produccion` ·
0 con cliente · 0 con fecha de entrega · 324 en 0 % · 0 con comentarios (`project_notes` vacía) ·
70 con dominio · 172 con proyecto en Vercel · 273 con repo · sólo 1 `family_code` (`vliving`, 6 miembros).
Respaldo previo: `pg_dump -t projects` → `/root/vulcano-audit/vforge-rescate/respaldo-b4/projects-antes-b4.sql` (98 KB, 339 filas).

## 1 · Estado real calculado
- [x] 1.1 Migración aditiva: `projects.category_manual_at`, tabla `project_health_checks`. Nada se borra.
- [x] 1.2 Backfill: los 13 proyectos ya clasificados a mano quedan marcados como manuales (los 326 `en_revision` por defecto, no).
- [x] 1.3 `lib/projects/estado-real.ts` puro: manual gana siempre; si no, calcula con señales medibles.
- [x] 1.4 Sondeo real de dominios (`POST /api/projects/health`) con resultado guardado y fechado.
- [x] 1.5 `GET /api/projects` devuelve `estado_real`, `estado_fuente`, `estado_motivo`.
- [x] 1.6 El filtro de estado usa el estado real; la tarjeta dice "calculado" y por qué.
- [x] 1.7 Pruebas del cálculo en `npm test`.

## 2 · Familias
- [x] 2.1 `lib/projects/familias.ts` puro: `family_code` > dominio > repo > nombre, con motivo por familia.
- [x] 2.2 La lista agrupa: una fila por familia, expandible; contador de miembros.
- [x] 2.3 El filtro "Familia / duplicados" enseña sólo lo agrupado y dice por qué se agrupó.
- [x] 2.4 Pruebas de agrupado en `npm test` (incluye no agrupar por palabras genéricas).

## 3 · Clientes, montos y fechas: propuesta, no invento
- [x] 3.1 Tabla `project_suggestions` (aditiva) con valor, fuente y estado.
- [x] 3.2 Escáner de fuentes reales: `client_project_status`, `contracts` + `contract_payments`.
- [x] 3.3 Cada sugerencia enseña su fuente; sin fuente no se propone nada.
- [x] 3.4 "Confirmar sugerencias" aplica de un jalón y deja rastro en `audit_events`.
- [x] 3.5 Pruebas del escáner (emparejado, precedencia y conflicto de fuentes).

## 4 · Edición masiva
- [x] 4.1 `PATCH /api/projects/bulk` valida y actualiza en un solo golpe, con auditoría.
- [x] 4.2 Selección múltiple en la lista + barra con estado, cliente, prioridad y familia.
- [x] 4.3 Consecuencia visible: filas actualizadas, contadores y aviso de cuántos cambiaron.
- [x] 4.4 Pruebas de validación del lote en `npm test`.

## 5 · SANIDAD de la pantalla
- [ ] 5.1 `PROMESAS-B4.md`: cada filtro, orden, búsqueda y botón con su promesa y su consecuencia.
- [ ] 5.2 `scripts/qa/filtros-b4.mjs`: cada filtro contra el número esperado — 24/24 OK.
- [ ] 5.3 Contraprueba del verde: se rompe un filtro a propósito y el corredor lo marca.
- [ ] 5.4 Capturas WebKit 390 y 1440 miradas (lista, familia abierta, filtros, selección, sugerencias).
- [ ] 5.5 `npx tsc --noEmit -p .` en 0 y `npm test` verde.
