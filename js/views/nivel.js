// Subir de nível: conquistas do patamar, dois avanços, carta de domínio e troca opcional
import { esc, icon, uid, toast } from "../util.js";
import { get, loc, list, nome, domPT, TRAITS, traitPT, matches as match } from "../data.js";
import { deriv, tierOf, OPT, OPTM, TCAP, usados, marcados, podeEscolher, conquista, cartasElegiveis } from "../calc.js";
import { ficha, editar, S, user } from "../store.js";
import { app } from "../main.js";
import { dcard, voltar, verCarta } from "./common.js";

let ID = null, R = null;
const F = () => ficha(ID);

function novoRasc() { return { pc: ID, picks: [], card: "", out: "", in: "", novaExp: "", q: {} }; }
function ctx() {
  const pc = F().data, nv = pc.nivel + 1, nt = tierOf(nv);
  const custo = R.picks.reduce((s, p) => s + OPTM[p.o].c, 0);
  const mcp = R.picks.find(p => p.o === "mc");
  const mcDom = pc.mc ? pc.mc.dom : (mcp && mcp.mc.dom) || null;
  return { pc, nv, nt, custo, mcDom };
}
const naMao = (c) => [R.card, R.in, ...R.picks.filter(p => p.o === "dc").map(p => p.card)].filter(x => x && x !== c);

function erros() {
  const x = ctx(), e = [];
  if (x.custo < 2) e.push(`Escolha mais ${2 - x.custo} avanço${2 - x.custo > 1 ? "s" : ""}.`);
  R.picks.forEach(p => {
    if (p.o === "tr" && p.traits.length !== 2) e.push("Escolha dois atributos no avanço de atributos.");
    if (p.o === "xp" && p.exps.length !== Math.min(2, x.pc.exp.filter(e => e.n).length)) e.push("Escolha as duas Experiências que recebem +1.");
    if (p.o === "dc" && !p.card) e.push("Escolha a carta do avanço de carta adicional.");
    if (p.o === "mc" && !(p.mc.cls && p.mc.dom && p.mc.sub)) e.push("Complete classe, domínio e subclasse da multiclasse.");
  });
  if (!R.card) e.push("Escolha a carta de domínio deste nível.");
  if (R.out && !R.in) e.push("Escolha a carta que entra na troca, ou desfaça a troca.");
  if (conquista(x.nv) && !R.novaExp.trim()) e.push("Dê um nome para a nova Experiência.");
  return e;
}

function picker(ctxk, l, sel) {
  const q = R.q[ctxk] || "";
  const fl = l.filter(c => match(loc("cards", c), q)).sort((a, b) => b.l - a.l || a.d.localeCompare(b.d));
  return `<div class="search" style="margin:8px 0"><span>${icon("search")}</span><input type="search" data-in="pkq" data-ctx="${ctxk}" data-k="pk-${ctxk}" value="${esc(q)}" placeholder="Buscar carta…"></div>
  <div class="dcards">${fl.slice(0, 40).map(c => dcard(c, { clip: true, sel: sel === c.id, acts: `<button class="btn sm ${sel === c.id ? "hope" : ""}" data-act="pk" data-ctx="${ctxk}" data-id="${esc(c.id)}">${sel === c.id ? "✓ Escolhida" : "Escolher"}</button>` })).join("") || `<p class="muted">Nenhuma carta disponível.</p>`}</div>`;
}

