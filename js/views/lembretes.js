// Lembretes da batalha ou cena: lateral esquerda com o que o mestre não pode esquecer.
// Três tipos: "não pode esquecer" (o que precisa acontecer), "se acontecer…" (condições que mudam a luta) e "geral".
import { esc, icon, toast, store, mdBlock, confirmar } from "../util.js";
import { GM, achaBatalha, achaCena, salvarGM } from "../gm.js";
import { TIPOS_LEMBRETE, casaLembrete } from "../cena.js";
import { app } from "../main.js";

const KEY = "dh-lem";
let aberto = !!store.get(KEY, {}).aberto, btn = null, painel = null, editId = null, novo = false;
const salva = () => store.set(KEY, { aberto });
const rotulo = Object.fromEntries(TIPOS_LEMBRETE);

export const registroAtual = () => {
  const m = location.hash.match(/^#\/mestre\/(batalha|cena)\/([^/?]+)/);
  if (!m) return null;
  const id = decodeURIComponent(m[2]);
  return m[1] === "cena" ? achaCena(id) : achaBatalha(id);
};
const lista = r => (r.lembretes = r.lembretes || []);
const pendentes = r => lista(r).filter(l => !l.feito);

function nomesAdversarios(r) {
  const vistos = new Set(), out = [];
  r.unidades.forEach(u => { const n = u.ref || u.name; if (!vistos.has(n)) { vistos.add(n); out.push(n); } });
  return out;
}

function formulario(r, l) {
  const adv = nomesAdversarios(r);
  return `<div class="lem-form"><label class="f">Tipo<select id="lm-tipo">${TIPOS_LEMBRETE.map(([k, n]) => `<option value="${k}"${(l ? l.tipo : "obrigatorio") === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="f" style="margin-top:8px">Título<input type="text" id="lm-tit" value="${esc(l ? l.titulo : "")}" placeholder="Ex.: O capitão entrega a chave antes de cair"></label>
    <label class="f" style="margin-top:8px">O que lembrar<textarea id="lm-txt" style="min-height:80px" placeholder="Ex.: Se o grupo poupou o prisioneiro na sessão 2, ele hesita e tenta negociar.">${esc(l ? l.texto : "")}</textarea></label>
    <label class="f" style="margin-top:8px">Adversário (opcional)<select id="lm-adv"><option value="">Nenhum</option>${adv.map(n => `<option value="${esc(n)}"${l && l.adversario === n ? " selected" : ""}>${esc(n)}</option>`).join("")}${l && l.adversario && !adv.includes(l.adversario) ? `<option value="${esc(l.adversario)}" selected>${esc(l.adversario)}</option>` : ""}</select></label>
    <div class="acts"><button class="btn hope" data-lm="salvar" data-id="${l ? l.id : ""}">Salvar</button><button class="btn ghost" data-lm="cancelar">Cancelar</button></div></div>`;
}
function item(r, l) {
  if (editId === l.id) return formulario(r, l);
  return `<div class="lem-item ${esc(l.tipo)}${l.feito ? " feito" : ""}" id="lem-${l.id}">
    <label class="lem-check" title="Marcar como resolvido"><input type="checkbox" data-lm="feito" data-id="${l.id}" ${l.feito ? "checked" : ""} aria-label="Resolvido"></label>
    <div class="grow"><b>${esc(l.titulo)}</b>${l.adversario ? ` <span class="tag">${esc(l.adversario)}</span>` : ""}${l.texto ? `<div class="tx small">${mdBlock(l.texto)}</div>` : ""}</div>
    <div class="lem-acts"><button class="icon-btn" data-lm="editar" data-id="${l.id}" aria-label="Editar lembrete">${icon("edit")}</button><button class="icon-btn" data-lm="excluir" data-id="${l.id}" aria-label="Excluir lembrete">${icon("trash")}</button></div></div>`;
}

function desenha() {
  const r = registroAtual();
  if (!painel || !r) return;
  const l = lista(r);
  const grupos = TIPOS_LEMBRETE.map(([k, n]) => {
    const itens = l.filter(x => x.tipo === k).sort((a, b) => (a.feito ? 1 : 0) - (b.feito ? 1 : 0));
    return itens.length ? `<section class="lem-grupo ${k}"><div class="eyebrow">${esc(n)}</div>${itens.map(x => item(r, x)).join("")}</section>` : "";
  }).join("");
  painel.innerHTML = `<div class="em-head"><h3>${icon("info")} Não esquecer</h3><button class="icon-btn" data-lm="fechar" aria-label="Fechar lembretes">${icon("x")}</button></div>
    <div class="em-body">
      <p class="muted small" style="margin-top:0">${esc(r.nome)}</p>
      ${novo ? formulario(r, null) : `<button class="btn hope block" data-lm="novo">${icon("plus")} Novo lembrete</button>`}
      <div style="margin-top:12px">${grupos || `<div class="em-vazio"><p>Nada por aqui ainda.</p><p class="muted small">Anote o que muda esta luta: o que aconteceu antes, o que precisa acontecer para a história seguir, como um adversário age se algo ocorrer.</p></div>`}</div>
    </div>`;
}

function aplica() {
  const r = registroAtual();
  if (btn) {
    btn.hidden = !r;
    const n = r ? pendentes(r).length : 0, obrig = r ? pendentes(r).some(x => x.tipo === "obrigatorio") : false;
    btn.innerHTML = `${icon("info")}<span>Lembretes</span>${n ? `<i class="lm-count${obrig ? " obrig" : ""}">${n}</i>` : ""}`;
  }
  if (painel) painel.hidden = !(r && aberto);
  document.body.classList.toggle("lm-open", !!(r && aberto));
}
export function atualizarLembretes() { aplica(); if (aberto && registroAtual()) desenha(); }
function abrir(v) {
  aberto = v; salva();
  if (v) { desenha(); document.dispatchEvent(new CustomEvent("dh-painel-abriu", { detail: "lm" })); }
  aplica();
}

async function clique(e) {
  const b = e.target.closest("[data-lm]"); if (!b) return;
  const a = b.dataset.lm, id = b.dataset.id, r = registroAtual();
  if (a === "toggle") { abrir(!aberto); return; }
  if (a === "fechar") { abrir(false); return; }
  if (!r) return;
  const l = lista(r);
  switch (a) {
    case "abrir": { abrir(true); const el = painel.querySelector("#lem-" + CSS.escape(id)); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1400); } return; }
    case "novo": novo = true; editId = null; break;
    case "editar": editId = id; novo = false; break;
    case "cancelar": novo = false; editId = null; break;
    case "feito": { const x = l.find(y => y.id === id); if (x) { x.feito = b.checked; salvarGM(); app.render(true); } break; }
    case "excluir": {
      if (!(await confirmar("Excluir este lembrete?", { ok: "Excluir", perigo: true }))) return;
      r.lembretes = l.filter(x => x.id !== id); salvarGM(); app.render(true); break;
    }
    case "salvar": {
      const tit = painel.querySelector("#lm-tit").value.trim();
      if (!tit) { toast("Dê um título ao lembrete"); return; }
      const dados = { tipo: painel.querySelector("#lm-tipo").value, titulo: tit, texto: painel.querySelector("#lm-txt").value.trim(), adversario: painel.querySelector("#lm-adv").value };
      if (id) Object.assign(l.find(x => x.id === id) || {}, dados);
      else l.push({ id: "lm" + Math.random().toString(36).slice(2, 10), feito: false, ...dados });
      novo = false; editId = null; salvarGM(); app.render(true); toast("Lembrete salvo"); break;
    }
    default: return;
  }
  desenha(); aplica();
}

export function iniciarLembretes() {
  if (btn) return;
  btn = document.createElement("button");
  btn.className = "lm-btn"; btn.type = "button"; btn.hidden = true; btn.dataset.lm = "toggle";
  btn.setAttribute("aria-label", "Abrir lembretes da batalha");
  painel = document.createElement("aside");
  painel.className = "lm-panel"; painel.hidden = true; painel.setAttribute("aria-label", "Lembretes: o que não esquecer");
  document.body.append(btn, painel);
  document.addEventListener("click", clique);
  addEventListener("hashchange", () => { novo = false; editId = null; atualizarLembretes(); });
  document.addEventListener("dh-painel-abriu", e => { if (e.detail !== "lm" && innerWidth < 1400 && aberto) abrir(false); });
  document.addEventListener("dh-lem", e => { if (e.detail === "abrir" && registroAtual() && pendentes(registroAtual()).length) abrir(true); });
  addEventListener("keydown", e => {
    if (!registroAtual()) return;
    if (e.altKey && e.key.toLowerCase() === "l") { e.preventDefault(); abrir(!aberto); }
    else if (e.key === "Escape" && aberto && !document.querySelector(".sheet-wrap") && !document.activeElement.closest(".lm-panel")) abrir(false);
  });
  aplica(); if (aberto && registroAtual()) desenha();
}
