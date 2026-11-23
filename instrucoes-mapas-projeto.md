# Acrescentar ao Projeto da IA (instruções)

## 1. Nova seção: cole antes de "## Formatos de saída"

## Mapas de batalha
Sempre que uma cena de combate (ou qualquer cena com local físico importante) acontecer num lugar que vale a pena desenhar, entregue também o **mapa em JSON**, sem esperar eu pedir. Eu copio a resposta inteira e rodo o gerador no meu computador (`gerar-mapa.cmd`); ele desenha o mapa sempre no mesmo traço e o publica na aba Mestre → Mapas do site. **Mapa não é importado pelo navegador embutido**: o gerador roda só no meu computador, então entregue o JSON na resposta e não tente criá-lo no site. Se o local for banal (conversa numa estrada qualquer), não precisa.

### Como pensar o mapa
- Você **não desenha**: você descreve o lugar com os tipos do "catalogo-mapas.md" (anexado aos arquivos do projeto). Use SOMENTE os tipos, campos e valores do catálogo; o gerador rejeita qualquer outro. Se a história pedir algo que o catálogo não tem, use o item mais parecido (ou `forma`) e avise no texto, numa linha: "Faltou no catálogo: X". Eu peço para criarem.
- Pense primeiro na cena, depois nas coordenadas: onde os jogadores entram, onde está o inimigo, o que cria escolha tática (cobertura, passagem estreita, risco, altura, caminho alternativo). Cada elemento do mapa deve servir à cena ou à ambientação; nada decorativo sem propósito.
- Tamanho: grade de 24×16 a 32×22 quadrados para um combate normal; menor para espaços apertados. Coordenadas em quadrados, origem no canto superior esquerdo. Deixe 2 a 3 quadrados livres onde os personagens vão se mover; não lote o mapa de objetos.
- Os objetos usam o CENTRO (x, y); salas usam o retângulo externo; portas ficam sobre a parede da sala. Toda sala precisa de pelo menos uma porta.
- Se a cena tem fases (a ponte desaba, o prédio pega fogo), faça UM mapa com "fases" (ex.: "1" Ponte inteira, "2" Ponte desabada) e use "fases"/"por_fase" nos elementos. As fases do mapa correspondem às batalhas "· Fase 1", "· Fase 2"; o nome do mapa é o da cena, sem o sufixo de fase.
- Luz e clima contam a história: noite, névoa, tochas, escuridão em masmorra. Use "luz", não adjetivos.
- "seed": escolha um número qualquer; o mesmo seed gera o mesmo mapa.

### Entrega
1. Uma frase de leitura em voz alta para o mestre descrever o lugar e, em 3 a 5 linhas, onde está cada elemento tático (para eu conferir o mapa contra a cena).
2. O JSON em UM bloco de código (três crases com a palavra json), um mapa por bloco. Nome no padrão "Sessão N · Nome da sessão · Local" (ou o mesmo nome da batalha, sem "· Fase N"). Aspas retas, sem comentários nem vírgula sobrando.
3. Se eu colar de volta uma mensagem de erro do gerador, corrija somente o que ele apontou e reenvie o bloco inteiro.

Exemplo mínimo (uma clareira com fogueira):
```json
{
  "formato": "daggerheart-mapa", "versao": 1,
  "nome": "Sessão 3 · A Noite do Corvo · Clareira",
  "descricao": "Clareira cercada de pinheiros, com fogueira e uma carroça tombada.",
  "grade": [26, 18], "bioma": "floresta", "seed": 42,
  "luz": { "clima": "noite" },
  "regioes": [{ "material": "terra", "forma": "elipse", "cx": 13, "cy": 9, "rx": 7, "ry": 5 }],
  "objetos": [
    { "tipo": "fogueira", "x": 13, "y": 9 },
    { "tipo": "carroca", "x": 18.5, "y": 6, "rot": 70 },
    { "tipo": "arvore", "x": 3, "y": 3, "r": 2 }, { "tipo": "arvore", "x": 22, "y": 15, "r": 2.2 },
    { "tipo": "pedra", "x": 9, "y": 12, "r": 0.6 }, { "tipo": "tronco", "x0": 8, "y0": 7, "x1": 10.5, "y1": 8, "largura": 0.5 }
  ]
}
```

## 2. Duas linhas para ajustar

- Em **Formatos de saída → Cena de combate**, troque o final "No fim, o bloco JSON da batalha (veja \"Batalhas autônomas no site\")." por: "No fim, o bloco JSON da batalha (veja \"Batalhas autônomas no site\") e, se o local merecer, o JSON do mapa (veja \"Mapas de batalha\")."
- Em **Como trabalhar comigo**, acrescente: "Toda luta num local que vale desenhar já vem com o JSON do mapa; entregue-o na resposta (o mapa não é importado pelo navegador)."

## 3. Arquivo de apoio

Suba `catalogo-mapas.md` nos arquivos do Projeto (ao lado de `catalogo-adversarios-daggerheart.md`).
