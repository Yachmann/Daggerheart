"""Terreno: fundo do bioma, regioes de material, estradas/rios, salas e paredes. Resultado cacheavel por fase."""
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

from .camadas import nova, sombra, colocar
from .estilo import BIOMAS, MATERIAIS, PISO_PADRAO
from .materiais import cor_ruido, lajes, tabuas
from .ruido import lerp, A


class Terreno:
    def __init__(self, img, bloqueio, abismo, extras):
        self.img, self.bloqueio, self.abismo, self.extras = img, bloqueio, abismo, extras


# ---------- mascaras ----------
def mask_forma(m, e):
    S = m.S
    im = Image.new("L", (m.W, m.H), 0)
    d = ImageDraw.Draw(im)
    f = e["forma"]
    if f == "retangulo":
        d.rectangle([e["x0"] * S, e["y0"] * S, e["x1"] * S, e["y1"] * S], fill=255)
    elif f == "elipse":
        d.ellipse([(e["cx"] - e["rx"]) * S, (e["cy"] - e["ry"]) * S, (e["cx"] + e["rx"]) * S, (e["cy"] + e["ry"]) * S], fill=255)
    else:
        d.polygon([(x * S, y * S) for x, y in e["pontos"]], fill=255)
    return np.asarray(im) > 127


def mask_linha(m, pontos, largura_sq):
    S = m.S
    im = Image.new("L", (m.W, m.H), 0)
    d = ImageDraw.Draw(im)
    pts = [(x * S, y * S) for x, y in pontos]
    d.line(pts, fill=255, width=max(1, int(largura_sq * S)), joint="curve")
    return np.asarray(im) > 127


def mask_rect(m, x0, y0, x1, y1):
    S = m.S
    r = np.zeros((m.H, m.W), bool)
    a, b = max(0, int(round(min(y0, y1) * S))), min(m.H, int(round(max(y0, y1) * S)))
    c, d = max(0, int(round(min(x0, x1) * S))), min(m.W, int(round(max(x0, x1) * S)))
    if b > a and d > c:
        r[a:b, c:d] = True
    return r


def _bbox(mask, margem, H, W):
    ys, xs = np.where(mask.any(1))[0], np.where(mask.any(0))[0]
    if not len(ys):
        return None
    return (slice(max(0, ys[0] - margem), min(H, ys[-1] + 1 + margem)), slice(max(0, xs[0] - margem), min(W, xs[-1] + 1 + margem)))


def deslocar(pts, dist):
    out, n = [], len(pts)
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        out.append((pts[i][0] - dy / L * dist, pts[i][1] + dx / L * dist))
    return out


# ---------- cor por material ----------
def _cor_material(m, mat, sl, d_in, d_out, rnd, corrente, bio):
    c, S, k = m.campos, m.S, m.k
    h, w = d_in.shape
    mid, fine = c.mid[sl], c.fine[sl]
    if mat in MATERIAIS:
        return cor_ruido(c, sl, MATERIAIS[mat])
    if mat == "pedra":
        t = lajes(h, w, rnd, S, rh=(0.6, 0.9), sw=(0.7, 1.3), g=bio["lajes"], raio=14)
        return t * (0.9 + 0.2 * np.clip(0.5 + mid, 0, 1))[..., None] + fine[..., None] * 18
    if mat == "madeira":
        return tabuas(h, w, rnd, S) * (0.92 + 0.16 * np.clip(0.5 + mid, 0, 1))[..., None]
    if mat == "agua":
        col = lerp(A(34, 80, 106), A(72, 134, 156), np.clip(0.5 + 0.9 * mid, 0, 1)[..., None])
        col = col * (1 - 0.4 * np.clip(d_in / (2.2 * S), 0, 1))[..., None] + fine[..., None] * 30
        shore = np.clip(1 - d_in / (0.45 * S), 0, 1) ** 1.5
        col = lerp(col, A(190, 214, 224), (shore * 0.45)[..., None])
        if corrente:
            foam = ndi.gaussian_filter(np.clip(c.listras(corrente)[sl] - 0.6, 0, 1) * 2.4, 1.2 * k)
            col = col + (foam * np.clip((d_in - 0.3 * S) / S, 0, 1) * 70)[..., None]
        return col
    if mat == "abismo":
        rock = np.clip(38 + 22 * mid, 0, 255)
        col_rock = np.stack([rock * 1.05, rock, rock], -1)
        tt = np.clip(d_in / (1.7 * S), 0, 1) ** 0.8
        ch = lerp(col_rock, A(9, 12, 19), tt[..., None])
        if corrente:
            dmax = max(float(d_in.max()), 1.0)
            band = np.exp(-(((dmax - d_in) / (0.85 * S)) ** 2))
            foam = ndi.gaussian_filter(np.clip(c.listras(corrente)[sl] - 0.6, 0, 1) * 2.4, 1.2 * k)
            vis = band * np.clip((d_in - 0.5 * S) / (1.0 * S), 0, 1)
            ch = lerp(ch, A(26, 66, 84) * (0.7 + 0.5 * mid[..., None]), (vis * 0.9)[..., None])
            ch = ch + (foam * vis * 80)[..., None]
        return ch
    if mat == "lava":
        v = np.clip((c.rust[sl] + 0.24) * 2.4, 0, 1) ** 1.3
        return lerp(A(46, 16, 10), A(255, 120, 24), v[..., None]) + fine[..., None] * 20
    raise ValueError(mat)


