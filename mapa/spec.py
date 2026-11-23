"""Leitura e validacao do JSON do mapa. Erros em portugues, com o caminho do problema."""
import difflib
import json
import re

from . import catalogo as C

NUM = (int, float)


class SpecErro(Exception):
    def __init__(self, erros):
        self.erros = erros
        super().__init__("\n".join(erros))


def extrair(texto):
    """Acha os JSON de mapa dentro de um texto (resposta inteira da IA, com blocos ```json)."""
    achados, dec = [], json.JSONDecoder()
    candidatos = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", texto, re.S) or []
    for c in candidatos:
        try:
            o = json.loads(c)
        except json.JSONDecodeError:
            continue
        if isinstance(o, dict) and o.get("formato") == C.FORMATO:
            achados.append(o)
    if achados:
        return achados
    i = 0
    while True:
        i = texto.find("{", i)
        if i < 0:
            break
        try:
            o, fim = dec.raw_decode(texto[i:])
        except json.JSONDecodeError:
            i += 1
            continue
        if isinstance(o, dict) and o.get("formato") == C.FORMATO:
            achados.append(o)
        i += fim
    return achados


def _talvez(nome, validos):
    m = difflib.get_close_matches(nome, list(validos), n=1)
    return f" (voce quis dizer \"{m[0]}\"?)" if m else ""


def _checa_valor(v, f, caminho, erros):
    t = f["t"]
    if t == "num":
        if isinstance(v, bool) or not isinstance(v, NUM):
            erros.append(f"{caminho}: precisa ser numero")
    elif t == "int":
        if isinstance(v, bool) or not isinstance(v, int):
            erros.append(f"{caminho}: precisa ser inteiro")
    elif t == "bool":
        if not isinstance(v, bool):
            erros.append(f"{caminho}: precisa ser true ou false")
    elif t == "str":
        if not isinstance(v, str) or not v.strip():
            erros.append(f"{caminho}: precisa ser texto")
    elif t == "enum":
        if v not in f["ops"]:
            erros.append(f"{caminho}: \"{v}\" invalido; opcoes: {', '.join(f['ops'])}{_talvez(str(v), f['ops'])}")
    elif t == "pontos":
        ok = isinstance(v, list) and len(v) >= f["min"] and all(isinstance(p, list) and len(p) == 2 and all(isinstance(c, NUM) and not isinstance(c, bool) for c in p) for p in v)
        if not ok:
            erros.append(f"{caminho}: precisa ser lista de [x,y] com pelo menos {f['min']} pontos")
    elif t == "cor":
        if not (isinstance(v, list) and len(v) == 3 and all(isinstance(c, int) and 0 <= c <= 255 for c in v)):
            erros.append(f"{caminho}: cor precisa ser [r,g,b] com inteiros de 0 a 255")
    elif t == "lista_str":
        if not (isinstance(v, list) and all(isinstance(s, str) for s in v)):
            erros.append(f"{caminho}: precisa ser lista de textos")
    elif t == "dict":
        if not isinstance(v, dict):
            erros.append(f"{caminho}: precisa ser objeto")
    elif t == "buraco":
        if not (isinstance(v, dict) and (("x0" in v and "x1" in v) or ("y0" in v and "y1" in v)) and all(isinstance(c, NUM) for c in v.values())):
            erros.append(f"{caminho}: use {{\"x0\":..,\"x1\":..}} (ponte horizontal) ou {{\"y0\":..,\"y1\":..}} (vertical)")


def _checa_elemento(e, campos, caminho, erros, extras_ok=()):
    if not isinstance(e, dict):
        erros.append(f"{caminho}: precisa ser objeto")
        return
    validos = {k: v for k, v in campos.items() if k != "camada"}
    validos.update(C.COMUM)
    for k, v in e.items():
        if k in extras_ok:
            continue
        if k not in validos:
            erros.append(f"{caminho}: campo desconhecido \"{k}\"{_talvez(k, validos)}")
            continue
        _checa_valor(v, validos[k], f"{caminho}.{k}", erros)
    for k, f in validos.items():
        if f.get("o") and k not in e:
            erros.append(f"{caminho}: falta o campo \"{k}\"")
    if isinstance(e.get("por_fase"), dict):
        for fid, ov in e["por_fase"].items():
            if not isinstance(ov, dict):
                erros.append(f"{caminho}.por_fase.{fid}: precisa ser objeto")
                continue
            for k, v in ov.items():
                if k not in validos:
                    erros.append(f"{caminho}.por_fase.{fid}: campo desconhecido \"{k}\"{_talvez(k, validos)}")
                else:
                    _checa_valor(v, validos[k], f"{caminho}.por_fase.{fid}.{k}", erros)


