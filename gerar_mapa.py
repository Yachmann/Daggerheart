#!/usr/bin/env python3
"""Gerador de battlemap (teste): Emboscada na Ponte de Ferro.
O layout fica no dicionario LAYOUT (vira JSON); o renderizador desenha tudo por codigo.
Unidades do layout: quadrados da grade (1 quadrado = 2,5 cm na mesa)."""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from scipy import ndimage as ndi

LAYOUT = {
    "nome": "Emboscada na Ponte de Ferro",
    "grade": [30, 20],
    "px_por_quadrado": 100,
    "cm_por_quadrado": 2.5,
    "seed": 11,
    "abismo": {"x_esq": 10, "x_dir": 20},
    "ponte": {"x0": 9, "x1": 21, "y0": 7, "y1": 13},
    "desabamento": {"x0": 13, "x1": 17},
    "carroca": {"x": 4, "y": 9},
    "barricada_x": 25,
    "arvores": [[2.2, 2.4, 2.0], [6.8, 1.2, 1.5], [1.6, 17.4, 2.1], [6.4, 18.6, 1.6],
                [27.8, 2.0, 2.1], [23.8, 1.0, 1.5], [27.6, 17.7, 2.2], [23.6, 18.7, 1.6]],
    "arbustos": [[8.2, 5.2, 0.6], [8.6, 15.0, 0.7], [22.6, 5.0, 0.6], [22.4, 15.2, 0.7],
                 [0.8, 6.0, 0.55], [1.2, 14.2, 0.6], [29.0, 6.0, 0.5], [29.0, 14.5, 0.6]],
    "pedras": [[8.0, 3.5, 0.6], [9.2, 16.5, 0.7], [21.2, 3.8, 0.6], [20.8, 16.2, 0.55],
               [5.0, 15.0, 0.5], [27.0, 4.5, 0.5], [3.5, 5.2, 0.45]],
    "caixotes": [[26.6, 7.45], [26.9, 12.45], [3.3, 8.0]],
    "barris": [[27.8, 8.0], [27.6, 12.2]],
}

S = LAYOUT["px_por_quadrado"]
GW, GH = LAYOUT["grade"]
W, H = GW * S, GH * S
SEED = LAYOUT["seed"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/mapa/saida"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(SEED)
random.seed(SEED)


# ---------- utilidades ----------
def noise(h, w, cell):
    gh, gw = h // cell + 3, w // cell + 3
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g).resize((gw * cell, gh * cell), Image.BICUBIC)
    return np.array(im)[:h, :w].astype(np.float32)


def fbm(h, w, cells):
    out = np.zeros((h, w), np.float32)
    tot = 0.0
    for i, c in enumerate(cells):
        wt = 0.55 ** i
        out += (noise(h, w, c) - 0.5) * wt
        tot += wt
    return out / tot * 2.0


def curve1d(n, coarse, fine, a1, a2):
    def one(step):
        m = n // step + 3
        v = np.interp(np.arange(n), np.linspace(0, n, m), rng.random(m))
        v = ndi.gaussian_filter1d(v, step / 3.0)
        return (v - v.mean()) / (v.std() + 1e-6)
    return one(coarse) * a1 + one(fine) * a2


def lerp(a, b, t):
    return a * (1 - t) + b * t


def A(*c):
    return np.array(c, np.float32)


def to_rgb(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def new_layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def drop_shadow(base, layer, dx, dy, blur, op):
    a = layer.getchannel("A")
    sh = Image.new("L", (W, H), 0)
    sh.paste(a, (dx, dy))
    sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * op))
    s = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s.putalpha(sh)
    return Image.alpha_composite(base, s)


# ---------- campos de ruido globais ----------
N_big = fbm(H, W, (300, 150, 75, 37, 18))
N_mid = fbm(H, W, (120, 60, 30, 15, 8))
N_fine = noise(H, W, 3) - 0.5
N_rust = fbm(H, W, (200, 100, 50, 25))
N_fog = fbm(H, W, (400, 200, 100, 50, 25))

