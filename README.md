# Daggerheart · Fichas e Mesa do Mestre

Site estático (sem build) para jogar Daggerheart em português:

- **`index.html` — Fichas (jogadores):** criação guiada de personagem, ficha completa para celular, subir de nível (com desfazer), rolador de Dados de Dualidade, descansos, dano por limiar, cartas (mão/cofre), inventário e ouro, guia de regras em português com busca unificada, compêndio filtrável e mesas (o mestre vê as fichas mudarem em tempo real).
- **Aba Mestre (`#/mestre`):** batalhas preparadas e conduzidas no site (Medo, contagens, dano por limiares, condições, grupo ao vivo), biblioteca de 264 adversários + 47 ambientes, criador de adversários do zero, geradores (batalha pronta, adversário, complicação, tesouro), notas e a importação de batalhas criadas pela IA. Liga em Conta → Modo mestre (aparece sozinha para quem criou uma mesa).
- `mestre.html` redireciona para a aba Mestre; a ferramenta antiga continua em `mestre-antigo.html`. Os dados dela (adversários criados, combates e lore) podem ser importados em Mestre → Batalhas.

## Configurar o banco (uma vez)

1. Supabase → **SQL Editor** → New query → cole `supabase.sql` (se ainda não rodou) e **Run**.
2. Nova query → cole **`supabase-fichas.sql`** → **Run**. Cria `mesas`, `mesa_membros`, `personagens` e `mestre_dados`, com RLS e tempo real. Pode rodar de novo quando o arquivo mudar.
3. Supabase → Authentication → URL Configuration: em *Redirect URLs*, inclua o endereço do site (ex.: `https://SEU-USUARIO.github.io/Daggerheart/`), para o link de e-mail e a recuperação de senha funcionarem.

A URL e a chave pública do Supabase ficam no topo de `index.html` e `mestre.html`.

## Cenas complexas

Momentos de tensão que não são combate (perseguição, infiltração, ritual) são movidos por Contadores em disputa e por uma tabela de resultados (Crítico, Sucesso/Falha com Esperança/Medo). O JSON usa `"formato": "daggerheart-batalha"`, `"versao": 2` e `"tipo": "cena"`; batalhas v1 (ou sem `tipo`) continuam iguais. O formato completo, com exemplo, está em **Mestre → Conectar IA → Cena complexa: o formato** e em `data/exemplo-cena.json`. A lógica fica em `js/cena.js` (sem tela), a tela em `js/views/cena.js`.

### Pressão de Fim de Rodada (homebrew)

Campo opcional `pressao` na cena. No fim de toda rodada, o PJ com o pior resultado (empate: o mestre escolhe) faz uma reação de `atributo` (padrão Agilidade) na `dificuldade` (omitida: usa `dificuldade_rolagem`). Falha: dano da faixa em que está o Contador do mestre (`contagem`, do lado “mestre”). Sucesso: marca 1 Estresse. Crítico: ignora. Não custa Medo e não altera Contadores. `faixas` (`de`, `ate`, `dano` em dados + “fís”/“mág”) são validadas; omitidas, são geradas por terços das caixas com o dano do Tier. Na tela da cena, o cartão mostra a faixa ativa e “Próxima rodada” abre o passo Aplicar Pressão (Falhou, Passou, Crítico ou Pular), que entra no log. Cenas já criadas ganham a Pressão (e editam “Como funciona a rodada”) em **Editar** ou em **Opções → Adicionar Pressão padrão do Tier**, sem perder o andamento.

## Enviar um personagem pronto (one-shots)

Crie o personagem normalmente (marque “Estou criando para entregar a um jogador” no último passo) ou abra uma ficha existente → **Ajustes → Enviar para um jogador**. O site gera um link com a ficha comprimida dentro dele; o jogador abre, toca em **Receber** e ganha uma cópia só dele (o seu continua com você). Não precisa de conta nem de banco. Se a ficha está numa mesa sua, o link pode já colocar o jogador na mesa. Alternativa: baixar o arquivo `.json` e o jogador importa em Conta → Restaurar backup.

## Criar personagens por JSON (one-shots com IA)

