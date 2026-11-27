// Nomes e descrição curta para os adversários de uma batalha sorteada.
// A descrição é só narrativa (porte, jeito, aparência): nada de equipamento, porque o equipamento vem das estatísticas do adversário.
import { sortearNomes, sortearSobrenome } from "./nomes.js";

const pick = a => a[Math.floor(Math.random() * a.length)];
// "Alt{o|a}" -> "Alto" ou "Alta", conforme o gênero (f = true)
const gen = (s, f) => s.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, fm) => (f ? fm : m));

// Quem são eles: define o jeito de nomear (alcunha, patente, ofício...) e as frases de papel.
export const GRUPOS = [
  ["gangue", "Gangue de rua"],
  ["bandoleiros", "Bandoleiros (estrada)"],
  ["faccao", "Facção, seita ou ordem"],
  ["moradores", "Moradores"],
  ["guardas", "Guardas ou soldados"],
  ["mercenarios", "Mercenários"],
];

// ---------- Nomes ----------
const ALCUNHAS = ["Dedo-Torto", "Cicatriz", "Faca-Rápida", "Cara-de-Pedra", "Sete-Vidas", "Mão-Leve", "Olho-Torto", "Dente-de-Ouro", "Pé-de-Chumbo", "Língua-Solta", "Sem-Sorte", "Gato-Preto", "Lascado", "Cinzas", "Mosca", "Trapo", "Rato", "Faísca", "Nó-Cego", "Pavio-Curto"];
const LUGARES = ["do Brejo", "da Estrada", "do Penhasco", "da Curva", "do Moinho", "do Atalho", "da Ribeira", "do Pântano", "da Serra", "do Desfiladeiro", "do Vau", "do Cruzamento"];
const TITULOS = { baixo: [["Noviço", "Noviça"], ["Acólito", "Acólita"], ["Devoto", "Devota"], ["Irmão", "Irmã"]], medio: [["Irmão", "Irmã"], ["Zelador", "Zeladora"], ["Arauto", "Arauta"], ["Vigilante", "Vigilante"]], alto: [["Mestre", "Mestra"], ["Alto Irmão", "Alta Irmã"], ["Prior", "Priora"], ["Venerável", "Venerável"]] };
const OFICIOS = [["ferreiro", "ferreira"], ["padeiro", "padeira"], ["pescador", "pescadora"], ["lavrador", "lavradora"], ["carpinteiro", "carpinteira"], ["açougueiro", "açougueira"], ["oleiro", "oleira"], ["tecelão", "tecelã"], ["moleiro", "moleira"], ["taverneiro", "taverneira"], ["pastor", "pastora"], ["barqueiro", "barqueira"], ["sapateiro", "sapateira"], ["cervejeiro", "cervejeira"], ["pedreiro", "pedreira"], ["lenhador", "lenhadora"]];
const PATENTES = { baixo: ["Guarda", "Vigia", "Recruta"], medio: ["Cabo", "Sargento"], alto: ["Tenente", "Capitão"] };
// Posto do adversário dentro do grupo: quem comanda, quem é do meio, quem é massa.
const posto = t => (t === "Solo" || t === "Leader" ? "alto" : t === "Minion" || t === "Horde" ? "baixo" : "medio");

function nomeDe(grupo, u, f) {
  const primeiro = sortearNomes(f ? "f" : "m", 1, false)[0].n, p = posto(u.type);
  switch (grupo) {
    case "gangue": return `${primeiro} "${pick(ALCUNHAS)}"`;
    case "bandoleiros": return `${primeiro} ${pick(LUGARES)}`;
    case "faccao": { const [m, fe] = pick(TITULOS[p]); return `${f ? fe : m} ${primeiro}`; }
    case "moradores": { const [m, fe] = pick(OFICIOS); return `${primeiro}, ${f ? "a" : "o"} ${f ? fe : m}`; }
    case "guardas": return `${pick(PATENTES[p])} ${sortearSobrenome()}`;
    default: return `${primeiro} ${sortearSobrenome()}`; // mercenários
  }
}