# ---------- terreno ----------
t = np.clip(0.5 + 0.9 * N_big, 0, 1)[..., None]
ground = lerp(A(52, 78, 44), A(100, 128, 64), t)
dm = np.clip((N_mid - 0.1) * 2.5, 0, 1)[..., None] * 0.45
ground = lerp(ground, A(118, 98, 66), dm)
ground = ground + N_fine[..., None] * 40

X = np.arange(W, dtype=np.float32)[None, :]
Y = np.arange(H, dtype=np.float32)[:, None]
ab = LAYOUT["abismo"]
xl = ab["x_esq"] * S + curve1d(H, 300, 40, 0.35 * S, 0.12 * S)
xr = ab["x_dir"] * S + curve1d(H, 300, 40, 0.35 * S, 0.12 * S)
chasm_b = (X > xl[:, None]) & (X < xr[:, None])
d_in = ndi.distance_transform_edt(chasm_b).astype(np.float32)
d_out = ndi.distance_transform_edt(~chasm_b).astype(np.float32)

# borda rochosa do abismo (lado do terreno)
lip = np.clip(1 - d_out / (0.55 * S), 0, 1) ** 0.8
rock = lerp(A(88, 82, 76), A(138, 130, 118), np.clip(0.5 + 0.9 * N_mid, 0, 1)[..., None])
ground = lerp(ground, rock, (lip * 0.92)[..., None])
ground = ground * (1 - 0.55 * np.clip(1 - d_out / 6, 0, 1))[..., None]

# interior do abismo
rockc = np.clip(38 + 22 * N_mid, 0, 255)
col_rock = np.stack([rockc * 1.05, rockc, rockc], -1)
tt = np.clip(d_in / (1.7 * S), 0, 1) ** 0.8
chasm = lerp(col_rock, A(9, 12, 19), tt[..., None])
xc = 15 * S + curve1d(H, 250, 60, 0.55 * S, 0.08 * S)
band = np.exp(-(((X - xc[:, None]) / (0.85 * S)) ** 2))
def noise_aniso(h, w, cx, cy):
    gh, gw = h // cy + 3, w // cx + 3
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g).resize((gw * cx, gh * cy), Image.BICUBIC)
    return np.array(im)[:h, :w].astype(np.float32)


# espuma do rio: riscos longos no sentido da correnteza (norte-sul)
foam = ndi.gaussian_filter(np.clip(noise_aniso(H, W, 6, 46) - 0.6, 0, 1) * 2.4, 1.2)
vis = band * np.clip((d_in - 0.5 * S) / (1.0 * S), 0, 1)
chasm = lerp(chasm, A(26, 66, 84) * (0.7 + 0.5 * N_mid[..., None]), (vis * 0.9)[..., None])
chasm = chasm + (foam * vis * 80)[..., None]

m = ndi.gaussian_filter(chasm_b.astype(np.float32), 1.2)[..., None]
base = lerp(ground, chasm, m)

# estrada de terra nas duas margens
y_top = 7 * S + curve1d(W, 260, 50, 0.22 * S, 0.07 * S)
y_bot = 13 * S + curve1d(W, 260, 50, 0.22 * S, 0.07 * S)
xs = np.arange(W)[None, :]
road_b = (Y > y_top[None, :]) & (Y < y_bot[None, :]) & ((xs < 9 * S) | (xs > 21 * S))
road_m = ndi.gaussian_filter(road_b.astype(np.float32), 2.5)
rc = lerp(A(122, 100, 70), A(158, 132, 94), np.clip(0.5 + 0.9 * N_mid, 0, 1)[..., None])
ruts = np.exp(-(((Y - 9 * S) / (0.17 * S)) ** 2)) + np.exp(-(((Y - 11 * S) / (0.17 * S)) ** 2))
rc = rc * (1 - 0.28 * ruts)[..., None] + N_fine[..., None] * 30
base = lerp(base, rc, (road_m * 0.95)[..., None])

BASE_IMG = to_rgb(base).convert("RGBA")
del base, ground, chasm, rc, rock, col_rock


