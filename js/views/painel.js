// Painel de emergência do mestre: botão flutuante que abre uma lateral com sorteio rápido de nomes (femininos e masculinos),
// nomes de lugar e descrição de lugar. Um toque sorteia; tocar num resultado copia.
import { esc, icon, toast, store } from "../util.js";
import { sortearNomes, sortearLugares, sortearDescricao, TIPOS_LUGAR, TIPOS_DESC } from "../nomes.js";

const KEY = "dh-emerg";
const S2 = Object.assign({ aberto: false, modo: "f", sobrenome: true, tLugar: "qualquer", tDesc: "qualquer" }, store.get(KEY, {}));
let res = [], btn = null, painel = null;
const noMestre = () => /^#\/mestre/.test(location.hash);
const salva = () => store.set(KEY, { aberto: S2.aberto, modo: S2.modo, sobrenome: S2.sobrenome, tLugar: S2.tLugar, tDesc: S2.tDesc });

const MODOS = [["f", "Feminino", "Nomes femininos"], ["m", "Masculino", "Nomes masculinos"], ["lugar", "Lugar", "Nomes de lugar"], ["desc", "Descrição", "Descrição de lugar"]];
if (!MODOS.some(m => m[0] === S2.modo)) S2.modo = "f";

function gera() {
  res = S2.modo === "desc" ? [sortearDescricao(S2.tDesc)] : S2.modo === "lugar" ? sortearLugares(S2.tLugar, 6) : sortearNomes(S2.modo, 8, S2.sobrenome);
}

const chips = (lista, atual, acao) => `<div class="scroll-x" style="margin:0 -14px 12px;padding:2px 14px 6px">${lista.map(([k, n]) => `<button class="chip${atual === k ? " on" : ""}" data-em="${acao}" data-v="${k}" aria-pressed="${atual === k}">${esc(n)}</button>`).join("")}</div>`;

function corpo() {
  const m = S2.modo;
  const opcoes = m === "lugar" ? chips(TIPOS_LUGAR, S2.tLugar, "tlugar")
    : m === "desc" ? chips(TIPOS_DESC, S2.tDesc, "tdesc")
    : `<div class="chips" style="margin-bottom:12px"><button class="chip${S2.sobrenome ? " on" : ""}" data-em="sobrenome" aria-pressed="${S2.sobrenome}">Com sobrenome</button></div>`;
  const lista = m === "desc"
    ? res.map((r, i) => `<article class="hook-card"><div class="eyebrow">${esc(r.t || "Lugar")}</div><p>${esc(r.n)}</p><div class="acts"><button class="btn sm" data-em="copiar" data-i="${i}">Copiar</button></div></article>`).join("")
    : res.map((r, i) => `<button class="res" data-em="copiar" data-i="${i}">${r.t ? `<div class="k">${esc(r.t)}</div>` : ""}<div class="t">${esc(r.n)}</div></button>`).join("");
  return `${opcoes}
    <button class="btn hope block" data-em="sortear" style="min-height:54px;font-size:1.05rem">${icon("dice")} Sortear</button>
    <div style="margin-top:6px">${lista}</div>
    <p class="muted small" style="margin:12px 0 0">${m === "desc" ? "" : "Toque num resultado para copiar. "}<kbd>Alt</kbd> + <kbd>H</kbd> abre e fecha este painel.</p>`;
}

function desenha() {
  if (!painel) return;
  painel.innerHTML = `<div class="em-head"><h3>${icon("bolt")} Sorteio rápido</h3><button class="icon-btn" data-em="fechar" aria-label="Fechar painel">${icon("x")}</button></div>
    <div class="em-tabs" role="tablist">${MODOS.map(([k, n, t]) => `<button role="tab" aria-selected="${S2.modo === k}" aria-label="${t}" title="${t}" data-em="modo" data-v="${k}">${n}</button>`).join("")}</div>
    <div class="em-body">${corpo()}</div>`;
}

function aplica() {
  const mestre = noMestre();
  if (btn) btn.hidden = !mestre;
  if (painel) painel.hidden = !(mestre && S2.aberto);
  document.body.classList.toggle("em-open", mestre && S2.aberto);
}
export function atualizarPainel() { aplica(); }
function abrir(v) {
  S2.aberto = v; salva();
  if (v) { if (!res.length) gera(); desenha(); document.dispatchEvent(new CustomEvent("dh-painel-abriu", { detail: "em" })); }
  aplica();
}

function clique(e) {
  const b = e.target.closest("[data-em]"); if (!b) return;
  const a = b.dataset.em, v = b.dataset.v;
  switch (a) {
    case "toggle": abrir(!S2.aberto); return;
    case "fechar": abrir(false); return;
    case "modo": S2.modo = v; salva(); gera(); break;
    case "sobrenome": S2.sobrenome = !S2.sobrenome; salva(); gera(); break;
    case "tlugar": S2.tLugar = v; salva(); gera(); break;
    case "tdesc": S2.tDesc = v; salva(); gera(); break;
    case "sortear": gera(); break;
    case "copiar": { const r = res[+b.dataset.i]; if (r) navigator.clipboard.writeText(r.n).then(() => toast("Copiado"), () => toast("O navegador bloqueou a cópia")); return; }
    default: return;
  }
  desenha();
}

export function iniciarPainel() {
  if (btn) return;
  btn = document.createElement("button");
  btn.className = "em-btn"; btn.type = "button"; btn.hidden = true; btn.dataset.em = "toggle";
  btn.setAttribute("aria-label", "Abrir sorteio rápido (Alt+H)");
  btn.innerHTML = `${icon("bolt")}<span>Emergência</span>`;
  painel = document.createElement("aside");
  painel.className = "em-panel"; painel.hidden = true; painel.setAttribute("aria-label", "Sorteio rápido de nomes e lugares");
  document.body.append(btn, painel);
  btn.addEventListener("click", clique);
  painel.addEventListener("click", clique);
  addEventListener("keydown", e => {
    if (!noMestre()) return;
    if (e.altKey && e.key.toLowerCase() === "h") { e.preventDefault(); abrir(!S2.aberto); }
    else if (e.key === "Escape" && S2.aberto && !document.querySelector(".sheet-wrap")) abrir(false);
  });
  addEventListener("hashchange", aplica);
  document.addEventListener("dh-painel-abriu", e => { if (e.detail !== "em" && innerWidth < 1400 && S2.aberto) abrir(false); });
  if (S2.aberto) { gera(); desenha(); }
  aplica();
}
