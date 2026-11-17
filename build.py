"""Builds the standalone index.html (all assets inlined, works offline from file://).
Usage: python3 build.py            (requires Pillow only for the background motion mask)"""
import base64, io, json
from pathlib import Path
D = Path(__file__).resolve().parent
A = D / 'assets'
b64 = lambda data, mime: f'data:{mime};base64,' + base64.b64encode(data).decode()
f64 = lambda rel, mime: b64((A / rel).read_bytes(), mime)

# ---------- fonts (SIL OFL 1.1, see assets/fonts/LICENSES) ----------
FONTS = [  # family, weight(s), file, format
    ('Cinzel Decorative', '700', 'CinzelDecorative-Bold.ttf', 'truetype'),
    ('Cinzel Decorative', '900', 'CinzelDecorative-Black.ttf', 'truetype'),
    ('Alegreya SC', '800', 'alegreyasc-800.woff', 'woff'),
    ('Alegreya SC', '900', 'alegreyasc-900.woff', 'woff'),
    ('Oswald', '200 700', 'oswald-var.woff', 'woff'),
    ('Montserrat', '100 900', 'montserrat-var.woff', 'woff'),
]
mime = {'truetype': 'font/ttf', 'woff': 'font/woff'}
fonts = '\n'.join(
    f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:block;src:url({f64('fonts/' + fn, mime[fmt])}) format('{fmt}')}}"
    for fam, w, fn, fmt in FONTS)

# ---------- images ----------
css = (D / 'src/style.css').read_text(encoding='utf-8')
css = (css.replace('__BG__', f64('bg.webp', 'image/webp'))
          .replace('__FRAME__', f64('frame.webp', 'image/webp'))
          .replace('__SUNW__', f64('fx/sun_wheel.webp', 'image/webp'))
          .replace('__SUND__', f64('fx/sun_disc.webp', 'image/webp'))
          .replace('__LOGO__', f64('logo.webp', 'image/webp')))

# ---------- symbols: display box per kind (stage px); tiles by width, others fit in box ----------
# Symbol images are NOT put into CSS custom properties (huge var() values make every style recalc slow).
# They go into the script as base64 and become short blob: URLs at startup (see SYMIMG in src/game.js).
# Each symbol also gets a pre-rendered vertical motion-blur sprite, used while reels spin
# (replaces the live SVG blur filter, which was re-run every frame and was the main cause of lag).
from PIL import Image, ImageFilter
M = json.loads((A / 'sym/meta.json').read_text())
BOX = {'tile': (140, 140), 'let': (118, 104), 'mid': (132, 134), 'S': (138, 138)}
kind = lambda n: 'tile' if n in ('H1', 'H2', 'H3', 'H4', 'W') else 'S' if n == 'S' else 'mid' if n in ('M1', 'M2') else 'let'
BLUR_SD, BLUR_PAD = 9.0, 0.15   # blur sigma in stage px (as the old filter), vertical padding (fraction of height)

def blur_sprite(path, k):
    im = Image.open(path).convert('RGBA').convert('RGBa')  # premultiplied -> no dark fringes
    w, h = im.size; pad = round(h * BLUR_PAD)
    c = Image.new('RGBa', (w, h + 2 * pad)); c.paste(im, (0, pad))
    sx = 8  # anisotropic gaussian: stretch X, blur, shrink back -> (almost) vertical-only blur
    c = c.resize((w * sx, c.height), Image.BILINEAR).filter(ImageFilter.GaussianBlur(BLUR_SD / k)).resize((w // 2, c.height // 2), Image.LANCZOS)
    buf = io.BytesIO(); c.convert('RGBA').save(buf, 'WEBP', quality=72, method=6); return buf.getvalue()

symimg, rules = {}, []
for n, m in M.items():
    if n.startswith('X'):
        continue  # old x2/x3 overlay images are no longer used (multiplier is a CSS medallion)
    x0, y0, x1, y1 = m['a']; aw, ah = x1 - x0, y1 - y0; bw, bh = BOX[kind(n)]
    k = bw / aw if kind(n) == 'tile' else min(bw / aw, bh / ah)
    symimg[n] = [base64.b64encode((A / 'sym' / (n + '.webp')).read_bytes()).decode(),
                 base64.b64encode(blur_sprite(A / 'sym' / (n + '.webp'), k)).decode()]
    cx, cy = (x0 + x1) / 2 * k, (y0 + y1) / 2 * k
    rules.append(f".s-{n}{{background-image:var(--{n});--img:var(--{n});width:{m['w']*k:.1f}px;height:{m['h']*k:.1f}px;margin:{-cy:.1f}px 0 0 {-cx:.1f}px}}"
                 f".mb .s-{n}{{background-image:var(--{n}b)}}")
css = css.replace('/*SYMCSS*/', '\n'.join(rules) + f"\n.mb .si{{transform:scaleY({1 + 2 * BLUR_PAD:.2f})}}")

# ---------- background motion mask (R foliage, G water, B grass) -> small webp ----------
buf = io.BytesIO(); Image.open(A / 'fx/bg_mask.png').convert('RGB').save(buf, 'WEBP', quality=82, method=6)
mask = b64(buf.getvalue(), 'image/webp')

# ---------- scripts ----------
math = (D / 'math.js').read_text().replace("if(typeof module!='undefined')module.exports={PAYS,strips,lines,rng};", '')
js = (D / 'src/game.js').read_text(encoding='utf-8')
js = (js.replace('/*MATH*/', math)
        .replace('/*SYMIMG*/', 'const SYMIMG=' + json.dumps(symimg, separators=(',', ':')) + ';')
        .replace('/*AUDIO*/', (D / 'src/audio.js').read_text(encoding='utf-8'))
        .replace('/*BG*/', (D / 'src/bg.js').read_text(encoding='utf-8').replace('__MASK__', mask)))
gs = (A / 'gsap.min.js').read_text()
body = (D / 'src/body.html').read_text(encoding='utf-8')
html = f'''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#060a1e"><title>Pride of Leo · Squled Studios</title><style>{fonts}\n{css}</style></head><body>{body}<script>{gs}</script><script>{js}</script></body></html>'''
(D / 'index.html').write_text(html, encoding='utf-8')
print(len(html) // 1024, 'KB')
