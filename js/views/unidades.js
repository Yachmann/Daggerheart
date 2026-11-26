// Cartões de adversário e suas ações. Usado pela batalha e pela cena (ctx = { reg, ed, edQuiet }).
import { esc, mdBlock, icon, uid, toast, confirmar, openSheet, closeSheet, store } from "../util.js";
import { T, dmgPT } from "../data.js";
import { adversarios, pvPorDano, CONDICOES, CONDICOES_EXTRA, TIPO_PT, adicionar } from "../gm.js";
import { statBlock, pipsU, tipoTag, kindTag, fonteTag } from "./mestre-ui.js";
import { condFx, condBanner } from "./common.js";
import { casaLembrete } from "../cena.js";
import { FIGURAS, POR_FIGURA, valido, rotulo, ocupados, proximo, atribuirFaltantes, definir } from "../marcadores.js";
import { app } from "../main.js";

const CONDCLS = { Vulnerável: "vuln", Contido: "restr", Oculto: "hide" };
// Cartões com a aba "Mais condições" aberta (sobrevive aos redesenhos da tela).
const condAbertas = new Set();
// Vista dos adversários: "lista" (uma linha por adversário, esticada para o lado) ou "grade" (cartões compactos lado a lado).
let vista = store.get("dh-uvista", "lista"), mapaAberto = true;
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches("details[data-mapa]")) mapaAberto = e.target.open; }, true);

function seloLembrete(x, reg) {
  const l = ((reg && reg.lembretes) || []).filter(m => !m.feito && m.adversario && casaLembrete(m.adversario, x));
  if (!l.length) return "";
  return `<div class="lem-selos">${l.map(m => `<button class="lem-selo ${esc(m.tipo)}" data-lm="abrir" data-id="${esc(m.id)}" title="${esc(m.texto || m.titulo)}">⚑ ${esc(m.titulo)}</button>`).join("")}</div>`;
}

// Ficha visual do marcador físico: a figura do token com o número em cima, como na peça de verdade.
export const tokenImg = (mk, cls = "") => (valido(mk)
  ? `<span class="tk ${cls}" title="${esc(rotulo(mk))}"><img src="${FIGURAS[mk.f].img}" alt="${esc(FIGURAS[mk.f].n)}" draggable="false"><b>${mk.n}</b></span>`
  : `<span class="tk vazio ${cls}"><b>+</b></span>`);

export function cartaoUnidade(x, reg) {
  const morto = x.hp >= x.hpMax, minion = x.type === "Minion";
  const fx = condFx(x.cond);
  const nExtra = x.cond.filter(c => !CONDICOES.includes(c)).length, aberta = condAbertas.has(x.id);
  const painelMais = aberta ? `<div class="cond-more" role="group" aria-label="Mais condições">${CONDICOES_EXTRA.map(([c, en]) => `<button class="chip${x.cond.includes(c) ? " on" : ""}" data-act="ucond" data-id="${x.id}" data-c="${esc(c)}" aria-pressed="${x.cond.includes(c)}" title="${esc(en)}">${esc(c)}</button>`).join("")}</div>` : "";
  const ext = seloLembrete(x, reg) + painelMais + condBanner(x.cond, "ele");
  return `<article id="u-${x.id}" class="ucard${morto ? " dead" : ""}${fx.cls} ty-${esc(x.type)}" style="${fx.style}">
    <button class="uc-tok" data-act="utok" data-id="${x.id}" title="${valido(x.mk) ? esc(rotulo(x.mk)) + ": toque para trocar o marcador" : "Escolher o marcador deste adversário"}" aria-label="Marcador: ${esc(rotulo(x.mk))}. Trocar">${tokenImg(x.mk)}</button>
    <div class="uc-id">
      <div class="uc-l1"><input class="uc-name" data-in="uname" data-id="${x.id}" data-k="un${x.id}" value="${esc(x.name)}" aria-label="Nome"><span class="tag">${esc(tipoTag(x))}</span>${morto ? `<span class="tag dead">Derrotado</span>` : ""}</div>
      <input class="uc-desc" data-in="udesc" data-id="${x.id}" data-k="ud${x.id}" value="${esc(x.desc || "")}" placeholder="Nota rápida (ex.: o do capuz vermelho)" aria-label="Nota rápida">
    </div>
    <div class="uc-trk2">
      <div class="uc-t"><span class="lb">PV</span><div class="pips pv">${pipsU(x.hpMax, x.hp, "uhp", x.id)}</div></div>
      ${x.stMax ? `<div class="uc-t"><span class="lb">Est.</span><div class="pips es">${pipsU(x.stMax, x.st, "ust", x.id)}</div></div>` : ""}
    </div>
    <div class="cond-row">${CONDICOES.map(c => `<button class="chip ${CONDCLS[c]}${x.cond.includes(c) ? " on" : ""}" data-act="ucond" data-id="${x.id}" data-c="${c}" aria-pressed="${x.cond.includes(c)}">${c}</button>`).join("")}${x.cond.filter(c => !CONDICOES.includes(c)).map(c => `<button class="chip on" data-act="ucond" data-id="${x.id}" data-c="${esc(c)}">${esc(c)} ✕</button>`).join("")}<button class="chip more${aberta ? " open" : ""}" data-act="ucondmais" data-id="${x.id}" aria-expanded="${aberta}" title="Mostrar ou esconder as outras condições">${aberta ? "▾" : "▸"} Mais${nExtra ? ` (${nExtra})` : ""}</button></div>
    <div class="uc-quick"><span>Dif <b>${esc(x.dif)}</b></span><span>Lim. <b>${x.maj ?? "–"}/${x.sev ?? "–"}</b></span><span>${esc(x.atk)} <b>${esc(x.wpn)}</b></span><span>${esc(T(x.rng))}</span><span><b>${esc(dmgPT(x.dmg))}</b></span></div>
    <div class="uc-act">
      <button class="btn sm ghost" data-act="uhab" data-id="${x.id}" title="Habilidades, experiência, motivações e anotações">Habil. (${x.f.length})</button>
      <button class="icon-btn" data-act="umenu" data-id="${x.id}" aria-label="Mais opções">⋯</button>
    </div>
    ${ext ? `<div class="uc-ext">${ext}</div>` : ""}
  </article>`;
}

