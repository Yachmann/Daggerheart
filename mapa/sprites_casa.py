"""Sprites de interior, oficio, masmorra e rito. Mesmo traco de sprites.py: contorno escuro, luz vinda do canto
superior esquerdo, desenho em torno do centro (cx, cy). O motor cuida de rotacao, posicao e sombra.
Cada modulo exporta DESENHOS (funcoes), TAMANHOS (tipo -> funcao(p) -> (largura, altura) em quadrados),
LUZES (tipo -> lista ou funcao(p) -> lista de (dx, dy, cor, raio, intensidade))."""
import math

from PIL import Image, ImageDraw

W_ = lambda n, k: max(1, int(round(n * k)))
ESC = lambda c, f=0.45: tuple(int(v * f) for v in c[:3])
CLA = lambda c, a=40: tuple(min(255, int(v) + a) for v in c[:3])


def _sobre(d, fn):
    """Desenha com mistura de transparencia: fn recebe um ImageDraw numa camada temporaria composta no sprite."""
    im = d._image
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(lay))
    im.alpha_composite(lay)


# ---------- mobilia e oficio ----------
def d_estante(d, cx, cy, S, k, rnd, p):
    w, h = p.get("larg", 2) * S, 0.8 * S
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=W_(5, k), fill=(108, 72, 42, 255), outline=(40, 26, 14, 255), width=W_(4, k))
    d.rectangle([x0 + 6 * k, y0 + 6 * k, x0 + w - 6 * k, y0 + h - 6 * k], fill=(50, 32, 20, 255))
    cores = [(150, 50, 48), (54, 84, 140), (60, 120, 72), (176, 140, 60), (110, 60, 110), (150, 110, 70), (84, 84, 94)]
    x, fim = x0 + 8 * k, x0 + w - 8 * k
    while x < fim - 6 * k:
        bw = rnd.uniform(.07, .15) * S
        if rnd.random() < .12:
            x += bw
            continue
        bh = rnd.uniform(.38, .56) * S
        c = rnd.choice(cores)
        d.rectangle([x, y0 + h - 8 * k - bh, min(x + bw, fim), y0 + h - 8 * k], fill=c + (255,), outline=ESC(c) + (255,), width=W_(2, k))
        x += bw
    d.line([x0 + 5 * k, y0 + 4 * k, x0 + w - 5 * k, y0 + 4 * k], fill=(255, 235, 200, 70), width=W_(2, k))


def d_balcao(d, cx, cy, S, k, rnd, p):
    w, h = p.get("larg", 3) * S, p.get("alt", 0.9) * S
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(7, k), fill=(92, 62, 36, 255), outline=(36, 24, 14, 255), width=W_(4, k))
    d.rounded_rectangle([cx - w / 2 + 7 * k, cy - h / 2 + 7 * k, cx + w / 2 - 7 * k, cy + h / 2 - 5 * k], radius=W_(5, k), fill=(146, 104, 62, 255), outline=(70, 46, 26, 255), width=W_(2, k))
    n = max(2, int(w / (0.5 * S)))
    for j in range(1, n):
        x = cx - w / 2 + 7 * k + (w - 14 * k) * j / n
        d.line([x, cy - h / 2 + 9 * k, x, cy + h / 2 - 7 * k], fill=(96, 66, 38, 110), width=W_(2, k))
    d.line([cx - w / 2 + 10 * k, cy - h / 2 + 10 * k, cx + w / 2 - 10 * k, cy - h / 2 + 10 * k], fill=(255, 235, 200, 80), width=W_(2, k))
    for _ in range(max(2, int(w / S))):
        x = cx + rnd.uniform(-.42, .42) * (w - 0.4 * S)
        r = 0.1 * S
        d.ellipse([x - r, cy - r * .4 - r, x + r, cy - r * .4 + r], fill=(176, 170, 160, 255), outline=(60, 56, 50, 255), width=W_(2, k))
        d.ellipse([x - r * .55, cy - r * .4 - r * .55, x + r * .55, cy - r * .4 + r * .55], fill=(212, 160, 60, 255))


