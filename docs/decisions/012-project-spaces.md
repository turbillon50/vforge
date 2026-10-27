# 012 — Spaces dentro de VForge

Fecha: 2026-10-27. Alcance autorizado por Luis: conservar la fábrica y añadir una línea modular por proyecto.

## Decisión

La sala conserva sus previews, Monaco, archivos, conversaciones, herramientas y permisos. Spaces es una vista adicional enlazada desde cartera y sala. Un proyecto puede iniciar con nombre y contexto sin crear repositorios ni despliegues.

Cada módulo tiene identificador, responsable, instrucciones, dependencias, estado, resultado y evidencia. La vista lista permite operar en móvil; el canvas permite ordenar posiciones y visualizar dependencias. Guardado explícito en `project_spaces`, acceso exclusivo del propietario, control de revisión para evitar sobreescrituras y evento de auditoría sin copiar contexto privado al log.

La asignación no inicia agentes ni certifica resultados. La evidencia escrita es una referencia que el revisor debe comprobar. La ejecución sigue en las herramientas existentes de la sala. No se conecta un nuevo motor ni se simula trabajo en segundo plano.

## Cuenta institucional

`VFORGE_VERCEL_TOKEN` tiene prioridad sobre el token global del operador para operaciones de VForge, manteniendo las credenciales específicas de proyecto. `VFORGE_VERCEL_TEAM_ID` selecciona explícitamente el equipo visible. La ausencia o falta de acceso al equipo configurado produce un error; nunca se elige arbitrariamente el primer equipo. No se cambia el vault compartido de otras aplicaciones.

## Conservación y reversión

No se eliminan rutas, proyectos, modelos, datos ni capacidades de la sala. La PWA mantiene `/workspace` para dirigir por rol a propietarios y clientes. Se reutilizan logos existentes. El esquema es aditivo; revertir el commit deja los documentos conservados, sin borrar tablas. Para revertir configuración se pueden retirar las tres variables VFORGE específicas y volver al despliegue anterior.

## Validación y siguiente tramo

Tipos, compilación, lint focalizado y suite de pruebas. Requiere verificación autenticada en la cuenta del propietario del ciclo crear → guardar → reabrir → sala → regresar, concurrencia de dos pestañas y teclado móvil real. No se declara resuelto todo el contraste histórico ni certificada toda la PWA por esta entrega.

Después: simplificar agrupación de navegación con inventario de capacidades, reanudar módulos mediante herramientas existentes, carga/evaluación de ZIP desde la sala, revisión con evidencia comprobada y recuperación de contexto por ejecución.
