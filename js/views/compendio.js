// Compêndio: cartas, classes, origens, equipamento e itens — tudo em português e filtrável
import { esc, md, mdBlock, icon, debounce, openSheet } from "../util.js";
import { list, loc, get, nome, domPT, DOMS, traitPT, T, dmgPT, hfOn, EXP, matches, domIcon, domDesc } from "../data.js";
import { app } from "../main.js";
import { dcard, feat, expTag, corDom, verCarta, enName } from "./common.js";
import { detalheClasse, detalheSub } from "./criar.js";

const ABAS = [["cartas", "Cartas"], ["classes", "Classes"], ["ancestralidades", "Ancestralidades"], ["comunidades", "Comunidades"], ["armas", "Armas"], ["armaduras", "Armaduras"], ["itens", "Itens"], ["transformacoes", "Transformações"]];
let ultimo = "";
const st = { aba: "cartas", q: "", dom: "", lvl: "", tipo: "", tier: "", ps: "", kind: "" };

export function html(p, q) {
  if (q.aba) st.aba = q.aba;
  if (q.q != null) st.q = q.q;
  const abas = ABAS.filter(([k]) => k !== "transformacoes" || (hfOn() && list("transformations").length));
  if (!abas.some(a => a[0] === st.aba)) st.aba = "cartas";
  const html = `<div class="page-h"><h1>Compêndio</h1>${!hfOn() && EXP.disponivel ? `<div class="sub">Conteúdo da expansão <i>Hope & Fear</i> oculto. <a href="#/conta">Ligar em Conta</a>.</div>` : hfOn() ? `<div class="sub">Incluindo a expansão <i>Hope & Fear</i> (marcada com <span class="tag exp">H&F</span>).</div>` : ""}</div>
  <div class="scroll-x" role="tablist">${abas.map(([k, n]) => `<button class="chip${st.aba === k ? " on" : ""}" data-act="aba" data-v="${k}">${n}</button>`).join("")}</div>
  <div class="search" style="margin-top:10px"><span>${icon("search")}</span><input type="search" data-in="q" data-k="cq" value="${esc(st.q)}" placeholder="Buscar em ${esc(abas.find(a => a[0] === st.aba)[1].toLowerCase())}…" autocomplete="off"></div>
  ${filtros()}
  <div id="clist" style="margin-top:14px">${lista()}</div>`;
  if (q.id && q.id !== ultimo) { ultimo = q.id; setTimeout(() => abrir(q.id), 0); }
  if (!q.id) ultimo = "";
  return html;
}

