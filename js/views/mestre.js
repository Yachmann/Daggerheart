// Mestre: central de batalhas, biblioteca, geradores, notas e conexão com a IA
import { esc, md, mdBlock, icon, uid, toast, confirmar, openSheet, closeSheet, debounce, norm, store } from "../util.js";
import { list, loc, hfOn, nome, T, dmgPT } from "../data.js";
import { GM, gmStatus, salvarGM, adversarios, ambientes, achaBatalha, novaBatalha, salvarBatalha, orcamento, resumoBatalha, TIPOS, TIPO_PT, TIPO_DESC, CATS, COMPLICACOES, gerarAdversario, gerarBatalha, sortear, catalogoMD, instrucoesIA, EXEMPLO_JSON, EXEMPLO_CENA, soBatalhas, gmPronto } from "../gm.js";
import { S, user, sb, fichasDaMesa } from "../store.js";
import { app } from "../main.js";
import * as Batalha from "./batalha.js";
import * as Editor from "./editor.js";
import * as Importar from "./importar.js";
import * as Cena from "./cena.js";
import { ordenarRegistros } from "../cena.js";
import { statBlock, envBlock, tipoTag, fonteTag, escolherBatalha, barraOrc } from "./mestre-ui.js";
import { expTag } from "./common.js";

const ui = { aba: "batalhas", ft: "", bq: "", q: "", tipo: "", tier: "", cat: "", fonte: "", livro: "adv", gt: "Standard", gp: 1, gen: null, rc: { tema: "qualquer", tier: 1, jog: 4, adj: 0 }, rcRes: null, comp: "", compCat: "geral", it: null, itCat: "Arma", itTier: "" };
const ABAS = [["batalhas", "Batalhas"], ["biblioteca", "Biblioteca"], ["geradores", "Geradores"], ["notas", "Notas"], ["ia", "Conectar IA"]];

