// Locais e lojas: estoque e serviços com preços.
// Preços de armas e armaduras seguem a tabela "Average Costs" do SRD (faixa por patamar). Consumíveis, itens e serviços além dos da tabela
// são SUGESTÕES derivadas dessas mesmas faixas (marcadas como "sugestão" na tela). Unidade: moedas (regra opcional do SRD: 10 moedas = 1 punhado).
import { list, get } from "./data.js";
import { sortearNome } from "./hooks.js";

// ---------- Preços ----------
export function fmtPreco(c) {
  c = Math.max(1, Math.round(c));
  const bau = Math.floor(c / 1000), bol = Math.floor((c % 1000) / 100), pun = Math.floor((c % 100) / 10), moe = c % 10;
  const p = [];
  if (bau) p.push(`${bau} baú${bau > 1 ? "s" : ""}`);
  if (bol) p.push(`${bol} bolsa${bol > 1 ? "s" : ""}`);
  if (pun) p.push(`${pun} punhado${pun > 1 ? "s" : ""}`);
  if (moe) p.push(`${moe} moeda${moe > 1 ? "s" : ""}`);
  return p.join(" e ");
}
export const arredondar = v => (v < 30 ? Math.max(1, Math.round(v)) : v < 100 ? Math.round(v / 5) * 5 : v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100);

// SRD, "Average Costs": equipamento T1 = 1 a 5 punhados; T2 = 1 a 2 bolsas; T3 = 5 a 10 bolsas; T4 = 1 a 2 baús (em moedas)
export const FAIXA = { 1: [10, 50], 2: [100, 200], 3: [500, 1000], 4: [1000, 2000] };
export const RARIDADE = { 1: "Comum", 2: "Incomum", 3: "Raro", 4: "Lendário" };
const h01 = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

// Raridade de consumíveis e itens: a posição na tabela de loot do SRD divide cada grupo em quatro faixas (aproximação)
let RAR = null;
function mapaRaridade() {
  if (RAR) return RAR;
  RAR = new Map();
  for (const kind of ["consumables", "items"]) for (const src of ["base", "hf"]) {
    const l = list(kind, { todas: true }).filter(x => x.src === src);
    l.forEach((x, i) => RAR.set(kind + "|" + x.id, Math.min(4, 1 + Math.floor(i / (l.length / 4)))));
  }
  return RAR;
}
export const resetarRaridade = () => { RAR = null; };
export const nivelItem = (kind, x) => (kind === "weapons" || kind === "armor" ? x.t : mapaRaridade().get(kind + "|" + x.id) || 1);
export function precoBase(kind, x) {
  const [a, b] = FAIXA[nivelItem(kind, x)];
  let f = h01(kind + x.id);
  if (kind === "weapons" && /Magic/.test(x.kind)) f = 0.5 + f / 2;
  return (a + (b - a) * f) * (kind === "consumables" ? 0.4 : 1);
}

export const TAMANHOS = {
  banca: { n: "Banca ou barraca", ordem: 0, maxN: 1, linhas: [4, 6], serv: [2, 3] },
  loja: { n: "Loja", ordem: 1, maxN: 2, linhas: [8, 12], serv: [3, 5] },
  emporio: { n: "Empório", ordem: 2, maxN: 3, linhas: [14, 20], serv: [5, 7] },
  lendaria: { n: "Casa lendária", ordem: 3, maxN: 4, linhas: [18, 26], serv: [7, 10] },
};
export const QUALIDADES = { simples: { n: "Simples", m: 0.75 }, comum: { n: "Comum", m: 1 }, refinada: { n: "Refinada", m: 1.5 } };
export const REGIOES = { rural: { n: "Vilarejo", m: 0.8 }, cidade: { n: "Cidade", m: 1 }, capital: { n: "Capital ou porto rico", m: 1.3 }, remota: { n: "Fronteira ou lugar remoto", m: 1.5 } };

