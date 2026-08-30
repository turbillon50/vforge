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
3. Si no está definida → la sala muestra “Administración no configurada”.

La ruta `/admin` debe existir y guardarse explícitamente después de verificarla.
VForge no inventa la ruta porque una app puede responder 404 o reutilizar la
landing, lo que hacía que la sala mostrara una administración falsa.

## Qué no es

- No es el cockpit de VForge (tú como builder).
- No se monta el panel entero dentro de `vforge.site`.
- Es el `/admin` de **la app del cliente**, estándar Protocolo Estandarte.

## Transplant a app nueva

Ver repo `turbillon50/vmomentum-panel-core`.
