"""Desenho dos objetos. Cada funcao desenha em torno do centro (cx, cy) de um canvas local;
o motor cuida de rotacao, posicao e sombra. Mantenha o traco: contorno escuro, luz vinda do canto superior esquerdo."""
import math
import numpy as np
from PIL import Image, ImageDraw
from .ruido import RES

W_ = lambda n, k: max(1, int(round(n * k)))


# ---------- pedra / entulho ----------
def d_pedra(d, cx, cy, S, k, rnd, p, r=None):
    r = (r if r is not None else p.get("r", 0.5)) * S
    n = rnd.randint(7, 10)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n + rnd.uniform(-.2, .2)
        rr = r * rnd.uniform(.72, 1.05)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    g = rnd.randint(96, 128)
    d.polygon(pts, fill=(g, g - 4, g - 8, 255), outline=(40, 38, 36, 255))
    hp = [(cx + (x - cx) * .62 - r * .12, cy + (y - cy) * .62 - r * .14) for x, y in pts]
    d.polygon(hp, fill=(min(255, g + 34), min(255, g + 30), min(255, g + 24), 255))
    for _ in range(3):
        a = rnd.uniform(0, 2 * math.pi)
        d.line([cx, cy, cx + r * .8 * math.cos(a), cy + r * .8 * math.sin(a)], fill=(50, 48, 46, 120), width=W_(2, k))


def d_entulho(d, cx, cy, S, k, rnd, p):
    R = p.get("r", 1.0)
    for _ in range(int(6 + 7 * R)):
        a, rr = rnd.uniform(0, 2 * math.pi), R * math.sqrt(rnd.random())
        d_pedra(d, cx + rr * S * math.cos(a), cy + rr * S * math.sin(a), S, k, rnd, p, r=rnd.uniform(.10, .26))


# ---------- vegetacao ----------
def _copa(d, cx, cy, S, k, rnd, r, dark, light):
    r *= S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=dark + (255,), outline=(16, 34, 20, 255))
    blobs = []
    for _ in range(int(40 + 40 * r / S)):
        a = rnd.uniform(0, 2 * math.pi)
        rr = r * math.sqrt(rnd.random()) * 0.84
        blobs.append((rr, a))
    blobs.sort(reverse=True)
    for rr, a in blobs:
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        br = r * rnd.uniform(.2, .36)
        lx = ((x - cx) * -0.6 + (y - cy) * -0.8) / r
        tq = min(1.0, max(0.0, 0.5 + 0.45 * lx - 0.35 * rr / r + rnd.uniform(-.12, .12)))
        col = tuple(int(a_ + (b_ - a_) * tq) for a_, b_ in zip(dark, light))
        d.ellipse([x - br, y - br, x + br, y + br], fill=col + (255,), outline=(20, 40, 24, 255))
    for _ in range(int(50 * r / S)):
        a = rnd.uniform(0, 2 * math.pi)
        rr = r * math.sqrt(rnd.random()) * 0.7
        x, y = cx + rr * math.cos(a) - r * .1, cy + rr * math.sin(a) - r * .1
        d.ellipse([x - 3 * k, y - 3 * k, x + 3 * k, y + 3 * k], fill=(150, 184, 96, 170))


def d_arvore(d, cx, cy, S, k, rnd, p):
    _copa(d, cx, cy, S, k, rnd, p.get("r", 1.8), *p["_copa"])


def d_arbusto(d, cx, cy, S, k, rnd, p):
    _copa(d, cx, cy, S, k, rnd, p.get("r", 0.6), *p["_arbusto"])


# ---------- carga e mobilia ----------
def d_caixote(d, cx, cy, S, k, rnd, p):
    h = p.get("escala", 0.9) * S / 2
    d.rectangle([cx - h, cy - h, cx + h, cy + h], fill=(130, 94, 56, 255), outline=(46, 30, 18, 255), width=W_(4, k))
    a = 9 * k
    d.rectangle([cx - h + a, cy - h + a, cx + h - a, cy + h - a], outline=(86, 58, 34, 255), width=W_(4, k))
    d.line([cx - h + a, cy - h + a, cx + h - a, cy + h - a], fill=(86, 58, 34, 255), width=W_(4, k))
    d.line([cx - h + a, cy + h - a, cx + h - a, cy - h + a], fill=(86, 58, 34, 255), width=W_(4, k))
    d.line([cx - h + 3 * k, cy - h + 3 * k, cx + h - 3 * k, cy - h + 3 * k], fill=(190, 150, 100, 120), width=W_(2, k))


