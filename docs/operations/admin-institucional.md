# Admin institucional (base de proyectos)

## Convención

Todo proyecto del stack V·Momentum / VForge usa el **Panel Maestro** (`vmomentum-panel-core`, extraído de Ssante) en:

```
https://{dominio-o-vercel}/admin
```

## Resolución en la sala live

`resolveProjectViewportUrls`:

1. Si `projects.admin_url` está definida → se usa tal cual.
2. Si coincide con la landing pública → se rechaza como panel administrativo.
3. Si no está definida → se usa `{desktop|dominio}/admin?embed=1` (panel institucional).

Así el visor de Administración deja de quedar vacío cuando el proyecto ya publica `/admin` y sólo faltaba guardarlo en Neon.

## Qué no es

- No es el cockpit de VForge (tú como builder).
- No se monta el panel entero dentro de `vforge.site`.
- Es el `/admin` de **la app del cliente**, estándar Protocolo Estandarte.

## Transplant a app nueva

Ver repo `turbillon50/vmomentum-panel-core`.
