"""Sprites de natureza, cavernas e itens taticos (barricadas, espetos, barco). Mesmo contrato de sprites_casa.py."""
import math

from .sprites_casa import W_, ESC, CLA, _sobre


def _mix(a, b, t):
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


# ---------- arvores e plantas ----------
def d_pinheiro(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.3) * S
    dark, light = p["_copa"]
    n = 14
    for L in range(6):
        rr = r * (1 - L * .15)
        ox, oy = -L * .018 * r, -L * .022 * r
        pts = []
        for i in range(2 * n):
            a = math.pi * i / n + L * .21
            rad = rr * (1 if i % 2 == 0 else .56)
            pts.append((cx + ox + rad * math.cos(a), cy + oy + rad * math.sin(a)))
        col = _mix(dark, light, L / 5)
        d.polygon(pts, fill=col + (255,), outline=ESC(dark, .5) + (255,))
        for i in range(0, 2 * n, 2):
            a = math.pi * i / n + L * .21
            d.line([cx + ox, cy + oy, cx + ox + rr * .9 * math.cos(a), cy + oy + rr * .9 * math.sin(a)], fill=ESC(col, .72) + (120,), width=W_(2, k))
    d.ellipse([cx - 4 * k, cy - 5 * k, cx + 4 * k, cy + 3 * k], fill=(120, 84, 48, 255))


def d_palmeira(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.6) * S
    dark, light = p["_copa"]
    n = 9
    for i in range(n):
        a = 2 * math.pi * i / n + rnd.uniform(-.1, .1)
        L = r * rnd.uniform(.86, 1.0)
        ca, sa = math.cos(a), math.sin(a)
        nx, ny = -sa, ca
        pts = []
        for t in (0, .18, .4, .65, .85, 1.0):
            wd = (.2 * math.sin(math.pi * min(t * 1.05, 1)) + .02) * r * .55
            pts.append((cx + ca * L * t + nx * wd, cy + sa * L * t + ny * wd))
        for t in (1.0, .85, .65, .4, .18, 0):
            wd = (.2 * math.sin(math.pi * min(t * 1.05, 1)) + .02) * r * .55
            pts.append((cx + ca * L * t - nx * wd, cy + sa * L * t - ny * wd))
        lx = (ca * -.6 + sa * -.8)
        col = _mix(dark, light, .5 + .4 * lx)
        d.polygon(pts, fill=col + (255,), outline=ESC(dark, .5) + (255,))
        d.line([cx, cy, cx + ca * L * .96, cy + sa * L * .96], fill=ESC(col, .6) + (255,), width=W_(2, k))
    for _ in range(4):
        x, y = cx + rnd.uniform(-.1, .1) * r, cy + rnd.uniform(-.1, .1) * r
        d.ellipse([x - 6 * k, y - 6 * k, x + 6 * k, y + 6 * k], fill=(112, 76, 44, 255), outline=(48, 30, 18, 255), width=W_(2, k))


def d_cacto(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .5) * S
    g1, g2, ge = (64, 124, 70), (98, 162, 92), (24, 56, 32)
    for a in (-35, 150):
        t = math.radians(a)
        x, y = cx + r * .95 * math.cos(t), cy + r * .95 * math.sin(t)
        d.line([cx, cy, x, y], fill=g1 + (255,), width=int(r * .55))
        d.ellipse([x - r * .3, y - r * .3, x + r * .3, y + r * .3], fill=g2 + (255,), outline=ge + (255,), width=W_(3, k))
    d.ellipse([cx - r * .62, cy - r * .62, cx + r * .62, cy + r * .62], fill=g1 + (255,), outline=ge + (255,), width=W_(4, k))
    for i in range(10):
        a = 2 * math.pi * i / 10
        d.line([cx + r * .12 * math.cos(a), cy + r * .12 * math.sin(a), cx + r * .58 * math.cos(a), cy + r * .58 * math.sin(a)], fill=ge + (200,), width=W_(2, k))
    d.ellipse([cx - r * .35, cy - r * .4, cx + r * .1, cy + r * .05], fill=g2 + (255,))
    d.ellipse([cx - r * .1, cy - r * .1, cx + r * .1, cy + r * .1], fill=(236, 120, 150, 255))