# ---------- nevoa ----------
def fog_layer(sc, sr, sb):
    tf = np.clip(0.5 + 1.0 * N_fog, 0, 1) ** 1.6
    wc = np.exp(-(((X - 15 * S) / (4.2 * S)) ** 2))
    wr = np.clip((X - 21 * S) / (7 * S), 0, 1)
    dens = np.clip(wc * sc + wr * sr + sb, 0, 1)
    a = (tf * dens * 255 * 0.85).astype(np.uint8)
    lay = Image.new("RGBA", (W, H), (214, 223, 232, 0))
    lay.putalpha(Image.fromarray(a))
    return lay


# ---------- pedras de entrada da ponte e seixos ----------
def draw_pad(d, x0, y0, x1, y1):
    d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=(44, 42, 42, 255))
    y = y0 * S
    while y < y1 * S:
        x = x0 * S
        rh = random.uniform(0.28, 0.36) * S
        while x < x1 * S:
            sw = random.uniform(0.28, 0.46) * S
            g = random.randint(104, 150)
            ex, ey = min(x + sw, x1 * S) - 2, min(y + rh, y1 * S) - 2
            if ex - (x + 2) > 12 and ey - (y + 2) > 12:
                d.rounded_rectangle([x + 2, y + 2, ex, ey], radius=8, fill=(g, g - 3, g - 8, 255))
                d.line([x + 6, y + 6, ex - 6, y + 6], fill=(255, 255, 255, 40), width=2)
            x += sw
        y += rh


PADS = new_layer()
pd = ImageDraw.Draw(PADS)
draw_pad(pd, 8, 6, 9, 14)
draw_pad(pd, 21, 6, 22, 14)

PEB = new_layer()
bd = ImageDraw.Draw(PEB)
for _ in range(900):
    px = random.choice([random.uniform(0, 8), random.uniform(22, 30)]) * S
    py = random.uniform(6.8, 13.2) * S
    if road_m[int(py) % H, int(px) % W] > 0.7:
        r = random.uniform(2, 6)
        g = random.randint(110, 170)
        bd.ellipse([px - r, py - r * 0.8, px + r, py + r * 0.8], fill=(g, g - 8, g - 18, 255))
        bd.ellipse([px - r * .5 - 1, py - r * .5 - 1, px, py], fill=(min(255, g + 40),) * 3 + (150,))

# ---------- ponte ----------
PB = LAYOUT["ponte"]
BX0, BX1, BY0, BY1 = PB["x0"] * S, PB["x1"] * S, PB["y0"] * S, PB["y1"] * S


