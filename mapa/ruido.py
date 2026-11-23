"""Campos de ruido e utilidades numericas. Sao a 'textura' do traco: mudar aqui muda todos os mapas."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RES = Image.Resampling


def lerp(a, b, t):
    return a * (1 - t) + b * t


def A(*c):
    return np.array(c, np.float32)


def to_rgb(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


class Campos:
    """Campos de ruido do mapa inteiro, gerados uma vez por mapa (mesma seed = mesmo mapa)."""

    def __init__(self, W, H, S, seed):
        self.W, self.H, self.S = W, H, S
        self.rng = np.random.default_rng(seed)
        k = S / 100.0

        def c(*v):
            return tuple(max(2, int(round(x * k))) for x in v)

        self.big = self._fbm(c(300, 150, 75, 37, 18))
        self.mid = self._fbm(c(120, 60, 30, 15, 8))
        self.fine = self.ruido(c(3)[0]) - 0.5
        self.rust = self._fbm(c(200, 100, 50, 25))
        self.fog = self._fbm(c(400, 200, 100, 50, 25))
        self.edge = self._fbm(c(260, 130, 65, 32, 16))
        self.X = np.arange(W, dtype=np.float32)[None, :]
        self.Y = np.arange(H, dtype=np.float32)[:, None]
        self._an = {}

    def ruido(self, cell, cell_y=None):
        cy = cell_y or cell
        gh, gw = self.H // cy + 3, self.W // cell + 3
        g = self.rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray(g).resize((gw * cell, gh * cy), RES.BICUBIC)
        return np.array(im)[:self.H, :self.W].astype(np.float32)

    def _fbm(self, cells):
        out = np.zeros((self.H, self.W), np.float32)
        tot = 0.0
        for i, cell in enumerate(cells):
            wt = 0.55 ** i
            out += (self.ruido(cell) - 0.5) * wt
            tot += wt
        return out / tot * 2.0

    def listras(self, eixo):
        """Ruido esticado numa direcao (espuma de correnteza). eixo: 'vertical' ou 'horizontal'."""
        if eixo not in self._an:
            k = self.S / 100.0
            a, b = max(2, int(6 * k)), max(2, int(46 * k))
            self._an[eixo] = self.ruido(a, b) if eixo == "vertical" else self.ruido(b, a)
        return self._an[eixo]


def campo_local(campo, h, w, oy=0, ox=0):
    """Pedaco h x w de um campo global, com wrap (para sprites maiores que o mapa)."""
    H, W = campo.shape
    return campo[np.ix_((np.arange(h) + oy) % H, (np.arange(w) + ox) % W)]
