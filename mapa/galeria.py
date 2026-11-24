"""Galerias visuais do catalogo: uma folha com todos os objetos (e variantes) e outra com materiais, linhas, portas e janelas.
Servem para escolher itens olhando, e como autoteste: todo tipo do catalogo precisa validar e renderizar.
Uso:  python -m mapa galeria   ->  galeria/objetos.png e galeria/terreno.png"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import catalogo as C
from .estilo import MATERIAIS_ESPECIAIS, MATERIAIS
from .render import Mapa
from .spec import validar

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "galeria"

# variantes mostradas ao lado do item padrao
VARIANTES = {
    "tapete": [{"forma": "redonda", "cor": [40, 70, 120]}], "armadilha": [{"estilo": "placa"}, {"estilo": "fosso"}],
    "mancha": [{"estilo": "queimado"}, {"estilo": "oleo"}, {"estilo": "limo"}],
    "barricada": [{"estilo": "sacos"}, {"estilo": "pedra"}], "sarcofago": [{"aberto": True}],
    "barraca": [{"cor": [50, 90, 170]}], "cristal": [{"cor": [220, 80, 200]}], "mesa": [{"forma": "redonda", "larg": 1.6, "alt": 1.6}],
    "caldeirao": [{"cor": [200, 60, 60]}],
}


def _fonte(tam):
    for f in ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def _rotulo(im, texto, x, y, tam):
    ImageDraw.Draw(im).text((x, y), texto, font=_fonte(tam), fill=(255, 255, 255), stroke_width=max(1, tam // 7), stroke_fill=(0, 0, 0), anchor="ma")


def _item(tipo, cx, cy, extra):
    if tipo == "tronco":
        return {"tipo": tipo, "x0": cx - 1.3, "y0": cy - .3, "x1": cx + 1.3, "y1": cy + .4}
    if tipo == "escada":
        return {"tipo": tipo, "x0": cx - 1, "y0": cy - 1, "x1": cx + 1, "y1": cy + 1, "direcao": "n"}
    if tipo == "forma":
        return {"tipo": tipo, "pontos": [[cx - 1, cy - .3], [cx - .4, cy - 1], [cx + .6, cy - .8], [cx + 1, cy + .2], [cx, cy + 1]], "material": "metal"}
    return dict({"tipo": tipo, "x": cx, "y": cy}, **extra)


def objetos(px=56, log=print):
    celulas = []
    for t in C.OBJETOS:
        celulas.append((t, {}))
        celulas += [(t, v) for v in VARIANTES.get(t, [])]
    for g in C.GERADORES:   # um exemplo de cada gerador no fim
        celulas.append((g, {}))
    cols = 9
    lin = -(-len(celulas) // cols)
    CEL = 5
    GW, GH = cols * CEL, lin * CEL
    objs, rotulos = [], []
    for i, (t, ex) in enumerate(celulas):
        cx, cy = (i % cols) * CEL + CEL / 2, (i // cols) * CEL + CEL / 2 - .2
        if t == "fileira":
            objs.append({"tipo": "fileira", "item": "pilar", "x0": cx - 2, "y0": cy, "x1": cx + 2, "y1": cy, "passo": 1.3})
        elif t == "espalhar":
            objs.append({"tipo": "espalhar", "item": "pedra", "quantidade": 9, "forma": "elipse", "cx": cx, "cy": cy, "rx": 1.9, "ry": 1.7,
                         "distancia_min": .8, "r_min": .25, "r_max": .5})
        else:
            objs.append(_item(t, cx, cy, ex))
        nome = t + (" (" + ", ".join(f"{k}={v}" for k, v in ex.items() if k != "cor" or len(ex) == 1) + ")" if ex else "")
        rotulos.append((nome, cx, cy + 2.15))
    spec = validar({"formato": C.FORMATO, "versao": C.VERSAO, "nome": "Galeria de objetos", "grade": [GW, GH], "bioma": "cidade", "seed": 5, "objetos": objs})
    spec.pop("_avisos", None)
    m = Mapa(spec, px)
    im = m.render(spec["fases"][0]["id"]).convert("RGBA")
    im = Image.alpha_composite(im, m.grade())
    for nome, x, y in rotulos:
        _rotulo(im, nome, x * px, y * px, max(11, int(px * .2)))
    SAIDA.mkdir(exist_ok=True)
    dest = SAIDA / "objetos.png"
    im.convert("RGB").save(dest)
    log(f"  {len(celulas)} celulas -> {dest}")
    return dest


def terreno(px=50, log=print):
    mats = list(MATERIAIS) + MATERIAIS_ESPECIAIS
    regioes, rotulos = [], []
    for i, mat in enumerate(mats):
        x0, y0 = 1 + (i % 5) * 7, 1 + (i // 5) * 5
        regioes.append({"material": mat, "forma": "retangulo", "x0": x0, "y0": y0, "x1": x0 + 6, "y1": y0 + 4, "borda": "reta"})
        rotulos.append((mat, x0 + 3, y0 + 4.15))
    linhas = []
    tipos = ["estrada", "trilha", "calcada", "rio", "riacho", "muro", "cerca", "sebe", "trilho"]
    for i, t in enumerate(tipos):
        x = 2.5 + i * 4
        linhas.append({"tipo": t, "pontos": [[x, 17], [x + .6, 23], [x - .4, 29]], "irregularidade": 0.3})
        rotulos.append((t, x, 29.8))
    est = [
        {"tipo": "sala", "x0": 1, "y0": 32, "x1": 15, "y1": 42, "piso": "marmore", "espessura": .4},
        {"tipo": "sala", "x0": 17, "y0": 32, "x1": 29, "y1": 42, "forma": "redonda", "piso": "pedra", "espessura": .4},
        {"tipo": "sala", "x0": 31, "y0": 32, "x1": 45, "y1": 42, "piso": "madeira", "espessura": .4, "ruina": True},
    ]
    for i, e in enumerate(["fechada", "aberta", "arco", "dupla", "grade", "quebrada"]):
        x = 2.8 + i * 2.2
        est.append({"tipo": "porta", "x": x, "y": 32, "orientacao": "h", "larg": 1.4, "estilo": e})
        rotulos.append((e, x, 30.6 + (i % 2) * .9))
    for i, e in enumerate(["vidro", "aberta", "grade"]):
        est.append({"tipo": "janela", "x": 3 + i * 4, "y": 42, "orientacao": "h", "larg": 1.4, "estilo": e})
        rotulos.append(("janela " + e, 3 + i * 4, 43))
    est.append({"tipo": "porta", "x": 17, "y": 37, "orientacao": "v", "larg": 1.4, "estilo": "arco"})
    rotulos.append(("sala redonda", 23, 42.2))
    rotulos.append(("sala em ruina", 38, 42.2))
    spec = validar({"formato": C.FORMATO, "versao": C.VERSAO, "nome": "Galeria de terreno", "grade": [50, 45], "bioma": "planicie", "seed": 3,
                    "regioes": regioes, "linhas": linhas, "estruturas": est})
    spec.pop("_avisos", None)
    m = Mapa(spec, px)
    im = m.render(spec["fases"][0]["id"]).convert("RGBA")
    for nome, x, y in rotulos:
        _rotulo(im, nome, x * px, y * px, max(11, int(px * .26)))
    SAIDA.mkdir(exist_ok=True)
    dest = SAIDA / "terreno.png"
    im.convert("RGB").save(dest)
    log(f"  -> {dest}")
    return dest