def d_lareira(d, cx, cy, S, k, rnd, p):
    w, h = 2.2 * S, 1.0 * S
    x0, y0 = cx - w / 2, cy - h / 2
    d.rectangle([x0, y0, x0 + w, y0 + h], fill=(120, 116, 110, 255), outline=(40, 38, 36, 255), width=W_(4, k))
    for i in range(1, 6):
        d.line([x0 + w * i / 6, y0, x0 + w * i / 6, y0 + h * .42], fill=(70, 68, 64, 255), width=W_(2, k))
    d.line([x0, y0 + h * .2, x0 + w, y0 + h * .2], fill=(70, 68, 64, 255), width=W_(2, k))
    d.rectangle([x0 + w * .16, y0 + h * .36, x0 + w * .84, y0 + h - 5 * k], fill=(30, 18, 14, 255), outline=(20, 14, 12, 255), width=W_(3, k))
    for dx in (-.2, .05):
        d.line([cx + dx * w - .16 * S, cy + .3 * S, cx + dx * w + .16 * S, cy + .1 * S], fill=(66, 42, 24, 255), width=W_(9, k))
    for rr, c in ((.34, (255, 120, 30)), (.22, (255, 190, 80)), (.1, (255, 244, 190))):
        d.ellipse([cx - rr * S, cy + .2 * S - rr * S * .8, cx + rr * S, cy + .2 * S + rr * S * .8], fill=c + (255,))
    d.line([x0 + 4 * k, y0 + 4 * k, x0 + w - 4 * k, y0 + 4 * k], fill=(255, 255, 255, 60), width=W_(2, k))


def d_armario(d, cx, cy, S, k, rnd, p):
    w, h = 1.2 * S, 0.7 * S
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=W_(4, k), fill=(116, 80, 48, 255), outline=(40, 26, 14, 255), width=W_(4, k))
    d.line([cx, cy - h / 2 + 4 * k, cx, cy + h / 2 - 4 * k], fill=(60, 38, 22, 255), width=W_(3, k))
    for s in (-1, 1):
        d.rectangle([cx + s * w * .28 - w * .2, cy - h / 2 + 8 * k, cx + s * w * .28 + w * .2, cy + h / 2 - 8 * k], outline=(76, 50, 30, 255), width=W_(2, k))
        d.ellipse([cx + s * 7 * k - 3 * k, cy - 3 * k, cx + s * 7 * k + 3 * k, cy + 3 * k], fill=(214, 176, 64, 255))
    d.line([cx - w / 2 + 6 * k, cy - h / 2 + 5 * k, cx + w / 2 - 6 * k, cy - h / 2 + 5 * k], fill=(255, 235, 200, 60), width=W_(2, k))


def d_tapete(d, cx, cy, S, k, rnd, p):
    w, h = p.get("larg", 3) * S, p.get("alt", 2) * S
    c = tuple(p.get("cor") or (132, 40, 46))
    dk, lt = ESC(c, .55), CLA(c, 70)
    redondo = p.get("forma") == "redonda"
    box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
    if redondo:
        d.ellipse(box, fill=c + (255,), outline=ESC(c, .35) + (255,), width=W_(3, k))
        for f, col in ((.84, lt), (.7, dk), (.5, c), (.3, lt)):
            d.ellipse([cx - w / 2 * f, cy - h / 2 * f, cx + w / 2 * f, cy + h / 2 * f], outline=col + (255,), width=W_(4, k))
        d.ellipse([cx - w * .08, cy - h * .08, cx + w * .08, cy + h * .08], fill=lt + (255,))
        return
    for sx in (-1, 1):   # franjas
        for j in range(-int(h / (.16 * S)) // 2, int(h / (.16 * S)) // 2 + 1):
            y = cy + j * .16 * S
            d.line([cx + sx * w / 2, y, cx + sx * (w / 2 + .09 * S), y], fill=lt + (255,), width=W_(3, k))
    d.rounded_rectangle(box, radius=W_(4, k), fill=c + (255,), outline=ESC(c, .35) + (255,), width=W_(3, k))
    m = .12 * S
    d.rectangle([box[0] + m, box[1] + m, box[2] - m, box[3] - m], outline=lt + (255,), width=W_(4, k))
    m2 = .22 * S
    d.rectangle([box[0] + m2, box[1] + m2, box[2] - m2, box[3] - m2], fill=dk + (255,))
    rw, rh = (w / 2 - m2) * .8, (h / 2 - m2) * .8
    d.polygon([(cx, cy - rh), (cx + rw, cy), (cx, cy + rh), (cx - rw, cy)], fill=c + (255,), outline=lt + (255,))
    d.ellipse([cx - rh * .25, cy - rh * .25, cx + rh * .25, cy + rh * .25], fill=lt + (255,))


def d_estatua(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .55) * S
    d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=W_(6, k), fill=(132, 128, 122, 255), outline=(44, 42, 40, 255), width=W_(4, k))
    d.rounded_rectangle([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], radius=W_(4, k), fill=(112, 108, 102, 255), outline=(70, 68, 64, 255), width=W_(2, k))
    d.ellipse([cx - r * .66, cy - r * .3, cx + r * .66, cy + r * .5], fill=(176, 172, 166, 255), outline=(60, 58, 54, 255), width=W_(3, k))
    d.ellipse([cx - r * .26, cy - r * .32, cx + r * .26, cy + r * .2], fill=(196, 192, 186, 255), outline=(60, 58, 54, 255), width=W_(3, k))
    d.line([cx + r * .55, cy - r * .1, cx + r * .72, cy - r * .7], fill=(150, 146, 140, 255), width=W_(5, k))
    d.ellipse([cx - r * .5, cy - r * .22, cx - r * .12, cy + r * .02], fill=(236, 232, 226, 90))