Em **Fichas → Criar por JSON** (`#/personagem-json`) você cola a resposta do Claude e cada bloco JSON vira uma ficha de nível 1. O site valida as regras do assistente de criação (atributos +2/+1/+1/0/0/−1, 2 Experiências, 2 cartas de nível 1 dos domínios da classe, arma e armadura de Patamar 1, ancestralidade mista) e mostra a ficha calculada antes de criar; erros apontam o campo e o botão **Copiar pedido de correção** devolve o problema ao Claude. Aceita um objeto, uma lista ou `{"personagens": [...]}`, com nomes em inglês (ids do SRD) ou em português. Atributos, armas e armadura omitidos usam a sugestão da classe. A própria tela tem as **instruções para o projeto do Claude**, o **catálogo** com os nomes exatos e um exemplo. Só nível 1 por enquanto. Lógica em `js/personagem-json.js` (testada em `tests/`), tela em `js/views/personagemjson.js`.

## Tokens de ação

Os tokens (homebrew) **não voltam sozinhos** quando todos zeram: só quando o mestre aperta **Reiniciar tokens** (Mesas, ou Mestre → Tokens de ação) ou o jogador toca no **↺** da própria ficha.

## Batalha: faixa fixa e lembretes

Na batalha, o Medo e as contagens regressivas ficam numa **faixa fixa no topo**, sempre visíveis enquanto você rola. Toque no nome de uma contagem para renomear, mudar as caixas, zerar ou excluir. O botão **Lembretes** (lateral esquerda, `Alt+L`) abre o painel “Não esquecer”, com lembretes do tipo *não pode esquecer*, *se acontecer…* e *geral*; um lembrete ligado a um adversário também aparece como selo no cartão dele. Ao iniciar a batalha, o painel abre sozinho se houver lembretes pendentes. O campo `lembretes` também vem no JSON da IA (batalha e cena).

## Adicionar um item à ficha de um jogador

Em todo lugar onde aparece um item (Compêndio → Armas, Armaduras e Itens; o gerador de tesouro; as lojas da aba Locais), há o botão **Adicionar à ficha**. O mestre escolhe entre as fichas das suas mesas (e as suas); armas e armaduras podem ser guardadas ou equipadas (respeitando o patamar do personagem), consumíveis e itens vão para o inventário e somam a quantidade. A alteração é salva na hora e chega ao celular do jogador em tempo real. Um jogador também pode usar o botão para as próprias fichas. Ficha só local, sem conta, também funciona.

## Locais e lojas (mestre)

Na aba **Mestre → Locais** o site gera estabelecimentos prontos: ferraria, casa de relíquias, boticário, empório arcano, loja geral, alfaiate, taverna, estábulo, templo, escriba, mercado negro e casa de penhores. Cada um tem **tamanho** (banca, loja, empório, casa lendária: mais itens e patamares maiores), **qualidade** (simples, comum, refinada) e **região** (vilarejo a fronteira: ajusta os preços), dono com personalidade, gancho, estoque com preços e serviços. Dá para trocar ou remover itens, salvar nos seus locais, copiar como texto e dar qualquer item a um jogador.

Preços: armas e armaduras seguem a tabela *Average Costs* do SRD (faixa por patamar); refeição, quarto, carruagem, montaria, ferramentas e roupas usam os valores do SRD. Consumíveis, itens e os demais serviços são **sugestões** derivadas dessas faixas (marcadas como “sugestão” na tela). A raridade de consumíveis e itens é aproximada pela posição na tabela de loot. Valores abaixo de 1 punhado usam a regra opcional de moedas (10 moedas = 1 punhado).

## Painel de emergência (mestre)

Na aba Mestre há um botão flutuante (`Alt+H`) que abre uma lateral com hooks narrativos para improvisar (mundo vivo, fora da rota, encontro rápido, complicação, puxar de volta, respiro, clima, perguntas ao grupo), nomes de NPC e hooks próprios. Os hooks de partida estão em `js/hooks.js`.

## Testes

Abra `/tests/` pelo servidor local (`python -m http.server 8765`). A página roda sem dependências e cobre validação das cenas, efeitos, Medo, gatilhos, fim, desfazer, importador (v1, v2, vários blocos) e envio de personagem. Fixture: `tests/fixtures/fuga-telhados.json`.

## Batalhas criadas pela IA

Em **Mestre → Conectar IA** há as instruções para colar no seu projeto do Claude e o catálogo de adversários para anexar. Quando o Claude sugerir uma batalha, ele responde com um bloco JSON; em **Mestre → Importar da IA** você cola a resposta, o site valida (nomes, orçamento de Pontos de Batalha, referência por patamar) e cria a batalha pronta, inclusive com adversários novos inventados por ele, que ficam salvos na biblioteca.