def _pintar(m, base, mask, mat, borda, irr, rnd, corrente=None, soft=3.0, bio=None):
    """Pinta `mat` onde `mask` e verdadeiro, com contorno organico opcional. Devolve (sl, m, d_in, d_out)."""
    S, k, H, W = m.S, m.k, m.H, m.W
    sl = _bbox(mask, int(3 * S), H, W)
    if sl is None:
        return None
    cm = mask[sl]
    sdf = ndi.distance_transform_edt(cm) - ndi.distance_transform_edt(~cm)
    s = sdf + (m.campos.edge[sl] * irr * S if borda != "reta" else 0)
    mm = np.clip(0.5 + s / (soft * k), 0, 1).astype(np.float32)
    ins = s > 0
    d_in = ndi.distance_transform_edt(ins).astype(np.float32)
    d_out = ndi.distance_transform_edt(~ins).astype(np.float32)
    b = base[sl]
    if borda == "rochosa":
        lip = np.clip(1 - d_out / (0.55 * S), 0, 1) ** 0.8
        rock = lerp(A(88, 82, 76), A(138, 130, 118), np.clip(0.5 + 0.9 * m.campos.mid[sl], 0, 1)[..., None])
        b = lerp(b, rock, (lip * 0.92)[..., None])
        b = b * (1 - 0.55 * np.clip(1 - d_out / (6 * k), 0, 1))[..., None]
    if mat == "agua":
        b = b * (1 - 0.22 * np.clip(1 - d_out / (0.5 * S), 0, 1))[..., None]
    cor = _cor_material(m, mat, sl, d_in, d_out, rnd, corrente, bio)
    base[sl] = lerp(b, cor, mm[..., None])
    if mat == "lava":
        glow = np.exp(-d_out / (0.9 * S)) * (1 - mm)
        base[sl] += glow[..., None] * A(120, 50, 10) * 0.6
    return sl, mm, d_in, d_out