// Mapa dos marcadores: quando o jogador diz "vou atacar o encapuzado 3", é só olhar a linha da figura e o número.
function mapaMarcadores(reg) {
  const us = reg.unidades, oc = ocupados(reg), sem = us.filter(u => !valido(u.mk)).length;
  if (!us.length) return "";
  const linhas = FIGURAS.map((fg, f) => {
    if (!us.some(u => valido(u.mk) && u.mk.f === f)) return "";
    const cels = Array.from({ length: POR_FIGURA }, (_, i) => {
      const n = i + 1, u = oc.get(f + ":" + n);
      return u ? `<button class="mp-c${u.hp >= u.hpMax ? " dead" : ""}" data-act="uir" data-id="${u.id}" title="${esc(u.name)}: ir ao cartão"><b>${n}</b><span>${esc(u.name)}</span><i>${u.hpMax - u.hp}/${u.hpMax}</i></button>` : `<span class="mp-c vazio"><b>${n}</b></span>`;
    }).join("");
    return `<div class="mp-row"><img src="${fg.img}" alt="${esc(fg.n)}" title="${esc(fg.n)}" draggable="false"><div class="mp-cells">${cels}</div></div>`;
  }).join("");
  return `<details class="mapa" data-mapa ${mapaAberto ? "open" : ""}><summary><span>Marcadores na mesa</span><span class="muted small">${us.length - sem} de ${us.length} com marcador</span></summary>
    ${linhas || `<p class="muted small" style="margin:6px 0">Nenhum adversário tem marcador ainda.</p>`}
    ${sem ? `<div class="acts" style="margin-top:8px"><button class="btn sm hope" data-act="umkauto">Dar marcador a ${sem === 1 ? "1 adversário" : sem + " adversários"} sem marcador</button></div>` : ""}</details>`;
}

export function painelUnidades(reg, titulo = "Adversários") {
  const vb = (v, n) => `<button class="chip${vista === v ? " on" : ""}" data-act="uvista" data-v="${v}" aria-pressed="${vista === v}">${n}</button>`;
  return `<div class="sec-line"><h2>${titulo}</h2>${reg.unidades.length > 1 ? `<span class="vista-sw" role="group" aria-label="Forma de exibição">${vb("lista", "Lista")}${vb("grade", "Grade")}</span>` : ""}<button class="btn sm" data-act="addadv">${icon("plus")} Adicionar</button></div>
  ${mapaMarcadores(reg)}
  ${reg.unidades.length ? `<div class="ucards v-${vista}">${reg.unidades.map(u => cartaoUnidade(u, reg)).join("")}</div>` : `<div class="empty"><h3>Ninguém aqui ainda</h3><p>Adicione adversários da biblioteca ou crie um do zero.</p><div class="acts" style="justify-content:center"><button class="btn hope" data-act="addadv">${icon("plus")} Adicionar adversário</button><a class="btn" href="#/mestre/adversario/novo">Criar do zero</a></div></div>`}`;
}