// ---------- Tipos de local ----------
const FISICA = x => x.kind === "Physical", MAGICA = x => /Magic/.test(x.kind), TODOS = () => true;
const POCAO = x => /Potion|Tea|Elixir|Brew|Tonic|Salve|Tincture|Draught|Antidote/i.test(x.n) || /clear (\d?d\d+|\d+|a|all|any)? ?(Hit Point|HP|Stress)/i.test(x.x || "");
const ARCANO = x => /magic|spell|enchant|arcane|rune|conjur|summon|ritual/i.test(x.x || "");
const SUJO = x => /poison|venom|smoke|dark|shadow|disguis|invisib|steal|lock|stealth/i.test((x.n || "") + " " + (x.x || ""));
// serviço: [nome, moedas, fonte ("SRD" ou "HOMEBREW"), tamanho mínimo (0 a 3), nota]
export const TIPOS = [
  { k: "ferraria", n: "Ferraria e armeiro", desc: "Armas e armaduras físicas.", mult: 1, compra: 50,
    estoque: [["weapons", FISICA, 3], ["armor", TODOS, 2]],
    nomes: [["A Bigorna", "O Martelo", "A Forja", "O Fole", "A Têmpera"], ["Torta", "do Velho Brás", "de Ferro Frio", "das Sete Faíscas", "Quebrada"]],
    serv: [["Afiar armas (por arma)", 2, "HOMEBREW", 0], ["Consertar armadura (espaços marcados)", 5, "HOMEBREW", 0], ["Ferramentas especializadas", 30, "SRD", 1], ["Ferrar montaria", 3, "HOMEBREW", 0], ["Reforjar uma peça (a critério do mestre)", 50, "HOMEBREW", 2]] },
  { k: "reliquias", n: "Casa de relíquias", desc: "Armas mágicas e curiosidades encantadas.", mult: 1.2, compra: 40,
    estoque: [["weapons", MAGICA, 3], ["items", ARCANO, 2], ["consumables", ARCANO, 1]], minN: 2,
    nomes: [["A Relíquia", "O Relicário", "A Galeria", "O Cofre", "A Vitrine"], ["Empoeirada", "de Aurem", "das Mil Luas", "Silenciosa", "do Colecionador"]],
    serv: [["Avaliar um item mágico", 20, "HOMEBREW", 0], ["Identificar propriedades", 30, "HOMEBREW", 1], ["Guardar um objeto no cofre (por noite)", 10, "HOMEBREW", 1], ["Encomenda de peça sob medida (a critério do mestre)", 300, "HOMEBREW", 3]] },
  { k: "boticario", n: "Boticário e alquimista", desc: "Poções, remédios e ingredientes.", mult: 1, compra: 50,
    estoque: [["consumables", POCAO, 4], ["consumables", TODOS, 1]],
    nomes: [["O Alambique", "A Redoma", "O Frasco", "A Erva", "O Caldeirão"], ["Verde", "da Dona Lúcia", "Sereno", "das Três Raízes", "de Vidro Fumê"]],
    serv: [["Consulta de herbalista", 5, "HOMEBREW", 0], ["Preparar um antídoto sob encomenda", 30, "HOMEBREW", 1], ["Ingredientes raros (por porção)", 15, "HOMEBREW", 1], ["Kit de alquimia (ferramentas especializadas)", 30, "SRD", 1]] },
  { k: "arcano", n: "Empório arcano", desc: "Itens e consumíveis mágicos.", mult: 1.1, compra: 50,
    estoque: [["consumables", ARCANO, 3], ["items", ARCANO, 3], ["weapons", MAGICA, 1]],
    nomes: [["A Torre", "O Grimório", "O Cristal", "A Runa", "O Astrolábio"], ["de Cristal", "Aberto", "Invertido", "do Terceiro Olho", "Quebrado"]],
    serv: [["Consulta com um mago", 50, "HOMEBREW", 1], ["Recarregar um foco arcano", 40, "HOMEBREW", 1], ["Alugar um círculo ritual (por noite)", 60, "HOMEBREW", 2], ["Copiar um grimório", 100, "HOMEBREW", 2], ["Avaliar um item mágico", 20, "HOMEBREW", 0]] },
  { k: "geral", n: "Loja geral e mercador de viagem", desc: "O que todo aventureiro precisa levar.", mult: 1, compra: 50,
    estoque: [["items", x => !ARCANO(x), 4], ["consumables", x => !ARCANO(x) && !POCAO(x), 1]],
    nomes: [["O Baú", "A Mochila", "O Armazém", "A Carroça", "O Balcão"], ["do Andarilho", "Sem Fim", "da Esquina", "de Todos", "do Tio Nilo"]],
    serv: [["Tocha", 1, "HOMEBREW", 0], ["Corda (15 m)", 2, "HOMEBREW", 0], ["Saco de dormir", 3, "HOMEBREW", 0], ["Suprimentos para o grupo (por dia)", 5, "HOMEBREW", 0], ["Mochila e cintos", 5, "HOMEBREW", 0], ["Barraca para quatro", 15, "HOMEBREW", 1], ["Ferramentas especializadas", 30, "SRD", 1], ["Lanterna e óleo", 8, "HOMEBREW", 1]] },
  { k: "alfaiate", n: "Alfaiate e vestuário", desc: "Roupas, disfarces e librés.", mult: 1, compra: 30,
    estoque: [],
    nomes: [["A Agulha", "O Dedal", "O Corte", "A Costura", "O Carretel"], ["de Prata", "Dourada", "Fina", "do Mestre Oto", "Azul"]],
    serv: [["Roupas de viagem", 8, "HOMEBREW", 0], ["Capa de chuva", 6, "HOMEBREW", 0], ["Botas reforçadas", 12, "HOMEBREW", 0], ["Remendo e conserto", 2, "HOMEBREW", 0], ["Roupas finas", 30, "SRD", 1], ["Libré ou uniforme", 25, "HOMEBREW", 1], ["Disfarce completo", 60, "HOMEBREW", 2], ["Bordado com brasão", 40, "HOMEBREW", 2], ["Roupas de luxo", 100, "SRD", 2]] },
  { k: "taverna", n: "Taverna e estalagem", desc: "Comida, bebida e uma cama.", mult: 1, compra: 0,
    estoque: [],
    nomes: [["O Javali", "A Caneca", "O Corvo", "A Lanterna", "O Pão"], ["Cansado", "Dourada", "Gordo", "Torta", "Que Ri"]],
    serv: [["Caneca de cerveja ou hidromel", 1, "HOMEBREW", 0], ["Prato quente (por pessoa)", 2, "HOMEBREW", 0], ["Refeição para o grupo (por noite)", 10, "SRD", 0], ["Quarto coletivo (por pessoa)", 3, "HOMEBREW", 0], ["Quarto simples (por noite)", 10, "SRD", 1], ["Banho quente", 2, "HOMEBREW", 1], ["Jarra de vinho da casa", 5, "HOMEBREW", 1], ["Bardo para a noite", 20, "HOMEBREW", 2], ["Banquete para o grupo", 50, "HOMEBREW", 2], ["Quarto de luxo (por noite)", 100, "SRD", 2]] },
  { k: "estabulo", n: "Estábulo e transporte", desc: "Montarias, carruagens e travessias.", mult: 1, compra: 0,
    estoque: [],
    nomes: [["O Cocho", "A Ferradura", "O Relho", "A Estrada", "O Curral"], ["Largo", "do Zé Tropeiro", "Quatro Ventos", "de Palha", "do Rio"]],
    serv: [["Travessia de barca ou balsa", 2, "HOMEBREW", 0], ["Ferrar montaria", 3, "HOMEBREW", 0], ["Estábulo e ração (por noite)", 5, "HOMEBREW", 0], ["Passagem em caravana (por pessoa, por dia)", 10, "HOMEBREW", 0], ["Sela e arreios", 15, "HOMEBREW", 1], ["Guia ou batedor (por dia)", 15, "HOMEBREW", 1], ["Corrida de carruagem", 20, "SRD", 1], ["Carroça simples", 100, "HOMEBREW", 1], ["Montaria (cavalo, mula etc.)", 300, "SRD", 0], ["Cavalo de guerra treinado", 600, "HOMEBREW", 2]] },
  { k: "templo", n: "Templo e curandeiro", desc: "Cura, bênçãos e repouso.", mult: 1, compra: 0,
    estoque: [["consumables", POCAO, 1]],
    nomes: [["O Santuário", "A Capela", "A Casa", "O Recanto", "O Altar"], ["da Aurora", "das Mãos Gentis", "do Sol Pálido", "da Lua Mansa", "de Santa Iara"]],
    serv: [["Cuidados leves (recuperar 1d4 PV)", 10, "HOMEBREW", 0], ["Leito de recuperação (por noite)", 5, "HOMEBREW", 0], ["Ritual funerário", 20, "HOMEBREW", 0], ["Bênção (a critério do mestre)", 30, "HOMEBREW", 1], ["Tratar veneno ou doença", 40, "HOMEBREW", 1], ["Cuidados completos (todos os PV, uma noite)", 50, "HOMEBREW", 1]] },
  { k: "saber", n: "Escriba e cartógrafo", desc: "Cartas, mapas e informação.", mult: 1, compra: 0,
    estoque: [],
    nomes: [["A Pena", "O Pergaminho", "A Biblioteca", "O Tinteiro", "A Rosa"], ["de Corvo", "dos Ventos", "Rubra", "Discreta", "do Escrivão Hel"]],
    serv: [["Carta escrita e enviada pela região", 5, "HOMEBREW", 0], ["Rumor da cidade", 5, "HOMEBREW", 0], ["Mapa regional", 20, "HOMEBREW", 0], ["Pesquisa em arquivo", 25, "HOMEBREW", 1], ["Mensageiro rápido", 30, "HOMEBREW", 1], ["Ferramentas de escrita e cartografia", 30, "SRD", 1], ["Tradução de texto antigo", 40, "HOMEBREW", 2], ["Mapa detalhado da cidade", 40, "HOMEBREW", 2], ["Consulta com um sábio", 50, "HOMEBREW", 2], ["Cópia de documento ou lacre", 80, "HOMEBREW", 3]] },
  { k: "negro", n: "Mercado negro", desc: "Mercadoria sem perguntas.", mult: 1.6, compra: 40,
    estoque: [["consumables", SUJO, 3], ["items", SUJO, 2], ["weapons", TODOS, 2], ["items", TODOS, 1]], minN: 2,
    nomes: [["O Porão", "A Sombra", "O Beco", "A Porta", "O Fundo"], ["Sem Nome", "do Gato Preto", "Cinzento", "do Meio da Noite", "Sem Placa"]],
    serv: [["Silêncio comprado (uma pergunta a menos)", 20, "HOMEBREW", 0], ["Informante (uma pergunta)", 30, "HOMEBREW", 0], ["Passagem sem perguntas", 40, "HOMEBREW", 1], ["Documentos falsos", 100, "HOMEBREW", 2]] },
  { k: "penhores", n: "Casa de penhores", desc: "Compra, vende e empresta.", mult: 0.7, compra: 60,
    estoque: [["weapons", TODOS, 2], ["armor", TODOS, 1], ["items", TODOS, 2], ["consumables", TODOS, 1]],
    nomes: [["O Penhor", "A Balança", "O Cofre", "A Roda", "O Prego"], ["Justo", "do Samuel", "de Três Bolas", "Honesto", "da Esquina"]],
    serv: [["Avaliação de um item (grátis na compra)", 1, "HOMEBREW", 0], ["Empréstimo: paga 25% a mais na devolução", 0, "HOMEBREW", 1, "Quanto emprestar fica a critério do mestre"]] },
];
export const tipoPor = k => TIPOS.find(t => t.k === k);

