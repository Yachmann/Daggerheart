// Criar personagem por JSON (one-shots com IA): valida o JSON contra os dados do jogo e monta a ficha nível 1.
// Segue as mesmas regras do assistente de criação (views/criar.js). Aceita nomes em inglês (ids do SRD) ou em português.
import { norm } from "./util.js";
import { list, get, loc, isExp, hfOn, TRAITS, domPT, traitPT } from "./data.js";
import { novoPersonagem } from "./calc.js";

const VALS = [2, 1, 1, 0, 0, -1];
const nz = s => norm(s).replace(/[^a-z0-9]+/g, " ").trim();
const limpa = t => String(t).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1");
const tenta = t => { try { return JSON.parse(limpa(t)); } catch { return undefined; } };

// Lê um campo aceitando sinônimos (com/sem acento, PT/EN, maiúsculas): g(o, "armadura", "armor")
const g = (o, ...nomes) => {
  if (!o || typeof o !== "object") return undefined;
  const ks = Object.keys(o);
  for (const n of nomes) { const k = ks.find(k => nz(k) === nz(n)); if (k !== undefined && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]; }
  return undefined;
};

// ---------- localizar itens do jogo por id, nome em inglês ou nome em português ----------
function achar(kind, txt, filtro = () => true) {
  const q = nz(txt);
  if (!q) return { x: null, dicas: [] };
  const todos = list(kind, { todas: true }).filter(filtro);
  const nomes = x => { const o = loc(kind, x); return [x.id, x.n, o && o.n].filter(Boolean); };
  const x = todos.find(x => nomes(x).some(n => nz(n) === q));
  if (x) return { x, expansao: isExp(x) && !hfOn(), dicas: [] };
  const dicas = todos.filter(x => nomes(x).some(n => nz(n).includes(q) || q.includes(nz(n)))).slice(0, 5).map(x => x.id);
  return { x: null, dicas };
}
const dicaTxt = d => (d.length ? ` Você quis dizer: ${d.join(", ")}?` : "");