def build_deck_texture():
    col = A(72, 75, 80) + N_big[..., None] * 22 + N_fine[..., None] * 30
    rust_t = np.clip((N_rust - 0.12) * 2.4, 0, 1)[..., None] * 0.6
    col = lerp(col, A(124, 74, 42), rust_t)
    img = to_rgb(col)
    d = ImageDraw.Draw(img, "RGBA")
    for px in range(PB["x0"], PB["x1"], 2):
        for py in range(PB["y0"], PB["y1"], 2):
            x0, y0, x1, y1 = px * S, py * S, (px + 2) * S, (py + 2) * S
            tint = random.choice([(255, 255, 255, random.randint(6, 22)), (0, 0, 0, random.randint(8, 26))])
            d.rectangle([x0, y0, x1, y1], fill=tint)
            d.line([x0, y0, x1, y0], fill=(0, 0, 0, 170), width=4)
            d.line([x0, y1, x1, y1], fill=(0, 0, 0, 170), width=4)
            d.line([x0, y0, x0, y1], fill=(0, 0, 0, 170), width=4)
            d.line([x1, y0, x1, y1], fill=(0, 0, 0, 170), width=4)
            d.line([x0 + 4, y0 + 4, x1 - 4, y0 + 4], fill=(255, 255, 255, 50), width=2)
            d.line([x0 + 4, y0 + 4, x0 + 4, y1 - 4], fill=(255, 255, 255, 40), width=2)
            for rx, ry in [(x0 + 22, y0 + 22), (x1 - 22, y0 + 22), (x0 + 22, y1 - 22), (x1 - 22, y1 - 22)]:
                d.ellipse([rx - 4, ry - 3, rx + 8, ry + 9], fill=(0, 0, 0, 90))
                d.ellipse([rx - 6, ry - 6, rx + 6, ry + 6], fill=(52, 52, 57, 255))
                d.ellipse([rx - 4, ry - 5, rx + 1, ry], fill=(150, 150, 158, 200))
    # vigas de borda
    for (ya, yb) in [(BY0, BY0 + int(0.3 * S)), (BY1 - int(0.3 * S), BY1)]:
        d.rectangle([BX0, ya, BX1, yb], fill=(40, 42, 46, 255))
        d.line([BX0, ya + 3, BX1, ya + 3], fill=(255, 255, 255, 45), width=2)
        d.line([BX0, yb - 1, BX1, yb - 1], fill=(0, 0, 0, 200), width=3)
        for rx in range(BX0 + 25, BX1, int(0.5 * S)):
            d.ellipse([rx - 4, (ya + yb) // 2 - 4, rx + 4, (ya + yb) // 2 + 4], fill=(96, 96, 104, 255))
    # riscos e desgaste
    for _ in range(420):
        x = random.uniform(BX0, BX1)
        y = random.uniform(BY0, BY1)
        a = random.uniform(0, math.pi)
        l = random.uniform(8, 38)
        d.line([x, y, x + l * math.cos(a), y + l * math.sin(a)], fill=(205, 205, 210, 34), width=1)
    return img


DECK_TEX = build_deck_texture()
GAP_L = [(PB["y0"] - 0.2 + k * 0.3) * S for k in range(int((PB["y1"] - PB["y0"] + 0.4) / 0.3) + 2)]
_dz = LAYOUT["desabamento"]
GAP_POLY = None


def gap_polygon():
    left, right = [], []
    for yy in GAP_L:
        left.append((_dz["x0"] * S + random.uniform(-0.38, 0.3) * S, yy))
        right.append((_dz["x1"] * S + random.uniform(-0.3, 0.38) * S, yy))
    return left + right[::-1]


GAP_POLY = gap_polygon()


def deck_parts(collapsed):
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([BX0, BY0, BX1 - 1, BY1 - 1], fill=255)
    if collapsed:
        md.polygon(GAP_POLY, fill=0)
    soft = mask.filter(ImageFilter.GaussianBlur(0.8))
    tex = DECK_TEX.convert("RGBA")
    tex.putalpha(soft)
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(9)))
    ed = Image.new("RGBA", (W, H), (18, 16, 16, 0))
    ed.putalpha(edge.point(lambda v: int(v * 0.8)))
    tex = Image.alpha_composite(tex, ed)
    # grade dos trilhos
    rl = new_layer()
    d = ImageDraw.Draw(rl)
    for yy in (BY0 + 0.1 * S, BY1 - 0.1 * S):
        d.line([BX0, yy, BX1, yy], fill=(26, 26, 30, 255), width=8)
        d.line([BX0, yy - 2, BX1, yy - 2], fill=(120, 120, 128, 255), width=2)
        for px in range(PB["x0"], PB["x1"] + 1, 2):
            d.ellipse([px * S - 10, yy - 10, px * S + 10, yy + 10], fill=(24, 24, 28, 255))
            d.ellipse([px * S - 6, yy - 7, px * S + 4, yy + 3], fill=(128, 128, 136, 255))
    rl.putalpha(ImageChops.multiply(rl.getchannel("A"), mask))
    return mask, tex, rl


def chain(d, p0, p1, p2, links=16):
    for i in range(links):
        tq = i / (links - 1)
        x = (1 - tq) ** 2 * p0[0] + 2 * (1 - tq) * tq * p1[0] + tq ** 2 * p2[0]
        y = (1 - tq) ** 2 * p0[1] + 2 * (1 - tq) * tq * p1[1] + tq ** 2 * p2[1]
        if i % 2:
            d.ellipse([x - 8, y - 4, x + 8, y + 4], outline=(48, 48, 54, 255), width=3)
        else:
            d.ellipse([x - 4, y - 8, x + 4, y + 8], outline=(70, 70, 78, 255), width=3)


