// Assistente de criação de personagem
import { esc, md, mdBlock, icon, store, openSheet, closeSheet, toast, clone } from "../util.js";
import { list, get, loc, nome, domPT, domIcon, TRAITS, TRAIT_EN, traitPT, T, dmgPT, hfOn, EXP, setMesaExp } from "../data.js";
import { novoPersonagem, deriv } from "../calc.js";
import { criarFicha, S } from "../store.js";
import { app } from "../main.js";
import { temaAttr, temaVars, temaEmblema, dcard, feat, expTag, corDom, enName, verCarta, armaHtml, armaduraHtml } from "./common.js";

const KEY = "dh-rascunho";
const PASSOS = ["Classe", "Origem", "Atributos", "Equipamento", "Experiências", "Cartas", "Detalhes"];
const VALS = [2, 1, 1, 0, 0, -1];
let R = null;

function carregar() {
  if (R) return R;
  R = store.get(KEY, null);
  if (!R || !R.pc) R = { passo: 0, pc: novoPersonagem(), pocao: "", item: "", mesa: "" };
  return R;
}
const salvar = () => store.set(KEY, R);

function okPasso(i) {
  const pc = R.pc;
  switch (i) {
    case 0: return !!(pc.classe && pc.subclasse);
    case 1: return !!(pc.comunidade && (pc.anc.tipo === "uma" ? pc.anc.id : (pc.anc.f || []).filter(Boolean).length === 2));
    case 2: return [...Object.values(pc.atr)].sort((a, b) => b - a).join() === [...VALS].sort((a, b) => b - a).join() && R.atrOk;
    case 3: return !!(pc.armas.p && pc.armadura && R.pocao);
    case 4: return pc.exp.every(e => e.n.trim());
    case 5: return pc.cartas.mao.length === 2;
    case 6: return !!pc.nome.trim();
  }
}

export function html() {
  carregar();
  const p = R.passo;
  const body = [passoClasse, passoOrigem, passoAtributos, passoEquip, passoExp, passoCartas, passoDetalhes][p]();
  const todos = PASSOS.every((_, i) => okPasso(i));
  return `<div class="ficha-tema"${temaAttr(R.pc)} style="${temaVars(R.pc)}"><div class="page-h"><h1>Novo personagem</h1><button class="btn sm ghost" data-act="limpar">${icon("trash")} Recomeçar</button></div>
  <div class="wiz-steps" role="tablist">${PASSOS.map((n, i) => `<button role="tab" aria-selected="${i === p}" class="${i === p ? "on" : ""}${okPasso(i) ? " ok" : ""}" data-act="passo" data-i="${i}"><span class="n">${okPasso(i) && i !== p ? "✓" : i + 1}</span>${n}</button>`).join("")}</div>
  ${!hfOn() && EXP.disponivel ? `<p class="muted small" style="margin:-6px 0 12px">Conteúdo da expansão <i>Hope & Fear</i> está desligado. <a href="#/conta">Ligar em Conta</a>.</p>` : ""}
  ${body}
  <div class="wiz-foot">
    ${p > 0 ? `<button class="btn" data-act="passo" data-i="${p - 1}">${icon("back")} Voltar</button>` : ""}
    ${p < PASSOS.length - 1 ? `<button class="btn pri" data-act="passo" data-i="${p + 1}" ${okPasso(p) ? "" : "disabled"}>Próximo</button>`
      : `<button class="btn hope" data-act="criar" ${todos ? "" : "disabled"}>${icon("sparkle")} Criar personagem</button>`}
  </div>
  ${p === PASSOS.length - 1 && !todos ? `<p class="muted small">Falta completar: ${PASSOS.filter((_, i) => !okPasso(i)).join(", ")}.</p>` : ""}</div>`;
}

