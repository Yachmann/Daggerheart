// Componentes visuais compartilhados entre as telas
import { esc, md, mdBlock, icon, openSheet } from "../util.js";
import { get, loc, nome, domPT, domIcon, T, dmgPT, isExp, traitPT, cfg } from "../data.js";

export const corDom = d => `var(--d-${d || "Bone"})`;
export function coresClasse(id) {
  const c = get("classes", id);
  return c ? `--c1:${corDom(c.d[0])};--c2:${corDom(c.d[1])}` : "";
}
export const expTag = x => (isExp(x) ? `<span class="tag exp" title="Expansão Hope & Fear">H&F</span>` : "");
export const enName = o => (cfg().nomesEN && o && o.en && o.en !== o.n ? ` <span class="muted small">(${esc(o.en)})</span>` : "");

const TIPO = { Spell: "Magia", Ability: "Habilidade", Grimoire: "Grimório" };
export function dcard(c, { clip = false, sel = false, acts = "", inv = false, act = "carta" } = {}) {
  const o = loc("cards", c);
  if (!o) return "";
  return `<article class="dcard dom-${o.d}${clip ? " clip" : ""}${sel ? " sel" : ""}${inv ? " inv" : ""}">
    <div class="hd"><span class="di" aria-hidden="true">${domIcon(o.d)}</span><span class="nm">${esc(o.n)}${enName(o)}</span><span class="lv" title="Nível">${o.l}</span></div>
    <div class="sub">${esc(domPT(o.d))} · ${TIPO[o.t] || esc(o.t)} · <span class="recall" title="Custo de Recordação">↺ ${o.r}</span> ${expTag(o)}</div>
    <div class="tx">${mdBlock(o.x)}</div>
    ${acts || clip ? `<div class="foot">${clip ? `<button class="btn sm ghost" data-act="${act}" data-id="${esc(o.id)}">Ler carta</button>` : ""}${acts}</div>` : ""}
  </article>`;
}
export function verCarta(id) {
  const o = loc("cards", id);
  if (!o) return;
  openSheet(dcard(o), { title: o.n });
}

export const feat = (f, extra = "") => f ? `<div class="feat"><div class="feat-h"><b>${esc(f.n)}</b>${extra}</div><div class="tx">${mdBlock(f.t)}</div></div>` : "";

export function armaHtml(w, d, papel) {
  if (!w) return "";
  const o = loc("weapons", w);
  return `<div class="weap"><div><div class="eyebrow">${papel}</div><div class="nm">${esc(o.n)}${enName(o)} ${expTag(o)}</div></div>
    <div class="big" title="Rolagem de dano">${esc(dmgPT(d ? d.dano + " " + d.tipo : o.dmg))}</div>
    <div class="sm"><span class="kv"><span><b>${esc(traitPT(o.tr))}</b>${d && d.bonus != null ? " " + (d.bonus >= 0 ? "+" : "") + d.bonus : ""}</span><span>${esc(T(o.rng))}</span><span>${esc(T(o.bur))}</span><span>Patamar ${o.t}</span></span></div>
    ${o.f && o.f.length ? `<div class="sm">${o.f.map(f => `<b>${esc(f.n)}:</b> ${md(f.t)}`).join("<br>")}</div>` : ""}</div>`;
}
export function armaduraHtml(a) {
  if (!a) return `<p class="muted">Sem armadura. Seus limiares passam a ser o seu nível (Maior) e o dobro dele (Grave).</p>`;
  const o = loc("armor", a);
  return `<div class="weap"><div><div class="eyebrow">Armadura</div><div class="nm">${esc(o.n)}${enName(o)} ${expTag(o)}</div></div>
    <div class="big" title="Valor de Armadura">${esc(o.sc)}</div>
    <div class="sm"><span class="kv"><span>Limiares base <b>${esc(o.th)}</b></span><span>Patamar ${o.t}</span></span></div>
    ${o.f && o.f.length ? `<div class="sm">${o.f.map(f => `<b>${esc(f.n)}:</b> ${md(f.t)}`).join("<br>")}</div>` : ""}</div>`;
}

export const classeSub = pc => {
  const c = nome("classes", pc.classe), s = nome("subclasses", pc.subclasse);
  return [c, s].filter(Boolean).join(" · ");
};
export function origemTxt(pc) {
  const a = pc.anc || {};
  const anc = a.tipo === "mista" ? (a.nome || "Ancestralidade mista") : nome("ancestries", a.id);
  return [anc, nome("communities", pc.comunidade)].filter(Boolean).join(" · ");
}

export const voltar = (h, t = "Voltar") => `<a class="btn sm ghost" href="${h}">${icon("back")} ${esc(t)}</a>`;
export { icon };
