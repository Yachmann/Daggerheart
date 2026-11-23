"""Texturas de superficie: ruido colorido, lajes de pedra e tabuas de madeira."""
import numpy as np
from PIL import Image, ImageDraw
from .ruido import lerp, A


def cor_ruido(campos, sl, mat):
    """Rampa de cor + manchas + granulacao sobre o recorte `sl` do mapa. Devolve float32 (h, w, 3)."""
    big, mid, fine = campos.big[sl], campos.mid[sl], campos.fine[sl]
    t = np.clip(0.5 + 0.9 * big, 0, 1)[..., None]
    c = lerp(A(*mat["a"]), A(*mat["b"]), t)
    dm = np.clip((mid - 0.1) * 2.5, 0, 1)[..., None] * mat["pk"]
    c = lerp(c, A(*mat["p"]), dm)
    return c + fine[..., None] * mat["g"]


def lajes(h, w, rnd, S, rh=(0.28, 0.36), sw=(0.28, 0.46), g=(104, 150), junta=(44, 42, 42), raio=8):
    """Lajes em fileiras (o mesmo desenho das pedras de entrada da ponte). Devolve float32 (h, w, 3)."""
    k = S / 100.0
    img = Image.new("RGB", (w, h), junta)
    d = ImageDraw.Draw(img, "RGBA")
    y = 0.0
    while y < h:
        hh = rnd.uniform(*rh) * S
        x = -rnd.uniform(0, sw[1]) * S
        while x < w:
            ww = rnd.uniform(*sw) * S
            v = rnd.randint(*g)
            ex, ey = min(x + ww, w) - 2 * k, min(y + hh, h) - 2 * k
            sx, sy = max(x, 0) + 2 * k, y + 2 * k
            if ex - sx > 12 * k and ey - sy > 12 * k:
                d.rounded_rectangle([sx, sy, ex, ey], radius=max(2, int(raio * k)), fill=(v, v - 3, v - 8, 255))
                d.line([sx + 4 * k, sy + 4 * k, ex - 6 * k, sy + 4 * k], fill=(255, 255, 255, 40), width=max(1, int(2 * k)))
            x += ww
        y += hh
    return np.asarray(img, np.float32)


def tabuas(h, w, rnd, S, base=(118, 82, 50)):
    """Tabuas de madeira corridas no sentido horizontal. Devolve float32 (h, w, 3)."""
    k = S / 100.0
    img = Image.new("RGB", (w, h), (30, 20, 12))
    d = ImageDraw.Draw(img, "RGBA")
    y = 0.0
    while y < h:
        pw = rnd.uniform(0.22, 0.30) * S
        x = -rnd.uniform(0, 1.6) * S
        while x < w:
            L = rnd.uniform(1.2, 2.4) * S
            f = rnd.uniform(0.82, 1.14)
            cor = tuple(int(min(255, c * f)) for c in base)
            x0, y0, x1, y1 = max(x, 0), y + 1.5 * k, min(x + L, w), min(y + pw, h) - 1.5 * k
            if x1 > x0 and y1 > y0:
                d.rectangle([x0, y0, x1, y1], fill=cor + (255,))
                for _ in range(3):
                    gy = rnd.uniform(y0 + 2, max(y0 + 3, y1 - 2))
                    d.line([x0 + 4, gy, x1 - 4, gy + rnd.uniform(-1.5, 1.5)], fill=(60, 38, 20, 70), width=max(1, int(1 * k)))
                d.line([x0, y0, x1, y0], fill=(255, 235, 200, 38), width=max(1, int(2 * k)))
                for nx in (x0 + 8 * k, x1 - 8 * k):
                    if x0 < nx < x1:
                        d.ellipse([nx - 2 * k, (y0 + y1) / 2 - 2 * k, nx + 2 * k, (y0 + y1) / 2 + 2 * k], fill=(44, 30, 20, 220))
            x += L
        y += pw
    return np.asarray(img, np.float32)
