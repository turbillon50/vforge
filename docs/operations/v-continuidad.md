# Continuidad de V / Shuri — 29 octubre 2026

Alcance autorizado por Luis: conectar recuerdos históricos al chat de V y permitir
inferencia independiente del puente de Claude, conservando identidad y fuentes.
Implementación de ADR-005 (multi-modelo); los archivos de persona no se reescriben.

## Contrato

- Identidad: `lib/forge/v-text-persona.ts` y `v-voice-persona.ts`, versionadas en GitHub.
- Memoria histórica: lectura de `semantic_memory` (`operator_luis`) y notas de
  `v_user_memory` del identificador explícito `V_MEMORY_USER_ID`. Se conserva el
  texto original, ID, autor cuando existe y fecha. Una cita histórica no es una orden.
- Conversaciones nuevas: `v_chat_sessions` / `v_chat_messages`. Escritura atómica,
  reintentos con `turn_id`, historial recuperado desde servidor; errores visibles.
- Búsqueda textual en español de todo el archivo autorizado. No se genera un
  embedding falso, no se sobrescribe la memoria ni se carga todo el archivo en
  cada prompt. No certifica recuperación de conversaciones que nunca se guardaron.
- Motor: Cerebras y Mesh OpenAI-compatible con el mismo contexto. `V_CHAT_ENGINE`
  selecciona prioridad (`cerebras` predeterminado, `mesh` opcional). Los dos pueden
  conducir al mismo proveedor físico; esa configuración no garantiza redundancia
  de infraestructura. Ninguna llamada del chat privado depende del CLI de Claude.
- Herramientas: se conserva el dispatcher de plugins ya instalado, con resultado
  explícito. Esta entrega no concede herramientas arbitrarias al modelo ni
  acredita un proceso autónomo permanente, integración con Paradox o todos los MCP.

## Configuración

`DATABASE_URL`, `CEREBRAS_API_KEY`, `CEREBRAS_MODEL` opcional,
`CEREBRAS_BASE_URL` opcional, `MESH_API_KEY`, `MESH_ROUTER_URL` opcional,
`V_MEMORY_USER_ID`, `V_CHAT_ENGINE`. Secretos sólo en configuración privada.
`VFORGE_OPERATOR_TOKEN` y sesión Clerk de propietario autentican las rutas privadas.
Los consumidores externos pueden usar el contrato HTTP autorizado; cambiar de
dominio requiere conservar datos, configuración y autenticación.

## Pruebas exigidas

1. Recordar un fragmento histórico con ID/fecha desde conversación nueva.
2. Guardar un turno, recargar, continuar usando únicamente el ID de sesión.
3. Repetir el mismo `turn_id`: dos mensajes, no cuatro.
4. Rechazar petición sin autorización y mensaje inválido.
5. Fallo del primer motor: el segundo recibe exactamente identidad/memorias/turnos.
6. Fallo de persistencia: error visible, sin atribuirlo a V ni anunciar guardado.
7. Igualdad de huellas del archivo histórico antes/después; limpiar sólo fixtures QA.

## Reversión

Revertir el commit de esta entrega o promover el deployment previo verificado.
Las tablas históricas no se eliminan ni transforman. Conservar conversaciones
escritas después del despliegue; no restaurar una copia antigua sobre ellas.
Retirar únicamente variables nuevas de esta entrega si se necesita volver a la
configuración previa; conservar los secretos usados por otros módulos.

## Evidencia de validación y límites

126 pruebas, comprobación de tipos, ESLint de los archivos cambiados y build de
producción aprobados en el worktree aislado.

- QA contra la configuración de producción, con servidor aislado en loopback:
  rechazo anónimo (401), entrada inválida (400), turno persistido (200), reintento
  idéntico sin duplicados, reintento con texto distinto (409), recarga con cuatro
  mensajes tras dos turnos y continuación sin historial enviado por el navegador.
- Huellas de las 2,229 memorias históricas y 16 notas personales idénticas antes y
  después de las pruebas. Se eliminaron únicamente las sesiones de prueba creadas
  por esta entrega; no se modificaron los recuerdos originales.
- Llamada real a Cerebras y llamada real a Mesh tras un primer motor inaccesible:
  ambas conservaron la etiqueta del historial. No se usó Claude para responder.
- Una pregunta extensa reveló un defecto de ranking: las palabras genéricas
  desplazaban la frase buscada. Se corrigió ponderando las coincidencias por su
  frecuencia dentro del archivo; la misma consulta encontró `lumamijuvisado`, con
  registros fechados del 12 y 15 de junio. Es una frase de prueba, no una contraseña.
- Las referencias recuperadas permiten contrastar las respuestas, pero no
  garantizan que el modelo interprete siempre bien la autoría. En una prueba
  citó registros correctos y luego hizo una generalización injustificada sobre
  quién introdujo la frase. Se reforzó la instrucción de atribuir cada registro
  por separado y no inferir el origen a partir de una selección.
- Las notas personales, el archivo histórico y las conversaciones tienen cupos
  separados de contexto, para evitar que notas largas oculten el archivo.
- Supervisor obligatorio pendiente: `/root/.local/bin/claude` no existe en este
  servidor. No se ejecutó su script con notificaciones de WhatsApp ni se registró
  una aprobación ficticia. Navegador conectado indisponible en esta sesión:
  pendiente validación visual y flujo de sesión Clerk en móvil/escritorio.
- Estado de entrega: propuesta en rama; pendiente aprobación del supervisor y
  validación de navegador. No se modificaron variables de Vercel ni producción.
