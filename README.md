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

## Enviar um personagem pronto (one-shots)

Crie o personagem normalmente (marque “Estou criando para entregar a um jogador” no último passo) ou abra uma ficha existente → **Ajustes → Enviar para um jogador**. O site gera um link com a ficha comprimida dentro dele; o jogador abre, toca em **Receber** e ganha uma cópia só dele (o seu continua com você). Não precisa de conta nem de banco. Se a ficha está numa mesa sua, o link pode já colocar o jogador na mesa. Alternativa: baixar o arquivo `.json` e o jogador importa em Conta → Restaurar backup.

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