def d_sarcofago(d, cx, cy, S, k, rnd, p):
    w, h = 1.15 * S, 2.25 * S
    x0, y0 = cx - w / 2, cy - h / 2
    aberto = bool(p.get("aberto"))
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=W_(10, k), fill=(122, 118, 112, 255), outline=(40, 38, 36, 255), width=W_(4, k))
    if aberto:
        d.rounded_rectangle([x0 + 9 * k, y0 + 9 * k, x0 + w - 9 * k, y0 + h - 9 * k], radius=W_(8, k), fill=(18, 14, 14, 255))
        tampa = [x0 + .34 * S, y0 + .5 * S, x0 + w + .22 * S, y0 + h - .1 * S]
        d.rounded_rectangle(tampa, radius=W_(10, k), fill=(138, 134, 128, 255), outline=(40, 38, 36, 255), width=W_(4, k))
        x0, y0, w, h = tampa[0], tampa[1], tampa[2] - tampa[0], tampa[3] - tampa[1]
    else:
        d.rounded_rectangle([x0 + 8 * k, y0 + 8 * k, x0 + w - 8 * k, y0 + h - 8 * k], radius=W_(8, k), fill=(138, 134, 128, 255), outline=(70, 68, 64, 255), width=W_(3, k))
    mx = x0 + w / 2
    d.ellipse([mx - w * .16, y0 + h * .12, mx + w * .16, y0 + h * .12 + w * .32], outline=(80, 78, 74, 255), width=W_(3, k))
    d.line([mx, y0 + h * .12 + w * .32, mx, y0 + h * .88], fill=(80, 78, 74, 255), width=W_(3, k))
    d.line([mx - w * .24, y0 + h * .42, mx + w * .24, y0 + h * .42], fill=(80, 78, 74, 255), width=W_(3, k))
    d.line([x0 + 10 * k, y0 + 10 * k, x0 + w - 12 * k, y0 + 10 * k], fill=(255, 255, 255, 60), width=W_(2, k))


def d_jaula(d, cx, cy, S, k, rnd, p):
    w = p.get("larg", 1.5) * S
    h = w
    x0, y0 = cx - w / 2, cy - h / 2
    d.rectangle([x0, y0, x0 + w, y0 + h], fill=(70, 56, 38, 255))
    for _ in range(12):
        x, y = rnd.uniform(x0 + 6 * k, x0 + w - 6 * k), rnd.uniform(y0 + 6 * k, y0 + h - 6 * k)
        d.line([x, y, x + rnd.uniform(-16, 16) * k, y + rnd.uniform(-6, 6) * k], fill=(168, 138, 70, 255), width=W_(2, k))
    n = 5
    for i in range(n + 1):
        t = i / n
        d.line([x0 + w * t, y0, x0 + w * t, y0 + h], fill=(54, 56, 64, 255), width=W_(5, k))
        d.line([x0, y0 + h * t, x0 + w, y0 + h * t], fill=(54, 56, 64, 255), width=W_(5, k))
        d.line([x0 + w * t - 1.5 * k, y0, x0 + w * t - 1.5 * k, y0 + h], fill=(132, 136, 148, 255), width=W_(1.5, k))
    d.rectangle([x0, y0, x0 + w, y0 + h], outline=(30, 30, 36, 255), width=W_(7, k))
    d.rectangle([x0 + 2 * k, y0 + 2 * k, x0 + w - 2 * k, y0 + h - 2 * k], outline=(120, 124, 136, 255), width=W_(2, k))
    for qx, qy in ((x0, y0), (x0 + w, y0), (x0, y0 + h), (x0 + w, y0 + h)):
        d.ellipse([qx - 6 * k, qy - 6 * k, qx + 6 * k, qy + 6 * k], fill=(40, 42, 48, 255), outline=(150, 154, 166, 255), width=W_(2, k))