// ---------- Geração ----------
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const entre = ([a, b], rnd) => a + Math.floor(rnd() * (b - a + 1));
const ponderado = (itens, peso, rnd) => { const t = itens.reduce((s, x) => s + peso(x), 0); let r = rnd() * t; for (const x of itens) { r -= peso(x); if (r <= 0) return x; } return itens[itens.length - 1]; };
const TRACOS = ["desconfiado(a)", "tagarela", "metódico(a)", "cansado(a) da vida", "orgulhoso(a) do ofício", "avarento(a)", "gentil demais", "nervoso(a)", "sarcástico(a)", "devoto(a)"];
const MANIAS = ["assobia sem perceber", "conta as moedas duas vezes", "tem um gato dormindo no balcão", "fala sozinho(a) entre um cliente e outro", "mastiga um palito", "coleciona bugigangas estranhas", "nunca olha nos olhos", "chama todos de “meu caro”"];
const GANCHOS = ["Um cliente discute com o dono por causa de um item e ameaça voltar com amigos.", "O dono procura alguém de confiança para entregar uma encomenda.", "Um dos itens do estoque tem um símbolo que o dono não sabe explicar.", "Alguém vigia o lugar da rua em frente há dias.", "O dono deve dinheiro a uma pessoa perigosa e disfarça mal.", "Um objeto sumiu da prateleira ontem e ele culpa o último freguês.", "O dono reconhece um dos PJs de um lugar onde não deveria tê-lo visto.", "Há uma porta nos fundos que ninguém pode abrir."];
const ABERTURA = { 0: ["Um balcão armado ao ar livre", "Uma barraca de lona remendada", "Uma banca apertada entre duas casas"], 1: ["Uma loja de fachada simples", "Um comércio de bairro, cheio e cheiroso", "Uma casa de pedra com a porta sempre aberta"], 2: ["Um empório de vários salões e prateleiras até o teto", "Um casarão movimentado, com ajudantes e aprendizes", "Um grande armazém com galeria e balcões"], 3: ["Um palacete cujo nome é conhecido em três reinos", "Uma casa lendária, com guardas na porta", "Um salão de vitrines trancadas e clientes de renome"] };
const ACABAMENTO = { simples: ["Tudo é prático e gasto pelo uso.", "O preço é bom, o acabamento nem tanto.", "Nada aqui é bonito, mas funciona."], comum: ["Organizado e limpo, sem exageros.", "Mercadoria honesta e bem exposta.", "Um lugar confiável, do tipo que se recomenda."], refinada: ["Tudo é impecável e cheira a cera e a madeira boa.", "Cada peça tem etiqueta, caixa e uma história.", "O atendimento é cerimonioso e os preços, também."] };

