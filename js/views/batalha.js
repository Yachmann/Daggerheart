// Execução da batalha: tudo preparado, o mestre só conduz. Dados privados do mestre.
import { esc, md, mdBlock, icon, uid, toast, confirmar, openSheet, closeSheet, clamp, $ } from "../util.js";
import { T, dmgPT, nome } from "../data.js";
import { GM, achaBatalha, salvarGM, adicionar, adversarios, orcamento, pvPorDano, CONDICOES, AMBIENTE_ACOES, sortear, TIPO_PT, novaUnidade, KIND_PT } from "../gm.js";
import { S, user, fichasDaMesa } from "../store.js";
import { deriv } from "../calc.js";
import { app } from "../main.js";
import { statBlock, envBlock, pipsU, tipoTag, kindTag, escolherBatalha, barraOrc, fonteTag } from "./mestre-ui.js";
import { voltar, condFx, condBanner } from "./common.js";

let ID = null, painel = { prep: false, grupo: true, ambiente: false, notas: false };
export const ouve = m => m.startsWith("ficha:");
const B = () => achaBatalha(ID);
const U = id => B().unidades.find(u => u.id === id);
const ed = fn => { fn(B()); salvarGM(); app.render(true); };
const edQuiet = fn => { fn(B()); salvarGM(); };

const CONDCLS = { Vulnerável: "vuln", Contido: "restr", Oculto: "hide" };
const STATUS = { prep: ["Em preparação", ""], ativa: ["Em andamento", "hope"], fim: ["Encerrada", "muted"] };

function cartaoUnidade(x) {
  const morto = x.hp >= x.hpMax, minion = x.type === "Minion";
  const fx = condFx(x.cond);
  return `<article class="ucard${morto ? " dead" : ""}${fx.cls} ty-${esc(x.type)}" style="${fx.style}">
    <div class="uc-h">
      <span class="numb" title="Mesmo número do marcador na mesa">${x.num}</span>
      <div class="uc-id">
        <input class="uc-name" data-in="uname" data-id="${x.id}" data-k="un${x.id}" value="${esc(x.name)}" aria-label="Nome">
        <input class="uc-desc" data-in="udesc" data-id="${x.id}" data-k="ud${x.id}" value="${esc(x.desc || "")}" placeholder="Nota rápida (ex.: o do capuz vermelho)" aria-label="Nota rápida">
      </div>
      <button class="icon-btn" data-act="umenu" data-id="${x.id}" aria-label="Mais opções">⋯</button>
    </div>
    <div class="uc-tags"><span class="tag">${esc(tipoTag(x))}</span><span class="tag ${morto ? "dead" : "hope"}">${morto ? "Derrotado" : "Em combate"}</span></div>
    ${condBanner(x.cond, "ele")}
    <div class="uc-trk"><span class="lb">PV</span><div class="pips pv">${pipsU(x.hpMax, x.hp, "uhp", x.id)}</div></div>
    ${x.stMax ? `<div class="uc-trk"><span class="lb">Estresse</span><div class="pips es">${pipsU(x.stMax, x.st, "ust", x.id)}</div></div>` : ""}
    <div class="cond-row">${CONDICOES.map(c => `<button class="chip ${CONDCLS[c]}${x.cond.includes(c) ? " on" : ""}" data-act="ucond" data-id="${x.id}" data-c="${c}" aria-pressed="${x.cond.includes(c)}">${c}</button>`).join("")}${x.cond.filter(c => !CONDICOES.includes(c)).map(c => `<button class="chip on" data-act="ucond" data-id="${x.id}" data-c="${esc(c)}">${esc(c)} ✕</button>`).join("")}</div>
    <div class="uc-quick"><span>Dif <b>${esc(x.dif)}</b></span><span>Limiares <b>${x.maj ?? "–"}/${x.sev ?? "–"}</b></span><span>${esc(x.atk)} <b>${esc(x.wpn)}</b></span><span>${esc(T(x.rng))}</span><span><b>${esc(dmgPT(x.dmg))}</b></span></div>
    ${minion ? `<div class="acts" style="margin-top:8px"><button class="btn sm" data-act="udie" data-id="${x.id}">Derrotar (qualquer dano)</button></div>`
      : `<div class="dmg-box"><input type="number" inputmode="numeric" min="0" placeholder="Dano recebido" data-in="udmg" data-id="${x.id}" data-k="dm${x.id}" aria-label="Dano recebido"><button class="btn fear" data-act="udmg" data-id="${x.id}">Aplicar</button></div>`}
    <button class="more-btn" data-act="uopen" data-id="${x.id}" aria-expanded="${!!x.open}">${x.open ? "Ocultar" : "Habilidades"} (${x.f.length}) ${icon("chev", x.open ? "rot" : "")}</button>
    ${x.open ? `<div class="uc-more">${x.xp ? `<p><b>Experiência:</b> ${esc(x.xp)}</p>` : ""}${x.mot ? `<p><b>Motivações:</b> ${esc(x.mot)}</p>` : ""}
      ${x.f.map(f => `<div class="feat"><div class="feat-h"><b>${esc(f.n)}</b> ${kindTag(f.k)}</div><div class="tx">${mdBlock(f.t)}</div></div>`).join("")}
      <label class="f" style="margin-top:8px">Anotações<textarea data-in="unotes" data-id="${x.id}" data-k="uo${x.id}">${esc(x.notes || "")}</textarea></label></div>` : ""}
  </article>`;
}

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

