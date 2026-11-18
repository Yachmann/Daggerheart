// Painel de emergência do mestre: botão flutuante que abre uma lateral com hooks narrativos, nomes e hooks próprios.
import { esc, icon, toast, uid, store, norm } from "../util.js";
import { CATEGORIAS, todosHooks, sortearNome } from "../hooks.js";
import { GM, salvarGM } from "../gm.js";

const KEY = "dh-emerg";
const S2 = Object.assign({ aberto: false, aba: "sortear", cat: "todos", incUsados: false, q: "", lq: "", nomeTipo: "any" }, store.get(KEY, {}));
let atual = null, nomes = [], btn = null, painel = null;
const noMestre = () => /^#\/mestre/.test(location.hash);
const salva = () => store.set(KEY, { aberto: S2.aberto, aba: S2.aba, cat: S2.cat, incUsados: S2.incUsados, nomeTipo: S2.nomeTipo });
const usados = () => (GM.hooksUsados = GM.hooksUsados || {});
const custom = () => (GM.hooks = GM.hooks || []);
const pool = () => todosHooks(custom()).filter(h => (S2.cat === "todos" || h.cat === S2.cat) && (S2.incUsados || !usados()[h.id]));
const porId = id => todosHooks(custom()).find(h => h.id === id);

const ABAS = [["sortear", "Sortear"], ["lista", "Lista"], ["nomes", "Nomes"], ["meus", "Meus"]];

function cartao(h) {
  if (!h) return `<div class="em-vazio"><p>Toque em <b>Sortear</b> quando precisar de uma ideia agora.</p><p class="muted small">Dica: <kbd>Alt</kbd> + <kbd>H</kbd> abre e fecha este painel.</p></div>`;
  const u = usados()[h.id];
  return `<article class="hook-card${u ? " usado" : ""}"><div class="eyebrow">${esc(h.catNome)}${h.meu ? " · meu" : ""}${u ? " · já usado" : ""}</div><h3>${esc(h.t)}</h3><p>${esc(h.d)}</p>
    <div class="acts"><button class="btn sm hope" data-em="sortear">Outro</button><button class="btn sm" data-em="usei" data-id="${esc(h.id)}">${u ? "Desmarcar uso" : "Usei"}</button><button class="btn sm ghost" data-em="copiar" data-id="${esc(h.id)}">Copiar</button></div></article>`;
}