def collapse_extras():
    L = new_layer()
    d = ImageDraw.Draw(L)
    x0, x1 = _dz["x0"] * S, _dz["x1"] * S
    # trilhos tortos
    for pts in ([(x0 + 5, BY0 + 0.1 * S), (x0 + 0.65 * S, BY0 + 0.55 * S), (x0 + 0.95 * S, BY0 + 1.4 * S)],
                [(x1 - 5, BY1 - 0.1 * S), (x1 - 0.55 * S, BY1 - 0.6 * S), (x1 - 0.9 * S, BY1 - 1.45 * S)]):
        d.line(pts, fill=(26, 26, 30, 255), width=8, joint="curve")
        d.line([(px, py - 2) for px, py in pts], fill=(120, 120, 128, 255), width=2, joint="curve")
    # correntes
    chain(d, (x0 + 5, 9.2 * S), (x0 + 0.7 * S, 10.3 * S), (x0 + 1.2 * S, 9.9 * S))
    chain(d, (x1 - 5, 10.8 * S), (x1 - 0.7 * S, 11.5 * S), (x1 - 1.25 * S, 10.2 * S))
    # estilhacos de placa caindo
    for _ in range(10):
        cx = random.uniform(x0 + 0.5 * S, x1 - 0.5 * S)
        cy = random.uniform(BY0 - 0.2 * S, BY1 + 0.3 * S)
        r = random.uniform(0.14, 0.34) * S
        k = random.randint(4, 6)
        pts = [(cx + r * random.uniform(.5, 1.1) * math.cos(2 * math.pi * i / k + random.uniform(-.3, .3)),
                cy + r * random.uniform(.5, 1.1) * math.sin(2 * math.pi * i / k + random.uniform(-.3, .3)))
               for i in range(k)]
        g = random.randint(62, 92)
        d.polygon(pts, fill=(g + 10, g - 2, g - 6, 235), outline=(26, 24, 24, 255))
    return L


# ---------- props ----------
def draw_rock(d, cx, cy, r):
    cx *= S; cy *= S; r *= S
    k = random.randint(7, 10)
    pts = []
    for i in range(k):
        a = 2 * math.pi * i / k + random.uniform(-.2, .2)
        rr = r * random.uniform(.72, 1.05)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    g = random.randint(96, 128)
    d.polygon(pts, fill=(g, g - 4, g - 8, 255), outline=(40, 38, 36, 255))
    hp = [(cx + (x - cx) * .62 - r * .12, cy + (y - cy) * .62 - r * .14) for x, y in pts]
    d.polygon(hp, fill=(min(255, g + 34), min(255, g + 30), min(255, g + 24), 255))
    for _ in range(3):
        a = random.uniform(0, 2 * math.pi)
        d.line([cx, cy, cx + r * .8 * math.cos(a), cy + r * .8 * math.sin(a)], fill=(50, 48, 46, 120), width=2)


def draw_log(d, x0, y0, x1, y1, w):
    d.line([x0, y0, x1, y1], fill=(52, 34, 20, 255), width=w + 6)
    d.line([x0, y0, x1, y1], fill=(112, 76, 44, 255), width=w)
    d.line([x0 - w * .14, y0, x1 - w * .14, y1], fill=(146, 104, 62, 255), width=int(w * .42))
    for _ in range(16):
        tq = random.random()
        px, py = x0 + (x1 - x0) * tq, y0 + (y1 - y0) * tq
        ox = random.uniform(-w * .4, w * .4)
        d.line([px + ox, py, px + ox + random.uniform(-2, 2), py + random.uniform(10, 26)],
               fill=(60, 40, 24, 150), width=2)
    for (cx, cy) in ((x0, y0), (x1, y1)):
        d.ellipse([cx - w / 2, cy - w * .22, cx + w / 2, cy + w * .22], fill=(186, 152, 104, 255),
                  outline=(70, 48, 28, 255), width=3)
        d.ellipse([cx - w * .28, cy - w * .1, cx + w * .28, cy + w * .1], outline=(130, 96, 60, 255), width=2)


