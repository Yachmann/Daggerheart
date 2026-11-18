// Ficha do personagem (mobile primeiro). Toda alteração é salva na hora e sincronizada.
import { esc, md, mdBlock, icon, openSheet, closeSheet, toast, confirmar, clamp, sgn, $ } from "../util.js";
import { get, loc, list, nome, domPT, TRAITS, traitPT, T, dmgPT, beast, hfOn, setMesaExp, matches } from "../data.js";
import { deriv, ancFeats, tierOf, fmtOuro, cartasElegiveis, RECURSOS_CLASSE } from "../calc.js";
import { S, ficha, editar, excluirFicha, moverParaMesa, user } from "../store.js";
import { app } from "../main.js";
import { montarLink, paraEntrega } from "../entrega.js";
import { condFx, condBanner, COND_CLS, dcard, feat, armaHtml, armaduraHtml, coresClasse, classeSub, origemTxt, expTag, verCarta, enName, voltar, corDom } from "./common.js";

const ABAS = [["jogo", "Jogo"], ["cartas", "Cartas"], ["habil", "Habilidades"], ["inv", "Inventário"], ["hist", "História"], ["ajustes", "Ajustes"]];
const CONDS = [["Vulnerável", "Testes contra você têm vantagem."], ["Contido", "Você não pode se mover, mas pode agir."], ["Oculto", "Ataques contra você têm desvantagem."]];
let ID = null, aba = "jogo", busca = "", mostrarTodas = false;

export const ouve = m => m === "ficha:" + ID;
const F = () => ficha(ID);
const podeEditar = f => !f.dono || !user() || f.dono === user().id || S.mesas.some(m => m.id === f.mesa_id && m.mestre === user().id);
const ed = (fn, op) => { const f = F(); if (!f || !podeEditar(f)) { toast("Você só pode ver esta ficha"); return; } editar(ID, fn, op); };

