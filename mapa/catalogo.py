"""Catalogo fechado do que o JSON do mapa pode conter. E a fonte unica: o validador e o
documento entregue a IA (catalogo-mapas.md) saem daqui. Para ensinar algo novo ao motor,
desenhe o primitivo em sprites.py/estruturas.py e registre aqui."""
from .estilo import BIOMAS, CLIMAS, TODOS_MATERIAIS

FORMATO, VERSAO = "daggerheart-mapa", 1


def num(desc="", obrig=False, padrao=None):
    return dict(t="num", o=obrig, p=padrao, d=desc)


def inteiro(desc="", obrig=False, padrao=None):
    return dict(t="int", o=obrig, p=padrao, d=desc)


def bool_(desc="", padrao=None):
    return dict(t="bool", o=False, p=padrao, d=desc)


def texto(desc="", obrig=False, padrao=None):
    return dict(t="str", o=obrig, p=padrao, d=desc)


def enum(opcoes, desc="", obrig=False, padrao=None):
    return dict(t="enum", ops=list(opcoes), o=obrig, p=padrao, d=desc)


def pontos(desc="", obrig=False, minimo=2):
    return dict(t="pontos", o=obrig, d=desc, min=minimo)


def cor(desc=""):
    return dict(t="cor", o=False, d=desc)


COMUM = {
    "id": texto("nome livre para referenciar o elemento"),
    "fases": dict(t="lista_str", o=False, d="se informado, o elemento so aparece nessas fases (ids de 'fases')"),
    "por_fase": dict(t="dict", o=False, d='sobrescreve campos em fases especificas: {"2": {"campo": valor}}'),
}

REGIAO = {
    "material": enum(TODOS_MATERIAIS, "superficie da regiao", True),
    "forma": enum(["retangulo", "elipse", "poligono"], "geometria", True),
    "x0": num("retangulo: borda esquerda"), "y0": num("retangulo: borda de cima"),
    "x1": num("retangulo: borda direita"), "y1": num("retangulo: borda de baixo"),
    "cx": num("elipse: centro x"), "cy": num("elipse: centro y"),
    "rx": num("elipse: raio x"), "ry": num("elipse: raio y"),
    "pontos": pontos("poligono: vertices [[x,y],...] (minimo 3)", minimo=3),
    "borda": enum(["organica", "reta", "rochosa"], "organica = contorno irregular; reta = reto; rochosa = com borda de pedra escura (abismos, lava)"),
    "irregularidade": num("0 a 3: quanto o contorno serpenteia (padrao depende do material)"),
    "corrente": enum(["vertical", "horizontal"], "agua/abismo: sentido da correnteza (espuma)"),
    "pedras_na_borda": inteiro("quantidade de pedras espalhadas ao longo da borda"),
}
REGIAO_FORMA_REQ = {
    "retangulo": ["x0", "y0", "x1", "y1"], "elipse": ["cx", "cy", "rx", "ry"], "poligono": ["pontos"],
}

LINHA = {
    "tipo": enum(["estrada", "trilha", "rio", "muro", "cerca"], "tipo de linha", True),
    "pontos": pontos("caminho [[x,y],...]", True),
    "largura": num("largura em quadrados (padrao: estrada 3, trilha 1.2, rio 3, muro 0.4, cerca 0.2)"),
    "irregularidade": num("0 a 3: quanto serpenteia"),
}