def d_barril(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 0.4) * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(112, 78, 46, 255), outline=(44, 28, 16, 255), width=W_(4, k))
    d.ellipse([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], outline=(60, 60, 66, 255), width=W_(5, k))
    d.ellipse([cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5], fill=(140, 102, 62, 255), outline=(70, 48, 28, 255), width=W_(3, k))


def d_tronco(d, cx, cy, S, k, rnd, p):
    """Tronco horizontal centrado; o motor gira ate a direcao pedida."""
    L, w = p["_len"] * S, p.get("largura", 0.5) * S
    x0, x1 = cx - L / 2, cx + L / 2
    d.line([x0, cy, x1, cy], fill=(52, 34, 20, 255), width=int(w + 6 * k))
    d.line([x0, cy, x1, cy], fill=(112, 76, 44, 255), width=int(w))
    d.line([x0, cy - w * .14, x1, cy - w * .14], fill=(146, 104, 62, 255), width=int(w * .42))
    for _ in range(16):
        px, oy = x0 + L * rnd.random(), rnd.uniform(-w * .4, w * .4)
        d.line([px, cy + oy, px + rnd.uniform(10, 26) * k, cy + oy + rnd.uniform(-2, 2)], fill=(60, 40, 24, 150), width=W_(2, k))
    for x in (x0, x1):
        d.ellipse([x - w * .22, cy - w / 2, x + w * .22, cy + w / 2], fill=(186, 152, 104, 255), outline=(70, 48, 28, 255), width=W_(3, k))
        d.ellipse([x - w * .1, cy - w * .28, x + w * .1, cy + w * .28], outline=(130, 96, 60, 255), width=W_(2, k))


def d_carroca(d, cx, cy, S, k, rnd, p):
    """Carroca 3,75 x 2 quadrados com varal; centro no meio da caixa."""
    ox, oy = cx - 1.875 * S, cy - 1.0 * S
    X = lambda v: ox + v * S
    Y = lambda v: oy + v * S
    d.rectangle([X(2.85), Y(.92), X(3.75), Y(1.08)], fill=(84, 56, 32, 255), outline=(36, 24, 14, 255), width=W_(3, k))
    for rx in (1.25, 2.35):
        for ry in (-.04, 1.86):
            d.rounded_rectangle([X(rx - .46), Y(ry), X(rx + .46), Y(ry + .2)], radius=W_(6, k), fill=(46, 32, 20, 255), outline=(20, 14, 8, 255), width=W_(2, k))
            for j in range(-3, 4):
                d.line([X(rx + j * .13), Y(ry) + 2 * k, X(rx + j * .13), Y(ry + .2) - 2 * k], fill=(86, 62, 38, 255), width=W_(2, k))
    d.rectangle([X(.08), Y(.12), X(2.92), Y(1.88)], fill=(112, 78, 46, 255), outline=(40, 26, 14, 255), width=W_(4, k))
    for j in range(1, 8):
        d.line([X(.08), Y(.12 + j * .22), X(2.92), Y(.12 + j * .22)], fill=(70, 46, 26, 160), width=W_(2, k))
    d.rectangle([X(2.35), Y(.42), X(2.9), Y(1.58)], fill=(88, 58, 34, 255), outline=(36, 24, 14, 255), width=W_(3, k))
    cx0, cy0, cx1, cy1 = X(.28), Y(.22), X(2.3), Y(1.78)
    im = d._image
    cover = Image.new("RGBA", im.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(cover)
    yc, half = (cy0 + cy1) / 2, (cy1 - cy0) / 2
    for yy in range(int(cy0), int(cy1) + 1):
        f = 1 - 0.32 * abs(yy - yc) / half
        cd.line([cx0, yy, cx1, yy], fill=(int(214 * f), int(200 * f), int(168 * f), 255), width=1)
    for j in range(1, 5):
        xx = cx0 + (cx1 - cx0) * j / 5
        cd.line([xx, cy0, xx, cy1], fill=(120, 106, 80, 170), width=W_(4, k))
        cd.line([xx + 4 * k, cy0, xx + 4 * k, cy1], fill=(255, 250, 230, 60), width=W_(2, k))
    cm = Image.new("L", im.size, 0)
    ImageDraw.Draw(cm).rounded_rectangle([cx0, cy0, cx1, cy1], radius=W_(26, k), fill=255)
    cover.putalpha(Image.fromarray(np.minimum(np.asarray(cover.getchannel("A")), np.asarray(cm))))
    ImageDraw.Draw(cover).rounded_rectangle([cx0, cy0, cx1, cy1], radius=W_(26, k), outline=(70, 58, 40, 255), width=W_(4, k))
    im.alpha_composite(cover)


def d_mesa(d, cx, cy, S, k, rnd, p):
    w, h = p.get("larg", 2) * S, p.get("alt", 1) * S
    if p.get("forma") == "redonda":
        r = min(w, h) / 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(126, 88, 52, 255), outline=(50, 32, 18, 255), width=W_(4, k))
        d.ellipse([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], outline=(86, 58, 34, 200), width=W_(3, k))
        d.ellipse([cx - r * .55, cy - r * .62, cx - r * .1, cy - r * .2], fill=(255, 235, 200, 36))
        return
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(8, k), fill=(126, 88, 52, 255), outline=(50, 32, 18, 255), width=W_(4, k))
    n = max(2, int(h / (0.25 * S)))
    for j in range(1, n):
        yy = cy - h / 2 + h * j / n
        d.line([cx - w / 2 + 3 * k, yy, cx + w / 2 - 3 * k, yy], fill=(80, 52, 30, 170), width=W_(2, k))
    d.line([cx - w / 2 + 6 * k, cy - h / 2 + 5 * k, cx + w / 2 - 6 * k, cy - h / 2 + 5 * k], fill=(255, 235, 200, 60), width=W_(2, k))


