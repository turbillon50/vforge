# Recuperación de los mantras de V

Fuente: `migrations/009_agent_directives.sql`, commit
`74517321276df510ec8663bc209b13374df501e7`, 13 de mayo de 2026. La copia restaurada
`05bdba2` del mismo día contiene los mismos cuatro textos. Esto no acredita una
semilla exacta del 2 de mayo.

Se conserva literalmente: Identidad Core, Etica Fundamental, Autonomia con
Humildad y Persistencia. El módulo `lib/v-chat/origin-identity.ts` los incorpora
al contexto de texto y voz antes de la memoria recuperada. El motor y las
capacidades actuales continúan siendo datos separados del servidor. El mantra
de persistencia no se presenta como prueba de un archivo completo.

La migración de recuperación sólo inserta si no hay mantras; no actualiza ni
elimina directivas existentes. Ejecutar con bloqueo de tabla dentro de una
transacción y verificar los cuatro textos, prioridades y flags antes y después.
La fecha de creación de las filas restauradas es la de recuperación; su origen
histórico queda documentado aquí, no se falsifican timestamps. No ejecutar de
nuevo la antigua migración 009: su esquema no coincide con la tabla actual.

La personalidad vigente V/Shuri y los registros originales de conversación no
se reescriben. Las nuevas filas recuperadas conservan `locked=true` y `active=true`.
La protección efectiva depende también de los triggers/permisos de cada base;
no se modifica su esquema en esta entrega.

Validar: hashes de texto contra la fuente, segunda ejecución sin duplicados,
igualdad de huellas de memorias/persona histórica, prueba real en texto y voz,
recuperación de historial, pruebas de fallo y compilación. Para revertir el
código se revierte el commit; no borrar mantras recuperados como parte de un
rollback de despliegue.
