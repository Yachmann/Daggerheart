"""Marcadores ao vivo da mesa (fogo, destrocos, agua...) desenhados no MESMO traco dos mapas: vistos de cima,
contorno escuro, luz vinda do canto superior esquerdo, sombra projetada nos objetos solidos.
Os que ja existem no gerador (destrocos, sangue, ossos, armadilha, teia, mancha) reusam os mesmos sprites.
Cada tipo gera 3 variantes (sementes diferentes) em img/marcadores/<tipo>-<n>.png, 256x256, fundo transparente.
O quadrado "nominal" de 1x1 ocupa o miolo; o PNG inteiro cobre 1,6 x 1,6 quadrados (sobra para chama, fumaca e brilho).
Uso:  python -m mapa.marcadores"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import sprites, sprites_casa
from .camadas import nova, sombra
from .ruido import RES

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "img" / "marcadores"
PX = 256            # tamanho final do PNG
ESCALA = 1.6        # quadrados cobertos pelo PNG
SS = 2              # supersampling
S = int(PX * SS / ESCALA)   # px por quadrado durante o desenho
K = S / 100.0
W_ = lambda n: max(1, int(round(n * K)))
VARIANTES = 3


def _brilho(W, cor, raio, forca):
    """Brilho suave (luz de fogo/vela) para ficar por baixo do sprite."""
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    d = np.hypot(xx - W / 2, yy - W / 2) / (raio * W)
    a = np.clip(1 - d, 0, 1) ** 2 * forca * 255
    im = np.zeros((W, W, 4), np.uint8)
    im[..., 0], im[..., 1], im[..., 2], im[..., 3] = cor[0], cor[1], cor[2], a.astype(np.uint8)
    return Image.fromarray(im, "RGBA")


def _poligono_irregular(cx, cy, r, n, rnd, minimo=.6, maximo=1.05):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n + rnd.uniform(-.12, .12)
        rr = r * rnd.uniform(minimo, maximo)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


# ---------- desenhos novos (mesmo traco dos sprites do gerador) ----------
def d_fogo(d, cx, cy, S, k, rnd, p):
    # brasas e fuligem no chao
    sprites_casa._sobre(d, lambda g: g.polygon(_poligono_irregular(cx, cy, .56 * S, 13, rnd, .75, 1.0), fill=(22, 16, 14, 150)))
    for _ in range(6):
        a, r = rnd.uniform(0, 2 * math.pi), rnd.uniform(.3, .5) * S
        x, y, b = cx + r * math.cos(a), cy + r * math.sin(a), rnd.uniform(.02, .04) * S
        d.ellipse([x - b, y - b, x + b, y + b], fill=(255, 150, 50, 255))
    # chamas: contorno com pontas afiladas e vales arredondados, em camadas cada vez mais claras
    def lingua(r, n, cor, contorno, dx=0.0, dy=0.0):
        fase = rnd.uniform(0, math.pi)
        pts = []
        for i in range(120):
            t = 2 * math.pi * i / 120
            f = 1 - abs(math.sin(n * t / 2 + fase))
            rr = r * (.58 + .5 * f ** 1.5) * (1 + .06 * math.sin(3 * t + fase))
            pts.append((cx + dx + rr * math.cos(t), cy + dy + rr * math.sin(t)))
        d.polygon(pts, fill=cor + (255,), outline=contorno + (255,), width=W_(3))
    lingua(.44 * S, 7, (214, 58, 24), (104, 22, 10))
    lingua(.34 * S, 6, (255, 122, 34), (176, 52, 16), -.01 * S, -.015 * S)
    lingua(.23 * S, 5, (255, 190, 72), (220, 110, 30), -.02 * S, -.03 * S)
    lingua(.12 * S, 4, (255, 244, 196), (255, 214, 120), -.02 * S, -.04 * S)


def d_fumaca(d, cx, cy, S, k, rnd, p):
    def nuvens(g):
        for r, al in ((.46, 150), (.36, 175), (.24, 195)):
            for _ in range(5):
                a, rr = rnd.uniform(0, 2 * math.pi), rnd.uniform(0, .26) * S
                x, y, b = cx + rr * math.cos(a), cy + rr * math.sin(a), r * S * rnd.uniform(.55, .85)
                t = int(96 + (.46 - r) * 260)
                g.ellipse([x - b, y - b, x + b, y + b], fill=(t, t + 2, t + 8, al), outline=(46, 46, 54, al))
        for _ in range(7):
            a, rr = rnd.uniform(0, 2 * math.pi), rnd.uniform(0, .3) * S
            x, y, b = cx + rr * math.cos(a) - .05 * S, cy + rr * math.sin(a) - .07 * S, rnd.uniform(.05, .1) * S
            g.ellipse([x - b, y - b, x + b, y + b], fill=(214, 216, 224, 120))
    sprites_casa._sobre(d, nuvens)


def d_agua(d, cx, cy, S, k, rnd, p):
    def poca(g):
        r = .5 * S
        for esc_, cor, al in ((1.0, (38, 84, 122), 225), (.82, (56, 120, 162), 230), (.6, (84, 152, 190), 215)):
            g.polygon(_poligono_irregular(cx, cy, r * esc_, 15, rnd, .7, 1.05), fill=cor + (al,))
        for _ in range(6):
            a, rr = rnd.uniform(0, 2 * math.pi), r * rnd.uniform(1.05, 1.5)
            x, y, b = cx + rr * math.cos(a), cy + rr * math.sin(a), rnd.uniform(.02, .06) * S
            g.ellipse([x - b, y - b, x + b, y + b], fill=(56, 120, 162, 215))
        g.arc([cx - r * .6, cy - r * .6, cx + r * .1, cy + r * .1], 190, 270, fill=(214, 240, 250, 200), width=W_(4))
        g.ellipse([cx - r * .42, cy - r * .36, cx - r * .24, cy - r * .22], fill=(236, 250, 255, 190))
    sprites_casa._sobre(d, poca)


def d_gelo(d, cx, cy, S, k, rnd, p):
    def geada(g):
        g.polygon(_poligono_irregular(cx, cy, .56 * S, 16, rnd, .75, 1.05), fill=(196, 226, 240, 120))
    sprites_casa._sobre(d, geada)
    cristais = [(0, 0, .3, rnd.uniform(0, 60))] + [(rnd.uniform(-.3, .3), rnd.uniform(-.3, .3), rnd.uniform(.14, .22), rnd.uniform(0, 60)) for _ in range(4)]
    for ox, oy, r, rot in sorted(cristais, key=lambda c: c[2]):
        x, y, rr = cx + ox * S, cy + oy * S, r * S
        pts = [(x + rr * math.cos(math.radians(rot + 60 * i)), y + rr * math.sin(math.radians(rot + 60 * i))) for i in range(6)]
        d.polygon(pts, fill=(176, 214, 236, 255), outline=(52, 96, 128, 255), width=W_(3))
        d.polygon([(x + (px - x) * .62 - rr * .08, y + (py - y) * .62 - rr * .1) for px, py in pts], fill=(222, 242, 252, 255))
        for i in range(0, 6, 2):
            d.line([x, y, pts[i][0], pts[i][1]], fill=(120, 170, 204, 200), width=W_(2))
        d.line([pts[4], pts[5]], fill=(255, 255, 255, 220), width=W_(3))


def d_corpo(d, cx, cy, S, k, rnd, p):
    pele, roupa, ec = (214, 176, 142), (84, 98, 128), (36, 28, 24, 255)
    ang = rnd.uniform(-12, 12)
    lay = Image.new("RGBA", d._image.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(lay)
    for sx in (-1, 1):  # pernas
        g.rounded_rectangle([cx + sx * .11 * S - .075 * S, cy + .04 * S, cx + sx * .11 * S + .075 * S, cy + .5 * S], radius=W_(8), fill=(58, 52, 60, 255), outline=ec, width=W_(3))
        g.ellipse([cx + sx * .11 * S - .08 * S, cy + .46 * S, cx + sx * .11 * S + .08 * S, cy + .58 * S], fill=(70, 50, 36, 255), outline=ec, width=W_(3))
    for sx in (-1, 1):  # bracos abertos
        g.line([cx + sx * .2 * S, cy - .18 * S, cx + sx * (.46 + rnd.uniform(0, .06)) * S, cy + rnd.uniform(-.1, .12) * S], fill=ec, width=W_(18))
        g.line([cx + sx * .2 * S, cy - .18 * S, cx + sx * (.46 + rnd.uniform(0, .06)) * S, cy + rnd.uniform(-.1, .12) * S], fill=roupa + (255,), width=W_(11))
    g.rounded_rectangle([cx - .2 * S, cy - .26 * S, cx + .2 * S, cy + .16 * S], radius=W_(14), fill=roupa + (255,), outline=ec, width=W_(3))
    g.line([cx - .12 * S, cy - .2 * S, cx - .12 * S, cy + .08 * S], fill=(150, 168, 200, 150), width=W_(4))
    g.ellipse([cx - .16 * S, cy - .5 * S, cx + .16 * S, cy - .2 * S], fill=pele + (255,), outline=ec, width=W_(3))
    g.pieslice([cx - .17 * S, cy - .52 * S, cx + .17 * S, cy - .26 * S], 180, 360, fill=(70, 46, 30, 255), outline=ec, width=W_(2))
    lay = lay.rotate(ang, center=(cx, cy), resample=RES.BICUBIC)
    d._image.alpha_composite(sombra(nova(*lay.size), lay, 5, 6, 4, .45, k))
    d._image.alpha_composite(lay)


def d_tesouro(d, cx, cy, S, k, rnd, p):
    lay = Image.new("RGBA", d._image.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(lay)

    def moeda(x, y, r):
        g.ellipse([x - r, y - r, x + r, y + r], fill=(226, 184, 58, 255), outline=(98, 66, 12, 255), width=W_(3))
        g.ellipse([x - r * .68, y - r * .68, x + r * .68, y + r * .68], outline=(176, 130, 30, 255), width=W_(2))
        g.arc([x - r * .8, y - r * .8, x + r * .8, y + r * .8], 195, 255, fill=(255, 240, 160, 230), width=W_(3))
    pts = []
    for _ in range(16):
        a, r = rnd.uniform(0, 2 * math.pi), math.sqrt(rnd.random()) * .3 * S
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * .9, rnd.uniform(.075, .105) * S))
    for x, y, r in sorted(pts, key=lambda t: t[1]):
        moeda(x, y, r)
    for cor, ec in (((200, 40, 56), (80, 10, 20)), ((56, 110, 210), (16, 36, 90)), ((70, 190, 110), (16, 70, 40))):
        x, y, r = cx + rnd.uniform(-.25, .25) * S, cy + rnd.uniform(-.2, .25) * S, .06 * S
        g.polygon([(x, y - r * 1.2), (x + r, y), (x, y + r * 1.2), (x - r, y)], fill=cor + (255,), outline=ec + (255,), width=W_(2))
        g.line([x - r * .3, y - r * .3, x, y - r * .7], fill=(255, 255, 255, 220), width=W_(2))
    d._image.alpha_composite(sombra(nova(*lay.size), lay, 5, 6, 4, .45, k))
    d._image.alpha_composite(lay)


def d_tocha_grande(d, cx, cy, S, k, rnd, p):
    sprites.d_tocha(d, cx, cy, S * 1.9, k * 1.9, rnd, p)


# (funcao, parametros, brilho opcional (cor, raio, forca), sombra)
def _recorte(fn, **pp):
    return lambda d, cx, cy, s, k, rnd, p: fn(d, cx, cy, s, k, rnd, dict(p, **pp))


def _com_sombra(fn):
    def f(d, cx, cy, s, k, rnd, p):
        lay = Image.new("RGBA", d._image.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(lay)
        dd._image = lay
        fn(dd, cx, cy, s, k, rnd, p)
        d._image.alpha_composite(sombra(nova(*lay.size), lay, 5, 6, 4, .5, k))
        d._image.alpha_composite(lay)
    return f


TIPOS = {
    "fogo": (d_fogo, ((255, 150, 60), .5, .55)),
    "fumaca": (d_fumaca, None),
    "destrocos": (_com_sombra(_recorte(sprites.d_entulho, r=.62)), None),
    "agua": (d_agua, None),
    "gelo": (_com_sombra(d_gelo), None),
    "sangue": (_recorte(sprites_casa.d_mancha, r=.5, estilo="sangue"), None),
    "queimado": (_recorte(sprites_casa.d_mancha, r=.5, estilo="queimado"), None),
    "limo": (_recorte(sprites_casa.d_mancha, r=.5, estilo="limo"), None),
    "corpo": (d_corpo, None),
    "ossos": (_com_sombra(_recorte(sprites.d_ossos)), None),
    "armadilha": (_recorte(sprites_casa.d_armadilha, r=.5, estilo="espetos"), None),
    "tesouro": (d_tesouro, ((255, 214, 100), .4, .3)),
    "tocha": (_com_sombra(d_tocha_grande), ((255, 176, 90), .5, .55)),
    "teia": (_recorte(sprites_casa.d_teia, r=.7), None),
}


def desenhar(tipo, v):
    fn, luz = TIPOS[tipo]
    rnd = random.Random(f"{tipo}-{v}")
    W = int(ESCALA * S)
    im = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d._image = im
    fn(d, W / 2, W / 2, S, K, rnd, {})
    if luz:
        im = Image.alpha_composite(_brilho(W, *luz), im)
    return im.resize((PX, PX), RES.LANCZOS)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    for tipo in TIPOS:
        for v in range(1, VARIANTES + 1):
            desenhar(tipo, v).save(SAIDA / f"{tipo}-{v}.png", optimize=True)
    # folha de conferencia (fora do site)
    cols = len(TIPOS)
    folha = Image.new("RGBA", (cols * PX, VARIANTES * PX), (122, 100, 70, 255))
    for i, tipo in enumerate(TIPOS):
        for v in range(VARIANTES):
            im = Image.open(SAIDA / f"{tipo}-{v + 1}.png")
            folha.alpha_composite(im, (i * PX, v * PX))
    folha.convert("RGB").save(RAIZ / "galeria" / "marcadores.png")
    print(f"{len(TIPOS) * VARIANTES} PNGs em {SAIDA}")


if __name__ == "__main__":
    main()