def d_cadeira(d, cx, cy, S, k, rnd, p):
    s = 0.27 * S
    d.rounded_rectangle([cx - s, cy - s + .08 * S, cx + s, cy + s], radius=W_(7, k), fill=(142, 102, 62, 255), outline=(50, 32, 18, 255), width=W_(3, k))
    d.rectangle([cx - s, cy - s - .02 * S, cx + s, cy - s + .1 * S], fill=(92, 62, 36, 255), outline=(40, 26, 14, 255), width=W_(3, k))


def d_banco(d, cx, cy, S, k, rnd, p):
    w, h = p.get("comp", 1.6) * S, 0.38 * S
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(6, k), fill=(132, 94, 56, 255), outline=(50, 32, 18, 255), width=W_(3, k))
    d.line([cx - w / 2 + 4 * k, cy, cx + w / 2 - 4 * k, cy], fill=(80, 52, 30, 160), width=W_(2, k))
    d.line([cx - w / 2 + 6 * k, cy - h / 2 + 4 * k, cx + w / 2 - 6 * k, cy - h / 2 + 4 * k], fill=(255, 235, 200, 55), width=W_(2, k))


def d_cama(d, cx, cy, S, k, rnd, p):
    w, h = 1.1 * S, 2.1 * S
    cob = tuple(p.get("cor") or (120, 40, 40))
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(8, k), fill=(96, 64, 38, 255), outline=(40, 26, 14, 255), width=W_(4, k))
    d.rounded_rectangle([cx - w / 2 + 7 * k, cy - h / 2 + 7 * k, cx + w / 2 - 7 * k, cy + h / 2 - 7 * k], radius=W_(6, k), fill=(222, 212, 190, 255))
    d.rounded_rectangle([cx - w * .36, cy - h / 2 + 12 * k, cx + w * .36, cy - h / 2 + 0.5 * S], radius=W_(10, k), fill=(246, 240, 226, 255), outline=(150, 140, 120, 255), width=W_(2, k))
    d.rounded_rectangle([cx - w / 2 + 7 * k, cy - h * .02, cx + w / 2 - 7 * k, cy + h / 2 - 7 * k], radius=W_(6, k), fill=cob + (255,), outline=tuple(int(c * .5) for c in cob) + (255,), width=W_(3, k))
    d.line([cx - w / 2 + 12 * k, cy + h * .04, cx + w / 2 - 12 * k, cy + h * .04], fill=(255, 255, 255, 60), width=W_(3, k))


