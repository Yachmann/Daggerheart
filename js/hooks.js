// Banco de hooks narrativos para momentos de emergência. Conteúdo original e genérico (serve para qualquer cenário).
// Cada item: [título curto, desenvolvimento para usar já].
export const CATEGORIAS = [
  { k: "mundo", n: "Mundo vivo", d: "Pequenos acontecimentos para o mundo parecer vivo.", itens: [
    ["Um sino toca fora de hora", "Ninguém na vila sabe por quê. Quem corre para ver encontra o sineiro dormindo, sem lembrar de ter tocado. Alguma coisa usou o corpo dele."],
    ["Cartazes novos nas paredes", "Procura-se alguém com uma descrição quase igual à de um dos PJs. A recompensa é alta demais, e quem colou os cartazes ainda está por perto."],
    ["Uma procissão atravessa a rua", "Carregam um caixão vazio e cantam baixo. Cada pessoa que os PJs perguntarem dá uma explicação diferente."],
    ["O preço de um item comum dispara", "Pão, sal ou lenha custam o dobro. O comerciante culpa a estrada; a estrada, na verdade, foi fechada por alguém que ninguém viu."],
    ["Duas crianças brincam de guerra", "Os lados da brincadeira têm nomes de facções reais. O jogo revela o que o povo pensa de cada uma."],
    ["Um animal segue o grupo", "Cão, corvo ou gato. Aparece sempre na hora errada e traz algo na boca: uma chave, um anel, um pedaço de carta."],
    ["Rumor contraditório", "Dois estalajadeiros contam a mesma história de formas opostas. A verdade está nos detalhes que os dois evitam."],
    ["A feira muda de dono", "Um grupo novo montou as barracas durante a noite. Vendem coisas boas demais, e ninguém lembra de tê-los visto chegar."],
    ["Um velho pede ajuda com algo trivial", "Carregar um saco, achar uma chave. Quem ajudar tem o nome lembrado por anos, e ele retribui no pior momento."],
    ["Fumaça na linha do horizonte", "Não é incêndio nem acampamento. Anda devagar na direção do grupo, mas só se vê quando ninguém está olhando."],
    ["Um mensageiro exausto cai na praça", "Traz uma carta endereçada a alguém que morreu há meses. Quem a escreveu depois disso?"],
    ["O mercado silencia por um instante", "Todos olham para o mesmo ponto e voltam ao que faziam. Ninguém admite ter parado."],
    ["Um mapa pregado de cabeça para baixo", "Qualquer aprendiz o corrigiria. Mas o lado “errado” mostra um caminho que o lado certo esconde."],
    ["Crianças cantam uma canção nova", "A letra descreve, em rimas, algo que ainda vai acontecer na região. Ninguém sabe quem a ensinou."],
  ] },
  { k: "desvio", n: "Fora da rota", d: "O grupo foi para onde você não planejou? Tem sempre algo ali.", itens: [
    ["Uma ponte com pedágio informal", "Moradores cobram passagem por uma ponte que eles mesmos consertaram. São razoáveis, desde que ninguém os trate como bandidos."],
    ["Uma estalagem sem hóspedes", "Limpa, aquecida, com comida pronta. A dona esperava visitas “importantes” e confunde os PJs com elas."],
    ["Ruínas pequenas demais para um mapa", "Uma única sala de pedra com um altar. Algo foi enterrado aqui de propósito, e algo mais sabe disso."],
    ["Um acampamento de viajantes", "Cada pessoa vem de um lugar diferente e todas foram desviadas pelo mesmo motivo. Juntas, sabem mais do que percebem."],
    ["Uma vila com um único morador", "Os outros “foram embora ontem”. As camas estão desfeitas há pouco e todas as pegadas saem para o mesmo lado."],
    ["Um eremita com opinião sobre tudo", "Conhece o plano dos PJs melhor do que eles. Cobra um favor pequeno para dizer o que sabe, e o favor leva de volta à trama."],
    ["Um duelo marcado para o amanhecer", "Os dois lados querem testemunhas neutras. Quem aceitar vira alvo de quem perder."],
    ["Uma caravana atolada", "Pedem ajuda e oferecem carona. A carga está sob lonas, e um dos condutores reage demais quando alguém se aproxima dela."],
    ["Um posto da guarda local", "Pedem que os PJs entreguem as armas. O capitão tem boas razões: está com medo de algo pior que eles."],
    ["Uma festa de casamento", "O noivo some no meio da cerimônia. A família implora ajuda e esconde um motivo possível para a fuga."],
    ["Um poço que responde", "Quem pergunta em voz alta ouve a própria pergunta de volta, com outra voz. As respostas custam algo pequeno e pessoal."],
    ["Um mercado de trocas sem moedas", "Aqui se paga com lembranças, nomes ou favores. O vendedor aceita menos do que parece e cobra mais do que avisa."],
    ["Um monumento recente", "Homenageia um herói que ninguém recorda, com a data de ontem. A tinta ainda está fresca, e alguém o estava limpando."],
    ["Uma tempestade local", "Só chove sobre uma casa de pedra, num raio curto. Quem se abriga lá dentro é aceito sem perguntas, mas só sai ao amanhecer."],
  ] },
  { k: "encontro", n: "Encontro rápido", d: "Um NPC pronto: o que quer e o que esconde.", itens: [
    ["Pescadora de poucas palavras", "Quer vender o que pescou; esconde que viu um navio sem tripulação. Só conversa se alguém comprar algo."],
    ["Escrivão assustado", "Quer entregar um documento sem ser visto; esconde que o leu. Treme a cada passo que ouve atrás de si."],
    ["Mercenário aposentado", "Quer paz e um bom jantar; esconde um contrato antigo que está voltando para cobrá-lo."],
    ["Aprendiz de feiticeiro perdido", "Quer o mestre de volta; esconde que o perdeu por causa de um erro dele. Faz magias pequenas quando fica nervoso."],
    ["Colecionadora de histórias", "Quer ouvir a melhor aventura do grupo; esconde que já conhece pedaços dela. Paga em informações, não em moedas."],
    ["Guarda cansado", "Quer que alguém assuma o seu turno; esconde que viu o que não devia. Aceita suborno e fica remoendo."],
    ["Cozinheiro de taverna", "Quer um ingrediente raro; esconde que a casa deve dinheiro a alguém perigoso. Sabe tudo que se diz no salão."],
    ["Criança mensageira", "Quer ser levada a sério; esconde de quem é o recado. Corre mais rápido do que qualquer um do grupo."],
    ["Nobre decadente", "Quer um aliado discreto; esconde que a família já não tem nada além do sobrenome. Fala como quem ainda manda."],
    ["Pastor de cabras", "Quer recuperar uma cabra; esconde que ela fugiu por causa de algo na montanha. Conhece trilhas que nenhum mapa mostra."],
    ["Contrabandista simpático", "Quer um favor logístico; esconde a carga. Nunca mente, só escolhe o que dizer."],
    ["Sacerdote de um santuário esquecido", "Quer visitantes; esconde que o santuário perde o poder. Rezar ali tem preço, e ele o paga em silêncio."],
    ["Soldado desertor", "Quer atravessar a fronteira; esconde o que carrega. Sabe de uma ordem que não deveria ter sido dada."],
    ["Bardo com uma dívida", "Quer novos ouvintes; esconde a quem deve. Depois da primeira noite, canta sobre os PJs, com detalhes demais."],
  ] },
  { k: "complicacao", n: "Complicação", d: "Para virar uma cena no meio, sem desfazê-la.", itens: [
    ["O chão cede", "Parte do terreno afunda ou o piso quebra. Quem está perto precisa escolher entre agarrar algo e salvar alguém."],
    ["Uma segunda facção chega", "Não é aliada de ninguém. Quer o mesmo objetivo e começa a agir já."],
    ["O tempo acaba mais cedo", "O que daria uma hora dá dez minutos. Crie ou avance um Contador de pressão."],
    ["Uma pista essencial é destruída", "Alguém a queima, rasga ou leva. Ainda existe outro caminho até ela, só que mais perigoso."],
    ["Um refém inesperado", "Alguém querido por um dos PJs aparece nas mãos do inimigo. A cena muda de objetivo, não de tom."],
    ["A luz se vai", "Tochas, velas ou o próprio sol. O que cada um enxerga agora define quem tem vantagem."],
    ["Um aliado muda de lado", "Por medo, por amor ou por uma oferta melhor. Mostre ao menos um sinal antes, mesmo que tarde demais."],
    ["Um som alto atrai atenção", "Sino, grito, explosão. O silêncio depois diz mais que o barulho."],
    ["A rota de fuga some", "Porta travada, ponte cortada, corda rompida. Há outra saída, mas passa pelo que o grupo queria evitar."],
    ["Uma verdade vem à tona", "Alguém revela, sem querer, algo sobre o passado de um PJ. Serve a qualquer lado da cena."],
    ["O equipamento falha", "Uma arma, um mecanismo ou um feitiço sai errado. A falha vira cena: quem conserta, quem distrai, quem foge."],
    ["Chega ajuda, e ela atrapalha", "A guarda, a família ou um vizinho bem-intencionado. A ajuda é sincera, e o resultado é pior."],
  ] },
  { k: "puxar", n: "Puxar de volta", d: "Para o grupo voltar à trama sem sentir trilho.", itens: [
    ["Um aliado pede socorro", "Alguém conhecido aparece ferido, com notícias da trama principal e pouquíssimo tempo."],
    ["A trama alcança o grupo", "Os vilões ou a consequência de uma escolha passada chegam ao lugar onde os PJs estão, sem convite."],
    ["Um item reage", "Algo que o grupo carrega esquenta, vibra ou responde a uma direção. Sempre aponta para a trama."],
    ["Rumor com nome e sobrenome", "Alguém cita, de passagem, um nome ligado ao arco principal. Perto demais para ser acaso."],
    ["Uma carta com urgência real", "Remetente confiável, prazo curto. Responder ao pedido leva direto ao próximo cenário."],
    ["Um PJ é reconhecido", "Por alguém ligado ao passado dele e à trama. Cada resposta do jogador abre uma porta."],
    ["O mapa mostra mais", "Uma marca antes invisível aparece, ou a anotação de um conhecido. Aponta para o lugar planejado."],
    ["Um contratante insiste", "Aumenta a oferta, muda o tom ou ameaça de leve. Ele precisa do grupo, e é só por isso que se expõe."],
    ["O sonho se repete", "Uma imagem curta, com um detalhe a mais a cada noite. Use no PJ cujo arco está mais parado."],
    ["Um desconhecido segue o grupo", "Não ataca nem se esconde bem. Quer entregar algo, mas só quando estiverem sozinhos."],
    ["Uma consequência atrasada", "Algo que os PJs fizeram duas sessões atrás reaparece: um favor cobrado, uma dívida, uma cicatriz."],
    ["O lugar evitado vem até eles", "Um evento, uma criatura ou uma comitiva do lugar que o grupo estava evitando chega à cena."],
  ] },
  { k: "respiro", n: "Respiro", d: "Cenas calmas entre momentos pesados.", itens: [
    ["Uma refeição demorada", "Cada PJ conta uma pequena história. Pergunte a cada jogador: o que você pediria se pudesse pedir qualquer prato?"],
    ["Alguém cuida das feridas", "Cena curta de cuidado entre dois PJs. Sem rolagem, só conversa."],
    ["Uma festa pequena", "Música, dança, um desafio de bebida. Deixe um NPC secundário dizer algo que muda a leitura de uma cena anterior."],
    ["Um banho e uma roupa limpa", "O primeiro conforto depois de dias. O que cada PJ faz com a hora livre?"],
    ["Cartas para casa", "Cada jogador escreve, em voz alta, uma frase para alguém distante. Use-as depois."],
    ["Uma tarefa simples", "Consertar uma cerca, ajudar numa colheita. O mundo continua existindo fora da aventura."],
    ["Um brinde ao que passou", "O grupo lembra de um momento que o marcou. Dê a cada jogador a chance de dizer “foi aí que tudo mudou”."],
    ["Guarda noturna", "Dois PJs em vigília, conversando baixo. Ótimo para conexões e segredos."],
    ["Um desafio amistoso", "Corrida, jogo de cartas, queda de braço contra um NPC. Como se perde importa mais que quem ganha."],
    ["Silêncio depois da tempestade", "O grupo olha as consequências do que fez. O que sobrou de pé, de quem, de que lado?"],
  ] },
  { k: "clima", n: "Clima e sentidos", d: "Um detalhe para a cena ganhar corpo.", itens: [
    ["Cheiro de metal quente", "Vem de lugar nenhum. Cada PJ o associa a algo diferente."],
    ["Os animais somem", "Nem pássaros, nem insetos. O silêncio está cheio de atenção."],
    ["Neblina baixa", "Cobre os pés. As vozes soam mais perto do que estão."],
    ["Calor fora de hora", "Suor sem esforço, roupas grudadas. Algo próximo irradia."],
    ["Um frio que vem de dentro", "Não esfria o ar, esfria as mãos. Ninguém mais notou."],
    ["Chuva fina e constante", "Abafa os passos e esconde o que se aproxima, mas também esconde o grupo."],
    ["Vento contra", "Empurra na direção de onde vieram. Cada passo é uma decisão."],
    ["Ar parado", "Nenhuma folha se mexe. Qualquer movimento chama atenção."],
    ["Luz dourada demais", "A tarde parece bonita demais para ser verdade. Tudo tem sombra longa e nítida."],
    ["Cheiro de pão quente", "Num lugar onde ninguém assa pão. Leva a uma casa pequena de porta aberta."],
    ["Pegadas pequenas", "Em linha reta, sem fim. Quem as fez parou de repente, ou foi levado."],
    ["Eco atrasado", "A voz volta alguns segundos depois, levemente diferente. Alguém ou algo repete."],
  ] },
  { k: "perguntas", n: "Perguntas ao grupo", d: "Passe a bola aos jogadores e use as respostas.", itens: [
    ["Quem aqui já esteve neste lugar antes?", "Escolha um PJ e peça que descreva o que mudou desde a última vez."],
    ["Qual de vocês reconhece este símbolo?", "O símbolo está ligado ao passado de alguém. Deixe o jogador decidir o que sabe."],
    ["O que seu personagem leva no bolso e nunca mostra?", "O objeto vira um fio narrativo. Use-o numa cena futura."],
    ["Quem aqui deve um favor a alguém desta cena?", "Se ninguém levantar a mão, pergunte: a quem vocês gostariam de dever?"],
    ["O que seu personagem faria se ninguém estivesse olhando?", "Boa antes de uma decisão difícil. A resposta mostra o que ele realmente quer."],
    ["Quem aqui já mentiu para alguém do grupo?", "Sobre algo pequeno. A pergunta cria tensão sem briga."],
    ["De quem vocês sentem falta agora?", "Peça um nome e uma lembrança. Pode ser alguém vivo."],
    ["O que mudou em você desde o começo da jornada?", "Uma frase por jogador. Anote para o fim do arco."],
    ["Qual foi o maior medo que seu personagem escondeu hoje?", "Dê a ele um motivo para agir diferente na próxima cena."],
    ["Quem aqui prefere enfrentar isso sozinho?", "E por quê? Deixe os outros reagirem e use a reação."],
    ["O que vocês fariam com um dia de folga?", "Boa pergunta depois de uma sequência pesada."],
    ["Qual escolha desta sessão vocês refariam?", "Sem consequências. Revela o que cada um valoriza."],
  ] },
];

