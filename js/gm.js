// Dados e regras do mestre: biblioteca de adversários, batalhas, orçamento, importação da IA e sincronização.
import { store, uid, clone, norm, debounce } from "./util.js";
import { sb, S, user, onChange } from "./store.js";
import { hfOn, list, loc } from "./data.js";
import { validarCena, criarCena, validarLembretes, criarLembretes, casaLembrete } from "./cena.js";

// ---------- Constantes ----------
export const TIPOS = ["Bruiser", "Horde", "Leader", "Minion", "Ranged", "Skulk", "Social", "Solo", "Standard", "Support"];
export const TIPO_PT = { Bruiser: "Brutamontes", Horde: "Horda", Leader: "Líder", Minion: "Lacaio", Ranged: "Atirador", Skulk: "Espreitador", Social: "Social", Solo: "Solo", Standard: "Padrão", Support: "Apoio" };
export const TIPO_DESC = { Bruiser: "Resistente, ataques fortes.", Horde: "Grupo que age como uma só unidade.", Leader: "Comanda e convoca outros.", Minion: "Cai com qualquer dano, perigoso em número.", Ranged: "Frágil de perto, forte à distância.", Skulk: "Emboscadas e oportunismo.", Social: "Desafio de conversa, não de combate.", Solo: "Desafio para o grupo todo.", Standard: "Representa o seu grupo.", Support: "Fortalece aliados e atrapalha inimigos." };
export const CUSTO = { Solo: 5, Bruiser: 4, Leader: 3, Horde: 2, Ranged: 2, Skulk: 2, Standard: 2, Social: 1, Support: 1, Minion: 1 };
export const KIND_PT = { Passive: "Passiva", Action: "Ação", Reaction: "Reação", Evolution: "Evolução", "": "—" };
export const CATS = [["humanoides", "Humanoides"], ["animais", "Animais"], ["monstros", "Monstros"], ["mortos-vivos", "Mortos-vivos"], ["espiritos", "Espíritos"], ["constructos", "Constructos"]];
// Referência oficial por patamar (SRD, "Adversary Stat Block Benchmarks")
export const BENCH = {
  1: { atk: "+1", dano: "1d6+2 a 1d12+4", dif: 11, lim: "7 / 12" },
  2: { atk: "+2", dano: "2d6+3 a 2d12+4", dif: 14, lim: "10 / 20" },
  3: { atk: "+3", dano: "3d8+3 a 3d12+5", dif: 17, lim: "20 / 32" },
  4: { atk: "+4", dano: "4d8+10 a 4d12+15", dif: 20, lim: "25 / 45" },
};
export const PASSIVAS = [
  { n: "Minion (X)", k: "Passive", t: "Este adversário é derrotado ao sofrer qualquer dano. A cada X de dano que um PC causar a ele, derrote um Lacaio adicional ao alcance que o ataque também acertaria." },
  { n: "Horde (X)", k: "Passive", t: "Quando a Horda marcou metade ou mais dos PV, o ataque padrão dela causa X de dano." },
  { n: "Relentless (X)", k: "Passive", t: "Este adversário pode receber o holofote até X vezes por turno do Mestre. Gaste Medo normalmente para colocá-lo no holofote." },
  { n: "Slow", k: "Passive", t: "Ao colocar este adversário no holofote sem marcador na ficha, ele ainda não age: coloque um marcador e descreva o que ele prepara. Com o marcador, remova-o e ele age." },
  { n: "Armored Carapace (X)", k: "Passive", t: "Ao sofrer dano físico, reduza-o em X." },
  { n: "Arcane Form", k: "Passive", t: "Este adversário é resistente a dano mágico." },
];
export const AMBIENTE_ACOES = [
  { n: "Mudança de terreno", c: [1], ef: "Desvantagem nos próximos testes", op: ["O chão fica escorregadio", "Raízes surgem do chão", "Poeira ou névoa reduz a visão", "Pedras caem"] },
  { n: "Exposição", c: [1], ef: "Teste de resistência (Dificuldade 10–20); quem falha fica Vulnerável", op: ["O terreno faz alguém escorregar", "Uma luz revela a posição", "A cobertura quebra"] },
  { n: "Separação", c: [1], ef: "O grupo fica dividido", op: ["Uma árvore cai entre eles", "Uma rachadura abre no chão", "Portas se fecham", "Um enxame passa entre o grupo"] },
  { n: "Colapso", c: [2], ef: "Dano e mudança no cenário", op: ["O teto cai", "Uma árvore cai", "Uma parede quebra", "A ponte se rompe"] },
  { n: "Ameaça emergente", c: [1, 2], ef: "Um novo problema entra em cena", op: ["Uma criatura menor aparece", "Um enxame de insetos", "Espíritos menores", "Guardas chegam"] },
];
export const CONDICOES = ["Vulnerável", "Contido", "Oculto"];

