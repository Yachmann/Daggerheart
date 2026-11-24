# Catalogo de mapas (Daggerheart)

Este e o vocabulario FECHADO do gerador de mapas. Use somente os tipos e campos abaixo; qualquer outro e rejeitado.
Campos marcados com * sao obrigatorios. Coordenadas em QUADRADOS DA GRADE, origem no canto superior esquerdo (x cresce para a direita, y para baixo).

## Topo do JSON

- `formato`*: str - sempre "daggerheart-mapa"
- `versao`*: inteiro - sempre 1
- `nome`*: str - titulo do mapa
- `descricao`: str - uma linha sobre o local (aparece no site)
- `grade`*: grade - [colunas, linhas] em quadrados (8 a 60)
- `bioma`*: floresta|planicie|deserto|neve|pantano|caverna|masmorra|cidade|vulcanico - terreno de fundo
- `seed`: inteiro - mesmo numero = mesmo mapa (padrao 1)
- `px_por_quadrado`: inteiro - resolucao, 40 a 140 (padrao 100)
- `cm_por_quadrado`: numero - tamanho impresso de cada quadrado (padrao 2.5)
- `fases`: fases - [{"id":"1","nome":"Antes","luz":{...}}] versoes do mapa (ex.: ponte inteira / desabada)
- `regioes`: lista - areas de material
- `linhas`: lista - estradas, rios, muros, cercas
- `estruturas`: lista - pontes, salas, paredes, portas
- `objetos`: lista - itens e vegetacao
- `luz`: luz - clima, nevoa e fontes de luz

Biomas: floresta, planicie, deserto, neve, pantano, caverna, masmorra, cidade, vulcanico. Materiais: grama, terra, areia, neve, lama, cascalho, musgo, cinzas, gelo, pedra, madeira, marmore, agua, abismo, lava.

## regioes[] (areas de material, pintadas na ordem)

- `material`*: grama|terra|areia|neve|lama|cascalho|musgo|cinzas|gelo|pedra|madeira|marmore|agua|abismo|lava - superficie da regiao
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

- `tipo`*: estrada|trilha|calcada|rio|riacho|muro|cerca|sebe|trilho - tipo de linha
- `pontos`*: pontos - caminho [[x,y],...]
- `largura`: numero - largura em quadrados (padrao: estrada 3, trilha 1.2, calcada 2, rio 3, riacho 1.5, muro 0.4, cerca 0.2, sebe 0.9; trilho tem largura fixa)
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
- `piso`: pedra|madeira|marmore|terra|areia|grama|lama|neve|cascalho|musgo|cinzas|gelo - material do piso
- `forma`: retangular|redonda (padrao retangular) - redonda = elipse inscrita no retangulo (torres, rotundas, covis)
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
- `estilo`: fechada|aberta|arco|dupla|grade|quebrada (padrao fechada) - dupla = portao de duas folhas; grade = grade de ferro levadica; quebrada = arrombada, com lascas

### janela
- `x`*: numero - centro da janela, sobre a parede
- `y`*: numero - centro da janela, sobre a parede
- `orientacao`*: h|v - h = em parede horizontal; v = em parede vertical
- `larg`: numero - largura (padrao 1.2)
- `estilo`: vidro|aberta|grade (padrao vidro) - vidro = fechada com vidro; aberta = venezianas abertas; grade = barras de ferro

Regras de sala: x0,y0,x1,y1 e o retangulo EXTERNO (as paredes ficam dentro dele). Salas encostadas dividem a parede;
salas que se sobrepoem formam ambientes em L. Corredor = sala estreita (2 quadrados de largura). Toda sala precisa de pelo menos uma `porta`.

## objetos[] (campo `tipo` escolhe o item)

Camadas: `piso` = decalque rente ao chao, sem sombra, fica POR BAIXO da mobilia (liste tapetes, circulos e manchas em qualquer ordem); `chao` = itens com sombra, desenhados na ordem da lista; `alto1`/`alto2` = copas e plantas altas, COBREM o que estiver embaixo. `ocupa` = tamanho aproximado em quadrados com os padroes (itens com `r`: diametro). `luz` = ja emite luz sozinho (nao precisa de `luz.fontes`).

