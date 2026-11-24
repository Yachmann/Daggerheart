"""Orquestrador: junta terreno, estruturas, objetos, luz e nevoa na ordem de camadas do traco."""
import copy
import json
import math
import random

import numpy as np
from PIL import Image, ImageDraw

from . import catalogo as C
from . import sprites
from .camadas import nova, sombra, colocar
from .estilo import BIOMAS, CLIMAS, FORMAS
from .estruturas import desenhar_ponte
from .geradores import expandir
from .ruido import Campos
from . import terreno as T


def _merge(a, b):
    out = copy.deepcopy(a)
    for k, v in (b or {}).items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else copy.deepcopy(v)
    return out


class Mapa:
    def __init__(self, spec, px=None):
        self.spec = spec
        self.S = px or spec["px_por_quadrado"]
        self.k = self.S / 100.0
        self.GW, self.GH = spec["grade"]
        self.W, self.H = self.GW * self.S, self.GH * self.S
        self.campos = Campos(self.W, self.H, self.S, spec["seed"])
        self._cache = {}
        self.bio = BIOMAS[spec["bioma"]]
        self.avisos = []   # problemas notados ao desenhar (ex.: gerador que nao coube); a saida os mostra

    def rnd(self, *partes):
        return random.Random(f"{self.spec['seed']}|" + "|".join(map(str, partes)))

    # ---------- fases ----------
    def _resolver(self, fid):
        R = {}
        for sec in ("regioes", "linhas", "estruturas", "objetos"):
            out = []
            for i, e in enumerate(self.spec.get(sec, [])):
                if e.get("fases") and fid not in e["fases"]:
                    continue
                e2 = copy.deepcopy(e)
                e2.update(e2.pop("por_fase", {}).get(fid, {}))
                e2.pop("por_fase", None)
                e2["_i"] = i
                out.append(e2)
            R[sec] = out
        fase = next(f for f in self.spec["fases"] if f["id"] == fid)
        R["luz"] = _merge(self.spec.get("luz", {}), fase.get("luz", {}))
        return R

    def _terreno(self, R):
        chave = json.dumps([R["regioes"], R["linhas"], R["estruturas"]], sort_keys=True)
        if chave not in self._cache:
            self._cache[chave] = T.construir(self, R)
        return self._cache[chave]

    # ---------- luz ----------
    def _nevoa(self, luz, terr, acima):
        c, S = self.campos, self.S
        nv = luz.get("nevoa") or {}
        dens = np.zeros((self.H, self.W), np.float32)
        if terr.abismo is not None and nv.get("sobre_abismo"):
            dens += terr.abismo * nv["sobre_abismo"] * (0.25 if acima else 1.0)
        if acima:
            dens += nv.get("densidade", 0)
            for fo in nv.get("focos", []):
                g = np.exp(-((((c.X - fo["x"] * S) / (fo["rx"] * S)) ** 2) + (((c.Y - fo["y"] * S) / (fo["ry"] * S)) ** 2)))
                dens += g.astype(np.float32) * fo["densidade"]
        if not dens.any():
            return None
        tf = np.clip(0.5 + c.fog, 0, 1) ** 1.6
        a = (tf * np.clip(dens, 0, 1) * 255 * 0.85).astype(np.uint8)
        lay = Image.new("RGBA", (self.W, self.H), (214, 223, 232, 0))
        lay.putalpha(Image.fromarray(a))
        return lay

    def _brilho(self, fontes):
        S = self.S
        lay = nova(self.W, self.H)
        for (x, y, cor, raio, inten) in fontes:
            half = int(2 * raio * S)
            n = 2 * half
            yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
            rg = np.sqrt((xx - half) ** 2 + (yy - half) ** 2)
            a = (200 * inten * np.exp(-((rg / (0.65 * raio * S)) ** 2))).astype(np.uint8)
            patch = Image.new("RGBA", (n, n), tuple(cor) + (0,))
            patch.putalpha(Image.fromarray(a))
            colocar(lay, patch, x, y)
        return lay

    def _escuridao(self, esc, fontes):
        S = self.S
        dk = np.full((self.H, self.W), esc, np.float32)
        for (x, y, cor, raio, inten) in fontes:
            half = int(2.2 * raio * S)
            y0, y1, x0, x1 = max(0, int(y) - half), min(self.H, int(y) + half), max(0, int(x) - half), min(self.W, int(x) + half)
            if y1 <= y0 or x1 <= x0:
                continue
            yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
            f = np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (0.9 * raio * S) ** 2)) * inten * 1.3
            dk[y0:y1, x0:x1] -= f
        return np.clip(dk, 0, 0.92)

    # ---------- objetos ----------
    def _objetos(self, R, terr):
        S, k = self.S, self.k
        cam = {"piso": None, "chao": nova(self.W, self.H), "alto1": None, "alto2": None}
        fontes = []
        itens = expandir(self, R, terr) + [(t, p, 10000 + i) for i, (t, p) in enumerate(terr.extras)]
        for tipo, o, idx in itens:
            camada = C.OBJETOS[tipo]["camada"]
            if cam.get(camada) is None:
                cam[camada] = nova(self.W, self.H)
            L = cam[camada]
            rnd = self.rnd("obj", idx)
            if tipo == "forma":
                d = ImageDraw.Draw(L)
                col = tuple(o.get("cor") or FORMAS[o.get("material", "pedra")])
                pts = [(x * S, y * S) for x, y in o["pontos"]]
                d.polygon(pts, fill=col + (255,), outline=tuple(int(c * .35) for c in col) + (255,))
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
                d.polygon([(cx + (x - cx) * .84 - 3 * k, cy + (y - cy) * .84 - 3 * k) for x, y in pts], fill=tuple(min(255, c + 22) for c in col) + (120,))
                continue
            p = dict(o)
            p["_copa"], p["_arbusto"] = self.bio["copa"], self.bio["arbusto"]
            if tipo == "tronco":
                dx, dy = o["x1"] - o["x0"], o["y1"] - o["y0"]
                p.update(_len=math.hypot(dx, dy), rot=math.degrees(math.atan2(dy, dx)))
                cx, cy = (o["x0"] + o["x1"]) / 2, (o["y0"] + o["y1"]) / 2
            elif tipo == "escada":
                cx, cy = (o["x0"] + o["x1"]) / 2, (o["y0"] + o["y1"]) / 2
            else:
                cx, cy = o["x"], o["y"]
            im, luces = sprites.construir(tipo, p, S, rnd)
            colocar(L, im, cx * S, cy * S)
            for dx, dy, cor, raio, inten in luces:
                fontes.append((cx * S + dx, cy * S + dy, cor, raio, inten))
        return cam, fontes

    # ---------- render ----------
    def render(self, fid):
        S, k, W, H = self.S, self.k, self.W, self.H
        R = self._resolver(fid)
        luz = R["luz"]
        terr = self._terreno(R)
        img = terr.img.copy()

        nb = self._nevoa(luz, terr, acima=False)
        if nb is not None:
            img = Image.alpha_composite(img, nb)
        for i, e in enumerate(R["estruturas"]):
            if e["tipo"] == "ponte":
                img = desenhar_ponte(self, img, e, e["_i"])

        cam, fontes = self._objetos(R, terr)
        for f in luz.get("fontes", []):
            fontes.append((f["x"] * S, f["y"] * S, tuple(f.get("cor") or (255, 196, 108)), f["raio"], f.get("intensidade", 0.6)))
        if cam["piso"] is not None:      # decalques rentes ao chao: tapetes, manchas, circulos; sem sombra
            img = Image.alpha_composite(img, cam["piso"])
        img = sombra(img, cam["chao"], 6, 9, 5, 0.5, k)
        img = Image.alpha_composite(img, cam["chao"])
        if fontes:
            img = Image.alpha_composite(img, self._brilho(fontes))
        na = self._nevoa(luz, terr, acima=True)
        if na is not None:
            img = Image.alpha_composite(img, na)
        if cam["alto1"] is not None:
            img = sombra(img, cam["alto1"], 6, 9, 5, 0.5, k)
            img = Image.alpha_composite(img, cam["alto1"])
        if cam["alto2"] is not None:
            img = sombra(img, cam["alto2"], 14, 20, 14, 0.55, k)
            img = Image.alpha_composite(img, cam["alto2"])
        return self._final(img, luz, fontes)

    def _final(self, img, luz, fontes):
        c = self.campos
        clima = CLIMAS[luz.get("clima") or self.bio["clima"]]
        esc = luz.get("escuridao", clima["escuridao"])
        arr = np.asarray(img.convert("RGB"), np.float32)
        vig = 1 - 0.28 * np.clip(np.sqrt(((c.X - self.W / 2) / (self.W / 2)) ** 2 + ((c.Y - self.H / 2) / (self.H / 2)) ** 2) - 0.55, 0, 1) ** 1.5
        arr = arr * vig[..., None]
        if esc > 0:
            dk = self._escuridao(esc, fontes)[..., None] * 0.9
            arr = arr * (1 - dk) + np.array((8, 10, 22), np.float32) * dk
        arr = arr * np.array(clima["tint"], np.float32)
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    def grade(self):
        S, k = self.S, self.k
        L = nova(self.W, self.H)
        d = ImageDraw.Draw(L)
        for i in range(self.GW + 1):
            x = min(i * S, self.W - 2)
            d.line([x, 0, x, self.H], fill=(0, 0, 0, 120), width=1)
            d.line([x + 1, 0, x + 1, self.H], fill=(255, 255, 255, 80), width=1)
        for j in range(self.GH + 1):
            y = min(j * S, self.H - 2)
            d.line([0, y, self.W, y], fill=(0, 0, 0, 120), width=1)
            d.line([0, y + 1, self.W, y + 1], fill=(255, 255, 255, 80), width=1)
        return L

    def dpi(self):
        return (round(self.S / (self.spec["cm_por_quadrado"] / 2.54)),) * 2