def validar(s):
    """Valida e devolve uma copia com padroes aplicados. Levanta SpecErro com TODOS os problemas."""
    erros, avisos = [], []
    if not isinstance(s, dict):
        raise SpecErro(["o mapa precisa ser um objeto JSON"])
    for k, v in s.items():
        if k not in C.TOPO:
            erros.append(f"campo desconhecido \"{k}\" no topo{_talvez(k, C.TOPO)}")
            continue
        f = C.TOPO[k]
        if f["t"] in ("grade", "fases", "lista", "luz"):
            continue
        _checa_valor(v, f, k, erros)
    for k, f in C.TOPO.items():
        if f.get("o") and k not in s:
            erros.append(f"falta o campo \"{k}\" no topo")
    if s.get("formato") not in (None, C.FORMATO):
        erros.append(f"formato deve ser \"{C.FORMATO}\"")
    if s.get("versao") not in (None, C.VERSAO):
        erros.append(f"versao {s.get('versao')} nao suportada (use {C.VERSAO})")
    g = s.get("grade")
    if g is not None and not (isinstance(g, list) and len(g) == 2 and all(isinstance(n, int) and not isinstance(n, bool) and 8 <= n <= 60 for n in g)):
        erros.append("grade: precisa ser [colunas, linhas], inteiros de 8 a 60")
    px = s.get("px_por_quadrado")
    if isinstance(px, int) and not 40 <= px <= 140:
        erros.append("px_por_quadrado: use entre 40 e 140")

    # fases
    fases = s.get("fases") or [{"id": "1", "nome": "Principal"}]
    ids = []
    if not isinstance(fases, list) or not fases:
        erros.append("fases: precisa ser lista nao vazia")
        fases = []
    for i, f in enumerate(fases):
        if not isinstance(f, dict) or not isinstance(f.get("id"), str) or not f["id"]:
            erros.append(f"fases[{i}]: precisa de \"id\" (texto)")
            continue
        for k in f:
            if k not in ("id", "nome", "luz"):
                erros.append(f"fases[{i}]: campo desconhecido \"{k}\"")
        ids.append(f["id"])
    if len(set(ids)) != len(ids):
        erros.append("fases: ids repetidos")

    def lista(chave, validador):
        v = s.get(chave, [])
        if not isinstance(v, list):
            erros.append(f"{chave}: precisa ser lista")
            return
        for i, e in enumerate(v):
            validador(e, f"{chave}[{i}]")
            if isinstance(e, dict):
                for fid in (e.get("fases") or []):
                    if fid not in ids:
                        erros.append(f"{chave}[{i}].fases: fase \"{fid}\" nao existe em fases")
                for fid in (e.get("por_fase") or {}):
                    if fid not in ids:
                        erros.append(f"{chave}[{i}].por_fase: fase \"{fid}\" nao existe em fases")

    def regiao(e, c):
        _checa_elemento(e, C.REGIAO, c, erros)
        if isinstance(e, dict) and e.get("forma") in C.REGIAO_FORMA_REQ:
            for k in C.REGIAO_FORMA_REQ[e["forma"]]:
                if k not in e:
                    erros.append(f"{c}: forma \"{e['forma']}\" precisa de \"{k}\"")

    def linha(e, c):
        _checa_elemento(e, C.LINHA, c, erros)

    def estrutura(e, c):
        t = e.get("tipo") if isinstance(e, dict) else None
        if t not in C.ESTRUTURAS:
            erros.append(f"{c}: tipo \"{t}\" invalido; opcoes: {', '.join(C.ESTRUTURAS)}{_talvez(str(t), C.ESTRUTURAS)}")
            return
        _checa_elemento(e, C.ESTRUTURAS[t], c + f" ({t})", erros, extras_ok=("tipo",))

    def objeto(e, c):
        t = e.get("tipo") if isinstance(e, dict) else None
        if t not in C.OBJETOS:
            erros.append(f"{c}: tipo \"{t}\" invalido{_talvez(str(t), C.OBJETOS)}. Tipos: {', '.join(C.OBJETOS)}")
            return
        _checa_elemento(e, C.OBJETOS[t], c + f" ({t})", erros, extras_ok=("tipo",))

    lista("regioes", regiao)
    lista("linhas", linha)
    lista("estruturas", estrutura)
    lista("objetos", objeto)

    luz = s.get("luz")
    if luz is not None:
        _valida_luz(luz, "luz", erros)
    for i, f in enumerate(fases):
        if isinstance(f, dict) and f.get("luz") is not None:
            _valida_luz(f["luz"], f"fases[{i}].luz", erros)

    # sala sem porta: aviso (nao bloqueia)
    salas = [e for e in s.get("estruturas", []) if isinstance(e, dict) and e.get("tipo") == "sala"]
    portas = [e for e in s.get("estruturas", []) if isinstance(e, dict) and e.get("tipo") == "porta"]
    if salas and not portas:
        avisos.append("ha salas mas nenhuma porta: o ambiente fica fechado")

    # fora da grade (aviso)
    if isinstance(g, list) and len(g) == 2 and not erros:
        GW, GH = g
        for sec in ("objetos", "estruturas"):
            for i, e in enumerate(s.get(sec, [])):
                for kx, ky in (("x", "y"), ("x0", "y0"), ("x1", "y1")):
                    if kx in e and ky in e and not (-2 <= e[kx] <= GW + 2 and -2 <= e[ky] <= GH + 2):
                        avisos.append(f"{sec}[{i}] ({e.get('tipo')}): posicao ({e[kx]},{e[ky]}) fora da grade {GW}x{GH}")

    if erros:
        raise SpecErro(erros)
    out = json.loads(json.dumps(s))
    out.setdefault("seed", 1)
    out.setdefault("px_por_quadrado", 100)
    out.setdefault("cm_por_quadrado", 2.5)
    out["fases"] = fases
    out["_avisos"] = avisos
    return out


