// Cartões de adversário e suas ações. Usado pela batalha e pela cena (ctx = { reg, ed, edQuiet }).
import { esc, mdBlock, icon, uid, toast, confirmar, openSheet, closeSheet } from "../util.js";
import { T, dmgPT } from "../data.js";
import { adversarios, pvPorDano, CONDICOES, TIPO_PT, adicionar } from "../gm.js";
import { statBlock, pipsU, tipoTag, kindTag, fonteTag } from "./mestre-ui.js";
import { condFx, condBanner } from "./common.js";
import { casaLembrete } from "../cena.js";

const CONDCLS = { Vulnerável: "vuln", Contido: "restr", Oculto: "hide" };

function seloLembrete(x, reg) {
  const l = ((reg && reg.lembretes) || []).filter(m => !m.feito && m.adversario && casaLembrete(m.adversario, x));
  if (!l.length) return "";
  return `<div class="lem-selos">${l.map(m => `<button class="lem-selo ${esc(m.tipo)}" data-lm="abrir" data-id="${esc(m.id)}" title="${esc(m.texto || m.titulo)}">⚑ ${esc(m.titulo)}</button>`).join("")}</div>`;
}
export function cartaoUnidade(x, reg) {
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
    ${seloLembrete(x, reg)}
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

export function painelUnidades(reg, titulo = "Adversários") {
  return `<div class="sec-line"><h2>${titulo}</h2><button class="btn sm" data-act="addadv">${icon("plus")} Adicionar</button></div>
  ${reg.unidades.length ? `<div class="ucards">${reg.unidades.map(u => cartaoUnidade(u, reg)).join("")}</div>` : `<div class="empty"><h3>Ninguém aqui ainda</h3><p>Adicione adversários da biblioteca ou crie um do zero.</p><div class="acts" style="justify-content:center"><button class="btn hope" data-act="addadv">${icon("plus")} Adicionar adversário</button><a class="btn" href="#/mestre/adversario/novo">Criar do zero</a></div></div>`}`;
}

function menuUnidade(id, ctx) {
  const ed = ctx.ed, u = ctx.reg().unidades.find(x => x.id === id);
  const w = openSheet(`<div class="acts" style="margin-top:0"><button class="btn" id="ud">Duplicar</button><button class="btn" id="ur">Restaurar PV e Estresse</button><button class="btn" id="uc">Condição personalizada</button><button class="btn danger" id="ux">${icon("trash")} Remover</button></div>
    <div class="divider"></div>${statBlock({ name: u.name, tier: u.tier, type: u.type, horde: u.horde, desc: "", dif: u.dif, th: `${u.maj ?? "None"}/${u.sev ?? ""}`, hp: u.hpMax, st: u.stMax, atk: u.atk, wpn: u.wpn, rng: u.rng, dmg: u.dmg, xp: u.xp, mot: u.mot, f: u.f })}`, { title: u.name });
  w.querySelector("#ud").addEventListener("click", () => { ed(b => { const c = JSON.parse(JSON.stringify(u)); c.id = uid(); c.num = b.proxNum++; c.hp = 0; c.st = 0; c.cond = []; c.name = u.name.replace(/ \d+$/, "") + " " + (b.unidades.filter(x => x.ref === u.ref).length + 1); b.unidades.splice(b.unidades.indexOf(u) + 1, 0, c); }); closeSheet(); toast("Duplicado"); });
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
    case "udie": ed(() => { const u = U(id); u.hp = u.hpMax; }); return true;
    case "udmg": {
      const inp = document.querySelector(`[data-k="dm${id}"]`), d = parseInt(inp && inp.value, 10);
      if (!(d > 0)) { toast("Digite o dano"); return true; }
      const u = U(id), n = pvPorDano(u, d);
      ed(() => { u.hp = Math.min(u.hpMax, u.hp + n); });
      toast(`${d} de dano: ${n} PV marcado${n !== 1 ? "s" : ""}${u.hp >= u.hpMax ? " · derrotado" : ""}`); return true;
    }
    case "uopen": ed(() => { const u = U(id); u.open = !u.open; }); return true;
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
