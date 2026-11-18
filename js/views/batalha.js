// Execução da batalha: tudo preparado, o mestre só conduz. Dados privados do mestre.
import { esc, md, mdBlock, icon, uid, toast, confirmar, openSheet, closeSheet, clamp, $ } from "../util.js";
import { T, dmgPT, nome } from "../data.js";
import { GM, achaBatalha, salvarGM, adicionar, adversarios, orcamento, pvPorDano, CONDICOES, AMBIENTE_ACOES, sortear, TIPO_PT, novaUnidade, KIND_PT } from "../gm.js";
import { S, user, fichasDaMesa } from "../store.js";
import { deriv } from "../calc.js";
import { app } from "../main.js";
import { statBlock, envBlock, pipsU, tipoTag, kindTag, escolherBatalha, barraOrc, fonteTag } from "./mestre-ui.js";
import { voltar } from "./common.js";
import { unidadeOn, unidadeInput, painelUnidades } from "./unidades.js";

let ID = null, painel = { prep: false, grupo: true, ambiente: false, notas: false };
export const ouve = m => m.startsWith("ficha:");
const B = () => achaBatalha(ID);
const U = id => B().unidades.find(u => u.id === id);
const ed = fn => { fn(B()); salvarGM(); app.render(true); };
const edQuiet = fn => { fn(B()); salvarGM(); };

const CONDCLS = { Vulnerável: "vuln", Contido: "restr", Oculto: "hide" };
const STATUS = { prep: ["Em preparação", ""], ativa: ["Em andamento", "hope"], fim: ["Encerrada", "muted"] };

function painelGrupo(b) {
  const mesa = b.mesa && S.mesas.find(m => m.id === b.mesa);
  if (!mesa) return `<p class="muted small" style="margin:0">Vincule uma mesa em “Preparação” para ver as fichas dos jogadores aqui, ao vivo.</p>`;
  const f = fichasDaMesa(mesa.id);
  if (!f.length) return `<p class="muted small" style="margin:0">Nenhuma ficha vinculada à mesa “${esc(mesa.nome)}”.</p>`;
  return f.map(x => {
    const pc = x.data, d = deriv(pc), pv = d.pvMax - pc.st.pv;
    return `<a class="grp-row" href="#/ficha/${encodeURIComponent(x.id)}"><div class="grow"><b>${esc(pc.nome || "Sem nome")}</b><div class="muted small">${esc(nome("classes", pc.classe))} · nível ${pc.nivel}</div></div>
      <div class="grp-n"><b style="color:var(--blood)">${pv}/${d.pvMax}</b><span>PV</span></div><div class="grp-n"><b style="color:var(--fear)">${pc.st.es}/${d.esMax}</b><span>Est.</span></div><div class="grp-n"><b style="color:var(--hope)">${pc.st.esp}/${d.espMax}</b><span>Esp.</span></div><div class="grp-n"><b>${d.ev}</b><span>Eva.</span></div><div class="grp-n"><b>${d.lim[0]}/${d.lim[1]}</b><span>Lim.</span></div></a>
      ${pc.st.cond.length ? `<div class="chips" style="margin:-4px 0 8px">${pc.st.cond.map(c => `<span class="tag">${esc(c)}</span>`).join("")}</div>` : ""}`;
  }).join("");
}

function painelAmbiente(b) {
  const e = b.ambiente;
  return `<div class="env-acts">${AMBIENTE_ACOES.map((x, i) => `<div class="env-a"><div class="grow"><b>${x.n}</b><div class="muted small">${x.ef}</div></div>${x.c.map(k => `<button class="btn sm fear" data-act="env" data-i="${i}" data-c="${k}" ${b.medo < k ? "disabled" : ""}>Gastar ${k} Medo</button>`).join("")}</div>`).join("")}</div>
    ${b.ultimo ? `<div class="note" style="margin-top:10px"><b>${esc(b.ultimo.n)}:</b> ${esc(b.ultimo.o)}. <span class="muted">${esc(b.ultimo.ef)}.</span></div>` : ""}
    ${e ? `<details class="more" style="margin-top:12px"><summary>Ficha do ambiente: ${esc(e.name)}</summary>${envBlock(e)}</details>` : ""}`;
}