function sub(p) { return p[0] || ""; }
function modulo(p) { const s = sub(p); return s === "batalha" ? Batalha : s === "adversario" ? Editor : s === "importar" ? Importar : s === "cena" ? Cena : null; }
export const ouve = m => { const mod = modulo(location.hash.replace(/^#\/?mestre\/?/, "").split("/")); return mod && mod.ouve ? mod.ouve(m) : false; };

export function html(p, q) {
  if (!gmPronto()) return `<div class="loading"><div class="spin"></div></div>`;
  const mod = modulo(p);
  if (mod) return mod.html(p, q);
  if (q.aba && ABAS.some(a => a[0] === q.aba)) ui.aba = q.aba;
  if (!user() && sb) { /* funciona local; avisa */ }
  const corpo = { batalhas: abaBatalhas, biblioteca: abaBiblioteca, geradores: abaGeradores, notas: abaNotas, ia: abaIA }[ui.aba]();
  const st = !sb ? "" : !user() ? `<div class="note info" style="margin-bottom:14px">Sem conta, suas batalhas ficam só neste aparelho. <a href="#/conta">Entre</a> para guardá-las na nuvem e abrir no celular.</div>` : gmStatus.erro === "tabela" ? `<div class="err" style="margin-bottom:14px">As tabelas do mestre ainda não existem no banco: rode o arquivo <code>supabase-fichas.sql</code> (versão nova) no Supabase. Enquanto isso, tudo fica salvo neste aparelho.</div>` : "";
  return `<div class="page-h"><h1>Mestre</h1><div class="sub">Prepare batalhas, crie adversários e conduza a mesa.</div></div>
  <div class="scroll-x" role="tablist">${ABAS.map(([k, n]) => `<button class="chip${ui.aba === k ? " on" : ""}" role="tab" aria-selected="${ui.aba === k}" data-act="aba" data-v="${k}">${n}</button>`).join("")}</div>
  <div style="margin-top:14px">${st}${corpo}</div>`;
}
export function mount(main, p, q) { const mod = modulo(p); if (mod && mod.mount) mod.mount(main, p, q); }

// ---------- Batalhas ----------
const STATUS = { prep: ["Em preparação", ""], ativa: ["Em andamento", "hope"], fim: ["Encerrada", ""] };
const ordenar = ordenarRegistros;
function cartaoRegistro(b) {
  const s = STATUS[b.status] || STATUS.prep, mesa = b.mesa && S.mesas.find(m => m.id === b.mesa);
  if (b.tipo === "cena") {
    const pend = b.alertas ? b.alertas.length : 0;
    return `<a class="pc-card" href="#/mestre/cena/${b.id}" style="--c1:var(--moss);--c2:var(--hope)"><span class="tag ${s[1]}" style="position:absolute;top:14px;right:14px">${s[0]}</span>
      <div class="eyebrow" style="margin-bottom:4px">Cena complexa</div><div class="nm" style="padding-right:110px">${esc(b.nome)}</div>
      <div class="meta">${b.contagens.map(k => `${esc(k.n)} ${k.val}/${k.size}`).join(" · ")}${b.status !== "prep" ? ` · rodada ${b.rodada}` : ""}</div>
      <div class="meta small">${b.origem === "ia" ? "Criada pela IA" : "Manual"}${pend ? ` · ${pend} gatilho${pend > 1 ? "s" : ""} pendente${pend > 1 ? "s" : ""}` : ""}</div>
      ${b.objetivo ? `<div class="meta small" style="margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(b.objetivo)}</div>` : ""}</a>`;
  }
  const o = orcamento(b), r = resumoBatalha(b);
  return `<a class="pc-card" href="#/mestre/batalha/${b.id}" style="--c1:var(--blood);--c2:var(--fear)"><span class="tag ${s[1]}" style="position:absolute;top:14px;right:14px">${s[0]}</span>
    <div class="eyebrow" style="margin-bottom:4px">Batalha</div><div class="nm" style="padding-right:110px">${esc(b.nome)}</div><div class="meta">${b.unidades.length} adversário${b.unidades.length === 1 ? "" : "s"}${b.status !== "prep" ? ` · ${r.vivos} de pé` : ""} · ${o.custo}/${o.total} pt</div>
    <div class="meta small">${b.origem === "ia" ? "Criada pela IA" : b.origem === "sorteio" ? "Sorteada" : "Manual"}${mesa ? " · " + esc(mesa.nome) : ""}</div>
    ${b.cena ? `<div class="meta small" style="margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(b.cena.replace(/[*_#>]/g, ""))}</div>` : ""}</a>`;
}
function listaRegistros() {
  const q = norm(ui.bq);
  const l = ordenar(GM.batalhas.filter(x => (!ui.ft || (ui.ft === "cena" ? x.tipo === "cena" : x.tipo !== "cena")) && (!q || norm(x.nome + " " + (x.objetivo || "") + " " + (x.cena || "")).includes(q))));
  return l.length ? `<div class="pcs">${l.map(cartaoRegistro).join("")}</div>` : `<div class="empty"><h3>Nada encontrado</h3><p>Ajuste a busca ou o filtro.</p></div>`;
}
function abaBatalhas() {
  const nb = GM.batalhas.filter(x => x.tipo !== "cena").length, nc = GM.batalhas.length - nb;
  return `${antigoAviso()}<div class="acts" style="margin:0 0 14px"><button class="btn hope" data-act="nova">${icon("plus")} Nova batalha</button><a class="btn" href="#/mestre/importar">${icon("sparkle")} Importar da IA</a><a class="btn ghost" href="#/mestre/adversario/novo">Criar adversário</a></div>
  ${GM.batalhas.length ? `<div class="search"><span>${icon("search")}</span><input type="search" data-in="bq" data-k="bq" value="${esc(ui.bq)}" placeholder="Buscar por nome (ex.: Sessão 3)…" autocomplete="off"></div>
    <div class="chips" style="margin:10px 0 14px"><button class="chip${!ui.ft ? " on" : ""}" data-act="ftipo" data-v="">Tudo (${GM.batalhas.length})</button><button class="chip${ui.ft === "batalha" ? " on" : ""}" data-act="ftipo" data-v="batalha">Batalhas (${nb})</button><button class="chip${ui.ft === "cena" ? " on" : ""}" data-act="ftipo" data-v="cena">Cenas complexas (${nc})</button></div>
    <div id="lreg">${listaRegistros()}</div>`
    : `<div class="empty"><h3>Nada preparado ainda</h3><p>Peça ao seu projeto do Claude uma batalha ou uma cena complexa e importe aqui, sorteie uma batalha na aba Geradores ou crie a sua do zero.</p><div class="acts" style="justify-content:center"><a class="btn hope" href="#/mestre/importar">${icon("sparkle")} Importar da IA</a><button class="btn" data-act="nova">Nova batalha</button></div></div>`}`;
}

// ---------- Biblioteca ----------
function abaBiblioteca() {
  const adv = ui.livro === "adv";
  return `<div class="chips" style="margin-bottom:10px"><button class="chip${adv ? " on" : ""}" data-act="livro" data-v="adv">Adversários</button><button class="chip${!adv ? " on" : ""}" data-act="livro" data-v="amb">Ambientes</button></div>
  <div class="search"><span>${icon("search")}</span><input type="search" data-in="q" data-k="lq" value="${esc(ui.q)}" placeholder="Buscar ${adv ? "adversário, tática ou habilidade" : "ambiente"}…" autocomplete="off"></div>
  ${adv ? `<div class="row" style="margin-top:10px"><label class="f">Tipo<select data-ch="f" data-f="tipo"><option value="">Todos</option>${TIPOS.map(t => `<option value="${t}"${ui.tipo === t ? " selected" : ""}>${TIPO_PT[t]}</option>`).join("")}</select></label>
    <label class="f">Patamar<select data-ch="f" data-f="tier"><option value="">Todos</option>${[1, 2, 3, 4].map(t => `<option${String(ui.tier) === String(t) ? " selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="f">Tema<select data-ch="f" data-f="cat"><option value="">Todos</option>${CATS.map(([k, n]) => `<option value="${k}"${ui.cat === k ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="f">Fonte<select data-ch="f" data-f="fonte"><option value="">Todas</option><option value="custom"${ui.fonte === "custom" ? " selected" : ""}>Meus</option><option value="base"${ui.fonte === "base" ? " selected" : ""}>SRD</option>${hfOn() ? `<option value="hf"${ui.fonte === "hf" ? " selected" : ""}>Hope & Fear</option>` : ""}</select></label></div>
  <div class="acts" style="margin:12px 0 0"><a class="btn hope" href="#/mestre/adversario/novo">${icon("plus")} Criar adversário</a></div>` : ""}
  <div id="liv" style="margin-top:14px">${listaBib()}</div>`;
}
function listaBib() {
  const q = norm(ui.q);
  if (ui.livro === "amb") {
    const l = ambientes().filter(e => !q || norm(e.name + " " + (e.desc || "") + " " + (e.adv || "")).includes(q)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    return `<p class="muted small">${l.length} ambiente${l.length === 1 ? "" : "s"}</p><div class="grid3">${l.map(e => `<button class="res" style="margin:0" data-act="verenv" data-n="${esc(e.name)}"><div class="k">Patamar ${e.tier} · ${esc(e.type || "")} ${e.src === "hf" ? `<span class="tag exp">H&F</span>` : ""}</div><div class="t">${esc(e.name)}</div><div class="s">${esc(e.desc || "")}</div></button>`).join("")}</div>`;
  }
  const l = adversarios().filter(a => (!ui.tipo || a.type === ui.tipo) && (!ui.tier || a.tier === +ui.tier) && (!ui.cat || a.cat === ui.cat) && (!ui.fonte || a.src === ui.fonte) && (!q || norm(a.name + " " + (a.mot || "") + " " + (a.desc || "") + " " + (a.f || []).map(f => f.n).join(" ")).includes(q))).sort((a, b) => a.tier - b.tier || a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  return `<p class="muted small">${l.length} adversário${l.length === 1 ? "" : "s"}</p><div class="grid3">${l.slice(0, 150).map(a => `<button class="res" style="margin:0" data-act="verladv" data-n="${esc(a.name)}" data-s="${a.src}"><div class="k">${esc(tipoTag(a))} ${fonteTag(a)}</div><div class="t">${esc(a.name)}</div><div class="s">Dif ${esc(a.dif)} · PV ${esc(a.hp)} · ${esc(a.wpn)} ${esc(dmgPT(a.dmg))}</div></button>`).join("")}</div>${l.length > 150 ? `<p class="muted">Mostrando 150. Use os filtros.</p>` : ""}`;
}
function verAdv(a) {
  const custom = a.src === "custom";
  const w = openSheet(statBlock(a, { acts: `<div class="acts"><button class="btn hope" data-x="add">${icon("plus")} Adicionar à batalha</button>${custom ? `<a class="btn" href="#/mestre/adversario/${a.id}" data-close>Editar</a>` : `<a class="btn" href="#/mestre/adversario/novo?base=${encodeURIComponent(a.name)}" data-close>Criar variação</a>`}</div>` }), { title: a.name, wide: true });
  w.querySelector('[data-x="add"]').addEventListener("click", () => { closeSheet(); escolherBatalha(a); });
}

// ---------- Geradores ----------
function abaGeradores() {
  const g = ui.gen, rc = ui.rc, it = ui.it;
  const temas = [["qualquer", "Qualquer tema"], ...CATS];
  const mesasMinhas = S.mesas.filter(m => user() && m.mestre === user().id);
  return `<section class="card"><h3>Batalha pronta</h3><p class="muted small" style="margin:2px 0 10px">Sorteia adversários dentro do orçamento de Pontos de Batalha do livro.</p>
    <div class="grid3"><label class="f">Tema<select data-ch="rc" data-f="tema">${temas.map(([k, n]) => `<option value="${k}"${k === rc.tema ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="f">Patamar<select data-ch="rc" data-f="tier">${[1, 2, 3, 4].map(t => `<option${t === rc.tier ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="f">Jogadores<input type="number" min="1" max="8" value="${rc.jog}" data-in="rc" data-f="jog" data-k="rcj"></label>
      <label class="f">Dificuldade<select data-ch="rc" data-f="adj"><option value="-1"${rc.adj === -1 ? " selected" : ""}>Mais fácil</option><option value="0"${rc.adj === 0 ? " selected" : ""}>Padrão</option><option value="2"${rc.adj === 2 ? " selected" : ""}>Mais difícil</option></select></label></div>
    <div class="acts"><button class="btn hope" data-act="rcgen">Sortear batalha</button></div>
    ${ui.rcRes ? `<div style="margin-top:12px">${barraOrc(ui.rcRes)}${agrupar(ui.rcRes).map(([n, k, u]) => `<div class="inv-row"><div class="grow"><b>${k > 1 ? k + "× " : ""}${esc(u.ref)}</b><div class="muted small">${esc(tipoTag(u))} · Dif ${esc(u.dif)} · PV ${u.hpMax}</div></div></div>`).join("")}
      <div class="acts"><button class="btn" data-act="rcgen">Sortear outra</button><button class="btn hope" data-act="rcuse">${icon("sword")} Criar esta batalha</button></div></div>` : ""}</section>

  <section class="card"><h3>Adversário aleatório</h3><p class="muted small" style="margin:2px 0 10px">Números de um adversário do SRD do mesmo tipo e patamar, habilidades sorteadas do mesmo grupo.</p>
    <div class="row"><label class="f">Tipo<select data-ch="gt">${TIPOS.map(t => `<option value="${t}"${t === ui.gt ? " selected" : ""}>${TIPO_PT[t]}</option>`).join("")}</select></label><label class="f">Patamar<select data-ch="gp">${[1, 2, 3, 4].map(t => `<option${t === ui.gp ? " selected" : ""}>${t}</option>`).join("")}</select></label><button class="btn hope" data-act="gen" style="align-self:end">Gerar</button></div>
    ${g ? `<div style="margin-top:12px">${statBlock({ ...g, src: "custom" }, { acts: `<div class="acts"><button class="btn hope" data-act="gsave">${icon("plus")} Salvar e editar</button><button class="btn" data-act="gadd">Adicionar a uma batalha</button></div>` })}</div>` : ""}</section>

  <section class="card"><h3>Complicação</h3><div class="row"><label class="f">Tema<select data-ch="cc">${[["geral", "Geral"], ...CATS].map(([k, n]) => `<option value="${k}"${k === ui.compCat ? " selected" : ""}>${n}</option>`).join("")}</select></label><button class="btn hope" data-act="comp" style="align-self:end">Sortear</button></div>
    ${ui.comp ? `<div class="note" style="margin-top:10px">${esc(ui.comp)}</div>` : ""}</section>

  <section class="card"><h3>Item de tesouro</h3><div class="row"><label class="f">Categoria<select data-ch="ic">${["Arma", "Armadura", "Consumível", "Item"].map(c => `<option${c === ui.itCat ? " selected" : ""}>${c}</option>`).join("")}</select></label>
    ${ui.itCat === "Arma" || ui.itCat === "Armadura" ? `<label class="f">Patamar<select data-ch="it"><option value="">Qualquer</option>${[1, 2, 3, 4].map(t => `<option${String(t) === String(ui.itTier) ? " selected" : ""}>${t}</option>`).join("")}</select></label>` : ""}
    <button class="btn hope" data-act="itgen" style="align-self:end">Sortear</button></div>
    ${it ? `<div class="card" style="margin-top:12px;background:var(--surface-2)">${itemHtml(it)}</div>` : ""}</section>`;
}
function agrupar(b) { const g = []; b.unidades.forEach(u => { const x = g.find(y => y[2].ref === u.ref); x ? x[1]++ : g.push([u.ref, 1, u]); }); return g; }
function itemHtml(it) {
  const k = it.k, o = loc(k, it.x);
  if (k === "weapons") return `<div class="eyebrow">Arma · Patamar ${o.t}</div><h3>${esc(o.n)}</h3><div class="kv"><span><b>${esc(T(o.tr))}</b></span><span>${esc(T(o.rng))}</span><span><b>${esc(dmgPT(o.dmg))}</b></span><span>${esc(T(o.bur))}</span></div>${(o.f || []).map(f => `<p class="small"><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}`;
  if (k === "armor") return `<div class="eyebrow">Armadura · Patamar ${o.t}</div><h3>${esc(o.n)}</h3><div class="kv"><span>Armadura <b>${esc(o.sc)}</b></span><span>Limiares <b>${esc(o.th)}</b></span></div>${(o.f || []).map(f => `<p class="small"><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}`;
  return `<div class="eyebrow">${k === "consumables" ? "Consumível" : "Item"}</div><h3>${esc(o.n)}</h3><p class="small">${md(o.x)}</p>`;
}

// ---------- Notas ----------
function abaNotas() {
  return `<div class="acts" style="margin:0 0 14px"><button class="btn hope" data-act="notanova">${icon("plus")} Nova nota</button></div>
  ${GM.notas.length ? GM.notas.map(n => `<details class="track fold"><summary><h3>${esc(n.title || "Sem título")}</h3></summary><div class="tx">${mdBlock(n.body)}</div><div class="acts"><button class="btn sm" data-act="notaed" data-id="${n.id}">Editar</button><button class="btn sm ghost danger" data-act="notadel" data-id="${n.id}">Excluir</button></div></details>`).join("") : `<div class="empty"><h3>Sem notas</h3><p>Use para a visão geral do mundo, facções, linha do tempo e segredos do mestre.</p></div>`}`;
}
function editarNota(id) {
  const n = GM.notas.find(x => x.id === id) || { id: null, title: "", body: "" };
  const w = openSheet(`<label class="f">Título<input type="text" id="nt" value="${esc(n.title)}"></label><label class="f" style="margin-top:10px">Texto (aceita **negrito**, _itálico_ e listas com -)<textarea id="nb" style="min-height:220px">${esc(n.body)}</textarea></label><div class="acts"><button class="btn hope" id="nok">Salvar</button></div>`, { title: n.id ? "Editar nota" : "Nova nota", wide: true });
  w.querySelector("#nok").addEventListener("click", () => { const t = w.querySelector("#nt").value.trim() || "Sem título", b = w.querySelector("#nb").value; if (n.id) { n.title = t; n.body = b; } else GM.notas.unshift({ id: uid(), title: t, body: b }); salvarGM(); closeSheet(); app.render(true); });
}

// ---------- Ajuda: formato da cena complexa ----------
function ajudaCena() {
  const ex = EXEMPLO_CENA ? JSON.stringify(EXEMPLO_CENA, null, 2) : "";
  return `<section class="card" id="ajuda-cena" style="margin-top:12px"><h3>Cena complexa: o formato</h3>
    <p class="muted small" style="margin-top:2px">Para momentos de tensão que não são combate (perseguição, infiltração, ritual). A cena é movida por <b>Contadores em disputa</b> e por uma tabela de resultados ligada aos dados de dualidade. Adversários são opcionais. O <code>formato</code> continua sendo <code>daggerheart-batalha</code>; o tipo vem no campo <code>tipo</code>.</p>
    <ul class="small" style="padding-left:1.2em;margin:8px 0">
      <li><b>Cabeçalho:</b> <code>"versao": 2</code> e <code>"tipo": "cena"</code>. JSON de batalha (versão 1, ou sem <code>tipo</code>) continua funcionando igual.</li>
      <li><b>Obrigatórios:</b> <code>nome</code>, <code>objetivo</code>, <code>contagens</code> (pelo menos 1, com <code>nome</code>, <code>caixas</code> e <code>lado</code> “jogadores” ou “mestre”), <code>resultados</code> (as 5 chaves: <code>critico</code>, <code>sucesso_esperanca</code>, <code>sucesso_medo</code>, <code>falha_esperanca</code>, <code>falha_medo</code>, cada uma com <code>texto</code> e <code>efeitos</code>) e <code>fim.vitoria</code>.</li>
      <li><b>Efeitos:</b> <code>{ "contagem": "Fuga", "delta": 1 }</code>. Positivo marca caixas, negativo apaga; nunca passa do total nem fica abaixo de 0. Todo nome de contagem citado precisa existir em <code>contagens</code>.</li>
      <li><b>Opcionais:</b> <code>medo</code> (jogadas do mestre com <code>custo</code> e <code>limite</code> “rodada” ou “cena”), <code>jogadores_usos</code> (Esperança ou Estresse), <code>gatilhos</code> (<code>quando</code>, <code>uma_vez</code>), <code>fim.derrota</code>, <code>fim.empate</code>, <code>ambiente</code>, <code>adversarios</code> (mesmo formato da batalha), <code>ciclo</code>, <code>dificuldade_rolagem</code>, <code>notas</code>, <code>recompensas</code> e <code>lembretes</code> (o que não esquecer: <code>titulo</code>, <code>texto</code>, <code>tipo</code> “obrigatorio”, “condicao” ou “geral”, <code>adversario</code>).</li>
      <li><b>Na mesa:</b> toque no resultado da rolagem para aplicar os efeitos. Resultados “com Medo” somam +1 ao Medo do mestre (dá para desligar nas opções da cena). Gatilhos viram alertas; o fim aparece quando a contagem de vitória ou de derrota enche. Dá para desfazer a última ação e ver tudo no log.</li>
      <li><b>Nome:</b> use “Sessão N · Nome da sessão · Título” e a lista fica em ordem de sessão.</li>
      <li><b>Vários blocos:</b> cole a resposta inteira; cada bloco JSON vira uma batalha ou uma cena.</li></ul>
    ${ex ? `<details class="more"><summary>Ver o exemplo completo (Fuga pelos Telhados)</summary><pre class="code-block help-code">${esc(ex)}</pre></details>
    <div class="acts"><button class="btn sm" data-act="cpcena">${icon("copy")} Copiar exemplo</button><button class="btn sm ghost" data-act="tstcena">Testar no importador</button></div>` : ""}</section>`;
}

// ---------- Conectar IA ----------
function abaIA() {
  return `<section class="card"><h3>Como funciona</h3>
    <ol class="steps"><li><b>Configure o projeto uma vez.</b> Cole as instruções abaixo nas instruções do seu projeto do Claude e adicione o catálogo como arquivo do projeto.</li>
    <li><b>Peça a batalha.</b> Ex.: “Monte a emboscada na ponte para 4 jogadores de nível 2”. O Claude responde com a cena e um bloco JSON.</li>
    <li><b>Importe aqui.</b> Copie a resposta, abra <a href="#/mestre/importar">Importar da IA</a>, cole e confira. A batalha aparece pronta, com todos os adversários, inclusive os que o Claude inventou.</li></ol>
    <div class="acts"><a class="btn hope" href="#/mestre/importar">${icon("sparkle")} Importar da IA</a></div></section>
  <section class="card" style="margin-top:12px"><h3>1. Instruções do projeto</h3><p class="muted small">Explica o formato, as regras de orçamento e os parâmetros por patamar.</p>
    <div class="acts"><button class="btn" data-act="cpinst">${icon("copy")} Copiar instruções</button><button class="btn" data-act="dlinst">Baixar .md</button></div></section>
  <section class="card" style="margin-top:12px"><h3>2. Catálogo de adversários</h3><p class="muted small">Lista com nome, patamar, tipo e números de ${adversarios().filter(a => a.src !== "custom").length} adversários e ${ambientes().length} ambientes${hfOn() ? ", incluindo a expansão Hope & Fear" : ""}. Anexe ao projeto como conhecimento; se mudar a opção da expansão, baixe de novo.</p>
    <div class="acts"><button class="btn" data-act="dlcat">Baixar catálogo .md</button></div></section>
  <section class="card" style="margin-top:12px"><h3>Exemplo de resposta</h3><pre class="code-block">${esc(JSON.stringify(EXEMPLO_JSON, null, 2))}</pre><div class="acts"><button class="btn sm" data-act="cpex">${icon("copy")} Copiar exemplo</button><button class="btn sm ghost" data-act="tstex">Testar no importador</button></div></section>
  ${ajudaCena()}`;
}
function baixar(nome, txt, tipo = "text/markdown") { const b = new Blob([txt], { type: tipo + ";charset=utf-8" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); }
const copiar = (t, m) => navigator.clipboard.writeText(t).then(() => toast(m), () => toast("O navegador bloqueou a cópia"));

// ---------- Migração do Mesa do Mestre antigo ----------
let antigoCache;
async function lerAntigo() {
  if (antigoCache !== undefined) return antigoCache;
  let S0 = store.get("mesa-mestre-dh-v1", null);
  if (sb && user()) { try { const { data } = await sb.from("estados").select("data").eq("user_id", user().id).maybeSingle(); const r = data && data.data && data.data.S; if (r && (!S0 || (r.ts || 0) > (S0.ts || 0))) S0 = r; } catch {} }
  antigoCache = S0 && S0.camps ? S0 : null;
  return antigoCache;
}
function resumoAntigo(o) { const bs = o.camps.filter(c => c.combat && c.combat.list && c.combat.list.length).length; return { cus: (o.custom || []).length, bat: bs, lore: o.camps.reduce((s, c) => s + (c.lore || []).length, 0) }; }
function antigoAviso() {
  if (GM.migrado || !antigoCache) return "";
  const r = resumoAntigo(antigoCache);
  if (!r.cus && !r.bat && !r.lore) return "";
  return `<div class="note" style="margin-bottom:14px"><b>Dados da versão antiga encontrados:</b> ${r.cus} adversário(s) criado(s), ${r.bat} combate(s) e ${r.lore} nota(s) de lore. <div class="acts" style="margin-top:8px"><button class="btn sm hope" data-act="migrar">Importar para cá</button><button class="btn sm ghost" data-act="ignorar">Ignorar</button></div></div>`;
}
function migrar() {
  const o = antigoCache; let c = 0, b = 0, n = 0;
  (o.custom || []).forEach(a => { if (!GM.custom.some(x => norm(x.name) === norm(a.name))) { GM.custom.push({ id: uid(), name: a.name, tier: a.tier, type: a.type, horde: a.horde || "", desc: a.desc || "", mot: a.mot || "", dif: String(a.dif), th: a.th, hp: String(a.hp), st: String(a.st), atk: a.atk, wpn: a.wpn, rng: a.rng, dmg: a.dmg, xp: a.xp || "", al: [a.name], f: (a.f || []).map(f => ({ n: f.n, k: f.k || "", t: f.pt || f.t })), cat: "" }); c++; } });
  o.camps.forEach(camp => {
    const cb = camp.combat;
    if (cb && cb.list && cb.list.length) {
      const bt = novaBatalha({ nome: camp.name + ": combate salvo", jogadores: cb.players || 4, ajuste: cb.adjust || 0, notas: cb.notes || "" });
      bt.medo = cb.fear || 0; bt.status = "ativa"; bt.proxNum = cb.nextNum || cb.list.length + 1;
      bt.unidades = cb.list.map(x => ({ ...x, ref: x.src || x.name, horde: x.horde || "" }));
      bt.contagens = (cb.cds || []).map(d => ({ id: d.id || uid(), n: d.n, size: d.size, val: d.val }));
      GM.batalhas.push(bt); b++;
    }
    (camp.lore || []).forEach(l => { GM.notas.push({ id: uid(), title: `${camp.name}: ${l.title}`, body: l.body || "" }); n++; });
  });
  GM.migrado = true; salvarGM(); toast(`Importado: ${c} adversário(s), ${b} combate(s), ${n} nota(s)`); app.render(true);
}

// ---------- Eventos ----------
export async function on(a, el, ev) {
  const mod = modulo(location.hash.replace(/^#\/?mestre\/?/, "").split("/").map(decodeURIComponent));
  if (mod) return mod.on(a, el, ev);
  const id = el.dataset.id;
  switch (a) {
    case "aba": ui.aba = el.dataset.v; history.replaceState(null, "", "#/mestre?aba=" + ui.aba); if (ui.aba === "batalhas") lerAntigo().then(() => app.render(true)); app.render(true); return;
    case "nova": {
      const mesas = S.mesas.filter(m => user() && m.mestre === user().id);
      const w = openSheet(`<label class="f">Nome<input type="text" id="bn" placeholder="Ex.: Emboscada na ponte"></label><div class="grid2" style="margin-top:10px"><label class="f">Jogadores<input type="number" id="bj" min="1" max="8" value="4"></label><label class="f">Mesa<select id="bm"><option value="">Nenhuma</option>${mesas.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join("")}</select></label></div><div class="acts"><button class="btn hope" id="bok">Criar e abrir</button></div>`, { title: "Nova batalha" });
      w.querySelector("#bm").addEventListener("change", e => { if (e.target.value) { const n = fichasDaMesa(e.target.value).length; if (n) w.querySelector("#bj").value = Math.min(8, n); } });
      w.querySelector("#bok").addEventListener("click", () => { const b = novaBatalha({ nome: w.querySelector("#bn").value.trim() || "Nova batalha", jogadores: Math.max(1, parseInt(w.querySelector("#bj").value, 10) || 4), mesa: w.querySelector("#bm").value || null }); salvarBatalha(b); closeSheet(); location.hash = "#/mestre/batalha/" + b.id; });
      return;
    }
    case "ftipo": ui.ft = el.dataset.v; app.render(true); return;
    case "migrar": migrar(); return;
    case "ignorar": GM.migrado = true; salvarGM(); app.render(true); return;
    case "livro": ui.livro = el.dataset.v; ui.q = ""; app.render(true); return;
    case "verladv": { const x = adversarios().find(y => y.name === el.dataset.n && y.src === el.dataset.s); if (x) verAdv(x); return; }
    case "verenv": { const e = ambientes().find(x => x.name === el.dataset.n); if (e) openSheet(envBlock(e), { title: e.name, wide: true }); return; }
    case "rcgen": ui.rcRes = gerarBatalha({ tema: ui.rc.tema, tier: ui.rc.tier, jogadores: ui.rc.jog, ajuste: ui.rc.adj }); break;
    case "rcuse": { const b = ui.rcRes; b.nome = `Batalha de patamar ${ui.rc.tier}`; salvarBatalha(b); ui.rcRes = null; location.hash = "#/mestre/batalha/" + b.id; return; }
    case "gen": ui.gen = gerarAdversario(ui.gt, ui.gp); break;
    case "gsave": { const x = { ...ui.gen, al: [ui.gen.name], src: undefined }; delete x.baseTier; GM.custom.unshift(x); salvarGM(); location.hash = "#/mestre/adversario/" + x.id; return; }
    case "gadd": escolherBatalha({ ...ui.gen, src: "custom" }); return;
    case "comp": ui.comp = sortear(COMPLICACOES[ui.compCat]); break;
    case "itgen": { const k = { Arma: "weapons", Armadura: "armor", "Consumível": "consumables", Item: "items" }[ui.itCat]; let l = list(k); if (ui.itTier && (k === "weapons" || k === "armor")) l = l.filter(x => x.t === +ui.itTier); if (l.length) ui.it = { k, x: sortear(l) }; break; }
    case "notanova": editarNota(null); return;
    case "notaed": editarNota(id); return;
    case "notadel": if (await confirmar("Excluir esta nota?", { ok: "Excluir", perigo: true })) { GM.notas = GM.notas.filter(n => n.id !== id); salvarGM(); app.render(true); } return;
    case "cpinst": copiar(instrucoesIA(), "Instruções copiadas: cole no projeto do Claude"); return;
    case "dlinst": baixar("instrucoes-batalhas-daggerheart.md", instrucoesIA()); return;
    case "dlcat": baixar("catalogo-adversarios-daggerheart.md", catalogoMD()); return;
    case "cpex": copiar(JSON.stringify(EXEMPLO_JSON, null, 2), "Exemplo copiado"); return;
    case "cpcena": copiar(JSON.stringify(EXEMPLO_CENA, null, 2), "Exemplo copiado"); return;
    case "tstcena": Importar.preencher("```json\n" + JSON.stringify(EXEMPLO_CENA, null, 2) + "\n```"); location.hash = "#/mestre/importar"; return;
    case "tstex": Importar.preencher(JSON.stringify(EXEMPLO_JSON, null, 2)); location.hash = "#/mestre/importar"; return;
  }
  app.render(true);
}
export function input(k, el) {
  const mod = modulo(location.hash.replace(/^#\/?mestre\/?/, "").split("/"));
  if (mod) return mod.input(k, el);
  if (k === "bq") { ui.bq = el.value; const l = document.getElementById("lreg"); if (l) l.innerHTML = listaRegistros(); return; }
  if (k === "q") { ui.q = el.value; atualiza(); }
  if (k === "rc") ui.rc[el.dataset.f] = parseInt(el.value, 10) || 1;
}
const atualiza = debounce(() => { const el = document.getElementById("liv"); if (el) el.innerHTML = listaBib(); }, 150);
export function change(k, el) {
  const mod = modulo(location.hash.replace(/^#\/?mestre\/?/, "").split("/"));
  if (mod) return mod.change(k, el);
  if (k === "f") ui[el.dataset.f] = el.value;
  else if (k === "rc") ui.rc[el.dataset.f] = el.dataset.f === "tema" ? el.value : parseInt(el.value, 10);
  else if (k === "gt") ui.gt = el.value;
  else if (k === "gp") ui.gp = +el.value;
  else if (k === "cc") ui.compCat = el.value;
  else if (k === "ic") { ui.itCat = el.value; ui.it = null; }
  else if (k === "it") ui.itTier = el.value;
  app.render(true);
}
// carrega dados antigos ao abrir o hub
lerAntigo().then(() => { if (location.hash.startsWith("#/mestre")) app.render(true); });
