// Sorteio rápido do painel de emergência: nomes femininos e masculinos, nomes de lugar e descrição de lugar.
// Tudo é original e genérico (serve para qualquer cenário). Cada sorteio devolve itens { n: texto, t?: rótulo }.
import { NOMES } from "./hooks.js";

const pick = a => a[Math.floor(Math.random() * a.length)];
const unico = a => [...new Set(a)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// Sorteia até n itens diferentes
function varios(n, f) { const m = new Map(); for (let g = 0; m.size < n && g < n * 10; g++) { const x = f(); m.set(x.n, x); } return [...m.values()]; }

// ---------- Nomes de pessoas ----------
const FEM = unico([...NOMES.a, "Adelina", "Berenice", "Brígida", "Cecília", "Clarice", "Dalila", "Dora", "Esmeralda", "Eulália", "Flora", "Gertrudes", "Heloísa", "Hilda", "Inês", "Iolanda", "Ione", "Jandira", "Lavínia", "Leona", "Maeve", "Matilde", "Mirela", "Neve", "Noêmia", "Olívia", "Ondina", "Penélope", "Raquel", "Rosalva", "Sabina", "Sibila", "Tereza", "Thaís", "Úrsula", "Valquíria", "Vânia", "Zélia"]);
const MASC = unico([...NOMES.o, "Alaric", "Baldo", "Bruno", "Cássio", "Cesário", "Dante", "Egídio", "Elias", "Fábio", "Godofredo", "Heitor", "Hugo", "Ícaro", "Isaac", "Jonas", "Jorge", "Lauro", "Leandro", "Murilo", "Natan", "Nestor", "Osvaldo", "Otávio", "Plínio", "Rafael", "Rúben", "Sandro", "Teodoro", "Tomé", "Urbano", "Vasco", "Vítor", "Zacarias"]);
const SOBRE = unico([...NOMES.s, "Alvarenga", "Brandão", "Lacerda", "Mourão", "Nogueira", "Pinheiro", "Ramos", "Seixas", "Tavares", "Valente", "Ventura", "Vilela"]);
export function sortearNomes(genero = "f", n = 8, sobrenome = true) {
  const base = genero === "m" ? MASC : FEM;
  return varios(n, () => ({ n: sobrenome ? `${pick(base)} ${pick(SOBRE)}` : pick(base) }));
}

// ---------- Nomes de lugar ----------
// Gênero e número: m, f, mp (plural masculino), fp (plural feminino). O índice escolhe a forma do artigo, da contração e do adjetivo.
const G = { m: 0, f: 1, mp: 2, fp: 3 }, ART = ["o", "a", "os", "as"], DE = ["do", "da", "dos", "das"];
const TIPOS = {
  povoado: [["Vila", "f"], ["Cidade", "f"], ["Aldeia", "f"], ["Povoado", "m"], ["Porto", "m"], ["Vilarejo", "m"], ["Feira", "f"], ["Burgo", "m"], ["Fazenda", "f"], ["Arraial", "m"], ["Forte", "m"]],
  natureza: [["Floresta", "f"], ["Bosque", "m"], ["Pântano", "m"], ["Vale", "m"], ["Colina", "f"], ["Lago", "m"], ["Rio", "m"], ["Montanha", "f"], ["Caverna", "f"], ["Pico", "m"], ["Charneca", "f"], ["Cânion", "m"], ["Ilha", "f"], ["Campina", "f"], ["Praia", "f"]],
  construcao: [["Torre", "f"], ["Castelo", "m"], ["Templo", "m"], ["Mosteiro", "m"], ["Ponte", "f"], ["Farol", "m"], ["Ruínas", "fp"], ["Santuário", "m"], ["Fortaleza", "f"], ["Mina", "f"], ["Cripta", "f"], ["Moinho", "m"], ["Capela", "f"]],
};
// Substantivos para "do/da/dos/das ___"
const BASES = [["Moinho", "m"], ["Corvo", "m"], ["Vento", "m"], ["Lobo", "m"], ["Salgueiro", "m"], ["Penhasco", "m"], ["Eco", "m"], ["Trovão", "m"], ["Carvalho", "m"], ["Sino", "m"], ["Espinheiro", "m"], ["Rei", "m"], ["Pescador", "m"], ["Viajante", "m"], ["Silêncio", "m"], ["Crepúsculo", "m"], ["Cervo", "m"], ["Dragão", "m"], ["Javali", "m"],
  ["Ponte", "f"], ["Ribeira", "f"], ["Lua", "f"], ["Rainha", "f"], ["Fonte", "f"], ["Aurora", "f"], ["Névoa", "f"], ["Tempestade", "f"], ["Raposa", "f"], ["Coruja", "f"], ["Estrela", "f"], ["Serpente", "f"], ["Colheita", "f"], ["Forja", "f"], ["Pedra", "f"], ["Sombra", "f"], ["Chuva", "f"],
  ["Corvos", "mp"], ["Lobos", "mp"], ["Sussurros", "mp"], ["Espinhos", "mp"], ["Ossos", "mp"], ["Mortos", "mp"], ["Ventos", "mp"], ["Esquecidos", "mp"], ["Sinos", "mp"], ["Salgueiros", "mp"],
  ["Cinzas", "fp"], ["Sombras", "fp"], ["Lágrimas", "fp"], ["Estrelas", "fp"], ["Fontes", "fp"], ["Pedras", "fp"], ["Brumas", "fp"], ["Chamas", "fp"], ["Almas", "fp"]];
// Adjetivos: masculino, feminino, masculino plural, feminino plural
const ADJ = [["Velho", "Velha", "Velhos", "Velhas"], ["Negro", "Negra", "Negros", "Negras"], ["Alto", "Alta", "Altos", "Altas"], ["Cinzento", "Cinzenta", "Cinzentos", "Cinzentas"], ["Esquecido", "Esquecida", "Esquecidos", "Esquecidas"], ["Rubro", "Rubra", "Rubros", "Rubras"], ["Quebrado", "Quebrada", "Quebrados", "Quebradas"], ["Silencioso", "Silenciosa", "Silenciosos", "Silenciosas"], ["Dourado", "Dourada", "Dourados", "Douradas"], ["Sombrio", "Sombria", "Sombrios", "Sombrias"], ["Branco", "Branca", "Brancos", "Brancas"], ["Profundo", "Profunda", "Profundos", "Profundas"], ["Antigo", "Antiga", "Antigos", "Antigas"], ["Perdido", "Perdida", "Perdidos", "Perdidas"], ["Verde", "Verde", "Verdes", "Verdes"], ["Frio", "Fria", "Frios", "Frias"]];
const PROPRIOS = ["Pedralva", "Cantomar", "Vento-Sul", "Salgueiro", "Passo-Curto", "Terra-Alta", "Lume", "Rocha-Seca", "Fonte-Fria", "Aurem", "Valdoro", "Brumalta", "Sétimo Porto", "Três Pontes", "Cinco Ventos", "Quebra-Mar", "Vale-Fundo", "Altamira", "Rio Manso", "Pontelonga", "Rocamor", "Serralva", "Ferrolume", "Marfria"];
// Taverna e estalagem: "O Javali Cansado", "A Lanterna Torta"
const TAV = [["Javali", "m"], ["Corvo", "m"], ["Cervo", "m"], ["Dragão", "m"], ["Ganso", "m"], ["Barril", "m"], ["Sino", "m"], ["Machado", "m"], ["Cavalo", "m"], ["Gato", "m"], ["Caneca", "f"], ["Lanterna", "f"], ["Estrela", "f"], ["Coroa", "f"], ["Raposa", "f"]];
const ADJ_TAV = [["Cansado", "Cansada"], ["Dourado", "Dourada"], ["Torto", "Torta"], ["Cego", "Cega"], ["Bêbado", "Bêbada"], ["Gordo", "Gorda"], ["Sorridente", "Sorridente"], ["Manco", "Manca"], ["Teimoso", "Teimosa"], ["Valente", "Valente"]];
export const TIPOS_LUGAR = [["qualquer", "Qualquer"], ["povoado", "Povoado"], ["natureza", "Natureza"], ["construcao", "Construção"]];

function lugar(tipo) {
  const k = tipo === "qualquer" || !TIPOS[tipo] ? pick(Object.keys(TIPOS)) : tipo, r = Math.random();
  if (k === "povoado" && r < 0.3) return { n: pick(PROPRIOS), t: "povoado" };
  if (k === "construcao" && r < 0.3) { const [b, g] = pick(TAV); return { n: `${cap(ART[G[g]])} ${b} ${pick(ADJ_TAV)[G[g]]}`, t: pick(["taverna", "estalagem"]) }; }
  const [t, tg] = pick(TIPOS[k]);
  if (r < 0.6) return { n: `${t} ${pick(ADJ)[G[tg]]}` };
  const [b, bg] = pick(BASES);
  return { n: `${t} ${DE[G[bg]]} ${b}` };
}
export const sortearLugares = (tipo = "qualquer", n = 6) => varios(n, () => lugar(tipo));

// ---------- Descrição de lugar ----------
// Cada descrição junta quatro frases independentes: o que se vê, o que se sente, quem está ali e um detalhe estranho.
const DESC = {
  vila: { r: "Vila ou cidade",
    vis: ["As casas de pedra e telhado de palha se agrupam em torno de uma praça de terra batida, com um poço no centro.", "Ruas estreitas e tortas sobem uma encosta, com sacadas de madeira tão próximas que quase se tocam.", "Uma muralha baixa e remendada cerca o povoado, e o portão está aberto sem ninguém para vigiá-lo.", "Casas caiadas de branco se espalham ao longo de um rio, ligadas por pontes pequenas de madeira.", "O centro é um mercado coberto de lonas coloridas, cercado de casas altas e escuras.", "Telhados de ardósia molhada brilham sob o céu cinza, e a fumaça das chaminés desce em vez de subir."],
    sen: ["O ar cheira a pão quente, estrume e lenha queimada.", "Ouvem-se o martelo de um ferreiro, os gritos dos vendedores e galinhas por todos os lados.", "Sinos de algum templo marcam as horas, sempre um pouco desencontrados.", "Cheiro de peixe, sal e corda molhada vem do lado do cais.", "Uma rabeca desafinada toca ao longe a mesma melodia, sem parar.", "O ar está carregado de fumaça de lenha e de conversas abafadas."],
    gente: ["Os moradores olham os forasteiros sem hostilidade, mas também sem pressa de falar.", "Crianças correm entre as bancas enquanto os adultos conversam baixo, em grupos.", "Todos parecem se conhecer, e as conversas morrem quando alguém de fora passa.", "Guardas de uniformes que não combinam patrulham em duplas, entediados.", "Há mais gente do que a vila comporta: viajantes, mercadores e refugiados acampados nas esquinas.", "Quase não há ninguém na rua; as portas estão fechadas, mas as cortinas se mexem."],
    toque: ["Um cartaz recente está pregado em todas as portas, e ninguém quer comentar.", "A estátua da praça tem o rosto coberto por um pano, como se alguém tivesse acabado de arrumá-la.", "O prédio mais alto está trancado há dias, e todos desviam o olhar quando alguém pergunta.", "Uma mancha escura no chão da praça foi esfregada mil vezes e continua lá.", "Todos os relógios e sinos marcam uma hora diferente.", "Há um leve cheiro de enxofre que ninguém parece notar."] },
  taverna: { r: "Taverna",
    vis: ["O salão é baixo, de vigas escuras, com uma lareira de pedra enorme na parede dos fundos.", "Mesas compridas de madeira gasta enchem o salão, cada uma marcada por anos de canecas.", "A estalagem tem dois andares, com uma escada rangente que leva a quartos de portas tortas.", "É um porão de teto arqueado, iluminado por velas em garrafas e cheio de barris empilhados.", "Janelas pequenas deixam entrar uma luz amarelada, e o chão está coberto de palha limpa.", "Cabeças de animais empalhados e armas enferrujadas decoram as paredes, todas de procedência duvidosa."],
    sen: ["Cheiro de ensopado, cerveja derramada e fumaça de lenha.", "Alguém toca alaúde num canto, e ninguém presta muita atenção.", "O ar é quente e úmido, com cheiro de roupa molhada e pão assando.", "O barulho de dados rolando e de moedas batendo na mesa vem do fundo.", "O falatório é alto, mas cai por um instante sempre que a porta se abre.", "Há um cheiro doce de maçã assada que destoa do resto do lugar."],
    gente: ["O dono, corpulento, enxuga o mesmo copo atrás do balcão e observa quem entra.", "Mercadores, soldados de folga e um velho dormindo sobre os braços dividem o salão.", "Uma garçonete ágil conhece todos os fregueses pelo nome e pelo que devem.", "Quase todas as mesas estão ocupadas, menos uma, que ninguém ousa tomar.", "Um grupo de viajantes encapuzados bebe em silêncio, de costas para a porta.", "O dono recebe os PJs como velhos conhecidos, o que não deveria ser possível."],
    toque: ["Um dos fregueses exibe, sem esconder, um objeto que não deveria estar com ele.", "Há uma porta nos fundos com três cadeados novos.", "Uma mancha seca no assoalho foi coberta por um tapete que não combina com o resto.", "Alguém deixou uma carta lacrada na mesa mais próxima, endereçada a um dos PJs.", "O prato do dia está escrito num quadro, e a última linha parece um recado.", "Um bardo canta uma canção que descreve, com detalhes demais, a viagem recente do grupo."] },
  natureza: { r: "Natureza",
    vis: ["Árvores altas e retorcidas fecham a copa, deixando passar apenas fiapos de luz esverdeada.", "Um vale amplo se abre entre duas serras, coberto de relva alta que ondula com o vento.", "O terreno é um pântano de água parada, com troncos mortos emergindo como dedos.", "Uma colina pedregosa sobe em degraus naturais, coroada por um único carvalho antigo.", "Um rio largo corta a paisagem, com margens de pedra lisa e corredeiras em alguns trechos.", "Uma charneca desolada se estende até o horizonte, coberta de urze e névoa baixa."],
    sen: ["O ar é úmido e cheira a terra molhada e folhas podres.", "Insetos zumbem e pássaros cantam, até que, de repente, tudo silencia.", "O vento traz, de muito longe, cheiro de neve e de pinho.", "Há som de água corrente por perto, mas ninguém descobre de onde vem.", "O chão cede um pouco a cada passo, e o ar tem gosto de sal.", "Um zumbido constante de abelhas vem de algum lugar lá em cima."],
    gente: ["Há sinais de vida recente: pegadas, uma fogueira apagada, um cesto abandonado.", "Os animais evitam esta área, e os poucos que aparecem estão inquietos.", "Uma trilha estreita corta o terreno, gasta por gerações de viajantes e de quem não era viajante.", "Marcas de garras profundas riscam as árvores à altura de dois homens.", "O lugar parece intocado há séculos, o que o torna ainda mais estranho.", "Pássaros acompanham o grupo de galho em galho, sempre à mesma distância."],
    toque: ["Um círculo perfeito de cogumelos cresce no chão, e dentro dele a grama está seca.", "Um marco de pedra com um símbolo que ninguém reconhece aparece à beira do caminho de tempos em tempos.", "No meio do nada há uma cadeira de madeira, virada para o lugar de onde o grupo veio.", "Uma fonte de água cristalina brota de uma rocha, e ao lado dela há oferendas recentes.", "Uma corda antiga pende de um galho e balança sem vento.", "O céu escurece mais cedo do que deveria, e algo grande se move ao longe, sem fazer barulho."] },
  ruina: { r: "Ruína",
    vis: ["Paredes de pedra cobertas de musgo se erguem em fragmentos, e o telhado há muito virou entulho.", "Uma escadaria larga desce para a escuridão, com degraus tão gastos que parecem de cera.", "Colunas quebradas ainda sustentam um arco, sob o qual cresce uma árvore sem folhas.", "O que foi um grande salão é agora um pátio a céu aberto, com o mosaico do piso quase intacto.", "Corredores de pedra negra se cruzam em ângulos estranhos, e as paredes estão riscadas de inscrições.", "Uma torre inclinada resiste à beira de um penhasco, com janelas vazias como olhos."],
    sen: ["O ar é frio e seco, com cheiro de poeira e metal antigo.", "Pingos de água ecoam ao longe, em ritmo irregular.", "Cada passo ecoa um segundo a mais do que deveria.", "Um vento constante assobia por frestas que ninguém vê.", "O silêncio é tão pesado que dá para ouvir a própria respiração.", "Um cheiro de incenso velho, doce e enjoativo, paira sem vir de lugar algum."],
    gente: ["Outros estiveram aqui há pouco: restos de fogueira, pegadas e uma corda ainda fresca.", "Ossos de animais estão empilhados num canto, arrumados demais para serem acaso.", "Alguns símbolos nas paredes foram raspados, e os raspões ainda estão claros.", "Um acampamento foi abandonado às pressas: panelas ainda mornas, mochilas abertas.", "Nada vive aqui: nem insetos, nem teias, nem musgo nas pedras mais fundas.", "Estátuas, todas voltadas para a mesma porta, têm os rostos martelados."],
    toque: ["Uma das portas está trancada por dentro, e há marcas de alguém tentando sair.", "No centro do salão há um altar limpo demais, com uma única vela acesa.", "Um desenho no chão mostra o caminho exato que o grupo acabou de fazer.", "As inscrições nas paredes mudam de idioma conforme o grupo se aprofunda.", "Uma chave de ferro pende de um gancho, bem à vista, e não há porta que ela abra.", "Do fundo vem uma voz calma, repetindo os nomes dos PJs, um por um."] },
};
export const TIPOS_DESC = [["qualquer", "Qualquer"], ...Object.entries(DESC).map(([k, v]) => [k, v.r])];
export function sortearDescricao(tipo = "qualquer") {
  const k = DESC[tipo] ? tipo : pick(Object.keys(DESC)), d = DESC[k];
  return { n: [pick(d.vis), pick(d.sen), pick(d.gente), pick(d.toque)].join(" "), t: d.r };
}