def d_bau(d, cx, cy, S, k, rnd, p):
    w, h = 1.0 * S, 0.65 * S
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(7, k), fill=(122, 84, 48, 255), outline=(44, 28, 16, 255), width=W_(4, k))
    for fx in (-.3, .3):
        d.rectangle([cx + fx * w - 5 * k, cy - h / 2, cx + fx * w + 5 * k, cy + h / 2], fill=(74, 74, 82, 255), outline=(30, 30, 34, 255), width=W_(2, k))
    d.rectangle([cx - 7 * k, cy - 9 * k, cx + 7 * k, cy + 9 * k], fill=(214, 176, 64, 255), outline=(80, 60, 16, 255), width=W_(2, k))
    d.line([cx - w / 2 + 6 * k, cy - h / 2 + 5 * k, cx + w / 2 - 6 * k, cy - h / 2 + 5 * k], fill=(255, 235, 200, 60), width=W_(2, k))


def d_pilar(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 0.4) * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(138, 134, 128, 255), outline=(44, 42, 40, 255), width=W_(4, k))
    d.ellipse([cx - r * .72, cy - r * .72, cx + r * .72, cy + r * .72], fill=(112, 108, 102, 255), outline=(70, 68, 64, 255), width=W_(2, k))
    d.ellipse([cx - r * .55, cy - r * .6, cx - r * .1, cy - r * .2], fill=(210, 206, 198, 90))


def d_altar(d, cx, cy, S, k, rnd, p):
    w, h = 2.0 * S, 1.0 * S
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(6, k), fill=(120, 118, 122, 255), outline=(40, 40, 44, 255), width=W_(4, k))
    d.rectangle([cx - w * .18, cy - h / 2, cx + w * .18, cy + h / 2], fill=(110, 30, 40, 255), outline=(60, 14, 20, 255), width=W_(2, k))
    for fx in (-.36, .36):
        x = cx + fx * w
        d.ellipse([x - 7 * k, cy - 7 * k, x + 7 * k, cy + 7 * k], fill=(240, 232, 204, 255), outline=(120, 110, 80, 255), width=W_(2, k))
        d.ellipse([x - 4 * k, cy - 4 * k, x + 4 * k, cy + 4 * k], fill=(255, 200, 90, 255))


def d_ossos(d, cx, cy, S, k, rnd, p):
    for _ in range(5):
        a = rnd.uniform(0, math.pi)
        x, y = cx + rnd.uniform(-.5, .5) * S, cy + rnd.uniform(-.4, .4) * S
        L = rnd.uniform(.2, .34) * S
        dx, dy = math.cos(a) * L, math.sin(a) * L
        d.line([x - dx, y - dy, x + dx, y + dy], fill=(228, 220, 198, 255), width=W_(5, k))
        for sx in (-1, 1):
            ex, ey = x + sx * dx, y + sx * dy
            d.ellipse([ex - 4 * k, ey - 4 * k, ex + 4 * k, ey + 4 * k], fill=(240, 232, 212, 255), outline=(120, 110, 90, 255))
    x, y = cx + rnd.uniform(-.2, .2) * S, cy + rnd.uniform(-.2, .2) * S
    r = .17 * S
    d.ellipse([x - r, y - r, x + r, y + r], fill=(238, 232, 214, 255), outline=(110, 100, 80, 255), width=W_(2, k))
    for ex in (-.4, .4):
        d.ellipse([x + ex * r - r * .22, y - r * .15 - r * .22, x + ex * r + r * .22, y - r * .15 + r * .22], fill=(30, 26, 22, 255))


def d_pano(d, cx, cy, S, k, rnd, p):
    c = tuple(p.get("cor") or (168, 36, 36))
    e = tuple(int(v * .45) for v in c)
    s = S
    d.polygon([(cx - .15 * s, cy - .1 * s), (cx + .15 * s, cy - .05 * s), (cx + .07 * s, cy + .12 * s), (cx - .11 * s, cy + .06 * s)], fill=c + (255,), outline=e + (255,))


