"""Catalogo fechado do que o JSON do mapa pode conter. E a fonte unica: o validador e o
documento entregue a IA (catalogo-mapas.md) saem daqui. Para ensinar algo novo ao motor,
desenhe o primitivo em sprites.py/estruturas.py e registre aqui."""
from .estilo import BIOMAS, CLIMAS, TODOS_MATERIAIS, PISOS

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
    "tipo": enum(["estrada", "trilha", "calcada", "rio", "riacho", "muro", "cerca", "sebe", "trilho"], "tipo de linha", True),
    "pontos": pontos("caminho [[x,y],...]", True),
    "largura": num("largura em quadrados (padrao: estrada 3, trilha 1.2, calcada 2, rio 3, riacho 1.5, muro 0.4, cerca 0.2, sebe 0.9; trilho tem largura fixa)"),
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
        "piso": enum(PISOS, "material do piso"),
        "forma": enum(["retangular", "redonda"], "redonda = elipse inscrita no retangulo (torres, rotundas, covis)", False, "retangular"),
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
        "estilo": enum(["fechada", "aberta", "arco", "dupla", "grade", "quebrada"], "dupla = portao de duas folhas; grade = grade de ferro levadica; quebrada = arrombada, com lascas", False, "fechada"),
    },
    "janela": {
        "x": num("centro da janela, sobre a parede", True), "y": num("centro da janela, sobre a parede", True),
        "orientacao": enum(["h", "v"], "h = em parede horizontal; v = em parede vertical", True),
        "larg": num("largura (padrao 1.2)"),
        "estilo": enum(["vidro", "aberta", "grade"], "vidro = fechada com vidro; aberta = venezianas abertas; grade = barras de ferro", False, "vidro"),
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
    # ---- interior, oficio, masmorra e rito ----
    "estante": dict(**_PADRAO_OBJ, larg=num("comprimento (padrao 2); profundidade fixa 0.8")),
    "balcao": dict(**_PADRAO_OBJ, larg=num("comprimento (padrao 3)"), alt=num("profundidade (padrao 0.9)")),
    "lareira": dict(**_PADRAO_OBJ),
    "armario": dict(**_PADRAO_OBJ),
    "tapete": dict(**_PADRAO_OBJ, larg=num("padrao 3"), alt=num("padrao 2"), forma=enum(["retangular", "redonda"], "", False, "retangular"), cor=cor("[r,g,b] (padrao vinho)"), camada="piso"),
    "estatua": dict(**_PADRAO_OBJ, r=num("meia-largura do pedestal (padrao 0.55)")),
    "sarcofago": dict(**_PADRAO_OBJ, aberto=bool_("tampa deslocada, mostrando o interior escuro")),
    "jaula": dict(**_PADRAO_OBJ, larg=num("lado em quadrados (padrao 1.5)")),
    "trono": dict(**_PADRAO_OBJ, cor=cor("cor da almofada [r,g,b]")),
    "bigorna": dict(**_PADRAO_OBJ),
    "forja": dict(**_PADRAO_OBJ),
    "caldeirao": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.6)"), cor=cor("cor do liquido [r,g,b] (padrao verde)")),
    "braseiro": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    "candelabro": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    "circulo_ritual": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 2)"), cor=cor("cor das runas [r,g,b] (padrao roxo)"), camada="piso"),
    "armadilha": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.6)"), estilo=enum(["espetos", "placa", "fosso"], "espetos = poco de lancas; placa = placa de pressao; fosso = fosso com borda", False, "espetos")),
    "alcapao": dict(**_PADRAO_OBJ),
    "barraca": dict(**_PADRAO_OBJ, larg=num("largura da banca (padrao 2.4); toldo para cima com rot 0"), cor=cor("cor do toldo [r,g,b] (padrao vermelho)")),
    "tumulo": dict(**_PADRAO_OBJ),
    "fonte": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 1.2)")),
    "mancha": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.8)"), estilo=enum(["sangue", "queimado", "oleo", "limo"], "", False, "sangue"), camada="piso"),
    "teia": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 1)"), camada="piso"),
    "vaso": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"]),
    # ---- natureza, caverna e taticos ----
    "pinheiro": dict(camada="alto2", x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da copa (padrao 1.3)")),
    "palmeira": dict(camada="alto2", x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio das folhas (padrao 1.6)")),
    "cacto": dict(camada="alto1", x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.5)")),
    "cogumelos": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio do grupo (padrao 0.8)"), cor=cor("cor dos chapeus [r,g,b] (padrao vermelho)")),
    "flores": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio do canteiro (padrao 1)"), cor=cor("cor unica das flores; omitida = coloridas"), camada="piso"),
    "capim": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da mancha de mato (padrao 0.8)"), camada="piso"),
    "lirio": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da area de vitorias-regias (padrao 0.5)"), camada="piso"),
    "junco": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio da touceira (padrao 0.7)")),
    "rochedo": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 1.1); para pedras pequenas use 'pedra'")),
    "estalagmite": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.5)")),
    "cristal": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio do grupo (padrao 0.5)"), cor=cor("cor do cristal e da luz [r,g,b] (padrao azul)")),
    "fumarola": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.6)")),
    "barco": dict(**_PADRAO_OBJ),
    "feno": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio do fardo (padrao 0.6)")),
    "toco": dict(x=_PADRAO_OBJ["x"], y=_PADRAO_OBJ["y"], r=num("raio (padrao 0.45)")),
    "barricada": dict(**_PADRAO_OBJ, comp=num("comprimento (padrao 3)"), estilo=enum(["madeira", "sacos", "pedra"], "", False, "madeira")),
    "espetos": dict(**_PADRAO_OBJ, comp=num("comprimento (padrao 2)")),
}
for _t in OBJETOS.values():
    _t.setdefault("camada", "chao")