// Faixa fixa no topo: Medo e contagens regressivas sempre à vista, ocupando uma linha.
function barraStatus(b) {
  let tok = "";
  for (let i = 0; i < 12; i++) tok += `<button class="tok mini${i < b.medo ? " on" : ""}" data-act="medo" data-i="${i}" aria-label="Medo ${i + 1}" aria-pressed="${i < b.medo}"></button>`;
  return `<div class="statusbar" role="region" aria-label="Medo e contagens regressivas">
    <div class="sb-box sb-medo"><span class="sb-l">Medo <b>${b.medo}</b>/12</span><div class="tokens">${tok}</div>
      <span class="step-btns"><button class="btn sm" data-act="medod" data-v="-1" aria-label="Gastar 1 Medo">−</button><button class="btn sm fear" data-act="medod" data-v="1" aria-label="Ganhar 1 Medo">+</button></span></div>
    ${b.contagens.map(c => `<div class="sb-box cdmini${c.val >= c.size ? " cheia" : ""}"><button class="cd-n" data-act="cdedit" data-id="${c.id}" title="Editar contagem: ${esc(c.n)}">${esc(c.n)}</button><div class="pips">${pipsU(c.size, c.val, "cdp", c.id)}</div></div>`).join("")}
    <button class="sb-add" data-act="cdnova" aria-label="Nova contagem regressiva" title="Nova contagem regressiva">${icon("plus")}<span>Contagem</span></button></div>`;
}

