# Infraestructura y catálogo de las dos casas

## Acceso

`/app/infraestructura` y `/api/infra` son exclusivos de los propietarios
configurados en `VFORGE_OWNER_EMAILS`. No se elevan permisos con metadata de
Clerk. El cambio de esa variable requiere un nuevo despliegue.

El 31 de octubre de 2026 Luis autorizó agregar `dluisdelatorre@gmail.com` y
`casa1acevedo@gmail.com` sin retirar propietarios existentes. En ese momento
ambos correos pertenecían a **un mismo usuario de Clerk**. Agregarlos a la lista
no crea dos identidades ni transfiere las cuentas de los proveedores.

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