export function html(p) {
  ID = p[0];
  const f = F();
  if (!f) return `<div class="empty"><h3>Ficha não encontrada</h3><a class="btn" href="#/">Voltar</a></div>`;
  if (user() && f.dono && f.dono !== user().id && !S.mesas.some(m => m.id === f.mesa_id && m.mestre === user().id)) return `<div class="empty"><h3>Somente o dono da ficha pode subir de nível.</h3><a class="btn" href="#/ficha/${ID}">Voltar</a></div>`;
  if (!R || R.pc !== ID) R = novoRasc();
  const x = ctx(), pc = x.pc, cl = get("classes", pc.classe);
  if (pc.nivel >= 10) return `<div class="empty"><h3>Nível máximo</h3><a class="btn" href="#/ficha/${ID}">Voltar</a></div>`;
  const mk = marcados(pc, x.nv);
  const ach = conquista(x.nv);
  const picks = R.picks.map(p => {
    const op = OPTM[p.o]; let body = "";
    if (p.o === "tr") {
      const outros = new Set(R.picks.filter(q => q.o === "tr" && q !== p).flatMap(q => q.traits));
      body = `<div class="chips">${TRAITS.map(t => { const on = p.traits.includes(t.k), dis = mk.has(t.k) || outros.has(t.k) || (!on && p.traits.length >= 2); return `<button class="chip${on ? " on" : ""}" data-act="trp" data-p="${p.id}" data-t="${t.k}" ${dis && !on ? "disabled" : ""}>${esc(traitPT(t.en))}${mk.has(t.k) ? " (marcado)" : ""}</button>`; }).join("")}</div>`;
    }
    if (p.o === "xp") body = `<div class="chips">${pc.exp.map((e, i) => e.n ? `<button class="chip${p.exps.includes(i) ? " on" : ""}" data-act="xpp" data-p="${p.id}" data-i="${i}" ${!p.exps.includes(i) && p.exps.length >= 2 ? "disabled" : ""}>${esc(e.n)} +${e.v}</button>` : "").join("")}</div>`;
    if (p.o === "dc") { const cap = Math.min(x.nv, TCAP[p.tier]); const el = cartasElegiveis(pc, { maxL: cap, novoNivel: x.nv, mcDom: x.mcDom, exclui: naMao(p.card), lista: list("cards") }); body = `<p class="muted small">Até o nível ${cap}.</p>${picker("dc:" + p.id, el, p.card)}`; }
    if (p.o === "mc") {
      const mcl = get("classes", p.mc.cls);
      const opc = (arr, sel, lab) => arr.map(a => `<option value="${esc(a)}"${a === sel ? " selected" : ""}>${esc(lab(a))}</option>`).join("");
      body = `<div class="grid3"><label class="f">Classe<select data-ch="mc" data-p="${p.id}" data-f="cls"><option value="">Escolha</option>${opc(list("classes").filter(c => c.id !== pc.classe).map(c => c.id), p.mc.cls, c => nome("classes", c))}</select></label>
        <label class="f">Domínio<select data-ch="mc" data-p="${p.id}" data-f="dom" ${mcl ? "" : "disabled"}><option value="">Escolha</option>${opc(mcl ? mcl.d : [], p.mc.dom, domPT)}</select></label>
        <label class="f">Subclasse (Fundação)<select data-ch="mc" data-p="${p.id}" data-f="sub" ${mcl ? "" : "disabled"}><option value="">Escolha</option>${opc(mcl ? mcl.subs : [], p.mc.sub, s => nome("subclasses", s))}</select></label></div>
        <p class="muted small">Você ganha a habilidade de classe e a Fundação da subclasse escolhida. Cartas do novo domínio vão até metade do seu nível (arredondado para cima).</p>`;
    }
    if (p.o === "sc") { const s = loc("subclasses", pc.subclasse); const nx = (pc.scNivel || 0) + R.picks.filter(q => q.o === "sc").indexOf(p); body = `<p class="muted">Você recebe a ${nx === 0 ? "Especialização" : "Maestria"} de ${esc(s ? s.n : "")}: ${esc((nx === 0 ? s.s : s.m).map(f => f.n).join(", "))}.</p>`; }
    return `<div class="card" style="margin-top:10px"><div style="display:flex;gap:8px;align-items:center"><b style="flex:1">${op.n}</b><span class="tag">Patamar ${p.tier}</span><button class="btn sm ghost danger" data-act="unpick" data-p="${p.id}">Desfazer</button></div>${body ? `<div style="margin-top:8px">${body}</div>` : ""}</div>`;
  }).join("");
  let opts = "";
  if (x.custo < 2) for (let t = 2; t <= x.nt; t++) {
    opts += `<div class="eyebrow" style="margin:14px 0 6px">Patamar ${t} (níveis ${t === 2 ? "2 a 4" : t === 3 ? "5 a 7" : "8 a 10"})</div><div class="opts" style="grid-template-columns:1fr">${OPT.filter(o => t >= o.f).map(o => {
      const r = podeEscolher(pc, R, o.k, t), left = o.s - usados(pc, o.k, t) - R.picks.filter(p => p.o === o.k && p.tier === t).length;
      return `<div class="inv-row" style="opacity:${r === "ok" ? 1 : .55}"><div class="grow"><b>${o.n}</b><div class="muted small">${r === "ok" ? `${Math.max(0, left)} de ${o.s} livre${o.s > 1 ? "s" : ""}` : esc(r)}</div></div><button class="btn sm" data-act="dopick" data-o="${o.k}" data-t="${t}" ${r === "ok" ? "" : "disabled"}>Escolher</button></div>`;
    }).join("")}</div>`;
  }
  const main = cartasElegiveis(pc, { maxL: x.nv, novoNivel: x.nv, mcDom: x.mcDom, exclui: naMao(R.card), lista: list("cards") });
  const todas = [...pc.cartas.mao, ...pc.cartas.cofre];
  const outC = R.out && get("cards", R.out);
  const sw = outC ? cartasElegiveis(pc, { maxL: outC.l, novoNivel: x.nv, mcDom: x.mcDom, exclui: naMao(R.in), lista: list("cards") }) : null;
  const errs = erros();
  return `<div style="margin-bottom:10px">${voltar("#/ficha/" + encodeURIComponent(ID), pc.nome)}</div>
  <div class="page-h"><h1>Nível ${pc.nivel} → ${x.nv}</h1><div class="sub">Patamar ${x.nt} · ${esc(nome("classes", cl))} · domínios ${cl.d.map(domPT).join(" e ")}${pc.mc ? " e " + domPT(pc.mc.dom) : ""}</div></div>
  <section class="card"><h3>1. Conquistas e limiares</h3>
    ${ach ? `<div class="note" style="margin:8px 0">${ach}</div><label class="f">Nova Experiência (+2)<input type="text" data-in="novaexp" data-k="novaexp" value="${esc(R.novaExp)}" placeholder="Ex.: Herói da Batalha de Haven"></label>` : ""}
    <p class="muted small" style="margin:8px 0 0">Seus limiares de dano sobem 1 automaticamente (o app soma o nível).</p></section>
  <section class="card"><h3>2. Avanços <span class="tag">${x.custo}/2</span></h3><p class="muted small">Escolha dois avanços do seu patamar ou de patamares anteriores.</p>${picks}${opts}</section>
  <section class="card"><h3>3. Carta de domínio</h3><p class="muted small">Uma carta de nível ${x.nv} ou menor dos seus domínios${x.mcDom ? `; de ${domPT(x.mcDom)}, até o nível ${Math.ceil(x.nv / 2)}` : ""}.</p>${picker("main", main, R.card)}</section>
  <section class="card"><h3>4. Trocar uma carta (opcional)</h3><p class="muted small">Troque uma carta que você tem por outra de nível igual ou menor.</p>
    <label class="f">Carta que sai<select data-ch="swout"><option value="">Sem troca</option>${todas.map(n => { const c = get("cards", n); return `<option value="${esc(n)}"${n === R.out ? " selected" : ""}>${esc(nome("cards", n))}${c ? " (nível " + c.l + ")" : ""}</option>`; }).join("")}</select></label>
    ${sw ? picker("swap", sw, R.in) : ""}</section>
  ${errs.length ? `<div class="err" style="margin-top:12px">${errs.map(esc).join("<br>")}</div>` : ""}
  <div class="wiz-foot"><a class="btn" href="#/ficha/${encodeURIComponent(ID)}">Cancelar</a><button class="btn hope" data-act="confirmar" ${errs.length ? "disabled" : ""}>${icon("up")} Confirmar nível ${x.nv}</button></div>`;
}