def draw_crate(d, cx, cy, s=0.9):
    cx *= S; cy *= S; h = s * S / 2
    d.rectangle([cx - h, cy - h, cx + h, cy + h], fill=(130, 94, 56, 255), outline=(46, 30, 18, 255), width=4)
    d.rectangle([cx - h + 9, cy - h + 9, cx + h - 9, cy + h - 9], outline=(86, 58, 34, 255), width=4)
    d.line([cx - h + 9, cy - h + 9, cx + h - 9, cy + h - 9], fill=(86, 58, 34, 255), width=4)
    d.line([cx - h + 9, cy + h - 9, cx + h - 9, cy - h + 9], fill=(86, 58, 34, 255), width=4)
    d.line([cx - h + 3, cy - h + 3, cx + h - 3, cy - h + 3], fill=(190, 150, 100, 120), width=2)


def draw_barrel(d, cx, cy, r=0.4):
    cx *= S; cy *= S; r *= S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(112, 78, 46, 255), outline=(44, 28, 16, 255), width=4)
    d.ellipse([cx - r * .78, cy - r * .78, cx + r * .78, cy + r * .78], outline=(60, 60, 66, 255), width=5)
    d.ellipse([cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5], fill=(140, 102, 62, 255), outline=(70, 48, 28, 255), width=3)


def build_wagon(L):
    d = ImageDraw.Draw(L)
    wx, wy = LAYOUT["carroca"]["x"], LAYOUT["carroca"]["y"]
    # varal / lanca
    d.rectangle([(wx + 2.85) * S, (wy + 0.92) * S, (wx + 3.75) * S, (wy + 1.08) * S], fill=(84, 56, 32, 255), outline=(36, 24, 14, 255), width=3)
    # rodas
    for rx in (wx + 1.25, wx + 2.35):
        for ry in (wy - 0.04, wy + 1.86):
            d.rounded_rectangle([(rx - 0.46) * S, ry * S, (rx + 0.46) * S, (ry + 0.2) * S], radius=6,
                                fill=(46, 32, 20, 255), outline=(20, 14, 8, 255), width=2)
            for k in range(-3, 4):
                d.line([(rx + k * 0.13) * S, ry * S + 2, (rx + k * 0.13) * S, (ry + 0.2) * S - 2], fill=(86, 62, 38, 255), width=2)
    # caixa de madeira
    d.rectangle([(wx + 0.08) * S, (wy + 0.12) * S, (wx + 2.92) * S, (wy + 1.88) * S], fill=(112, 78, 46, 255),
                outline=(40, 26, 14, 255), width=4)
    for k in range(1, 8):
        yy = (wy + 0.12 + k * 0.22) * S
        d.line([(wx + 0.08) * S, yy, (wx + 2.92) * S, yy], fill=(70, 46, 26, 160), width=2)
    # banco do cocheiro
    d.rectangle([(wx + 2.35) * S, (wy + 0.42) * S, (wx + 2.9) * S, (wy + 1.58) * S], fill=(88, 58, 34, 255),
                outline=(36, 24, 14, 255), width=3)
    # lona
    cx0, cy0, cx1, cy1 = (wx + 0.28) * S, (wy + 0.22) * S, (wx + 2.3) * S, (wy + 1.78) * S
    cover = new_layer()
    cd = ImageDraw.Draw(cover)
    yc = (cy0 + cy1) / 2
    half = (cy1 - cy0) / 2
    for yy in range(int(cy0), int(cy1) + 1):
        f = 1 - 0.32 * abs(yy - yc) / half
        cd.line([cx0, yy, cx1, yy], fill=(int(214 * f), int(200 * f), int(168 * f), 255), width=1)
    for k in range(1, 5):
        xx = cx0 + (cx1 - cx0) * k / 5
        cd.line([xx, cy0, xx, cy1], fill=(120, 106, 80, 170), width=4)
        cd.line([xx + 4, cy0, xx + 4, cy1], fill=(255, 250, 230, 60), width=2)
    cm = Image.new("L", (W, H), 0)
    ImageDraw.Draw(cm).rounded_rectangle([cx0, cy0, cx1, cy1], radius=26, fill=255)
    cover.putalpha(ImageChops.multiply(cover.getchannel("A"), cm))
    cd2 = ImageDraw.Draw(cover)
    cd2.rounded_rectangle([cx0, cy0, cx1, cy1], radius=26, outline=(70, 58, 40, 255), width=4)
    L.alpha_composite(cover)
    return ImageDraw.Draw(L)