// Pop-up com tudo o que não cabe no cartão: números, habilidades, experiência, motivações e anotações.
function sheetHabilidades(id, ctx) {
  const x = ctx.reg().unidades.find(u => u.id === id); if (!x) return;
  openSheet(`<div class="hab-top">${tokenImg(x.mk, "grande")}<div class="muted small">${valido(x.mk) ? "Marcador: <b>" + esc(rotulo(x.mk)) + "</b>" : "Sem marcador"}${x.desc ? " · " + esc(x.desc) : ""}</div></div>
    ${statBlock({ name: x.name, tier: x.tier, type: x.type, horde: x.horde, desc: "", dif: x.dif, th: `${x.maj ?? "None"}/${x.sev ?? ""}`, hp: x.hpMax, st: x.stMax, atk: x.atk, wpn: x.wpn, rng: x.rng, dmg: x.dmg, xp: x.xp, mot: x.mot, f: x.f })}
    <label class="f" style="margin-top:12px">Anotações<textarea data-in="unotes" data-id="${x.id}" data-k="uo${x.id}">${esc(x.notes || "")}</textarea></label>`, { title: x.name, wide: true });
}

// Escolha do marcador: 5 figuras × 5 números. Os que já estão em uso mostram o adversário; tocar neles troca os dois de lugar.
function sheetMarcador(id, ctx) {
  const reg = ctx.reg(), u = reg.unidades.find(x => x.id === id); if (!u) return;
  const oc = ocupados(reg, u);
  const linhas = FIGURAS.map((fg, f) => `<div class="mk-row"><img src="${fg.img}" alt="${esc(fg.n)}" title="${esc(fg.n)}" draggable="false"><div class="mk-nums">${Array.from({ length: POR_FIGURA }, (_, i) => {
    const n = i + 1, o = oc.get(f + ":" + n), eu = valido(u.mk) && u.mk.f === f && u.mk.n === n;
    return `<button class="mk-n${eu ? " eu" : ""}${o ? " usado" : ""}" data-act="utokset" data-id="${id}" data-f="${f}" data-n="${n}" title="${o ? esc(o.name) + " usa este marcador: toque para trocar" : eu ? "Marcador atual" : "Livre"}"><b>${n}</b>${o ? `<small>${esc(o.name)}</small>` : eu ? `<small>este</small>` : ""}</button>`;
  }).join("")}</div></div>`).join("");
  openSheet(`<p class="muted small" style="margin-top:0">Qual marcador físico representa <b>${esc(u.name)}</b>? Os ocupados mostram o adversário; ao tocar, os dois trocam de lugar.</p>${linhas}
    <div class="acts"><button class="btn" data-act="utokauto" data-id="${id}">Escolher automático</button><button class="btn ghost" data-act="utoknone" data-id="${id}">Sem marcador</button></div>`, { title: "Marcador: " + u.name, wide: true });
}

function menuUnidade(id, ctx) {
  const ed = ctx.ed, u = ctx.reg().unidades.find(x => x.id === id);
  const w = openSheet(`<div class="acts" style="margin-top:0"><button class="btn" id="ud">Duplicar</button><button class="btn" id="ur">Restaurar PV e Estresse</button><button class="btn" id="uc">Condição personalizada</button><button class="btn danger" id="ux">${icon("trash")} Remover</button></div>
    <div class="divider"></div>${statBlock({ name: u.name, tier: u.tier, type: u.type, horde: u.horde, desc: "", dif: u.dif, th: `${u.maj ?? "None"}/${u.sev ?? ""}`, hp: u.hpMax, st: u.stMax, atk: u.atk, wpn: u.wpn, rng: u.rng, dmg: u.dmg, xp: u.xp, mot: u.mot, f: u.f })}`, { title: u.name });
  w.querySelector("#ud").addEventListener("click", () => { ed(b => { const c = JSON.parse(JSON.stringify(u)); c.id = uid(); c.num = b.proxNum++; c.hp = 0; c.st = 0; c.cond = []; c.mk = proximo(b, u.ref); c.name = u.name.replace(/ \d+$/, "") + " " + (b.unidades.filter(x => x.ref === u.ref).length + 1); b.unidades.splice(b.unidades.indexOf(u) + 1, 0, c); }); closeSheet(); toast("Duplicado"); });
  w.querySelector("#ur").addEventListener("click", () => { ed(() => { u.hp = 0; u.st = 0; u.cond = []; }); closeSheet(); });
  w.querySelector("#uc").addEventListener("click", () => { closeSheet(); const w2 = openSheet(`<label class="f">Condição<input type="text" id="cn" placeholder="Ex.: Atordoado"></label><div class="acts"><button class="btn hope" id="cok">Adicionar</button></div>`, { title: "Nova condição" }); w2.querySelector("#cok").addEventListener("click", () => { const v = w2.querySelector("#cn").value.trim(); if (v) ed(() => u.cond.push(v)); closeSheet(); }); });
  w.querySelector("#ux").addEventListener("click", async () => { closeSheet(); if (await confirmar(`Remover ${u.name} da batalha?`, { ok: "Remover", perigo: true })) ed(b => { b.unidades = b.unidades.filter(x => x.id !== id); }); });
}