- **arvore** (alto2, ocupa ~3.6x3.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da copa (padrao 1.8)
- **arbusto** (alto1, ocupa ~1.2x1.2): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.6)
- **pedra** (chao, ocupa ~1.0x1.0): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.5)
- **entulho** (chao, ocupa ~2.8x2.8): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da area (padrao 1)
- **caixote** (chao, ocupa ~0.9x0.9): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `escala`: numero - lado em quadrados (padrao 0.9)
- **barril** (chao, ocupa ~0.8x0.8): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.4)
- **tronco** (chao): `x0`*: numero; `y0`*: numero; `x1`*: numero; `y1`*: numero; `largura`: numero - diametro (padrao 0.5)
- **carroca** (chao, ocupa ~3.9x2.2): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **mesa** (chao, ocupa ~2.0x1.0): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - padrao 2; `alt`: numero - padrao 1; `forma`: retangular|redonda (padrao retangular)
- **cadeira** (chao, ocupa ~0.7x0.7): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **banco** (chao, ocupa ~1.6x0.5): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `comp`: numero - comprimento (padrao 1.6)
- **cama** (chao, ocupa ~1.2x2.2): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `cor`: cor - cor do cobertor [r,g,b]
- **bau** (chao, ocupa ~1.1x0.8): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **fogueira** (chao, luz, ocupa ~1.4x1.4): `x`*: numero - centro x; `y`*: numero - centro y
- **tocha** (chao, luz, ocupa ~0.5x0.5): `x`*: numero - centro x; `y`*: numero - centro y
- **lampiao** (chao, luz, ocupa ~0.4x0.4): `x`*: numero - centro x; `y`*: numero - centro y
- **pilar** (chao, ocupa ~0.8x0.8): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.4)
- **altar** (chao, luz, ocupa ~2.1x1.1): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **ossos** (chao, ocupa ~1.6x1.4): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **pano** (chao, ocupa ~0.7x0.5): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `cor`: cor - [r,g,b] (padrao vermelho)
- **tenda** (chao, ocupa ~2.8x2.8): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 1.4)
- **poco** (chao, ocupa ~1.6x1.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.8)
- **escada** (chao): `x0`*: numero; `y0`*: numero; `x1`*: numero; `y1`*: numero; `direcao`*: n|s|l|o - para onde a escada sobe
- **forma** (chao): `pontos`*: pontos - poligono [[x,y],...] em quadrados (minimo 3); `material`: pedra|madeira|metal|tecido|terra (padrao pedra); `cor`: cor - [r,g,b] sobrepoe o material
- **estante** (chao, ocupa ~2.0x0.8): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - comprimento (padrao 2); profundidade fixa 0.8
- **balcao** (chao, ocupa ~3.0x0.9): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - comprimento (padrao 3); `alt`: numero - profundidade (padrao 0.9)
- **lareira** (chao, luz, ocupa ~2.3x1.1): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **armario** (chao, ocupa ~1.3x0.8): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **tapete** (piso, ocupa ~3.4x2.1): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - padrao 3; `alt`: numero - padrao 2; `forma`: retangular|redonda (padrao retangular); `cor`: cor - [r,g,b] (padrao vinho)
- **estatua** (chao, ocupa ~1.2x1.2): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `r`: numero - meia-largura do pedestal (padrao 0.55)
- **sarcofago** (chao, ocupa ~1.6x2.4): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `aberto`: bool - tampa deslocada, mostrando o interior escuro
- **jaula** (chao, ocupa ~1.8x1.8): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - lado em quadrados (padrao 1.5)
- **trono** (chao, ocupa ~1.2x1.2): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `cor`: cor - cor da almofada [r,g,b]
- **bigorna** (chao, ocupa ~1.0x0.6): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **forja** (chao, luz, ocupa ~1.9x1.9): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **caldeirao** (chao, luz, ocupa ~1.5x1.3): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.6); `cor`: cor - cor do liquido [r,g,b] (padrao verde)
- **braseiro** (chao, luz, ocupa ~1.0x1.0): `x`*: numero - centro x; `y`*: numero - centro y
- **candelabro** (chao, luz, ocupa ~0.8x0.8): `x`*: numero - centro x; `y`*: numero - centro y
- **circulo_ritual** (piso, luz, ocupa ~4.6x4.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 2); `cor`: cor - cor das runas [r,g,b] (padrao roxo)
- **armadilha** (chao, ocupa ~1.5x1.5): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.6); `estilo`: espetos|placa|fosso (padrao espetos) - espetos = poco de lancas; placa = placa de pressao; fosso = fosso com borda
- **alcapao** (chao, ocupa ~1.2x1.2): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **barraca** (chao, ocupa ~2.6x2.1): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `larg`: numero - largura da banca (padrao 2.4); toldo para cima com rot 0; `cor`: cor - cor do toldo [r,g,b] (padrao vermelho)
- **tumulo** (chao, ocupa ~1.0x2.0): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **fonte** (chao, ocupa ~2.6x2.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 1.2)
- **mancha** (piso, ocupa ~2.6x2.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.8); `estilo`: sangue|queimado|oleo|limo (padrao sangue)
- **teia** (piso, ocupa ~2.2x2.2): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 1)
- **vaso** (chao, ocupa ~0.8x0.8): `x`*: numero - centro x; `y`*: numero - centro y
- **pinheiro** (alto2, ocupa ~2.6x2.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da copa (padrao 1.3)
- **palmeira** (alto2, ocupa ~3.2x3.2): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio das folhas (padrao 1.6)
- **cacto** (alto1, ocupa ~1.3x1.3): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.5)
- **cogumelos** (chao, ocupa ~2.2x2.2): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio do grupo (padrao 0.8); `cor`: cor - cor dos chapeus [r,g,b] (padrao vermelho)
- **flores** (piso, ocupa ~2.3x2.3): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio do canteiro (padrao 1); `cor`: cor - cor unica das flores; omitida = coloridas
- **capim** (piso, ocupa ~2.1x2.1): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da mancha de mato (padrao 0.8)
- **lirio** (piso, ocupa ~1.8x1.8): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da area de vitorias-regias (padrao 0.5)
- **junco** (chao, ocupa ~2.4x2.4): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio da touceira (padrao 0.7)
- **rochedo** (chao, ocupa ~2.3x2.3): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 1.1); para pedras pequenas use 'pedra'
- **estalagmite** (chao, ocupa ~1.1x1.1): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.5)
- **cristal** (chao, luz, ocupa ~1.6x1.6): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio do grupo (padrao 0.5); `cor`: cor - cor do cristal e da luz [r,g,b] (padrao azul)
- **fumarola** (chao, luz, ocupa ~1.5x1.5): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.6)
- **barco** (chao, ocupa ~2.1x3.1): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario)
- **feno** (chao, ocupa ~1.3x1.3): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio do fardo (padrao 0.6)
- **toco** (chao, ocupa ~0.9x0.9): `x`*: numero - centro x; `y`*: numero - centro y; `r`: numero - raio (padrao 0.45)
- **barricada** (chao, ocupa ~3.3x0.9): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `comp`: numero - comprimento (padrao 3); `estilo`: madeira|sacos|pedra (padrao madeira)
- **espetos** (chao, ocupa ~2.8x1.0): `x`*: numero - centro x; `y`*: numero - centro y; `rot`: numero - rotacao em graus (sentido horario); `comp`: numero - comprimento (padrao 2)

