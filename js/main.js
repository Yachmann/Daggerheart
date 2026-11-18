// Inicialização, rotas e delegação de eventos
import { $, icon, esc, toast } from "./util.js";
import { loadData, cfg } from "./data.js";
import { S, iniciar, onChange, sb, user } from "./store.js";
import * as Fichas from "./views/fichas.js";
import * as Criar from "./views/criar.js";
import * as Ficha from "./views/ficha.js";
import * as Nivel from "./views/nivel.js";
import * as Regras from "./views/regras.js";
import * as Compendio from "./views/compendio.js";
import * as Mesas from "./views/mesas.js";
import * as Conta from "./views/conta.js";
import * as Mestre from "./views/mestre.js";
import * as Receber from "./views/receber.js";
import { iniciarPainel, atualizarPainel } from "./views/painel.js";
import { iniciarLembretes, atualizarLembretes } from "./views/lembretes.js";
import { loadGM } from "./gm.js";
import { abrirRolador } from "./views/rolador.js";

const NAV_BASE = [
  { h: "#/", n: "Fichas", i: "user", m: ["", "ficha", "nova"] },
  { h: "#/mestre", n: "Mestre", i: "crown", m: ["mestre"], mestre: true },
  { h: "#/regras", n: "Regras", i: "book", m: ["regras"] },
  { h: "#/compendio", n: "Compêndio", i: "cards", m: ["compendio"] },
  { h: "#/mesas", n: "Mesas", i: "users", m: ["mesas", "mesa"] },
  { h: "#/conta", n: "Conta", i: "gear", m: ["conta"] },
];

const mestreOn = () => cfg().mestre || /^#\/mestre/.test(location.hash) || S.mesas.some(m => user() && m.mestre === user().id);
const ROTAS = {
  mestre: Mestre,
  receber: Receber,
  "": Fichas, nova: Criar, ficha: Ficha, regras: Regras, compendio: Compendio, mesas: Mesas, mesa: Mesas, conta: Conta,
};

let atual = null, params = [], rota = "";
export const app = { rerender: () => render(), go: h => { if (location.hash === h) render(); else location.hash = h; } };

function parse() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const q = Object.fromEntries(new URLSearchParams(qs || ""));
  return { r: parts[0] || "", p: parts.slice(1), q };
}

function navHtml() {
  const r = rota;
  return NAV_BASE.filter(n => !n.mestre || mestreOn()).map(n => `<a href="${n.h}"${n.m.includes(r) ? ' aria-current="page"' : ""}>${icon(n.i)}<span>${n.n}</span></a>`).join("");
}

function syncHtml() {
  const s = S.status;
  const t = !sb ? "Neste aparelho" : !S.sess ? "Só neste aparelho" : s === "sync" ? "Salvando…" : s === "erro" ? (S.tabelaOk ? "Sem conexão: salvo aqui" : "Banco não configurado") : "Salvo na nuvem";
  const el = $("#sync");
  el.className = "sync " + (S.sess ? s : "local");
  el.innerHTML = `<span class="dot"></span><span>${esc(t)}</span>`;
}

function render(keepScroll = false) {
  const { r, p, q } = parse();
  const mod = ROTAS[r] || Fichas;
  // subrota de nível
  const view = r === "ficha" && p[1] === "nivel" ? Nivel : mod;
  const mudou = view !== atual || rota !== r || JSON.stringify(params) !== JSON.stringify(p);
  rota = r; params = p; atual = view;
  $("#topnav").innerHTML = navHtml();
  $("#botnav").innerHTML = navHtml();
  const main = $("#main");
  const y = scrollY;
  const act = document.activeElement;
  const keep = act && act.dataset && act.dataset.k && main.contains(act) ? { k: act.dataset.k, s: act.selectionStart, e: act.selectionEnd } : null;
  try {
    main.innerHTML = view.html(p, q);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="empty"><h3>Algo deu errado nesta tela</h3><p>${esc(e.message)}</p><a class="btn" href="#/">Voltar ao início</a></div>`;
  }
  if (view.mount) view.mount(main, p, q);
  if (mudou && !keepScroll) scrollTo(0, 0); else scrollTo(0, y);
  if (keep) {
    const n = main.querySelector(`[data-k="${CSS.escape(keep.k)}"]`);
    if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(keep.s, keep.e); } catch {} }
  }
  syncHtml();
  atualizarPainel();
  atualizarLembretes();
}
app.render = render;

// Delegação: data-act no clique; data-in em input; data-ch em change
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === "rolar") { abrirRolador(b.dataset); return; }
  const handler = (b.closest(".sheet-wrap") && b.closest(".sheet-wrap")._view) || atual;
  if (handler && handler.on) { const r = handler.on(a, b, e); if (r !== false && b.tagName === "A") return; }
});
document.addEventListener("input", e => { const el = e.target; if (el.dataset && el.dataset.in && atual && atual.input) atual.input(el.dataset.in, el, e); });
document.addEventListener("change", e => { const el = e.target; if (el.dataset && el.dataset.ch && atual && atual.change) atual.change(el.dataset.ch, el, e); });
addEventListener("hashchange", () => render());

onChange(motivo => {
  if (motivo === "status") { syncHtml(); return; }
  if (motivo === "recuperar-senha") { location.hash = "#/conta?senha=1"; return; }
  if (atual && atual.onData && atual.onData(motivo) === false) return;
  if (["fichas", "auth", "mesas"].includes(motivo) || (motivo.startsWith("ficha:") && atual && atual.ouve && atual.ouve(motivo))) {
    const el = document.activeElement;
    if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName) && $("#main").contains(el) && motivo.startsWith("ficha:")) return; // não atrapalhar quem digita
    render(true);
  }
});

// Se o servidor já tem uma versão mais nova do site do que a carregada neste navegador, recarrega uma vez.
async function verificarVersao() {
  if (location.protocol !== "https:") return;
  try {
    const t = await (await fetch(location.pathname + "?_v=" + Date.now(), { cache: "no-store" })).text();
    const m = t.match(/APP_VERSION\s*=\s*"(\d+)"/);
    if (m && m[1] !== String(window.APP_VERSION)) {
      if (!sessionStorage.getItem("dh-recarregou")) { sessionStorage.setItem("dh-recarregou", "1"); toast("Há uma versão nova do site: atualizando…"); setTimeout(() => location.reload(), 900); }
    } else sessionStorage.removeItem("dh-recarregou");
  } catch {}
}

async function boot() {
  const c = cfg();
  if (c.tema && c.tema !== "auto") document.documentElement.dataset.theme = c.tema;
  try { await Promise.all([loadData(), loadGM()]); }
  catch (e) { $("#main").innerHTML = `<div class="empty"><h3>Não foi possível carregar os dados</h3><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`; return; }
  iniciarPainel();
  iniciarLembretes();
  render();
  try { await iniciar(); } catch (e) { console.warn(e); toast("Não foi possível conectar ao servidor. Seguindo offline."); }
  render(true);
  verificarVersao();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