const pk = id => R.picks.find(p => p.id === id);
export function on(a, el) {
  if (!R) return;
  const pid = el.dataset.p;
  switch (a) {
    case "dopick": R.picks.push({ id: uid(), o: el.dataset.o, tier: +el.dataset.t, traits: [], exps: [], card: "", mc: { cls: "", dom: "", sub: "" } }); break;
    case "unpick": R.picks = R.picks.filter(p => p.id !== pid); break;
    case "trp": { const p = pk(pid), t = el.dataset.t, i = p.traits.indexOf(t); i >= 0 ? p.traits.splice(i, 1) : p.traits.length < 2 && p.traits.push(t); break; }
    case "xpp": { const p = pk(pid), i = +el.dataset.i, k = p.exps.indexOf(i); k >= 0 ? p.exps.splice(k, 1) : p.exps.length < 2 && p.exps.push(i); break; }
    case "pk": {
      const c = el.dataset.ctx, id = el.dataset.id;
      if (c === "main") R.card = R.card === id ? "" : id;
      else if (c === "swap") R.in = R.in === id ? "" : id;
      else { const p = pk(c.slice(3)); if (p) p.card = p.card === id ? "" : id; }
      break;
    }
    case "carta": verCarta(el.dataset.id); return;
    case "confirmar": confirmar(); return;
    default: return;
  }
  app.render(true);
}
export function input(k, el) {
  if (k === "novaexp") { R.novaExp = el.value; atualizaBotao(); return; }
  if (k === "pkq") { R.q[el.dataset.ctx] = el.value; app.render(true); }
}
function atualizaBotao() {
  const e = erros(), b = document.querySelector('[data-act="confirmar"]'), box = document.querySelector("main .err");
  if (b) b.disabled = e.length > 0;
  if (box) { box.innerHTML = e.map(esc).join("<br>"); box.style.display = e.length ? "" : "none"; }
}
export function change(k, el) {
  if (k === "mc") { const p = pk(el.dataset.p); p.mc[el.dataset.f] = el.value; if (el.dataset.f === "cls") { p.mc.dom = ""; p.mc.sub = ""; } }
  if (k === "swout") { R.out = el.value; R.in = ""; }
  app.render(true);
}

