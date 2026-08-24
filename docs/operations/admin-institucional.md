# Admin institucional (base de proyectos)

## Convención

Todo proyecto del stack V·Momentum / VForge usa el **Panel Maestro** (`vmomentum-panel-core`, extraído de Ssante) en:

```
https://{dominio-o-vercel}/admin
```

## Resolución en la sala live

`resolveProjectViewportUrls`:

1. Si `projects.admin_url` está definida → se usa tal cual.
2. Si no → se deriva `{vercel_url|domain}/admin`.

Así el viewport **Administración** deja de quedar vacío en proyectos que ya tienen deploy pero nunca guardaron `admin_url`.

## Qué no es

- No es el cockpit de VForge (tú como builder).
- No se monta el panel entero dentro de `vforge.site`.
- Es el `/admin` de **la app del cliente**, estándar Protocolo Estandarte.

## Transplant a app nueva

Ver repo `turbillon50/vmomentum-panel-core`.