// ---------- 1. Classe ----------
function passoClasse() {
  const pc = R.pc, cls = list("classes");
  const c = get("classes", pc.classe);
  return `<h2>Escolha sua classe</h2><p class="lead" style="margin:4px 0 14px">A classe define seus domínios de cartas, Pontos de Vida, Evasão e habilidades.</p>
  <div class="opts">${cls.map(x => {
    const o = loc("classes", x);
    const tm = temaAttr({ classe: x.id });
    return `<div class="opt${pc.classe === x.id ? " sel" : ""}"${tm || ` style="border-top:4px solid ${corDom(x.d[0])}"`}>${temaEmblema({ classe: x.id })}
      <button class="sr" data-act="classe" data-id="${esc(x.id)}">Escolher ${esc(o.n)}</button>
      <span class="chk">${pc.classe === x.id ? "✓" : ""}</span>
      <div class="t" data-act="classe" data-id="${esc(x.id)}" style="cursor:pointer">${esc(o.n)}${enName(o)} ${expTag(x)}</div>
      <div class="s">${x.d.map(domPT).join(" & ")} · PV ${x.hp} · Evasão ${x.ev}</div>
      <div class="x" data-act="classe" data-id="${esc(x.id)}" style="cursor:pointer"><b>${esc(o.hope.n)}:</b> ${md(o.hope.t)}</div>
      <div class="acts" style="margin-top:4px"><button class="btn sm ${pc.classe === x.id ? "hope" : ""}" data-act="classe" data-id="${esc(x.id)}">${pc.classe === x.id ? "Escolhida" : "Escolher"}</button><button class="btn sm ghost" data-act="verclasse" data-id="${esc(x.id)}">Detalhes</button></div>
    </div>`;
  }).join("")}</div>
  ${c ? `<section class="sec"><h2>Subclasse de ${esc(nome("classes", c))}</h2><div class="opts">${c.subs.map(sid => {
    const s = loc("subclasses", sid);
    if (!s) return "";
    return `<div class="opt${pc.subclasse === sid ? " sel" : ""}"><span class="chk">${pc.subclasse === sid ? "✓" : ""}</span>
      <div class="t">${esc(s.n)}${enName(s)}</div>
      ${s.sc ? `<div class="s">Conjuração: ${esc(traitPT(s.sc))}</div>` : ""}
      <div class="x">${s.f.map(f => `<b>${esc(f.n)}:</b> ${md(f.t.split("\n")[0])}`).join("<br>")}</div>
      <div class="acts" style="margin-top:4px"><button class="btn sm ${pc.subclasse === sid ? "hope" : ""}" data-act="sub" data-id="${esc(sid)}">${pc.subclasse === sid ? "Escolhida" : "Escolher"}</button><button class="btn sm ghost" data-act="versub" data-id="${esc(sid)}">Detalhes</button></div></div>`;
  }).join("")}</div></section>` : ""}`;
}