function candidatos(kind, filtro, nMax, minN) {
  return list(kind).filter(x => !/wheelchair/i.test(x.id) && filtro(x) && nivelItem(kind, x) <= nMax && nivelItem(kind, x) >= minN);
}
export function precoFinal(kind, x, { qual = "comum", reg = "cidade", tipo = null } = {}) {
  return arredondar(precoBase(kind, x) * QUALIDADES[qual].m * REGIOES[reg].m * (tipo ? tipo.mult : 1));
}
const qtdDe = (kind, n, rnd) => (kind === "consumables" ? 1 + Math.floor(rnd() * 5) : n >= 3 ? 1 : 1 + Math.floor(rnd() * 2));
const pesoQual = (qual, n) => (qual === "simples" ? 1 / (n * n) : qual === "refinada" ? n * n : 1);

function teto(tam, qual) { const t = TAMANHOS[tam]; return qual === "simples" ? Math.max(1, t.maxN - 1) : t.maxN; }

// Uma linha de estoque, sem repetir o que já está no local
export function sortearLinha(local, rnd = Math.random) {
  const cfg = tipoPor(local.tipo); if (!cfg || !cfg.estoque.length) return null;
  const nMax = teto(local.tam, local.qual), tinha = new Set(local.estoque.map(l => l.kind + "|" + l.id));
  for (const minN of [cfg.minN || 1, 1]) {
    const pools = cfg.estoque.map(([kind, filtro, peso]) => ({ kind, peso, itens: candidatos(kind, filtro, nMax, minN).filter(x => !tinha.has(kind + "|" + x.id)) })).filter(p => p.itens.length);
    if (!pools.length) continue;
    const p = ponderado(pools, q => q.peso, rnd);
    const x = ponderado(p.itens, it => pesoQual(local.qual, nivelItem(p.kind, it)), rnd);
    const n = nivelItem(p.kind, x);
    return { kind: p.kind, id: x.id, preco: precoFinal(p.kind, x, { qual: local.qual, reg: local.reg, tipo: cfg }), qtd: qtdDe(p.kind, n, rnd) };
  }
  return null;
}

