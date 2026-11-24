"""Geradores de objetos: `fileira` e `espalhar` viram itens comuns antes do desenho.
Poupam o JSON (uma fileira de 8 pilares, um bosque de 20 arvores) e deixam a disposicao natural e repetivel (mesmo seed = mesmo mapa)."""
import math

from . import catalogo as C

AGUA_ETC = ("agua", "abismo", "lava")


def _dentro_poligono(pts, x, y):
    dentro = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi, xj, yj = pts[i][0], pts[i][1], pts[j][0], pts[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi:
            dentro = not dentro
        j = i
    return dentro


def _dentro_forma(e, x, y):
    f = e.get("forma")
    if f == "elipse":
        return ((x - e["cx"]) / (e["rx"] or 1e-9)) ** 2 + ((y - e["cy"]) / (e["ry"] or 1e-9)) ** 2 <= 1
    if f == "poligono":
        return _dentro_poligono(e["pontos"], x, y)
    return min(e["x0"], e["x1"]) <= x <= max(e["x0"], e["x1"]) and min(e["y0"], e["y1"]) <= y <= max(e["y0"], e["y1"])


def _dentro_sala(s, x, y):
    if s.get("forma") == "redonda":
        cx, cy = (s["x0"] + s["x1"]) / 2, (s["y0"] + s["y1"]) / 2
        return ((x - cx) / ((abs(s["x1"] - s["x0"]) / 2) or 1e-9)) ** 2 + ((y - cy) / ((abs(s["y1"] - s["y0"]) / 2) or 1e-9)) ** 2 <= 1
    return min(s["x0"], s["x1"]) <= x <= max(s["x0"], s["x1"]) and min(s["y0"], s["y1"]) <= y <= max(s["y0"], s["y1"])


def _perto_linha(pontos, x, y, meia):
    for (ax, ay), (bx, by) in zip(pontos, pontos[1:]):
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / L2))
        if math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= meia:
            return True
    return False


def _filho(base, item, x, y, **extra):
    c = dict(base)
    c.update(tipo=item, x=round(x, 3), y=round(y, 3))
    c.update(extra)
    return c


def _fileira(o, base, rnd):
    x0, y0, x1, y1 = o["x0"], o["y0"], o["x1"], o["y1"]
    L = math.hypot(x1 - x0, y1 - y0)
    n = max(1, round(L / max(0.2, o.get("passo", 2))))
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    var = o.get("variacao", 0)
    campos = C.OBJETOS[o["item"]]
    out = []
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if var:
            x += rnd.uniform(-var, var)
            y += rnd.uniform(-var, var)
        extra = {}
        if o.get("girar") and "rot" in campos:
            extra["rot"] = ang + base.get("rot", 0)
        out.append(_filho(base, o["item"], x, y, **extra))
    return out


def _espalhar(o, base, rnd, m, R, terr, avisos):
    item, S = o["item"], m.S
    campos = C.OBJETOS[item]
    quer = max(0, o["quantidade"])
    dmin = o.get("distancia_min", 1.0)
    so_em = o.get("so_em") or []
    evitar = [] if so_em else (o.get("evitar") if o.get("evitar") is not None else list(AGUA_ETC))
    regs = R["regioes"]
    salas = [e for e in R["estruturas"] if e["tipo"] == "sala"]
    lo, hi = o.get("r_min"), o.get("r_max")
    if lo is not None or hi is not None:
        lo = lo if lo is not None else hi * 0.7
        hi = hi if hi is not None else lo * 1.4
        lo, hi = min(lo, hi), max(lo, hi)
    GW, GH = m.GW, m.GH
    bloq = terr.bloqueio
    aceitos = []
    for _ in range(quer * 60):
        if len(aceitos) >= quer:
            break
        if o["forma"] == "elipse":
            a, r = rnd.uniform(0, 2 * math.pi), math.sqrt(rnd.random())
            x, y = o["cx"] + o["rx"] * r * math.cos(a), o["cy"] + o["ry"] * r * math.sin(a)
        else:
            x = rnd.uniform(min(o["x0"], o["x1"]), max(o["x0"], o["x1"]))
            y = rnd.uniform(min(o["y0"], o["y1"]), max(o["y0"], o["y1"]))
        if not (0 <= x <= GW and 0 <= y <= GH):
            continue
        if bloq[min(m.H - 1, int(y * S)), min(m.W - 1, int(x * S))]:
            continue
        if not o.get("em_salas") and any(_dentro_sala(s, x, y) for s in salas):
            continue
        mats = [g["material"] for g in regs if _dentro_forma(g, x, y)]
        if any(l["tipo"] in ("rio", "riacho") and _perto_linha(l["pontos"], x, y, l.get("largura", 3 if l["tipo"] == "rio" else 1.5) / 2) for l in R["linhas"]):
            mats.append("agua")   # rios e riachos tambem contam como agua
        if any(mt in evitar for mt in mats):
            continue
        if so_em and not any(mt in so_em for mt in mats):
            continue
        if any((x - ax) ** 2 + (y - ay) ** 2 < dmin * dmin for ax, ay in aceitos):
            continue
        aceitos.append((x, y))
    if len(aceitos) < quer:
        avisos.append(f"espalhar ({item}): coube so {len(aceitos)} de {quer}; aumente a area ou reduza distancia_min")
    out = []
    for x, y in aceitos:
        extra = {}
        if lo is not None and "r" in campos and "r" not in base:
            extra["r"] = round(rnd.uniform(lo, hi), 2)
        if "rot" in campos and "rot" not in base:
            extra["rot"] = round(rnd.uniform(0, 360), 1)
        out.append(_filho(base, item, x, y, **extra))
    return out


def expandir(m, R, terr):
    """Lista final [(tipo, dict, indice)] dos objetos, com os geradores ja convertidos em itens comuns."""
    out = []
    for o in R["objetos"]:
        t = o["tipo"]
        if t not in C.GERADORES:
            out.append((t, o, o["_i"]))
            continue
        rnd = m.rnd("gerador", o["_i"])
        base = dict(o.get("opcoes") or {})
        filhos = _fileira(o, base, rnd) if t == "fileira" else _espalhar(o, base, rnd, m, R, terr, m.avisos)
        for j, f in enumerate(filhos):
            out.append((f["tipo"], f, f"{o['_i']}.{j}"))
    return out