def d_trono(d, cx, cy, S, k, rnd, p):
    c = tuple(p.get("cor") or (140, 30, 42))
    w = 1.1 * S
    x0, y0 = cx - w / 2, cy - w / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + .26 * S], radius=W_(6, k), fill=(120, 90, 36, 255), outline=(50, 36, 14, 255), width=W_(4, k))
    d.polygon([(cx - .12 * S, y0 + 3 * k), (cx, y0 - 3 * k), (cx + .12 * S, y0 + 3 * k)], fill=(214, 176, 64, 255), outline=(60, 44, 14, 255))
    for sx in (-1, 1):
        d.rounded_rectangle([cx + sx * .42 * S - .08 * S, y0 + .22 * S, cx + sx * .42 * S + .08 * S, y0 + w - 4 * k], radius=W_(4, k), fill=(120, 90, 36, 255), outline=(50, 36, 14, 255), width=W_(3, k))
    d.rounded_rectangle([x0 + .16 * S, y0 + .24 * S, x0 + w - .16 * S, y0 + w - 4 * k], radius=W_(8, k), fill=c + (255,), outline=ESC(c, .4) + (255,), width=W_(3, k))
    d.ellipse([cx - .2 * S, cy - .08 * S, cx + .2 * S, cy + .22 * S], fill=CLA(c, 40) + (255,))
    d.line([x0 + .2 * S, y0 + .3 * S, x0 + w - .22 * S, y0 + .3 * S], fill=(255, 255, 255, 70), width=W_(2, k))


def d_bigorna(d, cx, cy, S, k, rnd, p):
    w, h = .95 * S, .44 * S
    pts = [(cx - w / 2, cy - h * .35), (cx + w * .26, cy - h * .5), (cx + w / 2, cy - h * .5), (cx + w / 2, cy + h * .5),
           (cx + w * .22, cy + h * .5), (cx + w * .1, cy + h * .22), (cx - w * .05, cy + h * .22), (cx - w * .18, cy + h * .06),
           (cx - w / 2, cy + h * .1)]
    d.polygon(pts, fill=(78, 80, 90, 255), outline=(26, 26, 32, 255))
    d.rectangle([cx + w * .06, cy - h * .42, cx + w * .44, cy - h * .12], fill=(118, 120, 132, 255))
    d.line([cx - w * .46, cy - h * .28, cx + w * .2, cy - h * .42], fill=(190, 192, 204, 150), width=W_(2, k))


def d_forja(d, cx, cy, S, k, rnd, p):
    w = 1.8 * S
    x0, y0 = cx - w / 2, cy - w / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + w], radius=W_(8, k), fill=(112, 108, 102, 255), outline=(40, 38, 36, 255), width=W_(4, k))
    for i in range(1, 6):
        d.line([x0 + w * i / 6, y0 + 4 * k, x0 + w * i / 6, y0 + w - 4 * k], fill=(66, 64, 60, 255), width=W_(2, k))
        d.line([x0 + 4 * k, y0 + w * i / 6, x0 + w - 4 * k, y0 + w * i / 6], fill=(66, 64, 60, 255), width=W_(2, k))
    d.rectangle([x0 + .3 * S, y0 + .3 * S, x0 + w - .3 * S, y0 + w - .3 * S], fill=(34, 20, 16, 255), outline=(20, 14, 12, 255), width=W_(3, k))
    for _ in range(26):
        x, y = rnd.uniform(x0 + .38 * S, x0 + w - .38 * S), rnd.uniform(y0 + .38 * S, y0 + w - .38 * S)
        r = rnd.uniform(.05, .11) * S
        d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice([(255, 110, 30), (255, 160, 50), (200, 60, 20), (255, 210, 110)]) + (255,))
    d.ellipse([cx - .22 * S, cy - .22 * S, cx + .22 * S, cy + .22 * S], fill=(255, 226, 150, 255))
    d.rectangle([x0 + w * .86, y0 + w * .38, x0 + w * 1.0, y0 + w * .62], fill=(70, 50, 34, 255), outline=(30, 22, 14, 255), width=W_(2, k))


