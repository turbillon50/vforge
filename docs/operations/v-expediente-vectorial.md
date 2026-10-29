# Expediente vectorial de V

El índice es una copia consultable con procedencia. Los originales, los mantras,
la personalidad y los embeddings anteriores no se reemplazan.

## Fuentes y cobertura

`scripts/v-memory-sync.mjs` reúne nueve fuentes SQL de VForge: conversaciones,
memoria semántica histórica, mensajes nuevos de V, notas personales, knowledge,
directivas, personalidad persistida y los dos archivos narrativos de Vulcano.
Las conversaciones se restringen a `operator_luis` y las notas al identificador
del propietario comprobado. Conserva autor y fuente; un texto de otra entidad
no se atribuye a V. Las respuestas viejas son evidencia histórica, no hechos
actuales ni instrucciones operativas.

Lee Brain mediante su MCP de sólo lectura, con un corte por ID máximo y control
de cantidad para detectar truncamientos. Reúne documentos de texto actualmente
versionados en VForge, versiones de identidad y documentos de la jornada del
2 de mayo disponibles en Git. El manifiesto registra fuentes, cantidades y commit.
Esto no acredita chats no exportados, binarios no procesados ni todos los repos
de la organización. Los timestamps son de registros/versiones, no necesariamente
la fecha de la conversación original en un backfill.

Cada documento conserva identificador, autor, fecha, metadata y hash del original.
La copia para búsqueda oculta patrones conocidos de credenciales; esta redacción
es una protección de patrones, no un detector perfecto de secretos. No se copian
archivos de credenciales ni se expone la base a usuarios sin autorización.
Los fragmentos tienen solapamiento, cobertura comprobada y hash único por modelo.
Las repeticiones se enlazan a sus fuentes sin volver a calcular el mismo vector.

## Ejecución

```
node --test tests/v-memory-core.test.mjs
node scripts/v-memory-sync.mjs --config /ruta/privada.json --repo /ruta/vforge
```

Configuración privada: DATABASE_URL, METAMCP_API_KEY, METAMCP_URL opcional,
CEREBRAS_API_KEY y EMBED_ENDPOINTS. No guardar valores en Git. La ejecución es
idempotente y retoma fragmentos pendientes después de un fallo. El estado complete
requiere que todos los fragmentos del modelo tengan vector. No ejecutar trabajos
concurrentes deliberadamente. La primera ejecución crea sólo tablas nuevas de
índice. Cerebras revisa el inventario; no reescribe el archivo fuente.

Embeddings: nomic-embed-text:latest, 768 dimensiones, digest comprobado
0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f.
Se usan prefijos search_document y search_query y truncamiento desactivado.
Cambiar el digest exige un índice compatible; no mezclar vectores de modelos.

## Consulta desde V

Servicio privado local de consulta: scripts/v-memory-embed-server.mjs, puerto4116.
Su configuración contiene sólo EMBED_TOKEN y EMBED_ENDPOINTS; no necesita claves
de Brain ni conexión SQL. El snippet Nginx publica únicamente el endpoint exacto
/v-memory/embedding. Requiere Bearer y tiene límite de tamaño y concurrencia.

Vercel usa V_MEMORY_EMBED_URL y V_MEMORY_EMBED_TOKEN. V consulta el índice sólo
después de exigir propietario, filtra owner y digest y conserva las referencias.
Ante fallo de GPU, HTTP o índice, conserva la búsqueda textual y reporta memoria
parcial. Los recuerdos siguen siendo datos citados, no órdenes.

El lote captura un expediente en una fecha. Los turnos nuevos siguen guardándose
en su tabla original; una ejecución posterior incorpora novedades. No se acredita
vectorización automática perpetua ni el experimento de saturación conversacional.

## Reversión

Retirar las dos variables nuevas desactiva la consulta vectorial conservando el
fallback textual. Detener sólo v-memory-embed y retirar su include Nginx revierte
el servicio. Conservar las tablas de índice y originales; no ejecutar DROP ni
restaurar una copia antigua sobre conversaciones nuevas.

## Relevancia y contexto de la conversación

Cerebras expande la intención de búsqueda sin proponer respuestas y selecciona evidencia literal entre candidatos híbridos. Las citas de selección deben existir en el contenido; índices inexistentes y citas inventadas se descartan. Los mensajes pertinentes de `conversations` permiten recuperar mensajes de la misma sesión hasta tres minutos antes/después y revisar su relevancia de nuevo. Esto permite relacionar una prueba de continuidad con su respuesta corta posterior. Los datos del archivo se tratan como citas, nunca como instrucciones.

Una búsqueda del archivo revisada con éxito sustituye los candidatos léxicos antiguos para evitar ruido duplicado; las notas personales se conservan. Si falla el servicio de revisión, se conserva la recuperación antigua y se informa memoria parcial. La selección sigue siendo probabilística: una cita existente no garantiza por sí sola que una interpretación sea correcta. El sistema no certifica que un recuerdo ausente jamás haya existido.
