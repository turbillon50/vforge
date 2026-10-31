# Infraestructura y catálogo de las dos casas

## Acceso

`/app/infraestructura` y `/api/infra` son exclusivos de los propietarios
configurados en `VFORGE_OWNER_EMAILS`. No se elevan permisos con metadata de
Clerk. El cambio de esa variable requiere un nuevo despliegue.

El 31 de octubre de 2026 se separó la identidad compartida. `dluisdelatorre@gmail.com`
es propietario global y `casa1acevedo@gmail.com` tiene su propia identidad de Clerk,
propietario de los diez proyectos verificados de Casa Acevedo. Este último correo
se retiró del allowlist global sin retirar a los demás propietarios existentes.

El selector consulta `/api/workspace/context`. Luis puede entrar a la fábrica o
consultar Casa Acevedo manteniendo su propia sesión. Acevedo sólo recibe su espacio;
una URL, un correo coincidente o metadata no le otorgan acceso a otros espacios.
La tabla `vforge_personal_spaces` vincula cada espacio con un ID de Clerk estable.
Aplicar `migrations/20261031_personal_spaces.sql` antes de desplegar estos endpoints.

`/workspace/casa` muestra proyectos por membresía y `/api/workspace/infra` devuelve
sólo la casa asignada. Del gateway compartido únicamente muestra estado; excluye
el inventario global de endpoints y claves. Selene conserva su implementación
existente. Obsidian queda pendiente hasta disponer de la referencia de su bóveda;
esta migración no copia memorias ni modifica el agente que las está construyendo.

Se trasladaron ocho registros cifrados GitHub/Vercel del usuario compartido al
usuario de Acevedo sin descifrarlos. El historial compartido y las apps sin una
coincidencia verificada no se transfirieron. Al cerrar la separación se revocan
las sesiones y tokens MCP/OAuth de la identidad antes compartida; ambos deben
volver a identificarse con su propio correo y generar sus tokens nuevos.

Los owners conservan acceso al catálogo global. Sus conexiones personales tienen
prioridad para resolver credenciales; el fallback del operador sigue permitido
para owners. Esto no constituye aislamiento entre propietarios.

## Lecturas y fuentes

`servidor/tablero/infra.py` consulta servicios, disco, RAM, Nginx y metadatos de
MetaMCP en Casa Luis. Consulta Casa Acevedo por el SSH existente con verificación
estricta de host. Las credenciales de GitHub/Vercel permanecen en el entorno de
Selene, en el taller; el JSON contiene sólo metadatos seleccionados.

La captura se escribe atómicamente en `/root/tablero/infra.json`, modo 0600.
`/api/infra` lee únicamente esa ruta fija a través del relay existente. No admite
comandos ni rutas proporcionados por el cliente. La UI identifica capturas de
más de cinco minutos y fallos de cada fuente.

Instalación en Casa Luis:

```sh
install -m 0750 servidor/tablero/infra.py /usr/local/sbin/vf-infra
```

Cron, sin solapamientos:

```cron
*/2 * * * * root flock -n /run/vf-infra.lock /usr/bin/python3 /usr/local/sbin/vf-infra >> /var/log/vf-infra.log 2>&1
```

## Reconciliación del catálogo

GitHub define los repositorios y Vercel informa de los despliegues. El colector
reconcilia esos recursos con `projects` y `project_repositories` en la base
configurada del servicio `vforge-api`. Exige respuesta válida de ambos proveedores
y la identidad GitHub esperada. Una consulta fallida nunca elimina proyectos.

Se conservan IDs existentes cuando coincide el repositorio o proyecto Vercel;
para recursos nuevos se usan IDs de proveedor prefijados por `acevedo`.
No se inventan URLs ni se declara un despliegue saludable por estar configurado.
Los cambios de proyectos, repositorios y auditoría usan una sola sentencia SQL.
Una huella evita repetir la importación cuando las fuentes no cambian.

El estado y la fecha de reconciliación aparecen en el tablero. Esto reúne las
fuentes; no convierte a Nginx o MetaMCP en bases de memoria o de proyectos.

## Verificación

```sh
python3 tests/infra-collector.test.py
npm run typecheck
npm test
```

Para revertir, retirar el cron y revertir el commit. La captura deja de renovarse
y la UI la marca como antigua. Los registros importados se identifican por sus
repositorios y el evento `projects.sync.acevedo`; no se borran automáticamente.