export function html(p) {
  ID = p[1];
  const b = B();
  if (!b) return `<div class="empty"><h3>Batalha não encontrada</h3><a class="btn" href="#/mestre">Voltar</a></div>`;
  const o = orcamento(b), st = STATUS[b.status] || STATUS.prep, vivos = b.unidades.filter(u => u.hp < u.hpMax).length;
  const mesasMinhas = S.mesas.filter(m => user() && m.mestre === user().id);
  return `<div style="margin-bottom:10px">${voltar("#/mestre", "Mestre")}</div>
  <section class="battle-head">
    <div class="eyebrow">${b.origem === "ia" ? "Criada pela IA · " : ""}${b.unidades.length} adversário${b.unidades.length === 1 ? "" : "s"} · ${vivos} de pé</div>
    <h1>${esc(b.nome)}</h1>
    <div class="bh-row"><span class="tag ${st[1]}">${st[0]}</span>
      ${b.status === "prep" ? `<button class="btn hope" data-act="iniciar">${icon("sword")} Iniciar batalha</button>` : b.status === "ativa" ? `<button class="btn" data-act="encerrar">Encerrar batalha</button>` : `<button class="btn" data-act="reabrir">Reabrir</button>`}
      <button class="btn ghost" data-act="bmenu">⋯ Opções</button></div>
    ${b.cena ? `<div class="scene tx">${mdBlock(b.cena)}</div>` : ""}
  </section>

  ${barraStatus(b)}

  <details class="track fold" ${painel.grupo ? "open" : ""} data-pn="grupo"><summary><h3>Grupo ${b.mesa ? "" : `<span class="muted small">(sem mesa)</span>`}</h3></summary>${painelGrupo(b)}</details>
  <details class="track fold" ${painel.ambiente ? "open" : ""} data-pn="ambiente"><summary><h3>Ambiente e ações do Medo${b.ambiente ? ` <span class="tag">${esc(b.ambiente.name)}</span>` : ""}</h3></summary>${painelAmbiente(b)}</details>
  <details class="track fold" ${painel.prep ? "open" : ""} data-pn="prep"><summary><h3>Preparação <span class="muted small">${o.custo}/${o.total} pontos</span></h3></summary>
    ${barraOrc(b)}
    <div class="grid3" style="margin-top:12px">
      <label class="f">Jogadores<input type="number" min="1" max="8" value="${b.jogadores}" data-in="bjog" data-k="bjog"></label>
      <label class="f">Ajuste<input type="number" min="-6" max="6" value="${b.ajuste}" data-in="baj" data-k="baj"></label>
      <label class="f">Mesa<select data-ch="bmesa"><option value="">Nenhuma</option>${mesasMinhas.map(m => `<option value="${m.id}"${b.mesa === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label></div>
    <p class="muted small" style="margin:8px 0 0">Ajustes do livro: −1 luta curta ou fácil · −2 se houver 2+ Solos · +1 sem Bruiser, Horda, Líder ou Solo · +2 luta longa ou difícil.</p></details>
  <details class="track fold" ${painel.notas ? "open" : ""} data-pn="notas"><summary><h3>Notas e recompensas</h3></summary>
    <label class="f">Notas da batalha<textarea data-in="bnotas" data-k="bnotas" style="min-height:110px">${esc(b.notas || "")}</textarea></label>
    <label class="f" style="margin-top:10px">Recompensas<textarea data-in="brec" data-k="brec">${esc(b.recompensas || "")}</textarea></label></details>

  ${painelUnidades(b)}`;
}

export function mount(main) {
  main.querySelectorAll("details.fold").forEach(d => d.addEventListener("toggle", () => { painel[d.dataset.pn] = d.open; }));
}

function menuBatalha() {
  const b = B();
  const w = openSheet(`<label class="f">Nome<input type="text" id="mn" value="${esc(b.nome)}"></label>
    <label class="f" style="margin-top:10px">Cena / descrição<textarea id="mc" style="min-height:120px">${esc(b.cena || "")}</textarea></label>
    <div class="acts"><button class="btn hope" id="msv">Salvar</button></div><div class="divider"></div>
    <div class="acts" style="margin-top:0"><button class="btn" id="mdup">Duplicar batalha</button><button class="btn" id="mrs">Reiniciar (PV, Estresse, Medo)</button><button class="btn danger" id="mdel">${icon("trash")} Excluir</button></div>`, { title: "Opções da batalha" });
  w.querySelector("#msv").addEventListener("click", () => { edQuiet(x => { x.nome = w.querySelector("#mn").value.trim() || "Batalha"; x.cena = w.querySelector("#mc").value; }); closeSheet(); app.render(true); });
  w.querySelector("#mdup").addEventListener("click", () => { const c = JSON.parse(JSON.stringify(b)); c.id = uid(); c.nome += " (cópia)"; c.status = "prep"; c.unidades.forEach(u => { u.hp = 0; u.st = 0; u.cond = []; }); c.medo = 0; c.criadaEm = Date.now(); GM.batalhas.unshift(c); salvarGM(); closeSheet(); location.hash = "#/mestre/batalha/" + c.id; });
  w.querySelector("#mrs").addEventListener("click", () => { edQuiet(x => { x.unidades.forEach(u => { u.hp = 0; u.st = 0; u.cond = []; }); x.medo = 0; x.contagens.forEach(c => (c.val = 0)); x.status = "prep"; }); closeSheet(); app.render(true); toast("Batalha reiniciada"); });
  w.querySelector("#mdel").addEventListener("click", async () => { closeSheet(); if (await confirmar("Excluir esta batalha? Não dá para desfazer.", { ok: "Excluir", perigo: true })) { GM.batalhas = GM.batalhas.filter(x => x.id !== ID); salvarGM(); location.hash = "#/mestre"; } });
}

const ctx = { reg: () => B(), ed: fn => ed(fn), edQuiet: fn => edQuiet(fn) };
export function on(a, el) {
  const b = B(); if (!b) return;
  if (unidadeOn(a, el, ctx)) return;
  const id = el.dataset.id, i = +el.dataset.i;
  switch (a) {
    case "iniciar": ed(x => { x.status = "ativa"; }); toast("Batalha iniciada"); document.dispatchEvent(new CustomEvent("dh-lem", { detail: "abrir" })); return;
    case "encerrar": ed(x => { x.status = "fim"; }); return;
    case "reabrir": ed(x => { x.status = "ativa"; }); return;
    case "bmenu": menuBatalha(); return;
    case "medo": ed(x => { x.medo = x.medo === i + 1 ? i : i + 1; }); return;
    case "medod": ed(x => { x.medo = clamp(x.medo + +el.dataset.v, 0, 12); }); return;
    case "cdnova": {
      const w = openSheet(`<label class="f">Nome<input type="text" id="cn" placeholder="Ex.: a ponte cai"></label><label class="f" style="margin-top:10px">Caixas<input type="number" id="cs" min="1" max="12" value="4"></label><div class="acts"><button class="btn hope" id="cok">Criar</button></div>`, { title: "Nova contagem" });
      w.querySelector("#cok").addEventListener("click", () => { const n = w.querySelector("#cn").value.trim() || "Contagem"; ed(x => x.contagens.push({ id: uid(), n, size: clamp(parseInt(w.querySelector("#cs").value, 10) || 4, 1, 12), val: 0 })); closeSheet(); });
      return;
    }
    case "cdp": ed(() => { const c = b.contagens.find(x => x.id === id); c.val = c.val === i + 1 ? i : i + 1; }); return;
    case "cdedit": {
      const c = b.contagens.find(x => x.id === id);
      const w = openSheet(`<label class="f">Nome<input type="text" id="cn" value="${esc(c.n)}"></label><label class="f" style="margin-top:10px">Caixas<input type="number" id="cs" min="1" max="12" value="${c.size}"></label>
        <div class="acts"><button class="btn hope" id="cok">Salvar</button><button class="btn" id="czr">Zerar</button><button class="btn danger" id="cdl">${icon("trash")} Excluir</button></div>`, { title: "Contagem regressiva" });
      w.querySelector("#cok").addEventListener("click", () => { ed(x => { const k = x.contagens.find(y => y.id === id); k.n = w.querySelector("#cn").value.trim() || k.n; k.size = clamp(parseInt(w.querySelector("#cs").value, 10) || k.size, 1, 12); k.val = Math.min(k.val, k.size); }); closeSheet(); });
      w.querySelector("#czr").addEventListener("click", () => { ed(() => { c.val = 0; }); closeSheet(); });
      w.querySelector("#cdl").addEventListener("click", () => { ed(x => { x.contagens = x.contagens.filter(k => k.id !== id); }); closeSheet(); });
      return;
    }
    case "cddel": ed(x => { x.contagens = x.contagens.filter(c => c.id !== id); }); return;
    case "env": { const e = AMBIENTE_ACOES[i], c = +el.dataset.c; if (b.medo < c) return; ed(x => { x.medo -= c; x.ultimo = { n: e.n, o: sortear(e.op), ef: e.ef }; }); return; }
  }
}
export function input(k, el) {
  if (unidadeInput(k, el, ctx)) return;
  switch (k) {
    case "bnotas": edQuiet(x => { x.notas = el.value; }); break;
    case "brec": edQuiet(x => { x.recompensas = el.value; }); break;
    case "bjog": edQuiet(x => { x.jogadores = clamp(parseInt(el.value, 10) || 1, 1, 8); }); atualizaOrc(); break;
    case "baj": edQuiet(x => { x.ajuste = clamp(parseInt(el.value, 10) || 0, -6, 6); }); atualizaOrc(); break;
  }
}
function atualizaOrc() { const el = document.querySelector(".orc"); if (el) el.outerHTML = barraOrc(B()); }
export function change(k, el) {
  if (k === "bmesa") ed(x => { x.mesa = el.value || null; if (x.mesa) { const n = fichasDaMesa(x.mesa).length; if (n) x.jogadores = Math.min(8, n); } });
}
