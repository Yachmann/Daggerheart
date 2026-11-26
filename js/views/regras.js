// Regras: guia rápido em português + busca unificada (guia, cartas, habilidades, equipamento e SRD completo em português, com o original em inglês)
import { esc, md, mdBlock, icon, norm, debounce } from "../util.js";
import { guia, list, loc, domPT, nome, traitPT } from "../data.js";
import { app } from "../main.js";
import { dcard, feat, voltar, verCarta, expTag } from "./common.js";

// Nomes dos grupos do SRD em português (os capítulos já vêm em português no arquivo original)
const GRP_PT = { "Additional GM Guidance": "Orientações adicionais ao Mestre", "Additional Rules": "Regras adicionais", "Adversaries And Environments": "Adversários e ambientes", Ancestries: "Ancestralidades", Armor: "Armaduras", Attacking: "Ataque", Bard: "Bardo", Classes: "Classes", Combat: "Combate", "Combat Wheelchair": "Cadeira de rodas de combate", Communities: "Comunidades", Conditions: "Condições", Consumables: "Consumíveis", "Core GM Mechanics": "Mecânicas centrais do Mestre", "Core Gameplay Loop": "Ciclo central de jogo", Death: "Morte", Domains: "Domínios", Downtime: "Tempo livre", Druid: "Druida", Equipment: "Equipamento", "Flow Of The Game": "Fluxo do jogo", "GM Guidance": "Orientações ao Mestre", Gold: "Ouro", Guardian: "Guardião", Introduction: "Introdução", "Leveling Up": "Subir de nível", Loot: "Espólio", "Making Moves & Taking Action": "Fazer movimentos e agir", "Maps, Range, And Movement": "Mapas, alcance e movimento", Multiclassing: "Multiclasse", Ranger: "Patrulheiro", Rogue: "Ladino", Seraph: "Serafim", Sorcerer: "Feiticeiro", Stress: "Estresse", "The Basics": "O básico", "The Spotlight": "O holofote", "The Witherwild": "A Murchaselva", "Turn Order & Action Economy": "Ordem de turnos e economia de ações", "Using Environments": "Usando ambientes", Warrior: "Guerreiro", Weapons: "Armas", "What Is This?": "O que é isto?", Wizard: "Mago" };
const grpPT = g => GRP_PT[g] || g;

let Q = "", SRD = null, SYN = {}, carregando = false, TEM_PT = false;
async function carregarSRD() {
  if (SRD || carregando) return;
  carregando = true;
  try {
    const [r, p, s] = await Promise.all([fetch("data/regras-en.json").then(x => x.json()), fetch("data/pt/regras.json").then(x => x.ok ? x.json() : {}).catch(() => ({})), fetch("data/sinonimos.json").then(x => x.json()).catch(() => ({}))]);
    // Cada entrada guarda o original (t, x) e a tradução (tp, xp, quando existir); a busca varre as duas línguas.
    SRD = r.map((x, i) => {
      const pt = p[i], tp = pt && pt.t ? pt.t : "", xp = pt && pt.x ? pt.x : "";
      return { i, cap: x[0], grp: x[1], t: x[2], x: x[3], tp, xp, nt: norm(tp + " " + x[2]), nb: norm(xp + " " + x[3]) };
    });
    TEM_PT = SRD.some(e => e.xp);
    SYN = s;
  } catch { SRD = []; }
  carregando = false;
  app.render(true);
}