def d_caldeirao(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .6) * S
    c = tuple(p.get("cor") or (100, 192, 84))
    for sx in (-1, 1):
        d.ellipse([cx + sx * r * 1.05 - 5 * k, cy - 5 * k, cx + sx * r * 1.05 + 5 * k, cy + 5 * k], fill=(36, 36, 42, 255), outline=(16, 16, 20, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(44, 44, 52, 255), outline=(14, 14, 18, 255), width=W_(4, k))
    d.ellipse([cx - r * .82, cy - r * .82, cx + r * .82, cy + r * .82], fill=ESC(c, .55) + (255,), outline=(30, 30, 36, 255), width=W_(2, k))
    d.ellipse([cx - r * .66, cy - r * .66, cx + r * .66, cy + r * .66], fill=c + (255,))
    for _ in range(7):
        a, rr = rnd.uniform(0, 2 * math.pi), r * .5 * math.sqrt(rnd.random())
        x, y, br = cx + rr * math.cos(a), cy + rr * math.sin(a), rnd.uniform(.05, .11) * r * 2
        d.ellipse([x - br, y - br, x + br, y + br], fill=CLA(c, 70) + (255,), outline=ESC(c, .6) + (255,))
    d.arc([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], 200, 260, fill=(150, 150, 164, 200), width=W_(3, k))


def d_braseiro(d, cx, cy, S, k, rnd, p):
    r = .45 * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(48, 48, 56, 255), outline=(16, 16, 20, 255), width=W_(4, k))
    d.ellipse([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], fill=(40, 20, 14, 255))
    for _ in range(14):
        a, rr = rnd.uniform(0, 2 * math.pi), r * .7 * math.sqrt(rnd.random())
        x, y, br = cx + rr * math.cos(a), cy + rr * math.sin(a), rnd.uniform(.08, .16) * r
        d.ellipse([x - br, y - br, x + br, y + br], fill=rnd.choice([(255, 110, 30), (210, 60, 20), (255, 170, 60)]) + (255,))
    d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], fill=(255, 220, 130, 255))
    d.ellipse([cx - r * .12, cy - r * .12, cx + r * .12, cy + r * .12], fill=(255, 248, 210, 255))
    d.arc([cx - r * .92, cy - r * .92, cx + r * .92, cy + r * .92], 195, 255, fill=(170, 170, 184, 200), width=W_(3, k))


def d_candelabro(d, cx, cy, S, k, rnd, p):
    r = .3 * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(176, 140, 56, 255), outline=(70, 52, 16, 255), width=W_(3, k))
    d.ellipse([cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55], fill=(130, 100, 36, 255), outline=(70, 52, 16, 255), width=W_(2, k))
    for a in (-90, 30, 150):
        x, y = cx + r * .7 * math.cos(math.radians(a)), cy + r * .7 * math.sin(math.radians(a))
        d.ellipse([x - .07 * S, y - .07 * S, x + .07 * S, y + .07 * S], fill=(240, 232, 204, 255), outline=(120, 110, 80, 255), width=W_(2, k))
        d.ellipse([x - .035 * S, y - .035 * S, x + .035 * S, y + .035 * S], fill=(255, 200, 90, 255))


def d_circulo_ritual(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 2) * S
    c = tuple(p.get("cor") or (150, 72, 214))
    cl = CLA(c, 80)

    def brilho(g):
        for i, a in enumerate((26, 40, 60)):
            q = r * (1.08 - i * .06)
            g.ellipse([cx - q, cy - q, cx + q, cy + q], fill=c + (a,))
    _sobre(d, brilho)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=cl + (255,), width=W_(5, k))
    d.ellipse([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], outline=c + (255,), width=W_(3, k))
    for i in range(24):
        a = 2 * math.pi * i / 24
        d.line([cx + r * .9 * math.cos(a), cy + r * .9 * math.sin(a), cx + r * .98 * math.cos(a), cy + r * .98 * math.sin(a)], fill=cl + (255,), width=W_(3, k))
    n = 5
    est = [(cx + r * .86 * math.cos(-math.pi / 2 + 2 * math.pi * i * 2 / n), cy + r * .86 * math.sin(-math.pi / 2 + 2 * math.pi * i * 2 / n)) for i in range(n + 1)]
    d.line(est, fill=cl + (255,), width=W_(4, k), joint="curve")
    d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], outline=c + (255,), width=W_(3, k))
    d.ellipse([cx - r * .06, cy - r * .06, cx + r * .06, cy + r * .06], fill=cl + (255,))