def _valida_luz(luz, c, erros):
    if not isinstance(luz, dict):
        erros.append(f"{c}: precisa ser objeto")
        return
    for k, v in luz.items():
        if k not in C.LUZ:
            erros.append(f"{c}: campo desconhecido \"{k}\"{_talvez(k, C.LUZ)}")
            continue
        f = C.LUZ[k]
        if f["t"] in ("enum", "num"):
            _checa_valor(v, f, f"{c}.{k}", erros)
        elif f["t"] == "nevoa":
            if not isinstance(v, dict):
                erros.append(f"{c}.nevoa: precisa ser objeto")
                continue
            for kk, vv in v.items():
                if kk in ("sobre_abismo", "densidade"):
                    if isinstance(vv, bool) or not isinstance(vv, NUM):
                        erros.append(f"{c}.nevoa.{kk}: precisa ser numero")
                elif kk == "focos":
                    if not isinstance(vv, list):
                        erros.append(f"{c}.nevoa.focos: precisa ser lista")
                        continue
                    for j, fo in enumerate(vv):
                        if not (isinstance(fo, dict) and all(isinstance(fo.get(q), NUM) for q in ("x", "y", "rx", "ry", "densidade"))):
                            erros.append(f"{c}.nevoa.focos[{j}]: precisa de x, y, rx, ry, densidade (numeros)")
                else:
                    erros.append(f"{c}.nevoa: campo desconhecido \"{kk}\"")
        elif f["t"] == "fontes":
            if not isinstance(v, list):
                erros.append(f"{c}.fontes: precisa ser lista")
                continue
            for j, fo in enumerate(v):
                if not (isinstance(fo, dict) and all(isinstance(fo.get(q), NUM) for q in ("x", "y", "raio"))):
                    erros.append(f"{c}.fontes[{j}]: precisa de x, y, raio (numeros)")
                elif "cor" in fo:
                    _checa_valor(fo["cor"], C.cor(), f"{c}.fontes[{j}].cor", erros)
