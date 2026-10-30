# ADR-013: Casa de V canónica en la cuenta owner
Fecha: 2026-10-30. Solicitado por Luis.
Se añade /app/v-canonica encima de Spaces. Usa las conversaciones persistentes de V y su recuperación histórica existente, sin fusionar ni reescribir el archivo.
El propietario configura MCP (inicialmente Vulcano, VForge, Mesh), hasta cinco conexiones PostgreSQL y repositorios GitHub para skills. Conexiones cifradas con el Vault AES-256-GCM existente; nunca se devuelve la connection string ni tokens al navegador.
Cada turno usa el motor elegido (Cerebras o Mesh), recupera memoria existente, descubre herramientas MCP y registra resultados para evitar repetir automáticamente la misma llamada al reintentar un turno. Bases externas: transacciones de sólo lectura; las herramientas MCP usan los permisos concedidos al token.
No se interpreta la disponibilidad de un catálogo como prueba de ejecución. Pendiente de verificación individual hasta probar cada conexión. Los archivos de repositorios se tratan como datos, no como instrucciones superiores.
