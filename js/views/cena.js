// Condução da cena complexa: Contadores em disputa, tabela de resultados, Medo do mestre, gatilhos, fim, log e desfazer.
import { esc, mdBlock, md, icon, uid, toast, confirmar, openSheet, closeSheet } from "../util.js";
import * as K from "../cena.js";
import { GM, achaCena, salvarGM, mesasDoMestre, mesaDe } from "../gm.js";
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

function faixaTxt(f) { return f.de === f.ate ? `${f.de}` : `${f.de}–${f.ate}`; }
function painelPressao(c) {
  const p = c.pressao;
  if (!p) return "";
  const k = K.achaContagem(c, p.contagem), ativa = K.faixaAtiva(c), dif = K.difPressao(c);
  return `<div class="track pressao"><div class="track-h"><h3>Pressão de Fim de Rodada</h3><span class="tag exp" title="A Pressão não gasta Medo e não altera os Contadores">Sem custo de Medo</span><button class="btn sm ghost" data-act="edpress">Editar</button></div>
    <div class="chips"><span class="tag">${esc(p.atributo)}</span><span class="tag">Dificuldade ${dif ?? "?"}</span>${k ? `<span class="tag">${esc(k.n)} ${k.val}/${k.size}</span>` : ""}</div>
    ${p.texto ? `<div class="tx small" style="margin-top:8px">${mdBlock(p.texto)}</div>` : ""}
    <div class="pr-faixas" role="list" aria-label="Faixas de dano por valor de ${esc(p.contagem)}">${p.faixas.map(f => `<div class="pr-faixa${f === ativa ? " on" : ""}" role="listitem"${f === ativa ? ' aria-current="true"' : ""}><span class="pr-v">${esc(p.contagem)} ${faixaTxt(f)}</span><b>${esc(f.dano)}</b>${f === ativa ? `<em>faixa atual</em>` : ""}</div>`).join("")}</div>
    ${ativa ? "" : `<div class="muted small mv-no">Nenhuma faixa cobre o valor atual de ${esc(p.contagem)}: a falha não causaria dano.</div>`}
    <div class="muted small" style="margin-top:8px"><b>Sucesso:</b> ${esc(p.sucesso)} · <b>Crítico:</b> ${esc(p.critico)}</div>
    <p class="muted small" style="margin:8px 0 0">No fim de toda rodada, o PJ com o pior resultado (empate: você escolhe) faz uma reação de ${esc(p.atributo)} na Dificuldade ${dif ?? "?"}. Falha: dano da faixa atual. Não substitui as jogadas de Medo, que continuam extras.</p></div>`;
}

// Passo ao fechar a rodada: aplica a Pressão (ou pula) e só então avança. Tudo entra no log como uma ação.
function passoPressao() {
  const c = C(), p = c.pressao, f = K.faixaAtiva(c), k = K.achaContagem(c, p.contagem), dif = K.difPressao(c);
  const w = openSheet(`<p style="margin-top:0">Fim da <b>rodada ${c.rodada}</b>. O PJ com o <b>pior resultado</b> da rodada (empate: você escolhe) faz uma reação de <b>${esc(p.atributo)}</b> na <b>Dificuldade ${dif ?? "?"}</b>.</p>
    <div class="muted small">${esc(p.contagem)} em ${k ? `${k.val}/${k.size}` : "?"} · faixa atual: ${f ? `<b>${esc(f.dano)}</b>` : "nenhuma (sem dano)"}</div>
    <div class="pr-btns">
      <button class="btn danger" data-pr="falha"><b>Falhou</b><span>${f ? esc(f.dano) : "sem dano"}</span></button>
      <button class="btn hope" data-pr="sucesso"><b>Passou</b><span>${esc(p.sucesso)}</span></button>
      <button class="btn" data-pr="critico"><b>Crítico</b><span>${esc(p.critico)}</span></button></div>
    <div class="acts"><button class="btn ghost" data-pr="pular">Pular: avançar sem aplicar</button></div>
    <p class="muted small" style="margin:8px 0 0">Não gasta Medo e não altera os Contadores.</p>`, { title: "Aplicar Pressão" });
  w.querySelectorAll("[data-pr]").forEach(b => b.addEventListener("click", () => {
    const res = b.dataset.pr; let r;
    closeSheet(); ed(x => { r = K.proximaRodada(x, res); });
    toast(`Rodada ${C().rodada}: ${res === "pular" ? "Pressão pulada" : "Pressão " + K.PRESSAO_RES[res].toLowerCase()}`); avisosDaAcao(r);
  }));
}