def d_cogumelos(d, cx, cy, S, k, rnd, p):
    R = p.get("r", .8) * S
    c = tuple(p.get("cor") or (178, 52, 60))
    itens = []
    for _ in range(rnd.randint(5, 7)):
        a, rr = rnd.uniform(0, 2 * math.pi), R * math.sqrt(rnd.random()) * .75
        itens.append((cy + rr * math.sin(a), cx + rr * math.cos(a), rnd.uniform(.12, .26) * S))
    for y, x, r in sorted(itens):
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (255,), outline=ESC(c, .4) + (255,), width=W_(3, k))
        d.ellipse([x - r * .6, y - r * .7, x + r * .1, y - r * .1], fill=CLA(c, 50) + (255,))
        for _ in range(3):
            a, q = rnd.uniform(0, 2 * math.pi), r * rnd.uniform(.2, .65)
            sx, sy, sr = x + q * math.cos(a), y + q * math.sin(a), r * .13
            d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(246, 240, 224, 255))


def d_flores(d, cx, cy, S, k, rnd, p):
    R = p.get("r", 1.0) * S
    pal = [tuple(p["cor"])] if p.get("cor") else [(255, 222, 96), (250, 250, 246), (232, 96, 142), (176, 128, 232), (255, 156, 70)]

    def corpo(g):
        for _ in range(int(14 + 14 * R / S)):
            a, rr = rnd.uniform(0, 2 * math.pi), R * math.sqrt(rnd.random())
            x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
            g.ellipse([x - 4 * k, y - 4 * k, x + 4 * k, y + 4 * k], fill=(58, 120, 56, 220))
            c = rnd.choice(pal)
            for j in range(5):
                t = 2 * math.pi * j / 5
                px, py = x + 4.5 * k * math.cos(t), y + 4.5 * k * math.sin(t)
                g.ellipse([px - 3 * k, py - 3 * k, px + 3 * k, py + 3 * k], fill=c + (255,))
            g.ellipse([x - 2 * k, y - 2 * k, x + 2 * k, y + 2 * k], fill=(250, 200, 60, 255))
    _sobre(d, corpo)


def d_capim(d, cx, cy, S, k, rnd, p):
    R = p.get("r", .8) * S

    def tufos(g):
        for _ in range(int(9 + 10 * R / S)):
            a, rr = rnd.uniform(0, 2 * math.pi), R * math.sqrt(rnd.random()) * .85
            x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
            for _j in range(9):
                t = rnd.uniform(0, 2 * math.pi)
                L = rnd.uniform(.14, .3) * S
                c = rnd.choice([(36, 84, 34), (62, 120, 44), (104, 160, 64)])
                g.line([x, y, x + L * math.cos(t), y + L * math.sin(t)], fill=c + (255,), width=W_(3.5, k))
    _sobre(d, tufos)


def d_lirio(d, cx, cy, S, k, rnd, p):
    R = p.get("r", .5) * S

    def folhas(g):
        for _ in range(rnd.randint(3, 4)):
            a, rr = rnd.uniform(0, 2 * math.pi), R * rnd.uniform(.2, 1.0)
            x, y, r = cx + rr * math.cos(a), cy + rr * math.sin(a), rnd.uniform(.2, .32) * S
            ang = rnd.uniform(0, 360)
            g.pieslice([x - r, y - r, x + r, y + r], ang + 25, ang + 335, fill=(62, 134, 72, 255), outline=(22, 68, 38, 255), width=W_(2, k))
            g.line([x, y, x + r * .8 * math.cos(math.radians(ang + 180)), y + r * .8 * math.sin(math.radians(ang + 180))], fill=(120, 180, 110, 200), width=W_(1.5, k))
            if rnd.random() < .45:
                for j in range(6):
                    t = 2 * math.pi * j / 6
                    px, py = x + r * .22 * math.cos(t), y + r * .22 * math.sin(t)
                    g.ellipse([px - r * .16, py - r * .16, px + r * .16, py + r * .16], fill=(246, 168, 196, 255))
                g.ellipse([x - r * .1, y - r * .1, x + r * .1, y + r * .1], fill=(252, 220, 90, 255))
    _sobre(d, folhas)