// ---------- Carregamento ----------
let BASE = [], EXPADV = [], EXPENV = [], pronto = false;
export let EXEMPLO_CENA = null;
export async function loadGM() {
  if (pronto) return;
  const v = "?v=" + (window.APP_VERSION || "1");
  const j = u => fetch(u + v, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [b, e, ec] = await Promise.all([j("data/adversarios.json"), j("data/exp-adv.json"), j("data/exemplo-cena.json")]);
  EXEMPLO_CENA = ec;
  BASE = (b && b.adv) || [];
  EXPADV = (e && e.adv || []).map(a => ({ ...a, id: a.id || a.name }));
  EXPENV = (e && e.env) || [];
  pronto = true;
}
export const gmPronto = () => pronto;

// ---------- Estado do mestre (local + nuvem) ----------
const LK = "dh-mestre-v1";
const vazio = () => ({ v: 1, ts: 0, batalhas: [], custom: [], notas: [], hooks: [], hooksUsados: {}, migrado: false });
export const GM = Object.assign(vazio(), store.get(LK, {}));
GM.batalhas = GM.batalhas || []; GM.custom = GM.custom || []; GM.notas = GM.notas || []; GM.hooks = GM.hooks || []; GM.hooksUsados = GM.hooksUsados || {};
export const gmStatus = { s: "local", erro: "" };
const ouv = new Set();
export const onGM = f => { ouv.add(f); return () => ouv.delete(f); };
const avisa = () => ouv.forEach(f => { try { f(); } catch (e) { console.warn(e); } });

function gravaLocal() { store.set(LK, GM); }
let pushT = null, pushing = false, again = false;
export function salvarGM() {
  GM.ts = Date.now(); gravaLocal(); agendaPush(); avisa();
}
function agendaPush() { if (!sb || !user()) { gmStatus.s = "local"; return; } clearTimeout(pushT); gmStatus.s = "sync"; pushT = setTimeout(pushGM, 1500); }
async function pushGM() {
  pushT = null;
  if (!sb || !user()) return;
  if (pushing) { again = true; return; }
  pushing = true; gmStatus.s = "sync";
  try {
    const { error } = await sb.from("mestre_dados").upsert({ user_id: user().id, data: GM, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    gmStatus.s = "ok"; gmStatus.erro = "";
  } catch (e) { gmStatus.s = "erro"; gmStatus.erro = e && (e.code === "42P01" || /does not exist|schema cache/i.test(e.message || "")) ? "tabela" : "rede"; console.warn("mestre push", e); }
  pushing = false; if (again) { again = false; pushGM(); }
  avisa();
}
export async function puxarGM() {
  if (!sb || !user()) return;
  try {
    const { data, error } = await sb.from("mestre_dados").select("data").eq("user_id", user().id).maybeSingle();
    if (error) throw error;
    const r = data && data.data;
    if (r && (r.ts || 0) > (GM.ts || 0)) { Object.assign(GM, vazio(), r); gravaLocal(); avisa(); }
    else if (!r || (GM.ts || 0) > (r.ts || 0)) await pushGM();
    gmStatus.s = "ok"; gmStatus.erro = "";
  } catch (e) { gmStatus.s = "erro"; gmStatus.erro = e && (e.code === "42P01" || /does not exist|schema cache/i.test(e.message || "")) ? "tabela" : "rede"; console.warn("mestre pull", e); }
  avisa();
}
onChange(m => { if (m === "auth" && user()) puxarGM(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && user() && !pushT && !pushing) puxarGM(); });

// ---------- Biblioteca ----------
export function adversarios({ todos = false } = {}) {
  const hf = todos || hfOn();
  const base = BASE.map(a => ({ ...a, src: "base" }));
  const exp = hf ? EXPADV.map(a => ({ ...a, src: "hf" })) : [];
  const cus = GM.custom.map(a => ({ ...a, src: "custom" }));
  return [...cus, ...base, ...exp];
}
export function ambientes() {
  const hf = hfOn();
  return EXPENV.filter(e => e.src !== "hf" || hf).map(e => ({ ...e, id: e.name }));
}
export const achaAdv = nome => {
  const n = norm(nome), todos = adversarios({ todos: true });
  return todos.find(a => norm(a.name) === n) || null;
};
// Apelidos (ex.: "Bandit" para "Jagged Knife Bandit") só valem se forem únicos, e o importador avisa.
export const achaPorApelido = nome => {
  const n = norm(nome), r = adversarios({ todos: true }).filter(a => (a.al || []).some(x => norm(x) === n));
  return r.length === 1 ? r[0] : null;
};
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
export function sugestoes(nome, max = 4) {
  const n = norm(nome), ws = n.split(/\s+/).filter(Boolean);
  return adversarios({ todos: true }).map(a => {
    const an = norm(a.name), aw = [...an.split(/\s+/), ...(a.al || []).map(norm)];
    let s = 0;
    if (an.includes(n) || n.includes(an)) s += 6;
    ws.forEach(w => { if (an.includes(w)) s += 2; aw.forEach(x => { if (Math.abs(x.length - w.length) <= 2 && lev(x, w) <= Math.max(1, Math.floor(w.length / 4))) s += 3; }); });
    if (lev(an, n) <= Math.max(2, Math.floor(n.length / 4))) s += 4;
    return [a, s];
  }).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, max).map(x => x[0].name);
}
export function parseTh(th) { const m = String(th || "").split("/"); const n = x => (/^\s*\d+\s*$/.test(x || "") ? +x : null); return { maj: n(m[0]), sev: n(m[1]) }; }
export function trocaNome(text, al, name) {
  let t = String(text || "");
  for (const a of al || []) { const e = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); t = t.replace(new RegExp("\\b[Tt]he " + e + "\\b", "g"), name).replace(new RegExp("\\b" + e + "\\b", "g"), name); }
  return t;
}

// ---------- Batalhas ----------
export function novaBatalha(p = {}) {
  return { id: uid(), nome: p.nome || "Nova batalha", cena: p.cena || "", status: "prep", mesa: p.mesa || null, jogadores: p.jogadores || 4, ajuste: p.ajuste || 0, medo: 0, proxNum: 1, unidades: [], contagens: [], ambiente: null, notas: p.notas || "", recompensas: p.recompensas || "", origem: p.origem || "manual", lembretes: [], criadaEm: Date.now() };
}
export function novaUnidade(b, a, { nome, desc = "", n = 1 } = {}) {
  const th = parseTh(a.th), num = b.proxNum++;
  const mesmos = b.unidades.filter(x => x.ref === a.name).length;
  const nm = nome || (n > 1 || mesmos ? `${a.name} ${mesmos + 1}` : a.name);
  return { id: uid(), num, ref: a.name, name: nm, desc, type: a.type, tier: a.tier, horde: a.horde || "", dif: a.dif, maj: th.maj, sev: th.sev, hpMax: Math.max(1, +a.hp || 1), hp: 0, stMax: +a.st || 0, st: 0, atk: a.atk, wpn: a.wpn, rng: a.rng, dmg: a.dmg, xp: a.xp || "", mot: a.mot || "", f: (a.f || []).map(f => ({ n: f.n, k: f.k || "", t: trocaNome(f.t, a.al, nm) })), cond: [], notes: "", open: false };
}
export function adicionar(b, a, qtd = 1, extra = {}) {
  qtd = Math.max(1, Math.min(30, qtd | 0 || 1));
  for (let i = 0; i < qtd; i++) b.unidades.push(novaUnidade(b, a, { n: qtd, ...(i === 0 ? extra : {}) }));
}
export function orcamento(b) {
  const p = Math.max(1, b.jogadores || 1);
  let c = 0, min = 0, solos = 0;
  b.unidades.forEach(x => { if (x.type === "Minion") min++; else c += CUSTO[x.type] ?? 2; if (x.type === "Solo") solos++; });
  c += Math.ceil(min / p);
  const total = 3 * p + 2 + (b.ajuste || 0);
  return { custo: c, total, sobra: total - c, solos };
}
export function resumoBatalha(b) {
  const vivos = b.unidades.filter(u => u.hp < u.hpMax).length;
  return { total: b.unidades.length, vivos };
}

// Dano -> PV marcados (limiares do adversário)
export function pvPorDano(u, dano) {
  if (u.type === "Minion") return dano > 0 ? u.hpMax : 0;
  if (!(dano > 0)) return 0;
  if (u.sev != null && dano >= u.sev) return 3;
  if (u.maj != null && dano >= u.maj) return 2;
  return 1;
}

// ---------- Geradores (porta fiel do app antigo) ----------
const pick = a => a[Math.floor(Math.random() * a.length)];
export const NOMES = { Bruiser: ["Brutamontes", "Colosso", "Quebra-Ossos", "Esmagador", "Gigante"], Horde: ["Enxame", "Matilha", "Turba", "Revoada", "Ninhada"], Leader: ["Capitão", "Senhor da Guerra", "Matriarca", "Comandante", "Arauto"], Minion: ["Lacaio", "Capanga", "Rastejante", "Recruta", "Cria"], Ranged: ["Arqueiro", "Atirador", "Lançador", "Caçador", "Fundibulário"], Skulk: ["Espreitador", "Sombra", "Assassino", "Rastejador", "Emboscador"], Social: ["Cortesã", "Mercador", "Diplomata", "Intrigante", "Emissário"], Solo: ["Fera Ancestral", "Terror", "Devorador", "Guardião Antigo", "Flagelo"], Standard: ["Soldado", "Guerreiro", "Sentinela", "Cultista", "Saqueador"], Support: ["Xamã", "Oráculo", "Feiticeiro", "Alquimista", "Bardo Sombrio"] };
export const EPITETOS = ["das Cinzas", "de Ferro", "do Pântano", "da Névoa", "das Profundezas", "do Espinheiro", "da Lua Partida", "de Ossos", "do Vale Rubro", "da Tempestade", "do Eco", "sem Nome"];
const FIXAS = /^(Minion|Horde|Relentless)\b/;
function poolHab(type, tier) {
  const out = [], srd = adversarios({ todos: false }).filter(a => a.src !== "custom");
  const add = tr => srd.filter(a => a.type === type && a.tier === tr).forEach(a => a.f.forEach(f => { if (!FIXAS.test(f.n)) out.push({ n: f.n, k: f.k, t: f.t, from: a.name, ft: a.tier, al: a.al }); }));
  add(tier);
  if (out.length < 5) for (const d of [1, -1, 2, -2, 3, -3]) { const tr = tier + d; if (tr >= 1 && tr <= 4) add(tr); if (out.length >= 8) break; }
  return out;
}
export function sortearHabilidade(type, tier, tomadas = []) { const p = poolHab(type, tier).filter(f => !tomadas.includes(f.n)); return p.length ? clone(pick(p)) : null; }
export function gerarAdversario(type, tier) {
  const srd = adversarios().filter(a => a.src !== "custom");
  let bases = srd.filter(a => a.type === type && a.tier === tier), baseTier = tier;
  if (!bases.length) for (const d of [-1, 1, -2, 2, -3, 3]) { bases = srd.filter(a => a.type === type && a.tier === tier + d); if (bases.length) { baseTier = tier + d; break; } }
  const b = pick(bases);
  const name = `${pick(NOMES[type])} ${pick(EPITETOS)}`;
  const g = { id: uid(), name, tier, type, horde: b.horde || "", desc: "", mot: b.mot || "", dif: b.dif, th: b.th, hp: b.hp, st: b.st, atk: b.atk, wpn: b.wpn, rng: b.rng, dmg: b.dmg, xp: "", al: [], f: [], baseTier };
  b.f.filter(f => FIXAS.test(f.n)).forEach(f => g.f.push({ n: f.n, k: f.k, t: trocaNome(f.t, b.al, name) }));
  const alvo = Math.max(2, Math.min(4, b.f.length));
  let guard = 0;
  while (g.f.length < alvo && guard++ < 20) { const f = sortearHabilidade(type, tier, g.f.map(x => x.n)); if (!f) break; g.f.push({ n: f.n, k: f.k, t: trocaNome(f.t, f.al, name) }); }
  return g;
}
export function gerarBatalha({ tema = "qualquer", tier = 1, jogadores = 4, ajuste = 0 }) {
  const pool0 = adversarios().filter(a => a.src !== "custom");
  let pool = pool0.filter(a => (tema === "qualquer" || a.cat === tema) && Math.abs(a.tier - tier) <= 1);
  if (!pool.length) pool = pool0.filter(a => Math.abs(a.tier - tier) <= 1);
  const b = novaBatalha({ nome: "Batalha sorteada", jogadores, ajuste, origem: "sorteio" });
  const tot = () => orcamento(b).total, gasto = () => orcamento(b).custo;
  const porTipo = t => pool.filter(a => a.type === t);
  let solo = false;
  const add = (a, n = 1) => adicionar(b, a, n);
  if (tot() - gasto() >= 5 && Math.random() < 0.55) { const c = porTipo("Solo"); if (c.length) { add(pick(c)); solo = true; } }
  if (!solo && tot() - gasto() >= 4 && Math.random() < 0.4) { const c = porTipo("Bruiser").concat(porTipo("Leader")); if (c.length) add(pick(c)); }
  if (tot() - gasto() >= 1 && Math.random() < 0.5) { const c = porTipo("Minion"); if (c.length) add(pick(c), jogadores); }
  let guard = 0;
  while (tot() - gasto() > 0 && guard++ < 40) {
    const sobra = tot() - gasto();
    const cand = pool.filter(a => a.type !== "Minion" && CUSTO[a.type] <= sobra && !(a.type === "Solo" && solo));
    if (!cand.length) break;
    add(pick(cand), 1);
  }
  b.unidades.forEach((u, i) => { u.num = i + 1; }); b.proxNum = b.unidades.length + 1;
  return b;
}
export const COMPLICACOES = {
  geral: ["Chega alguém que não devia estar ali.", "O chão, a ponte ou a parede cede.", "Um inocente fica no meio do fogo cruzado.", "O tempo acaba mais cedo do que o esperado.", "Um equipamento falha ou some na confusão.", "Um aliado chega ferido pedindo ajuda.", "A luz se apaga de repente.", "Um som alto atrai mais atenção do que deveria.", "Alguém reconhece um dos heróis.", "A saída mais óbvia está bloqueada."],
  humanoides: ["Chegam reforços armados.", "Um dos inimigos tenta negociar ou subornar.", "Alguém grita por guardas.", "Um dos capangas foge para avisar o chefe.", "Reféns aparecem no meio da cena.", "Um inimigo reconhece um herói de outro lugar."],
  animais: ["A matilha cerca o grupo por mais de um lado.", "Um cheiro ou som atrai mais criaturas.", "O terreno favorece claramente os animais.", "Uma cria ou filhote aparece, mudando as prioridades.", "Os animais fogem ao perceber fogo.", "Um predador maior observa de longe."],
  espiritos: ["A área fica mais fria, e sussurros começam.", "Uma ação comum (gritar, sangrar, mentir) atrai mais espíritos.", "Um objeto do local é essencial para acalmá-los.", "O tempo parece andar errado ali dentro.", "Um espírito reconhece alguém do grupo.", "Ferro ou sal interfere na magia do lugar."],
  "mortos-vivos": ["Os mortos continuam se levantando.", "Um cheiro de decomposição revela mais inimigos escondidos.", "Destruir um não impede que ele se levante de novo.", "Uma relíquia no local os controla.", "Um dos mortos-vivos ainda reconhece quem foi em vida.", "A luz do dia (ou sua falta) muda o comportamento deles."],
  monstros: ["A criatura usa o ambiente para emboscar.", "Ela está protegendo algo, não apenas atacando.", "Um ferimento a deixa mais selvagem, não mais fraca.", "Ela se comunica de um jeito inesperado.", "Parte do cenário reage à presença dela.", "Existe um motivo trágico por trás da fúria dela."],
  constructos: ["Um padrão ou sequência pode desativá-lo.", "Ele repete o mesmo comando indefinidamente.", "Uma parte danificada revela como ele funciona.", "Ele protege algo específico, nada além disso.", "Um símbolo ou runa controla o comportamento dele.", "Energia ou magia próxima o reativa."],
};
export const sortear = pick;

// ---------- Importação da IA ----------
const TIPO_ALIAS = (() => { const m = {}; TIPOS.forEach(t => { m[norm(t)] = t; m[norm(TIPO_PT[t])] = t; }); Object.assign(m, { brute: "Bruiser", bruto: "Bruiser", horda: "Horde", lider: "Leader", lacaio: "Minion", capanga: "Minion", distancia: "Ranged", "a distancia": "Ranged", atirador: "Ranged", espreitador: "Skulk", furtivo: "Skulk", padrao: "Standard", comum: "Standard", apoio: "Support", suporte: "Support" }); return m; })();
const KIND_ALIAS = { passive: "Passive", passiva: "Passive", passivo: "Passive", action: "Action", acao: "Action", reaction: "Reaction", reacao: "Reaction", medo: "Action", fear: "Action", evolution: "Evolution", evolucao: "Evolution", "": "" };
const RANGE_PT = { "corpo a corpo": "Melee", melee: "Melee", "muito perto": "Very Close", "very close": "Very Close", perto: "Close", close: "Close", longe: "Far", far: "Far", "muito longe": "Very Far", "very far": "Very Far" };
const g = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== "") return o[k]; return undefined; };