def d_armadilha(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .6) * S
    estilo = p.get("estilo", "espetos")
    if estilo == "placa":
        d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=W_(5, k), fill=(120, 116, 110, 255), outline=(40, 38, 36, 255), width=W_(4, k))
        d.rectangle([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], fill=(104, 100, 94, 255), outline=(60, 58, 54, 255), width=W_(2, k))
        d.line([cx - r * .4, cy - r * .4, cx + r * .4, cy + r * .4], fill=(60, 58, 54, 255), width=W_(3, k))
        d.line([cx - r * .4, cy + r * .4, cx + r * .4, cy - r * .4], fill=(60, 58, 54, 255), width=W_(3, k))
        d.line([cx - r * .9, cy + r * .2, cx - r * .2, cy + r * .9], fill=(40, 38, 36, 200), width=W_(2, k))
        return
    fundo = estilo == "fosso"
    if fundo:
        d.ellipse([cx - r * 1.1, cy - r * 1.1, cx + r * 1.1, cy + r * 1.1], fill=(100, 96, 90, 255), outline=(36, 34, 34, 255), width=W_(4, k))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(18, 14, 14, 255), outline=(36, 34, 34, 255), width=W_(3, k))
    n = 9 if fundo else 12
    for i in range(n):
        a = 2 * math.pi * i / n + rnd.uniform(-.2, .2)
        rr = r * (rnd.uniform(.12, .62) if fundo else rnd.uniform(.2, .8))
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        s = .11 * S
        d.polygon([(x - s * .55, y + s * .5), (x, y - s * .9), (x + s * .55, y + s * .5)], fill=(176, 178, 190, 255), outline=(40, 40, 46, 255))


def d_alcapao(d, cx, cy, S, k, rnd, p):
    w = 1.05 * S
    x0, y0 = cx - w / 2, cy - w / 2
    d.rectangle([x0, y0, x0 + w, y0 + w], fill=(104, 72, 42, 255), outline=(40, 26, 14, 255), width=W_(5, k))
    for i in range(1, 4):
        d.line([x0 + 4 * k, y0 + w * i / 4, x0 + w - 4 * k, y0 + w * i / 4], fill=(60, 40, 24, 255), width=W_(2, k))
    for yy in (y0 + w * .2, y0 + w * .8):
        d.rectangle([x0 + 4 * k, yy - 4 * k, x0 + w * .28, yy + 4 * k], fill=(64, 64, 72, 255), outline=(26, 26, 30, 255), width=W_(2, k))
    d.ellipse([cx + w * .12, cy - 9 * k, cx + w * .12 + 18 * k, cy + 9 * k], outline=(96, 98, 108, 255), width=W_(4, k))
    d.line([x0 + 5 * k, y0 + 5 * k, x0 + w - 5 * k, y0 + 5 * k], fill=(255, 235, 200, 50), width=W_(2, k))


def d_barraca(d, cx, cy, S, k, rnd, p):
    """Banca de mercado: balcao na frente, toldo listrado cobrindo o fundo. Toldo para cima (norte) com rot=0."""
    w, h = p.get("larg", 2.4) * S, 2.0 * S
    c = tuple(p.get("cor") or (178, 52, 52))
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle([x0, y0 + h * .5, x0 + w, y0 + h], radius=W_(6, k), fill=(120, 84, 50, 255), outline=(44, 28, 16, 255), width=W_(4, k))
    d.rectangle([x0 + 6 * k, y0 + h * .56, x0 + w - 6 * k, y0 + h - 6 * k], fill=(150, 110, 68, 255), outline=(80, 54, 30, 255), width=W_(2, k))
    prod = [(214, 70, 50), (240, 190, 60), (110, 170, 70), (220, 130, 50), (170, 90, 150)]
    for _ in range(int(w / (.2 * S)) + 4):
        x, y = rnd.uniform(x0 + .2 * S, x0 + w - .2 * S), rnd.uniform(y0 + h * .62, y0 + h * .9)
        r = rnd.uniform(.05, .09) * S
        col = rnd.choice(prod)
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,), outline=ESC(col, .5) + (255,))
    n = max(4, int(w / (.3 * S)))
    for i in range(n):
        a, b = x0 + w * i / n, x0 + w * (i + 1) / n
        col = c if i % 2 == 0 else (236, 228, 208)
        d.rectangle([a, y0, b, y0 + h * .56], fill=col + (255,), outline=ESC(col, .55) + (255,), width=W_(2, k))
        d.pieslice([a, y0 + h * .56 - (b - a) / 2, b, y0 + h * .56 + (b - a) / 2], 0, 180, fill=col + (255,), outline=ESC(col, .55) + (255,), width=W_(2, k))
    d.line([x0 + 3 * k, y0 + 4 * k, x0 + w - 3 * k, y0 + 4 * k], fill=(255, 255, 255, 80), width=W_(2, k))
    for qx in (x0, x0 + w):
        d.ellipse([qx - 5 * k, y0 + h * .56 + 4 * k, qx + 5 * k, y0 + h * .56 + 14 * k], fill=(70, 48, 28, 255))


