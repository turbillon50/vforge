---
name: visual-fidelity
description: Gestionar imagenes reales en repos, verificar fidelidad visual entre diseno y produccion, mantener consistencia de marca. ACTIVAR cuando el usuario suba imagenes, diga "sube esta foto", "mete esta imagen", "como se ve", "compara con el diseno", "checa la visual", "los colores no coinciden", "no se ve como lo disene", o cuando se necesite inyectar assets visuales a un proyecto.
---
# Visual Fidelity — Ojos de disenador

## Capacidades

### 1. Inyectar imagenes a repos
Cuando Luis suba una imagen a este chat o pase una URL:
1. Descargar/recibir la imagen
2. Subirla al repo via Hetzner (git add + push)
3. O subirla a Vercel Blob para CDN

Via Hetzner:
POST /brain/exec: cd /tmp/{repo} && curl -o public/images/{name}.jpg {URL} && git add . && git commit -m 'Add: {name} image' && git push

Via Vercel Blob (para CDN):
POST https://blob.vercel-storage.com/{filename}
Header: Authorization: Bearer {BLOB_TOKEN}
Content-Type: image/jpeg

### 2. Screenshot y comparacion visual
Tomar screenshot del sitio live y comparar con el diseno original:

1. Captura del live:
   Playwright: page.goto(URL) -> page.screenshot() -> base64 -> view

2. Luis sube su diseno original a este chat

3. Comparacion:
   - Colores: extraer paleta dominante del screenshot vs diseno
   - Layout: comparar estructura visual
   - Tipografia: verificar fonts cargados
   - Espaciado: verificar proporciones

### 3. Paleta de colores del proyecto
Extraer y verificar que la app usa los colores correctos:

Python con Pillow en Hetzner:
from PIL import Image
from collections import Counter
img = Image.open('screenshot.png').convert('RGB')
pixels = list(img.getdata())
top_colors = Counter(pixels).most_common(10)

### 4. Verificar assets cargados
Verificar que todas las imagenes del sitio cargan:
Playwright: page.goto(URL) -> evaluar todas las <img> -> verificar naturalWidth > 0

### 5. Gestionar assets por proyecto
Estructura recomendada:
public/
  images/
    logo.svg
    hero.jpg
    products/
      arrachera.jpg
      bistec.jpg
    sucursales/
      xalisco.jpg

### 6. Bulk upload de imagenes
Cuando Luis tenga muchas fotos de productos:
1. Las sube a este chat o a una carpeta
2. Yo las descargo todas en Hetzner
3. Las organizo por categoria
4. Las pusheo al repo
5. Actualizo la DB con las URLs

## Colores por proyecto (referencia rapida)
| Proyecto | Primary | Surface | Accent |
|---|---|---|---|
| CSN | #ffb77d | #131313 | #ff8c00 |
| V-Gift | TBD | TBD | TBD |
| Synapse | TBD | TBD | TBD |

## Flujo de verificacion visual
1. "Como se ve CSN?" -> screenshot del live
2. View screenshot -> verificar visualmente
3. Comparar con diseno original si Luis lo tiene
4. Reportar diferencias: colores, layout, imagenes rotas, fonts
5. Generar fix o mandar a Claude Code

## Pattern: Luis es disenador
Luis SIEMPRE tiene la ultima palabra en lo visual. Si algo no se ve como el quiere, el diseno de Luis es la verdad, no lo que el codigo genero. Ajustar hasta que coincida.