function sheetAdicionar(ctx) {
  const ed = ctx.ed;
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
    const w2 = openSheet(`${statBlock(a, { compact: true })}<label class="f" style="margin-top:12px">Quantos<input type="number" id="aq" min="1" max="30" value="${a.type === "Minion" ? Math.max(1, ctx.reg().jogadores) : 1}"></label>
      <div class="acts"><button class="btn hope" id="aok">${icon("plus")} Adicionar</button><button class="btn ghost" id="aver">Ver habilidades</button></div>`, { title: a.name });
    w2.querySelector("#aok").addEventListener("click", () => { const n = parseInt(w2.querySelector("#aq").value, 10) || 1; ed(b => adicionar(b, a, n)); closeSheet(); toast(`${n > 1 ? n + "× " : ""}${a.name} adicionado`); });
    w2.querySelector("#aver").addEventListener("click", () => { w2.querySelector(".sheet-body").insertAdjacentHTML("afterbegin", statBlock(a)); w2.querySelector("#aver").remove(); });
  });
}

// Devolve true se a ação era de adversário (e foi tratada).
export function unidadeOn(a, el, ctx) {
  const id = el.dataset.id, i = +el.dataset.i, U = x => ctx.reg().unidades.find(u => u.id === x), ed = ctx.ed;
  switch (a) {
    case "uhp": ed(() => { const u = U(id); u.hp = u.hp === i + 1 ? i : i + 1; }); return true;
    case "ust": ed(() => { const u = U(id); u.st = u.st === i + 1 ? i : i + 1; }); return true;
    case "ucond": ed(() => { const u = U(id), c = el.dataset.c, k = u.cond.indexOf(c); k >= 0 ? u.cond.splice(k, 1) : u.cond.push(c); }); return true;
    case "ucondmais": condAbertas.has(id) ? condAbertas.delete(id) : condAbertas.add(id); app.render(true); return true;
    case "udie": ed(() => { const u = U(id); u.hp = u.hpMax; }); return true;
    case "udmg": {
      const inp = document.querySelector(`[data-k="dm${id}"]`), d = parseInt(inp && inp.value, 10);
      if (!(d > 0)) { toast("Digite o dano"); return true; }
      const u = U(id), n = pvPorDano(u, d);
      ed(() => { u.hp = Math.min(u.hpMax, u.hp + n); });
      toast(`${d} de dano: ${n} PV marcado${n !== 1 ? "s" : ""}${u.hp >= u.hpMax ? " · derrotado" : ""}`); return true;
    }
    case "uopen": case "uhab": sheetHabilidades(id, ctx); return true;
    case "utok": sheetMarcador(id, ctx); return true;
    case "utokset": ed(() => { const r = ctx.reg(), u = U(id), o = definir(r, u, +el.dataset.f, +el.dataset.n); if (o) toast(`${o.name} trocou de marcador com ${u.name}`); }); closeSheet(); return true;
    case "utokauto": ed(() => { const r = ctx.reg(), u = U(id); u.mk = null; u.mk = proximo(r, u.ref, u); }); closeSheet(); return true;
    case "utoknone": ed(() => { U(id).mk = null; }); closeSheet(); return true;
    case "umkauto": { let n = 0; ed(() => { n = atribuirFaltantes(ctx.reg()); }); toast(n ? `${n} marcador${n > 1 ? "es" : ""} atribuído${n > 1 ? "s" : ""}` : "Todos os 25 marcadores já estão em uso"); return true; }
    case "uvista": vista = el.dataset.v === "grade" ? "grade" : "lista"; store.set("dh-uvista", vista); app.render(true); return true;
    case "uir": { const c = document.getElementById("u-" + id); if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); } return true; }
    case "umenu": menuUnidade(id, ctx); return true;
    case "addadv": sheetAdicionar(ctx); return true;
  }
  return false;
}
export function unidadeInput(k, el, ctx) {
  const id = el.dataset.id, U = () => ctx.reg().unidades.find(u => u.id === id);
  switch (k) {
    case "uname": ctx.edQuiet(() => { U().name = el.value; }); return true;
    case "udesc": ctx.edQuiet(() => { U().desc = el.value; }); return true;
    case "unotes": ctx.edQuiet(() => { U().notes = el.value; }); return true;
  }
  return false;
}