### Geradores (tambem em `objetos[]`): repetem um item sem escrever um por um

Mesmo `seed` = mesma disposicao. Respeitam `fases`/`por_fase` como qualquer objeto. Evitam sozinhos estradas, pontes, paredes e (por padrao) agua, abismo e lava; `so_em`/`evitar` olham as `regioes` e tratam `rio`/`riacho` como agua. Para um bosque AO REDOR de uma clareira, ponha o material da clareira em `evitar`.

- **fileira**: `item`*: arvore|arbusto|pedra|entulho|caixote|barril|carroca|mesa|cadeira|banco|cama|bau|fogueira|tocha|lampiao|pilar|altar|ossos|pano|tenda|poco|estante|balcao|lareira|armario|tapete|estatua|sarcofago|jaula|trono|bigorna|forja|caldeirao|braseiro|candelabro|circulo_ritual|armadilha|alcapao|barraca|tumulo|fonte|mancha|teia|vaso|pinheiro|palmeira|cacto|cogumelos|flores|capim|lirio|junco|rochedo|estalagmite|cristal|fumarola|barco|feno|toco|barricada|espetos - item repetido ao longo da linha; `x0`*: numero - inicio x; `y0`*: numero - inicio y; `x1`*: numero - fim x; `y1`*: numero - fim y; `passo`: numero - distancia aproximada entre itens (padrao 2); ajustada para fechar a linha exata; `girar`: bool - gira cada item no sentido da linha (bancos, barricadas, espetos, mesas); `variacao`: numero - tremida aleatoria de cada item, em quadrados (padrao 0); `opcoes`: objeto - campos do item, iguais aos do proprio item (sem x,y), ex.: {"r": 0.5} ou {"estilo": "sacos"}
- **espalhar**: `item`*: arvore|arbusto|pedra|entulho|caixote|barril|carroca|mesa|cadeira|banco|cama|bau|fogueira|tocha|lampiao|pilar|altar|ossos|pano|tenda|poco|estante|balcao|lareira|armario|tapete|estatua|sarcofago|jaula|trono|bigorna|forja|caldeirao|braseiro|candelabro|circulo_ritual|armadilha|alcapao|barraca|tumulo|fonte|mancha|teia|vaso|pinheiro|palmeira|cacto|cogumelos|flores|capim|lirio|junco|rochedo|estalagmite|cristal|fumarola|barco|feno|toco|barricada|espetos - item espalhado ao acaso (mesmo seed = mesma disposicao); `quantidade`*: inteiro - quantos itens; `forma`*: retangulo|elipse - area de espalhamento; `x0`: numero - retangulo: borda esquerda; `y0`: numero - retangulo: borda de cima; `x1`: numero - retangulo: borda direita; `y1`: numero - retangulo: borda de baixo; `cx`: numero - elipse: centro x; `cy`: numero - elipse: centro y; `rx`: numero - elipse: raio x; `ry`: numero - elipse: raio y; `distancia_min`: numero - distancia minima entre os itens (padrao 1); `r_min`: numero - raio minimo sorteado (itens com 'r'); `r_max`: numero - raio maximo sorteado (itens com 'r'); `so_em`: lista de textos - so cai sobre regioes desses materiais (ex.: ["agua"] para lirios e juncos); `evitar`: lista de textos - nao cai sobre regioes desses materiais (padrao agua, abismo e lava); `em_salas`: bool - permite cair dentro de salas (padrao nao; use para ossos, teias e caixotes em salas); `opcoes`: objeto - campos do item, iguais aos do proprio item (sem x,y), ex.: {"r": 0.5} ou {"estilo": "sacos"}