# ---------- construcao ----------
def construir(m, R):
    S, k, W, H = m.S, m.k, m.W, m.H
    c = m.campos
    bio = BIOMAS[m.spec["bioma"]]
    full = (slice(0, H), slice(0, W))
    base = cor_ruido(c, full, bio["chao"]).astype(np.float32)
    bloq = np.zeros((H, W), bool)
    abismo = np.zeros((H, W), np.float32)
    casc = nova(W, H)
    cd = ImageDraw.Draw(casc)
    extras, rim = [], []
    muros, cercas = [], []

    # regioes
    ESPECIAIS = ("agua", "abismo", "lava")   # pintados por cima dos pisos das salas

    def pintar_regioes(lista):
        for reg in lista:
            rnd = m.rnd("reg", reg["_i"])
            mat = reg["material"]
            borda = reg.get("borda") or ("rochosa" if mat in ("abismo", "lava") else "reta" if mat in ("pedra", "madeira") else "organica")
            irr = reg.get("irregularidade", {"abismo": 1.0, "lava": 1.0, "agua": 1.2, "pedra": 0.4, "madeira": 0.4}.get(mat, 1.2))
            r = _pintar(m, base, mask_forma(m, reg), mat, borda, irr, rnd, reg.get("corrente"), bio=bio)
            if r is None:
                continue
            sl, mm, d_in, d_out = r
            if mat == "abismo":
                abismo[sl] = np.maximum(abismo[sl], mm)
            n = reg.get("pedras_na_borda", 0)
            if n:
                pts = np.argwhere((d_out > 0.7 * S) & (d_out < 1.6 * S))
                for _ in range(n if len(pts) else 0):
                    yy, xx = pts[rnd.randrange(len(pts))]
                    rim.append((xx + sl[1].start, yy + sl[0].start, rnd.uniform(0.14, 0.32)))


    pintar_regioes([r for r in R["regioes"] if r["material"] not in ESPECIAIS])

    # linhas
    for lin in R["linhas"]:
        rnd = m.rnd("lin", lin["_i"])
        t = lin["tipo"]
        pts = lin["pontos"]
        if t == "muro":
            muros.append(mask_linha(m, pts, lin.get("largura", 0.4)))
            continue
        if t == "cerca":
            cercas.append((pts, lin.get("largura", 0.2)))
            continue
        larg = lin.get("largura", {"estrada": 3, "trilha": 1.2, "rio": 3}[t])
        mask = mask_linha(m, pts, larg)
        if t == "rio":
            dx, dy = pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]
            _pintar(m, base, mask, "agua", "organica", lin.get("irregularidade", 1.2), rnd, "horizontal" if abs(dx) >= abs(dy) else "vertical", bio=bio)
            continue
        sl = _bbox(mask, int(3 * S), H, W)
        if sl is None:
            continue
        cm = mask[sl]
        sdf = ndi.distance_transform_edt(cm) - ndi.distance_transform_edt(~cm)
        s = sdf + c.edge[sl] * lin.get("irregularidade", 0.5) * S
        mm = np.clip(0.5 + s / (5 * k), 0, 1).astype(np.float32)
        rc = cor_ruido(c, sl, MATERIAIS["terra"])
        if t == "estrada":
            ruts = np.zeros(cm.shape, np.uint8)
            ri = Image.fromarray(ruts)
            rd = ImageDraw.Draw(ri)
            off = larg / 6.0
            for sgn in (-1, 1):
                pp = [((x * S) - sl[1].start, (y * S) - sl[0].start) for x, y in deslocar(pts, sgn * off)]
                rd.line(pp, fill=255, width=max(1, int(0.28 * S)), joint="curve")
            ruts = ndi.gaussian_filter(np.asarray(ri).astype(np.float32) / 255.0, 0.1 * S)
            rc = rc * (1 - 0.28 * ruts)[..., None]
        base[sl] = lerp(base[sl], rc, (mm * 0.95)[..., None])
        d_out = ndi.distance_transform_edt(s <= 0)
        bloq[sl] |= d_out < 0.6 * S
        cand = np.argwhere(mm > 0.7)
        for _ in range(int(8 * len(cand) / (S * S)) if len(cand) else 0):
            yy, xx = cand[rnd.randrange(len(cand))]
            px, py = xx + sl[1].start, yy + sl[0].start
            r = rnd.uniform(2, 6) * k
            g = rnd.randint(110, 170)
            cd.ellipse([px - r, py - r * .8, px + r, py + r * .8], fill=(g, g - 8, g - 18, 255))
            cd.ellipse([px - r * .5 - k, py - r * .5 - k, px, py], fill=(min(255, g + 40),) * 3 + (150,))

    # pontes bloqueiam decoracao aleatoria
    for e in R["estruturas"]:
        if e["tipo"] == "ponte":
            bloq |= mask_rect(m, e["x0"] - 1.3, e["y0"] - 1.3, e["x1"] + 1.3, e["y1"] + 1.3)

    # salas e paredes
    salas = [e for e in R["estruturas"] if e["tipo"] == "sala"]
    paredes = [e for e in R["estruturas"] if e["tipo"] == "parede"]
    portas = [e for e in R["estruturas"] if e["tipo"] == "porta"]
    wall = np.zeros((H, W), bool)
    floor = np.zeros((H, W), bool)
    piso_def = PISO_PADRAO.get(m.spec["bioma"], "pedra")
    pisos = []
    for s in salas:
        esp = s.get("espessura", 0.35)
        outer = mask_rect(m, s["x0"], s["y0"], s["x1"], s["y1"])
        inner = mask_rect(m, s["x0"] + esp, s["y0"] + esp, s["x1"] - esp, s["y1"] - esp)
        wall |= outer & ~inner
        floor |= inner
        pisos.append((s, inner))
    wall &= ~floor
    for s, inner in pisos:
        _pintar(m, base, inner, s.get("piso", piso_def), "reta", 0, m.rnd("sala", s["_i"]), soft=1.5, bio=bio)
    pintar_regioes([r for r in R["regioes"] if r["material"] in ESPECIAIS])
    for p in paredes:
        esp = p.get("espessura", 0.35)
        cx0, cy0, cx1, cy1 = p["x0"], p["y0"], p["x1"], p["y1"]
        if cy0 == cy1:      # parede horizontal
            wall |= mask_rect(m, min(cx0, cx1) - esp / 2, cy0 - esp / 2, max(cx0, cx1) + esp / 2, cy0 + esp / 2)
        elif cx0 == cx1:    # parede vertical
            wall |= mask_rect(m, cx0 - esp / 2, min(cy0, cy1) - esp / 2, cx0 + esp / 2, max(cy0, cy1) + esp / 2)
        else:
            wall |= mask_linha(m, [(cx0, cy0), (cx1, cy1)], esp)
    for mk in muros:
        wall |= mk

    # portas: abrem o muro e pintam a soleira
    portas_desenho = []
    thr = np.zeros((H, W), bool)
    for p in portas:
        lg = p.get("larg", 1.0)
        corte = mask_rect(m, p["x"] - lg / 2, p["y"] - 0.9, p["x"] + lg / 2, p["y"] + 0.9) if p["orientacao"] == "h" else mask_rect(m, p["x"] - 0.9, p["y"] - lg / 2, p["x"] + 0.9, p["y"] + lg / 2)
        thr |= corte & wall
        wall &= ~corte
        portas_desenho.append(p)
    # ruinas: buracos nas paredes + entulho
    for s in salas:
        if not s.get("ruina"):
            continue
        rnd = m.rnd("ruina", s["_i"])
        esp = s.get("espessura", 0.35)
        ring = mask_rect(m, s["x0"], s["y0"], s["x1"], s["y1"]) & ~mask_rect(m, s["x0"] + esp, s["y0"] + esp, s["x1"] - esp, s["y1"] - esp) & wall
        pts = np.argwhere(ring)
        per = 2 * ((s["x1"] - s["x0"]) + (s["y1"] - s["y0"]))
        for _ in range(int(per / 4) if len(pts) else 0):
            yy, xx = pts[rnd.randrange(len(pts))]
            r = rnd.uniform(0.4, 0.8) * S
            y0, y1, x0, x1 = int(max(0, yy - r)), int(min(H, yy + r)), int(max(0, xx - r)), int(min(W, xx + r))
            gy, gx = np.ogrid[y0:y1, x0:x1]
            disco = (gy - yy) ** 2 + (gx - xx) ** 2 <= r * r
            thr[y0:y1, x0:x1] |= disco & wall[y0:y1, x0:x1]
            wall[y0:y1, x0:x1] &= ~disco
            extras.append(("entulho", {"x": xx / S, "y": yy / S, "r": rnd.uniform(0.3, 0.6)}))
    if thr.any():
        # soleira com o piso da sala mais proxima (ou o padrao)
        piso_thr = piso_def
        if salas:
            piso_thr = salas[0].get("piso", piso_def)
        _pintar(m, base, thr, piso_thr, "reta", 0, m.rnd("soleira", 0), soft=1.5, bio=bio)

    # sombra de contato das paredes sobre o piso
    if wall.any():
        sl = _bbox(wall, int(1.2 * S), H, W)
        dist = ndi.distance_transform_edt(~wall[sl])
        base[sl] *= (1 - 0.30 * np.clip(1 - dist / (0.7 * S), 0, 1))[..., None]

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert("RGBA")
    img = Image.alpha_composite(img, casc)

    # paredes de pedra (com sombra de altura), cercas e portas
    if wall.any():
        img = _desenhar_paredes(m, img, wall, bio, m.rnd("paredes", 0))
        bloq |= ndi.binary_dilation(wall, iterations=int(0.6 * S))
    for pts, larg in cercas:
        img = _desenhar_cerca(m, img, pts, larg, m.rnd("cerca", len(pts)))
    for p in portas_desenho:
        img = _desenhar_porta(m, img, p)

    # filtra pedras de borda que caem sobre estrada, ponte ou parede
    for (x, y, r) in rim:
        if not bloq[min(H - 1, int(y)), min(W - 1, int(x))]:
            extras.append(("pedra", {"x": x / S, "y": y / S, "r": r}))
    return Terreno(img, bloq, ndi.gaussian_filter(abismo, 1.5 * S) if abismo.any() else None, extras)