export function html(p) {
  ID = p[1];
  const b = B();
  if (!b) return `<div class="empty"><h3>Batalha não encontrada</h3><a class="btn" href="#/mestre">Voltar</a></div>`;
  const o = orcamento(b), st = STATUS[b.status] || STATUS.prep, vivos = b.unidades.filter(u => u.hp < u.hpMax).length;
  let tok = "";
  for (let i = 0; i < 12; i++) tok += `<button class="tok${i < b.medo ? " on" : ""}" data-act="medo" data-i="${i}" aria-label="Medo ${i + 1}" aria-pressed="${i < b.medo}"></button>`;
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

  <div class="fear-bar"><h3>Medo</h3><span class="cnt">${b.medo}/12</span><div class="tokens">${tok}</div>
    <span class="step-btns"><button class="btn sm" data-act="medod" data-v="-1" aria-label="Gastar 1 Medo">−1</button><button class="btn sm fear" data-act="medod" data-v="1" aria-label="Ganhar 1 Medo">+1</button></span></div>

  ${b.contagens.length || true ? `<div class="track"><div class="track-h"><h3>Contagens regressivas</h3><button class="btn sm ghost" data-act="cdnova">${icon("plus")} Nova</button></div>
    ${b.contagens.map(c => `<div class="cd"><div class="grow"><b>${esc(c.n)}</b></div><div class="pips">${pipsU(c.size, c.val, "cdp", c.id)}</div><button class="icon-btn" data-act="cddel" data-id="${c.id}" aria-label="Remover">${icon("trash")}</button></div>`).join("") || `<p class="muted small" style="margin:0">Use para rituais, reforços ou pontes que caem. Marque uma caixa a cada tique.</p>`}</div>` : ""}

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

  <div class="sec-line"><h2>Adversários</h2><button class="btn sm" data-act="addadv">${icon("plus")} Adicionar</button></div>
  ${b.unidades.length ? `<div class="ucards">${b.unidades.map(cartaoUnidade).join("")}</div>` : `<div class="empty"><h3>Ninguém aqui ainda</h3><p>Adicione adversários da biblioteca ou crie um do zero.</p><div class="acts" style="justify-content:center"><button class="btn hope" data-act="addadv">${icon("plus")} Adicionar adversário</button><a class="btn" href="#/mestre/adversario/novo">Criar do zero</a></div></div>`}`;
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

function menuUnidade(id) {
  const u = U(id);
  const w = openSheet(`<div class="acts" style="margin-top:0"><button class="btn" id="ud">Duplicar</button><button class="btn" id="ur">Restaurar PV e Estresse</button><button class="btn" id="uc">Condição personalizada</button><button class="btn danger" id="ux">${icon("trash")} Remover</button></div>
    <div class="divider"></div>${statBlock({ name: u.name, tier: u.tier, type: u.type, horde: u.horde, desc: "", dif: u.dif, th: `${u.maj ?? "None"}/${u.sev ?? ""}`, hp: u.hpMax, st: u.stMax, atk: u.atk, wpn: u.wpn, rng: u.rng, dmg: u.dmg, xp: u.xp, mot: u.mot, f: u.f })}`, { title: u.name });
  w.querySelector("#ud").addEventListener("click", () => { ed(b => { const c = JSON.parse(JSON.stringify(u)); c.id = uid(); c.num = b.proxNum++; c.hp = 0; c.st = 0; c.cond = []; c.name = u.name.replace(/ \d+$/, "") + " " + (b.unidades.filter(x => x.ref === u.ref).length + 1); b.unidades.splice(b.unidades.indexOf(u) + 1, 0, c); }); closeSheet(); toast("Duplicado"); });
  w.querySelector("#ur").addEventListener("click", () => { ed(() => { u.hp = 0; u.st = 0; u.cond = []; }); closeSheet(); });
  w.querySelector("#uc").addEventListener("click", () => { closeSheet(); const w2 = openSheet(`<label class="f">Condição<input type="text" id="cn" placeholder="Ex.: Atordoado"></label><div class="acts"><button class="btn hope" id="cok">Adicionar</button></div>`, { title: "Nova condição" }); w2.querySelector("#cok").addEventListener("click", () => { const v = w2.querySelector("#cn").value.trim(); if (v) ed(() => u.cond.push(v)); closeSheet(); }); });
  w.querySelector("#ux").addEventListener("click", async () => { closeSheet(); if (await confirmar(`Remover ${u.name} da batalha?`, { ok: "Remover", perigo: true })) ed(b => { b.unidades = b.unidades.filter(x => x.id !== id); }); });
}

function sheetAdicionar() {
  let q = "", tipo = "", tier = "";
  const todos = adversarios();
  const w = openSheet("", { title: "Adicionar adversário", wide: true });
  const body = w.querySelector(".sheet-body");
  const lista = () => {
    const n = q.trim().toLowerCase();
    const l = todos.filter(a => (!tipo || a.type === tipo) && (!tier || a.tier === +tier) && (!n || a.name.toLowerCase().includes(n) || (a.mot || "").toLowerCase().includes(n))).slice(0, 60);
    body.querySelector("#adl").innerHTML = l.map(a => `<button class="res" data-n="${esc(a.name)}" data-s="${a.src}"><div class="k">${esc(tipoTag(a))} ${fonteTag(a)}</div><div class="t">${esc(a.name)}</div><div class="s">Dif ${esc(a.dif)} · PV ${esc(a.hp)} · ${esc(a.wpn)} ${esc(dmgPT(a.dmg))}</div></button>`).join("") || `<p class="muted">Nenhum resultado.</p>`;
  };
  body.innerHTML = `<div class="row"><label class="f" style="flex:2">Buscar<input type="search" id="adq" placeholder="Nome ou tática…"></label>
    <label class="f">Tipo<select id="adt"><option value="">Todos</option>${Object.entries(TIPO_PT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
    <label class="f">Patamar<select id="adp"><option value="">Todos</option>${[1, 2, 3, 4].map(t => `<option>${t}</option>`).join("")}</select></label></div>
    <div id="adl" style="margin-top:8px"></div><div class="acts"><a class="btn" href="#/mestre/adversario/novo" data-close>Criar adversário do zero</a></div>`;
  lista();
  body.querySelector("#adq").addEventListener("input", e => { q = e.target.value; lista(); });
  body.querySelector("#adt").addEventListener("change", e => { tipo = e.target.value; lista(); });
  body.querySelector("#adp").addEventListener("change", e => { tier = e.target.value; lista(); });
  body.querySelector("#adl").addEventListener("click", e => {
    const r = e.target.closest("[data-n]"); if (!r) return;
    const a = todos.find(x => x.name === r.dataset.n && x.src === r.dataset.s);
    closeSheet();
    const w2 = openSheet(`${statBlock(a, { compact: true })}<label class="f" style="margin-top:12px">Quantos<input type="number" id="aq" min="1" max="30" value="${a.type === "Minion" ? Math.max(1, B().jogadores) : 1}"></label>
      <div class="acts"><button class="btn hope" id="aok">${icon("plus")} Adicionar à batalha</button><button class="btn ghost" id="aver">Ver habilidades</button></div>`, { title: a.name });
    w2.querySelector("#aok").addEventListener("click", () => { const n = parseInt(w2.querySelector("#aq").value, 10) || 1; ed(b => adicionar(b, a, n)); closeSheet(); toast(`${n > 1 ? n + "× " : ""}${a.name} adicionado`); });
    w2.querySelector("#aver").addEventListener("click", () => { w2.querySelector(".sheet-body").insertAdjacentHTML("afterbegin", statBlock(a)); w2.querySelector("#aver").remove(); });
  });
}

export function on(a, el) {
  const b = B(); if (!b) return;
  const id = el.dataset.id, i = +el.dataset.i;
  switch (a) {
    case "iniciar": ed(x => { x.status = "ativa"; }); toast("Batalha iniciada"); return;
    case "encerrar": ed(x => { x.status = "fim"; }); return;
    case "reabrir": ed(x => { x.status = "ativa"; }); return;
    case "bmenu": menuBatalha(); return;
    case "medo": ed(x => { x.medo = x.medo === i + 1 ? i : i + 1; }); return;
    case "medod": ed(x => { x.medo = clamp(x.medo + +el.dataset.v, 0, 12); }); return;
    case "uhp": ed(() => { const u = U(id); u.hp = u.hp === i + 1 ? i : i + 1; }); return;
    case "ust": ed(() => { const u = U(id); u.st = u.st === i + 1 ? i : i + 1; }); return;
    case "ucond": ed(() => { const u = U(id), c = el.dataset.c, k = u.cond.indexOf(c); k >= 0 ? u.cond.splice(k, 1) : u.cond.push(c); }); return;
    case "udie": ed(() => { const u = U(id); u.hp = u.hpMax; }); return;
    case "udmg": {
      const inp = document.querySelector(`[data-k="dm${id}"]`), d = parseInt(inp && inp.value, 10);
      if (!(d > 0)) { toast("Digite o dano"); return; }
      const u = U(id), n = pvPorDano(u, d);
      ed(() => { u.hp = Math.min(u.hpMax, u.hp + n); });
      toast(`${d} de dano: ${n} PV marcado${n !== 1 ? "s" : ""}${u.hp >= u.hpMax ? " · derrotado" : ""}`); return;
    }
    case "uopen": ed(() => { const u = U(id); u.open = !u.open; }); return;
    case "umenu": menuUnidade(id); return;
    case "addadv": sheetAdicionar(); return;
    case "cdnova": {
      const w = openSheet(`<label class="f">Nome<input type="text" id="cn" placeholder="Ex.: a ponte cai"></label><label class="f" style="margin-top:10px">Caixas<input type="number" id="cs" min="1" max="12" value="4"></label><div class="acts"><button class="btn hope" id="cok">Criar</button></div>`, { title: "Nova contagem" });
      w.querySelector("#cok").addEventListener("click", () => { const n = w.querySelector("#cn").value.trim() || "Contagem"; ed(x => x.contagens.push({ id: uid(), n, size: clamp(parseInt(w.querySelector("#cs").value, 10) || 4, 1, 12), val: 0 })); closeSheet(); });
      return;
    }
    case "cdp": ed(() => { const c = b.contagens.find(x => x.id === id); c.val = c.val === i + 1 ? i : i + 1; }); return;
    case "cddel": ed(x => { x.contagens = x.contagens.filter(c => c.id !== id); }); return;
    case "env": { const e = AMBIENTE_ACOES[i], c = +el.dataset.c; if (b.medo < c) return; ed(x => { x.medo -= c; x.ultimo = { n: e.n, o: sortear(e.op), ef: e.ef }; }); return; }
  }
}
export function input(k, el) {
  const id = el.dataset.id;
  switch (k) {
    case "uname": edQuiet(() => { U(id).name = el.value; }); break;
    case "udesc": edQuiet(() => { U(id).desc = el.value; }); break;
    case "unotes": edQuiet(() => { U(id).notes = el.value; }); break;
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