def d_tenda(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.4) * S
    n = 12
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        c = (214, 200, 168) if i % 2 == 0 else (190, 174, 140)
        d.polygon([(cx, cy), (cx + r * math.cos(a0), cy + r * math.sin(a0)), (cx + r * math.cos(a1), cy + r * math.sin(a1))], fill=c + (255,), outline=(90, 76, 52, 255))
    d.ellipse([cx - 5 * k, cy - 5 * k, cx + 5 * k, cy + 5 * k], fill=(84, 60, 36, 255))


def d_poco(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 0.8) * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(128, 124, 118, 255), outline=(40, 38, 36, 255), width=W_(4, k))
    n = 16
    for i in range(n):
        a = 2 * math.pi * i / n
        x, y = cx + r * .84 * math.cos(a), cy + r * .84 * math.sin(a)
        d.ellipse([x - r * .12, y - r * .12, x + r * .12, y + r * .12], outline=(60, 58, 54, 255), width=W_(2, k))
    ri = r * .64
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(22, 48, 64, 255), outline=(50, 48, 46, 255), width=W_(3, k))
    d.arc([cx - ri * .7, cy - ri * .7, cx + ri * .7, cy + ri * .7], 200, 260, fill=(120, 170, 190, 160), width=W_(3, k))


def d_fogueira(d, cx, cy, S, k, rnd, p):
    r = .55 * S
    for i in range(10):
        a = 2 * math.pi * i / 10
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        g = rnd.randint(96, 128)
        d.ellipse([x - .14 * S, y - .12 * S, x + .14 * S, y + .12 * S], fill=(g, g - 4, g - 8, 255), outline=(40, 38, 36, 255), width=W_(2, k))
    d.ellipse([cx - .42 * S, cy - .42 * S, cx + .42 * S, cy + .42 * S], fill=(56, 24, 16, 255))
    for a in (20, 80, 140):
        t = math.radians(a)
        d.line([cx - .36 * S * math.cos(t), cy - .36 * S * math.sin(t), cx + .36 * S * math.cos(t), cy + .36 * S * math.sin(t)], fill=(40, 26, 18, 255), width=W_(10, k))
    d.ellipse([cx - .26 * S, cy - .26 * S, cx + .26 * S, cy + .26 * S], fill=(255, 140, 40, 255))
    d.ellipse([cx - .16 * S, cy - .16 * S, cx + .16 * S, cy + .16 * S], fill=(255, 206, 100, 255))
    d.ellipse([cx - .07 * S, cy - .07 * S, cx + .07 * S, cy + .07 * S], fill=(255, 246, 200, 255))


def d_tocha(d, cx, cy, S, k, rnd, p):
    r = .2 * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(70, 56, 44, 255), outline=(30, 24, 18, 255), width=W_(3, k))
    d.ellipse([cx - .13 * S, cy - .13 * S, cx + .13 * S, cy + .13 * S], fill=(255, 150, 44, 255))
    d.ellipse([cx - .07 * S, cy - .07 * S, cx + .07 * S, cy + .07 * S], fill=(255, 236, 160, 255))


def d_lampiao(d, cx, cy, S, k, rnd, p):
    d.ellipse([cx - 7 * k, cy - 7 * k, cx + 7 * k, cy + 7 * k], fill=(255, 226, 150, 255), outline=(90, 60, 20, 255), width=W_(3, k))


def d_escada(d, cx, cy, S, k, rnd, p):
    w, h, dire = p["_w"] * S, p["_h"] * S, p["direcao"]
    x0, y0 = cx - w / 2, cy - h / 2
    vertical = dire in ("n", "s")
    n = max(3, int((h if vertical else w) / (0.33 * S)))
    for i in range(n):
        t = i / (n - 1)
        if dire in ("s", "o"):
            t = 1 - t   # a ponta clara e para onde sobe
        v = int(86 + 78 * t)
        if vertical:
            a, b = y0 + h * i / n, y0 + h * (i + 1) / n
            d.rectangle([x0, a, x0 + w, b], fill=(v, v - 3, v - 8, 255), outline=(40, 38, 36, 255), width=W_(2, k))
            d.line([x0 + 3 * k, a + 3 * k, x0 + w - 3 * k, a + 3 * k], fill=(255, 255, 255, 50), width=W_(2, k))
        else:
            a, b = x0 + w * i / n, x0 + w * (i + 1) / n
            d.rectangle([a, y0, b, y0 + h], fill=(v, v - 3, v - 8, 255), outline=(40, 38, 36, 255), width=W_(2, k))
            d.line([a + 3 * k, y0 + 3 * k, a + 3 * k, y0 + h - 3 * k], fill=(255, 255, 255, 50), width=W_(2, k))
    d.rectangle([x0, y0, x0 + w, y0 + h], outline=(30, 28, 28, 255), width=W_(4, k))