def _desenhar_paredes(m, img, wall, bio, rnd):
    S, k, H, W = m.S, m.k, m.H, m.W
    sl = _bbox(wall, 3, H, W)
    wm = wall[sl]
    h, w = wm.shape
    base_c = np.array(bio["parede"], np.float32)
    tex = lajes(h, w, rnd, S, rh=(0.28, 0.36), sw=(0.28, 0.46), g=(int(base_c.mean() * 0.78), int(base_c.mean() * 1.22)), junta=(26, 26, 30))
    tex = tex * (base_c / max(1.0, float(base_c.mean())))[None, None, :]
    alpha = ndi.gaussian_filter(wm.astype(np.float32), 0.8 * k) * 255
    er = ndi.binary_erosion(wm, iterations=max(1, int(3 * k)))
    tex[wm & ~er] *= 0.35
    up = np.zeros_like(wm)
    n = max(2, int(3 * k))
    up[n:, :] = wm[:-n, :]
    hl = wm & ~up
    tex[hl] = np.minimum(255, tex[hl] + 40)
    rgba = np.dstack([np.clip(tex, 0, 255), alpha]).astype(np.uint8)
    layer = nova(W, H)
    layer.paste(Image.fromarray(rgba, "RGBA"), (sl[1].start, sl[0].start))
    img = sombra(img, layer, 10, 14, 8, 0.6, k)
    return Image.alpha_composite(img, layer)