const palavras = q => norm(q).split(/[^a-z0-9]+/).filter(w => w.length > 1);
function pontua(texto, titulo, ws) {
  let s = 0;
  for (const w of ws) {
    const alts = [w, ...(SYN[w] || [])];
    const hitT = alts.some(a => titulo.includes(a)), hitB = alts.some(a => texto.includes(a));
    if (!hitT && !hitB) return 0;
    s += hitT ? 5 : 0; s += hitB ? 1 : 0;
  }
  return s;
}
function trecho(txt, ws) {
  const n = norm(txt);
  let pos = -1;
  for (const w of ws) for (const a of [w, ...(SYN[w] || [])]) { const p = n.indexOf(a); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
  const ini = Math.max(0, pos - 60);
  return (ini > 0 ? "…" : "") + txt.slice(ini, ini + 180).replace(/[*_#>|]/g, "").replace(/\n+/g, " ").replace(/(^|\s)-\s/g, " ") + "…";
}

function buscar(q) {
  const ws = palavras(q);
  if (!ws.length) return [];
  const res = [];
  for (const g of guia()) { const s = pontua(norm(g.x + " " + g.tags.join(" ")), norm(g.t), ws); if (s) res.push({ s: s + 4, k: "Guia rápido", t: g.t, sn: trecho(g.x, ws), h: "#/regras/" + g.id }); }
  for (const c of list("cards")) { const o = loc("cards", c); const s = pontua(norm(o.x + " " + c.x), norm(o.n + " " + c.n), ws); if (s) res.push({ s, k: `Carta · ${domPT(c.d)} ${c.l}`, t: o.n, sn: trecho(o.x, ws), card: c.id, exp: c }); }
  for (const c of list("classes")) { const o = loc("classes", c); for (const f of [o.hope, ...o.feats]) { const s = pontua(norm(f.t), norm(f.n + " " + (f.en || "")), ws); if (s) res.push({ s, k: "Classe · " + o.n, t: f.n, sn: trecho(f.t, ws), h: "#/compendio?aba=classes&id=" + encodeURIComponent(c.id), exp: c }); } }
  for (const c of list("subclasses")) { const o = loc("subclasses", c); for (const f of [...o.f, ...o.s, ...o.m]) { const s = pontua(norm(f.t), norm(f.n + " " + (f.en || "")), ws); if (s) res.push({ s, k: "Subclasse · " + o.n, t: f.n, sn: trecho(f.t, ws), h: "#/compendio?aba=classes&id=" + encodeURIComponent(c.cls), exp: c }); } }
  for (const [k, lab] of [["ancestries", "Ancestralidade"], ["communities", "Comunidade"]]) for (const c of list(k)) { const o = loc(k, c); const fs = Array.isArray(o.f) ? o.f : [o.f]; for (const f of fs) { const s = pontua(norm(f.t), norm(f.n + " " + o.n), ws); if (s) res.push({ s, k: lab + " · " + o.n, t: f.n, sn: trecho(f.t, ws), h: `#/compendio?aba=${k === "ancestries" ? "ancestralidades" : "comunidades"}&id=${encodeURIComponent(c.id)}`, exp: c }); } }
  for (const [k, lab] of [["consumables", "Consumível"], ["items", "Item"]]) for (const c of list(k)) { const o = loc(k, c); const s = pontua(norm(o.x), norm(o.n + " " + c.n), ws); if (s) res.push({ s: s - 1, k: lab, t: o.n, sn: trecho(o.x, ws), h: "#/compendio?aba=itens&q=" + encodeURIComponent(o.n), exp: c }); }
  if (SRD) for (const r of SRD) { const s = pontua(r.nb, r.nt, ws); if (s) res.push({ s: s - 2, k: "SRD" + (r.xp ? "" : " (inglês)") + " · " + (grpPT(r.grp) || r.cap), t: r.tp || r.t, sn: trecho(r.xp || r.x, ws), h: "#/regras/srd/" + r.i }); }
  return res.sort((a, b) => b.s - a.s).slice(0, 60);
}

function artigo(id) {
  const g = guia().find(x => x.id === id);
  if (!g) return `<div class="empty">Seção não encontrada.</div>`;
  const rel = guia().filter(x => x.cap === g.cap && x.id !== g.id);
  return `<div style="margin-bottom:10px">${voltar("#/regras", "Regras")}</div>
  <article class="card"><div class="eyebrow">${esc(g.cap)}</div><h1 style="margin:4px 0 10px">${esc(g.t)}</h1><div class="tx" style="font-size:1.04rem">${mdBlock(g.x)}</div></article>
  ${rel.length ? `<section class="sec"><h2>Veja também</h2><div class="guide-grid">${rel.map(x => `<a class="gtile" href="#/regras/${x.id}"><b>${esc(x.t)}</b><span>${esc(x.cap)}</span></a>`).join("")}</div></section>` : ""}`;
}
function srdSecao(i) {
  if (!SRD) { carregarSRD(); return `<div class="loading"><div class="spin"></div>Carregando o SRD…</div>`; }
  const r = SRD[+i];
  if (!r) return `<div class="empty">Seção não encontrada.</div>`;
  const viz = SRD.filter(x => x.grp === r.grp && x.cap === r.cap && x.i !== r.i);
  return `<div style="margin-bottom:10px">${voltar("#/regras?srd=1", "Regras")}</div>
  <article class="card"><div class="eyebrow">${esc(r.cap)}${r.grp ? " · " + esc(grpPT(r.grp)) : ""}${r.xp ? "" : " · texto original em inglês"}</div><h1 style="margin:4px 0 10px">${esc(r.tp || r.t)}</h1><div class="tx">${mdBlock(r.xp || r.x)}</div>
  ${r.xp ? `<details class="more" style="margin-top:12px"><summary>Ver original (inglês)</summary><div class="tx" style="margin-top:8px"><h3 style="margin:0 0 6px">${esc(r.t)}</h3>${mdBlock(r.x)}</div></details>` : ""}
  <div class="acts">${SRD[r.i - 1] ? `<a class="btn sm" href="#/regras/srd/${r.i - 1}">${icon("back")} ${esc(SRD[r.i - 1].tp || SRD[r.i - 1].t)}</a>` : ""}${SRD[r.i + 1] ? `<a class="btn sm" href="#/regras/srd/${r.i + 1}">${esc(SRD[r.i + 1].tp || SRD[r.i + 1].t)} ${icon("chev")}</a>` : ""}</div></article>
  ${viz.length ? `<section class="sec"><h2>Nesta parte</h2><div class="guide-grid">${viz.map(x => `<a class="gtile" href="#/regras/srd/${x.i}"><b>${esc(x.tp || x.t)}</b><span>${esc(grpPT(x.grp) || x.cap)}</span></a>`).join("")}</div></section>` : ""}`;
}

const ATALHOS = [["dano", "Dano e limiares"], ["descanso", "Descanso"], ["morte", "Morte"], ["condicoes", "Condições"], ["esperanca", "Esperança"], ["vantagem", "Vantagem"], ["alcance", "Alcance"], ["recordar carta", "Recordar carta"], ["multiclasse", "Multiclasse"], ["critico", "Crítico"]];

export function html(p, q) {
  if (p[0] === "srd") return srdSecao(p[1]);
  if (p[0]) return artigo(p[0]);
  if (q.q != null && q.q !== Q) Q = q.q;
  if (!SRD) carregarSRD();
  const caps = [...new Set(guia().map(g => g.cap))];
  const res = Q ? buscar(Q) : null;
  return `<div class="page-h"><h1>Regras</h1><div class="sub">Guia rápido em português e busca em tudo: regras, cartas, habilidades e itens.</div></div>
  <div class="search"><span>${icon("search")}</span><input type="search" data-in="q" data-k="rq" value="${esc(Q)}" placeholder="Ex.: descanso curto, vulnerável, recordar carta…" enterkeyhint="search" autocomplete="off"></div>
  <div class="scroll-x" style="margin-top:10px">${ATALHOS.map(([v, n]) => `<button class="chip${norm(Q) === norm(v) ? " on" : ""}" data-act="q" data-v="${esc(v)}">${n}</button>`).join("")}</div>
  <div id="rres">${res ? resultados(res) : inicio(caps, q)}</div>`;
}
function resultados(res) {
  if (!res.length) return `<div class="empty" style="margin-top:14px"><h3>Nada encontrado</h3><p>Tente outra palavra, em português ou inglês.${SRD ? "" : " O SRD completo ainda está carregando."}</p></div>`;
  return `<p class="muted small" style="margin:12px 0 0">${res.length} resultado${res.length > 1 ? "s" : ""}</p>${res.map(r => r.card
    ? `<button class="res" data-act="carta" data-id="${esc(r.card)}"><div class="k">${esc(r.k)} ${r.exp ? expTag(r.exp) : ""}</div><div class="t">${esc(r.t)}</div><div class="s">${esc(r.sn)}</div></button>`
    : `<a class="res" href="${r.h}" style="text-decoration:none"><div class="k">${esc(r.k)} ${r.exp ? expTag(r.exp) : ""}</div><div class="t">${esc(r.t)}</div><div class="s">${esc(r.sn)}</div></a>`).join("")}`;
}
function inicio(caps, q) {
  const srdCaps = SRD ? [...new Set(SRD.map(r => r.cap))] : [];
  return `${caps.map(c => `<section class="sec"><h2>${esc(c)}</h2><div class="guide-grid">${guia().filter(g => g.cap === c).map(g => `<a class="gtile" href="#/regras/${g.id}"><b>${esc(g.t)}</b><span>${esc(g.tags.slice(0, 3).join(", "))}</span></a>`).join("")}</div></section>`).join("")}
  <section class="sec"><h2>SRD completo ${TEM_PT ? "" : `<span class="tag">inglês</span>`}</h2><p class="muted" style="margin-top:-4px">O documento oficial inteiro${TEM_PT ? ", em português, com o original em inglês em cada seção" : ""}. A busca acima procura aqui nas duas línguas.</p>
  ${SRD ? srdCaps.map(c => `<details class="more"><summary>${esc(c)}</summary><div class="guide-grid" style="margin:6px 0 12px">${SRD.filter(r => r.cap === c).map(r => `<a class="gtile" href="#/regras/srd/${r.i}"><b>${esc(r.tp || r.t)}</b><span>${esc(grpPT(r.grp) || c)}</span></a>`).join("")}</div></details>`).join("") : `<div class="loading" style="min-height:80px"><div class="spin"></div></div>`}</section>`;
}

const atualizar = debounce(() => { const el = document.getElementById("rres"); if (!el) return; el.innerHTML = Q ? resultados(buscar(Q)) : inicio([...new Set(guia().map(g => g.cap))]); }, 160);
export function input(k, el) { if (k === "q") { Q = el.value; atualizar(); } }
export function on(a, el) {
  if (a === "q") { Q = norm(Q) === norm(el.dataset.v) ? "" : el.dataset.v; app.render(true); }
  if (a === "carta") verCarta(el.dataset.id);
}