# tipo -> (funcao, largura, altura em quadrados para o canvas, luzes [(dx, dy, cor, raio, intensidade)])
def _tam(tipo, p):
    g = p.get
    return {
        "pedra": (2 * g("r", .5), 2 * g("r", .5)), "entulho": (2 * g("r", 1) + .8, 2 * g("r", 1) + .8),
        "arvore": (2 * g("r", 1.8), 2 * g("r", 1.8)), "arbusto": (2 * g("r", .6), 2 * g("r", .6)),
        "caixote": (g("escala", .9), g("escala", .9)), "barril": (2 * g("r", .4), 2 * g("r", .4)),
        "carroca": (3.9, 2.2), "mesa": (g("larg", 2), g("alt", 1)), "cadeira": (.7, .7),
        "banco": (g("comp", 1.6), .5), "cama": (1.2, 2.2), "bau": (1.1, .75), "pilar": (2 * g("r", .4), 2 * g("r", .4)),
        "altar": (2.1, 1.1), "ossos": (1.6, 1.4), "pano": (.7, .5), "tenda": (2 * g("r", 1.4), 2 * g("r", 1.4)),
        "poco": (2 * g("r", .8), 2 * g("r", .8)), "fogueira": (1.4, 1.4), "tocha": (.5, .5), "lampiao": (.4, .4),
        "tronco": (p.get("_len", 3) + .6, g("largura", .5) + .4),
    }[tipo]


DESENHOS = {
    "pedra": d_pedra, "entulho": d_entulho, "arvore": d_arvore, "arbusto": d_arbusto, "caixote": d_caixote,
    "barril": d_barril, "tronco": d_tronco, "carroca": d_carroca, "mesa": d_mesa, "cadeira": d_cadeira,
    "banco": d_banco, "cama": d_cama, "bau": d_bau, "pilar": d_pilar, "altar": d_altar, "ossos": d_ossos,
    "pano": d_pano, "tenda": d_tenda, "poco": d_poco, "fogueira": d_fogueira, "tocha": d_tocha,
    "lampiao": d_lampiao, "escada": d_escada,
}
LUZES = {
    "fogueira": [(0, 0, (255, 170, 80), 4.0, 1.0)],
    "tocha": [(0, 0, (255, 176, 90), 3.5, 0.9)],
    "lampiao": [(0, 0, (255, 196, 108), 2.0, 0.55)],
    "altar": [(-.72, 0, (255, 190, 100), 2.2, .6), (.72, 0, (255, 190, 100), 2.2, .6)],
}


def construir(tipo, p, S, rnd):
    """Devolve (imagem RGBA rotacionada, centro no mesmo referencial, luzes [(dx_px, dy_px, cor, raio, inten)])."""
    k = S / 100.0
    if tipo == "escada":
        w, h = abs(p["x1"] - p["x0"]), abs(p["y1"] - p["y0"])
        p = dict(p, _w=w, _h=h)
        tw, th = w, h
    else:
        tw, th = _tam(tipo, p)
    pad = 0.35
    pw, ph = int((tw + 2 * pad) * S) + 2, int((th + 2 * pad) * S) + 2
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d._image = im
    DESENHOS[tipo](d, pw / 2, ph / 2, S, k, rnd, p)
    rot = p.get("rot") or 0
    luces = []
    for dx, dy, cor, raio, inten in LUZES.get(tipo, []):
        a = math.radians(rot)
        luces.append((dx * S * math.cos(a) - dy * S * math.sin(a), dx * S * math.sin(a) + dy * S * math.cos(a), cor, raio, inten))
    if rot:
        im = im.rotate(-rot, resample=RES.BICUBIC, expand=True)
    return im, luces