// Tira cercas de código e texto ao redor do JSON. Com vários blocos, usa o que tem "adversarios".
const limpa = t => t.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1");
function tentaParse(t) { try { return JSON.parse(limpa(t)); } catch { return null; } }
export function extrairJSON(txt) {
  const s = String(txt || "").trim();
  const cercas = [...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1].trim());
  let ultimoErro = "";
  for (const c of cercas) {
    const i = c.indexOf("{"), j = c.lastIndexOf("}");
    if (i < 0 || j < i) continue;
    const o = tentaParse(c.slice(i, j + 1));
    if (o && typeof o === "object" && (o.adversarios || o.adversaries || o.inimigos || o.formato)) return o;
    if (!o) { try { JSON.parse(limpa(c.slice(i, j + 1))); } catch (e) { ultimoErro = e.message; } }
  }
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  if (i >= 0 && j > i) {
    const o = tentaParse(s.slice(i, j + 1));
    if (o) return o;
    try { JSON.parse(limpa(s.slice(i, j + 1))); } catch (e) { ultimoErro = ultimoErro || e.message; }
  }
  if (ultimoErro) throw new Error("O JSON está inválido: " + ultimoErro);
  throw new Error("Não encontrei um JSON no texto colado.");
}

export function normalizarAdv(raw, avisos, ctx = "") {
  const nome = String(g(raw, "nome", "name") || "").trim();
  if (!nome) { avisos.push({ k: "erro", t: `${ctx}: adversário novo sem nome.` }); return null; }
  const eu = `“${nome}”`;
  const tipoRaw = String(g(raw, "tipo", "type") || "Standard");
  const tipo = TIPO_ALIAS[norm(tipoRaw)];
  if (!tipo) { avisos.push({ k: "erro", t: `${eu}: tipo “${tipoRaw}” não existe. Use: ${TIPOS.join(", ")}.` }); return null; }
  let tier = +g(raw, "patamar", "tier", "nivel");
  if (!(tier >= 1 && tier <= 4)) { avisos.push({ k: "aviso", t: `${eu}: patamar inválido; usei 1.` }); tier = 1; }
  const num = (v, d) => { const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10); return isNaN(n) ? d : n; };
  const dif = num(g(raw, "dificuldade", "difficulty", "dif"), BENCH[tier].dif);
  let th = g(raw, "limiares", "thresholds", "th");
  if (th && typeof th === "object") th = `${g(th, "maior", "major") ?? ""}/${g(th, "grave", "severe") ?? ""}`;
  if (tipo === "Minion" || th == null || /^(none|nenhum|null)$/i.test(String(th))) th = "None";
  th = String(th).replace(/\s/g, "");
  if (th !== "None" && !/^\d+\/\d+$/.test(th)) { avisos.push({ k: "aviso", t: `${eu}: limiares “${th}” fora do formato 8/15; usei o padrão do patamar.` }); th = BENCH[tier].lim.replace(/\s/g, ""); }
  const hp = Math.max(1, num(g(raw, "pv", "hp", "vida"), tipo === "Minion" ? 1 : 5));
  const st = Math.max(0, num(g(raw, "estresse", "stress", "st"), 2));
  let atk = String(g(raw, "ataque", "atk", "modificador") ?? BENCH[tier].atk).trim();
  if (/^\d/.test(atk)) atk = "+" + atk;
  const rngRaw = String(g(raw, "alcance", "range", "rng") || "Melee").trim();
  const rng = RANGE_PT[norm(rngRaw)] || rngRaw;
  const dmg = String(g(raw, "dano", "damage", "dmg") || "").trim();
  if (!dmg) avisos.push({ k: "aviso", t: `${eu}: sem dano definido.` });
  const f = (g(raw, "habilidades", "features", "f") || []).map((x, i) => {
    const n = String(g(x, "nome", "name", "n") || "").trim(), t = String(g(x, "texto", "text", "descricao", "t") || "").trim();
    const kRaw = norm(g(x, "tipo", "kind", "k") || "");
    const k = kRaw in KIND_ALIAS ? KIND_ALIAS[kRaw] : "";
    if (!n || !t) avisos.push({ k: "aviso", t: `${eu}: habilidade ${i + 1} incompleta.` });
    if (kRaw && !(kRaw in KIND_ALIAS)) avisos.push({ k: "aviso", t: `${eu}: tipo de habilidade “${kRaw}” desconhecido em “${n}”.` });
    return { n, k, t };
  }).filter(x => x.n || x.t);
  if (tipo === "Minion" && !f.some(x => /^Minion/i.test(x.n))) avisos.push({ k: "aviso", t: `${eu}: Lacaios normalmente têm a passiva “Minion (X)”.` });
  // conferência com os parâmetros de referência
  const b = BENCH[tier];
  if (Math.abs(dif - b.dif) > 3 && tipo !== "Social") avisos.push({ k: "dica", t: `${eu}: Dificuldade ${dif} está longe da referência do patamar ${tier} (${b.dif}).` });
  return { id: uid(), name: nome, tier, type: tipo, horde: String(g(raw, "horda", "horde") || ""), desc: String(g(raw, "descricao", "description", "desc") || ""), mot: String(g(raw, "motivacoes", "motives", "mot") || ""), dif: String(dif), th, hp: String(hp), st: String(st), atk, wpn: String(g(raw, "arma", "weapon", "wpn") || "Ataque"), rng, dmg, xp: String(g(raw, "experiencia", "experience", "xp") || ""), al: [nome], f, cat: String(g(raw, "categoria", "cat") || ""), ia: true };
}