PROPS = new_layer()
pdw = ImageDraw.Draw(PROPS)
for (rx, ry, rr) in LAYOUT["pedras"]:
    draw_rock(pdw, rx, ry, rr)
# pedras extras ao longo da borda do abismo (fora da estrada)
cand = np.argwhere((d_out > 0.7 * S) & (d_out < 1.6 * S))
random.shuffle(cand.tolist()) if False else None
for _ in range(34):
    yy, xx = cand[random.randrange(len(cand))]
    if 5.7 * S < yy < 14.3 * S:
        continue
    draw_rock(pdw, xx / S, yy / S, random.uniform(0.14, 0.32))
build_wagon(PROPS)
pdw = ImageDraw.Draw(PROPS)
bx = LAYOUT["barricada_x"]
draw_log(pdw, (bx + 0.2) * S, 6.4 * S, (bx + 0.35) * S, 9.6 * S, int(0.5 * S))
draw_log(pdw, (bx + 0.95) * S, 6.7 * S, (bx + 0.85) * S, 9.4 * S, int(0.45 * S))
draw_log(pdw, (bx + 0.3) * S, 11.4 * S, (bx + 0.2) * S, 13.6 * S, int(0.5 * S))
draw_log(pdw, (bx + 0.9) * S, 11.6 * S, (bx + 1.0) * S, 13.4 * S, int(0.45 * S))
# panos vermelhos da quadrilha
for (px, py) in [(bx + 0.55, 9.5), (bx + 0.6, 11.5)]:
    pdw.polygon([(px * S, py * S), ((px + 0.3) * S, (py + 0.05) * S), ((px + 0.22) * S, (py + 0.22) * S),
                 ((px + 0.04) * S, (py + 0.16) * S)], fill=(168, 36, 36, 255), outline=(80, 14, 14, 255))
for (cx, cy) in LAYOUT["caixotes"]:
    draw_crate(pdw, cx, cy)
for (cx, cy) in LAYOUT["barris"]:
    draw_barrel(pdw, cx, cy)

# ---------- copas de arvores e arbustos ----------
TREES = new_layer()
td = ImageDraw.Draw(TREES)


def draw_canopy(d, cx, cy, r, dark=(28, 56, 32), light=(92, 128, 60)):
    cx *= S; cy *= S; r *= S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=dark + (255,), outline=(16, 34, 20, 255))
    blobs = []
    for _ in range(int(40 + 40 * r / S)):
        a = random.uniform(0, 2 * math.pi)
        rr = r * math.sqrt(random.random()) * 0.84
        blobs.append((rr, a))
    blobs.sort(reverse=True)
    for rr, a in blobs:
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
        br = r * random.uniform(.2, .36)
        lx = ((x - cx) * -0.6 + (y - cy) * -0.8) / r
        tq = float(np.clip(0.5 + 0.45 * lx - 0.35 * rr / r + random.uniform(-.12, .12), 0, 1))
        col = tuple(int(a_ + (b_ - a_) * tq) for a_, b_ in zip(dark, light))
        d.ellipse([x - br, y - br, x + br, y + br], fill=col + (255,), outline=(20, 40, 24, 255))
    for _ in range(int(50 * r / S)):
        a = random.uniform(0, 2 * math.pi)
        rr = r * math.sqrt(random.random()) * 0.7
        x, y = cx + rr * math.cos(a) - r * .1, cy + rr * math.sin(a) - r * .1
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(150, 184, 96, 170))


for (cx, cy, r) in LAYOUT["arvores"]:
    draw_canopy(td, cx, cy, r)
BUSH = new_layer()
bsd = ImageDraw.Draw(BUSH)
for (cx, cy, r) in LAYOUT["arbustos"]:
    draw_canopy(bsd, cx, cy, r, dark=(34, 62, 34), light=(100, 134, 64))