function corpo() {
  if (S2.aba === "sortear") {
    const n = pool().length, total = todosHooks(custom()).filter(h => S2.cat === "todos" || h.cat === S2.cat).length;
    return `<div class="scroll-x" style="margin:0 -14px 10px;padding:2px 14px 6px"><button class="chip${S2.cat === "todos" ? " on" : ""}" data-em="cat" data-v="todos">Todos</button>${CATEGORIAS.map(c => `<button class="chip${S2.cat === c.k ? " on" : ""}" data-em="cat" data-v="${c.k}" title="${esc(c.d)}">${esc(c.n)}</button>`).join("")}</div>
      <button class="btn hope block" data-em="sortear" style="min-height:54px;font-size:1.05rem">${icon("dice")} Sortear hook</button>
      <p class="muted small" style="margin:6px 0 10px">${n} de ${total} disponíveis${S2.cat !== "todos" ? " · " + esc(CATEGORIAS.find(c => c.k === S2.cat).d) : ""} <label class="em-inc"><input type="checkbox" data-em="inc" ${S2.incUsados ? "checked" : ""}> incluir usados</label></p>
      ${cartao(atual ? porId(atual) : null)}
      ${Object.keys(usados()).length ? `<button class="btn sm ghost" data-em="zerar" style="margin-top:8px">Zerar usados (${Object.keys(usados()).length})</button>` : ""}`;
  }
  if (S2.aba === "lista") {
    const q = norm(S2.lq);
    const l = todosHooks(custom()).filter(h => (S2.cat === "todos" || h.cat === S2.cat) && (!q || norm(h.t + " " + h.d).includes(q)));
    return `<div class="search"><span>${icon("search")}</span><input type="search" id="em-q" value="${esc(S2.lq)}" placeholder="Buscar hook…" autocomplete="off"></div>
      <label class="f" style="margin:8px 0"><select data-em-ch="cat"><option value="todos">Todas as categorias</option>${CATEGORIAS.map(c => `<option value="${c.k}"${S2.cat === c.k ? " selected" : ""}>${esc(c.n)}</option>`).join("")}</select></label>
      <div id="em-lista">${listaHtml(l)}</div>`;
  }
  if (S2.aba === "nomes") {
    return `<div class="chips" style="margin-bottom:10px">${[["any", "Qualquer"], ["a", "Femininos"], ["o", "Masculinos"]].map(([k, n]) => `<button class="chip${S2.nomeTipo === k ? " on" : ""}" data-em="ntipo" data-v="${k}">${n}</button>`).join("")}</div>
      <button class="btn hope block" data-em="nomes">${icon("dice")} Sortear nomes</button>
      <div style="margin-top:10px">${nomes.map(n => `<div class="inv-row"><div class="grow"><b>${esc(n)}</b></div><button class="btn sm ghost" data-em="cnome" data-v="${esc(n)}">Copiar</button></div>`).join("") || `<p class="muted small">Nomes de NPC para quando alguém pergunta “como ele se chama?”.</p>`}</div>`;
  }
  const meus = custom();
  return `<p class="muted small" style="margin-top:0">Escreva hooks da sua campanha. Eles entram no sorteio junto com os outros.</p>
    <label class="f">Categoria<select id="em-mc">${CATEGORIAS.map(c => `<option value="${c.k}">${esc(c.n)}</option>`).join("")}</select></label>
    <label class="f" style="margin-top:8px">Título<input type="text" id="em-mt" placeholder="Ex.: O ferreiro reconhece a espada"></label>
    <label class="f" style="margin-top:8px">Desenvolvimento<textarea id="em-md" style="min-height:80px" placeholder="O que acontece, o que revela, o que pede dos jogadores"></textarea></label>
    <div class="acts"><button class="btn hope" data-em="meuadd">Salvar hook</button></div>
    ${meus.length ? `<div class="eyebrow" style="margin:14px 0 4px">Meus hooks (${meus.length})</div>${meus.map(m => `<div class="inv-row"><div class="grow"><b>${esc(m.t)}</b><div class="muted small">${esc((CATEGORIAS.find(c => c.k === m.cat) || { n: "Meus" }).n)}</div></div><button class="btn sm ghost danger" data-em="meudel" data-id="${m.id}" aria-label="Excluir">${icon("trash")}</button></div>`).join("")}` : ""}`;
}
const listaHtml = l => l.slice(0, 120).map(h => `<button class="res${usados()[h.id] ? " usado" : ""}" data-em="abrir" data-id="${esc(h.id)}"><div class="k">${esc(h.catNome)}${h.meu ? " · meu" : ""}${usados()[h.id] ? " · usado" : ""}</div><div class="t">${esc(h.t)}</div></button>`).join("") || `<p class="muted small">Nada encontrado.</p>`;

function desenha() {
  if (!painel) return;
  painel.innerHTML = `<div class="em-head"><h3>${icon("bolt")} Emergência</h3><button class="icon-btn" data-em="fechar" aria-label="Fechar painel">${icon("x")}</button></div>
    <div class="em-tabs" role="tablist">${ABAS.map(([k, n]) => `<button role="tab" aria-selected="${S2.aba === k}" data-em="aba" data-v="${k}">${n}</button>`).join("")}</div>
    <div class="em-body">${corpo()}</div>`;
}

function aplica() {
  const mestre = noMestre();
  if (btn) btn.hidden = !mestre;
  if (painel) painel.hidden = !(mestre && S2.aberto);
  document.body.classList.toggle("em-open", mestre && S2.aberto);
}
export function atualizarPainel() { aplica(); }
function abrir(v) { S2.aberto = v; salva(); if (v) { desenha(); document.dispatchEvent(new CustomEvent("dh-painel-abriu", { detail: "em" })); } aplica(); }