export function gerarLocal({ tipo = "ferraria", tam = "loja", qual = "comum", reg = "cidade" } = {}, rnd = Math.random) {
  const cfg = tipoPor(tipo), T = TAMANHOS[tam];
  const local = { id: Math.random().toString(36).slice(2, 10), tipo, tam, qual, reg, nome: `${pick(cfg.nomes[0], rnd)} ${pick(cfg.nomes[1], rnd)}`, estoque: [], servicos: [], criadoEm: Date.now() };
  local.dono = { nome: sortearNome(), traco: pick(TRACOS, rnd), mania: pick(MANIAS, rnd) };
  local.desc = `${pick(ABERTURA[T.ordem], rnd)}. ${pick(ACABAMENTO[qual], rnd)}`;
  local.gancho = pick(GANCHOS, rnd);
  local.compra = cfg.compra;
  if (cfg.estoque.length) {
    const n = entre(T.linhas, rnd);
    for (let i = 0; i < n; i++) { const l = sortearLinha(local, rnd); if (!l) break; local.estoque.push(l); }
    local.estoque.sort((a, b) => a.preco - b.preco);
  }
  const elegiveis = cfg.serv.filter(s => s[3] <= T.ordem);
  const soServicos = !cfg.estoque.length;
  const alvo = soServicos ? elegiveis.length : Math.min(elegiveis.length, entre(T.serv, rnd));
  const escolhidos = soServicos ? elegiveis : [...elegiveis].sort(() => rnd() - 0.5).slice(0, alvo).sort((a, b) => elegiveis.indexOf(a) - elegiveis.indexOf(b));
  local.servicos = escolhidos.map(([n, c, fonte, , nota]) => ({ n, preco: c > 0 ? arredondar(c * QUALIDADES[qual].m * REGIOES[reg].m) : 0, fonte, nota: nota || "" }));
  return local;
}

export function textoLocal(l) {
  const cfg = tipoPor(l.tipo);
  const linhas = [`${l.nome} (${cfg.n} · ${TAMANHOS[l.tam].n} · ${QUALIDADES[l.qual].n} · ${REGIOES[l.reg].n})`, l.desc, `Dono: ${l.dono.nome}, ${l.dono.traco}; ${l.dono.mania}.`, `Gancho: ${l.gancho}`];
  if (l.estoque.length) { linhas.push("", "À venda:"); l.estoque.forEach(e => { const x = get(e.kind, e.id); linhas.push(`- ${x ? x.n : e.id}: ${fmtPreco(e.preco)}${e.qtd > 1 ? ` (estoque ${e.qtd})` : ""}`); }); }
  if (l.servicos.length) { linhas.push("", "Serviços e mercadorias:"); l.servicos.forEach(s => linhas.push(`- ${s.n}: ${s.preco ? fmtPreco(s.preco) : "a combinar"}${s.nota ? ` (${s.nota})` : ""}`)); }
  if (l.compra) linhas.push("", `Compra itens por cerca de ${l.compra}% do valor.`);
  return linhas.join("\n");
}
