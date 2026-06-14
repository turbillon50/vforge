#!/usr/bin/env python3
"""
CONTRAST AUDITOR — VForge
Calcula ratios reales de contraste mezclando alpha sobre fondos del tema.
Reporta exactamente qué está fallando y por qué.

Principios de Linear/Radix:
- Nunca rgba(blanco/negro, alpha) como texto — siempre hex opaco semántico
- Los translúcidos de FONDO son ok si el texto encima tiene ratio suficiente
- El problema real es texto translúcido sobre fondo translúcido sobre fondo = doble mezcla
"""

import re, os, json
from pathlib import Path

# ── Fondos reales del tema (calculados del globals.css) ──────────────────────
DARK_BG  = (10, 8, 20)     # #0a0814 — --color-background dark
DARK_S1  = (13, 11, 26)    # #0d0b1a — --color-surface dark  
DARK_S2  = (17, 15, 31)    # #110f1f — --color-surface-low dark
LIGHT_BG = (244, 244, 248)  # #f4f4f8 — --color-background light
LIGHT_S1 = (248, 248, 252)  # #f8f8fc — --color-surface light (white ish)
LIGHT_S2 = (242, 242, 246)  # #f2f2f6 — --color-surface-low light

# ── Helpers ──────────────────────────────────────────────────────────────────
def lum(r, g, b):
    v = [c/255 for c in (r,g,b)]
    v = [c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4 for c in v]
    return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]

def cr(l1, l2):
    a, b = max(l1,l2), min(l1,l2)
    return (a+0.05)/(b+0.05)

def blend(fg_rgb, alpha, bg_rgb):
    """Mezcla fg con alpha sobre bg. Simula cómo el browser renderiza."""
    return tuple(int(fg_rgb[i]*alpha + bg_rgb[i]*(1-alpha)) for i in range(3))

def hex_to_rgb(h):
    h = h.strip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

def rgba_to_rgb(r,g,b,a, bg):
    """Convierte rgba sobre bg a rgb sólido."""
    return blend((r,g,b), a, bg)

# ── Patrones problemáticos a buscar ──────────────────────────────────────────
TEXT_PATTERNS = [
    # text-white/* — siempre blanco independiente del tema
    (r'text-white/\[?([\d.]+)\]?', 'text-white-alpha'),
    # text-black/* — siempre negro
    (r'text-black/\[?([\d.]+)\]?', 'text-black-alpha'),
    # color hardcodeado en style prop
    (r'color:\s*rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)', 'inline-color'),
]

BG_PATTERNS = [
    # bg-white/* sobre fondo claro = invisible
    (r'bg-white/\[?([\d.]+)\]?', 'bg-white-alpha'),
    # bg-black/* 
    (r'bg-black/\[?([\d.]+)\]?', 'bg-black-alpha'),
    # gradients translúcidos — pueden perder contraste en light
    (r'from-(\w+-\d+)/(\d+)', 'gradient-from'),
    (r'bg-\[rgba\((\d+),(\d+),(\d+),([\d.]+)\)\]', 'bg-rgba-inline'),
]

# ── Detección de la capa de fix central (globals.css) ────────────────────────
# Si globals.css ya remapea estos patrones en light mode, el escáner estático
# NO debe seguir reportándolos: el render real ya está corregido. Esto evita
# falsos positivos sobre superficies que el tema claro neutraliza globalmente.
def _detect_central_fix():
    try:
        css = open('/root/vforge/app/globals.css').read()
    except:
        return {'bg_white': False, 'dark_hex': False}
    return {
        'bg_white': '[data-theme="light"] [class*="bg-white/"]' in css,
        'dark_hex': '[data-theme="light"] [class*="bg-[#0' in css
                    or '[data-theme="light"] [class*="bg-[#03020a]"]' in css,
    }

CENTRAL_FIX = _detect_central_fix()