def d_tumulo(d, cx, cy, S, k, rnd, p):
    w, h = .95 * S, 1.9 * S
    d.ellipse([cx - w / 2, cy - h * .36, cx + w / 2, cy + h / 2], fill=(98, 76, 52, 255), outline=(48, 36, 24, 255), width=W_(3, k))
    d.ellipse([cx - w * .34, cy - h * .2, cx + w * .3, cy + h * .36], fill=(116, 92, 64, 255))
    for _ in range(9):
        x, y = cx + rnd.uniform(-.34, .34) * w, cy + rnd.uniform(-.2, .42) * h
        r = rnd.uniform(.03, .06) * S
        d.ellipse([x - r, y - r, x + r, y + r], fill=(70, 54, 38, 255))
    d.rounded_rectangle([cx - w * .3, cy - h / 2, cx + w * .3, cy - h / 2 + .3 * S], radius=W_(7, k), fill=(138, 136, 130, 255), outline=(46, 44, 42, 255), width=W_(3, k))
    d.line([cx, cy - h / 2 + 5 * k, cx, cy - h / 2 + .26 * S], fill=(80, 78, 74, 255), width=W_(3, k))
    d.line([cx - 5 * k, cy - h / 2 + 10 * k, cx + 5 * k, cy - h / 2 + 10 * k], fill=(80, 78, 74, 255), width=W_(3, k))
    d.line([cx - w * .24, cy - h / 2 + 4 * k, cx + w * .12, cy - h / 2 + 4 * k], fill=(255, 255, 255, 60), width=W_(2, k))


def d_fonte(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.2) * S

    def oct(rr):
        return [(cx + rr * math.cos(math.pi / 8 + i * math.pi / 4), cy + rr * math.sin(math.pi / 8 + i * math.pi / 4)) for i in range(8)]
    d.polygon(oct(r), fill=(134, 130, 124, 255), outline=(44, 42, 40, 255))
    d.polygon(oct(r * .9), fill=(112, 108, 102, 255), outline=(70, 68, 64, 255))
    d.polygon(oct(r * .76), fill=(52, 112, 142, 255), outline=(36, 72, 92, 255))
    for f in (.62, .46, .3):
        d.ellipse([cx - r * f, cy - r * f, cx + r * f, cy + r * f], outline=(150, 206, 226, 160), width=W_(2, k))
    d.ellipse([cx - r * .22, cy - r * .22, cx + r * .22, cy + r * .22], fill=(146, 142, 136, 255), outline=(44, 42, 40, 255), width=W_(3, k))
    d.ellipse([cx - r * .1, cy - r * .1, cx + r * .1, cy + r * .1], fill=(190, 226, 240, 255))
    d.arc([cx - r * .72, cy - r * .72, cx + r * .72, cy + r * .72], 200, 250, fill=(220, 240, 248, 200), width=W_(3, k))


def d_mancha(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .8) * S
    pal = {"sangue": ((126, 16, 20), (84, 8, 12), None), "queimado": ((24, 20, 18), (14, 12, 10), (90, 80, 70)),
           "oleo": ((26, 22, 38), (16, 12, 26), (110, 84, 150)), "limo": ((92, 146, 62), (60, 106, 42), (170, 214, 112))}
    c, ce, brilho = pal[p.get("estilo", "sangue")]

    def blob(g):
        for esc_, col, a in ((1.0, ce, 215), (.78, c, 225)):
            n = 14
            pts = []
            for i in range(n):
                ang = 2 * math.pi * i / n
                rr = r * esc_ * (rnd.uniform(.62, 1.0) if i % 2 else rnd.uniform(.85, 1.1))
                pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
            g.polygon(pts, fill=col + (a,))
        for _ in range(7):
            ang, rr = rnd.uniform(0, 2 * math.pi), r * rnd.uniform(1.0, 1.5)
            x, y, br = cx + rr * math.cos(ang), cy + rr * math.sin(ang), rnd.uniform(.03, .08) * S
            g.ellipse([x - br, y - br, x + br, y + br], fill=ce + (215,))
        if brilho:
            g.ellipse([cx - r * .5, cy - r * .5, cx - r * .05, cy - r * .1], fill=brilho + (110,))
    _sobre(d, blob)