export function detalheClasse(id) {
  const o = loc("classes", id);
  if (!o) return;
  openSheet(`<p class="muted">${o.d.map(d => `<span class="tag" style="color:${corDom(d)}">${esc(domPT(d))}</span>`).join(" ")} PV inicial ${o.hp} · Evasão inicial ${o.ev}</p>
    <div class="tx">${mdBlock(o.desc)}</div>
    <h4 style="margin-top:14px">Habilidade de Esperança</h4>${feat(o.hope, `<span class="tag hope">3 Esperança</span>`)}
    <h4 style="margin-top:10px">Habilidades de classe</h4>${o.feats.map(f => feat(f)).join("")}
    <h4 style="margin-top:10px">Subclasses</h4>${o.subs.map(s => { const x = loc("subclasses", s); return x ? `<div class="feat"><div class="feat-h"><b>${esc(x.n)}</b>${x.sc ? `<span class="tag">Conjuração: ${esc(traitPT(x.sc))}</span>` : ""}</div><div class="tx">${x.f.map(f => `<p><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}</div></div>` : ""; }).join("")}
    ${o.items ? `<p class="small"><b>Itens de classe:</b> ${esc(o.items)}</p>` : ""}
    ${o.sugTraits ? `<p class="small muted">Atributos sugeridos (Agi, For, Acu, Ins, Pre, Con): ${esc(o.sugTraits)}</p>` : ""}`, { title: o.n, wide: true });
}
export function detalheSub(id) {
  const s = loc("subclasses", id);
  if (!s) return;
  const bloco = (t, l) => l && l.length ? `<h4 style="margin-top:10px">${t}</h4>${l.map(f => feat(f)).join("")}` : "";
  openSheet(`${s.sc ? `<p><span class="tag">Atributo de Conjuração: ${esc(traitPT(s.sc))}</span></p>` : ""}${bloco("Fundação", s.f)}${bloco("Especialização", s.s)}${bloco("Maestria", s.m)}`, { title: s.n, wide: true });
}

// ---------- 2. Origem ----------
function passoOrigem() {
  const pc = R.pc, a = pc.anc;
  const ancs = list("ancestries"), coms = list("communities");
  const mista = a.tipo === "mista";
  return `<h2>Ancestralidade</h2><p class="lead" style="margin:4px 0 10px">De qual povo você descende. Cada ancestralidade dá duas habilidades.</p>
  <div class="chips" style="margin-bottom:12px"><button class="chip${!mista ? " on" : ""}" data-act="anctipo" data-v="uma">Uma ancestralidade</button><button class="chip${mista ? " on" : ""}" data-act="anctipo" data-v="mista">Ancestralidade mista</button></div>
  ${mista ? `<div class="note info" style="margin-bottom:12px">Escolha <b>duas</b> habilidades de ancestralidades diferentes: uma que seja a <b>primeira</b> habilidade de uma ancestralidade e outra que seja a <b>segunda</b> de outra.</div>
    <label class="f" style="margin-bottom:12px">Como seu personagem chama a própria herança<input type="text" data-in="ancnome" data-k="ancnome" value="${esc(a.nome || "")}" placeholder="Ex.: goblin-orc"></label>` : ""}
  <div class="opts">${ancs.map(x => {
    const o = loc("ancestries", x);
    const sel = !mista && a.id === x.id;
    return `<div class="opt${sel ? " sel" : ""}"><span class="chk">${sel ? "✓" : ""}</span>
      <div class="t">${esc(o.n)}${enName(o)} ${expTag(x)}</div>
      ${o.f.map((f, i) => {
        const pick = mista && (a.f || [])[i] && a.f[i].anc === x.id;
        return mista ? `<button class="btn sm ${pick ? "hope" : "ghost"}" style="justify-content:flex-start;text-align:left;white-space:normal;height:auto;padding:8px 10px" data-act="ancmix" data-id="${esc(x.id)}" data-i="${i}"><span><b>${i + 1}ª · ${esc(f.n)}:</b> ${md(f.t)}</span></button>` : `<div class="x"><b>${esc(f.n)}:</b> ${md(f.t)}</div>`;
      }).join("")}
      ${!mista ? `<div class="acts" style="margin-top:4px"><button class="btn sm ${sel ? "hope" : ""}" data-act="anc" data-id="${esc(x.id)}">${sel ? "Escolhida" : "Escolher"}</button><button class="btn sm ghost" data-act="verorig" data-k="ancestries" data-id="${esc(x.id)}">Sobre</button></div>` : ""}
    </div>`;
  }).join("")}</div>
  <section class="sec"><h2>Comunidade</h2><p class="lead" style="margin:4px 0 10px">Onde e como você foi criado. Dá uma habilidade.</p>
  <div class="opts">${coms.map(x => {
    const o = loc("communities", x), sel = pc.comunidade === x.id;
    return `<div class="opt${sel ? " sel" : ""}"><span class="chk">${sel ? "✓" : ""}</span><div class="t">${esc(o.n)}${enName(o)} ${expTag(x)}</div>
      <div class="s">${esc(o.adj || "")}</div><div class="x"><b>${esc(o.f.n)}:</b> ${md(o.f.t)}</div>
      <div class="acts" style="margin-top:4px"><button class="btn sm ${sel ? "hope" : ""}" data-act="com" data-id="${esc(x.id)}">${sel ? "Escolhida" : "Escolher"}</button><button class="btn sm ghost" data-act="verorig" data-k="communities" data-id="${esc(x.id)}">Sobre</button></div></div>`;
  }).join("")}</div></section>`;
}

// ---------- 3. Atributos ----------
function passoAtributos() {
  const pc = R.pc, c = get("classes", pc.classe);
  const usados = {};
  if (R.atrOk || R.atrSet) Object.values(R.atrSet || {}).forEach(v => (usados[v] = (usados[v] || 0) + 1));
  const disp = v => VALS.filter(x => x === v).length - (usados[v] || 0);
  const sub = get("subclasses", pc.subclasse);
  return `<h2>Atributos</h2><p class="lead" style="margin:4px 0 12px">Distribua <b>+2, +1, +1, +0, +0, −1</b> entre os seis atributos. Toque no valor desejado.</p>
  ${c && c.sugTraits ? `<div class="acts" style="margin:0 0 12px"><button class="btn sm" data-act="sugatr">Usar sugestão da classe (${esc(c.sugTraits)})</button></div>` : ""}
  <div class="trait-assign">${TRAITS.map(t => {
    const cur = R.atrSet ? R.atrSet[t.k] : undefined;
    const conj = sub && sub.sc === t.en;
    return `<div class="ta"${conj ? ' style="border-color:var(--fear)"' : ""}><b>${esc(traitPT(t.en))}</b>${conj ? ` <span class="tag exp">Conjuração</span>` : ""}<div class="v">${t.v}</div>
      <div class="vals">${[2, 1, 0, -1].map(v => `<button data-act="atr" data-t="${t.k}" data-v="${v}" class="${cur === v ? "on" : ""}" ${cur !== v && disp(v) <= 0 ? "disabled" : ""}>${v > 0 ? "+" + v : v === 0 ? "0" : "−1"}</button>`).join("")}</div></div>`;
  }).join("")}</div>
  <p class="muted small" style="margin-top:10px">Restam: ${[2, 1, 0, -1].map(v => `${v > 0 ? "+" + v : v === 0 ? "0" : "−1"} ×${Math.max(0, disp(v))}`).join(" · ")}</p>`;
}

// ---------- 4. Equipamento ----------
function passoEquip() {
  const pc = R.pc, c = loc("classes", pc.classe);
  const ws = list("weapons").filter(w => w.t === 1 && !/wheelchair/i.test(w.id));
  const prim = ws.filter(w => w.ps === "Primary"), sec = ws.filter(w => w.ps === "Secondary");
  const wp = get("weapons", pc.armas.p);
  const duas = wp && wp.bur === "Two-Handed";
  const arms = list("armor").filter(a => a.t === 1);
  const opc = (arr, sel, dataAct) => arr.map(w => { const o = loc("weapons", w); return `<option value="${esc(w.id)}"${w.id === sel ? " selected" : ""}>${esc(o.n)} — ${esc(traitPT(w.tr))}, ${esc(T(w.rng))}, ${esc(dmgPT(w.dmg))}${w.bur === "Two-Handed" ? ", duas mãos" : ""}</option>`; }).join("");
  const itens = c && c.items ? c.items.split(/\s+or\s+|\s+ou\s+/i).map(s => s.replace(/^(a|an|uma?)\s+/i, "").trim()) : [];
  const d = deriv(pc);
  return `<h2>Equipamento inicial</h2>
  ${c && (c.sugPrimary || c.sugArmor) ? `<div class="acts" style="margin:6px 0 12px"><button class="btn sm" data-act="sugeq">Usar sugestão da classe</button></div>` : ""}
  <div class="grid2">
    <label class="f">Arma primária (Patamar 1)<select data-ch="armap"><option value="">Escolha…</option>
      <optgroup label="Físicas">${opc(prim.filter(w => w.kind !== "Magic" && w.kind !== "Magical"), pc.armas.p)}</optgroup>
      <optgroup label="Mágicas (exigem atributo de Conjuração)">${opc(prim.filter(w => w.kind === "Magic" || w.kind === "Magical"), pc.armas.p)}</optgroup></select></label>
    <label class="f">Arma secundária${duas ? " (não disponível: a primária usa duas mãos)" : ""}<select data-ch="armas" ${duas ? "disabled" : ""}><option value="">Nenhuma</option>${opc(sec, pc.armas.s)}</select></label>
    <label class="f">Armadura (Patamar 1)<select data-ch="armadura"><option value="">Escolha…</option>${arms.map(a => { const o = loc("armor", a); return `<option value="${esc(a.id)}"${a.id === pc.armadura ? " selected" : ""}>${esc(o.n)} — Armadura ${a.sc}, limiares ${esc(a.th)}</option>`; }).join("")}</select></label>
  </div>
  <div class="grid2" style="margin-top:12px">
    ${wp ? `<div class="card">${armaHtml(wp, d.p, "Primária")}</div>` : ""}
    ${pc.armas.s ? `<div class="card">${armaHtml(get("weapons", pc.armas.s), d.s, "Secundária")}</div>` : ""}
    ${pc.armadura ? `<div class="card">${armaduraHtml(get("armor", pc.armadura))}</div>` : ""}
  </div>
  <section class="sec"><h2>Itens</h2>
    <p class="muted">Você começa com uma tocha, 15 m (50 pés) de corda, suprimentos básicos e um punhado de ouro.</p>
    <div class="eyebrow" style="margin:12px 0 6px">Escolha uma poção</div>
    <div class="chips"><button class="chip${R.pocao === "Minor Health Potion" ? " on" : ""}" data-act="pocao" data-v="Minor Health Potion">Poção de Vida Menor (recupera 1d4 PV)</button><button class="chip${R.pocao === "Minor Stamina Potion" ? " on" : ""}" data-act="pocao" data-v="Minor Stamina Potion">Poção de Vigor Menor (recupera 1d4 Estresse)</button></div>
    ${itens.length ? `<div class="eyebrow" style="margin:14px 0 6px">Item de classe</div><div class="chips">${itens.map(i => `<button class="chip${R.item === i ? " on" : ""}" data-act="itemcl" data-v="${esc(i)}">${esc(i)}</button>`).join("")}</div>` : ""}
  </section>`;
}

// ---------- 5. Experiências ----------
const EXEMPLOS = ["Ferreiro", "Guarda-costas", "Caçador de recompensas", "Artista de circo", "Vigarista", "Médico de campo", "Mercador", "Nobre", "Pirata", "Erudito", "Mercenário", "Soldado", "Contador de histórias", "Ladrão", "Viajante do mundo", "Língua de prata", "Lobo solitário", "Observador", "Sobrevivente", "Acrobata", "Curandeiro", "Inventor", "Navegador", "Atirador de elite", "Tático", "Rastreador", "Negociador", "Mãos rápidas", "Memória fotográfica", "Amigo dos animais", "Ninguém fica para trás", "Eu te protejo"];
function passoExp() {
  const pc = R.pc;
  return `<h2>Experiências</h2><p class="lead" style="margin:4px 0 12px">Duas palavras ou frases sobre o que seu personagem sabe fazer ou quem ele é. Cada uma começa com <b>+2</b>. Ao fazer um teste, gaste 1 de Esperança para somar uma Experiência relevante.</p>
  ${pc.exp.map((e, i) => `<label class="f" style="margin-bottom:10px">Experiência ${i + 1} (+${e.v})<input type="text" data-in="exp" data-i="${i}" data-k="exp${i}" value="${esc(e.n)}" placeholder="Ex.: Ex-soldado da Guarda Real"></label>`).join("")}
  <p class="muted small">Evite coisas amplas demais (“Sortudo”) ou que deem poderes (“Voo supersônico”).</p>
  <div class="eyebrow" style="margin:12px 0 6px">Ideias — toque para usar</div>
  <div class="chips">${EXEMPLOS.map(x => `<button class="chip" data-act="expex" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
}

// ---------- 6. Cartas ----------
function passoCartas() {
  const pc = R.pc, c = get("classes", pc.classe);
  if (!c) return `<div class="empty">Escolha a classe primeiro.</div>`;
  const cards = list("cards").filter(x => c.d.includes(x.d) && x.l === 1);
  const n = pc.cartas.mao.length;
  return `<h2>Cartas de domínio</h2><p class="lead" style="margin:4px 0 12px">Escolha <b>2 cartas de nível 1</b> dos domínios ${c.d.map(d => `<b style="color:${corDom(d)}">${esc(domPT(d))}</b>`).join(" e ")}. Escolhidas: <b>${n}/2</b>.</p>
  <div class="dcards">${cards.map(x => {
    const sel = pc.cartas.mao.includes(x.id);
    return dcard(x, { sel, acts: `<button class="btn sm ${sel ? "hope" : ""}" data-act="cartasel" data-id="${esc(x.id)}" ${!sel && n >= 2 ? "disabled" : ""}>${sel ? "✓ Escolhida" : "Escolher"}</button>` });
  }).join("")}</div>`;
}

// ---------- 7. Detalhes ----------
function passoDetalhes() {
  const pc = R.pc, c = loc("classes", pc.classe);
  const mesas = S.mesas || [];
  pc.hist.perguntas = (c ? c.questions : []).map((q, i) => ({ q, a: (pc.hist.perguntas[i] || {}).a || "" }));
  pc.hist.conexoes = (c ? c.connections : []).map((q, i) => ({ q, a: (pc.hist.conexoes[i] || {}).a || "" }));
  return `<h2>Quem é você</h2>
  <div class="grid2" style="margin-top:10px">
    <label class="f">Nome do personagem<input type="text" data-in="nome" data-k="nome" value="${esc(pc.nome)}" placeholder="Ex.: Kira Vel'Anar"></label>
    <label class="f">Pronomes<input type="text" data-in="pronomes" data-k="pron" value="${esc(pc.pronomes)}" placeholder="Ex.: ela/dela"></label>
  </div>
  <label class="f" style="margin-top:12px">Aparência (roupas, olhos, corpo, rosto, atitude)<textarea data-in="aparencia" data-k="apar">${esc(pc.hist.aparencia)}</textarea></label>
  ${mesas.length ? `<label class="f" style="margin-top:12px">Mesa<select data-ch="mesa"><option value="">Nenhuma (só eu vejo)</option>${mesas.map(m => `<option value="${m.id}"${R.mesa === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>` : ""}
  ${pc.hist.perguntas.length ? `<section class="sec"><h2>Perguntas de história</h2><p class="muted">Responda as que quiser; você pode completar depois.</p>
    ${pc.hist.perguntas.map((p, i) => `<label class="f" style="margin-top:10px">${esc(p.q)}<textarea data-in="perg" data-i="${i}" data-k="perg${i}" style="min-height:64px">${esc(p.a)}</textarea></label>`).join("")}</section>` : ""}
  ${pc.hist.conexoes.length ? `<section class="sec"><h2>Conexões</h2><p class="muted">Faça estas perguntas aos outros jogadores na primeira sessão.</p><ul>${pc.hist.conexoes.map(p => `<li>${esc(p.q)}</li>`).join("")}</ul></section>` : ""}
  <label class="switch" style="margin-top:14px"><input type="checkbox" data-ch="modelo" ${R.modelo ? "checked" : ""}><span class="t"><b>Estou criando para entregar a um jogador</b><span>Ao terminar, o site já abre a tela para enviar o link do personagem.</span></span></label>
  ${resumo()}`;
}
function resumo() {
  const pc = R.pc;
  if (!pc.classe) return "";
  const d = deriv(pc);
  return `<section class="sec"><h2>Resumo</h2><div class="card"><div class="core">
    <div class="stat"><b>${d.ev}</b><span>Evasão</span></div><div class="stat"><b>${d.pvMax}</b><span>PV</span></div><div class="stat"><b>${d.esMax}</b><span>Estresse</span></div>
    <div class="stat"><b>${d.armMax}</b><span>Armadura</span></div><div class="stat th"><b>${d.lim[0]} / ${d.lim[1]}</b><span>Limiares</span></div><div class="stat"><b>2</b><span>Esperança</span></div></div></div></section>`;
}

// ---------- eventos ----------
export function on(a, el) {
  carregar();
  const pc = R.pc, id = el.dataset.id;
  switch (a) {
    case "passo": R.passo = +el.dataset.i; break;
    case "limpar": R = { passo: 0, pc: novoPersonagem(), pocao: "", item: "", mesa: "" }; break;
    case "classe":
      if (pc.classe !== id) { pc.classe = id; pc.subclasse = ""; pc.cartas.mao = []; R.item = ""; pc.hist.perguntas = []; pc.hist.conexoes = []; }
      break;
    case "sub": pc.subclasse = id; break;
    case "verclasse": detalheClasse(id); return;
    case "versub": detalheSub(id); return;
    case "verorig": { const o = loc(el.dataset.k, id); openSheet(`<div class="tx">${mdBlock(o.desc)}</div>${o.adj ? `<p class="muted"><i>${esc(o.adj)}</i></p>` : ""}${(Array.isArray(o.f) ? o.f : [o.f]).map(f => feat(f)).join("")}`, { title: o.n }); return; }
    case "anctipo": pc.anc = el.dataset.v === "mista" ? { tipo: "mista", nome: pc.anc.nome || "", f: [] } : { tipo: "uma", id: "" }; break;
    case "anc": pc.anc = { tipo: "uma", id }; break;
    case "ancmix": {
      const i = +el.dataset.i, f = pc.anc.f || (pc.anc.f = []);
      if (f[i] && f[i].anc === id) f[i] = null;
      else { const outro = f[1 - i]; if (outro && outro.anc === id) { toast("As duas habilidades precisam vir de ancestralidades diferentes"); return; } f[i] = { anc: id, i }; }
      break;
    }
    case "com": pc.comunidade = id; break;
    case "atr": {
      R.atrSet = R.atrSet || {};
      const t = el.dataset.t, v = +el.dataset.v;
      if (R.atrSet[t] === v) delete R.atrSet[t]; else R.atrSet[t] = v;
      aplicarAtr(); break;
    }
    case "sugatr": {
      const c = get("classes", pc.classe);
      const vs = c.sugTraits.split(",").map(s => parseInt(s.replace("−", "-"), 10));
      R.atrSet = {}; TRAITS.forEach((t, i) => (R.atrSet[t.k] = vs[i] || 0)); aplicarAtr(); break;
    }
    case "sugeq": {
      const c = get("classes", pc.classe), ws = list("weapons"), ar = list("armor");
      const acha = (arr, n) => arr.find(x => x.n.toLowerCase() === String(n || "").toLowerCase() && x.t === 1);
      const p = acha(ws, c.sugPrimary), s = acha(ws, c.sugSecondary), m = acha(ar, c.sugArmor);
      if (p) pc.armas.p = p.id; pc.armas.s = s && p && p.bur !== "Two-Handed" ? s.id : ""; if (m) pc.armadura = m.id;
      break;
    }
    case "pocao": R.pocao = el.dataset.v; break;
    case "itemcl": R.item = R.item === el.dataset.v ? "" : el.dataset.v; break;
    case "expex": { const e = pc.exp.find(x => !x.n.trim()); if (e) e.n = el.dataset.v; else toast("As duas Experiências já estão preenchidas"); break; }
    case "cartasel": {
      const m = pc.cartas.mao, i = m.indexOf(id);
      if (i >= 0) m.splice(i, 1); else if (m.length < 2) m.push(id);
      break;
    }
    case "carta": verCarta(id); return;
    case "criar": criar(); return;
    default: return;
  }
  salvar(); app.render(true);
}
function aplicarAtr() {
  const pc = R.pc;
  TRAITS.forEach(t => (pc.atr[t.k] = R.atrSet[t.k] ?? 0));
  R.atrOk = TRAITS.every(t => R.atrSet[t.k] !== undefined);
}
export function input(k, el) {
  carregar();
  const pc = R.pc;
  if (k === "exp") pc.exp[+el.dataset.i].n = el.value;
  else if (k === "nome") pc.nome = el.value;
  else if (k === "pronomes") pc.pronomes = el.value;
  else if (k === "aparencia") pc.hist.aparencia = el.value;
  else if (k === "perg") pc.hist.perguntas[+el.dataset.i].a = el.value;
  else if (k === "ancnome") pc.anc.nome = el.value;
  salvar();
  // atualiza só os botões de navegação, sem redesenhar enquanto digita
  const nx = document.querySelector('.wiz-foot [data-act="passo"]:last-child, .wiz-foot [data-act="criar"]');
  if (nx && nx.dataset.act === "passo" && +nx.dataset.i > R.passo) nx.disabled = !okPasso(R.passo);
  if (nx && nx.dataset.act === "criar") nx.disabled = !PASSOS.every((_, i) => okPasso(i));
}
export function change(k, el) {
  carregar();
  const pc = R.pc;
  if (k === "armap") { pc.armas.p = el.value; const w = get("weapons", el.value); if (w && w.bur === "Two-Handed") pc.armas.s = ""; }
  else if (k === "armas") pc.armas.s = el.value;
  else if (k === "armadura") pc.armadura = el.value;
  else if (k === "mesa") R.mesa = el.value;
  else if (k === "modelo") R.modelo = el.checked;
  salvar(); app.render(true);
}

function criar() {
  const pc = clone(R.pc);
  const inv = [{ n: "Tocha", q: 1 }, { n: "Corda (15 m)", q: 1 }, { n: "Suprimentos básicos", q: 1 }];
  if (R.pocao) { const o = loc("consumables", R.pocao); inv.push({ n: o ? o.n : R.pocao, q: 1, ref: R.pocao }); }
  if (R.item) inv.push({ n: R.item, q: 1 });
  pc.inventario = inv;
  pc.ouro = { p: 1, b: 0, c: 0 };
  pc.st = { pv: 0, es: 0, esp: 2, arm: 0, cond: [] };
  pc.criadoEm = Date.now();
  if (R.modelo) pc.modelo = true;
  const entregar = !!R.modelo;
  const mesa = S.mesas.find(m => m.id === R.mesa);
  if (mesa) setMesaExp(null);
  const id = criarFicha(pc, R.mesa || null);
  store.del(KEY); R = null;
  toast("Personagem criado!");
  location.hash = "#/ficha/" + encodeURIComponent(id) + (entregar ? "?aba=ajustes&enviar=1" : "");
}
