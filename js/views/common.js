// Componentes visuais compartilhados entre as telas
import { esc, md, mdBlock, icon, openSheet } from "../util.js";
import { emblema } from "../emblemas.js";
import { get, loc, nome, domPT, domIcon, T, dmgPT, isExp, traitPT, cfg } from "../data.js";

export const corDom = d => `var(--d-${d || "Bone"})`;
export function coresClasse(id) {
  const c = get("classes", id);
  return c ? `--c1:${corDom(c.d[0])};--c2:${corDom(c.d[1])}` : "";
}
// Tema visual da ficha por classe (cores, formas e ornamento no CSS: "Temas de ficha por classe").
// Pode ser desligado em Conta → Aparência.
// Todas recebem o personagem (pc). Multiclasse (pc.mc) dá o segundo tom; pc.cor (Ajustes) troca a cor principal.
const temaOn = pc => !!(pc && pc.classe) && cfg().temaClasse !== false;
const HEX = /^#[0-9a-f]{6}$/i;
export const temaAttr = pc => (temaOn(pc) ? ` data-classe="${esc(pc.classe)}"${pc.mc && pc.mc.cls ? ` data-mc="${esc(pc.mc.cls)}"` : ""}` : "");
export const temaVars = pc => (temaOn(pc) && HEX.test(pc.cor || "") ? `--k1:${pc.cor};` : "");
export const temaEmblema = pc => (temaOn(pc) ? emblema(pc.classe) + (pc.mc && pc.mc.cls ? emblema(pc.mc.cls).replace('class="emblema"', 'class="emblema mc"') : "") : "");
export const temaIcone = pc => (temaOn(pc) ? `<span class="cl-ico"${temaAttr(pc)}>${emblema(pc.classe)}</span>` : "");
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

// ---------- Destaque visual por condição ----------
export const COND_COR = { "Vulnerável": "var(--blood)", "Contido": "var(--hope)", "Oculto": "var(--fear)", "Encoberto": "var(--fear)" };
export const COND_CLS = { "Vulnerável": "vuln", "Contido": "restr", "Oculto": "hide" };
const COND_REGRA = { "Vulnerável": "testes contra {x} têm vantagem", "Contido": "{x} não pode se mover, mas pode agir", "Oculto": "ataques contra {x} têm desvantagem",
  "Encoberto": "como Oculto, e {x} não é visto se ficar parado; termina após um ataque ou ao terminar um movimento à vista de um adversário",
  "Em Chamas": "{x} deve rolar um d4 sempre que fizer uma rolagem de ação",
  "Aflito": "{x} não pode limpar Pontos de Vida (PV) nem Estresse",
  "Adormecido": "permanece dormindo até sofrer dano",
  "Sintonizado": "{x} tem Vantagem em rolagens de Conjuração dentro do ambiente sintonizado",
  "Enfeitiçado": "{x} vê a fonte da condição como aliada e não pode atacá-la",
  "Marcado a Ferro": "a fonte da condição sempre sabe em qual direção {x} está",
  "Quebrado": "{x} não pode usar ações nem reações até limpar a condição",
  "Coberto de Aranhas": "{x} deve rolar um d6 sempre que fizer uma rolagem de ação",
  "Cristalizando": "ativa uma contagem regressiva de Cristal (1) ao receber a condição",
  "Amaldiçoado": "as rolagens de {x} com Esperança passam a contar como rolagens com Medo",
  "Atordoado": "{x} não pode usar uma de suas ações, mas ganha imunidade a dano mágico",
  "Preso à Morte": "a fonte da condição causa dano direto ao atacar {x}",
  "Transe Profundo": "{x} não pode agir, exceto para tentar acordar",
  "Destruído": "{x} não pode mais usar nenhuma de suas características" };
// Uma condição: a ficha ganha essa cor. Duas ou mais: borda e brilho em degradê com as duas primeiras cores.
export function condFx(conds) {
  const cs = [...new Set((conds || []).map(c => COND_COR[c] || "var(--steel)"))];
  if (!cs.length) return { cls: "", style: "" };
  return { cls: " condfx", style: `--k1:${cs[0]};--k2:${cs[1] || cs[0]};` };
}
// Faixa com as condições ativas e o que cada uma significa. quem: "você" (jogador) ou "o adversário".
export function condBanner(conds, quem = "você") {
  if (!conds || !conds.length) return "";
  const sujeito = quem === "você" ? "você" : "ele";
  return `<div class="cond-banner">${conds.map(c => `<span class="cb-item" style="--k:${COND_COR[c] || "var(--steel)"}"><b>${esc(c)}</b>${COND_REGRA[c] ? ` <span>${COND_REGRA[c].replace("{x}", sujeito)}</span>` : ""}</span>`).join("")}</div>`;
}
