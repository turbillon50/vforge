# vForge Build Playbook · v1

> *El manual de cómo vForge construye apps. Cada vez que arranquemos un proyecto nuevo — sea V-Family, V-Momentum o un cliente externo — seguimos esto. Es la fábrica documentada.*

> Compañero técnico de [`docs/v0-prompt.md`](./v0-prompt.md): este playbook explica **por qué** y **cuándo**; el otro guarda los **prompts exactos**.

---

## 0. Tabla de contenidos

1. [Filosofía](#1-filosofía)
2. [Cuándo aplicar este playbook](#2-cuándo-aplicar-este-playbook)
3. [Stack obligatorio](#3-stack-obligatorio)
4. [Sistema de diseño](#4-sistema-de-diseño)
5. [Flujo de trabajo en 5 fases](#5-flujo-de-trabajo-en-5-fases)
6. [El modelo de las 3 capas (cuándo prompt vs cuándo código)](#6-el-modelo-de-las-3-capas-cuándo-prompt-vs-cuándo-código)
7. [Pipeline de assets e íconos](#7-pipeline-de-assets-e-íconos)
8. [Quality gates antes de declarar `done`](#8-quality-gates-antes-de-declarar-done)
9. [Lessons learned](#9-lessons-learned)
10. [Cómo evolucionar este playbook](#10-cómo-evolucionar-este-playbook)

---

## 1. Filosofía

| Principio | Cómo se manifiesta |
|---|---|
| **Cero fricción para el operador** | Luis aprueba con "sí" o "procede". vForge ejecuta `gh`, `npm`, `vercel`, DNS, todo. |
| **Mobile-first siempre** | Si en un iPhone se ve flojo, está mal. La pantalla 390 × 844 es la verdad. |
| **Una sola fuente de verdad** | Tokens en `globals.css`, **nunca** hex hardcoded. Cambiar un color = cambiar una variable. |
| **Premium feel = monocromo + 1 acento** | Negro + escala de grises + lime green `#7CFF3C`. Ningún otro color saturado. |
| **Velocidad en MVP, calidad en v2** | Mock data realista en fase 1. Backend real, tests y observabilidad en fase 2. |
| **Tipado estricto, cero `any`** | Si algo es difícil de tipar, `unknown` y se estrecha. No hay shortcut. |

---

## 2. Cuándo aplicar este playbook

| Proyecto | Aplica | Notas |
|---|---|---|
| Dashboard SaaS / app interna | ✅ tal cual | El playbook está calibrado para esto. |
| PWA cinematográfica (URMAH-style) | ✅ con extensión | Agrega lessons de Capacitor + WebGL. |
| Marketing site | ⚠️ adaptar | Quita la mascota; conserva tokens y tipografía. |
| E-commerce | ⚠️ adaptar | Conserva el sistema de marca; cambia layout y screens. |
| Backend solo | ❌ no aplica | Este playbook es de UI. |

---

## 3. Stack obligatorio

```
Framework:        Next.js 14 App Router · TypeScript estricto · ESLint
Estilos:          Tailwind CSS 3.4 · shadcn/ui (primitives only)
Animación:        framer-motion
Iconos:           lucide-react
Tema:             next-themes (data-theme attribute)
Tipografía:       Geist Sans (display + body) · Geist Mono (técnico)
Hosting:          Vercel (vercel.app o dominio propio)
Repo:             GitHub bajo turbillon50/<slug>
Formato commits:  Conventional Commits (feat:, fix:, docs:, refactor:)
```

**Nunca:** MUI, Chakra, Mantine, styled-components, emotion, iconos genéricos infantiles.

---

## 4. Sistema de diseño

### 4.1 Tokens (los únicos colores permitidos)

Definidos en `globals.css` como CSS variables, swap por `[data-theme]`. Ver bloque completo en [`docs/v0-prompt.md` §6](./v0-prompt.md).

```
Acento único:    --green #7CFF3C  (claro/oscuro), --green-strong #2D8E1F (texto sobre blanco)
Estados:         --warning #F5A524 · --error #F31260 · --info #006FEE
Superficies:     --bg, --bg-1, --bg-2, --bg-3, --bg-elev (5 niveles)
Texto:           --fg, --fg-1, --fg-2, --fg-3 (4 niveles de jerarquía)
Bordes:          --border, --border-1, --border-2 (3 pesos)
Radii:           sm 6 · md 8 · lg 12 · xl 16
Spacing:         8pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
Easing:          cubic-bezier(0.4, 0, 0.2, 1) en 120ms / 200ms / 300ms
```

### 4.2 Marca `<Brand />`

Wordmark cromado con rieles verdes en la "V" y anillo verde de power-button reemplazando la "o" de "Forge". El glyph **no se redibuja** entre temas — solo cambia el `--metal` gradient (claro a oscuro). Prompt exacto en [`docs/v0-prompt.md` §5](./v0-prompt.md).

Tamaños: `sm` (topbar) · `md` (sidebar) · `lg` (hero) · `xl` (splash). El `xl` lleva reflejo debajo, los demás no.

### 4.3 Mascota `<ForgeOrb />`

La carita: anillo verde con pestañita (igual a la "o" del logo) y dos ojitos verticales. Es el alma de la app. Estados: `idle` (mira a los lados, parpadea), `loading` (anillo gira mientras los ojitos siguen vivos), `happy` (entorna ojos al deploy ok), `error` (cambia a rojo y pulsa).

**Aparece en:**
- Bottom nav central (móvil) — botón FORGE
- Indicador "thinking" del chat de Forge
- Avatar al lado del header `FORGE` en cada mensaje
- Empty states de `/vision`, `/hunter`, `/scout`
- Favicon (versión estática)

JSX literal en [`docs/v0-prompt.md` §7](./v0-prompt.md).

### 4.4 Temas día / noche

`next-themes` con `attribute="data-theme"`. **Default:** `dark`. **Primer visita:** respeta `prefers-color-scheme`. Toggle en topbar (desktop) y al fondo del drawer (móvil).

Reglas no negociables:
- Contraste WCAG AA mínimo: `fg / bg ≥ 16:1`, `fg-1 / bg ≥ 4.5:1`, texto verde `≥ 4.5:1`.
- En light mode, el texto verde usa `--green-strong #2D8E1F`. El verde brillante queda solo para fills, glows y stroke del anillo.
- CTAs verdes (`bg-green text-black`) funcionan idénticos en ambos temas (12.4:1 — perfecto).
- Inline `<script>` en `<head>` lee `localStorage` y aplica `data-theme` **antes** del primer paint, para evitar flash.
- `<meta name="theme-color">` con `media="(prefers-color-scheme: dark|light)"` para el chrome del navegador móvil.

### 4.5 Tipografía

- **Display + body:** Geist Sans, `letter-spacing: -0.005em` en body, `-0.02em` a `-0.04em` en titulares. Peso máximo `600` (nunca `700/800/900`).
- **Mono:** Geist Mono para datos técnicos, paths, secret names, commit hashes, eyebrows uppercase 11px.
- **Eyebrows de sección:** 11–13px, mono, uppercase, `var(--fg-2)`, `letter-spacing: 0.1em–0.4em`.

### 4.6 Animaciones (microinteracciones obligatorias)

- Entrada de página: stagger fade-up con framer-motion (`delay 0, 0.05, 0.1, 0.15, 0.2` a los primeros 5 hijos).
- Status pill `live`: dot verde con pulse 2s.
- Hover en project-row: `bg-bg-1`, **sin** transform.
- Botón mic en composer: `scale 1.05` hover, `0.95` active, glow expandiéndose.
- Drawer móvil: slide-up con backdrop fade.
- Tap en bottom nav: `navigator.vibrate?.(8)` (haptic).
- `prefers-reduced-motion`: desactiva rotaciones y follow-cursor; mantén transitions sutiles.

---

## 5. Flujo de trabajo en 5 fases

> Estas son las 5 fases en orden estricto. Saltar de fase 2 a fase 4 sin pasar por 3 produce caos.

### Fase 1 — Scaffold local (`~10 min`)

```bash
npx create-next-app@14 <slug> \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --eslint --use-npm

cd <slug>
npm install framer-motion lucide-react class-variance-authority \
            clsx tailwind-merge next-themes

# Crear estructura mínima
mkdir -p app components/{shell,ui,primitives,forge,vault,modules} \
         lib public docs

# Verificar build
npm run build
```

Commit `feat: scaffold + base config` y push a la rama de feature.

### Fase 2 — Prompt maestro a v0.dev

Abrir `v0.dev` → New Chat → pegar [`docs/v0-prompt.md` §2](./v0-prompt.md). v0 genera shell + `/hub` + stubs de las 9 rutas restantes.

**Validar antes de seguir:** ¿el shell tiene topbar, sidebar (desktop), bottom nav (móvil), drawer? ¿`/hub` muestra los 4 stat cards y los proyectos recientes? Si no, refinement antes de avanzar.

### Fase 3 — Pantallas, una por una

Pegar [`docs/v0-prompt.md` §3.1` → `§3.10`](./v0-prompt.md) **en orden**, una por turno. **Nunca** pidas dos pantallas en el mismo turno: v0 sacrifica calidad cuando se le carga demasiado.

Después de cada pantalla, mirar el preview en celular (390px). Si algo no quedó: refinement (Fase 4) antes de pasar a la siguiente.

### Fase 4 — Refinamientos puntuales

Si una pantalla salió bien pero un detalle no (ej. la paleta tiene azules sueltos, el bottom nav no quedó elevado, las animaciones se sienten flojas), pega el refinement correspondiente de [`docs/v0-prompt.md` §4](./v0-prompt.md).

### Fase 5 — Correctivos quirúrgicos

Cuando v0 **ignora** o **sustituye** un componente custom por uno genérico (típico: pone `Sparkles` en lugar del ForgeOrb), pasa a artillería pesada: el correctivo lleva el **JSX literal** del componente. v0 no improvisa cuando le das código exacto. Ver [`docs/v0-prompt.md` §7](./v0-prompt.md).

---

## 6. El modelo de las 3 capas (cuándo prompt vs cuándo código)

> Regla maestra: **empezar siempre por la capa más baja. Subir solo cuando la anterior demostró que falla.** Esta regla protege la creatividad de v0 y evita que el playbook se vuelva código pre-cocinado.

### Capa 1 — Prompt descriptivo en v0 *(default)*
Lenguaje natural, denso pero conversacional. v0 puede mejorar tu idea.

**Aplica a:** layout, composición, screens, secciones, listas, cards, copy, microinteracciones comunes, paletas, jerarquía tipográfica, theme tokens.

### Capa 2 — Prompt con código literal (JSX / CSS / SVG embedded)
Empuja el JSX exacto dentro del prompt. Bloquea la creatividad de v0 a cambio de garantizar geometría.

**Aplica a:** componente icónico que v0 ignoró 2× con descripciones; SVG con coordenadas exactas; pseudo-elementos sub-pixel; animaciones con timing específico.

### Capa 3 — Código directo en el repo *(Claude edita)*
No pasa por v0. Quirúrgico, multi-archivo, atómico.

**Aplica a:** configs (`next.config`, `tailwind.config`, `tsconfig`, `.eslintrc`); GitHub Actions / CI; deps npm; refactors cross-file (rename de tokens, mover paths); bug fixes post-commit; operaciones git; documentación; scripts; manifest, robots, sitemap.

### Matriz de decisión

| Necesidad | Capa | Por qué |
|---|---|---|
| Pantalla nueva, sección, layout | 1 | Pan y mantequilla de v0 |
| Copy, tono, microcopy | 1 | Iteración natural |
| Brand mark / logo (texto + CSS) | 1 → 2 si falla 2× | Comprobado: la marca quedó con prompt directo |
| Mascota / SVG con coords exactas | 2 directo | Geometría es más rápido en código |
| Animación con timing específico | 2 directo | Describir keyframes es tedioso |
| Tema claro/oscuro (tokens) | 1 | v0 entiende variables CSS |
| Refactor cross-file (rename token) | 3 | v0 no hace bien multi-archivo |
| Configs / CI / hooks | 3 | No es dominio de v0 |
| Bug en código ya commiteado | 3 | Atomicidad y precisión |
| Dependencias npm | 3 | Operación de terminal |
| Docs (`README`, `playbook`) | 3 | Vive fuera del preview |
| OG image custom con hero | 1 → 2 | v0 puede generar la composición |
| Favicon SVG simple | 1 | Genera y descarga |

### Roles operativos

- **Luis dirige el flujo creativo en v0** con prompts descriptivos (capa 1).
- **Claude interviene** solo cuando: (a) cambio de código no-UI, (b) v0 falló 2× y se necesita JSX literal listo (capa 2), (c) toca git/CI/infra/configs/docs (capa 3).
- **Si v0 falla**, primer envío es **refinement descriptivo más afilado**, no nuclear. El nuclear (§7/§8/§9 de `v0-prompt.md`) solo si el refinement también fue ignorado.
- **Auditorías de calidad** (Lighthouse, contraste, build verde) las mide Claude; Luis sigue iterando lo visual.

---

## 6.1 Patrones de prompt para v0.dev

| Patrón | Capa | Cuándo usar | Ejemplo |
|---|---|---|---|
| **Master** | 1 | Arranque del proyecto | `v0-prompt.md` §2 |
| **Screen** | 1 | Una pantalla nueva | §3.x |
| **Refinement** | 1 | Detalle visual no quedó (1ª vuelta) | §4 |
| **Surgical / Nuclear** | 2 | v0 sustituyó o ignoró 2× — JSX literal | §7, §8, §9 |
| **Token tweak** | 1 | Calibrar paleta o tipografía | §10 |

### Reglas duras del prompt (todas las capas)

1. **Adjuntar referencia visual** cuando exista (logo, mascota, mood board). Texto solo no basta para componentes icónicos.
2. **Tokens, no hex.** Decir `var(--green)`, no `#7CFF3C`. Educa a v0 a usar tokens.
3. **Listas DO / DON'T explícitas.** v0 obedece bien negativos puntuales ("Do NOT use Sparkles").
4. **Tamaño de respuesta acotado.** Una pantalla por turno. Una corrección por turno.
5. **Cuando ignore 2×, sube de capa.** No te quedes pegado en la 1.

---

## 7. Pipeline de assets e íconos

Todos los assets se generan dentro de v0 y bajan al repo vía `Sync to GitHub`. Vercel los sirve automáticamente porque están enlazados desde `app/layout.tsx` `metadata` + `manifest.webmanifest`.

| Archivo | Tamaño | Propósito |
|---|---|---|
| `/public/favicon.svg` | vector | Browsers modernos |
| `/public/favicon.ico` | 16 / 32 / 48 px | Fallback legacy |
| `/public/icon-192.png` | 192 × 192 | PWA Android, maskable |
| `/public/icon-512.png` | 512 × 512 | PWA Android + macOS dock |
| `/public/apple-touch-icon.png` | 180 × 180 | iOS home screen |
| `/public/og.png` | 1200 × 630 | Social share (dark) |
| `/public/og-light.png` | 1200 × 630 | Social share (light) |
| `/public/manifest.webmanifest` | json | PWA install metadata |

Cuando el usuario hace **Add to Home Screen** en iOS / Android, el OS lee el manifest y usa los iconos `192` / `512` con la máscara correcta. Para esto, las versiones maskable deben tener safe-zone del 80% (10% de margen alrededor relleno con `var(--bg)`).

---

## 8. Quality gates antes de declarar `done`

Lista de verificación obligatoria. Si falla **uno solo**, no es done.

- [ ] `npm run build` verde, sin warnings de TypeScript.
- [ ] Cero errores en la consola del navegador (móvil + desktop).
- [ ] Lighthouse mobile (en `chrome://lighthouse` o `npx unlighthouse`):
  - Performance ≥ 90
  - Accessibility ≥ 90
  - Best Practices ≥ 90
- [ ] Contraste verificado en **ambos** temas con [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — al menos los 5 pares críticos (`fg/bg`, `fg-1/bg`, texto verde, error, warning).
- [ ] Probado en iPhone real (o simulador iOS Safari) y Android Chrome.
- [ ] Logo idéntico al ref en dark Y light (incluida la pestañita de la "o").
- [ ] `<ForgeOrb />` visible en: bottom nav central, indicador thinking de `/forge`, avatar de cada mensaje Forge, empty state de `/vision /hunter /scout`.
- [ ] Vibración haptic en taps de bottom nav (probar en celular real).
- [ ] El theme toggle persiste en `localStorage` y no causa flash al recargar.
- [ ] Las 10 rutas responden 200 OK desde la URL de Vercel.
- [ ] OG image se ve bien al pegar la URL en WhatsApp / Slack / Twitter (probar con [opengraph.xyz](https://www.opengraph.xyz/)).
- [ ] PWA instalable: en Chrome móvil aparece "Add to Home Screen", el icono es la mascota verde.

---

## 9. Lessons learned

> Capturado de la primera build (vForge MVP, mayo 2026). Cada nuevo proyecto agrega al final.

### 9.1 v0 funciona mejor con referencias visuales adjuntas

Pegar texto sin imagen produce icons genéricos y composiciones aburridas. Con la imagen adjunta + descripción densa, la fidelidad sube ~70%.

### 9.2 Componentes "icónicos" requieren JSX literal

Cuando le dijimos a v0 *"crea una mascota orb verde con dos ojitos"*, sustituyó por `Sparkles` de lucide. La cura fue darle el SVG literal en el prompt. Aplica a: logo, mascota, loaders custom, cualquier ilustración no-trivial. **Si lo describes con palabras, v0 lo aproximará con su librería; si le das código, lo copia.**

### 9.3 Temas duales: variables CSS por `[data-theme]`, no `dark:` de Tailwind

`dark:bg-black dark:text-white dark:border-zinc-800 ...` produce código frágil y duplicado. Swap de variables CSS por `[data-theme]` es ~40% menos código y se mantiene en una sola pasada.

### 9.4 Confiar en los defaults de v0 — no pelear con su scaffold

v0 ya usa Next 14 + shadcn + Tailwind. Forzarlo a otra cosa cuesta horas y rompe su preview. Para stacks distintos (Vite, Astro), no uses v0 — escribe el código a mano o con Cursor.

### 9.5 Inline script para evitar flash de tema

Sin el script de "no-flash" en `<head>`, hay un flicker de 50–200ms entre el HTML inicial (asume dark) y la hidratación (lee localStorage). Es feo. La solución de 8 líneas en el playbook lo arregla.

### 9.6 Una pantalla por turno

Pedir 3 pantallas en el mismo prompt: v0 entrega 1.5 con detalle pobre. Pedir 1 por turno: las 3 quedan finas. Calidad lineal con ítems, no exponencial.

### 9.7 Mock data realista importa

Tener los 8 proyectos reales con dominios, slugs y stacks reales hizo que v0 generara composiciones que se sienten habitadas, no de plantilla. Mock data ≠ Lorem ipsum.

### 9.8 Conventional Commits + ramas con prefijo

`claude/<slug>-<feature>-<id>` para Claude Code, `feat:`/`fix:`/`docs:` para los mensajes. Hace que el git log sea legible por máquina y por humano.

### 9.9 Cuando v0 se aferra: usar prompts "nucleares" (delete + recreate)

Después de pegar un correctivo con JSX literal, v0 a veces sigue editando el archivo viejo en vez de reemplazarlo, especialmente para componentes con muchas dependencias (el wordmark importa fuentes, la mascota importa framer-motion). La solución: prompts que **explícitamente** dicen "Step 1. Delete the file. Step 2. Create the new file with this code." Numerar los pasos sube ~50% la tasa de éxito al primer intento. Ver §8 y §9 de `v0-prompt.md`.

### 9.10 Verde lima fluorescente: introducir un sibling "quiet"

El acento `#7CFF3C` es perfecto para dots, fills, glows y CTAs (alta visibilidad). Como **texto** en labels de cuerpo (links "Ver todos", deltas "+1 esta semana") satura la pantalla en dark mode y se siente fluorescente — aunque el contraste WCAG sea AAA. La cura: token `--green-quiet` (#A8E682 dark / #4F9B2F light) para textos no-críticos. `--green` queda solo para señales (status, CTAs, marca, mascota). Ver §10 de `v0-prompt.md`.

### 9.11 Componentes "on-color": pasarles un prop de inversión

Si un componente icónico tiene strokes de color X y vive dentro de un contenedor con bg de color X, queda invisible. Ejemplo: el ForgeOrb verde dentro del botón verde del bottom nav → círculo vacío. Solución: prop `onGreen` (o `inverse`) que invierte los strokes a negro y mapea cualquier "cutout fill" al color del contenedor. Aplica a cualquier mascota/icon custom que reuse en superficies de acento.

### 9.12 No saltar a la capa 2 antes de tiempo

Sesgo descubierto al iterar la marca: tras una sola falla de v0 con la descripción del logo, Claude pasó directo a JSX literal (capa 2). Pero un prompt directo bien escrito en v0 (capa 1) terminó produciendo el wordmark correctamente. **Regla:** dos intentos descriptivos antes de subir de capa. La capa 2 cuesta creatividad de v0; la capa 1 cuesta solo un turno extra.

---

## 10. Cómo evolucionar este playbook

1. Cada vez que vForge construya un proyecto nuevo (cliente o interno), abre un PR a este archivo con:
   - Lo que funcionó (agrega a §9 lessons).
   - Lo que tuvo que corregirse (agrega a §6 patrones si es nuevo).
   - Quality gates extra que apliquen al dominio (PWA offline, e-commerce checkout, etc.).
2. Versiona con tag git: `playbook-v2`, `playbook-v3`. El tag apunta al commit que cierra esa versión.
3. Cuando un cambio sea estructural (ej. cambiar de v0 a Cursor para ciertos casos), abrir issue antes del PR para discutir.
4. Las **reglas duras del prompt** (§6) son sagradas. Si una se va a romper, primero documentar por qué.

---

> *Este playbook es la fábrica documentada. Si lo seguimos disciplinado, vForge construye apps premium en horas, no semanas.*