function sortear() {
  let l = pool();
  if (!l.length) { toast(S2.cat === "todos" ? "Todos os hooks já foram usados. Zere os usados." : "Esta categoria acabou. Zere os usados ou escolha outra."); return; }
  if (l.length > 1 && atual) l = l.filter(h => h.id !== atual);
  atual = l[Math.floor(Math.random() * l.length)].id;
}

function clique(e) {
  const b = e.target.closest("[data-em]"); if (!b) return;
  const a = b.dataset.em, id = b.dataset.id, v = b.dataset.v;
  switch (a) {
    case "toggle": abrir(!S2.aberto); return;
    case "fechar": abrir(false); return;
    case "aba": S2.aba = v; salva(); break;
    case "cat": S2.cat = v; salva(); atual = null; break;
    case "inc": S2.incUsados = b.checked; salva(); break;
    case "sortear": S2.aba = "sortear"; sortear(); break;
    case "abrir": atual = id; S2.aba = "sortear"; salva(); break;
    case "usei": { const u = usados(); u[id] ? delete u[id] : (u[id] = true); salvarGM(); break; }
    case "zerar": GM.hooksUsados = {}; salvarGM(); toast("Usados zerados"); break;
    case "copiar": { const h = porId(id); if (h) navigator.clipboard.writeText(`${h.t}\n${h.d}`).then(() => toast("Hook copiado"), () => toast("O navegador bloqueou a cópia")); return; }
    case "ntipo": S2.nomeTipo = v; salva(); break;
    case "nomes": nomes = Array.from({ length: 5 }, () => sortearNome(S2.nomeTipo)); break;
    case "cnome": navigator.clipboard.writeText(v).then(() => toast("Nome copiado"), () => {}); return;
    case "meuadd": {
      const t = painel.querySelector("#em-mt").value.trim(), d = painel.querySelector("#em-md").value.trim();
      if (!t) { toast("Dê um título ao hook"); return; }
      custom().unshift({ id: "meu:" + uid(), cat: painel.querySelector("#em-mc").value, t, d }); salvarGM(); toast("Hook salvo"); break;
    }
    case "meudel": GM.hooks = custom().filter(m => m.id !== id); delete usados()[id]; salvarGM(); break;
    default: return;
  }
  desenha();
}

export function iniciarPainel() {
  if (btn) return;
  btn = document.createElement("button");
  btn.className = "em-btn"; btn.type = "button"; btn.hidden = true; btn.dataset.em = "toggle";
  btn.setAttribute("aria-label", "Abrir painel de emergência (Alt+H)");
  btn.innerHTML = `${icon("bolt")}<span>Emergência</span>`;
  painel = document.createElement("aside");
  painel.className = "em-panel"; painel.hidden = true; painel.setAttribute("aria-label", "Painel de emergência do mestre");
  document.body.append(btn, painel);
  btn.addEventListener("click", clique);
  painel.addEventListener("click", clique);
  painel.addEventListener("change", e => { const t = e.target; if (t.dataset.em === "inc") { S2.incUsados = t.checked; salva(); desenha(); } if (t.dataset.emCh === "cat") { S2.cat = t.value; salva(); desenha(); } });
  painel.addEventListener("input", e => { if (e.target.id === "em-q") { S2.lq = e.target.value; const q = norm(S2.lq); const l = todosHooks(custom()).filter(h => (S2.cat === "todos" || h.cat === S2.cat) && (!q || norm(h.t + " " + h.d).includes(q))); painel.querySelector("#em-lista").innerHTML = listaHtml(l); } });
  addEventListener("keydown", e => {
    if (!noMestre()) return;
    if (e.altKey && e.key.toLowerCase() === "h") { e.preventDefault(); abrir(!S2.aberto); }
    else if (e.key === "Escape" && S2.aberto && !document.querySelector(".sheet-wrap")) abrir(false);
  });
  addEventListener("hashchange", aplica);
  document.addEventListener("dh-painel-abriu", e => { if (e.detail !== "em" && innerWidth < 1400 && S2.aberto) abrir(false); });
  if (S2.aberto) desenha();
  aplica();
}
