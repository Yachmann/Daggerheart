"""Utilidades de composicao: camadas RGBA, sombra projetada e colagem de sprites."""
from PIL import Image, ImageFilter


def nova(W, H):
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def sombra(base, layer, dx, dy, blur, op, k=1.0):
    """Sombra projetada (luz vinda do canto superior esquerdo). dx, dy, blur em px para S=100."""
    a = layer.getchannel("A")
    sh = Image.new("L", a.size, 0)
    sh.paste(a, (int(dx * k), int(dy * k)))
    sh = sh.filter(ImageFilter.GaussianBlur(max(0.1, blur * k))).point(lambda v: int(v * op))
    s = Image.new("RGBA", a.size, (0, 0, 0, 0))
    s.putalpha(sh)
    return Image.alpha_composite(base, s)


def colocar(layer, im, cx, cy):
    """Cola `im` centrada em (cx, cy) px, recortando o que sai da camada."""
    x, y = int(round(cx - im.width / 2)), int(round(cy - im.height / 2))
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1, sy1 = min(im.width, layer.width - x), min(im.height, layer.height - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    layer.alpha_composite(im.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))