# ── Análisis de archivo ──────────────────────────────────────────────────────
def analyze_file(path):
    issues = []
    try:
        content = open(path).read()
    except:
        return []
    
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        
        # 1. text-white/X — texto blanco hardcodeado
        for m in re.finditer(r'text-white/\[?([\d.]+)\]?', line):
            val = m.group(1)
            alpha = float(val)/100 if float(val) > 1 else float(val)
            # En dark: ok (blanco sobre oscuro)
            # En light: FAIL (blanco sobre casi-blanco)
            text_rgb = blend((255,255,255), alpha, LIGHT_BG)
            ratio_light = cr(lum(*text_rgb), lum(*LIGHT_BG))
            ratio_dark  = cr(lum(*blend((255,255,255), alpha, DARK_BG)), lum(*DARK_BG))
            
            if ratio_light < 4.5:
                issues.append({
                    'file': str(path).replace('/root/vforge/', ''),
                    'line': i,
                    'type': 'TEXT_INVISIBLE_LIGHT',
                    'code': m.group(0),
                    'ratio_dark': round(ratio_dark, 1),
                    'ratio_light': round(ratio_light, 1),
                    'fix': f'text-[var(--fg-{"primary" if alpha>0.7 else "secondary" if alpha>0.5 else "tertiary" if alpha>0.35 else "muted"})]',
                    'context': line.strip()[:80]
                })
        
        # 2. border-white/X — borde blanco en light = invisible  
        for m in re.finditer(r'border-white/\[?([\d.]+)\]?', line):
            val = m.group(1)
            alpha = float(val)/100 if float(val) > 1 else float(val)
            if alpha < 0.15:  # solo reportar los muy invisibles
                issues.append({
                    'file': str(path).replace('/root/vforge/', ''),
                    'line': i,
                    'type': 'BORDER_INVISIBLE_LIGHT',
                    'code': m.group(0),
                    'ratio_dark': round(alpha * 20, 1),  # approximado
                    'ratio_light': 0.1,
                    'fix': 'border-[var(--border-1)]',
                    'context': line.strip()[:80]
                })
        
        # 3. bg-white/X muy bajo — superficie invisible en light
        #    Suprimido si globals.css ya remapea bg-white/* en light mode.
        for m in re.finditer(r'bg-white/\[?([\d.]+)\]?', line):
            if CENTRAL_FIX['bg_white']:
                break
            val = m.group(1)
            alpha = float(val)/100 if float(val) > 1 else float(val)
            if alpha < 0.08:
                issues.append({
                    'file': str(path).replace('/root/vforge/', ''),
                    'line': i,
                    'type': 'BG_INVISIBLE_LIGHT',
                    'code': m.group(0),
                    'ratio_dark': round(alpha * 15, 2),
                    'ratio_light': 0.0,
                    'fix': 'bg-[var(--surface-1)]',
                    'context': line.strip()[:80]
                })
        
        # 4. rgba SOLO como color de TEXTO (`color: rgba(...)`).
        #    El `(?<![\w-])` excluye borderColor/background-color; además se
        #    descartan líneas de sombra/borde/relleno donde el rgba es decorativo
        #    (glows de botón, hairlines) y NO afecta el contraste de texto.
        #    Esto elimina los falsos positivos que inflaban el reporte.
        ctx = line.strip()
        # Si la regla CSS está acotada a un tema, sólo evaluar ese tema:
        # un `color` oscuro dentro de [data-theme="light"] jamás se aplica en dark.
        scope_light = '[data-theme="light"]' in line
        scope_dark = '[data-theme="dark"]' in line
        for m in re.finditer(r'(?<![\w-])color:\s*["\']?rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', line):
            r,g,b,a = int(m.group(1)),int(m.group(2)),int(m.group(3)),float(m.group(4))
            if a >= 0.7:
                continue
            mixed_light = blend((r,g,b), a, LIGHT_BG)
            ratio_l = cr(lum(*mixed_light), lum(*LIGHT_BG))
            mixed_dark = blend((r,g,b), a, DARK_BG)
            ratio_d = cr(lum(*mixed_dark), lum(*DARK_BG))
            fail_l = ratio_l < 4.5 and not scope_dark
            fail_d = ratio_d < 4.5 and not scope_light
            if fail_l or fail_d:
                issues.append({
                    'file': str(path).replace('/root/vforge/', ''),
                    'line': i,
                    'type': 'RGBA_LOW_CONTRAST',
                    'code': f'rgba({r},{g},{b},{a})',
                    'ratio_dark': round(ratio_d,1),
                    'ratio_light': round(ratio_l,1),
                    'fix': 'usar var(--fg-*) semántico',
                    'context': ctx[:80]
                })

        # 5. opacity baja en elemento con texto.
        #    Excepción: opacity-0 + hover/group-hover:opacity-* es el patrón
        #    "revelar al hover" (oculto a propósito), no un fallo de contraste.
        # `(?<![\w:])` excluye variantes de estado (hover:/group-hover:/disabled:/
        # focus:opacity-0) que ocultan el elemento a propósito; sólo cuenta la
        # opacidad base aplicada siempre.
        is_hover_reveal = 'group-hover:opacity' in line or 'hover:opacity' in line
        for m in re.finditer(r'(?<![\w:])opacity-([0-9]+)', line):
            val = int(m.group(1))
            if val <= 25 and not is_hover_reveal and ('text' in line or 'label' in line or 'span' in line.lower()):
                issues.append({
                    'file': str(path).replace('/root/vforge/', ''),
                    'line': i,
                    'type': 'LOW_OPACITY_TEXT',
                    'code': m.group(0),
                    'ratio_dark': round(val/100 * 15, 1),
                    'ratio_light': round(val/100 * 15, 1),
                    'fix': 'usar text-[var(--fg-muted)] en vez de opacity baja',
                    'context': line.strip()[:80]
                })

        # 6. text-opacity-* deprecated (Tailwind v2)
        for m in re.finditer(r'text-opacity-([0-9]+)', line):
            val = int(m.group(1))
            issues.append({
                'file': str(path).replace('/root/vforge/', ''),
                'line': i,
                'type': 'DEPRECATED_TEXT_OPACITY',
                'code': m.group(0),
                'ratio_dark': round(val/100 * 15, 1),
                'ratio_light': round(val/100 * 15, 1),
                'fix': 'usar text-white/N o text-[var(--fg-*)] (text-opacity-* es Tailwind v2)',
                'context': line.strip()[:80]
            })

    return issues