// Adiciona os adversários de uma lista ("ref" do catálogo ou "novo") a uma batalha ou cena.
function resolverAdversarios(b, lista, avisos, novos) {
  lista.forEach((it, i) => {
    const qtd = Math.max(1, Math.min(30, parseInt(g(it, "quantidade", "qtd", "qty", "count"), 10) || 1));
    const apelido = g(it, "nome", "apelido", "label"), nota = g(it, "nota", "note") || "";
    let adv = null;
    const raw = g(it, "novo", "new", "custom");
    if (raw) { adv = normalizarAdv(raw, avisos, `Adversário ${i + 1}`); if (adv) novos.push(adv); }
    else {
      const ref = String(g(it, "ref", "referencia", "base", "adversario") || "").trim();
      if (!ref) { avisos.push({ k: "erro", t: `Item ${i + 1}: use “ref” (adversário do livro) ou “novo” (criado do zero).` }); return; }
      adv = achaAdv(ref);
      if (!adv) { const ap = achaPorApelido(ref); if (ap) { adv = ap; avisos.push({ k: "aviso", t: `“${ref}” não é um nome exato: usei “${ap.name}”. Confira se é isso mesmo.` }); } }
      if (!adv) { const s = sugestoes(ref); avisos.push({ k: "erro", t: `“${ref}” não existe na biblioteca.${s.length ? " Quis dizer: " + s.join(", ") + "?" : ""}` }); return; }
      if (adv.src === "hf" && !hfOn()) avisos.push({ k: "aviso", t: `“${adv.name}” é da expansão Hope & Fear, que está desligada em Conta.` });
    }
    if (adv) { adicionar(b, adv, qtd, apelido && qtd === 1 ? { nome: String(apelido), desc: String(nota) } : { desc: String(nota) }); if (qtd > 1 && nota) b.unidades.slice(-qtd).forEach(u => { u.desc = String(nota); }); }
  });
}
// Lembretes da batalha (a cena valida os dela em validarCena).
function conferirLembretesAdv(reg, avisos) {
  (reg.lembretes || []).forEach((l, i) => {
    if (l.adversario && !reg.unidades.some(u => casaLembrete(l.adversario, u))) avisos.push({ k: "aviso", campo: `lembretes[${i}].adversario`, t: `lembretes[${i}].adversario: “${l.adversario}” não está entre os adversários; o lembrete aparece só na lista.` });
  });
}
function juntarLembretes(b, raw, avisos) {
  const v = validarLembretes(raw);
  v.erros.forEach(e => avisos.push({ k: "erro", campo: e.campo, t: `${e.campo}: ${e.msg}` }));
  v.avisos.forEach(e => avisos.push({ k: "aviso", campo: e.campo, t: `${e.campo}: ${e.msg}` }));
  if (!v.erros.length) { b.lembretes = criarLembretes(raw); conferirLembretesAdv(b, avisos); }
}
function resolverAmbiente(amb, avisos) {
  if (!amb) return null;
  if (typeof amb === "string" || amb.ref) {
    const nm = typeof amb === "string" ? amb : amb.ref;
    const e = ambientes().concat(EXPENV.map(x => ({ ...x, id: x.name }))).find(x => norm(x.name) === norm(nm));
    if (e) return clone(e);
    avisos.push({ k: "aviso", t: `Ambiente “${nm}” não encontrado; ignorei.` });
    return null;
  }
  if (amb.novo || amb.nome || amb.name) {
    const r = amb.novo || amb;
    return { name: String(g(r, "nome", "name") || "Ambiente"), tier: +g(r, "patamar", "tier") || 1, type: String(g(r, "tipo", "type") || "Exploration"), desc: String(g(r, "descricao", "desc", "description") || ""), impulses: String(g(r, "impulsos", "impulses") || ""), dif: String(g(r, "dificuldade", "dif") || ""), adv: "", f: (g(r, "habilidades", "features") || []).map(x => ({ n: String(g(x, "nome", "name") || ""), k: KIND_ALIAS[norm(g(x, "tipo", "kind") || "")] || "", t: String(g(x, "texto", "text") || "") })) };
  }
  return null;
}

