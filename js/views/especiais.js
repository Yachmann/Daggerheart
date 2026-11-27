// "Especiais do personagem": o que é diferente no seu personagem e pede atenção na mesa.
// Botão flutuante (acima do Resumo de jogo) que só aparece quando a classe, a subclasse, a multiclasse
// ou algo da expansão Hope & Fear traz uma regra própria (dado de oração, companheiro, formas, pactos...).
// O texto de cada regra vem do próprio livro (data/*.json), nunca é reescrito aqui.
import { esc, md, mdBlock } from "../util.js";
import { get, loc, beast, nome } from "../data.js";
import { ancFeats, RECURSOS_CLASSE } from "../calc.js";
import { feat, expTag, temaAttr, temaVars } from "./common.js";

// Habilidades de classe que mudam como se joga (dado, forma, bônus de ataque...). Classes sem entrada aqui
// não têm nada fora do comum além das cartas. As da expansão (src "hf") entram inteiras: tudo nelas é novo.
const ESPECIAL = {
  Bard: { feats: ["Rally"], onde: "O Dado de Inspiração vale para você e para cada aliado; anote o seu em Contadores." },
  Druid: { feats: ["Beastform"], onde: "As Formas Bestiais ficam na aba Habilidades. Assumir uma forma marca 1 de Estresse." },
  Guardian: { feats: ["Unstoppable"], onde: "O Dado Imparável é um contador: anote o valor atual em Contadores." },
  Ranger: { feats: ["Ranger's Focus"], onde: "Anote em Contadores quando a Marca do Foco estiver em uso." },
  Rogue: { feats: ["Cloaked", "Sneak Attack"], onde: "" },
  Seraph: { feats: ["Prayer Dice"], onde: "Os Dados de Oração são um contador: anote os dados disponíveis em Contadores." },
  Sorcerer: { feats: ["Channel Raw Power"], onde: "" },
  Wizard: { feats: ["Strange Patterns"], onde: "" },
};

const card = (cab, titulo, corpo, extra = "") => `<article class="rj-card esp-card"><div class="esp-cab">${cab}</div>${titulo ? `<div class="esp-tit">${titulo}</div>` : ""}${corpo}${extra}</article>`;
const secao = (t, cards) => (cards.length ? `<section class="rj-sec"><h4>${t}</h4><div class="rj-grid">${cards.join("")}</div></section>` : "");
const onde = t => (t ? `<p class="esp-onde">${esc(t)}</p>` : "");

// Habilidades especiais de uma classe, já traduzidas. Procura pelo nome original (em inglês) e mostra o texto localizado.
function featsDaClasse(id) {
  const raw = get("classes", id), pt = loc("classes", id);
  if (!raw || !pt) return [];
  const e = ESPECIAL[id];
  const idx = raw.src === "hf" ? raw.feats.map((_, i) => i) : e ? raw.feats.map((f, i) => (e.feats.includes(f.n) ? i : -1)).filter(i => i >= 0) : [];
  return idx.map(i => pt.feats[i]).filter(Boolean);
}
const temContador = id => (RECURSOS_CLASSE[id] || []).length > 0;

function cardsClasse(id, rotulo) {
  const raw = get("classes", id), pt = loc("classes", id);
  if (!raw) return [];
  const hf = raw.src === "hf", e = ESPECIAL[id];
  const out = featsDaClasse(id).map(f => card(`${rotulo} · ${esc(pt.n)} ${hf ? expTag(raw) : ""}`, "", feat(f), onde(e && e.onde)));
  if (hf && raw.hope) out.push(card(`${rotulo} · ${esc(pt.n)} ${expTag(raw)}`, "", feat(loc("classes", id).hope, `<span class="tag hope">3 Esperança</span>`)));
  return out;
}