Exemplos: `{"tipo":"fileira","item":"pilar","x0":4,"y0":6,"x1":16,"y1":6,"passo":3}` (5 pilares alinhados); `{"tipo":"espalhar","item":"pinheiro","quantidade":18,"forma":"retangulo","x0":0,"y0":0,"x1":30,"y1":6,"distancia_min":2.5,"r_min":1,"r_max":1.6,"evitar":["terra"]}`; `{"tipo":"fileira","item":"barricada","x0":10,"y0":8,"x1":16,"y1":8,"passo":3,"girar":true,"opcoes":{"estilo":"sacos"}}`.

## luz

- `clima`: dia|entardecer|noite|subterraneo - luz geral (padrao: depende do bioma)
- `escuridao`: numero - 0 a 1: escurece o mapa, fontes de luz abrem clareiras
- `nevoa`: nevoa - {"sobre_abismo":0..1, "densidade":0..1, "focos":[{"x","y","rx","ry","densidade"}]}
- `fontes`: fontes - [{"x","y","raio","cor":[r,g,b],"intensidade":0..1}]

Fontes de luz proprias: fogueira, tocha, lampiao e altar ja emitem luz sozinhos.

## Escala e taticas

- Convencao sugerida: 1 quadrado ~ 1,5 m (5 pes). Figura media ocupa 1 quadrado; adversarios grandes, 2x2 ou mais.
- Cobertura = objeto de ~1 quadrado (caixote, barril, estatua, pilar, barricada) com espaco para contornar. Gargalo = passagem de 2 quadrados. Risco = lava, abismo, armadilha, fosso.
- Deixe 2 a 3 quadrados livres onde os personagens vao se mover; nao lote o mapa. Mesa/balcao/estante contra a parede; cadeiras e bancos coladas na mesa (a ~0.9 do centro).
- Altura e passagens: `escada`, `alcapao`, `ponte`. Visao: `sebe`, `muro`, `barricada`, copas (`alto`) bloqueiam a leitura do que fica embaixo.
- Salas encostadas dividem parede; `forma: redonda` serve para torres, rotundas e covis. Use `janela` na parede e `porta` com `estilo` (dupla, grade, quebrada) para contar a historia do lugar.
- Material novo: `marmore` (xadrez, salas nobres), `gelo`, `cinzas`, `musgo`, `cascalho`. Bioma novo: `vulcanico` (use com `lava`, `fumarola`, `cinzas`).