def d_teia(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.0) * S

    def fios(g):
        n = 8
        for i in range(n):
            a = 2 * math.pi * i / n
            g.line([cx, cy, cx + r * math.cos(a), cy + r * math.sin(a)], fill=(236, 236, 242, 170), width=W_(2, k))
        for f in (.3, .55, .8):
            pts = []
            for i in range(n + 1):
                a = 2 * math.pi * i / n
                rr = r * f * (1 - .12 * math.sin(i * 1.7))
                pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
            g.line(pts, fill=(236, 236, 242, 150), width=W_(1.5, k))
    _sobre(d, fios)


def d_vaso(d, cx, cy, S, k, rnd, p):
    r = .3 * S
    for sx in (-1, 1):
        d.ellipse([cx + sx * r * .95 - 4 * k, cy - 4 * k, cx + sx * r * .95 + 4 * k, cy + 4 * k], fill=(150, 84, 54, 255), outline=(60, 30, 18, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(172, 96, 62, 255), outline=(64, 32, 18, 255), width=W_(3, k))
    d.ellipse([cx - r * .66, cy - r * .66, cx + r * .66, cy + r * .66], fill=(38, 22, 16, 255), outline=(110, 58, 36, 255), width=W_(2, k))
    d.ellipse([cx - r * .85, cy - r * .85, cx - r * .25, cy - r * .3], fill=(255, 220, 190, 70))


DESENHOS = {
    "estante": d_estante, "balcao": d_balcao, "lareira": d_lareira, "armario": d_armario, "tapete": d_tapete,
    "estatua": d_estatua, "sarcofago": d_sarcofago, "jaula": d_jaula, "trono": d_trono, "bigorna": d_bigorna,
    "forja": d_forja, "caldeirao": d_caldeirao, "braseiro": d_braseiro, "candelabro": d_candelabro,
    "circulo_ritual": d_circulo_ritual, "armadilha": d_armadilha, "alcapao": d_alcapao, "barraca": d_barraca,
    "tumulo": d_tumulo, "fonte": d_fonte, "mancha": d_mancha, "teia": d_teia, "vaso": d_vaso,
}

_g = lambda p, n, v: p.get(n, v)
TAMANHOS = {
    "estante": lambda p: (_g(p, "larg", 2), .85), "balcao": lambda p: (_g(p, "larg", 3), _g(p, "alt", .9)),
    "lareira": lambda p: (2.3, 1.1), "armario": lambda p: (1.3, .8),
    "tapete": lambda p: (_g(p, "larg", 3) + .4, _g(p, "alt", 2) + .1),
    "estatua": lambda p: (2.2 * _g(p, "r", .55), 2.2 * _g(p, "r", .55)), "sarcofago": lambda p: (1.6, 2.4),
    "jaula": lambda p: (_g(p, "larg", 1.5) + .3, _g(p, "larg", 1.5) + .3), "trono": lambda p: (1.2, 1.2),
    "bigorna": lambda p: (1.0, .6), "forja": lambda p: (1.9, 1.9),
    "caldeirao": lambda p: (2.5 * _g(p, "r", .6), 2.2 * _g(p, "r", .6)), "braseiro": lambda p: (1.0, 1.0),
    "candelabro": lambda p: (.8, .8), "circulo_ritual": lambda p: (2.3 * _g(p, "r", 2), 2.3 * _g(p, "r", 2)),
    "armadilha": lambda p: (2.5 * _g(p, "r", .6), 2.5 * _g(p, "r", .6)), "alcapao": lambda p: (1.2, 1.2),
    "barraca": lambda p: (_g(p, "larg", 2.4) + .2, 2.1), "tumulo": lambda p: (1.0, 2.0),
    "fonte": lambda p: (2.2 * _g(p, "r", 1.2), 2.2 * _g(p, "r", 1.2)),
    "mancha": lambda p: (3.2 * _g(p, "r", .8), 3.2 * _g(p, "r", .8)), "teia": lambda p: (2.2 * _g(p, "r", 1), 2.2 * _g(p, "r", 1)),
    "vaso": lambda p: (.8, .8),
}


LUZES = {
    "lareira": [(0, .2, (255, 170, 80), 4.2, 1.0)],
    "forja": [(0, 0, (255, 140, 60), 3.6, .95)],
    "braseiro": [(0, 0, (255, 160, 70), 3.8, .95)],
    "candelabro": [(0, 0, (255, 200, 120), 2.6, .7)],
    "caldeirao": lambda p: [(0, 0, tuple(p.get("cor") or (100, 192, 84)), 1.9, .45)],
    "circulo_ritual": lambda p: [(0, 0, tuple(p.get("cor") or (150, 72, 214)), 1.5 * p.get("r", 2), .55)],
}