function sel(k, opts, rot) { return `<label class="f">${rot}<select data-ch="f" data-f="${k}"><option value="">Todos</option>${opts.map(([v, n]) => `<option value="${esc(v)}"${String(st[k]) === String(v) ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`; }
function filtros() {
  if (st.aba === "cartas") return `<div class="row" style="margin-top:10px">${sel("dom", DOMS().map(d => [d, domPT(d)]), "Domínio")}${sel("lvl", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => [l, "Nível " + l]), "Nível")}${sel("tipo", [["Ability", "Habilidade"], ["Spell", "Magia"], ["Grimoire", "Grimório"]], "Tipo")}</div>`;
  if (st.aba === "armas") return `<div class="row" style="margin-top:10px">${sel("tier", [1, 2, 3, 4].map(t => [t, "Patamar " + t]), "Patamar")}${sel("ps", [["Primary", "Primária"], ["Secondary", "Secundária"]], "Tipo")}${sel("kind", [["Physical", "Física"], ["Magic", "Mágica"]], "Dano")}</div>`;
  if (st.aba === "armaduras") return `<div class="row" style="margin-top:10px">${sel("tier", [1, 2, 3, 4].map(t => [t, "Patamar " + t]), "Patamar")}</div>`;
  return "";
}

function lista() {
  const q = st.q;
  switch (st.aba) {
    case "cartas": {
      const l = list("cards").filter(c => (!st.dom || c.d === st.dom) && (!st.lvl || c.l === +st.lvl) && (!st.tipo || c.t === st.tipo) && matches(loc("cards", c), q)).sort((a, b) => a.d.localeCompare(b.d) || a.l - b.l);
      const dd = st.dom && domDesc(st.dom);
      return `${dd ? `<div class="note info" style="margin-bottom:12px">${md(dd)}</div>` : ""}<p class="muted small">${l.length} carta${l.length !== 1 ? "s" : ""}</p><div class="dcards">${l.slice(0, 120).map(c => dcard(c, { clip: true })).join("")}</div>${l.length > 120 ? `<p class="muted">Mostrando 120. Use os filtros para refinar.</p>` : ""}`;
    }
    case "classes": return `<div class="opts">${list("classes").filter(c => matches(loc("classes", c), q) || c.subs.some(s => matches(loc("subclasses", s), q))).map(c => { const o = loc("classes", c); return `<button class="opt" data-act="abrir" data-id="${esc(c.id)}" style="border-top:4px solid ${corDom(c.d[0])}"><span class="t">${esc(o.n)}${enName(o)} ${expTag(c)}</span><span class="s">${c.d.map(domPT).join(" & ")} · PV ${c.hp} · Evasão ${c.ev}</span><span class="x">${c.subs.map(s => esc(nome("subclasses", s))).join(" · ")}</span></button>`; }).join("")}</div>`;
    case "ancestralidades": case "comunidades": {
      const k = st.aba === "ancestralidades" ? "ancestries" : "communities";
      return `<div class="opts">${list(k).filter(c => matches(loc(k, c), q)).map(c => { const o = loc(k, c), fs = Array.isArray(o.f) ? o.f : [o.f]; return `<button class="opt" data-act="abrir" data-id="${esc(c.id)}"><span class="t">${esc(o.n)}${enName(o)} ${expTag(c)}</span>${o.adj ? `<span class="s">${esc(o.adj)}</span>` : ""}${fs.map(f => `<span class="x"><b>${esc(f.n)}:</b> ${md(f.t)}</span>`).join("")}</button>`; }).join("")}</div>`;
    }
    case "armas": {
      const l = list("weapons").filter(w => (!st.tier || w.t === +st.tier) && (!st.ps || w.ps === st.ps) && (!st.kind || (st.kind === "Magic" ? /Magic/.test(w.kind) : !/Magic/.test(w.kind))) && matches(loc("weapons", w), q)).sort((a, b) => a.t - b.t || a.ps.localeCompare(b.ps));
      return `<p class="muted small">${l.length} arma${l.length !== 1 ? "s" : ""}</p><div class="grid3">${l.slice(0, 150).map(w => { const o = loc("weapons", w); return `<div class="card" style="margin:0"><div class="eyebrow">${w.ps === "Primary" ? "Primária" : "Secundária"} · Patamar ${w.t} ${expTag(w)}</div><h3>${esc(o.n)}${enName(o)}</h3><div class="kv"><span><b>${esc(traitPT(w.tr))}</b></span><span>${esc(T(w.rng))}</span><span><b>${esc(dmgPT(w.dmg))}</b></span><span>${esc(T(w.bur))}</span></div>${o.f && o.f.length ? `<div class="tx small" style="margin-top:6px">${o.f.map(f => `<b>${esc(f.n)}:</b> ${md(f.t)}`).join("<br>")}</div>` : ""}</div>`; }).join("")}</div>`;
    }
    case "armaduras": {
      const l = list("armor").filter(a => (!st.tier || a.t === +st.tier) && matches(loc("armor", a), q)).sort((a, b) => a.t - b.t);
      return `<div class="grid3">${l.map(a => { const o = loc("armor", a); return `<div class="card" style="margin:0"><div class="eyebrow">Patamar ${a.t} ${expTag(a)}</div><h3>${esc(o.n)}${enName(o)}</h3><div class="kv"><span>Armadura <b>${esc(a.sc)}</b></span><span>Limiares <b>${esc(a.th)}</b></span></div>${o.f && o.f.length ? `<div class="tx small" style="margin-top:6px">${o.f.map(f => `<b>${esc(f.n)}:</b> ${md(f.t)}`).join("<br>")}</div>` : ""}</div>`; }).join("")}</div>`;
    }
    case "itens": {
      const l = [...list("consumables").map(x => ["consumables", x]), ...list("items").map(x => ["items", x])].filter(([k, x]) => matches(loc(k, x), q));
      return `<div class="grid3">${l.map(([k, x]) => { const o = loc(k, x); return `<div class="card" style="margin:0"><div class="eyebrow">${k === "consumables" ? "Consumível" : "Item"} ${expTag(x)}</div><h3>${esc(o.n)}${enName(o)}</h3><div class="tx small">${md(o.x)}</div></div>`; }).join("")}</div>`;
    }
    case "transformacoes": return `<div class="opts">${list("transformations").filter(t => matches(loc("transformations", t), q)).map(t => { const o = loc("transformations", t); return `<button class="opt" data-act="abrir" data-id="${esc(t.id)}"><span class="t">${esc(o.n)} ${expTag(t)}</span><span class="x">${md((o.desc || "").split("\n")[0])}</span></button>`; }).join("")}</div>`;
  }
  return "";
}

function abrir(id) {
  if (st.aba === "classes") return detalheClasse(id);
  if (st.aba === "ancestralidades" || st.aba === "comunidades" || st.aba === "transformacoes") {
    const k = { ancestralidades: "ancestries", comunidades: "communities", transformacoes: "transformations" }[st.aba];
    const o = loc(k, id); if (!o) return;
    openSheet(`<div class="tx">${mdBlock(o.desc)}</div>${o.adj ? `<p class="muted"><i>${esc(o.adj)}</i></p>` : ""}${(Array.isArray(o.f) ? o.f : [o.f]).filter(Boolean).map(f => feat(f)).join("")}`, { title: o.n, wide: true });
  }
}

const atualizar = debounce(() => { const el = document.getElementById("clist"); if (el) el.innerHTML = lista(); }, 150);
export function input(k, el) { if (k === "q") { st.q = el.value; atualizar(); } }
export function change(k, el) { if (k === "f") { st[el.dataset.f] = el.value; app.render(true); } }
export function on(a, el) {
  if (a === "aba") { st.aba = el.dataset.v; st.q = ""; history.replaceState(null, "", "#/compendio?aba=" + st.aba); app.render(true); }
  if (a === "abrir") abrir(el.dataset.id);
  if (a === "carta") verCarta(el.dataset.id);
}
