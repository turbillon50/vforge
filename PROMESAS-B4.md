# PROMESAS — /app/projects (B4)

Cada elemento de la pantalla es una promesa: dice algo y debe hacerlo, con consecuencia visible.
Corredor: `node scripts/qa/filtros-b4.mjs` (WebKit 390 y 1440, catálogo real fijado en `qa/catalogo-b4.json`).
Contraprueba del verde: `node scripts/qa/filtros-b4.mjs --romper` debe salir en rojo.

| id | Elemento | Promesa (qué pasa al tocarlo) | Consecuencia (dónde se ve) | Prueba |
|---|---|---|---|---|
| B4-01 | Buscar | filtra por nombre, id, dominio, repo, cliente, familia y comentario | contador "Mostrando", URL `?q=`, pastilla con la palabra | `filtros-b4 ?q=vliving` |
| B4-02 | Borrar búsqueda (X) | vacía el cuadro | vuelve el total, se va `?q=` | `filtros-b4` |
| B4-03 | Chips de Estado (real) | filtra por el estado que manda (manual si existe, calculado si no) | contador, `?estado=`, número en cada chip | `filtros-b4 ?estado=*` (5 casos) |
| B4-04 | Chips "De dónde sale el estado" | separa lo puesto a mano de lo calculado | contador, `?fuente=`, número en el chip | `filtros-b4 ?fuente=manual/calculado` |
| B4-05 | Chips de Actividad | filtra por edad del último push | contador, `?actividad=` | `filtros-b4 ?actividad=7/30/never/dormant` |
| B4-06 | Chips de Entrega | filtra por fecha de entrega | contador, `?entrega=` | `filtros-b4 ?entrega=undated` |
| B4-07 | Chips de Avance | filtra por % | contador, `?avance=` | `filtros-b4 ?avance=0` |
| B4-08 | Marca "Familia / duplicados" | deja sólo los que comparten familia con otro | contador, `?marcas=family`, fila de familia con su motivo | `filtros-b4 ?marcas=family` |
| B4-09 | Marca "Con sugerencias" | deja sólo los que tienen dato propuesto con fuente | contador, `?marcas=sugerencias` | `filtros-b4 ?marcas=sugerencias` |
| B4-10 | Marcas restantes (prioridad, por cobrar, comentarios, dominio, repo, Vercel) | cada una filtra lo que dice | contador y `?marcas=` | `filtros-b4 ?marcas=*` (6 casos) |
| B4-11 | Cliente / Lenguaje | filtra por el valor elegido | contador, `?cliente=`, `?lenguaje=` | `filtros.py` (Vulcano) |
| B4-12 | Combinaciones | los filtros se acumulan (Y lógico) | contador exacto | `filtros-b4` (4 casos combinados) |
| B4-13 | Pastillas activas | tocar una pastilla quita ese filtro | contador sube, se va el parámetro de la URL | `filtros-b4` |
| B4-14 | "Limpiar todo" / "Limpiar filtros" | borra todos los filtros, conserva el orden y el agrupado | contador vuelve al total, URL limpia | `filtros-b4` |
| B4-15 | Ordenar por + dirección | reordena todo el catálogo filtrado | primer renglón cambia, `?orden=`/`?dir=` | `filtros.py` (Vulcano) |
| B4-16 | Encabezados de columna | ordenan por esa columna; el mismo invierte la dirección | flecha ↑↓ y `?orden=` | `filtros.py` (Vulcano) |
| B4-17 | "Agrupar familias" | junta en una fila los proyectos de la misma app | filas de familia, `?agrupar=0` al apagarlo, contador "· N familias" | `filtros-b4 agrupar=1` |
| B4-18 | "Ver los N" (familia) | abre la familia | se ven los N proyectos dentro, la flecha gira | captura `familias-abierta-*` |
| B4-19 | Casilla de familia | selecciona los N miembros | barra de lote con el número | captura `filtros-abiertos-*` |
| B4-20 | Casilla de proyecto | selecciona ese proyecto | barra de lote con el número | captura `filtros-abiertos-*` |
| B4-21 | "Seleccionar los N del filtro" | selecciona todo lo filtrado | barra de lote con el número; al repetir, deselecciona | captura |
| B4-22 | Barra de lote → Aplicar | `PATCH /api/projects/bulk` valida y actualiza en un golpe | filas actualizadas, aviso "Se cambiaron N de M", renglón en `audit_events` | curl real: 1 de 2 actualizados, 400 con categoría inválida, 401 sin sesión |
| B4-23 | Estado en el detalle | guarda la categoría a mano y estampa `category_manual_at` | la pastilla deja de decir "estado calculado"; el filtro `?fuente=manual` lo incluye | curl real (`zz-prueba-b4`), `npm test` estado-real |
| B4-24 | "Sondear N dominios" | mide por tandas qué dominios responden | mensaje con medidos/responden/restantes; tarjetas con "dominio 200 OK"; el estado calculado pasa a Producción | curl real: 70 medidos, 64 responden, 0 restantes |
| B4-25 | "Buscar en las fuentes" | escanea `client_project_status` y `contracts` | panel con sugerencias y su fuente; aviso de las filas que no empataron | curl real: 39 sugerencias en 13 proyectos, 4 sin empatar |
| B4-26 | "Confirmar N" / Confirmar (proyecto o campo) | aplica el dato sólo donde está vacío y deja rastro | el proyecto muestra el cliente/monto; `audit_events`; la sugerencia desaparece | curl real: 1 aplicada, `project_suggestions.estado='confirmada'` |
| B4-27 | "Descartar" | marca la sugerencia rechazada y no vuelve a proponerse | se va del panel y del contador | `PATCH accion=rechazar` |
| B4-28 | Tarjeta "Estado calculado" (número) | filtra por `fuente=calculado` | contador y chip encendido | `filtros-b4 ?fuente=calculado` |
| B4-29 | Tarjetas Vencidos / Por cobrar | encienden su filtro | contador y pastilla | `filtros-b4 ?entrega=overdue`, `?marcas=owed` |
| B4-30 | "Ver 40 más" | pinta la siguiente tanda | "X de Y filas en pantalla" sube | captura `lista-*` |
| B4-31 | Estado vacío | cuando nada coincide, lo dice y ofrece limpiar | mensaje humano + "Limpiar filtros" | `filtros-b4` (caso 0 resultados) |
| B4-32 | Detalle: cliente, entrega, montos, avance, familia, descripción | guardan al salir del campo | valor en la fila y en la base; "Guardando…" mientras | `filtros.py` (Vulcano) + curl `/meta` |
| B4-33 | Comentarios | agregar y borrar comentario | contador de la fila, último comentario en la tarjeta | pantalla (B1) |
| B4-34 | Sala / Invitar / Repositorios / Abrir sitio | navegan o abren su panel | ruta nueva o panel visible | pantalla |

## Regresiones que vigila el corredor

| id | Qué se rompió | Cómo se mide |
|---|---|---|
| R-B4-01 | El filtro de estado no separaba nada: 326 de 339 en "En revisión" por defecto | `?estado=*` da 67/102/20/150 con el estado real |
| R-B4-02 | La misma app aparecía hasta 17 veces | `agrupar=1`: 339 proyectos en 272 filas, 36 familias |
| R-B4-03 | Dos marcas distintas bajo el mismo dominio se juntaban (`ehecatl.vmomentum.site`) | `npm test` familias: subdominio con nombre propio no agrupa |
| R-B4-04 | "Con comentarios" daba 0 aunque había comentarios en la sala | contador suma `project_notes` + `project_comments` (2 proyectos) |
| R-B4-05 | Desborde horizontal en 390 | `scrollWidth - innerWidth <= 2` en las dos anchuras |
| R-B4-06 | Errores de consola al filtrar | 0 errores en la corrida |
