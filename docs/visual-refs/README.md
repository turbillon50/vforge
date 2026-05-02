# Referencias visuales — vForge

Esta carpeta es la memoria visual del proyecto. Cualquier imagen que vaya a guiar a un agente (humano o IA) en una decisión de diseño debe vivir aquí, **commiteada al repo**, no en el celular de Luis.

---

## Cómo agregar una imagen

1. Nombrar con `kebab-case` y un prefijo de categoría:
   - `logo-*` — variantes del wordmark vForge
   - `mascot-*` — variantes del ForgeOrb
   - `screen-<route>-<state>.png` — screenshots de pantallas (ej. `screen-hub-dark.png`)
   - `mood-*` — moodboards o referencias estilísticas externas
   - `og-*` — imágenes Open Graph para redes sociales
2. Comprimir antes de commitear (TinyPNG, Squoosh, etc.). Cap recomendado: **300 KB por imagen**.
3. Incluir una entrada en este README con qué representa la imagen y dónde se usa.
4. Si es referencia externa (no propia), agregar línea de atribución y licencia.

---

## Catálogo

| Archivo | Categoría | Uso | Origen |
|---|---|---|---|
| _(pendiente)_ `logo-vforge-master.png` | logo | Master del wordmark plateado con anillo verde y tagline | ChatGPT image gen, prompt de Luis |
| _(pendiente)_ `mascot-orb-blue-reference.png` | mascot | Referencia original azul que se recolorea a verde para `<ForgeOrb>` | ChatGPT image gen |
| _(pendiente)_ `screen-hub-dark.png` | screen | Estado actual de `/hub` en dark mode (post-v0 sync) | Luis, screenshot |
| _(pendiente)_ `screen-forge-dark.png` | screen | Estado actual de `/forge` en dark mode | Luis, screenshot |

> Cuando agregues archivos, actualiza esta tabla con su entrada. Mantén el orden por categoría.

---

## Convenciones de tamaño

| Uso | Resolución mínima | Formato |
|---|---|---|
| Logo master | 1024 × 1024 | PNG con transparencia |
| Mascot reference | 1024 × 1024 | PNG con transparencia |
| Screen screenshot móvil | 1170 × 2532 (iPhone 15) | PNG |
| Screen screenshot desktop | 1920 × 1080 | PNG |
| Moodboard | 1600 ancho mínimo | JPG calidad 85 |
| OG | 1200 × 630 | PNG |

---

## Por qué importa

Sin estas imágenes en el repo, los agentes downstream (v0.dev, Claude Code, Forge AI futuro) trabajan a ciegas. La calidad del output baja ~30% cuando dependen solo de descripciones textuales para componentes icónicos. Ver lección 9.1 del playbook.