def _desenhar_cerca(m, img, pts, larg, rnd):
    S, k = m.S, m.k
    layer = nova(m.W, m.H)
    d = ImageDraw.Draw(layer)
    P = [(x * S, y * S) for x, y in pts]
    for off in (-0.1 * S, 0.1 * S):
        d.line([(x + off * 0.0, y + off) for x, y in P], fill=(84, 56, 32, 255), width=max(2, int(0.07 * S)), joint="curve")
    for (x0, y0), (x1, y1) in zip(P, P[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(L / (0.6 * S)))
        for i in range(n + 1):
            x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
            r = 0.09 * S
            d.ellipse([x - r, y - r, x + r, y + r], fill=(112, 78, 46, 255), outline=(40, 26, 14, 255), width=max(1, int(2 * k)))
    img = sombra(img, layer, 5, 8, 4, 0.5, k)
    return Image.alpha_composite(img, layer)


def _desenhar_porta(m, img, p):
    S, k = m.S, m.k
    layer = nova(m.W, m.H)
    d = ImageDraw.Draw(layer)
    lg = p.get("larg", 1.0) * S
    cx, cy = p["x"] * S, p["y"] * S
    horiz = p["orientacao"] == "h"
    estilo = p.get("estilo", "fechada")
    gx, gy = (lg / 2, 0.12 * S) if horiz else (0.12 * S, lg / 2)
    if estilo == "fechada":
        d.rectangle([cx - gx, cy - gy, cx + gx, cy + gy], fill=(108, 74, 42, 255), outline=(40, 26, 14, 255), width=max(2, int(3 * k)))
        for f in (-.55, 0, .55):
            if horiz:
                d.line([cx + f * gx, cy - gy, cx + f * gx, cy + gy], fill=(70, 46, 26, 200), width=max(1, int(2 * k)))
            else:
                d.line([cx - gx, cy + f * gy, cx + gx, cy + f * gy], fill=(70, 46, 26, 200), width=max(1, int(2 * k)))
        d.ellipse([cx - 4 * k, cy - 4 * k, cx + 4 * k, cy + 4 * k], fill=(200, 170, 70, 255), outline=(80, 60, 16, 255))
    else:
        for sx in (-1, 1):
            px, py = (cx + sx * gx, cy) if horiz else (cx, cy + sx * gy)
            r = 0.12 * S
            d.rectangle([px - r, py - r, px + r, py + r], fill=(104, 100, 96, 255), outline=(36, 34, 34, 255), width=max(2, int(3 * k)))
    img = sombra(img, layer, 4, 6, 3, 0.5, k)
    return Image.alpha_composite(img, layer)