// ---------- Descrição ----------
// Porte e presença conforme o tipo do adversário (Bruiser é enorme, Skulk é discreto, Minion é um qualquer da turba).
const PORTE = {
  Solo: ["Imponente, o tipo que todo mundo olha primeiro", "Alt{o|a} e de presença pesada, sem pressa nenhuma", "Parece muito mais perigos{o|a} do que o resto do grupo"],
  Bruiser: ["Enorme, de ombros largos e passos pesados", "Muito alt{o|a}, com mãos do tamanho de pratos", "Corpulent{o|a}, ocupa a porta inteira", "Forte como um boi e quase tão calm{o|a}"],
  Leader: ["Postura firme, é quem os outros olham antes de agir", "Voz alta e gestos largos, acostumad{o|a} a mandar", "Tem a calma de quem raramente é contrariad{o|a}"],
  Horde: ["Faz parte de um bando que se move como um bicho só", "Se confunde com os outros, sempre colad{o|a} a alguém", "Anda em bloco com os demais, sem se destacar"],
  Ranged: ["Magr{o|a} e de olhar atento, sempre buscando um ângulo", "Fica um pouco afastad{o|a} e mede distâncias com os olhos", "Postura relaxada, mas os olhos não param quietos"],
  Skulk: ["Pequen{o|a} e silencios{o|a}, some no meio de qualquer sombra", "Ágil e magr{o|a}, quase nunca olha de frente", "Se esgueira pelos cantos e só aparece na hora H"],
  Standard: ["Porte comum, de quem já viu briga antes", "Estatura mediana e corpo duro de trabalho", "Ombros firmes e olhar cansado, sem frescura"],
  Social: ["Bem apessoad{o|a}, fala mansa e sorriso pronto", "Gestos teatrais, parece sempre estar numa negociação", "Elegante apesar da situação, nunca perde a pose"],
  Support: ["Franzin{o|a} e discret{o|a}, fica sempre atrás dos outros", "Mãos inquietas e olhar distante, murmura sozinh{o|a}", "Aparência frágil, mas todos o{|a} protegem sem perceber"],
  Minion: ["Jovem demais ou cansad{o|a} demais para estar ali", "Um qualquer no meio da turba, só seguindo o grupo", "Parece que ninguém o{|a} escolheu: só apareceu"],
};
const JEITO = ["Fala pouco e observa tudo.", "Ri alto de qualquer coisa, até do perigo.", "Está nervos{o|a} e olha toda hora para a saída.", "Parece calm{o|a} demais para a situação.", "Grita para que ninguém ouça a própria dúvida.", "Chei{o|a} de si, exibe uma confiança que talvez não tenha.", "Tem pressa em acabar logo com isso.", "Desconfia de todo mundo, até dos aliados.", "Fala sozinh{o|a} entre os dentes.", "Parece cansad{o|a}, como quem já fez isso vezes demais.", "Sorri de um jeito que ninguém retribui.", "Obedece sem questionar.", "Está ali por obrigação, não por vontade.", "Provoca os heróis só para ver como reagem."];
const TRACO = ["Cicatriz que atravessa a sobrancelha.", "Voz rouca de quem grita há anos.", "Cabelo preso de qualquer jeito.", "Faltam alguns dentes.", "Tatuagem velha no pescoço.", "Olhos fundos, vermelhos de pouco sono.", "Mancha de nascença no rosto.", "Nariz quebrado mais de uma vez.", "Barba por fazer e unhas roídas.", "Mãos grandes e calejadas.", "Pele curtida de sol.", "Anda com um leve mancar.", "Cabeça raspada e um brinco na orelha.", "Cheira a suor e fumaça.", "Olhar fixo que quase não pisca.", "Sorriso largo, de poucos amigos."];
const PAPEL = {
  gangue: ["Cresceu naquelas ruas e conhece todos os atalhos.", "Deve um favor pesado ao chefe do bando.", "Quer provar que merece respeito.", "Cuida do território como se fosse a própria casa."],
  bandoleiros: ["Vive de emboscadas e já perdeu a conta das estradas.", "Fugiu de algo pior e acabou aqui.", "Só quer voltar para o acampamento inteir{o|a}.", "Conhece cada curva e cada esconderijo da região."],
  faccao: ["Acredita de verdade no que a causa promete.", "Tem medo de decepcionar quem está acima.", "Carrega um voto que não pode quebrar.", "Fala da causa como quem recita uma oração."],
  moradores: ["Está defendendo a casa e a família, não lutando por esporte.", "Nunca quis briga, mas já não vê outra saída.", "Conhece cada rua e cada vizinho do lugar.", "Ficou com raiva demais para pensar direito."],
  guardas: ["Cumpre o turno e as ordens, na ordem em que vêm.", "Já viu coisa pior e não se impressiona fácil.", "Leva o dever a sério, talvez a sério demais.", "Quer voltar para casa no fim do turno."],
  mercenarios: ["Luta por quem paga melhor e não pergunta o motivo.", "Já trabalhou dos dois lados mais de uma vez.", "Tem preço, e todo mundo sabe qual é.", "Só se importa em receber e ir embora."],
};

function descricaoDe(grupo, u, f) {
  const frases = [`${pick(PORTE[u.type] || PORTE.Standard)}.`, pick([...JEITO, ...JEITO, ...(PAPEL[grupo] || [])])];
  if (Math.random() < 0.5) frases.push(pick(TRACO));
  return gen(frases.join(" "), f);
}

// Dá nome e descrição a cada unidade da batalha. Nomes não se repetem. Habilidades que citavam o nome antigo passam a citar o novo.
export function nomearBatalha(b, grupo = "gangue") {
  const usados = new Set();
  b.unidades.forEach(u => {
    const f = Math.random() < 0.5;
    let nome = nomeDe(grupo, u, f);
    for (let g = 0; usados.has(nome) && g < 30; g++) nome = nomeDe(grupo, u, f);
    if (usados.has(nome)) nome = `${nome} ${usados.size + 1}`;
    usados.add(nome);
    const antigo = u.name;
    if (antigo && antigo !== nome) u.f.forEach(h => { h.t = String(h.t || "").split(antigo).join(nome); });
    u.name = nome;
    u.desc = descricaoDe(grupo, u, f);
  });
  return b;
}
