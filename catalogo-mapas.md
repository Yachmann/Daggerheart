# Catalogo de mapas (Daggerheart)

Este e o vocabulario FECHADO do gerador de mapas. Use somente os tipos e campos abaixo; qualquer outro e rejeitado.
Campos marcados com * sao obrigatorios. Coordenadas em QUADRADOS DA GRADE, origem no canto superior esquerdo (x cresce para a direita, y para baixo).

## Topo do JSON

- `formato`*: str - sempre "daggerheart-mapa"
- `versao`*: inteiro - sempre 1
- `nome`*: str - titulo do mapa
- `descricao`: str - uma linha sobre o local (aparece no site)
- `grade`*: grade - [colunas, linhas] em quadrados (8 a 60)
- `bioma`*: floresta|planicie|deserto|neve|pantano|caverna|masmorra|cidade - terreno de fundo
- `seed`: inteiro - mesmo numero = mesmo mapa (padrao 1)
- `px_por_quadrado`: inteiro - resolucao, 40 a 140 (padrao 100)
- `cm_por_quadrado`: numero - tamanho impresso de cada quadrado (padrao 2.5)
- `fases`: fases - [{"id":"1","nome":"Antes","luz":{...}}] versoes do mapa (ex.: ponte inteira / desabada)
- `regioes`: lista - areas de material
- `linhas`: lista - estradas, rios, muros, cercas
- `estruturas`: lista - pontes, salas, paredes, portas
- `objetos`: lista - itens e vegetacao
- `luz`: luz - clima, nevoa e fontes de luz

Biomas: floresta, planicie, deserto, neve, pantano, caverna, masmorra, cidade. Materiais: grama, terra, areia, neve, lama, pedra, madeira, agua, abismo, lava.

## regioes[] (areas de material, pintadas na ordem)

- `material`*: grama|terra|areia|neve|lama|pedra|madeira|agua|abismo|lava - superficie da regiao
- `forma`*: retangulo|elipse|poligono - geometria
- `x0`: numero - retangulo: borda esquerda
- `y0`: numero - retangulo: borda de cima
- `x1`: numero - retangulo: borda direita
- `y1`: numero - retangulo: borda de baixo
- `cx`: numero - elipse: centro x
- `cy`: numero - elipse: centro y
- `rx`: numero - elipse: raio x
- `ry`: numero - elipse: raio y
- `pontos`: pontos - poligono: vertices [[x,y],...] (minimo 3)
- `borda`: organica|reta|rochosa - organica = contorno irregular; reta = reto; rochosa = com borda de pedra escura (abismos, lava)
- `irregularidade`: numero - 0 a 3: quanto o contorno serpenteia (padrao depende do material)
- `corrente`: vertical|horizontal - agua/abismo: sentido da correnteza (espuma)
- `pedras_na_borda`: inteiro - quantidade de pedras espalhadas ao longo da borda

Por forma: retangulo usa x0,y0,x1,y1; elipse usa cx,cy,rx,ry; poligono usa pontos.

## linhas[]

- `tipo`*: estrada|trilha|rio|muro|cerca - tipo de linha
- `pontos`*: pontos - caminho [[x,y],...]
- `largura`: numero - largura em quadrados (padrao: estrada 3, trilha 1.2, rio 3, muro 0.4, cerca 0.2)
- `irregularidade`: numero - 0 a 3: quanto serpenteia

## estruturas[] (campo `tipo` escolhe a estrutura)

### ponte
- `x0`*: numero
- `y0`*: numero
- `x1`*: numero
- `y1`*: numero
- `material`: ferro|madeira|pedra (padrao ferro)
- `apoios`: bool (padrao True) - blocos de pedra nas duas cabeceiras
- `buraco`: buraco - trecho caido: {"x0":..,"x1":..} (ponte horizontal) ou {"y0":..,"y1":..} (vertical)

### sala
- `x0`*: numero
- `y0`*: numero
- `x1`*: numero
- `y1`*: numero
- `piso`: pedra|madeira|terra|areia|grama|lama|neve - material do piso
- `espessura`: numero - espessura da parede em quadrados (padrao 0.35)
- `ruina`: bool - paredes quebradas com entulho

### parede
- `x0`*: numero
- `y0`*: numero
- `x1`*: numero
- `y1`*: numero
- `espessura`: numero - padrao 0.35

### porta
- `x`*: numero - centro da abertura
- `y`*: numero - centro da abertura
- `orientacao`*: h|v - h = porta em parede horizontal (abre no eixo x); v = em parede vertical
- `larg`: numero - largura da abertura (padrao 1)
- `estilo`: fechada|aberta|arco (padrao fechada)

Regras de sala: x0,y0,x1,y1 e o retangulo EXTERNO (as paredes ficam dentro dele). Salas encostadas dividem a parede;
salas que se sobrepoem formam ambientes em L. Corredor = sala estreita (2 quadrados de largura). Toda sala precisa de pelo menos uma `porta`.

## objetos[] (campo `tipo` escolhe o item)

- **arvore** (alto2): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da copa (padrao 1.8)
- **arbusto** (alto1): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.6)
- **pedra** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.5)
- **entulho** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da area (padrao 1)
- **caixote** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `escala`: numero - lado em quadrados (padrao 0.9)
- **barril** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.4)
- **tronco** (chao): `x0`*: numero; `y0`*: numero; `x1`*: numero; `y1`*: numero; `largura`: numero - diametro (padrao 0.5)
- **carroca** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **mesa** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - padrao 2; `alt`: numero - padrao 1; `forma`: retangular|redonda (padrao retangular)
- **cadeira** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **banco** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `comp`: numero - comprimento (padrao 1.6)
- **cama** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `cor`: cor - cor do cobertor [r,g,b]
- **bau** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **fogueira** (chao): `x`*: numero - centro x; `y`*: numero - centro y
- **tocha** (chao): `x`*: numero - centro x; `y`*: numero - centro y
- **lampiao** (chao): `x`*: numero - centro x; `y`*: numero - centro y
- **pilar** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.4)
- **altar** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **ossos** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **pano** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `cor`: cor - [r,g,b] (padrao vermelho)
- **tenda** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 1.4)
- **poco** (chao): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.8)
- **escada** (chao): `x0`*: numero; `y0`*: numero; `x1`*: numero; `y1`*: numero; `direcao`*: n|s|l|o - para onde a escada sobe
- **forma** (chao): `pontos`*: pontos - poligono [[x,y],...] em quadrados (minimo 3); `material`: pedra|madeira|metal|tecido|terra (padrao pedra); `cor`: cor - [r,g,b] sobrepoe o material

## luz

- `clima`: dia|entardecer|noite|subterraneo - luz geral (padrao: depende do bioma)
- `escuridao`: numero - 0 a 1: escurece o mapa, fontes de luz abrem clareiras
- `nevoa`: nevoa - {"sobre_abismo":0..1, "densidade":0..1, "focos":[{"x","y","rx","ry","densidade"}]}
- `fontes`: fontes - [{"x","y","raio","cor":[r,g,b],"intensidade":0..1}]

Fontes de luz proprias: fogueira, tocha, lampiao e altar ja emitem luz sozinhos.

## Fases

Para a mesma cena em momentos diferentes (ex.: ponte inteira e ponte desabada) declare `fases` e use, nos elementos,
`fases` (aparece so nessas fases) ou `por_fase` (muda campos). `fases[].luz` muda nevoa/clima so naquela fase.