def d_junco(d, cx, cy, S, k, rnd, p):
    R = p.get("r", .7) * S
    for _ in range(22):
        a, rr = rnd.uniform(0, 2 * math.pi), R * math.sqrt(rnd.random()) * .8
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        t = rnd.uniform(0, 2 * math.pi)
        L = rnd.uniform(.2, .46) * S
        c = rnd.choice([(86, 112, 52), (116, 140, 64), (140, 160, 80)])
        d.line([x, y, x + L * math.cos(t), y + L * math.sin(t)], fill=c + (255,), width=W_(3, k))
        if rnd.random() < .28:
            hx, hy = x + L * .8 * math.cos(t), y + L * .8 * math.sin(t)
            d.ellipse([hx - 4 * k, hy - 4 * k, hx + 4 * k, hy + 4 * k], fill=(112, 70, 40, 255), outline=(50, 30, 18, 255))


# ---------- pedra, caverna, fogo da terra ----------
def d_rochedo(d, cx, cy, S, k, rnd, p):
    r = p.get("r", 1.1) * S
    n = 13
    pts = [(cx + r * rnd.uniform(.78, 1.05) * math.cos(2 * math.pi * i / n + rnd.uniform(-.12, .12)),
            cy + r * rnd.uniform(.78, 1.05) * math.sin(2 * math.pi * i / n + rnd.uniform(-.12, .12))) for i in range(n)]
    g = rnd.randint(104, 122)
    d.polygon(pts, fill=(g, g - 3, g - 8, 255), outline=(36, 34, 32, 255))
    for esc_, a in ((.78, 26), (.54, 40), (.3, 56)):
        q = [(cx + (x - cx) * esc_ - r * .1, cy + (y - cy) * esc_ - r * .12) for x, y in pts]
        d.polygon(q, fill=(min(255, g + a), min(255, g + a - 3), min(255, g + a - 8), 255), outline=(60, 58, 54, 150))
    for _ in range(5):
        a = rnd.uniform(0, 2 * math.pi)
        d.line([cx + r * .1 * math.cos(a), cy + r * .1 * math.sin(a), cx + r * .85 * math.cos(a + .2), cy + r * .85 * math.sin(a + .2)], fill=(40, 38, 36, 190), width=W_(3, k))
    for _ in range(4):
        a, rr = rnd.uniform(0, 2 * math.pi), r * rnd.uniform(.3, .7)
        x, y, mr = cx + rr * math.cos(a), cy + rr * math.sin(a), rnd.uniform(.06, .14) * r
        d.ellipse([x - mr, y - mr * .7, x + mr, y + mr * .7], fill=(70, 98, 56, 200))


def d_estalagmite(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .5) * S
    n = 9
    for L, f in enumerate((1.0, .72, .46, .22)):
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n + L * .3
            pts.append((cx - L * .05 * r + r * f * rnd.uniform(.8, 1.05) * math.cos(a), cy - L * .06 * r + r * f * rnd.uniform(.8, 1.05) * math.sin(a)))
        g = 84 + L * 26
        d.polygon(pts, fill=(g, g - 3, g - 6, 255), outline=(34, 32, 32, 255))
    d.ellipse([cx - r * .16, cy - r * .2, cx + r * .02, cy - r * .02], fill=(220, 218, 212, 140))