# ---------- brilho do lampiao ----------
lw = int(6 * S)
gx, gy = int((LAYOUT["carroca"]["x"] + 2.8) * S), int((LAYOUT["carroca"]["y"] + 0.2) * S)
yy_, xx_ = np.mgrid[0:lw, 0:lw].astype(np.float32)
rg = np.sqrt((xx_ - lw / 2) ** 2 + (yy_ - lw / 2) ** 2)
ga = (110 * np.exp(-((rg / (1.3 * S)) ** 2))).astype(np.uint8)
glow_patch = Image.new("RGBA", (lw, lw), (255, 196, 108, 0))
glow_patch.putalpha(Image.fromarray(ga))
GLOW = new_layer()
GLOW.paste(glow_patch, (gx - lw // 2, gy - lw // 2))
gd = ImageDraw.Draw(GLOW)
gd.ellipse([gx - 7, gy - 7, gx + 7, gy + 7], fill=(255, 226, 150, 255), outline=(90, 60, 20, 255), width=3)

# ---------- vinheta ----------
VIG = 1 - 0.28 * np.clip(np.sqrt(((X - W / 2) / (W / 2)) ** 2 + ((Y - H / 2) / (H / 2)) ** 2) - 0.55, 0, 1) ** 1.5


# ---------- montagem ----------
def grid_layer():
    L = new_layer()
    d = ImageDraw.Draw(L)
    for i in range(GW + 1):
        x = min(i * S, W - 2)
        d.line([x, 0, x, H], fill=(0, 0, 0, 120), width=1)
        d.line([x + 1, 0, x + 1, H], fill=(255, 255, 255, 80), width=1)
    for j in range(GH + 1):
        y = min(j * S, H - 2)
        d.line([0, y, W, y], fill=(0, 0, 0, 120), width=1)
        d.line([0, y + 1, W, y + 1], fill=(255, 255, 255, 80), width=1)
    return L


def finish(img):
    arr = np.array(img.convert("RGB")).astype(np.float32) * VIG[..., None]
    return to_rgb(arr)


def render(phase):
    collapsed = phase == 2
    img = BASE_IMG.copy()
    img = Image.alpha_composite(img, fog_layer(0.6 if collapsed else 1.0, 0.0, 0.0))
    img = drop_shadow(img, PADS, 6, 9, 5, 0.55)
    img = Image.alpha_composite(img, PADS)
    img = Image.alpha_composite(img, PEB)
    mask, tex, rl = deck_parts(collapsed)
    img = drop_shadow(img, tex, int(0.4 * S), int(0.55 * S), int(0.35 * S), 0.6)
    img = Image.alpha_composite(img, tex)
    img = drop_shadow(img, rl, 5, 8, 3, 0.55)
    img = Image.alpha_composite(img, rl)
    if collapsed:
        ex = collapse_extras()
        img = drop_shadow(img, ex, 9, 14, 5, 0.6)
        img = Image.alpha_composite(img, ex)
    img = drop_shadow(img, PROPS, 6, 9, 5, 0.5)
    img = Image.alpha_composite(img, PROPS)
    img = Image.alpha_composite(img, GLOW)
    img = Image.alpha_composite(img, fog_layer(0.1 if collapsed else 0.25, 0.08 if collapsed else 0.45, 0.03 if collapsed else 0.08))
    img = drop_shadow(img, BUSH, 6, 9, 5, 0.5)
    img = Image.alpha_composite(img, BUSH)
    img = drop_shadow(img, TREES, 14, 20, 14, 0.55)
    img = Image.alpha_composite(img, TREES)
    return finish(img)


DPI = (round(S / (LAYOUT["cm_por_quadrado"] / 2.54)),) * 2
GRID = grid_layer()
GRID.save(os.path.join(OUT, "grade_sobreposicao.png"), dpi=DPI)
for ph, nome in ((1, "fase1_ponte_inteira"), (2, "fase2_ponte_desabada")):
    im = render(ph)
    im.save(os.path.join(OUT, f"ponte_{nome}_sem_grade.png"), dpi=DPI)
    im2 = Image.alpha_composite(im.convert("RGBA"), GRID).convert("RGB")
    im2.save(os.path.join(OUT, f"ponte_{nome}_com_grade.png"), dpi=DPI)
    im2.resize((W // 2, H // 2), Image.LANCZOS).save(f"/tmp/prev_{ph}.png")
print("ok", W, H, DPI)