export const NOMES = {
  a: ["Aurélia", "Belmira", "Cassandra", "Dorotéia", "Elvira", "Fenna", "Gisela", "Helga", "Iara", "Joana", "Kaira", "Lívia", "Marena", "Nadira", "Orla", "Petra", "Quitéria", "Rúbia", "Selene", "Tamsin", "Ula", "Vera", "Wilda", "Yara"],
  o: ["Anselmo", "Bento", "Caio", "Darian", "Eron", "Fausto", "Gael", "Henrique", "Ivo", "Jasper", "Kellan", "Lorenzo", "Matias", "Nilo", "Orestes", "Pietro", "Quim", "Rodrigo", "Silvano", "Tobias", "Ulisses", "Valério", "Wendel", "Xavi"],
  x: ["Cinza", "Corvo", "Dente", "Faísca", "Graveto", "Ninho", "Pardal", "Sombra", "Trapo", "Brasa"],
  s: ["da Ponte", "do Moinho", "Ferro-Velho", "Pedralva", "Vento-Sul", "Mão-Leve", "Salgueiro", "da Ribeira", "Cantomar", "Passo-Curto", "Roda-d’Água", "Terra-Alta", "Sete-Dedos", "Lume", "Cardoso", "Malhadas", "Rocha-Seca", "do Alto", "Quebra-Vento", "Fonte-Fria"],
};
export const idHook = (k, i) => `${k}:${i}`;
export function todosHooks(custom = []) {
  const l = [];
  CATEGORIAS.forEach(c => c.itens.forEach((it, i) => l.push({ id: idHook(c.k, i), cat: c.k, catNome: c.n, t: it[0], d: it[1], meu: false })));
  custom.forEach(m => l.push({ id: m.id, cat: m.cat || "meus", catNome: (CATEGORIAS.find(c => c.k === m.cat) || { n: "Meus" }).n, t: m.t, d: m.d, meu: true }));
  return l;
}
const pick = a => a[Math.floor(Math.random() * a.length)];
export function sortearNome(tipo = "any") {
  const pn = tipo === "a" ? NOMES.a : tipo === "o" ? NOMES.o : pick([NOMES.a, NOMES.o, NOMES.o, NOMES.a, NOMES.x]);
  return `${pick(pn)} ${pick(NOMES.s)}`;
}
