"""Mide /app/tablero en WebKit a 390 y 1440 y guarda capturas.

No es un test bonito: es la prueba de que a 390 px cabe. Mide desborde
horizontal, textos por debajo de 12 px (con el culpable), y controles con menos
de 44 px de alto — y deja la captura para MIRARLA.

Uso:  python3 scripts/medir-tablero.py <BASE> <TOKEN_OPERADOR> <etiqueta>
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/")
TOKEN = sys.argv[2]
ETQ = sys.argv[3] if len(sys.argv) > 3 else "tablero"
RUTA = sys.argv[4] if len(sys.argv) > 4 else "/app/tablero"
OUT = "/root/vulcano-audit/vforge-rescate"
os.makedirs(OUT, exist_ok=True)

MEDIDA = """() => {
  const W = document.documentElement.clientWidth;
  const chicos = {};
  for (const e of document.querySelectorAll('body *')) {
    if (e.childElementCount !== 0) continue;
    const t = (e.innerText || '').trim();
    if (t.length < 3) continue;
    const s = getComputedStyle(e);
    const px = parseFloat(s.fontSize);
    if (px < 12) {
      const k = e.tagName.toLowerCase() + ' @' + s.fontSize + ' :: ' + t.slice(0, 40);
      chicos[k] = (chicos[k] || 0) + 1;
    }
  }
  const fuera = [];
  if (document.documentElement.scrollWidth > W + 1) {
    for (const e of document.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.right > W + 1) {
        fuera.push(e.tagName.toLowerCase() + '.' +
          String(e.className || '').slice(0, 50) + ' right=' + Math.round(r.right));
        if (fuera.length > 6) break;
      }
    }
  }
  const chicosControles = [];
  for (const e of document.querySelectorAll('button, a[href], input, select')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.height < 44) {
      chicosControles.push(Math.round(r.height) + 'px :: ' +
        (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40));
    }
  }
  return {
    desborde: document.documentElement.scrollWidth - W,
    culpables: fuera,
    chicos_total: Object.values(chicos).reduce((a, b) => a + b, 0),
    chicos: Object.entries(chicos).slice(0, 10),
    controles_chicos: chicosControles.slice(0, 12),
    controles_total: document.querySelectorAll('button, a[href]').length,
    texto: (document.querySelector('main') || document.body).innerText.slice(0, 900),
  };
}"""

res = {}
with sync_playwright() as p:
    b = p.webkit.launch()
    for vista, (w, h, mob) in {"390": (390, 844, True), "1440": (1440, 900, False)}.items():
        ctx = b.new_context(
            viewport={"width": w, "height": h},
            is_mobile=mob,
            has_touch=mob,
            extra_http_headers={"Authorization": f"Bearer {TOKEN}"},
        )
        pg = ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text[:140]) if m.type == "error" else None)
        pg.goto(f"{BASE}/index.html", wait_until="domcontentloaded", timeout=60000)
        try:
            pg.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass
        pg.wait_for_timeout(6000)  # el tablero pide el estado al servidor
        d = pg.evaluate(MEDIDA)
        d["consola"] = errs[:5]
        cap = f"{OUT}/{ETQ}-{vista}.png"
        pg.screenshot(path=cap, full_page=True)
        d["cap"] = cap
        res[vista] = d
        ctx.close()
    b.close()

json.dump(res, open(f"{OUT}/med-{ETQ}.json", "w"), ensure_ascii=False, indent=1)
for v, d in res.items():
    print(f"\n=== {v} px ===")
    print(f"  desborde horizontal : {d['desborde']} px")
    if d["culpables"]:
        print("  culpables           :", *d["culpables"][:4], sep="\n    ")
    print(f"  textos < 12 px      : {d['chicos_total']}")
    for k, n in d["chicos"][:5]:
        print(f"    {n}x {k}")
    print(f"  controles < 44 px   : {len(d['controles_chicos'])} de {d['controles_total']}")
    for c in d["controles_chicos"][:6]:
        print(f"    {c}")
    print(f"  errores de consola  : {len(d['consola'])} {d['consola'][:2]}")
    print(f"  captura             : {d['cap']}")
print("\n--- texto a 390 (primeras lineas) ---")
print(res["390"]["texto"][:500])
