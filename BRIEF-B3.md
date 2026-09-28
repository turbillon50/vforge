# BRIEF B3 — VForge: editor sobre preview en vivo (28-sep-2026)

Eres el ejecutor de Vulcano en VForge. Worktree `/root/worktrees/vforge-b3`, rama `editor-vivo`. Otros agentes trabajan en VForge (B1 en pantallas de `/app`, B2 en `/app/tablero`): tú solo tocas el Estudio (`/app/chat`, `components/workspace/*`, `components/live/*` en lo que toque al preview) y lo nuevo que crees.

## Antes de tocar código
1. Lee `/root/skills-vault/DOCTRINA.md` (v7) y la skill `metodo-apps` completa + `pwa-agencia-premium`.
2. Entiende cómo es hoy: el panel "Tres vistas / Escritorio / Móvil / Admin / Canvas" del Estudio muestra en un iframe la URL del deploy de Vercel. Cada cambio = commit + build en Vercel (1–3 min) + recargar. Ese es el problema de raíz.

## Lo que Luis pidió (literal)
"Tengo muchos problemas con los frontends, necesito un área de edición sobre preview muy cabrona", "algo como Replit", "tan chingones como Stitch o v0 y tener control real". Es para SU fábrica (sus propios proyectos), no para venta todavía.

## La meta medible
Pides un cambio (a V o tocando la vista) y lo ves en la vista previa en **menos de 3 segundos**, sin commit ni deploy. Publicar es un botón aparte.

## Fases (en este orden; no avances de fase si la anterior no se siente rápida)
1. **Motor vivo.** Por proyecto, un `next dev` (o el dev server que use el proyecto) corriendo en su worktree en el Hetzner, con recarga en caliente. Expuesto al navegador por HTTPS con acceso solo de Luis (token corto firmado por VForge; nada público). Investiga lo que ya hay: nginx, certificados, `*.vforge.site`. El iframe del Estudio apunta a ese servidor vivo en vez del deploy. V (el chat del Estudio) escribe archivos en ese worktree y el cambio aparece solo. Límites duros: máximo 3 servidores vivos a la vez, se apagan tras 20 min sin uso, `NODE_OPTIONS=--max-old-space-size=1536`. El servidor anda justo de RAM: mide antes y después.
2. **Editar sobre la vista.** Solo en el preview vivo (nunca en producción): una capa que al pasar el mouse resalta el elemento y al hacer clic sabe en qué archivo y línea vive (inyecta `data-vf-src` con un plugin de compilación en dev, o usa la info de fuente de React en dev). Con eso: editar el texto directo, ajustar color / tamaño / espaciado / alineación con controles, y "dile a V" con el elemento seleccionado como contexto ("esto más grande", "quita esta tarjeta"). Todo se escribe en el código de verdad y se ve por recarga en caliente. Escritorio y móvil (vista 390) lado a lado.
3. **Control.** Cada cambio es un commit en una rama de trabajo del proyecto: historial visible, deshacer al instante, comparar antes/después, y botón **Publicar** (push a la rama de producción → Vercel) con la verificación de la doctrina.

## Proyecto piloto
Uno de los proyectos reales de Luis que NO esté en trabajo hoy (no momentum, no exci, no vforge). Propón cuál en `LISTA-B3.md` y úsalo en una rama propia: nunca tocas su producción.

## Cómo trabajas
- Node 20, commits firmados `turbillon50 <turbillon50@gmail.com>`, push a `origin editor-vivo` al cerrar cada bloque. NO empujes a main.
- Sin `next build` local de VForge (RAM). `npx tsc --noEmit -p .` en 0 y `npm test`.
- Evidencia con Playwright WebKit y cronómetro: tiempo de "cambio → visible" medido 10 veces, mediana y peor caso. Capturas MIRADAS.
- Si algo no se puede hacer bien con lo que hay (RAM, DNS, certificados), escríbelo en `LISTA-B3.md` con el número que lo demuestra; no lo escondas.
- Lista maestra `LISTA-B3.md`: `[x]` solo con evidencia. `DONE-B3` al terminar las 3 fases.