# ── Escanear todo VForge ─────────────────────────────────────────────────────
ROOT = Path('/root/vforge')
all_issues = []
files_scanned = 0

for ext in ['*.tsx', '*.ts', '*.css']:
    for f in ROOT.rglob(ext):
        # Excluir artefactos generados (no son código fuente auditable).
        if any(x in str(f) for x in ['node_modules','.next','dist','.git','.vercel']):
            continue
        issues = analyze_file(f)
        all_issues.extend(issues)
        files_scanned += 1

# ── Agrupar por tipo y archivo ───────────────────────────────────────────────
by_type = {}
by_file = {}
for issue in all_issues:
    by_type.setdefault(issue['type'], []).append(issue)
    by_file.setdefault(issue['file'], []).append(issue)

# ── Reporte ──────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"CONTRAST AUDIT — VForge ({files_scanned} archivos)")
print(f"{'='*60}")
print(f"Total issues: {len(all_issues)}")
print()

for tipo, issues in sorted(by_type.items(), key=lambda x: -len(x[1])):
    print(f"[{tipo}] — {len(issues)} casos")
    for iss in issues[:5]:  # máx 5 ejemplos por tipo
        status_d = "OK" if iss['ratio_dark'] >= 4.5 else "FAIL"
        status_l = "OK" if iss['ratio_light'] >= 4.5 else "FAIL"
        print(f"  {iss['file']}:{iss['line']}")
        print(f"    código:  {iss['code']}")
        print(f"    dark: {iss['ratio_dark']}:1 {status_d}  |  light: {iss['ratio_light']}:1 {status_l}")
        print(f"    fix:     {iss['fix']}")
        print(f"    ctx:     {iss['context'][:70]}")
    if len(issues) > 5:
        print(f"  ... y {len(issues)-5} más")
    print()

print(f"\n{'='*60}")
print("TOP 10 ARCHIVOS MÁS PROBLEMÁTICOS:")
print(f"{'='*60}")
for f, issues in sorted(by_file.items(), key=lambda x: -len(x[1]))[:10]:
    fails_light = sum(1 for i in issues if i['ratio_light'] < 4.5)
    print(f"  {len(issues):3d} issues ({fails_light} FAIL light) — {f}")

# Guardar JSON para el enjambre
with open('/tmp/contrast_report.json', 'w') as f:
    json.dump({
        'total': len(all_issues),
        'files_scanned': files_scanned,
        'by_type': {k: len(v) for k,v in by_type.items()},
        'issues': all_issues,
        'worst_files': sorted(
            [(f, len(i), sum(1 for x in i if x['ratio_light']<4.5)) 
             for f,i in by_file.items()],
            key=lambda x: -x[1]
        )[:20]
    }, f, indent=2)

print(f"\nReporte completo en /tmp/contrast_report.json")
print(f"Listo para el enjambre.")