def d_cristal(d, cx, cy, S, k, rnd, p):
    c = tuple(p.get("cor") or (96, 170, 240))
    R = p.get("r", .5) * S
    for i in range(rnd.randint(4, 6)):
        a = rnd.uniform(0, 2 * math.pi)
        L, w = R * rnd.uniform(.7, 1.1), R * rnd.uniform(.22, .34)
        ox, oy = rnd.uniform(-.3, .3) * R, rnd.uniform(-.3, .3) * R
        ca, sa = math.cos(a), math.sin(a)
        nx, ny = -sa, ca
        base = (cx + ox, cy + oy)
        tip = (base[0] + ca * L, base[1] + sa * L)
        pts = [(base[0] + nx * w, base[1] + ny * w), (base[0] + ca * L * .72 + nx * w * .8, base[1] + sa * L * .72 + ny * w * .8), tip,
               (base[0] + ca * L * .72 - nx * w * .8, base[1] + sa * L * .72 - ny * w * .8), (base[0] - nx * w, base[1] - ny * w)]
        d.polygon(pts, fill=c + (255,), outline=ESC(c, .35) + (255,))
        d.polygon([base, pts[1], tip, pts[3]][:3], fill=CLA(c, 70) + (255,))
        d.line([base, tip], fill=CLA(c, 110) + (255,), width=W_(2, k))
    d.ellipse([cx - 4 * k, cy - 4 * k, cx + 4 * k, cy + 4 * k], fill=CLA(c, 120) + (255,))


def d_fumarola(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .6) * S
    n = 11
    pts = [(cx + r * rnd.uniform(.82, 1.05) * math.cos(2 * math.pi * i / n), cy + r * rnd.uniform(.82, 1.05) * math.sin(2 * math.pi * i / n)) for i in range(n)]
    d.polygon(pts, fill=(58, 50, 48, 255), outline=(20, 16, 16, 255))
    q = [(cx + (x - cx) * .68, cy + (y - cy) * .68) for x, y in pts]
    d.polygon(q, fill=(32, 20, 16, 255))
    for rr, c in ((.46, (230, 80, 20)), (.3, (255, 150, 40)), (.14, (255, 230, 140))):
        d.ellipse([cx - r * rr, cy - r * rr, cx + r * rr, cy + r * rr], fill=c + (255,))
    for _ in range(4):
        a = rnd.uniform(0, 2 * math.pi)
        d.line([cx + r * .5 * math.cos(a), cy + r * .5 * math.sin(a), cx + r * 1.15 * math.cos(a + .15), cy + r * 1.15 * math.sin(a + .15)], fill=(220, 90, 24, 220), width=W_(2, k))


# ---------- taticos e transporte ----------
def d_barco(d, cx, cy, S, k, rnd, p):
    w, h = 1.25 * S, 3.0 * S
    x0, y0 = cx - w / 2, cy - h / 2
    casco = [(cx, y0), (cx + w * .3, y0 + h * .13), (cx + w / 2, y0 + h * .45), (cx + w * .44, y0 + h * .86), (cx + w * .22, y0 + h),
             (cx - w * .22, y0 + h), (cx - w * .44, y0 + h * .86), (cx - w / 2, y0 + h * .45), (cx - w * .3, y0 + h * .13)]
    for sx in (-1, 1):
        d.line([cx + sx * w * .36, cy - .1 * S, cx + sx * w * .98, cy + .3 * S], fill=(176, 140, 94, 255), width=W_(5, k))
        d.ellipse([cx + sx * w * .98 - 9 * k, cy + .3 * S - 5 * k, cx + sx * w * .98 + 9 * k, cy + .3 * S + 14 * k], fill=(150, 112, 70, 255), outline=(60, 40, 22, 255))
    d.polygon(casco, fill=(124, 88, 52, 255), outline=(44, 28, 16, 255))
    interno = [(cx + (x - cx) * .78, cy + (y - cy) * .9) for x, y in casco]
    d.polygon(interno, fill=(84, 58, 34, 255), outline=(52, 34, 20, 255))
    for t in (.3, .5, .72):
        yy = y0 + h * t
        wd = w * .38 * (1 - abs(t - .5) * .5)
        d.rectangle([cx - wd, yy - 5 * k, cx + wd, yy + 5 * k], fill=(138, 100, 60, 255), outline=(50, 32, 18, 255), width=W_(2, k))
    d.line([cx, y0 + 6 * k, cx, y0 + h - 6 * k], fill=(60, 40, 24, 120), width=W_(2, k))
    d.line([cx - w * .08, y0 + 8 * k, cx - w * .44, y0 + h * .42], fill=(190, 150, 100, 110), width=W_(2, k))