// Monta as seções. Devolve [{ t, cards }]; vazio = nada de especial (o botão não aparece).
export function especiais(pc) {
  const s = [];
  const c = pc.classe && get("classes", pc.classe);
  if (c) s.push({ t: "Da sua classe", cards: cardsClasse(pc.classe, "Classe") });

  const sub = pc.subclasse && get("subclasses", pc.subclasse), subL = pc.subclasse && loc("subclasses", pc.subclasse);
  const subCards = [];
  if (pc.classe === "Ranger" && sub && sub.id === "Beastbound") {
    const B = beast(), comp = pc.comp || {};
    subCards.push(card(`Subclasse · ${esc(subL.n)}`, "Companheiro animal",
      `<p class="esp-comp"><b>${esc(comp.nome || "Sem nome ainda")}</b>${comp.esp ? ` · ${esc(comp.esp)}` : ""}</p>${comp.ficha ? `<div class="rj-tx"><p>${esc(comp.ficha).replace(/\n/g, "<br>")}</p></div>` : ""}`,
      onde("A ficha do companheiro fica na aba Habilidades.") + (B && B.companion ? `<details class="more"><summary>Regras do companheiro</summary><div class="tx">${mdBlock(B.companion.rules)}${(B.companion.levelUp || []).map(f => `<p><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}</div></details>` : "")));
  }
  if (sub && sub.src === "hf") {
    const sn = pc.scNivel || 0;
    const fs = [...(subL.f || []), ...(sn >= 1 ? subL.s || [] : []), ...(sn >= 2 ? subL.m || [] : [])];
    fs.forEach(f => subCards.push(card(`Subclasse · ${esc(subL.n)} ${expTag(sub)}`, "", feat(f))));
  }
  if (subCards.length) s.push({ t: "Da sua subclasse", cards: subCards });

  if (pc.mc && pc.mc.cls) {
    const mcCards = cardsClasse(pc.mc.cls, "Multiclasse");
    if (mcCards.length) s.push({ t: "Da multiclasse", cards: mcCards });
  }

  // Expansão Hope & Fear: tudo o que o personagem usa vindo dela e que não apareceu acima
  const hf = [];
  const anc = pc.anc || {};
  const ids = anc.tipo === "mista" ? [...new Set((anc.f || []).map(x => x.anc))] : anc.id ? [anc.id] : [];
  ids.map(id => get("ancestries", id)).filter(o => o && o.src === "hf").forEach(o => {
    const feats = anc.tipo === "mista" ? ancFeats(pc).filter(f => f.de === o.id) : ancFeats(pc);
    hf.push(card(`Ancestralidade · ${esc(loc("ancestries", o).n)} ${expTag(o)}`, "", feats.map(f => feat(f)).join("")));
  });
  const com = pc.comunidade && get("communities", pc.comunidade);
  if (com && com.src === "hf") hf.push(card(`Comunidade · ${esc(loc("communities", com).n)} ${expTag(com)}`, "", feat(loc("communities", com).f)));
  const tr = pc.transf && get("transformations", pc.transf);
  if (tr) { const t = loc("transformations", tr); hf.push(card(`Transformação ${expTag(tr)}`, esc(t.n), `<div class="tx">${mdBlock(t.desc)}</div>${(t.f || []).map(f => feat(f)).join("")}`)); }
  const cartasHf = [...(pc.cartas ? pc.cartas.mao : []), ...(pc.cartas ? pc.cartas.cofre : [])].map(id => get("cards", id)).filter(o => o && o.src === "hf");
  if (cartasHf.length) hf.push(card(`Cartas de domínio ${expTag(cartasHf[0])}`, `${cartasHf.length} da expansão`, `<div class="rj-chips">${cartasHf.map(o => `<span class="rj-chip">${esc(loc("cards", o).n)}</span>`).join("")}</div>`));
  if (hf.length) s.push({ t: "Expansão Hope & Fear", cards: hf });

  return s.filter(x => x.cards.length);
}

export const quantosEspeciais = pc => especiais(pc).reduce((n, x) => n + x.cards.length, 0);

// Contador sugerido para esta classe e ainda ausente da ficha (a classe do pc ou a da multiclasse)
export function contadorFaltando(pc) {
  const ids = [pc.classe, pc.mc && pc.mc.cls].filter(Boolean);
  for (const id of ids) for (const r of RECURSOS_CLASSE[id] || []) if (!(pc.recursos || []).some(x => x.n === r.n)) return r;
  return null;
}

export function htmlEspeciais(pc) {
  const s = especiais(pc), falta = contadorFaltando(pc);
  const rot = c => (c ? nome("classes", c) : "");
  return `<div class="ficha-tema rj esp"${temaAttr(pc)} style="${temaVars(pc)}">
    <p class="muted small esp-intro">O que muda no seu ${esc(rot(pc.classe) || "personagem")} em relação às regras comuns.</p>
    ${s.map(x => secao(x.t, x.cards)).join("")}
    ${falta ? `<div class="acts"><button class="btn hope" data-act="espcont">Criar contador: ${esc(falta.n)}</button></div>` : ""}
  </div>`;
}