ESTRUTURAS = {
    "ponte": {
        "x0": num("", True), "y0": num("", True), "x1": num("", True), "y1": num("", True),
        "material": enum(["ferro", "madeira", "pedra"], "", False, "ferro"),
        "apoios": bool_("blocos de pedra nas duas cabeceiras", True),
        "buraco": dict(t="buraco", o=False, d='trecho caido: {"x0":..,"x1":..} (ponte horizontal) ou {"y0":..,"y1":..} (vertical)'),
    },
    "sala": {
        "x0": num("", True), "y0": num("", True), "x1": num("", True), "y1": num("", True),
        "piso": enum(["pedra", "madeira", "terra", "areia", "grama", "lama", "neve"], "material do piso"),
        "espessura": num("espessura da parede em quadrados (padrao 0.35)"),
        "ruina": bool_("paredes quebradas com entulho"),
    },
    "parede": {
        "x0": num("", True), "y0": num("", True), "x1": num("", True), "y1": num("", True),
        "espessura": num("padrao 0.35"),
    },
    "porta": {
        "x": num("centro da abertura", True), "y": num("centro da abertura", True),
        "orientacao": enum(["h", "v"], "h = porta em parede horizontal (abre no eixo x); v = em parede vertical", True),
        "larg": num("largura da abertura (padrao 1)"),
        "estilo": enum(["fechada", "aberta", "arco"], "", False, "fechada"),
    },
}

_PADRAO_OBJ = {"x": num("centro x", True), "y": num("centro y", True), "rot": num("rotacao em graus (sentido horario)")}
OBJETOS = {
    "arvore": dict(camada="alto2", x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da copa (padrao 1.8)")),
    "arbusto": dict(camada="alto1", x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.6)")),
    "pedra": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.5)")),
    "entulho": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da area (padrao 1)")),
    "caixote": dict(**_PADRAO_OBJ, escala=num("lado em quadrados (padrao 0.9)")),
    "barril": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.4)")),
    "tronco": dict(x0=num("", True), y0=num("", True), x1=num("", True), y1=num("", True), largura=num("diametro (padrao 0.5)")),
    "carroca": dict(**_PADRAO_OBJ),
    "mesa": dict(**_PADRAO_OBJ, larg=num("padrao 2"), alt=num("padrao 1"), forma=enum(["retangular", "redonda"], "", False, "retangular")),
    "cadeira": dict(**_PADRAO_OBJ),
    "banco": dict(**_PADRAO_OBJ, comp=num("comprimento (padrao 1.6)")),
    "cama": dict(**_PADRAO_OBJ, cor=cor("cor do cobertor [r,g,b]")),
    "bau": dict(**_PADRAO_OBJ),
    "fogueira": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    "tocha": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    "lampiao": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    "pilar": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.4)")),
    "altar": dict(**_PADRAO_OBJ),
    "ossos": dict(**_PADRAO_OBJ),
    "pano": dict(**_PADRAO_OBJ, cor=cor("[r,g,b] (padrao vermelho)")),
    "tenda": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 1.4)")),
    "poco": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.8)")),
    "escada": dict(x0=num("", True), y0=num("", True), x1=num("", True), y1=num("", True),
                   direcao=enum(["n", "s", "l", "o"], "para onde a escada sobe", True)),
    "forma": dict(pontos=pontos("poligono [[x,y],...] em quadrados (minimo 3)", True, 3),
                  material=enum(["pedra", "madeira", "metal", "tecido", "terra"], "", False, "pedra"),
                  cor=cor("[r,g,b] sobrepoe o material")),
}
for _t in OBJETOS.values():
    _t.setdefault("camada", "chao")

LUZ = {
    "clima": enum(list(CLIMAS), "luz geral (padrao: depende do bioma)"),
    "escuridao": num("0 a 1: escurece o mapa, fontes de luz abrem clareiras"),
    "nevoa": dict(t="nevoa", o=False, d='{"sobre_abismo":0..1, "densidade":0..1, "focos":[{"x","y","rx","ry","densidade"}]}'),
    "fontes": dict(t="fontes", o=False, d='[{"x","y","raio","cor":[r,g,b],"intensidade":0..1}]'),
}

