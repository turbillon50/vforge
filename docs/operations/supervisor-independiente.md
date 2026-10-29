# Supervisor independiente

El supervisor usa Cerebras directamente o a través del Mesh existente. No ejecuta
Claude, no requiere su sesión y no envía WhatsApp. El modelo revisa el código; los
comandos de verificación se ejecutan realmente cuando se pide `--full`.

```
node scripts/supervisor-review.mjs /ruta/repo "tarea" --base SHA_BASE --full
node --test tests/supervisor-review.test.mjs
```

Revisar sólo repositorios del operador. El árbol debe estar limpio. La base y HEAD
quedan registrados junto al hash del diff completo. Si el diff excede el límite,
la revisión falla y debe dividirse explícitamente. Sin `--base` se revisa HEAD^;
sin `--full` se trata exclusivamente de revisión de código, sin certificar build.

Configuración privada: CEREBRAS_API_KEY, o SUPERVISOR_API_KEY con
SUPERVISOR_ENDPOINT y SUPERVISOR_MODEL opcionales. Alternativa Mesh: MESH_API_KEY
o ROUTER_KEY del archivo SUPERVISOR_ENV_FILE (predeterminado el archivo privado
existente de Mesh). Nunca incluir credenciales en Git. El destino Mesh debe
confirmar Cerebras en su metadato de enrutamiento.

Salida 0: aprobado; 1: rechazado por revisión o verificaciones; 2: error de
infraestructura, alcance o respuesta inválida. Un error nunca se convierte en
aprobación. Los informes incluyen los controles realmente ejecutados y se guardan
con permisos 600 en SUPERVISOR_REPORT_DIR. Una aprobación de código sin --full no
constituye autorización automática de despliegue.

Instalación compartida: conservar una copia privada del supervisor anterior,
publicar este archivo desde main y reemplazar review.js por un lanzador que importa
review.mjs. Verificar hashes y ejecutar la revisión con el PATH de Claude ausente.
No borrar recuerdos, sesiones ni credenciales de otros servicios.

Dependencias restantes observadas en la auditoría: funciones _v_llm_super,
_v_llm_super_stream y _ventana_llm de /home/brain-relay.py ejecutan Claude;
vulcano-auto-refresh renueva OAuth; el catálogo de skills de Vulcano usa
/root/.claude/skills. MetaMCP/Brain respondieron a un cliente Python independiente.
Estas dependencias requieren migración separada y aún no se certifica la cancelación
de toda la cuenta.