// Editor de "Como funciona a rodada" e da Pressão. Mexe só nesses dois campos: rodada, Contadores, log e gatilhos ficam como estão.
const linhaFaixa = f => `<div class="pe-faixa"><label>De<input type="number" min="0" inputmode="numeric" data-pe="de" value="${f.de ?? ""}"></label><label>Até<input type="number" min="0" inputmode="numeric" data-pe="ate" value="${f.ate ?? ""}"></label><label class="grow">Dano<input type="text" data-pe="dano" value="${esc(f.dano || "")}" placeholder="1d8+3 fís"></label><button class="btn sm ghost" type="button" data-pe-del aria-label="Remover faixa">${icon("trash")}</button></div>`;
function editarRodada(rascunho = null) {
  const c = C(), p = rascunho || c.pressao, mest = c.contagens.filter(k => k.lado === "mestre");
  const w = openSheet(`<label class="f">Como funciona a rodada<textarea id="pe-ciclo" style="min-height:90px" placeholder="O que cada PJ faz por rodada e qual rolagem usa.">${esc(c.ciclo || "")}</textarea></label>
    <div class="divider"></div>
    <label class="switch"><input type="checkbox" id="pe-on" ${p ? "checked" : ""}><span class="t"><b>Pressão de Fim de Rodada</b><span>No fim de toda rodada, o PJ com o pior resultado faz uma reação. Falha: dano pela faixa do Contador do mestre. Sem custo de Medo.</span></span></label>
    <div id="pe-box" ${p ? "" : "hidden"}>
      ${mest.length ? "" : `<div class="err" style="margin-top:10px">Esta cena não tem Contagem do lado “mestre”. A Pressão precisa de uma.</div>`}
      <div class="pe-row" style="margin-top:10px"><label class="f">Atributo<input type="text" id="pe-atr" list="pe-atrs" value="${esc(p ? p.atributo : "Agilidade")}"><datalist id="pe-atrs">${K.ATRIBUTOS.map(a => `<option value="${a}">`).join("")}</datalist></label>
        <label class="f">Dificuldade<input type="number" id="pe-dif" min="1" max="30" inputmode="numeric" value="${p && p.dificuldade ? p.dificuldade : ""}" placeholder="${c.dificuldadeRolagem ? `da cena (${c.dificuldadeRolagem})` : "obrigatória"}"></label></div>
      <label class="f" style="margin-top:10px">Contagem do mestre<select id="pe-cont">${mest.map(k => `<option value="${esc(k.n)}"${p && K.achaContagem(c, p.contagem) === k ? " selected" : ""}>${esc(k.n)} (${k.size} caixas)</option>`).join("")}</select></label>
      <div class="track-h" style="margin:14px 0 6px"><h3 style="font-size:1rem">Faixas de dano</h3><button class="btn sm" type="button" id="pe-tier">Gerar pelos terços do Tier ${c.patamar}</button></div>
      <div id="pe-faixas">${(p ? p.faixas : []).map(linhaFaixa).join("")}</div>
      <div class="acts" style="margin-top:6px"><button class="btn sm" type="button" id="pe-add">+ Faixa</button></div>
      <p class="muted small" style="margin:4px 0 0">Sem faixas, o site usa os terços das caixas com o dano do Tier. Dano em dados + tipo: 1d8+3 fís ou 2d6+3 mág.</p>
      <label class="f" style="margin-top:10px">Se passar<input type="text" id="pe-suc" value="${esc(p ? p.sucesso : "Marca 1 Estresse.")}"></label>
      <label class="f" style="margin-top:10px">Se for crítico<input type="text" id="pe-cri" value="${esc(p ? p.critico : "Ignora o efeito.")}"></label>
      <label class="f" style="margin-top:10px">Descrição da ameaça (opcional)<textarea id="pe-tx" style="min-height:60px">${esc(p ? p.texto : "")}</textarea></label></div>
    <div id="pe-err"></div>
    <div class="acts"><button class="btn hope" id="pe-ok">Salvar</button></div>`, { title: "Rodada e Pressão", wide: true });
  const q = s => w.querySelector(s), box = q("#pe-box");
  q("#pe-on").addEventListener("change", e => { box.hidden = !e.target.checked; });
  q("#pe-add").addEventListener("click", () => { q("#pe-faixas").insertAdjacentHTML("beforeend", linhaFaixa({})); });
  q("#pe-faixas").addEventListener("click", e => { const b = e.target.closest("[data-pe-del]"); if (b) b.closest(".pe-faixa").remove(); });
  q("#pe-tier").addEventListener("click", () => { const k = K.achaContagem(c, q("#pe-cont").value); if (k) q("#pe-faixas").innerHTML = K.faixasPadrao(k.size, c.patamar).map(linhaFaixa).join(""); });
  q("#pe-ok").addEventListener("click", () => {
    const ciclo = q("#pe-ciclo").value.trim();
    if (!q("#pe-on").checked) { edQuiet(x => { x.ciclo = ciclo; x.pressao = null; }); closeSheet(); app.render(true); toast("Salvo"); return; }
    const num = v => (v === "" ? null : Number(v));
    const faixas = [...w.querySelectorAll(".pe-faixa")].map(r => ({ de: num(r.querySelector('[data-pe="de"]').value), ate: num(r.querySelector('[data-pe="ate"]').value), dano: r.querySelector('[data-pe="dano"]').value }));
    const raw = { atributo: q("#pe-atr").value.trim() || null, dificuldade: num(q("#pe-dif").value), contagem: q("#pe-cont").value, ...(faixas.length ? { faixas } : {}), sucesso: q("#pe-suc").value, critico: q("#pe-cri").value, texto: q("#pe-tx").value };
    const v = K.validarPressaoCena(c, raw);
    if (v.erros.length) { q("#pe-err").innerHTML = `<div class="err" style="margin-top:10px"><b>Corrija antes de salvar:</b><ul style="margin:6px 0 0;padding-left:1.2em">${v.erros.map(e => `<li>${esc(e.campo.replace(/^pressao\.?/, "") || "pressão")}: ${esc(e.msg)}</li>`).join("")}</ul></div>`; return; }
    edQuiet(x => { x.ciclo = ciclo; x.pressao = K.montarPressao(raw, x.contagens, x.patamar); });
    closeSheet(); app.render(true); toast(v.avisos.length ? "Salvo. Aviso: " + v.avisos[0].msg : "Salvo");
  });
}
function pressaoPadrao() {
  const c = C(), p = K.pressaoPadraoDe(c);
  if (!p) { toast("A cena não tem Contagem do lado mestre para medir a Pressão"); return; }
  if (!c.dificuldadeRolagem) { editarRodada(p); return; } // sem Dificuldade na cena: o mestre informa no editor
  ed(x => { x.pressao = K.pressaoPadraoDe(x); });
  toast(`Pressão padrão do Tier ${c.patamar} adicionada: ${p.atributo}, Dificuldade ${c.dificuldadeRolagem}, ${p.contagem}`);
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
    <details class="more fold-s" data-pn="ciclo" ${abre.ciclo ? "open" : ""}><summary>Como funciona a rodada</summary>${c.ciclo ? `<div class="tx">${mdBlock(c.ciclo)}</div>` : `<p class="muted small" style="margin:6px 0 0">Ainda sem descrição.</p>`}<div class="acts" style="margin-top:8px"><button class="btn sm ghost" data-act="edciclo">Editar rodada e Pressão</button></div></details>
  </section>

  ${c.alertas.map(a => `<div class="alert-gatilho"><div class="eyebrow">Gatilho · ${esc(a.contagem)} na caixa ${a.quando}</div><h3>${esc(a.titulo)}</h3><div class="tx">${mdBlock(a.texto)}</div><div class="acts"><button class="btn sm" data-act="alerta" data-id="${a.id}">Entendi</button></div></div>`).join("")}
  ${fim ? `<div class="fim-panel fim-${esc(fim.tipo)}"><div class="eyebrow">Fim de cena</div><h2>${FIM_TIT[fim.tipo]}</h2>${fim.textos.map(t => `<div class="tx">${mdBlock(t)}</div>`).join("")}<div class="acts"><button class="btn" data-act="continuar">Continuar mesmo assim</button><button class="btn hope" data-act="encerrar">Encerrar cena</button></div></div>` : ""}
  ${fechada ? `<div class="fim-panel fim-${esc(c.desfecho || "manual")}"><div class="eyebrow">Cena encerrada</div><h2>${FIM_TIT[c.desfecho] || "Encerrada pelo mestre"}</h2>${c.desfecho === "vitoria" ? `<div class="tx">${mdBlock(c.fim.vitoria.texto)}</div>` : c.desfecho === "derrota" && c.fim.derrota ? `<div class="tx">${mdBlock(c.fim.derrota.texto)}</div>` : c.desfecho === "empate" ? `<div class="tx">${mdBlock(c.fim.empate ? c.fim.empate.texto : [c.fim.vitoria.texto, c.fim.derrota ? c.fim.derrota.texto : ""].join("\n\n"))}</div>` : ""}</div>` : ""}

  ${contadores(c)}
  ${painelPressao(c)}
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
    <label class="f" style="margin-top:10px">Mesa<select id="mm"><option value="">Nenhuma</option>${mesasDoMestre().map(m => `<option value="${m.id}"${mesaDe(c) === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>
    <label class="switch"><input type="checkbox" id="ma" ${c.config.medoAuto ? "checked" : ""}><span class="t"><b>+1 de Medo nos resultados “com Medo”</b><span>O mestre ganha 1 de Medo quando a rolagem sai com Medo (sucesso ou falha). Desligue se preferir contar no papel.</span></span></label>
    <div class="acts"><button class="btn hope" id="msv">Salvar</button></div><div class="divider"></div>
    <div class="acts" style="margin-top:0"><button class="btn" id="mrod">Rodada e Pressão…</button>${c.pressao ? "" : `<button class="btn" id="mpad">Adicionar Pressão padrão do Tier</button>`}</div><div class="divider"></div>
    <div class="acts" style="margin-top:0"><button class="btn" id="mdup">Duplicar cena</button><button class="btn" id="mrs">Reiniciar a cena</button><button class="btn danger" id="mdel">${icon("trash")} Excluir</button></div>`, { title: "Opções da cena" });
  w.querySelector("#msv").addEventListener("click", () => { edQuiet(x => { x.nome = w.querySelector("#mn").value.trim() || x.nome; x.objetivo = w.querySelector("#mo").value; x.mesa = w.querySelector("#mm").value || null; x.config.medoAuto = w.querySelector("#ma").checked; }); closeSheet(); app.render(true); });
  w.querySelector("#mrod").addEventListener("click", () => { closeSheet(); editarRodada(); });
  const mp = w.querySelector("#mpad"); if (mp) mp.addEventListener("click", () => { closeSheet(); pressaoPadrao(); });
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
    case "prox": if (c.pressao) { passoPressao(); return; } ed(x => K.proximaRodada(x)); toast(`Rodada ${c.rodada}: limites por rodada liberados`); return;
    case "edpress": case "edciclo": editarRodada(); return;
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