// Valida o JSON e monta a batalha (ainda sem salvar)
export function montarDaIA(obj) {
  const avisos = [], novos = [];
  if (!obj || typeof obj !== "object") throw new Error("Formato não reconhecido.");
  const fmt = String(g(obj, "formato") || "");
  if (fmt && !/batalha|encounter|battle/i.test(fmt)) avisos.push({ k: "aviso", t: `Campo “formato” é “${fmt}”; esperado “daggerheart-batalha”.` });
  const jogadores = Math.max(1, Math.min(8, parseInt(g(obj, "jogadores", "players"), 10) || 4));
  const ajusteTxt = norm(g(obj, "dificuldade", "difficulty") || "");
  const ajuste = typeof g(obj, "ajuste") === "number" ? obj.ajuste : /facil|easy|curta/.test(ajusteTxt) ? -1 : /dificil|hard|dura|longa/.test(ajusteTxt) ? 2 : 0;
  const b = novaBatalha({ nome: String(g(obj, "nome", "name") || "Batalha da IA"), cena: String(g(obj, "cena", "scene", "descricao", "description") || ""), jogadores, ajuste, notas: String(g(obj, "notas", "notes") || ""), recompensas: String(g(obj, "recompensas", "rewards") || ""), origem: "ia" });
  const lista = g(obj, "adversarios", "adversaries", "inimigos", "enemies") || [];
  if (!Array.isArray(lista) || !lista.length) throw new Error("O JSON não tem a lista “adversarios”." + (g(obj, "resultados", "contagens") ? ' Se isto é uma cena complexa, use "tipo": "cena" e "versao": 2.' : ""));
  resolverAdversarios(b, lista, avisos, novos);
  b.ambiente = resolverAmbiente(g(obj, "ambiente", "environment"), avisos);
  juntarLembretes(b, g(obj, "lembretes", "reminders"), avisos);
  (g(obj, "contagens", "countdowns") || []).forEach(c => b.contagens.push({ id: uid(), n: String(g(c, "nome", "name") || "Contagem"), size: Math.max(1, Math.min(12, parseInt(g(c, "caixas", "size"), 10) || 4)), val: 0 }));
  const o = orcamento(b);
  if (o.sobra < 0) avisos.push({ k: "dica", t: `Custo ${o.custo} passa do orçamento ${o.total} em ${-o.sobra} ponto(s): luta mais pesada que o padrão.` });
  if (o.solos >= 2) avisos.push({ k: "dica", t: "Com 2 ou mais Solos, o livro recomenda ajuste de −2." });
  if (!avisos.some(a => a.k === "erro") && !b.unidades.length) avisos.push({ k: "erro", t: "Nenhum adversário foi criado." });
  return { batalha: b, novos, avisos, ok: !avisos.some(a => a.k === "erro") };
}


