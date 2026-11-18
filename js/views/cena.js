// Condução da cena complexa: Contadores em disputa, tabela de resultados, Medo do mestre, gatilhos, fim, log e desfazer.
import { esc, mdBlock, md, icon, uid, toast, confirmar, openSheet, closeSheet } from "../util.js";
import * as K from "../cena.js";
import { GM, achaCena, salvarGM } from "../gm.js";
import { app } from "../main.js";
import { envBlock, pipsU } from "./mestre-ui.js";
import { voltar } from "./common.js";
import { painelUnidades, unidadeOn, unidadeInput } from "./unidades.js";

let ID = null, abre = { cena: false, ciclo: false, log: false, adv: false, amb: false, notas: false };
const C = () => achaCena(ID);
const ed = fn => { fn(C()); salvarGM(); app.render(true); };
const edQuiet = fn => { fn(C()); salvarGM(); };
const ctx = { reg: () => C(), ed, edQuiet };
const STATUS = { prep: ["Em preparação", ""], ativa: ["Em andamento", "hope"], fim: ["Encerrada", "muted"] };
const LADO = { jogadores: "Jogadores", mestre: "Mestre", neutro: "Neutro" };
const FIM_TIT = { vitoria: "Vitória!", derrota: "Derrota", empate: "Empate" };

const efeitosCurtos = ef => (ef && ef.length ? ef.map(e => `${esc(e.contagem)} ${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`).join(" · ") : "só narrativo");
const efeitosFeitos = ef => (ef || []).map(e => `<span class="eftag" title="${esc(K.descEfeito(e))}">${esc(K.descEfeito(e))}</span>`).join("");

function blocoUltimo(c) {
  const u = c.ultimo;
  if (!u) return `<p class="muted small" style="margin:10px 0 0">Role os dados na mesa e toque no resultado.</p>`;
  return `<div class="ultimo"><div class="eyebrow">Última ação</div><h3>${esc(u.titulo)}</h3><div class="tx">${mdBlock(u.texto)}</div>
    <div class="efs">${efeitosFeitos(u.efeitos)}${u.medoDelta ? `<span class="eftag fear">Medo ${u.medoDelta > 0 ? "+" : "−"}${Math.abs(u.medoDelta)}</span>` : ""}</div></div>`;
}

