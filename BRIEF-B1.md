# BRIEF B1 — VForge: barrido 1 de producción (28-sep-2026)

Eres el ejecutor de Vulcano en VForge (vforge.site). Trabajas SOLO en este worktree (`/root/worktrees/vforge-b1`, rama `barrido-1`). Nadie más toca VForge: si ves commits ajenos en main, no los reviertas, avísalo en la lista.

## Antes de tocar código (obligatorio)
1. Lee `/root/skills-vault/DOCTRINA.md` (v7) completa.
2. Lee COMPLETA la skill `metodo-apps`: `/root/skills-vault/metodo-apps/SKILL.md`, `MUST-500.md`, `SANIDAD.md`, `LENTES.md`. Y `/root/skills-vault/pwa-agencia-premium/SKILL.md`. Es la única ley. Solo cuenta lo premium.
3. Línea base medida en producción (54 rutas × 390/1440 × sin/con sesión): `/root/vulcano-audit/vforge-rescate/medicion.json`. Úsala para comparar antes/después.

## Lo que Luis quiere de VForge (contexto, NO lo implementes en este barrido)
"La app, no el conector": te lleva de dónde vive tu código y tu deploy hasta sacar tu producto estable a las tiendas; nivel agencia de diseño; preview del front editable visualmente; escritorio y móvil igual de cuidados; tablero de agentes dentro de VForge.

## PROHIBIDO en este barrido (son decisiones de Luis, van con opciones aparte)
- Cambiar la marca: colores, paleta, tipografía de marca, logo, header/footer (ni negro, ni violeta, ni "cristal"). Arreglas que NO se desborde, no su look.
- Reescribir el copy/posicionamiento de la portada.
- Fusionar o mover `/app` y `/workspace`, rehacer el onboarding, borrar rutas (`/forge`, `/forja`, `/lab`, `/labs`, `/v`), el preview editable.
- Datos inventados de cualquier tipo. Si no hay dato real, se omite.
- Tocar los datos reales de Luis en producción. Pruebas con `zz-prueba-*` que se borran.

## Bloques (en orden; cada uno con su criterio medible)
1. **Header de marketing en móvil**: en `/mcp /marketplace /blog /docs /billing /developers /labs /manifiesto /privacidad /privacy /support /terminos /terms` a 390px el desborde horizontal es 157px (`scrollWidth - innerWidth`). Menú colapsado en móvil, mismos colores. Criterio: desborde 0 en las 13 a 390 y 1440.
2. **`/forja` (312px) y `/lab` (53px)**: desborde 0. `/lab` tardó 14 s con sesión: encuentra por qué y bájalo.
3. **`/mcp` sin inventos**: quita "40% reducción de tokens", "70% menos turnos", "8min", "30s", "Ahora hasta 40% en consumo…" y cualquier otra métrica no medida. El número de herramientas sale del registro real del código (hoy dice 14; el MCP real expone 17), nunca escrito a mano.
4. **Aviso "Avisos en el teléfono"**: hoy tapa contenido abajo en todas las pantallas (sobre el compositor del Estudio, tarjetas de Proyectos, Tablero). Que no tape nada, que al cerrarlo no vuelva, safe-area en móvil. Criterio: captura 390 y 1440 de /app/chat, /app/projects y /app/tablero sin nada encimado.
5. **`/workspace/studio` en móvil**: hoy son las 3 columnas de escritorio apretadas (columnas cortadas, pestañas fuera). En móvil: una columna con pestañas (Chat / Vista / Archivos). Escritorio igual que hoy.
6. **Splash**: casi 5 s antes de ver algo. Visitas repetidas se lo saltan; primera visita corto. El fallback sin JavaScript sigue funcionando.
7. **`/app/projects` en móvil**: más de 2,400 textos con letra < 12px y 339 proyectos pintados de golpe. Letra mínima 12px (lo que dicte MUST-500 si es más estricto) y paginar o virtualizar la lista.
8. **Marketplace**: títulos de tarjetas casi invisibles (gris sobre blanco) → contraste ≥ 4.5:1; texto del encabezado cortado en móvil.
9. **Estudio**: "Motor por resolver" se le muestra al usuario. Muestra el motor real o nada.
10. **Barrido MUST-500 + SANIDAD** sobre el núcleo: `/app/chat` (Construir), `/app/projects`, `/app/activity`, `/app/tablero`, `/app/integrations`, `/app/admin`, `/app/settings`, `/app/setup`. Cada botón hace lo que dice y deja su consecuencia; cerrar sesión y entrar con otra cuenta; scroll con rueda en escritorio; favicon; títulos de pestaña; estados vacíos dignos; errores con mensaje humano. Meta: 20–50 mejoras reales, cada una en la lista con evidencia.

## Cómo trabajas
- Node 20: `export NVM_DIR=/root/.nvm; . $NVM_DIR/nvm.sh; nvm use 20`. Commits firmados `turbillon50 <turbillon50@gmail.com>`. Push a `origin barrido-1` al cerrar CADA bloque. NO empujes a main: Vulcano revisa y mergea.
- RAM del servidor apretada: **NO corras `next build` local** (ya mató procesos por falta de memoria). Verifica con `npx tsc --noEmit -p .` (0 errores), `npm test`, y `npx next dev -p 3150` para probar.
- Variables para dev: `npx vercel env pull .env.local --environment=development --yes --token "$VERCEL_TOKEN"` (el token está en /root/.env). `.env.local` nunca se commitea y se borra al terminar.
- Pruebas visuales con Playwright **WebKit** (python3), a 390×844 y 1440×900, MIRANDO la captura. Sesión real sin pedirle nada a Luis: patrón en `/root/vulcano-audit/vforge-rescate/medir.py` (Clerk `sign_in_tokens` con `CLERK_SECRET_KEY_VFORGE` de /root/.env y `?__clerk_ticket=`). Para dev local usa el mismo patrón contra `http://localhost:3150` si Clerk dev lo permite; si no, prueba lo público en local y lo privado en la vista previa de Vercel de la rama.
- Lista maestra `LISTA-B1.md` en la raíz: cada punto `[x]` solo con evidencia (antes → después, número o captura). `[LUIS]` lo que solo él puede decidir.
- Al terminar TODO: re-mide las 54 rutas a 390 y 1440 (sin y con sesión) con el mismo script y compara contra la línea base; mata el `next dev`; borra `.env.local`; escribe `DONE-B1` con el resumen. Si te atoras de verdad, escribe por qué en `LISTA-B1.md` y sigue con el siguiente bloque.

## CAMBIO DE PRIORIDAD (Luis, 28-sep 03:06)
VForge NO sale a la venta por ahora: primero es la herramienta interna de Luis para llevar su fábrica. La estética de marketing pasa a segundo plano.
- SALTA el bloque 8 (Marketplace). No toques más páginas de marketing.
- Termina lo que tengas abierto y ve directo al bloque 10 (SANIDAD/MUST-500 del núcleo `/app`) y al bloque 9. Prioridad: que cada botón de `/app` funcione de verdad, no que se vea bonito.
- En el bloque 10 NO toques `/app/tablero` (lo hace B2) ni el Estudio `/app/chat` / `components/workspace` / preview (lo hace B3). Solo el resto del núcleo `/app`.