def d_feno(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .6) * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(204, 172, 84, 255), outline=(84, 64, 26, 255), width=W_(3, k))
    for f in (.78, .56, .34, .14):
        d.ellipse([cx - r * f, cy - r * f, cx + r * f, cy + r * f], outline=(150, 118, 50, 200), width=W_(2, k))
    for _ in range(26):
        a, rr = rnd.uniform(0, 2 * math.pi), r * math.sqrt(rnd.random()) * .92
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        t = rnd.uniform(0, 2 * math.pi)
        L = rnd.uniform(.06, .16) * S
        d.line([x, y, x + L * math.cos(t), y + L * math.sin(t)], fill=rnd.choice([(232, 204, 118), (170, 134, 62)]) + (255,), width=W_(2, k))
    d.ellipse([cx - r * .6, cy - r * .7, cx - r * .1, cy - r * .2], fill=(255, 244, 200, 60))


def d_toco(d, cx, cy, S, k, rnd, p):
    r = p.get("r", .45) * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(86, 58, 34, 255), outline=(36, 22, 12, 255), width=W_(4, k))
    d.ellipse([cx - r * .84, cy - r * .84, cx + r * .84, cy + r * .84], fill=(188, 148, 98, 255), outline=(110, 78, 46, 255), width=W_(2, k))
    for f in (.64, .46, .3, .14):
        d.ellipse([cx - r * f, cy - r * f, cx + r * f, cy + r * f], outline=(130, 94, 58, 255), width=W_(2, k))
    d.line([cx, cy, cx + r * .8, cy - r * .3], fill=(110, 78, 46, 200), width=W_(2, k))
    d.ellipse([cx - r * .6, cy - r * .62, cx - r * .15, cy - r * .2], fill=(255, 236, 200, 60))


def d_barricada(d, cx, cy, S, k, rnd, p):
    L = p.get("comp", 3) * S
    estilo = p.get("estilo", "madeira")
    h = .85 * S
    x0, x1 = cx - L / 2, cx + L / 2
    if estilo == "sacos":
        for linha, yy in enumerate((cy - h * .22, cy + h * .22)):
            n = max(2, int(L / (.46 * S)))
            off = .5 * (L / n) * (linha % 2)
            for i in range(n):
                a = x0 + L * i / n + off
                b = a + L / n
                g = rnd.randint(170, 200)
                d.rounded_rectangle([a, yy - h * .24, b, yy + h * .24], radius=W_(9, k), fill=(g, g - 22, g - 62, 255), outline=(78, 62, 36, 255), width=W_(3, k))
                d.line([a + 8 * k, yy, b - 8 * k, yy], fill=(120, 98, 56, 180), width=W_(2, k))
        return
    if estilo == "pedra":
        for linha, yy in enumerate((cy - h * .24, cy + h * .24)):
            x = x0 - rnd.uniform(0, .2) * S * linha
            while x < x1:
                wd = rnd.uniform(.3, .55) * S
                g = rnd.randint(100, 140)
                d.rounded_rectangle([x, yy - h * .26, min(x + wd, x1), yy + h * .26], radius=W_(8, k), fill=(g, g - 3, g - 8, 255), outline=(40, 38, 36, 255), width=W_(3, k))
                d.line([x + 5 * k, yy - h * .2, min(x + wd, x1) - 7 * k, yy - h * .2], fill=(255, 255, 255, 50), width=W_(2, k))
                x += wd
        return
    for yy in (cy - h * .3, cy, cy + h * .3):
        d.rounded_rectangle([x0, yy - h * .14, x1, yy + h * .14], radius=W_(6, k), fill=(112, 78, 46, 255), outline=(40, 26, 14, 255), width=W_(3, k))
        d.line([x0 + 6 * k, yy - h * .07, x1 - 6 * k, yy - h * .07], fill=(170, 130, 84, 150), width=W_(2, k))
    n = max(2, int(L / (1.1 * S)))
    for i in range(n + 1):
        x = x0 + L * i / n
        d.rectangle([x - 6 * k, cy - h / 2, x + 6 * k, cy + h / 2], fill=(86, 58, 34, 255), outline=(36, 22, 12, 255), width=W_(2, k))
        d.polygon([(x - 6 * k, cy - h / 2), (x, cy - h / 2 - 9 * k), (x + 6 * k, cy - h / 2)], fill=(176, 140, 92, 255), outline=(36, 22, 12, 255))