// ---------- extrair os blocos JSON de um texto colado ----------
export function extrairPersonagens(txt) {
  const s = String(txt || "").trim();
  const brutos = [...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1].trim()).filter(c => /[{\[]/.test(c));
  if (!brutos.length) brutos.push(s);
  const objs = [], erros = [];
  for (const b of brutos) {
    const i = b.search(/[{\[]/), fim = Math.max(b.lastIndexOf("}"), b.lastIndexOf("]"));
    if (i < 0 || fim < i) { erros.push("O JSON está incompleto: faltou fechar as chaves (a resposta pode ter sido cortada)."); continue; }
    const t = b.slice(i, fim + 1);
    let o = tenta(t);
    if (o === undefined) { try { JSON.parse(limpa(t)); } catch (e) { erros.push("O JSON está inválido: " + e.message); } continue; }
    const lista = Array.isArray(o) ? o : Array.isArray(g(o, "personagens", "characters")) ? g(o, "personagens", "characters") : [o];
    lista.forEach(x => objs.push(x));
  }
  return { objs, erros };
}

// ---------- validar e montar um personagem ----------
const ATR_ALIAS = { agi: ["agilidade", "agility", "agi"], for: ["forca", "strength", "for"], acu: ["acuidade", "finesse", "acu"], ins: ["instinto", "instinct", "ins"], pre: ["presenca", "presence", "pre"], con: ["conhecimento", "knowledge", "con"] };
const numero = v => (typeof v === "number" ? v : parseInt(String(v).replace("−", "-").replace(/^\+/, ""), 10));
const semArtigo = s => nz(String(s).replace(/^(a|an|uma?)\s+/i, ""));
const opcoesItem = c => (c && c.items ? c.items.split(/\s+or\s+|\s+ou\s+/i).map(s => s.replace(/^(a|an|uma?)\s+/i, "").trim()) : []);

export function montarPersonagem(o) {
  const erros = [], avisos = [];
  const erro = (campo, t) => erros.push({ k: "erro", campo, t: `${campo}: ${t}` });
  const aviso = (campo, t) => avisos.push({ k: "aviso", campo, t: `${campo}: ${t}` });
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, pc: null, avisos: [{ k: "erro", t: "O bloco não é um personagem (esperado um objeto JSON)." }] };
  const pc = novoPersonagem();
  const exp = x => { if (x && x.expansao) return true; return false; };
  const falta = (campo, x, t) => erro(campo, t || "não encontrado." + dicaTxt(x.dicas));
  const formato = g(o, "formato", "format");
  if (formato !== undefined && !/personagem|character/i.test(String(formato))) aviso("formato", `“${formato}” não é "daggerheart-personagem"; tentando ler assim mesmo.`);

  // nome, pronomes, nível
  pc.nome = String(g(o, "nome", "name") || "").trim();
  if (!pc.nome) erro("nome", "obrigatório.");
  pc.pronomes = String(g(o, "pronomes", "pronouns") || "").trim();
  const nv = g(o, "nivel", "level");
  if (nv !== undefined && numero(nv) !== 1) erro("nivel", "por enquanto só nível 1. Crie no nível 1 e suba de nível pelo site (Ficha → Subir de nível).");

  // classe e subclasse
  const rc = achar("classes", g(o, "classe", "class"));
  let cls = null;
  if (!rc.x) falta("classe", rc, (g(o, "classe", "class") ? "não encontrada." + dicaTxt(rc.dicas) : "obrigatória.") + ` Opções: ${list("classes").map(c => c.id).join(", ")}.`); else if (exp(rc)) erro("classe", `“${rc.x.id}” é da expansão Hope & Fear: ligue em Conta → Expansão.`); else { cls = rc.x; pc.classe = cls.id; }
  if (cls) {
    const rs = achar("subclasses", g(o, "subclasse", "subclass"), s => cls.subs.includes(s.id));
    if (!rs.x) erro("subclasse", (g(o, "subclasse", "subclass") ? "não encontrada nesta classe." + dicaTxt(rs.dicas) : "obrigatória.") + ` Opções de ${cls.id}: ${cls.subs.join(", ")}.`);
    else if (exp(rs)) erro("subclasse", "é da expansão Hope & Fear: ligue em Conta → Expansão."); else pc.subclasse = rs.x.id;
  }

  // ancestralidade (uma, ou mista com a 1ª habilidade de uma e a 2ª de outra) e comunidade
  const anc = g(o, "ancestralidade", "ancestry");
  if (anc === undefined) erro("ancestralidade", "obrigatória.");
  else if (typeof anc === "string") {
    const r = achar("ancestries", anc);
    if (!r.x) falta("ancestralidade", r); else if (exp(r)) erro("ancestralidade", `“${r.x.id}” é da expansão Hope & Fear.`); else pc.anc = { tipo: "uma", id: r.x.id };
  } else if (typeof anc === "object") {
    const a1 = achar("ancestries", g(anc, "primeira", "first", "habilidade1", "1")), a2 = achar("ancestries", g(anc, "segunda", "second", "habilidade2", "2"));
    if (!a1.x) falta("ancestralidade.primeira", a1, "informe a ancestralidade que dá a 1ª habilidade." + dicaTxt(a1.dicas));
    if (!a2.x) falta("ancestralidade.segunda", a2, "informe a ancestralidade que dá a 2ª habilidade." + dicaTxt(a2.dicas));
    if (a1.x && a2.x) {
      if (a1.x.id === a2.x.id) erro("ancestralidade", "a mista precisa de duas ancestralidades diferentes (use só o nome se for uma).");
      else if (exp(a1) || exp(a2)) erro("ancestralidade", "uma das ancestralidades é da expansão Hope & Fear.");
      else pc.anc = { tipo: "mista", nome: String(g(anc, "nome", "name") || `${loc("ancestries", a1.x).n}-${loc("ancestries", a2.x).n}`), f: [{ anc: a1.x.id, i: 0 }, { anc: a2.x.id, i: 1 }] };
    }
  } else erro("ancestralidade", "use um nome (texto) ou {\"primeira\": …, \"segunda\": …} para ancestralidade mista.");
  const rcm = achar("communities", g(o, "comunidade", "community"));
  if (!rcm.x) falta("comunidade", rcm, g(o, "comunidade", "community") ? undefined : "obrigatória."); else if (exp(rcm)) erro("comunidade", "é da expansão Hope & Fear."); else pc.comunidade = rcm.x.id;

  // atributos: +2, +1, +1, +0, +0, −1 (padrão: sugestão da classe)
  const atr = g(o, "atributos", "traits", "attributes");
  if (atr === undefined) {
    if (cls && cls.sugTraits) { const vs = cls.sugTraits.split(",").map(numero); TRAITS.forEach((t, i) => (pc.atr[t.k] = vs[i] || 0)); aviso("atributos", "não informados: usei a sugestão da classe."); }
    else erro("atributos", "obrigatórios.");
  } else if (typeof atr !== "object" || Array.isArray(atr)) erro("atributos", "use um objeto com agilidade, forca, acuidade, instinto, presenca, conhecimento.");
  else {
    const v = {};
    for (const t of TRAITS) { const x = g(atr, ...ATR_ALIAS[t.k]); const n = numero(x); if (x === undefined || Number.isNaN(n)) erro("atributos." + t.k, `falta o valor de ${traitPT(t.en)}.`); else v[t.k] = n; }
    if (Object.keys(v).length === 6) {
      if ([...Object.values(v)].sort((a, b) => b - a).join() !== [...VALS].join()) erro("atributos", `os valores precisam ser exatamente +2, +1, +1, 0, 0, −1 (recebi ${TRAITS.map(t => v[t.k]).join(", ")}).`);
      else TRAITS.forEach(t => (pc.atr[t.k] = v[t.k]));
    }
  }

  // experiências: duas, cada uma +2
  const ex = g(o, "experiencias", "experiences");
  const exs = Array.isArray(ex) ? ex.map(e => String(typeof e === "object" ? g(e, "nome", "name", "n", "texto") || "" : e).trim()) : [];
  if (exs.length !== 2 || exs.some(e => !e)) erro("experiencias", "precisa de exatamente 2 experiências (texto curto cada uma).");
  else pc.exp = exs.map(n => ({ n, v: 2 }));

  // equipamento (padrão: sugestão da classe)
  const pedP = g(o, "arma_primaria", "primary_weapon", "armaprimaria"), pedA = g(o, "armadura", "armor");
  const kS = Object.keys(o).find(k => ["armasecundaria", "secondaryweapon"].includes(nz(k).replace(/ /g, ""))); // "" ou false = nenhuma
  const pedS = kS === undefined || o[kS] === null ? undefined : o[kS];
  const nomeSug = (kind, n, ps) => { const r = n ? achar(kind, n, x => x.t === 1) : null; return r && r.x ? r.x.id : ""; };
  let wp = null;
  if (pedP !== undefined) {
    const r = achar("weapons", pedP, w => w.t === 1 && w.ps === "Primary" && !/wheelchair/i.test(w.id));
    if (!r.x) falta("arma_primaria", r, "não encontrada entre as armas primárias de Patamar 1." + dicaTxt(r.dicas)); else if (exp(r)) erro("arma_primaria", "é da expansão Hope & Fear."); else wp = r.x;
  } else if (cls && cls.sugPrimary) { wp = get("weapons", nomeSug("weapons", cls.sugPrimary)) || null; if (wp) aviso("arma_primaria", `não informada: usei ${wp.id} (sugestão da classe).`); }
  if (!wp && pedP === undefined) erro("arma_primaria", "obrigatória.");
  if (wp) pc.armas.p = wp.id;
  if (pedS !== undefined && pedS !== false && String(pedS).trim() !== "" && nz(pedS) !== "nenhuma") {
    const r = achar("weapons", pedS, w => w.t === 1 && w.ps === "Secondary" && !/wheelchair/i.test(w.id));
    if (!r.x) falta("arma_secundaria", r, "não encontrada entre as armas secundárias de Patamar 1." + dicaTxt(r.dicas));
    else if (exp(r)) erro("arma_secundaria", "é da expansão Hope & Fear.");
    else if (wp && wp.bur === "Two-Handed") erro("arma_secundaria", `${wp.id} usa duas mãos: não pode ter arma secundária.`);
    else pc.armas.s = r.x.id;
  } else if (pedS === undefined && pedP === undefined && cls && cls.sugSecondary && wp && wp.bur !== "Two-Handed") { const s = get("weapons", nomeSug("weapons", cls.sugSecondary)); if (s) pc.armas.s = s.id; }
  if (pedA !== undefined) {
    const r = achar("armor", pedA, a => a.t === 1);
    if (!r.x) falta("armadura", r, "não encontrada entre as armaduras de Patamar 1." + dicaTxt(r.dicas)); else if (exp(r)) erro("armadura", "é da expansão Hope & Fear."); else pc.armadura = r.x.id;
  } else if (cls && cls.sugArmor) { const a = get("armor", nomeSug("armor", cls.sugArmor)); if (a) { pc.armadura = a.id; aviso("armadura", `não informada: usei ${a.id} (sugestão da classe).`); } }
  if (!pc.armadura && pedA === undefined) erro("armadura", "obrigatória.");

  // poção inicial e item de classe
  const pedPo = String(g(o, "pocao", "potion") || "vida");
  const pocao = /vigor|stamina|estresse/i.test(pedPo) ? "Minor Stamina Potion" : /vida|health|\bpv\b|hp/i.test(pedPo) ? "Minor Health Potion" : "";
  if (!pocao) erro("pocao", `use "vida" ou "vigor" (recebi “${pedPo}”).`);
  const ops = opcoesItem(cls ? loc("classes", cls) : null);
  let itemCl = g(o, "item_classe", "class_item");
  if (itemCl === undefined && ops.length) { itemCl = ops[0]; aviso("item_classe", `não informado: usei “${itemCl}”.`); }
  else if (itemCl !== undefined && ops.length && ![...ops, ...opcoesItem(cls)].some(x => semArtigo(x) === semArtigo(itemCl))) aviso("item_classe", `“${itemCl}” não está entre as opções da classe (${ops.join(" / ")}); mantive como escrito.`);

  // cartas de domínio: 2 de nível 1 dos domínios da classe
  const cs = g(o, "cartas", "cards");
  if (!Array.isArray(cs) || cs.length !== 2) erro("cartas", "precisa de exatamente 2 cartas de domínio de nível 1.");
  else if (cls) {
    const ids = [];
    cs.forEach((c, i) => {
      const r = achar("cards", typeof c === "object" ? g(c, "nome", "name", "id") : c);
      if (!r.x) falta(`cartas[${i}]`, r, `“${typeof c === "object" ? JSON.stringify(c) : c}” não encontrada.` + dicaTxt(r.dicas));
      else if (exp(r)) erro(`cartas[${i}]`, `“${r.x.id}” é da expansão Hope & Fear.`);
      else if (r.x.l !== 1) erro(`cartas[${i}]`, `${r.x.id} é de nível ${r.x.l}: escolha cartas de nível 1.`);
      else if (!cls.d.includes(r.x.d)) erro(`cartas[${i}]`, `${r.x.id} é do domínio ${domPT(r.x.d)}; ${cls.id} usa ${cls.d.map(domPT).join(" e ")}.`);
      else if (ids.includes(r.x.id)) erro(`cartas[${i}]`, `${r.x.id} repetida.`);
      else ids.push(r.x.id);
    });
    if (ids.length === 2) pc.cartas.mao = ids;
  }

  // história
  const apar = g(o, "aparencia", "appearance"), orig = g(o, "historia", "origem", "background"), notas = g(o, "notas", "notes");
  if (apar) pc.hist.aparencia = String(apar);
  if (orig) pc.hist.origem = String(orig);
  if (notas) pc.hist.notas = String(notas);
  const resp = v => (Array.isArray(v) ? v.map(x => String(typeof x === "object" ? g(x, "resposta", "answer", "a") || "" : x)) : []);
  const co = cls ? loc("classes", cls) : null;
  const pg = resp(g(o, "perguntas", "questions")), cx = resp(g(o, "conexoes", "connections"));
  pc.hist.perguntas = (co ? co.questions : []).map((q, i) => ({ q, a: pg[i] || "" }));
  pc.hist.conexoes = (co ? co.connections : []).map((q, i) => ({ q, a: cx[i] || "" }));
  if (pg.length > pc.hist.perguntas.length) aviso("perguntas", `a classe tem ${pc.hist.perguntas.length} perguntas; as respostas extras foram ignoradas.`);

  // inventário e ouro
  const inv = [{ n: "Tocha", q: 1 }, { n: "Corda (15 m)", q: 1 }, { n: "Suprimentos básicos", q: 1 }];
  if (pocao) { const c = loc("consumables", pocao); inv.push({ n: c ? c.n : pocao, q: 1, ref: pocao }); }
  if (itemCl) inv.push({ n: String(itemCl), q: 1 });
  const extra = g(o, "inventario", "inventory", "itens", "items");
  if (extra !== undefined && !Array.isArray(extra)) erro("inventario", "precisa ser uma lista.");
  else (extra || []).forEach(e => { const n = String(typeof e === "object" ? g(e, "nome", "name", "n") || "" : e).trim(); if (n) inv.push({ n, q: Math.max(1, parseInt(typeof e === "object" ? g(e, "qtd", "quantidade", "q", "qty") : 1, 10) || 1) }); });
  pc.inventario = inv;
  const ouro = g(o, "ouro", "gold");
  if (ouro && typeof ouro === "object") pc.ouro = { p: Math.max(0, parseInt(g(ouro, "punhados", "p", "handfuls"), 10) || 0), b: Math.max(0, parseInt(g(ouro, "bolsas", "b", "bags"), 10) || 0), c: Math.max(0, parseInt(g(ouro, "baus", "c", "chests"), 10) || 0) };
  else pc.ouro = { p: 1, b: 0, c: 0 };

  pc.st = { pv: 0, es: 0, esp: 2, arm: 0, cond: [] };
  pc.criadoEm = Date.now();
  return { ok: !erros.length, pc: erros.length ? null : pc, avisos: [...erros, ...avisos] };
}

// Lê um texto colado e devolve um item por personagem: { indice, titulo, ok, pc, avisos }
export function lerPersonagens(txt) {
  const { objs, erros } = extrairPersonagens(txt);
  if (!objs.length && !erros.length) throw new Error("Não encontrei um JSON no texto colado.");
  const itens = erros.map((t, i) => ({ titulo: `Bloco ${i + 1}`, ok: false, pc: null, avisos: [{ k: "erro", t }] }));
  objs.forEach(o => { const r = montarPersonagem(o); itens.push({ titulo: (o && typeof o === "object" && String(g(o, "nome", "name") || "")) || "Sem nome", ...r }); });
  return itens.map((x, i) => ({ ...x, indice: i }));
}

// ---------- textos para o projeto do Claude ----------
export const EXEMPLO_PERSONAGEM = {
  formato: "daggerheart-personagem", versao: 1,
  nome: "Kira Vel'Anar", pronomes: "ela/dela", nivel: 1,
  classe: "Rogue", subclasse: "Nightwalker",
  ancestralidade: "Elf", comunidade: "Underborne",
  atributos: { agilidade: 1, forca: -1, acuidade: 2, instinto: 0, presenca: 1, conhecimento: 0 },
  experiencias: ["Ladra de cofres da Guilda do Corvo", "Nunca esqueço um rosto"],
  arma_primaria: "Dagger", arma_secundaria: "Small Dagger", armadura: "Gambeson Armor",
  pocao: "vida", item_classe: "A set of forgery tools",
  cartas: ["Pick and Pull", "Uncanny Disguise"],
  aparencia: "Cabelos curtos e prateados, capa cinza remendada, olhos cor de âmbar.",
  historia: "Fugiu da guilda depois de roubar o cofre errado.",
  perguntas: ["Meu mentor me ensinou a nunca confiar em portas abertas.", "Devo um favor à guilda, e eles vão cobrar."],
  inventario: [{ nome: "Mapa rasgado do cofre", qtd: 1 }],
};

export function catalogoPersonagemMD() {
  const cls = list("classes"), por = (arr, f) => arr.map(f).join("\n");
  const w1 = list("weapons").filter(w => w.t === 1 && !/wheelchair/i.test(w.id));
  const arma = w => `- **${w.id}** | ${w.kind === "Magic" || w.kind === "Magical" ? "mágica" : "física"} | ${w.tr} | ${w.rng} | ${w.dmg} | ${w.bur === "Two-Handed" ? "duas mãos" : "uma mão"}${w.f && w.f.length ? " | " + w.f.map(f => f.n).join(", ") : ""}`;
  const doms = [...new Set(cls.flatMap(c => c.d))];
  return `# Catálogo para criar personagens (Daggerheart SRD${hfOn() ? " 2.0 + Hope & Fear" : ""})

Use o nome EXATO em inglês (como está abaixo) em cada campo.

## Classes (use "classe" e "subclasse")
${por(cls, c => `- **${c.id}** | domínios: ${c.d.join(" + ")} | PV ${c.hp} | Evasão ${c.ev} | subclasses: ${c.subs.join(", ")} | atributos sugeridos (Agi, For, Acu, Ins, Pre, Con): ${c.sugTraits || "-"} | arma sugerida: ${c.sugPrimary || "-"}${c.sugSecondary ? " + " + c.sugSecondary : ""} | armadura sugerida: ${c.sugArmor || "-"} | itens de classe: ${c.items || "-"}`)}

## Ancestralidades (1ª e 2ª habilidade; ancestralidade mista pega a 1ª de uma e a 2ª de outra)
${por(list("ancestries"), a => `- **${a.id}**: 1ª ${a.f[0] ? a.f[0].n : "-"} · 2ª ${a.f[1] ? a.f[1].n : "-"}`)}

## Comunidades
${list("communities").map(c => `- **${c.id}**`).join("\n")}

## Armas de Patamar 1 (nome | tipo | atributo | alcance | dano | mãos | características)
### Primárias
${por(w1.filter(w => w.ps === "Primary"), arma)}
### Secundárias
${por(w1.filter(w => w.ps === "Secondary"), arma)}

## Armaduras de Patamar 1 (nome | Armadura | limiares)
${por(list("armor").filter(a => a.t === 1), a => `- **${a.id}** | Armadura ${a.sc} | limiares ${a.th}${a.f && a.f.length ? " | " + a.f.map(f => f.n).join(", ") : ""}`)}

## Cartas de domínio de nível 1 (escolha 2 dos domínios da classe)
${doms.map(d => `### ${d}\n${por(list("cards").filter(c => c.d === d && c.l === 1), c => `- **${c.id}** (${c.t})`)}`).join("\n\n")}
`;
}

export function instrucoesPersonagemIA() {
  return `# Instruções: Daggerheart · criar personagens para o site

Quando eu pedir personagens (por exemplo, pré-tirados para uma one-shot), entregue, além da descrição narrativa de cada um, um bloco JSON por personagem, no formato abaixo. Eu colo no site (Fichas → Criar por JSON) e as fichas aparecem prontas, com PV, Evasão, Estresse e limiares calculados.

## Regras (SRD, nível 1)
- Só nível 1. O personagem nasce com PV, Estresse e Armadura zerados e 2 de Esperança.
- **Atributos:** distribua exatamente +2, +1, +1, 0, 0, −1 entre agilidade, forca, acuidade, instinto, presenca e conhecimento. Se omitir "atributos", o site usa a sugestão da classe.
- **Experiências:** exatamente 2, texto curto (ex.: “Ex-soldado da Guarda Real”). Cada uma vale +2. Nada amplo demais (“Sortudo”) nem que dê poderes.
- **Equipamento:** 1 arma primária e (se a primária for de uma mão) 1 secundária opcional, e 1 armadura, todas de Patamar 1. Se omitir, o site usa a sugestão da classe.
- **Cartas:** exatamente 2 cartas de domínio de nível 1, dos domínios da classe.
- **Ancestralidade mista:** use "ancestralidade": { "nome": "…", "primeira": "<ancestralidade da 1ª habilidade>", "segunda": "<ancestralidade da 2ª habilidade>" }, com ancestralidades diferentes.
- Use os nomes EXATOS em inglês do catálogo (campo a campo). A expansão Hope & Fear só vale se estiver ligada no site.
- Dê a cada personagem um gancho que ligue ao enredo (experiências, história e perguntas).

## Formato (um objeto por personagem; vários personagens: um bloco por personagem, ou {"personagens": [ … ]})
\`\`\`json
${JSON.stringify(EXEMPLO_PERSONAGEM, null, 2)}
\`\`\`

## Campos
- Obrigatórios: nome, classe, subclasse, ancestralidade, comunidade, experiencias (2), cartas (2).
- Opcionais: pronomes, atributos, arma_primaria, arma_secundaria (ou "" para nenhuma), armadura, pocao ("vida" ou "vigor"; padrão vida), item_classe (uma das opções da classe), aparencia, historia, notas, perguntas (respostas às perguntas de história da classe, em ordem), conexoes (respostas às conexões), inventario (lista de texto ou {"nome","qtd"}), ouro ({"punhados","bolsas","baus"}; padrão 1 punhado).
- Entregue o JSON válido (aspas duplas, sem comentários), dentro de um bloco de código.
`;
}
