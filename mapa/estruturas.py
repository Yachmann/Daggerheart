"""Estruturas grandes: pontes (inteiras ou com trecho desabado). Salas e paredes ficam em terreno.py."""
import math
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from .camadas import nova, sombra, colocar
from .materiais import lajes, tabuas
from .ruido import A, lerp, to_rgb, campo_local


def _corrente(d, p0, p1, p2, k, links=16):
    for i in range(links):
        t = i / (links - 1)
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        a, b = 8 * k, 4 * k
        if i % 2:
            d.ellipse([x - a, y - b, x + a, y + b], outline=(48, 48, 54, 255), width=max(1, int(3 * k)))
        else:
            d.ellipse([x - b, y - a, x + b, y + a], outline=(70, 70, 78, 255), width=max(1, int(3 * k)))


def desenhar_ponte(m, img, p, idx):
    S, k = m.S, m.k
    c = m.campos
    x0, y0, x1, y1 = p["x0"], p["y0"], p["x1"], p["y1"]
    horiz = (x1 - x0) >= (y1 - y0)
    L, Wd = ((x1 - x0), (y1 - y0)) if horiz else ((y1 - y0), (x1 - x0))
    M = int(1.4 * S)
    lw, lh = int(round(L * S)) + 2 * M, int(round(Wd * S)) + 2 * M
    mat = p.get("material", "ferro")
    rnd = m.rnd("ponte", idx)
    bur = p.get("buraco")
    dx1, dy1 = M + int(round(L * S)), M + int(round(Wd * S))
    oy, ox = (idx * 137) % m.H, (idx * 211) % m.W

    # ---- textura do tabuleiro ----
    if mat == "ferro":
        big, fine, rust = (campo_local(f, lh, lw, oy, ox) for f in (c.big, c.fine, c.rust))
        col = A(72, 75, 80) + big[..., None] * 22 + fine[..., None] * 30
        col = lerp(col, A(124, 74, 42), (np.clip((rust - 0.12) * 2.4, 0, 1)[..., None] * 0.6))
        deck = to_rgb(col)
        d = ImageDraw.Draw(deck, "RGBA")
        for px in range(0, int(L), 2):
            for py in range(0, int(Wd), 2):
                a, b, e, f = M + px * S, M + py * S, M + (px + 2) * S, M + (py + 2) * S
                tint = rnd.choice([(255, 255, 255, rnd.randint(6, 22)), (0, 0, 0, rnd.randint(8, 26))])
                d.rectangle([a, b, e, f], fill=tint)
                w4 = max(1, int(4 * k))
                for ln in ([a, b, e, b], [a, f, e, f], [a, b, a, f], [e, b, e, f]):
                    d.line(ln, fill=(0, 0, 0, 170), width=w4)
                d.line([a + 4 * k, b + 4 * k, e - 4 * k, b + 4 * k], fill=(255, 255, 255, 50), width=max(1, int(2 * k)))
                d.line([a + 4 * k, b + 4 * k, a + 4 * k, f - 4 * k], fill=(255, 255, 255, 40), width=max(1, int(2 * k)))
                for rx, ry in [(a + 22 * k, b + 22 * k), (e - 22 * k, b + 22 * k), (a + 22 * k, f - 22 * k), (e - 22 * k, f - 22 * k)]:
                    d.ellipse([rx - 4 * k, ry - 3 * k, rx + 8 * k, ry + 9 * k], fill=(0, 0, 0, 90))
                    d.ellipse([rx - 6 * k, ry - 6 * k, rx + 6 * k, ry + 6 * k], fill=(52, 52, 57, 255))
                    d.ellipse([rx - 4 * k, ry - 5 * k, rx + 1 * k, ry], fill=(150, 150, 158, 200))
        for (ya, yb) in [(M, M + int(0.3 * S)), (dy1 - int(0.3 * S), dy1)]:
            d.rectangle([M, ya, dx1, yb], fill=(40, 42, 46, 255))
            d.line([M, ya + 3 * k, dx1, ya + 3 * k], fill=(255, 255, 255, 45), width=max(1, int(2 * k)))
            d.line([M, yb - k, dx1, yb - k], fill=(0, 0, 0, 200), width=max(1, int(3 * k)))
            for rx in range(M + int(25 * k), dx1, int(0.5 * S)):
                d.ellipse([rx - 4 * k, (ya + yb) / 2 - 4 * k, rx + 4 * k, (ya + yb) / 2 + 4 * k], fill=(96, 96, 104, 255))
        for _ in range(int(420 * L * Wd / 72)):
            x, y, a, ln = rnd.uniform(M, dx1), rnd.uniform(M, dy1), rnd.uniform(0, math.pi), rnd.uniform(8, 38) * k
            d.line([x, y, x + ln * math.cos(a), y + ln * math.sin(a)], fill=(205, 205, 210, 34), width=1)
    elif mat == "madeira":
        t = np.transpose(tabuas(lw, lh, rnd, S), (1, 0, 2))
        deck = to_rgb(t)
        d = ImageDraw.Draw(deck, "RGBA")
        for (ya, yb) in [(M, M + int(0.25 * S)), (dy1 - int(0.25 * S), dy1)]:
            d.rectangle([M, ya, dx1, yb], fill=(70, 48, 28, 255), outline=(30, 20, 12, 255), width=max(1, int(2 * k)))
    else:  # pedra
        deck = to_rgb(lajes(lh, lw, rnd, S, rh=(0.6, 0.9), sw=(0.7, 1.3), g=(110, 156), raio=14))
        d = ImageDraw.Draw(deck, "RGBA")
        for (ya, yb) in [(M, M + int(0.3 * S)), (dy1 - int(0.3 * S), dy1)]:
            d.rectangle([M, ya, dx1, yb], fill=(150, 146, 140, 255), outline=(40, 38, 36, 255), width=max(1, int(3 * k)))

    # ---- mascara (com buraco, se houver) ----
    mask = Image.new("L", (lw, lh), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([M, M, dx1 - 1, dy1 - 1], fill=255)
    b0 = b1 = None
    if bur:
        ka, kb = ("x0", "x1") if horiz else ("y0", "y1")
        if ka not in bur:   # tolera o eixo trocado
            ka, kb = ("y0", "y1") if horiz else ("x0", "x1")
        b0, b1 = bur[ka] - (x0 if horiz else y0), bur[kb] - (x0 if horiz else y0)
        rows = [M + (-0.2 + j * 0.3) * S for j in range(int((Wd + 0.4) / 0.3) + 2)]
        left = [(M + (b0 + rnd.uniform(-0.38, 0.3)) * S, yy) for yy in rows]
        right = [(M + (b1 + rnd.uniform(-0.3, 0.38)) * S, yy) for yy in rows]
        md.polygon(left + right[::-1], fill=0)
    soft = mask.filter(ImageFilter.GaussianBlur(0.8 * k))
    tex = deck.convert("RGBA")
    tex.putalpha(soft)
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(int(9 * k) // 2 * 2 + 1)))
    ed = Image.new("RGBA", (lw, lh), (18, 16, 16, 0))
    ed.putalpha(edge.point(lambda v: int(v * 0.8)))
    tex = Image.alpha_composite(tex, ed)

    # ---- corrimao ----
    rails = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    if mat != "pedra":
        rd = ImageDraw.Draw(rails)
        for yy in (M + 0.1 * S, dy1 - 0.1 * S):
            if mat == "ferro":
                rd.line([M, yy, dx1, yy], fill=(26, 26, 30, 255), width=max(1, int(8 * k)))
                rd.line([M, yy - 2 * k, dx1, yy - 2 * k], fill=(120, 120, 128, 255), width=max(1, int(2 * k)))
            else:
                rd.line([M, yy, dx1, yy], fill=(176, 146, 100, 255), width=max(1, int(4 * k)))
            for i in range(0, int(L) + 1, 2):
                px = M + i * S
                if mat == "ferro":
                    rd.ellipse([px - 10 * k, yy - 10 * k, px + 10 * k, yy + 10 * k], fill=(24, 24, 28, 255))
                    rd.ellipse([px - 6 * k, yy - 7 * k, px + 4 * k, yy + 3 * k], fill=(128, 128, 136, 255))
                else:
                    rd.ellipse([px - 9 * k, yy - 9 * k, px + 9 * k, yy + 9 * k], fill=(96, 66, 38, 255), outline=(40, 26, 14, 255))
        rails.putalpha(ImageChops.multiply(rails.getchannel("A"), mask))

    # ---- cabeceiras de pedra ----
    pads = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    if p.get("apoios", True):
        for (a, e) in [(M - S, M), (dx1, dx1 + S)]:
            h, w = dy1 - M + 2 * S, e - a
            pad = to_rgb(lajes(h, w, rnd, S))
            pads.paste(pad.convert("RGBA"), (a, M - S))

    # ---- destrocos do desabamento ----
    extras = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    if bur:
        xd0, xd1 = M + b0 * S, M + b1 * S
        ed_ = ImageDraw.Draw(extras)
        Wp = Wd * S
        for pts in ([(xd0 + 5 * k, M + .1 * S), (xd0 + .65 * S, M + .55 * S), (xd0 + .95 * S, M + 1.4 * S)],
                    [(xd1 - 5 * k, dy1 - .1 * S), (xd1 - .55 * S, dy1 - .6 * S), (xd1 - .9 * S, dy1 - 1.45 * S)]):
            ed_.line(pts, fill=(26, 26, 30, 255), width=max(1, int(8 * k)), joint="curve")
            ed_.line([(a, b - 2 * k) for a, b in pts], fill=(120, 120, 128, 255), width=max(1, int(2 * k)), joint="curve")
        _corrente(ed_, (xd0 + 5 * k, M + .37 * Wp), (xd0 + .7 * S, M + .55 * Wp), (xd0 + 1.2 * S, M + .48 * Wp), k)
        _corrente(ed_, (xd1 - 5 * k, M + .63 * Wp), (xd1 - .7 * S, M + .75 * Wp), (xd1 - 1.25 * S, M + .53 * Wp), k)
        tint = {"ferro": (10, -2, -6), "madeira": (40, 14, -10), "pedra": (10, 8, 4)}[mat]
        for _ in range(10):
            cx, cy = rnd.uniform(xd0 + .5 * S, xd1 - .5 * S), rnd.uniform(M - .2 * S, dy1 + .3 * S)
            r, n = rnd.uniform(.14, .34) * S, rnd.randint(4, 6)
            pts = [(cx + r * rnd.uniform(.5, 1.1) * math.cos(2 * math.pi * i / n + rnd.uniform(-.3, .3)),
                    cy + r * rnd.uniform(.5, 1.1) * math.sin(2 * math.pi * i / n + rnd.uniform(-.3, .3))) for i in range(n)]
            g = rnd.randint(62, 92)
            ed_.polygon(pts, fill=(g + tint[0], g + tint[1], g + tint[2], 235), outline=(26, 24, 24, 255))

    # ---- orientacao e composicao ----
    def glob(loc):
        if not horiz:
            loc = loc.transpose(Image.Transpose.TRANSPOSE)
        L_ = nova(m.W, m.H)
        colocar(L_, loc, x0 * S - M + loc.width / 2, y0 * S - M + loc.height / 2)
        return L_

    pads_g, tex_g, rails_g, ext_g = glob(pads), glob(tex), glob(rails), glob(extras)
    img = sombra(img, pads_g, 6, 9, 5, 0.55, k)
    img = Image.alpha_composite(img, pads_g)
    img = sombra(img, tex_g, 40, 55, 35, 0.6, k)
    img = Image.alpha_composite(img, tex_g)
    img = sombra(img, rails_g, 5, 8, 3, 0.55, k)
    img = Image.alpha_composite(img, rails_g)
    if bur:
        img = sombra(img, ext_g, 9, 14, 5, 0.6, k)
        img = Image.alpha_composite(img, ext_g)
    return img