def d_espetos(d, cx, cy, S, k, rnd, p):
    L = p.get("comp", 2) * S
    n = max(2, int(L / (.55 * S)))
    for i in range(n):
        x = cx - L / 2 + L * (i + .5) / n
        s = .3 * S
        for sg in (-1, 1):
            a, b = (x - s, cy - sg * s), (x + s, cy + sg * s)
            d.line([a, b], fill=(62, 40, 22, 255), width=W_(10, k))
            d.line([a, b], fill=(122, 86, 52, 255), width=W_(6, k))
            for e in (a, b):
                d.ellipse([e[0] - 4 * k, e[1] - 4 * k, e[0] + 4 * k, e[1] + 4 * k], fill=(196, 160, 112, 255), outline=(60, 40, 22, 255))
    d.line([cx - L / 2, cy, cx + L / 2, cy], fill=(46, 30, 18, 255), width=W_(7, k))
    d.line([cx - L / 2 + 4 * k, cy - 1.5 * k, cx + L / 2 - 4 * k, cy - 1.5 * k], fill=(140, 100, 62, 180), width=W_(2, k))


DESENHOS = {
    "pinheiro": d_pinheiro, "palmeira": d_palmeira, "cacto": d_cacto, "cogumelos": d_cogumelos, "flores": d_flores,
    "capim": d_capim, "lirio": d_lirio, "junco": d_junco, "rochedo": d_rochedo, "estalagmite": d_estalagmite,
    "cristal": d_cristal, "fumarola": d_fumarola, "barco": d_barco, "feno": d_feno, "toco": d_toco,
    "barricada": d_barricada, "espetos": d_espetos,
}

_g = lambda p, n, v: p.get(n, v)
TAMANHOS = {
    "pinheiro": lambda p: (2 * _g(p, "r", 1.3), 2 * _g(p, "r", 1.3)), "palmeira": lambda p: (2 * _g(p, "r", 1.6), 2 * _g(p, "r", 1.6)),
    "cacto": lambda p: (2 * _g(p, "r", .5) + .3, 2 * _g(p, "r", .5) + .3), "cogumelos": lambda p: (2 * _g(p, "r", .8) + .6, 2 * _g(p, "r", .8) + .6),
    "flores": lambda p: (2 * _g(p, "r", 1) + .3, 2 * _g(p, "r", 1) + .3), "capim": lambda p: (2 * _g(p, "r", .8) + .5, 2 * _g(p, "r", .8) + .5),
    "lirio": lambda p: (2 * _g(p, "r", .5) + .8, 2 * _g(p, "r", .5) + .8), "junco": lambda p: (2 * _g(p, "r", .7) + 1, 2 * _g(p, "r", .7) + 1),
    "rochedo": lambda p: (2.1 * _g(p, "r", 1.1), 2.1 * _g(p, "r", 1.1)), "estalagmite": lambda p: (2.1 * _g(p, "r", .5), 2.1 * _g(p, "r", .5)),
    "cristal": lambda p: (2.4 * _g(p, "r", .5) + .4, 2.4 * _g(p, "r", .5) + .4), "fumarola": lambda p: (2.5 * _g(p, "r", .6), 2.5 * _g(p, "r", .6)),
    "barco": lambda p: (2.1, 3.1), "feno": lambda p: (2.1 * _g(p, "r", .6), 2.1 * _g(p, "r", .6)),
    "toco": lambda p: (2.1 * _g(p, "r", .45), 2.1 * _g(p, "r", .45)),
    "barricada": lambda p: (_g(p, "comp", 3) + .3, .95), "espetos": lambda p: (_g(p, "comp", 2) + .8, 1.0),
}


LUZES = {
    "cristal": lambda p: [(0, 0, tuple(p.get("cor") or (96, 170, 240)), 2.2, .6)],
    "fumarola": [(0, 0, (255, 130, 50), 3.2, .85)],
}