function confirmar() {
  if (erros().length) return;
  const x = ctx();
  editar(ID, pc => {
    const e = { from: pc.nivel, to: x.nv, picks: R.picks.map(p => ({ o: p.o, tier: p.tier, traits: p.traits.slice(), exps: p.exps.slice(), card: p.card, mc: p.o === "mc" ? { ...p.mc } : undefined })), added: [] };
    const add = c => { if (pc.cartas.mao.length < 5) pc.cartas.mao.push(c); else pc.cartas.cofre.push(c); e.added.push(c); };
    if (conquista(x.nv)) { pc.exp.push({ n: R.novaExp.trim(), v: 2 }); e.novaExp = { idx: pc.exp.length - 1 }; }
    R.picks.forEach(p => {
      if (p.o === "xp") p.exps.forEach(i => { if (pc.exp[i]) pc.exp[i].v++; });
      if (p.o === "sc") pc.scNivel = (pc.scNivel || 0) + 1;
      if (p.o === "mc") pc.mc = { ...p.mc };
      if (p.o === "dc" && p.card) add(p.card);
    });
    add(R.card);
    if (R.out && R.in) {
      const onde = pc.cartas.mao.includes(R.out) ? "mao" : "cofre";
      const arr = pc.cartas[onde]; arr[arr.indexOf(R.out)] = R.in;
      e.swap = { out: R.out, in: R.in, onde };
    }
    pc.nivel = x.nv;
    pc.log = pc.log || []; pc.log.push(e);
  }, { imediato: true });
  R = null;
  toast(`Parabéns! Nível ${x.nv}`);
  location.hash = "#/ficha/" + encodeURIComponent(ID);
}