## Como a mesa funciona

1. O mestre entra em **Mesas → Criar mesa** e envia o código (ou link) aos jogadores.
2. O jogador entra com o código e vincula a ficha (ou escolhe a mesa ao criar o personagem).
3. O dono edita a ficha; o mestre vê e pode editar; os demais jogadores da mesa só leem.
4. Sem conta, as fichas ficam salvas no aparelho. Ao entrar, elas sobem para a nuvem.

## Expansão Hope & Fear

Os dados vêm do **SRD 2.0 (25/08/2026)**, que inclui a expansão sob a licença DPCGL. O botão fica em **Conta → Expansão Hope & Fear** (padrão: desligado). Cada mesa também pode ligar ou desligar para as fichas dela.

## Estrutura

```
index.html            app das fichas
mestre.html           redireciona para a aba Mestre (mestre-antigo.html = versão antiga)
css/app.css
js/main.js            rotas e eventos
js/data.js            carga dos dados + tradução + filtro da expansão
js/calc.js            estatísticas derivadas e regras de subida de nível
js/store.js           Supabase, cache local, tempo real
js/gm.js              dados e regras do mestre (batalhas, adversários, importação da IA)
js/cena.js            lógica pura das cenas complexas (testada em tests/)
js/entrega.js         envio de personagem por link
js/hooks.js           banco de hooks do painel de emergência
js/locais.js          lojas e serviços (preços, estoque, geração)
tests/                página de testes sem dependências
js/views/*.js         telas
data/base.json        SRD base estruturado (EN)
data/exp.json         Hope & Fear (EN)
data/adversarios.json adversários base do SRD (EN)
data/exp-adv.json     adversários e ambientes do SRD 2.0 (EN)
data/pt/*.json        traduções PT-BR (por id)
data/guia.json        guia rápido de regras em PT
data/regras-en.json   SRD completo (EN) para busca
```

Para rodar localmente: `python -m http.server 8765` nesta pasta e abra `http://localhost:8765`. (Módulos ES não funcionam abrindo o arquivo direto.)

## Licença

Inclui materiais do Daggerheart System Reference Document 2.0, © Critical Role, LLC, sob a Darrington Press Community Gaming License (DPCGL). Tradução não oficial. Não afiliado à Critical Role ou à Darrington Press.


## Mapas de batalha (gerador)

A IA descreve o mapa em JSON e o gerador Python desenha, sempre no mesmo traço.

```
copie a resposta da IA  ->  gerar-mapa.cmd (duplo clique)  ->  aba Mestre > Mapas
```

- `python -m mapa gerar arquivo.json` (ou `--area-transferencia`, ou `-` para stdin). `--preview` desenha em baixa resolução em segundos.
- `python -m mapa validar arquivo.json` confere sem desenhar; os erros vêm em português, todos de uma vez.
- `python -m mapa catalogo --salvar` regrava `catalogo-mapas.md` (anexe ao Projeto da IA). O catálogo vem de `mapa/catalogo.py`.
- Saídas: `mapas/` (JPG leve + `index.json`, vai para o site) e `mapas-hd/` (PNG de impressão, com e sem grade, no DPI do tamanho real; fora do git).
- `python -m mapa galeria` gera `galeria/objetos.png` (todos os itens e variantes, com nome) e `galeria/terreno.png` (materiais, linhas, portas, janelas, salas): é o jeito mais rápido de escolher itens olhando. Também serve de autoteste do catálogo.
- Catálogo: 64 objetos (interior, ofício, masmorra, rito, natureza, caverna, táticos), 15 materiais, 9 biomas, 9 tipos de linha, salas redondas, janelas, portas dupla/grade/quebrada e os geradores `fileira` e `espalhar` (bosques, colunatas, barricadas sem escrever item por item). O gerador avisa sala sem porta, porta/janela fora da parede, objeto duplicado e `espalhar` que não coube.
- Exemplos em `mapa/exemplos/` (`acampamento-na-clareira.json` mostra os geradores). Dependências: `pip install numpy pillow scipy`.
- Para ensinar um objeto novo: desenhe a função em `mapa/sprites_casa.py` (interior/masmorra) ou `mapa/sprites_fora.py` (natureza/táticos), exporte em `DESENHOS`/`TAMANHOS`/`LUZES`, registre em `mapa/catalogo.py` (a camada vem de lá) e rode `catalogo --salvar` e `galeria`.