TOPO = {
    "formato": texto("sempre \"daggerheart-mapa\"", True), "versao": inteiro("sempre 1", True),
    "nome": texto("titulo do mapa", True), "descricao": texto("uma linha sobre o local (aparece no site)"),
    "grade": dict(t="grade", o=True, d="[colunas, linhas] em quadrados (8 a 60)"),
    "bioma": enum(list(BIOMAS), "terreno de fundo", True),
    "seed": inteiro("mesmo numero = mesmo mapa (padrao 1)"),
    "px_por_quadrado": inteiro("resolucao, 40 a 140 (padrao 100)"),
    "cm_por_quadrado": num("tamanho impresso de cada quadrado (padrao 2.5)"),
    "fases": dict(t="fases", o=False, d='[{"id":"1","nome":"Antes","luz":{...}}] versoes do mapa (ex.: ponte inteira / desabada)'),
    "regioes": dict(t="lista", o=False, d="areas de material"),
    "linhas": dict(t="lista", o=False, d="estradas, rios, muros, cercas"),
    "estruturas": dict(t="lista", o=False, d="pontes, salas, paredes, portas"),
    "objetos": dict(t="lista", o=False, d="itens e vegetacao"),
    "luz": dict(t="luz", o=False, d="clima, nevoa e fontes de luz"),
}


def doc_campos(campos):
    partes = []
    for nome, f in campos.items():
        if nome in ("camada",):
            continue
        t = f["t"]
        if t == "enum":
            t = "|".join(f["ops"])
        elif t == "num":
            t = "numero"
        elif t == "int":
            t = "inteiro"
        s = f"`{nome}`{'*' if f.get('o') else ''}: {t}"
        if f.get("p") is not None:
            s += f" (padrao {f['p']})"
        if f.get("d"):
            s += f" - {f['d']}"
        partes.append(s)
    return partes


def markdown():
    L = ["# Catalogo de mapas (Daggerheart)", "",
         "Este e o vocabulario FECHADO do gerador de mapas. Use somente os tipos e campos abaixo; qualquer outro e rejeitado.",
         "Campos marcados com * sao obrigatorios. Coordenadas em QUADRADOS DA GRADE, origem no canto superior esquerdo (x cresce para a direita, y para baixo).", ""]
    L += ["## Topo do JSON", ""] + [f"- {x}" for x in doc_campos(TOPO)]
    L += ["", "Biomas: " + ", ".join(BIOMAS) + ". Materiais: " + ", ".join(TODOS_MATERIAIS) + ".", ""]
    L += ["## regioes[] (areas de material, pintadas na ordem)", ""] + [f"- {x}" for x in doc_campos(REGIAO)]
    L += ["", "Por forma: retangulo usa x0,y0,x1,y1; elipse usa cx,cy,rx,ry; poligono usa pontos.", ""]
    L += ["## linhas[]", ""] + [f"- {x}" for x in doc_campos(LINHA)]
    L += ["", "## estruturas[] (campo `tipo` escolhe a estrutura)", ""]
    for nome, campos in ESTRUTURAS.items():
        L.append(f"### {nome}")
        L += [f"- {x}" for x in doc_campos(campos)]
        L.append("")
    L += ["Regras de sala: x0,y0,x1,y1 e o retangulo EXTERNO (as paredes ficam dentro dele). Salas encostadas dividem a parede;",
          "salas que se sobrepoem formam ambientes em L. Corredor = sala estreita (2 quadrados de largura). Toda sala precisa de pelo menos uma `porta`.", ""]
    L += ["## objetos[] (campo `tipo` escolhe o item)", ""]
    for nome, campos in OBJETOS.items():
        L.append(f"- **{nome}** ({campos['camada']}): " + "; ".join(doc_campos({k: v for k, v in campos.items() if k != 'camada'})))
    L += ["", "## luz", ""] + [f"- {x}" for x in doc_campos(LUZ)]
    L += ["", "Fontes de luz proprias: fogueira, tocha, lampiao e altar ja emitem luz sozinhos.", ""]
    L += ["## Fases", "",
          "Para a mesma cena em momentos diferentes (ex.: ponte inteira e ponte desabada) declare `fases` e use, nos elementos,",
          "`fases` (aparece so nessas fases) ou `por_fase` (muda campos). `fases[].luz` muda nevoa/clima so naquela fase.", ""]
    return "\n".join(L)