function contadores(c) {
  return `<div class="ctrs">${c.contagens.map(k => {
    const marca = [c.fim.vitoria.contagem, c.fim.derrota && c.fim.derrota.contagem];
    const eh = K.achaContagem(c, marca[0]) === k ? "Vitória" : marca[1] && K.achaContagem(c, marca[1]) === k ? "Derrota" : "";
    const gats = c.gatilhos.filter(g => K.achaContagem(c, g.contagem) === k);
    return `<div class="ctr lado-${esc(k.lado)}${K.cheia(k) ? " cheia" : ""}">
      <div class="ctr-h"><b>${esc(k.n)}</b><span class="tag">${LADO[k.lado] || k.lado}</span>${eh ? `<span class="tag ${eh === "Vitória" ? "hope" : "dead"}">${eh} ao encher</span>` : ""}<span class="cnt">${k.val}<small>/${k.size}</small></span>
        <span class="step-btns"><button class="btn sm" data-act="cdelta" data-id="${k.id}" data-v="-1" aria-label="Apagar uma caixa de ${esc(k.n)}">−</button><button class="btn sm" data-act="cdelta" data-id="${k.id}" data-v="1" aria-label="Marcar uma caixa de ${esc(k.n)}">+</button></span></div>
      <div class="pips ctr-pips">${pipsU(k.size, k.val, "cpip", k.id)}</div>
      ${gats.length ? `<div class="muted small">${gats.map(g => `Na caixa ${g.quando}: <b>${esc(g.titulo)}</b>${g.umaVez ? (g.disparado ? " (já ocorreu)" : "") : ""}`).join(" · ")}</div>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function painelResultados(c) {
  return `<div class="res-grid">${K.RESULTADOS.map(([k, n, cls]) => `<button class="rbtn ${cls}" data-act="res" data-k="${k}"><b>${n}</b><span>${efeitosCurtos(c.resultados[k].efeitos)}${K.COM_MEDO.has(k) && c.config.medoAuto ? " · Medo +1" : ""}</span></button>`).join("")}</div>${blocoUltimo(c)}`;
}

function painelMedo(c) {
  let tok = "";
  for (let i = 0; i < K.MEDO_MAX; i++) tok += `<button class="tok${i < c.medo ? " on" : ""}" data-act="medo" data-i="${i}" aria-label="Medo ${i + 1}" aria-pressed="${i < c.medo}"></button>`;
  return `<div class="fear-bar"><h3>Medo</h3><span class="cnt">${c.medo}/12</span><div class="tokens">${tok}</div>
    <span class="step-btns"><button class="btn sm" data-act="medod" data-v="-1" aria-label="Gastar 1 Medo">−1</button><button class="btn sm fear" data-act="medod" data-v="1" aria-label="Ganhar 1 Medo">+1</button></span></div>
  ${c.medoJogadas.length ? `<div class="track"><div class="track-h"><h3>Jogadas do mestre</h3></div>${c.medoJogadas.map(m => {
    const d = K.medoDisponivel(c, m);
    return `<div class="mv-row"><div class="grow"><b>${esc(m.nome)}</b> <span class="tag fear">Medo ${m.custo}</span> ${m.limite ? `<span class="tag">${esc(K.textoLimite(m))}</span>` : ""}
      <div class="tx small">${mdBlock(m.texto)}</div><div class="muted small">${efeitosCurtos(m.efeitos)}</div>${d.ok ? "" : `<div class="muted small mv-no">${esc(d.motivo)}</div>`}</div>
      <button class="btn sm fear" data-act="medouse" data-id="${m.id}" ${d.ok ? "" : "disabled"}>Usar</button></div>`;
  }).join("")}</div>` : ""}`;
}

function painelJogadores(c) {
  if (!c.jogadoresUsos.length) return "";
  return `<div class="track"><div class="track-h"><h3>Usos dos jogadores</h3></div><p class="muted small" style="margin:0 0 6px">O site não controla a Esperança nem o Estresse de cada um: só aplica o efeito e registra no log.</p>${c.jogadoresUsos.map(u => `<div class="mv-row"><div class="grow"><b>${esc(u.nome)}</b> <span class="tag ${u.recurso === "Esperança" ? "hope" : "exp"}">${u.custo} de ${u.recurso}</span>
      <div class="tx small">${mdBlock(u.texto)}</div><div class="muted small">${efeitosCurtos(u.efeitos)}</div></div><button class="btn sm" data-act="jogauso" data-id="${u.id}">Usar</button></div>`).join("")}</div>`;
}

function painelLog(c) {
  const l = [...c.log].reverse();
  return l.length ? l.map(e => `<div class="log-row"><span class="tag">R${e.rodada}</span> <b>${esc(e.rotulo)}</b>${e.efeitos.length ? " — " + e.efeitos.map(x => esc(K.descEfeito(x))).join(", ") : ""}${e.medoDelta ? ` · Medo ${e.medoDelta > 0 ? "+" : "−"}${Math.abs(e.medoDelta)}` : ""}${e.disparos.length ? ` · <span class="tag exp">Gatilho: ${e.disparos.map(esc).join(", ")}</span>` : ""}${e.fim ? ` · <span class="tag hope">${FIM_TIT[e.fim]}</span>` : ""}</div>`).join("") : `<p class="muted small" style="margin:0">Nada registrado ainda.</p>`;
}

export function html(p) {
  ID = p[1];
  const c = C();
  if (!c) return `<div class="empty"><h3>Cena não encontrada</h3><a class="btn" href="#/mestre">Voltar</a></div>`;
  const st = STATUS[c.status] || STATUS.prep, fechada = c.status === "fim";
  const fim = !fechada && c.fimPendente;
  return `<div style="margin-bottom:10px">${voltar("#/mestre", "Mestre")}</div>
  <section class="battle-head">
    <div class="eyebrow">Cena complexa${c.origem === "ia" ? " · criada pela IA" : ""} · patamar ${c.patamar} · ${c.jogadores} jogadores</div>
    <h1>${esc(c.nome)}</h1>
    <div class="objetivo"><b>Objetivo</b>${esc(c.objetivo)}</div>
    <div class="bh-row"><span class="tag ${st[1]}">${st[0]}</span><span class="tag rodada">Rodada ${c.rodada}</span>${c.dificuldadeRolagem ? `<span class="tag" title="Dificuldade das rolagens desta cena">Dificuldade ${c.dificuldadeRolagem}</span>` : ""}
      ${c.status === "prep" ? `<button class="btn hope" data-act="iniciar">${icon("sword")} Iniciar cena</button>` : fechada ? `<button class="btn" data-act="reabrir">Reabrir</button>` : `<button class="btn" data-act="encerrar">Encerrar cena</button>`}
      ${fechada ? "" : `<button class="btn" data-act="prox">Próxima rodada</button>`}
      <button class="btn ghost" data-act="undo" ${c.pilha.length ? "" : "disabled"}>↶ Desfazer</button>
      <button class="btn ghost" data-lm="toggle">⚑ Lembretes${(c.lembretes || []).filter(l => !l.feito).length ? ` (${(c.lembretes || []).filter(l => !l.feito).length})` : ""}</button>
      <button class="btn ghost" data-act="smenu">⋯ Opções</button></div>
    ${c.cena ? `<details class="more fold-s" data-pn="cena" ${abre.cena ? "open" : ""}><summary>Texto da cena (para ler em voz alta)</summary><div class="scene tx">${mdBlock(c.cena)}</div></details>` : ""}
    ${c.ciclo ? `<details class="more fold-s" data-pn="ciclo" ${abre.ciclo ? "open" : ""}><summary>Como funciona a rodada</summary><div class="tx">${mdBlock(c.ciclo)}</div></details>` : ""}
  </section>

  ${c.alertas.map(a => `<div class="alert-gatilho"><div class="eyebrow">Gatilho · ${esc(a.contagem)} na caixa ${a.quando}</div><h3>${esc(a.titulo)}</h3><div class="tx">${mdBlock(a.texto)}</div><div class="acts"><button class="btn sm" data-act="alerta" data-id="${a.id}">Entendi</button></div></div>`).join("")}
  ${fim ? `<div class="fim-panel fim-${esc(fim.tipo)}"><div class="eyebrow">Fim de cena</div><h2>${FIM_TIT[fim.tipo]}</h2>${fim.textos.map(t => `<div class="tx">${mdBlock(t)}</div>`).join("")}<div class="acts"><button class="btn" data-act="continuar">Continuar mesmo assim</button><button class="btn hope" data-act="encerrar">Encerrar cena</button></div></div>` : ""}
  ${fechada ? `<div class="fim-panel fim-${esc(c.desfecho || "manual")}"><div class="eyebrow">Cena encerrada</div><h2>${FIM_TIT[c.desfecho] || "Encerrada pelo mestre"}</h2>${c.desfecho === "vitoria" ? `<div class="tx">${mdBlock(c.fim.vitoria.texto)}</div>` : c.desfecho === "derrota" && c.fim.derrota ? `<div class="tx">${mdBlock(c.fim.derrota.texto)}</div>` : c.desfecho === "empate" ? `<div class="tx">${mdBlock(c.fim.empate ? c.fim.empate.texto : [c.fim.vitoria.texto, c.fim.derrota ? c.fim.derrota.texto : ""].join("\n\n"))}</div>` : ""}</div>` : ""}

  ${contadores(c)}
  <div class="track"><div class="track-h"><h3>Resultado da rolagem</h3></div>${painelResultados(c)}</div>
  ${painelMedo(c)}
  ${painelJogadores(c)}

  <details class="track fold" data-pn="log" ${abre.log ? "open" : ""}><summary><h3>Log da cena <span class="muted small">${c.log.length} ação${c.log.length === 1 ? "" : "ões"}</span></h3></summary><div>${painelLog(c)}</div></details>
  ${c.ambiente ? `<details class="track fold" data-pn="amb" ${abre.amb ? "open" : ""}><summary><h3>Ambiente <span class="tag">${esc(c.ambiente.name)}</span></h3></summary><div>${envBlock(c.ambiente)}</div></details>` : ""}
  <details class="track fold" data-pn="adv" ${abre.adv || c.unidades.length ? "open" : ""}><summary><h3>Adversários <span class="muted small">${c.unidades.length}</span></h3></summary><div>${painelUnidades(c, "Adversários da cena")}</div></details>
  <details class="track fold" data-pn="notas" ${abre.notas ? "open" : ""}><summary><h3>Notas e recompensas</h3></summary><div>
    <label class="f">Notas da cena<textarea data-in="cnotas" data-k="cnotas" style="min-height:100px">${esc(c.notas || "")}</textarea></label>
    <label class="f" style="margin-top:10px">Recompensas<textarea data-in="crec" data-k="crec">${esc(c.recompensas || "")}</textarea></label></div></details>`;
}

export function mount(main) {
  main.querySelectorAll("details[data-pn]").forEach(d => d.addEventListener("toggle", () => { abre[d.dataset.pn] = d.open; }));
}

function avisosDaAcao(r) {
  if (!r) return;
  if (r.disparos && r.disparos.length) toast("Gatilho: " + r.disparos.join(", "));
  else if (r.fim) toast("Fim de cena: " + FIM_TIT[r.fim.tipo]);
}

function menu() {
  const c = C();
  const w = openSheet(`<label class="f">Nome<input type="text" id="mn" value="${esc(c.nome)}"></label>
    <label class="f" style="margin-top:10px">Objetivo<textarea id="mo" style="min-height:70px">${esc(c.objetivo)}</textarea></label>
    <label class="switch"><input type="checkbox" id="ma" ${c.config.medoAuto ? "checked" : ""}><span class="t"><b>+1 de Medo nos resultados “com Medo”</b><span>O mestre ganha 1 de Medo quando a rolagem sai com Medo (sucesso ou falha). Desligue se preferir contar no papel.</span></span></label>
    <div class="acts"><button class="btn hope" id="msv">Salvar</button></div><div class="divider"></div>
    <div class="acts" style="margin-top:0"><button class="btn" id="mdup">Duplicar cena</button><button class="btn" id="mrs">Reiniciar a cena</button><button class="btn danger" id="mdel">${icon("trash")} Excluir</button></div>`, { title: "Opções da cena" });
  w.querySelector("#msv").addEventListener("click", () => { edQuiet(x => { x.nome = w.querySelector("#mn").value.trim() || x.nome; x.objetivo = w.querySelector("#mo").value; x.config.medoAuto = w.querySelector("#ma").checked; }); closeSheet(); app.render(true); });
  w.querySelector("#mdup").addEventListener("click", () => { const d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.nome += " (cópia)"; K.reiniciar(d); d.criadaEm = Date.now(); GM.batalhas.unshift(d); salvarGM(); closeSheet(); location.hash = "#/mestre/cena/" + d.id; });
  w.querySelector("#mrs").addEventListener("click", async () => { closeSheet(); if (await confirmar("Reiniciar a cena? Contadores, Medo, rodada, log e gatilhos voltam ao início.", { ok: "Reiniciar" })) { ed(x => K.reiniciar(x)); toast("Cena reiniciada"); } });
  w.querySelector("#mdel").addEventListener("click", async () => { closeSheet(); if (await confirmar("Excluir esta cena? Não dá para desfazer.", { ok: "Excluir", perigo: true })) { GM.batalhas = GM.batalhas.filter(x => x.id !== ID); salvarGM(); location.hash = "#/mestre"; } });
}

export function on(a, el) {
  const c = C(); if (!c) return;
  if (unidadeOn(a, el, ctx)) return;
  const id = el.dataset.id, i = +el.dataset.i;
  switch (a) {
    case "iniciar": ed(x => { x.status = "ativa"; }); toast("Cena iniciada"); return;
    case "encerrar": ed(x => K.encerrar(x)); return;
    case "reabrir": ed(x => { x.status = "ativa"; x.desfecho = null; }); return;
    case "prox": ed(x => K.proximaRodada(x)); toast(`Rodada ${c.rodada}: limites por rodada liberados`); return;
    case "undo": { let ok = false; ed(x => { ok = K.desfazer(x); }); toast(ok ? "Ação desfeita" : "Nada para desfazer"); return; }
    case "res": { let r; ed(x => { r = K.aplicarResultado(x, el.dataset.k); }); avisosDaAcao(r); return; }
    case "medouse": { let r; ed(x => { r = K.usarMedo(x, id); }); if (r && !r.ok) toast(r.motivo); else avisosDaAcao(r); return; }
    case "jogauso": { let r; ed(x => { r = K.usarJogador(x, id); }); avisosDaAcao(r); return; }
    case "cpip": { let r; ed(x => { const k = x.contagens.find(y => y.id === id); r = K.ajustarContagem(x, id, k.val === i + 1 ? i : i + 1); }); avisosDaAcao(r); return; }
    case "cdelta": { let r; ed(x => { const k = x.contagens.find(y => y.id === id); r = K.ajustarContagem(x, id, k.val + +el.dataset.v); }); avisosDaAcao(r); return; }
    case "medo": ed(x => K.ajustarMedo(x, x.medo === i + 1 ? i : i + 1)); return;
    case "medod": ed(x => K.ajustarMedo(x, x.medo + +el.dataset.v)); return;
    case "alerta": ed(x => K.dispensarAlerta(x, id)); return;
    case "continuar": ed(x => K.continuarMesmoAssim(x)); return;
    case "smenu": menu(); return;
  }
}
export function input(k, el) {
  if (unidadeInput(k, el, ctx)) return;
  if (k === "cnotas") edQuiet(x => { x.notas = el.value; });
  if (k === "crec") edQuiet(x => { x.recompensas = el.value; });
}
export function change() {}