## Receitas por cena (combine, nao copie)

- **Taverna/casa**: sala `madeira`, `balcao`, `lareira`, `mesa`+`cadeira`/`banco`, `barril`, `tapete`, `estante`, `janela`, `porta` dupla na entrada.
- **Cripta/templo**: bioma `masmorra`, `sarcofago` (um `aberto`), `altar`, `fileira` de `pilar`, `candelabro`/`braseiro`, `teia`, `ossos`, `mancha`, `circulo_ritual`, `armadilha`.
- **Floresta/emboscada**: `espalhar` de `pinheiro`/`arvore` + `capim` + `flores`; `trilha`, `tronco`, `rochedo`, `barricada` de madeira na estrada, `toco`, `cogumelos`.
- **Pantano**: bioma `pantano`, regioes de `agua`/`lama`, `espalhar` de `junco` e `lirio` (`so_em` agua), `toco`, `barco`, `cogumelos`.
- **Caverna**: bioma `caverna`, `espalhar` de `estalagmite` e `cristal` (cor), `cogumelos`, `trilho` de mina, `abismo` com `nevoa`.
- **Vila/mercado**: bioma `cidade`, `calcada`, `fonte`, `barraca` (cores diferentes), `poco`, `carroca`, `feno`, `sebe`, `vaso`, `lampiao`.
- **Forja/oficina**: `forja`, `bigorna`, `balcao`, `barril`, `caixote`, `armario`, `braseiro`.
- **Acampamento**: `tenda`, `fogueira`, `banco`, `caldeirao`, `barricada` (sacos), `espetos`, `feno`, `barco` na margem.
- **Vulcao**: bioma `vulcanico`, `lava` com `pedras_na_borda`, `fumarola`, `rochedo`, `cinzas`, `nevoa` baixa.
- **Ritual/chefe**: `circulo_ritual` com `cor`, `caldeirao`, `altar`, `trono`, `jaula`, `estatua`, `luz.escuridao` alta.

## Erros comuns

- Porta/janela fora da parede: o gerador avisa. Coordenada da porta = centro da abertura, sobre a linha da parede.
- `espalhar` que nao coube: o gerador avisa quantos couberam; aumente a area ou diminua `distancia_min`.
- Itens `alto` (arvore, pinheiro, palmeira, cacto) cobrem tudo; nao os ponha sobre mobilia nem onde havera combate no centro.
- Luz: so use `luz.fontes` para luz sem objeto (lua, janela); tocha, lareira, forja, braseiro, candelabro, cristal e circulo_ritual ja brilham.

## Fases

Para a mesma cena em momentos diferentes (ex.: ponte inteira e ponte desabada) declare `fases` e use, nos elementos,
`fases` (aparece so nessas fases) ou `por_fase` (muda campos). `fases[].luz` muda nevoa/clima so naquela fase.