export function html(p, q) {
  ID = p[0];
  if (q.aba) aba = q.aba;
  const f = F();
  if (!f) return `<div class="empty"><h3>Ficha não encontrada</h3><p>Ela pode ter sido apagada ou ainda está sincronizando.</p><a class="btn" href="#/">Voltar</a></div>`;
  const mesa = f.mesa_id && S.mesas.find(m => m.id === f.mesa_id);
  setMesaExp(mesa && mesa.config && mesa.config.expansao ? !!mesa.config.expansao.hf : null);
  const pc = f.data, d = deriv(pc), ro = !podeEditar(f);
  const corpo = { jogo: abaJogo, cartas: abaCartas, habil: abaHabil, inv: abaInv, hist: abaHist, ajustes: abaAjustes }[aba] || abaJogo;
  return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">${voltar(mesa && user() && f.dono !== user().id ? "#/mesa/" + mesa.id : "#/", mesa && user() && f.dono !== user().id ? mesa.nome : "Fichas")}<span style="flex:1"></span>
    ${ro ? `<span class="tag">Somente leitura</span>` : pc.nivel < 10 ? `<a class="btn sm hope" href="#/ficha/${encodeURIComponent(ID)}/nivel">${icon("up")} Subir de nível</a>` : ""}</div>
  <section class="sheet-hero${condFx(pc.st.cond).cls}" style="${coresClasse(pc.classe)};${condFx(pc.st.cond).style}">
    <div class="hero-top"><div class="grow"><div class="nm">${esc(pc.nome || "Sem nome")}</div>
      <div class="meta">${esc(classeSub(pc))}${pc.mc ? ` · Multiclasse ${esc(nome("classes", pc.mc.cls))}` : ""}</div>
      <div class="meta small">${esc(origemTxt(pc))}${pc.pronomes ? " · " + esc(pc.pronomes) : ""}${mesa ? ` · <span class="tag">${icon("users")} ${esc(mesa.nome)}</span>` : ""}</div></div>
      <div class="lvl-badge"><span>Nível</span><b>${pc.nivel}</b></div></div>
    ${condBanner(pc.st.cond, "você")}
    <div class="core">
      <div class="stat"><b>${d.ev}</b><span>Evasão</span></div>
      <div class="stat th"><b>${d.lim[0]}<span class="muted" style="font-size:1rem"> / </span>${d.lim[1]}</b><span>Maior / Grave</span></div>
      <div class="stat"><b>${d.prof}</b><span>Proficiência</span></div>
    </div>
    <div class="traits">${TRAITS.map(t => `<button class="trait${d.conj && d.conj.k === t.k ? " conj" : ""}" data-act="rolar" data-mod="${d.atr[t.k]}" data-rot="${esc(traitPT(t.en))}" data-pc="${esc(ID)}" title="Rolar ${esc(traitPT(t.en))}"><b>${sgn(d.atr[t.k])}</b><span>${esc(traitPT(t.en))}</span></button>`).join("")}</div>
    ${d.conj ? `<p class="muted small" style="margin:8px 0 0">Atributo de Conjuração: <b style="color:var(--fear)">${esc(traitPT(d.conj.en))}</b></p>` : ""}
  </section>
  <div class="tabs" role="tablist">${ABAS.map(([k, n]) => `<button role="tab" aria-selected="${aba === k}" data-act="aba" data-v="${k}">${n}</button>`).join("")}</div>
  <div class="${ro ? "ro" : ""}">${corpo(pc, d, ro, f)}</div>
  <button class="fab" data-act="rolar" data-pc="${esc(ID)}" aria-label="Rolar Dados de Dualidade">${icon("dice")}</button>`;
}

// ---------- Jogo ----------
function pips(cls, n, marcados, act, extra = "") {
  let h = "";
  for (let i = 0; i < n; i++) h += `<button class="pip${i < marcados ? " on" : ""}" data-act="${act}" data-i="${i}" aria-label="${i + 1}" aria-pressed="${i < marcados}"></button>`;
  return `<div class="pips ${cls}">${h}${extra}</div>`;
}
function abaJogo(pc, d, ro) {
  const st = pc.st;
  const scars = pc.cicatrizes || 0;
  let esp = "";
  for (let i = 0; i < 6; i++) esp += i >= d.espMax ? `<span class="pip scar" title="Cicatriz"></span>` : `<button class="pip${i < st.esp ? " on" : ""}" data-act="esp" data-i="${i}" aria-label="Esperança ${i + 1}"></button>`;
  return `
  <div class="track"><div class="track-h"><h3 style="color:var(--hope)">Esperança</h3><span class="cnt">${st.esp}<small>/${d.espMax}</small></span>
    <div class="step-btns"><button class="btn sm" data-act="espd" data-v="-1" aria-label="Gastar Esperança">${icon("minus")}</button><button class="btn sm" data-act="espd" data-v="1" aria-label="Ganhar Esperança">${icon("plus")}</button></div></div>
    <div class="pips esp">${esp}</div>
    ${scars ? `<p class="muted small">${scars} cicatriz${scars > 1 ? "es" : ""}: espaços de Esperança perdidos.</p>` : ""}</div>

  <div class="track"><div class="track-h"><h3 style="color:var(--blood)">Pontos de Vida</h3><span class="cnt">${d.pvMax - st.pv}<small>/${d.pvMax} restantes</small></span>
    <div class="step-btns"><button class="btn sm" data-act="pvd" data-v="-1" aria-label="Recuperar PV">${icon("minus")}</button><button class="btn sm" data-act="pvd" data-v="1" aria-label="Marcar PV">${icon("plus")}</button></div></div>
    ${pips("pv", d.pvMax, st.pv, "pv")}
    ${st.pv >= d.pvMax ? `<div class="err" style="margin-top:10px">Último PV marcado: escolha um <a href="#/regras/morte">movimento de morte</a>.</div>` : ""}
    <div class="dmg-box"><input type="number" inputmode="numeric" min="0" placeholder="Dano recebido" id="dmgIn" aria-label="Dano recebido"><button class="btn fear" data-act="dano">Calcular</button></div>
    <p class="muted small" style="margin:6px 0 0">Abaixo de ${d.lim[0]}: 1 PV · de ${d.lim[0]} a ${d.lim[1] - 1}: 2 PV · ${d.lim[1]} ou mais: 3 PV</p></div>

  <div class="track"><div class="track-h"><h3 style="color:var(--fear)">Estresse</h3><span class="cnt">${st.es}<small>/${d.esMax}</small></span>
    <div class="step-btns"><button class="btn sm" data-act="esd" data-v="-1" aria-label="Recuperar Estresse">${icon("minus")}</button><button class="btn sm" data-act="esd" data-v="1" aria-label="Marcar Estresse">${icon("plus")}</button></div></div>
    ${pips("es", d.esMax, st.es, "es")}
    ${st.es >= d.esMax ? `<p class="muted small" style="margin:8px 0 0">Estresse cheio: você fica <b>Vulnerável</b> até recuperar ao menos 1. Se precisar marcar mais Estresse, marque 1 PV no lugar.</p>` : ""}</div>

  <div class="track"><div class="track-h"><h3 style="color:var(--steel)">Espaços de Armadura</h3><span class="cnt">${d.armMax - st.arm}<small>/${d.armMax} livres</small></span>
    <div class="step-btns"><button class="btn sm" data-act="armd" data-v="-1" aria-label="Reparar">${icon("minus")}</button><button class="btn sm" data-act="armd" data-v="1" aria-label="Usar">${icon("plus")}</button></div></div>
    ${d.armMax ? pips("arm", d.armMax, st.arm, "arm") : `<p class="muted small">Sem armadura equipada.</p>`}
    <p class="muted small" style="margin:6px 0 0">Marque 1 espaço para reduzir a gravidade do dano em um limiar.</p></div>

  <div class="track"><div class="track-h"><h3>Condições</h3></div>
    <div class="cond-row">${CONDS.map(([c, t]) => `<button class="chip ${COND_CLS[c]}${st.cond.includes(c) ? " on" : ""}" data-act="cond" data-v="${c}" title="${t}">${c}</button>`).join("")}
    ${st.cond.filter(c => !CONDS.some(x => x[0] === c)).map(c => `<button class="chip on" data-act="cond" data-v="${esc(c)}">${esc(c)} ✕</button>`).join("")}
    <button class="chip" data-act="condnova">${icon("plus")} Outra</button></div></div>

  ${recursosHtml(pc)}

  <div class="track"><div class="track-h"><h3>Armas</h3></div>
    ${d.p ? armaHtml(d.p.w, d.p, "Primária") : `<p class="muted">Nenhuma arma primária.</p>`}
    ${d.s ? `<div class="divider"></div>${armaHtml(d.s.w, d.s, "Secundária")}` : ""}
    <div class="acts">${d.p ? `<button class="btn sm" data-act="rolar" data-mod="${d.p.bonus ?? 0}" data-rot="Ataque: ${esc(nome("weapons", d.p.w))}" data-pc="${esc(ID)}">${icon("dice")} Atacar</button><button class="btn sm ghost" data-act="rolardano" data-v="${esc(d.p.dano)}">Rolar dano</button>` : ""}</div></div>

  <div class="track"><div class="track-h"><h3>Experiências</h3></div>
    ${pc.exp.filter(e => e.n).map(e => `<div class="inv-row"><div class="grow"><b>${esc(e.n)}</b></div><span class="tag hope">+${e.v}</span></div>`).join("") || `<p class="muted">Nenhuma.</p>`}
    <p class="muted small">Gaste 1 de Esperança para somar uma Experiência a um teste.</p></div>

  <div class="acts"><button class="btn" data-act="descanso" data-v="curto">${icon("bed")} Descanso curto</button><button class="btn" data-act="descanso" data-v="longo">${icon("moon")} Descanso longo</button></div>
  ${pc.forma ? `<div class="note" style="margin-top:12px">Em Forma Bestial: <b>${esc(pc.forma)}</b>. <button class="btn sm ghost" data-act="forma" data-v="">Sair da forma</button></div>` : ""}`;
}

function recursosHtml(pc) {
  const r = pc.recursos || [];
  return `<div class="track"><div class="track-h"><h3>Contadores</h3><button class="btn sm ghost" data-act="recnovo">${icon("plus")} Adicionar</button></div>
    ${r.map((x, i) => `<div class="inv-row"><div class="grow"><b>${esc(x.n)}</b>${x.max ? ` <span class="muted small">máx. ${x.max}</span>` : ""}</div>
      <div class="q"><button class="btn sm" data-act="rec" data-i="${i}" data-v="-1">${icon("minus")}</button><b>${x.v}</b><button class="btn sm" data-act="rec" data-i="${i}" data-v="1">${icon("plus")}</button><button class="icon-btn" data-act="recdel" data-i="${i}" aria-label="Remover">${icon("trash")}</button></div></div>`).join("") || `<p class="muted small">Use para Dados de Inspiração, Dados de Oração, marcadores de cartas, munição…</p>`}</div>`;
}

// ---------- Cartas ----------
function abaCartas(pc, d, ro) {
  const mao = pc.cartas.mao, cofre = pc.cartas.cofre;
  const btns = (id, onde) => ro ? "" : onde === "mao"
    ? `<button class="btn sm ghost" data-act="paracofre" data-id="${esc(id)}">Guardar no cofre</button>`
    : `<button class="btn sm" data-act="paramao" data-id="${esc(id)}" data-pago="1">Recordar (↺ ${get("cards", id) ? get("cards", id).r : 0} Estresse)</button><button class="btn sm ghost" data-act="paramao" data-id="${esc(id)}">No descanso (grátis)</button>`;
  return `<div class="sec" style="margin-top:16px"><h2>Mão <span class="tag">${mao.length}/5</span></h2>
    ${mao.length ? `<div class="dcards">${mao.map(id => dcard(get("cards", id) || { id, n: id, d: "Bone", l: "?", t: "", r: 0, x: "" }, { acts: btns(id, "mao") })).join("")}</div>` : `<div class="empty">Nenhuma carta na mão.</div>`}</div>
  <div class="sec"><h2>Cofre <span class="tag">${cofre.length}</span></h2>
    <p class="muted small" style="margin-top:-6px">Cartas no cofre não podem ser usadas. Trazer uma para a mão fora do descanso custa Estresse igual ao Custo de Recordação.</p>
    ${cofre.length ? `<div class="dcards">${cofre.map(id => dcard(get("cards", id), { acts: btns(id, "cofre"), inv: true, clip: false })).join("")}</div>` : `<div class="empty">Cofre vazio.</div>`}</div>
  ${ro ? "" : `<div class="acts"><button class="btn" data-act="addcarta">${icon("plus")} Adicionar carta</button></div>
  <p class="muted small">Novas cartas normalmente vêm ao <a href="#/ficha/${encodeURIComponent(ID)}/nivel">subir de nível</a>. Use “Adicionar carta” para correções ou recompensas do mestre.</p>`}`;
}

function pickerCartas() {
  const f = F(), pc = f.data;
  let l = mostrarTodas ? list("cards").filter(c => !pc.cartas.mao.includes(c.id) && !pc.cartas.cofre.includes(c.id)) : cartasElegiveis(pc, { maxL: pc.nivel, novoNivel: pc.nivel, lista: list("cards") });
  l = l.filter(c => matches(loc("cards", c), busca)).sort((a, b) => a.l - b.l || a.d.localeCompare(b.d));
  return `<div class="search"><span>${icon("search")}</span><input type="search" id="pkq" value="${esc(busca)}" placeholder="Buscar carta…"></div>
  <label class="switch"><input type="checkbox" id="pkall" ${mostrarTodas ? "checked" : ""}><span class="t"><b>Mostrar todas as cartas</b><span>Inclui outros domínios e níveis acima do seu (com aprovação do mestre).</span></span></label>
  <div class="dcards" id="pklist">${l.slice(0, 60).map(c => dcard(c, { clip: true, acts: `<button class="btn sm hope" data-act="addc" data-id="${esc(c.id)}">Adicionar</button>` })).join("") || `<p class="muted">Nenhuma carta disponível.</p>`}</div>`;
}
function abrirPicker() {
  const w = openSheet(pickerCartas(), { title: "Adicionar carta", wide: true });
  w._view = { on };
  const re = () => { const b = w.querySelector(".sheet-body"); const y = b.scrollTop; b.innerHTML = pickerCartas(); b.scrollTop = y; liga(); const i = b.querySelector("#pkq"); if (document.activeElement !== i && busca) { i.focus(); i.setSelectionRange(busca.length, busca.length); } };
  const liga = () => {
    w.querySelector("#pkq").addEventListener("input", e => { busca = e.target.value; const b = w.querySelector(".sheet-body"); const sel = e.target.selectionStart; re(); const i = b.querySelector("#pkq"); i.focus(); i.setSelectionRange(sel, sel); });
    w.querySelector("#pkall").addEventListener("change", e => { mostrarTodas = e.target.checked; re(); });
  };
  liga();
}

// ---------- Habilidades ----------
function abaHabil(pc, d) {
  const c = loc("classes", pc.classe), s = loc("subclasses", pc.subclasse);
  const sn = pc.scNivel || 0;
  const bloco = (t, arr, tag = "") => arr && arr.length ? `<div class="card" style="margin-top:12px"><h3>${t} ${tag}</h3>${arr.map(f => feat(f)).join("")}</div>` : "";
  const anc = ancFeats(pc), com = loc("communities", pc.comunidade);
  const mc = pc.mc && loc("classes", pc.mc.cls), mcs = pc.mc && loc("subclasses", pc.mc.sub);
  let h = "";
  if (c) h += bloco("Habilidade de Esperança", [c.hope], `<span class="tag hope">Gaste 3 Esperança</span>`) + bloco("Habilidades de " + esc(c.n), c.feats);
  if (s) h += bloco(esc(s.n) + " · Fundação", s.f) + (sn >= 1 ? bloco(esc(s.n) + " · Especialização", s.s) : "") + (sn >= 2 ? bloco(esc(s.n) + " · Maestria", s.m) : "");
  if (s && sn < 2) h += `<p class="muted small" style="margin-top:8px">Próxima: ${sn === 0 ? "Especialização" : "Maestria"} — obtida ao escolher “Carta de subclasse aprimorada” ao subir de nível (a partir do nível 5).</p>`;
  if (mc) h += `<div class="card" style="margin-top:12px"><h3>Multiclasse: ${esc(mc.n)} <span class="tag">${esc(domPT(pc.mc.dom))}</span></h3>${mc.feats.map(f => feat(f)).join("")}${mcs ? mcs.f.map(f => feat(f)).join("") : ""}</div>`;
  h += bloco("Ancestralidade", anc);
  if (com) h += bloco("Comunidade: " + esc(com.n), [com.f]);
  if (pc.classe === "Druid") h += formasHtml(pc, d);
  if (pc.classe === "Ranger" && s && s.id === "Beastbound") h += companheiroHtml(pc);
  if (hfOn()) {
    const tr = list("transformations");
    if (tr.length) {
      const atual = pc.transf && loc("transformations", pc.transf);
      h += `<div class="card" style="margin-top:12px"><h3>Transformação <span class="tag exp">H&F</span></h3>
        <label class="f">Transformação<select data-ch="transf"><option value="">Nenhuma</option>${tr.map(t => `<option value="${esc(t.id)}"${t.id === pc.transf ? " selected" : ""}>${esc(nome("transformations", t))}</option>`).join("")}</select></label>
        ${atual ? `<div class="tx" style="margin-top:8px">${mdBlock(atual.desc)}</div>${(atual.f || []).map(f => feat(f)).join("")}` : ""}</div>`;
    }
  }
  return h;
}
function formasHtml(pc, d) {
  const B = beast();
  if (!B || !B.beastforms) return "";
  const l = B.beastforms.filter(b => b.tier <= d.tier);
  return `<div class="card" style="margin-top:12px"><h3>Formas Bestiais <span class="tag">Patamar ${d.tier} ou menor</span></h3>
    <p class="muted small">Marque 1 de Estresse para se transformar. Você soma o bônus de Evasão da forma e usa o atributo dela para atacar.</p>
    ${l.map(b => `<details class="more"><summary>${esc(b.n)} <span class="muted small" style="margin-left:6px">P${b.tier}${b.trait ? " · " + esc(b.trait) + " " + sgn(b.tb || 0) : ""}${b.ev ? " · Evasão " + sgn(b.ev) : ""}</span></summary>
      <div class="tx">${b.ex ? `<p class="muted"><i>${esc(b.ex)}</i></p>` : ""}${b.atk ? `<p><b>Ataque:</b> ${esc(b.atk)} · ${esc(b.dmg || "")}</p>` : ""}${b.adv ? `<p><b>Vantagem em:</b> ${esc(b.adv)}</p>` : ""}${(b.f || []).map(f => `<p><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}</div>
      <button class="btn sm" data-act="forma" data-v="${esc(b.n)}">Assumir esta forma</button></details>`).join("")}</div>`;
}
function companheiroHtml(pc) {
  const B = beast(), comp = pc.comp || {};
  return `<div class="card" style="margin-top:12px"><h3>Companheiro animal</h3>
    <div class="grid2"><label class="f">Nome<input type="text" data-in="comp" data-f="nome" data-k="compn" value="${esc(comp.nome || "")}"></label><label class="f">Espécie<input type="text" data-in="comp" data-f="esp" data-k="compe" value="${esc(comp.esp || "")}"></label></div>
    <label class="f" style="margin-top:10px">Ficha do companheiro (Evasão, ataque, Experiências, Estresse, melhorias)<textarea data-in="comp" data-f="ficha" data-k="compf">${esc(comp.ficha || "")}</textarea></label>
    ${B && B.companion ? `<details class="more"><summary>Regras do companheiro</summary><div class="tx">${mdBlock(B.companion.rules)}${(B.companion.levelUp || []).map(f => `<p><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}</div></details>` : ""}</div>`;
}

// ---------- Inventário ----------
function abaInv(pc, d, ro) {
  return `<div class="track"><div class="track-h"><h3>Equipado</h3>${ro ? "" : `<button class="btn sm ghost" data-act="trocareq">${icon("edit")} Trocar</button>`}</div>
    ${d.p ? armaHtml(d.p.w, d.p, "Arma primária") : `<p class="muted">Sem arma primária.</p>`}
    ${d.s ? `<div class="divider"></div>${armaHtml(d.s.w, d.s, "Arma secundária")}` : ""}
    <div class="divider"></div>${armaduraHtml(d.arm)}</div>
  <div class="track"><div class="track-h"><h3>Ouro</h3><span class="muted small">${esc(fmtOuro(pc.ouro))}</span></div>
    <div class="gold">${[["p", "Punhados"], ["b", "Bolsas"], ["c", "Baús"]].map(([k, n]) => `<div class="g"><b>${pc.ouro[k] || 0}</b><span>${n}</span><div class="step-btns"><button class="btn sm" data-act="ouro" data-k="${k}" data-v="-1" aria-label="Menos">${icon("minus")}</button><button class="btn sm" data-act="ouro" data-k="${k}" data-v="1" aria-label="Mais">${icon("plus")}</button></div></div>`).join("")}</div>
    <p class="muted small" style="margin:8px 0 0">10 punhados = 1 bolsa · 10 bolsas = 1 baú</p></div>
  <div class="track"><div class="track-h"><h3>Itens</h3>${ro ? "" : `<button class="btn sm ghost" data-act="itemnovo">${icon("plus")} Item</button>`}</div>
    ${pc.inventario.map((it, i) => `<div class="inv-row"><div class="grow"><b>${esc(it.n)}</b>${it.nota ? `<div class="muted small">${esc(it.nota)}</div>` : ""}${it.ref && loc("consumables", it.ref) ? `<div class="muted small">${md(loc("consumables", it.ref).x)}</div>` : it.ref && loc("items", it.ref) ? `<div class="muted small">${md(loc("items", it.ref).x)}</div>` : ""}</div>
      <div class="q"><button class="btn sm" data-act="itq" data-i="${i}" data-v="-1" aria-label="Menos">${icon("minus")}</button><b>${it.q ?? 1}</b><button class="btn sm" data-act="itq" data-i="${i}" data-v="1" aria-label="Mais">${icon("plus")}</button></div></div>`).join("") || `<p class="muted">Inventário vazio.</p>`}
  </div>
  ${(pc.reserva || []).length ? `<div class="track"><div class="track-h"><h3>Armas e armaduras guardadas</h3></div>${pc.reserva.map((r, i) => { const k = r.k === "armor" ? "armor" : "weapons"; const o = loc(k, r.id); return o ? `<div class="inv-row"><div class="grow"><b>${esc(o.n)}</b> <span class="muted small">${k === "armor" ? "Armadura" : "Arma"} · P${o.t}</span></div><button class="icon-btn" data-act="resdel" data-i="${i}" aria-label="Descartar">${icon("trash")}</button></div>` : ""; }).join("")}</div>` : ""}`;
}

// ---------- História ----------
function abaHist(pc, d, ro) {
  const dis = ro ? "readonly" : "";
  return `<div class="track"><div class="track-h"><h3>Experiências</h3>${ro ? "" : `<button class="btn sm ghost" data-act="expnova">${icon("plus")} Nova</button>`}</div>
    ${pc.exp.map((e, i) => `<div class="row" style="margin-bottom:8px"><label class="f" style="flex:4">Experiência<input type="text" data-in="expn" data-i="${i}" data-k="xn${i}" value="${esc(e.n)}" ${dis}></label><label class="f" style="flex:1;min-width:80px">Bônus<input type="number" data-in="expv" data-i="${i}" data-k="xv${i}" value="${e.v}" ${dis}></label></div>`).join("")}</div>
  <div class="track"><h3 style="margin-bottom:8px">Aparência</h3><textarea data-in="hist" data-f="aparencia" data-k="ha" ${dis}>${esc(pc.hist.aparencia)}</textarea></div>
  <div class="track"><h3 style="margin-bottom:8px">Origem e história</h3><textarea data-in="hist" data-f="origem" data-k="ho" style="min-height:140px" ${dis}>${esc(pc.hist.origem)}</textarea></div>
  ${(pc.hist.perguntas || []).length ? `<div class="track"><h3 style="margin-bottom:8px">Perguntas de história</h3>${pc.hist.perguntas.map((p, i) => `<label class="f" style="margin-bottom:10px">${esc(p.q)}<textarea data-in="perg" data-i="${i}" data-k="hp${i}" style="min-height:60px" ${dis}>${esc(p.a)}</textarea></label>`).join("")}</div>` : ""}
  ${(pc.hist.conexoes || []).length ? `<div class="track"><h3 style="margin-bottom:8px">Conexões</h3>${pc.hist.conexoes.map((p, i) => `<label class="f" style="margin-bottom:10px">${esc(p.q)}<textarea data-in="conx" data-i="${i}" data-k="hc${i}" style="min-height:60px" ${dis}>${esc(p.a)}</textarea></label>`).join("")}</div>` : ""}
  <div class="track"><h3 style="margin-bottom:8px">Anotações da campanha</h3><textarea data-in="hist" data-f="notas" data-k="hn" style="min-height:180px" placeholder="NPCs, pistas, dívidas, promessas…" ${dis}>${esc(pc.hist.notas)}</textarea></div>`;
}

// ---------- Ajustes ----------
function abaAjustes(pc, d, ro, f) {
  if (ro) return `<p class="muted" style="margin-top:16px">Somente o dono da ficha (ou o mestre da mesa) pode alterar os ajustes.</p>`;
  const mesas = S.mesas || [];
  const souDono = !f.dono || !user() || f.dono === user().id;
  const M = pc.mod || {};
  return `<div class="track"><h3 style="margin-bottom:8px">Básico</h3><div class="grid2">
    <label class="f">Nome<input type="text" data-in="nome" data-k="anome" value="${esc(pc.nome)}"></label>
    <label class="f">Pronomes<input type="text" data-in="pron" data-k="apron" value="${esc(pc.pronomes)}"></label></div></div>
  <div class="track"><h3>Bônus manuais</h3><p class="muted small">Para efeitos de cartas, itens ou decisões do mestre que o app não calcula sozinho.</p>
    <div class="grid3">${[["ev", "Evasão"], ["arm", "Valor de Armadura"], ["lim", "Limiares"], ["pv", "Espaços de PV"], ["es", "Espaços de Estresse"], ["prof", "Proficiência"]].map(([k, n]) => `<label class="f">${n}<input type="number" data-in="mod" data-f="${k}" data-k="m${k}" value="${M[k] || 0}"></label>`).join("")}
    <label class="f">Cicatrizes (Esperança perdida)<input type="number" min="0" max="6" data-in="scar" data-k="mscar" value="${pc.cicatrizes || 0}"></label></div></div>
  <div class="track"><h3>Atributos base</h3><p class="muted small">Os bônus de nível e equipamento são somados automaticamente.</p>
    <div class="grid3">${TRAITS.map(t => `<label class="f">${esc(traitPT(t.en))}<input type="number" data-in="atr" data-f="${t.k}" data-k="at${t.k}" value="${pc.atr[t.k]}"></label>`).join("")}</div></div>
  ${souDono && mesas.length ? `<div class="track"><h3 style="margin-bottom:8px">Mesa</h3><label class="f">Esta ficha participa da mesa<select data-ch="mesa"><option value="">Nenhuma</option>${mesas.map(m => `<option value="${m.id}"${f.mesa_id === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label><p class="muted small">O mestre e os jogadores da mesa podem ver a ficha; o mestre também pode editá-la.</p></div>` : ""}
  <div class="track"><h3>Nível</h3><div class="acts">
    ${pc.nivel < 10 ? `<a class="btn hope" href="#/ficha/${encodeURIComponent(ID)}/nivel">${icon("up")} Subir para o nível ${pc.nivel + 1}</a>` : ""}
    ${(pc.log || []).length ? `<button class="btn" data-act="desfazernivel">Desfazer nível ${pc.nivel}</button>` : ""}</div></div>
  ${souDono ? `<div class="track"><h3>Enviar para um jogador</h3><p class="muted small" style="margin:2px 0 8px">Gera um link com este personagem. O jogador abre, vê a ficha e recebe uma cópia só dele; o seu continua com você. Ótimo para one-shots com personagens prontos.</p>
    <label class="switch"><input type="checkbox" data-ch="modelo" ${pc.modelo ? "checked" : ""}><span class="t"><b>Marcar como modelo</b><span>Aparece com a etiqueta “Modelo” na sua lista.</span></span></label>
    <div class="acts" style="margin-top:4px"><button class="btn hope" data-act="enviar">${icon("link")} Gerar link para enviar</button><button class="btn" data-act="baixarficha">Baixar arquivo .json</button></div></div>` : ""}
  ${souDono ? `<div class="acts"><button class="btn" data-act="duplicar">${icon("copy")} Duplicar</button><button class="btn danger" data-act="excluir">${icon("trash")} Excluir personagem</button></div>` : ""}`;
}

// ---------- descanso ----------
function abrirDescanso(tipo) {
  const f = F(), pc = f.data, d = deriv(pc), t = tierOf(pc.nivel);
  const curto = tipo === "curto";
  const MOV = curto ? [
    ["fer", "Tratar ferimentos", `Recupere 1d4+${t} PV (em você ou num aliado).`],
    ["est", "Aliviar o Estresse", `Recupere 1d4+${t} de Estresse.`],
    ["arm", "Reparar armadura", `Recupere 1d4+${t} espaços de Armadura.`],
    ["prep", "Preparar", "Ganhe 1 de Esperança (2 se preparar junto com aliados)."],
  ] : [
    ["fer", "Tratar todos os ferimentos", "Recupere todos os PV."],
    ["est", "Aliviar todo o Estresse", "Recupere todo o Estresse."],
    ["arm", "Reparar toda a armadura", "Recupere todos os espaços de Armadura."],
    ["prep", "Preparar", "Ganhe 1 de Esperança (2 se preparar junto com aliados)."],
    ["proj", "Trabalhar num projeto", "Avance a contagem de um projeto de longo prazo."],
  ];
  const sel = [];
  const draw = () => `<p class="muted">${curto ? "Descanso curto (cerca de 1 hora)." : "Descanso longo (várias horas, normalmente uma noite)."} Escolha <b>duas</b> ações — pode repetir a mesma. Você também pode trocar cartas entre mão e cofre sem custo.</p>
    <div class="opts" style="grid-template-columns:1fr">${MOV.map(([k, n, x]) => { const c = sel.filter(s => s === k).length; return `<button class="opt${c ? " sel" : ""}" data-r="${k}"><span class="chk">${c ? (c > 1 ? "2×" : "✓") : ""}</span><span class="t" style="font-size:1.15rem">${n}</span><span class="x">${x}</span></button>`; }).join("")}</div>
    <label class="switch"><input type="checkbox" id="grupo"><span class="t"><b>Preparei junto com aliados</b><span>Cada um ganha 2 de Esperança em vez de 1.</span></span></label>
    <p class="muted small">${curto ? "O mestre ganha 1d4 de Medo." : "O mestre ganha 1d4 + nº de personagens de Medo e pode avançar uma contagem longa."}</p>
    <div class="acts"><button class="btn hope" id="aplicar" ${sel.length === 2 ? "" : "disabled"}>Descansar</button><button class="btn" id="limpar">Limpar escolhas</button></div>`;
  const w = openSheet(draw(), { title: curto ? "Descanso curto" : "Descanso longo" });
  const body = w.querySelector(".sheet-body");
  const liga = () => {
    body.querySelectorAll("[data-r]").forEach(b => b.addEventListener("click", () => { if (sel.length < 2) sel.push(b.dataset.r); body.innerHTML = draw(); liga(); }));
    body.querySelector("#limpar").addEventListener("click", () => { sel.length = 0; body.innerHTML = draw(); liga(); });
    body.querySelector("#aplicar").addEventListener("click", () => {
      const grupo = body.querySelector("#grupo").checked, log = [];
      const r = () => 1 + Math.floor(Math.random() * 4) + t;
      ed(pc => {
        for (const k of sel) {
          if (k === "fer") { if (curto) { const v = r(); pc.st.pv = Math.max(0, pc.st.pv - v); log.push(`Tratar ferimentos: 1d4+${t} = ${v} PV`); } else { pc.st.pv = 0; log.push("Todos os PV recuperados"); } }
          if (k === "est") { if (curto) { const v = r(); pc.st.es = Math.max(0, pc.st.es - v); log.push(`Aliviar o Estresse: ${v}`); } else { pc.st.es = 0; log.push("Todo o Estresse recuperado"); } }
          if (k === "arm") { if (curto) { const v = r(); pc.st.arm = Math.max(0, pc.st.arm - v); log.push(`Reparar armadura: ${v} espaços`); } else { pc.st.arm = 0; log.push("Armadura reparada"); } }
          if (k === "prep") { const v = grupo ? 2 : 1; pc.st.esp = Math.min(d.espMax, pc.st.esp + v); log.push(`Preparar: +${v} Esperança`); }
          if (k === "proj") log.push("Projeto: avance a contagem com o mestre");
        }
      }, { imediato: true });
      body.innerHTML = `<div class="note">${log.map(esc).join("<br>")}</div><div class="acts"><button class="btn pri" data-close>Fechar</button></div>`;
    });
  };
  liga();
}

function abrirDano() {
  const f = F(), pc = f.data, d = deriv(pc);
  const v = parseInt(($("#dmgIn") || {}).value, 10);
  if (!(v >= 0)) { toast("Digite o dano recebido"); return; }
  const sev = v <= 0 ? 0 : v >= d.lim[1] * 2 ? 4 : v >= d.lim[1] ? 3 : v >= d.lim[0] ? 2 : 1;
  const livre = d.armMax - pc.st.arm;
  const nomes = ["Nenhum", "Menor", "Maior", "Grave", "Massivo"];
  const w = openSheet(`<p class="lead">${v} de dano contra limiares ${d.lim[0]} / ${d.lim[1]}: dano <b>${nomes[sev]}</b> (${Math.min(sev, 3)} PV${sev === 4 ? "; 4 PV se a mesa usa a regra opcional de dano massivo" : ""}).</p>
    ${livre && sev ? `<p>Você pode marcar 1 espaço de Armadura (${livre} livre${livre > 1 ? "s" : ""}) para reduzir a gravidade em um limiar.</p>` : ""}
    <div class="acts">${livre && sev ? `<button class="btn" data-dn="arm">Usar Armadura: marcar ${Math.max(0, Math.min(sev, 3) - 1)} PV</button>` : ""}<button class="btn fear" data-dn="sem">Marcar ${Math.min(sev, 3)} PV</button><button class="btn ghost" data-close>Cancelar</button></div>
    <p class="muted small">Dano com resistência é reduzido à metade antes de comparar com os limiares. Dano direto não pode ser reduzido por Armadura.</p>`, { title: "Receber dano" });
  w.querySelectorAll("[data-dn]").forEach(b => b.addEventListener("click", () => {
    const arm = b.dataset.dn === "arm", n = Math.max(0, Math.min(sev, 3) - (arm ? 1 : 0));
    ed(pc => { pc.st.pv = Math.min(d.pvMax, pc.st.pv + n); if (arm) pc.st.arm = Math.min(d.armMax, pc.st.arm + 1); }, { imediato: true });
    if ($("#dmgIn")) $("#dmgIn").value = "";
    closeSheet(); toast(`${n} PV marcado${n !== 1 ? "s" : ""}${arm ? " e 1 Armadura" : ""}`);
  }));
}

function trocarEquip() {
  const pc = F().data;
  const nv = tierOf(pc.nivel);
  const ws = list("weapons").filter(w => w.t <= nv), ar = list("armor").filter(a => a.t <= nv);
  const opt = (arr, sel, k) => arr.map(w => `<option value="${esc(w.id)}"${w.id === sel ? " selected" : ""}>${esc(nome(k, w))} (P${w.t})</option>`).join("");
  const w = openSheet(`<label class="f">Arma primária<select id="eqp"><option value="">Nenhuma</option>${opt(ws.filter(x => x.ps === "Primary"), pc.armas.p, "weapons")}</select></label>
    <label class="f" style="margin-top:10px">Arma secundária<select id="eqs"><option value="">Nenhuma</option>${opt(ws.filter(x => x.ps === "Secondary"), pc.armas.s, "weapons")}</select></label>
    <label class="f" style="margin-top:10px">Armadura<select id="eqa"><option value="">Nenhuma</option>${opt(ar, pc.armadura, "armor")}</select></label>
    <label class="switch"><input type="checkbox" id="eqg" checked><span class="t"><b>Guardar o equipamento antigo</b><span>Fica na lista de armas e armaduras guardadas.</span></span></label>
    <p class="muted small">Trocar de armadura com espaços marcados: os espaços marcados continuam marcados se couberem.</p>
    <div class="acts"><button class="btn hope" id="eqok">Equipar</button></div>`, { title: "Trocar equipamento" });
  w.querySelector("#eqok").addEventListener("click", () => {
    const p = w.querySelector("#eqp").value, s = w.querySelector("#eqs").value, a = w.querySelector("#eqa").value, g = w.querySelector("#eqg").checked;
    const wp = get("weapons", p);
    if (wp && wp.bur === "Two-Handed" && s) { toast("A primária usa duas mãos: sem arma secundária"); return; }
    ed(pc => {
      pc.reserva = pc.reserva || [];
      if (g) { if (pc.armas.p && pc.armas.p !== p) pc.reserva.push({ k: "weapons", id: pc.armas.p }); if (pc.armas.s && pc.armas.s !== s) pc.reserva.push({ k: "weapons", id: pc.armas.s }); if (pc.armadura && pc.armadura !== a) pc.reserva.push({ k: "armor", id: pc.armadura }); }
      pc.reserva = pc.reserva.filter(r => r.id !== p && r.id !== s && r.id !== a);
      pc.armas = { p, s }; pc.armadura = a;
    });
    closeSheet();
  });
}

function pedirTexto(titulo, rotulo, cb, extra = "") {
  const w = openSheet(`<label class="f">${esc(rotulo)}<input type="text" id="ptx"></label>${extra}<div class="acts"><button class="btn hope" id="ptok">Adicionar</button></div>`, { title: titulo });
  const i = w.querySelector("#ptx"); setTimeout(() => i.focus(), 60);
  const ok = () => { const v = i.value.trim(); if (!v) return; cb(v, w); closeSheet(); };
  w.querySelector("#ptok").addEventListener("click", ok);
  i.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
  return w;
}

// ---------- eventos ----------
export function on(a, el) {
  const f = F(); if (!f) return;
  const pc = f.data, d = deriv(pc), i = +el.dataset.i, v = +el.dataset.v, id = el.dataset.id;
  const set = (k, n, max) => ed(pc => { pc.st[k] = clamp(n, 0, max); });
  switch (a) {
    case "aba": aba = el.dataset.v; history.replaceState(null, "", "#/ficha/" + encodeURIComponent(ID) + "?aba=" + aba); app.render(true); window.scrollTo({ top: Math.min(scrollY, $(".tabs").offsetTop - 60) }); return;
    case "pv": set("pv", pc.st.pv === i + 1 ? i : i + 1, d.pvMax); return;
    case "es": set("es", pc.st.es === i + 1 ? i : i + 1, d.esMax); return;
    case "arm": set("arm", pc.st.arm === i + 1 ? i : i + 1, d.armMax); return;
    case "esp": set("esp", pc.st.esp === i + 1 ? i : i + 1, d.espMax); return;
    case "pvd": set("pv", pc.st.pv + v, d.pvMax); return;
    case "esd":
      if (v > 0 && pc.st.es >= d.esMax) { ed(pc => { pc.st.pv = Math.min(d.pvMax, pc.st.pv + 1); }); toast("Estresse cheio: marcado 1 PV no lugar"); return; }
      set("es", pc.st.es + v, d.esMax); return;
    case "armd": set("arm", pc.st.arm + v, d.armMax); return;
    case "espd": set("esp", pc.st.esp + v, d.espMax); return;
    case "cond": ed(pc => { const c = el.dataset.v, k = pc.st.cond.indexOf(c); k >= 0 ? pc.st.cond.splice(k, 1) : pc.st.cond.push(c); }); return;
    case "condnova": pedirTexto("Nova condição", "Nome da condição", t => ed(pc => pc.st.cond.push(t))); return;
    case "dano": abrirDano(); return;
    case "descanso": abrirDescanso(el.dataset.v); return;
    case "rolardano": { const m = String(el.dataset.v).match(/(\d+)d(\d+)([+-]\d+)?/); if (!m) return; let s = 0; const r = []; for (let k = 0; k < +m[1]; k++) { const x = 1 + Math.floor(Math.random() * +m[2]); r.push(x); s += x; } s += +(m[3] || 0); openSheet(`<div class="roll-res"><div class="roll-total">${s}</div><p class="muted">${esc(el.dataset.v)}: [${r.join(", ")}]${m[3] ? " " + m[3] : ""}</p><p class="muted small">Num acerto crítico, some o valor máximo dos dados ao resultado.</p></div>`, { title: "Dano" }); return; }
    case "rec": ed(pc => { const r = pc.recursos[i]; r.v = clamp(r.v + v, 0, r.max || 99); }); return;
    case "recdel": ed(pc => pc.recursos.splice(i, 1)); return;
    case "recnovo": {
      const sug = RECURSOS_CLASSE[pc.classe] || [];
      const w = pedirTexto("Novo contador", "Nome", n => { const max = parseInt(w.querySelector("#rmax").value, 10) || 0; ed(pc => (pc.recursos = pc.recursos || []).push({ n, v: 0, max })); },
        `<label class="f" style="margin-top:10px">Máximo (opcional)<input type="number" id="rmax" min="0"></label>${sug.length ? `<div class="chips" style="margin-top:10px">${sug.map(s => `<button class="chip" data-sug="${esc(s.n)}" data-max="${s.max}">${esc(s.n)}</button>`).join("")}</div>` : ""}`);
      w.querySelectorAll("[data-sug]").forEach(b => b.addEventListener("click", () => { w.querySelector("#ptx").value = b.dataset.sug; w.querySelector("#rmax").value = b.dataset.max; }));
      return;
    }
    case "carta": verCarta(id); return;
    case "paracofre": ed(pc => { pc.cartas.mao = pc.cartas.mao.filter(x => x !== id); pc.cartas.cofre.push(id); }); return;
    case "paramao": {
      if (pc.cartas.mao.length >= 5) { toast("A mão já tem 5 cartas: guarde uma no cofre antes"); return; }
      const custo = el.dataset.pago ? (get("cards", id) || {}).r || 0 : 0;
      if (custo && pc.st.es + custo > d.esMax) { toast("Estresse insuficiente para recordar esta carta"); return; }
      ed(pc => { pc.cartas.cofre = pc.cartas.cofre.filter(x => x !== id); pc.cartas.mao.push(id); pc.st.es += custo; });
      if (custo) toast(`Marcado ${custo} de Estresse`);
      return;
    }
    case "addcarta": busca = ""; abrirPicker(); return;
    case "addc": ed(pc => { if (pc.cartas.mao.length < 5) pc.cartas.mao.push(id); else pc.cartas.cofre.push(id); }); closeSheet(); toast("Carta adicionada"); return;
    case "forma":
      if (el.dataset.v && !pc.forma) { if (pc.st.es >= d.esMax) { toast("Sem Estresse livre para se transformar"); return; } ed(pc => { pc.forma = el.dataset.v; pc.st.es += 1; }); toast("Transformado: 1 Estresse marcado"); }
      else ed(pc => { pc.forma = el.dataset.v; });
      return;
    case "trocareq": trocarEquip(); return;
    case "ouro": ed(pc => { const k = el.dataset.k; pc.ouro[k] = Math.max(0, (pc.ouro[k] || 0) + v); if (pc.ouro.p >= 10) { pc.ouro.p -= 10; pc.ouro.b++; } if (pc.ouro.b >= 10) { pc.ouro.b -= 10; pc.ouro.c++; } }); return;
    case "itq": ed(pc => { const it = pc.inventario[i]; it.q = (it.q ?? 1) + v; if (it.q <= 0) pc.inventario.splice(i, 1); }); return;
    case "itemnovo": abrirNovoItem(); return;
    case "resdel": ed(pc => pc.reserva.splice(i, 1)); return;
    case "expnova": ed(pc => pc.exp.push({ n: "", v: 2 })); return;
    case "desfazernivel": desfazerNivel(); return;
    case "enviar": abrirEnvio(); return;
    case "baixarficha": { const b = new Blob([JSON.stringify({ app: "daggerheart-fichas", v: 1, em: new Date().toISOString(), fichas: [{ nome: pc.nome, data: paraEntrega(pc) }] }, null, 1)], { type: "application/json" }), u = URL.createObjectURL(b), l = document.createElement("a"); l.href = u; l.download = (pc.nome || "personagem").replace(/[^\w-]+/g, "-") + ".json"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); toast("Arquivo baixado: o jogador importa em Conta → Restaurar backup"); return; }
    case "duplicar": import("../store.js").then(m => { const c = JSON.parse(JSON.stringify(pc)); c.nome += " (cópia)"; const nid = m.criarFicha(c); location.hash = "#/ficha/" + nid; }); return;
    case "excluir": confirmar(`Excluir ${pc.nome || "este personagem"} para sempre? Não dá para desfazer.`, { ok: "Excluir", perigo: true }).then(async ok => { if (!ok) return; try { await excluirFicha(ID); toast("Personagem excluído"); location.hash = "#/"; } catch (e) { toast("Não foi possível excluir: " + e.message, "err"); } }); return;
  }
}

function abrirNovoItem() {
  const todos = [...list("consumables").map(x => ({ k: "consumables", x })), ...list("items").map(x => ({ k: "items", x }))];
  const w = openSheet(`<label class="f">Item livre<input type="text" id="itn" placeholder="Ex.: Mapa do Velho Porto"></label>
    <div class="acts"><button class="btn hope" id="itok">Adicionar</button></div><div class="divider"></div>
    <div class="search"><span>${icon("search")}</span><input type="search" id="itq" placeholder="Ou busque um consumível ou item do livro…"></div><div id="itl"></div>`, { title: "Adicionar item" });
  const lst = w.querySelector("#itl");
  const draw = q => { lst.innerHTML = todos.filter(t => matches(loc(t.k, t.x), q)).slice(0, 30).map(t => { const o = loc(t.k, t.x); return `<button class="res" data-k="${t.k}" data-id="${esc(t.x.id)}"><div class="k">${t.k === "consumables" ? "Consumível" : "Item"} ${expTag(t.x)}</div><div class="t">${esc(o.n)}</div><div class="s">${esc(o.x)}</div></button>`; }).join(""); };
  draw("");
  w.querySelector("#itq").addEventListener("input", e => draw(e.target.value));
  lst.addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (!b) return; const o = loc(b.dataset.k, b.dataset.id); ed(pc => pc.inventario.push({ n: o.n, q: 1, ref: b.dataset.id })); closeSheet(); toast("Item adicionado"); });
  w.querySelector("#itok").addEventListener("click", () => { const n = w.querySelector("#itn").value.trim(); if (!n) return; ed(pc => pc.inventario.push({ n, q: 1 })); closeSheet(); });
}

function desfazerNivel() {
  const pc = F().data, e = pc.log[pc.log.length - 1];
  if (!e) return;
  confirmar(`Desfazer a subida para o nível ${pc.nivel}? As escolhas desse nível serão removidas.`, { ok: "Desfazer" }).then(ok => {
    if (!ok) return;
    ed(pc => {
      const e = pc.log.pop();
      pc.nivel = e.from;
      const tira = c => { pc.cartas.mao = pc.cartas.mao.filter(x => x !== c); pc.cartas.cofre = pc.cartas.cofre.filter(x => x !== c); };
      (e.added || []).forEach(tira);
      if (e.swap) { tira(e.swap.in); (e.swap.onde === "mao" ? pc.cartas.mao : pc.cartas.cofre).push(e.swap.out); }
      (e.picks || []).forEach(p => {
        if (p.o === "xp") (p.exps || []).forEach(k => { if (pc.exp[k]) pc.exp[k].v--; });
        if (p.o === "sc") pc.scNivel = Math.max(0, (pc.scNivel || 0) - 1);
        if (p.o === "mc") pc.mc = null;
      });
      if (e.novaExp) pc.exp.splice(e.novaExp.idx, 1);
    });
    toast("Nível desfeito");
  });
}

export function input(k, el) {
  const i = +el.dataset.i, fld = el.dataset.f, v = el.value;
  const f = F(); if (!f || !podeEditar(f)) return;
  editar(ID, pc => {
    switch (k) {
      case "expn": pc.exp[i].n = v; break;
      case "expv": pc.exp[i].v = parseInt(v, 10) || 0; break;
      case "hist": pc.hist[fld] = v; break;
      case "perg": pc.hist.perguntas[i].a = v; break;
      case "conx": pc.hist.conexoes[i].a = v; break;
      case "nome": pc.nome = v; break;
      case "pron": pc.pronomes = v; break;
      case "mod": pc.mod = pc.mod || {}; pc.mod[fld] = parseInt(v, 10) || 0; break;
      case "scar": pc.cicatrizes = clamp(parseInt(v, 10) || 0, 0, 6); pc.st.esp = Math.min(pc.st.esp, 6 - pc.cicatrizes); break;
      case "atr": pc.atr[fld] = parseInt(v, 10) || 0; break;
      case "comp": pc.comp = pc.comp || {}; pc.comp[fld] = v; break;
    }
  });
}
// ---------- enviar personagem por link ----------
let enviarAberto = "";
export function mount(main, p, q) {
  if (q.enviar && enviarAberto !== p[0]) { enviarAberto = p[0]; history.replaceState(null, "", "#/ficha/" + encodeURIComponent(p[0]) + "?aba=ajustes"); setTimeout(abrirEnvio, 50); }
}
function abrirEnvio() {
  const f = F(); if (!f) return;
  const mesa = f.mesa_id && user() && S.mesas.find(m => m.id === f.mesa_id && m.mestre === user().id);
  let zerar = true, comMesa = !!mesa;
  const w = openSheet(`<p class="muted" style="margin-top:0">Envie o link ao jogador (WhatsApp, Discord…). Ele abre no celular e toca em “Receber”.</p>
    ${mesa ? `<label class="switch"><input type="checkbox" id="evm" checked><span class="t"><b>Colocar o jogador na mesa “${esc(mesa.nome)}”</b><span>Ao receber, ele entra na sua mesa e você vê a ficha dele ao vivo.</span></span></label>` : ""}
    <label class="switch"><input type="checkbox" id="evz" checked><span class="t"><b>Entregar com PV e Estresse limpos</b><span>Esperança volta ao início. Desmarque para entregar exatamente como está agora.</span></span></label>
    <div class="link-box"><input type="text" id="evl" readonly value="Gerando…" aria-label="Link do personagem"></div>
    <div class="acts"><button class="btn hope" id="evc">${icon("copy")} Copiar link</button><button class="btn" id="evs" style="display:none">Compartilhar…</button></div>
    <p class="muted small" id="evn" style="margin-bottom:0"></p>`, { title: "Enviar " + (f.data.nome || "personagem") });
  const gerar = async () => {
    const link = await montarLink(F().data, { mesaCodigo: comMesa && mesa ? mesa.codigo : "", zerar });
    w.querySelector("#evl").value = link;
    w.querySelector("#evn").textContent = link.length > 3500 ? `Link longo (${link.length} caracteres): alguns aplicativos podem cortá-lo. Se der problema, use “Baixar arquivo .json”.` : "Qualquer pessoa com este link pode receber uma cópia do personagem.";
  };
  w.querySelector("#evz").addEventListener("change", e => { zerar = e.target.checked; gerar(); });
  const m = w.querySelector("#evm"); if (m) m.addEventListener("change", e => { comMesa = e.target.checked; gerar(); });
  w.querySelector("#evc").addEventListener("click", async () => { const v = w.querySelector("#evl").value; try { await navigator.clipboard.writeText(v); toast("Link copiado"); } catch { w.querySelector("#evl").select(); toast("Selecionei o link: copie manualmente"); } });
  if (navigator.share) { const b = w.querySelector("#evs"); b.style.display = ""; b.addEventListener("click", () => navigator.share({ title: f.data.nome || "Personagem", text: "Seu personagem de Daggerheart está pronto:", url: w.querySelector("#evl").value }).catch(() => {})); }
  gerar();
}
export function change(k, el) {
  if (k === "modelo") { ed(pc => { pc.modelo = el.checked; }); return; }
  if (k === "transf") ed(pc => { pc.transf = el.value; });
  if (k === "mesa") moverParaMesa(ID, el.value).then(() => toast(el.value ? "Ficha vinculada à mesa" : "Ficha removida da mesa"));
  if (["mod", "scar", "atr", "expv"].includes(el.dataset.in)) app.render(true);
}
// campos numéricos atualizam os derivados ao sair do campo
document.addEventListener("focusout", e => { if (location.hash.startsWith("#/ficha/") && e.target.dataset && ["mod", "scar", "atr", "expv"].includes(e.target.dataset.in)) setTimeout(() => app.render(true), 0); });