// Valida e monta uma cena complexa (tipo "cena", versao 2). Erros apontam o campo do JSON.
export function montarCena(obj) {
  const v = validarCena(obj);
  const avisos = [...v.erros.map(e => ({ k: "erro", campo: e.campo, t: `${e.campo}: ${e.msg}` })), ...v.avisos.map(e => ({ k: "aviso", campo: e.campo, t: `${e.campo}: ${e.msg}` }))];
  const novos = [];
  if (v.erros.length) return { tipo: "cena", registro: null, novos, avisos, ok: false };
  const c = criarCena(obj);
  const lista = g(obj, "adversarios", "adversaries", "inimigos", "enemies") || [];
  if (!Array.isArray(lista)) avisos.push({ k: "erro", campo: "adversarios", t: "adversarios: precisa ser uma lista." });
  else if (lista.length) resolverAdversarios(c, lista, avisos, novos);
  c.ambiente = resolverAmbiente(g(obj, "ambiente", "environment"), avisos);
  conferirLembretesAdv(c, avisos);
  return { tipo: "cena", registro: c, cena: c, novos, avisos, ok: !avisos.some(a => a.k === "erro") };
}

// Vários blocos de código na mesma resposta: cada bloco com JSON vira um item. Sem cercas, tenta o texto todo.
const pareceConteudo = o => o && typeof o === "object" && !Array.isArray(o) && (o.formato || o.tipo || o.adversarios || o.adversaries || o.inimigos || o.resultados || o.contagens);
function erroJSON(t) { try { JSON.parse(limpa(t)); return ""; } catch (e) { return e.message; } }
export function extrairBlocos(txt) {
  const s = String(txt || "").trim(), out = [];
  const cercas = [...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1].trim());
  for (const c of cercas) {
    const i = c.indexOf("{"), j = c.lastIndexOf("}");
    if (i >= 0 && j < i && c.startsWith("{")) { out.push({ erro: "O JSON está incompleto: faltou fechar as chaves (a resposta pode ter sido cortada)." }); continue; }
    if (i < 0 || j < i) continue;
    const bruto = c.slice(i, j + 1), o = tentaParse(bruto);
    if (o) { if (pareceConteudo(o)) out.push({ obj: o }); }
    else out.push({ erro: "O JSON está inválido: " + erroJSON(bruto) });
  }
  if (!out.length) {
    const i = s.indexOf("{"), j = s.lastIndexOf("}");
    if (i >= 0 && j > i) { const bruto = s.slice(i, j + 1), o = tentaParse(bruto); out.push(o ? { obj: o } : { erro: "O JSON está inválido: " + erroJSON(bruto) }); }
  }
  return out;
}
export function lerResposta(txt) {
  const blocos = extrairBlocos(txt);
  if (!blocos.length) throw new Error("Não encontrei um JSON no texto colado.");
  return blocos.map((b, i) => {
    const base = { indice: i, titulo: `Bloco ${i + 1}`, novos: [] };
    if (b.erro) return { ...base, ok: false, tipo: "?", registro: null, avisos: [{ k: "erro", t: b.erro }] };
    const o = b.obj, tipoRaw = o.tipo == null ? "batalha" : String(o.tipo), tipo = norm(tipoRaw);
    base.titulo = String(o.nome || o.name || base.titulo);
    if (!["batalha", "cena"].includes(tipo)) return { ...base, ok: false, tipo: "?", registro: null, avisos: [{ k: "erro", t: `tipo: “${tipoRaw}” não existe; use "batalha" ou "cena".` }] };
    if (tipo === "cena") return { ...base, ...montarCena(o) };
    try { const r = montarDaIA(o); return { ...base, tipo, registro: r.batalha, ...r }; }
    catch (e) { return { ...base, ok: false, tipo, registro: null, avisos: [{ k: "erro", t: e.message }] }; }
  });
}

