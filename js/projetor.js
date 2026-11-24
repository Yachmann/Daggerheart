// Tela do projetor: mostra só o mapa, ajustado à tela, sem cabeçalho do site. Abre em outra janela (projetor.html?mapa=ID).
// Fase, grade, névoa de guerra e marcadores vêm do estado compartilhado com a aba Mapas (js/mapa-estado.js): o mestre controla de lá.
// Os controles daqui somem sozinhos após 3 s sem mexer o mouse. Atalhos: F tela cheia · G grade · ← → fase.
import { ler, gravar, ouvir, desenharNevoa, marcadoresHtml } from "./mapa-estado.js";

const $ = s => document.querySelector(s);
const q = new URLSearchParams(location.search);
let m = null, fase = null, timer = null;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const erro = t => { const e = $("#msg"); e.textContent = t; e.style.display = "flex"; $("#pal").style.display = "none"; };
const cheia = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const alternarCheia = () => {
  const d = document, el = d.documentElement;
  if (cheia()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) f.call(el).catch(() => {}); }
};
const faseAtual = () => m.fases.find(x => x.id === ler(m.id).fase) || m.fases[0];

function barra() {
  const f = faseAtual(), g = ler(m.id).grade;
  $("#bar").innerHTML =
    `<b>${esc(m.nome)}</b>` +
    (m.fases.length > 1 ? m.fases.map(x => `<button data-f="${esc(x.id)}" class="${x.id === f.id ? "on" : ""}">${esc(x.nome)}</button>`).join("") : "") +
    `<button data-g class="${g ? "on" : ""}" aria-pressed="${g}">Grade</button>` +
    `<button data-c>${cheia() ? "Sair da tela cheia" : "Tela cheia"}</button>` +
    `<small>F · G · ← →</small>`;
}

// Redesenha tudo a partir do estado compartilhado.
function aplicar() {
  const e = ler(m.id), f = faseAtual(), [c, l] = m.grade, img = $("#img");
  if (!img.getAttribute("src") || img.dataset.fase !== f.id) { img.dataset.fase = f.id; img.src = f.imagem; }
  img.alt = m.nome;
  document.body.classList.toggle("com-grade", !!e.grade);
  $("#gr").style.backgroundSize = `calc(100% / ${c}) calc(100% / ${l})`;
  desenharNevoa($("#nv"), e, c, l, 1);
  $("#mk").innerHTML = marcadoresHtml(e, c, l);
  document.title = m.nome + " · Projetor";
  barra();
}
function mudar(fn) { const e = ler(m.id); fn(e); gravar(m.id, e); aplicar(); }

function acordar() {
  document.body.classList.remove("quieto");
  clearTimeout(timer);
  timer = setTimeout(() => document.body.classList.add("quieto"), 3000);
}
function passo(d) {
  const i = m.fases.findIndex(x => x.id === faseAtual().id);
  const j = Math.min(m.fases.length - 1, Math.max(0, i + d));
  if (j !== i) mudar(e => { e.fase = m.fases[j].id; });
}

addEventListener("mousemove", acordar);
addEventListener("pointerdown", acordar);
addEventListener("keydown", e => {
  if (!m || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "f") alternarCheia();
  else if (k === "g") mudar(s => { s.grade = !s.grade; });
  else if (e.key === "ArrowRight" || e.key === "PageDown") passo(1);
  else if (e.key === "ArrowLeft" || e.key === "PageUp") passo(-1);
  else return;
  e.preventDefault(); acordar();
});
document.addEventListener("fullscreenchange", () => m && barra());
document.addEventListener("webkitfullscreenchange", () => m && barra());
addEventListener("dblclick", e => { if (!e.target.closest("#bar")) alternarCheia(); });
$("#bar").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.f) mudar(s => { s.fase = b.dataset.f; });
  else if ("g" in b.dataset) mudar(s => { s.grade = !s.grade; });
  else if ("c" in b.dataset) alternarCheia();
  acordar();
});
// Mudanças vindas da mesa do mestre
ouvir(id => { if (m && id === m.id) { aplicar(); acordar(); } });

const id = q.get("mapa");
if (!id) erro("Nenhum mapa escolhido. Abra pela aba Mestre → Mapas, no botão “Projetar”.");
else {
  fetch("mapas/index.json?_=" + Date.now(), { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then(j => {
      m = (j.mapas || []).find(x => x.id === id);
      if (!m) { erro("Mapa não encontrado: " + id); return; }
      if (q.get("fase") || q.get("grade") === "1") mudar(e => { if (q.get("fase")) e.fase = q.get("fase"); if (q.get("grade") === "1") e.grade = true; });
      else aplicar();
      acordar();
    })
    .catch(e => erro("Não consegui ler mapas/index.json (" + e.message + "). Abra o site por um servidor (não direto do arquivo)."));
}