# itens que se posicionam por um unico ponto (x, y): podem ser repetidos pelos geradores
ITENS_PONTUAIS = [t for t, c in OBJETOS.items() if "x" in c]

_OPCOES = dict(t="dict", o=False, d='campos do item, iguais aos do proprio item (sem x,y), ex.: {"r": 0.5} ou {"estilo": "sacos"}')
_QUAD = {"x0": num("retangulo: borda esquerda"), "y0": num("retangulo: borda de cima"),
         "x1": num("retangulo: borda direita"), "y1": num("retangulo: borda de baixo")}
GERADORES = {
    "fileira": dict(
        item=enum(ITENS_PONTUAIS, "item repetido ao longo da linha", True),
        x0=num("inicio x", True), y0=num("inicio y", True), x1=num("fim x", True), y1=num("fim y", True),
        passo=num("distancia aproximada entre itens (padrao 2); ajustada para fechar a linha exata"),
        girar=bool_("gira cada item no sentido da linha (bancos, barricadas, espetos, mesas)"),
        variacao=num("tremida aleatoria de cada item, em quadrados (padrao 0)"),
        opcoes=_OPCOES),
    "espalhar": dict(
        item=enum(ITENS_PONTUAIS, "item espalhado ao acaso (mesmo seed = mesma disposicao)", True),
        quantidade=inteiro("quantos itens", True),
        forma=enum(["retangulo", "elipse"], "area de espalhamento", True),
        **_QUAD, cx=num("elipse: centro x"), cy=num("elipse: centro y"), rx=num("elipse: raio x"), ry=num("elipse: raio y"),
        distancia_min=num("distancia minima entre os itens (padrao 1)"),
        r_min=num("raio minimo sorteado (itens com 'r')"), r_max=num("raio maximo sorteado (itens com 'r')"),
        so_em=dict(t="lista_str", o=False, d="so cai sobre regioes desses materiais (ex.: [\"agua\"] para lirios e juncos)"),
        evitar=dict(t="lista_str", o=False, d="nao cai sobre regioes desses materiais (padrao agua, abismo e lava)"),
        em_salas=bool_("permite cair dentro de salas (padrao nao; use para ossos, teias e caixotes em salas)"),
        opcoes=_OPCOES),
}
GERADOR_FORMA_REQ = {"retangulo": ["x0", "y0", "x1", "y1"], "elipse": ["cx", "cy", "rx", "ry"]}

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
        elif t == "lista_str":
            t = "lista de textos"
        elif t == "dict":
            t = "objeto"
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
    from . import sprites as _sp
    L += ["## objetos[] (campo `tipo` escolhe o item)", "",
          "Camadas: `piso` = decalque rente ao chao, sem sombra, fica POR BAIXO da mobilia (liste tapetes, circulos e manchas em qualquer ordem); "
          "`chao` = itens com sombra, desenhados na ordem da lista; `alto1`/`alto2` = copas e plantas altas, COBREM o que estiver embaixo. "
          "`ocupa` = tamanho aproximado em quadrados com os padroes (itens com `r`: diametro). `luz` = ja emite luz sozinho (nao precisa de `luz.fontes`).", ""]
    for nome, campos in OBJETOS.items():
        extra = [campos["camada"]]
        if nome in _sp.LUZES:
            extra.append("luz")
        if nome not in ("tronco", "escada", "forma"):
            w, h = _sp._tam(nome, {})
            extra.append(f"ocupa ~{w:.1f}x{h:.1f}")
        L.append(f"- **{nome}** ({', '.join(extra)}): " + "; ".join(doc_campos({k: v for k, v in campos.items() if k != 'camada'})))
    L += ["", "### Geradores (tambem em `objetos[]`): repetem um item sem escrever um por um", "",
          "Mesmo `seed` = mesma disposicao. Respeitam `fases`/`por_fase` como qualquer objeto. Evitam sozinhos estradas, pontes, paredes e (por padrao) agua, abismo e lava; "
          "`so_em`/`evitar` olham as `regioes` e tratam `rio`/`riacho` como agua. Para um bosque AO REDOR de uma clareira, ponha o material da clareira em `evitar`.", ""]
    for nome, campos in GERADORES.items():
        L.append(f"- **{nome}**: " + "; ".join(doc_campos(campos)))
    L += ["", 'Exemplos: `{"tipo":"fileira","item":"pilar","x0":4,"y0":6,"x1":16,"y1":6,"passo":3}` (5 pilares alinhados); '
          '`{"tipo":"espalhar","item":"pinheiro","quantidade":18,"forma":"retangulo","x0":0,"y0":0,"x1":30,"y1":6,"distancia_min":2.5,"r_min":1,"r_max":1.6,"evitar":["terra"]}`; '
          '`{"tipo":"fileira","item":"barricada","x0":10,"y0":8,"x1":16,"y1":8,"passo":3,"girar":true,"opcoes":{"estilo":"sacos"}}`.']
    L += ["", "## luz", ""] + [f"- {x}" for x in doc_campos(LUZ)]
    L += ["", "Fontes de luz proprias: fogueira, tocha, lampiao e altar ja emitem luz sozinhos.", ""]
    L += ["## Escala e taticas", "",
          "- Convencao sugerida: 1 quadrado ~ 1,5 m (5 pes). Figura media ocupa 1 quadrado; adversarios grandes, 2x2 ou mais.",
          "- Cobertura = objeto de ~1 quadrado (caixote, barril, estatua, pilar, barricada) com espaco para contornar. Gargalo = passagem de 2 quadrados. Risco = lava, abismo, armadilha, fosso.",
          "- Deixe 2 a 3 quadrados livres onde os personagens vao se mover; nao lote o mapa. Mesa/balcao/estante contra a parede; cadeiras e bancos coladas na mesa (a ~0.9 do centro).",
          "- Altura e passagens: `escada`, `alcapao`, `ponte`. Visao: `sebe`, `muro`, `barricada`, copas (`alto`) bloqueiam a leitura do que fica embaixo.",
          "- Salas encostadas dividem parede; `forma: redonda` serve para torres, rotundas e covis. Use `janela` na parede e `porta` com `estilo` (dupla, grade, quebrada) para contar a historia do lugar.",
          "- Material novo: `marmore` (xadrez, salas nobres), `gelo`, `cinzas`, `musgo`, `cascalho`. Bioma novo: `vulcanico` (use com `lava`, `fumarola`, `cinzas`).", ""]
    L += ["## Receitas por cena (combine, nao copie)", "",
          "- **Taverna/casa**: sala `madeira`, `balcao`, `lareira`, `mesa`+`cadeira`/`banco`, `barril`, `tapete`, `estante`, `janela`, `porta` dupla na entrada.",
          "- **Cripta/templo**: bioma `masmorra`, `sarcofago` (um `aberto`), `altar`, `fileira` de `pilar`, `candelabro`/`braseiro`, `teia`, `ossos`, `mancha`, `circulo_ritual`, `armadilha`.",
          "- **Floresta/emboscada**: `espalhar` de `pinheiro`/`arvore` + `capim` + `flores`; `trilha`, `tronco`, `rochedo`, `barricada` de madeira na estrada, `toco`, `cogumelos`.",
          "- **Pantano**: bioma `pantano`, regioes de `agua`/`lama`, `espalhar` de `junco` e `lirio` (`so_em` agua), `toco`, `barco`, `cogumelos`.",
          "- **Caverna**: bioma `caverna`, `espalhar` de `estalagmite` e `cristal` (cor), `cogumelos`, `trilho` de mina, `abismo` com `nevoa`.",
          "- **Vila/mercado**: bioma `cidade`, `calcada`, `fonte`, `barraca` (cores diferentes), `poco`, `carroca`, `feno`, `sebe`, `vaso`, `lampiao`.",
          "- **Forja/oficina**: `forja`, `bigorna`, `balcao`, `barril`, `caixote`, `armario`, `braseiro`.",
          "- **Acampamento**: `tenda`, `fogueira`, `banco`, `caldeirao`, `barricada` (sacos), `espetos`, `feno`, `barco` na margem.",
          "- **Vulcao**: bioma `vulcanico`, `lava` com `pedras_na_borda`, `fumarola`, `rochedo`, `cinzas`, `nevoa` baixa.",
          "- **Ritual/chefe**: `circulo_ritual` com `cor`, `caldeirao`, `altar`, `trono`, `jaula`, `estatua`, `luz.escuridao` alta.", ""]
    L += ["## Erros comuns", "",
          "- Porta/janela fora da parede: o gerador avisa. Coordenada da porta = centro da abertura, sobre a linha da parede.",
          "- `espalhar` que nao coube: o gerador avisa quantos couberam; aumente a area ou diminua `distancia_min`.",
          "- Itens `alto` (arvore, pinheiro, palmeira, cacto) cobrem tudo; nao os ponha sobre mobilia nem onde havera combate no centro.",
          "- Luz: so use `luz.fontes` para luz sem objeto (lua, janela); tocha, lareira, forja, braseiro, candelabro, cristal e circulo_ritual ja brilham.", ""]
    L += ["## Fases", "",
          "Para a mesma cena em momentos diferentes (ex.: ponte inteira e ponte desabada) declare `fases` e use, nos elementos,",
          "`fases` (aparece so nessas fases) ou `por_fase` (muda campos). `fases[].luz` muda nevoa/clima so naquela fase.", ""]
    return "\n".join(L)