export function salvarBatalha(b, { novos = [] } = {}) {
  const i = GM.batalhas.findIndex(x => x.id === b.id);
  if (i >= 0) GM.batalhas[i] = b; else GM.batalhas.unshift(b);
  novos.forEach(n => { if (!GM.custom.some(c => norm(c.name) === norm(n.name))) GM.custom.unshift({ ...n, id: n.id || uid() }); });
  salvarGM();
}
export const achaBatalha = id => GM.batalhas.find(b => b.id === id && b.tipo !== "cena");
export const achaCena = id => GM.batalhas.find(c => c.id === id && c.tipo === "cena");
export const soBatalhas = () => GM.batalhas.filter(b => b.tipo !== "cena");

// ---------- Textos para o projeto do Claude ----------
export function catalogoMD() {
  const adv = adversarios({ todos: false }).filter(a => a.src !== "custom");
  const linhas = adv.map(a => `- **${a.name}** | T${a.tier} ${a.type}${a.horde ? " (" + a.horde + ")" : ""} | Dif ${a.dif} | Lim ${a.th} | PV ${a.hp} | Est ${a.st} | ${a.atk} ${a.wpn}, ${a.rng}, ${a.dmg}${a.src === "hf" ? " | [H&F]" : ""} | ${a.mot || ""}`);
  const amb = ambientes().map(e => `- **${e.name}** | T${e.tier} ${e.type} | Dif ${e.dif}${e.src === "hf" ? " | [H&F]" : ""} | ${e.impulses || ""}`);
  return `# Catálogo de adversários e ambientes (Daggerheart SRD${hfOn() ? " 2.0 + Hope & Fear" : ""})\n\nUse o nome EXATO em inglês no campo "ref". Formato: nome | patamar e tipo | Dificuldade | limiares | PV | Estresse | ataque | motivações.\n\n## Adversários (${adv.length})\n${linhas.join("\n")}\n\n## Ambientes (${amb.length})\n${amb.join("\n")}\n`;
}
export const EXEMPLO_JSON = {
  formato: "daggerheart-batalha", versao: 1,
  nome: "Emboscada na Ponte de Ferro",
  cena: "A ponte é estreita e a névoa esconde a outra margem. Bandidos cercaram a carroça do grupo.",
  jogadores: 4, patamar: 1, dificuldade: "padrao",
  adversarios: [
    { ref: "Jagged Knife Bandit", quantidade: 2, nota: "Os que bloqueiam a frente" },
    { quantidade: 4, novo: { nome: "Atirador de Balestra", patamar: 1, tipo: "Minion", descricao: "Capanga encapuzado com uma balestra enferrujada.", motivacoes: "Atirar de cobertura, fugir se o chefe cair", dificuldade: 10, limiares: null, pv: 1, estresse: 1, ataque: "+0", arma: "Balestra", alcance: "Longe", dano: "3 fís", experiencia: "Tocaia +2", habilidades: [{ nome: "Minion (3)", tipo: "Passiva", texto: "Este adversário é derrotado ao sofrer qualquer dano. A cada 3 de dano que um PC causar a ele, derrote um Lacaio adicional ao alcance." }] } },
    { quantidade: 1, novo: { nome: "Madame Ferrugem", patamar: 1, tipo: "Leader", descricao: "Chefe do bando, de casaco vermelho.", motivacoes: "Cobrar pedágio, nunca morrer pelo bando", dificuldade: 12, limiares: "8/14", pv: 6, estresse: 4, ataque: "+2", arma: "Sabre", alcance: "Corpo a Corpo", dano: "1d8+3 fís", habilidades: [{ nome: "Cobrar Pedágio", tipo: "Ação", texto: "Escolha um alvo ao alcance Perto: ele deve entregar um item ou marcar 1 de Estresse." }, { nome: "Atacar Todos", tipo: "Ação", texto: "**Gaste 1 Medo** para convocar os lacaios: cada Lacaio ao alcance Longe se move até Muito Perto e faz um ataque padrão." }] } },
  ],
  ambiente: { ref: "Ambushers" },
  contagens: [{ nome: "A névoa se dissipa", caixas: 4 }],
  notas: "Se o grupo recuar, a ponte desaba. A carroça carrega uma carta selada.",
  recompensas: "2 punhados de ouro e o sabre da Madame.",
  lembretes: [
    { tipo: "obrigatorio", titulo: "A carta selada", texto: "A Madame precisa entregar a carta selada antes de cair: sem ela a história não segue." },
    { tipo: "condicao", titulo: "Se o grupo poupou o capanga na sessão 2", adversario: "Madame Ferrugem", texto: "Ela hesita no primeiro ataque e tenta negociar antes de lutar de verdade." },
  ],
};
export function instrucoesIA() {
  return `# Instruções: Daggerheart · criar batalhas para o site

Você ajuda o mestre a preparar o roteiro de uma campanha de Daggerheart. Sempre que sugerir uma batalha, entregue, além da descrição narrativa, um bloco JSON no formato abaixo. O mestre cola esse JSON no site (Mestre → Importar da IA) e a batalha aparece pronta para iniciar, com todos os adversários.

## Regras de montagem (SRD)
- Pontos de Batalha = (3 × número de PCs) + 2. Ajustes: −1 luta curta/fácil; −2 se houver 2+ Solos; +1 sem Bruiser/Horda/Líder/Solo; +2 luta longa/difícil.
- Custos: grupo de Lacaios igual ao tamanho do grupo = 1; Social ou Apoio = 1; Horda, Atirador, Espreitador, Padrão = 2; Líder = 3; Brutamontes = 4; Solo = 5.
- Prefira adversários do catálogo anexo ("ref" com o nome EXATO em inglês). Crie adversários novos ("novo") só quando a história pedir algo que o catálogo não tem, e use como base o mais parecido do mesmo patamar.
- Referência por patamar (ataque, dano, dificuldade, limiares): ${Object.entries(BENCH).map(([t, b]) => `T${t}: ${b.atk}, ${b.dano}, Dif ${b.dif}, ${b.lim}`).join(" · ")}.
- Lacaios: limiares null, PV 1, e a passiva “Minion (X)”. Hordas: campo "horda" como "5/HP" e a passiva “Horde (X)”.
- Habilidades: tipo "Passiva", "Ação" ou "Reação". Custos de Medo entram no texto (ex.: "**Gaste 1 Medo** para…"). Escreva textos em português; mantenha dados como 1d8+3.
- Alcances: Corpo a Corpo, Muito Perto, Perto, Longe, Muito Longe.

## Formato (responda SEMPRE com JSON válido, dentro de um bloco de código)
\`\`\`json
${JSON.stringify(EXEMPLO_JSON, null, 2)}
\`\`\`

Lembretes: inclua de 2 a 5 em "lembretes", cada um com "titulo", "texto" e "tipo": "obrigatorio" (o que precisa acontecer para a história seguir), "condicao" (como um adversário muda se algo acontecer, inclusive pelo que ocorreu em cenas anteriores) ou "geral". Use "adversario" (nome exato de um adversário da batalha) para o lembrete aparecer no cartão dele.

Campos: "ref" = nome do adversário do catálogo; "quantidade"; "nota" opcional por grupo; "nome" opcional (apelido de uma unidade); "novo" = adversário criado do zero (nome, patamar 1–4, tipo, descricao, motivacoes, dificuldade, limiares "maior/grave" ou null, pv, estresse, ataque, arma, alcance, dano, experiencia, habilidades[]). "ambiente" pode ser {"ref": "Nome"} do catálogo ou um ambiente novo. "dificuldade": "facil", "padrao" ou "dificil". Tipos: Bruiser, Horde, Leader, Minion, Ranged, Skulk, Social, Solo, Standard, Support.

## Cenas complexas (momentos de tensão que não são combate)
Para perseguição, infiltração, ritual, desastre ou fuga, entregue uma **cena complexa**: bloco JSON com \`"versao": 2\` e \`"tipo": "cena"\`. O \`"formato"\` continua \`"daggerheart-batalha"\`. Um JSON de batalha (versão 1 ou sem \`tipo\`) continua valendo.
- Obrigatórios: \`nome\`, \`objetivo\`, \`contagens\` (1 ou mais, com \`nome\`, \`caixas\` e \`lado\`: "jogadores" ou "mestre"), \`resultados\` (as 5 chaves: \`critico\`, \`sucesso_esperanca\`, \`sucesso_medo\`, \`falha_esperanca\`, \`falha_medo\`, cada uma com \`texto\` e \`efeitos\`) e \`fim.vitoria\` (\`contagem\` e \`texto\`).
- Opcionais: \`cena\` (texto para ler em voz alta), \`ciclo\` (o que cada PJ faz por rodada e qual rolagem usa), \`dificuldade_rolagem\`, \`medo\` (jogadas do mestre: \`nome\`, \`custo\`, \`texto\`, \`efeitos\`, \`limite\` {\`por\`: "rodada" ou "cena", \`vezes\`}), \`jogadores_usos\` (\`nome\`, \`recurso\`: "Esperança" ou "Estresse", \`custo\`, \`texto\`, \`efeitos\`), \`gatilhos\` (\`contagem\`, \`quando\`, \`uma_vez\`, \`titulo\`, \`texto\`), \`fim.derrota\`, \`fim.empate\`, \`ambiente\`, \`adversarios\` (mesmo formato da batalha), \`notas\`, \`recompensas\`.
- \`lembretes\`: opcional, igual ao da batalha (\`titulo\`, \`texto\`, \`tipo\`, \`adversario\`).
- \`efeitos\`: lista de \`{ "contagem": "Nome", "delta": 1 }\`. Positivo marca caixas; negativo apaga. Todo nome citado em efeitos, gatilhos e fim precisa existir em \`contagens\`. Contadores começam vazios.
- Prefira dois Contadores em disputa (Progresso dos PJs × Pressão do inimigo). Cada resultado deve mover algo; falha gera história, não beco sem saída. O site já soma +1 de Medo nos resultados "com Medo": não repita isso nos efeitos.
- Nomeie como "Sessão N · Nome da sessão · Título" para a lista ficar em ordem de sessão.
- Pode haver vários blocos JSON na mesma resposta (uma batalha e uma cena, por exemplo). Cada bloco vira um item.

Exemplo de cena:
\`\`\`json
${EXEMPLO_CENA ? JSON.stringify(EXEMPLO_CENA, null, 2) : "{}"}
\`\`\`
`;
}
