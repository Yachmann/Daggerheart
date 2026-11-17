// Rolador pessoal de Dados de Dualidade (não é rastreador de combate: nada é compartilhado)
import { esc, openSheet, icon, store, sgn } from "../util.js";
import { ficha, editar } from "../store.js";
import { deriv } from "../calc.js";
import { TRAITS, traitPT } from "../data.js";

const HK = "dh-rolagens";
const d = n => 1 + Math.floor(Math.random() * n);

export function abrirRolador(ds = {}) {
  const f = ds.pc && ficha(ds.pc), pc = f && f.data, dv = pc && deriv(pc);
  const st = { mod: +ds.mod || 0, rot: ds.rot || "Teste", vant: 0, exp: [], dif: "" };
  const w = openSheet("", { title: "Dados de Dualidade" });
  const body = w.querySelector(".sheet-body");
  let res = null;

  const draw = () => {
    const expBonus = pc ? st.exp.reduce((s, i) => s + (pc.exp[i] ? pc.exp[i].v : 0), 0) : 0;
    body.innerHTML = `
    ${res ? resultado(res) : `<p class="muted" style="margin-top:0">Role 2d12: o Dado de Esperança e o Dado de Medo. Some o atributo; o maior dado diz se o resultado é “com Esperança” ou “com Medo”.</p>`}
    ${pc ? `<div class="eyebrow" style="margin:10px 0 6px">Atributo</div><div class="chips">${TRAITS.map(t => `<button class="chip${st.rot === traitPT(t.en) ? " on" : ""}" data-tr="${t.k}">${esc(traitPT(t.en))} ${sgn(dv.atr[t.k])}</button>`).join("")}</div>` : ""}
    <div class="row" style="margin-top:12px">
      <label class="f">Modificador<input type="number" id="rmod" value="${st.mod}"></label>
      <label class="f">Dificuldade (opcional)<input type="number" id="rdif" value="${st.dif}" placeholder="—"></label></div>
    <div class="eyebrow" style="margin:12px 0 6px">Vantagem</div>
    <div class="chips">${[[-1, "Desvantagem (−d6)"], [0, "Nenhuma"], [1, "Vantagem (+d6)"]].map(([v, n]) => `<button class="chip${st.vant === v ? " on" : ""}" data-v="${v}">${n}</button>`).join("")}</div>
    ${pc && pc.exp.some(e => e.n) ? `<div class="eyebrow" style="margin:12px 0 6px">Experiências (1 Esperança cada)</div><div class="chips">${pc.exp.map((e, i) => e.n ? `<button class="chip${st.exp.includes(i) ? " on" : ""}" data-x="${i}">${esc(e.n)} +${e.v}</button>` : "").join("")}</div>` : ""}
    <div class="acts"><button class="btn hope block" id="rgo" style="min-height:54px;font-size:1.1rem">${icon("dice")} Rolar ${esc(st.rot)} ${sgn(st.mod + expBonus)}</button></div>
    ${historico()}`;
    body.querySelectorAll("[data-tr]").forEach(b => b.addEventListener("click", () => { const t = TRAITS.find(t => t.k === b.dataset.tr); st.rot = traitPT(t.en); st.mod = dv.atr[t.k]; draw(); }));
    body.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => { st.vant = +b.dataset.v; draw(); }));
    body.querySelectorAll("[data-x]").forEach(b => b.addEventListener("click", () => { const i = +b.dataset.x, k = st.exp.indexOf(i); k >= 0 ? st.exp.splice(k, 1) : st.exp.push(i); draw(); }));
    body.querySelector("#rmod").addEventListener("input", e => { st.mod = parseInt(e.target.value, 10) || 0; });
    body.querySelector("#rdif").addEventListener("input", e => { st.dif = e.target.value; });
    body.querySelector("#rgo").addEventListener("click", rolar);
    const ap = body.querySelector("#rapply");
    if (ap) ap.addEventListener("click", () => {
      editar(ds.pc, p => { const m = deriv(p); if (res.crit) { p.st.esp = Math.min(m.espMax, p.st.esp + 1); p.st.es = Math.max(0, p.st.es - 1); } else if (res.hope) p.st.esp = Math.min(m.espMax, p.st.esp + 1); p.st.esp = Math.max(0, p.st.esp - res.gasto); }, { imediato: true });
      res.aplicado = true; draw();
    });
  };

  function rolar() {
    const h = d(12), m = d(12), v = st.vant ? d(6) : 0;
    const expBonus = pc ? st.exp.reduce((s, i) => s + (pc.exp[i] ? pc.exp[i].v : 0), 0) : 0;
    const total = h + m + st.mod + expBonus + st.vant * v;
    const dif = parseInt(st.dif, 10);
    res = { h, m, v, vant: st.vant, total, crit: h === m, hope: h > m, rot: st.rot, mod: st.mod + expBonus, dif: isNaN(dif) ? null : dif, gasto: st.exp.length, anim: true };
    const hist = store.get(HK, []);
    hist.unshift({ t: Date.now(), rot: st.rot, total, tipo: res.crit ? "Crítico" : res.hope ? "Esperança" : "Medo", pc: pc ? pc.nome : "" });
    store.set(HK, hist.slice(0, 12));
    draw(); res.anim = false;
  }
  function resultado(r) {
    const tipo = r.crit ? ["c", "Sucesso crítico!"] : r.hope ? ["h", "com Esperança"] : ["f", "com Medo"];
    const suc = r.dif == null ? "" : r.crit || r.total >= r.dif ? "Sucesso" : "Falha";
    return `<div class="roll-res"><div class="dice"><div class="die h${r.anim ? " anim" : ""}" title="Esperança">${r.h}</div><div class="die f${r.anim ? " anim" : ""}" title="Medo">${r.m}</div>${r.vant ? `<div class="die n${r.anim ? " anim" : ""}" title="${r.vant > 0 ? "Vantagem" : "Desvantagem"}">${r.vant > 0 ? "+" : "−"}${r.v}</div>` : ""}</div>
      <div class="roll-total">${r.total}</div><div class="muted small">${esc(r.rot)} ${sgn(r.mod)}</div>
      <span class="roll-tag ${tipo[0]}">${suc ? suc + " " : ""}${tipo[1]}</span>
      <p class="muted small">${r.crit ? "Ganhe 1 de Esperança e recupere 1 de Estresse. Num ataque, o dano é crítico." : r.hope ? "Ganhe 1 de Esperança." : "O mestre ganha 1 de Medo e pode pegar o holofote."}${r.gasto ? ` Gaste ${r.gasto} de Esperança pelas Experiências.` : ""}</p>
      ${pc && !r.aplicado ? `<button class="btn sm" id="rapply">Aplicar na ficha</button>` : r.aplicado ? `<span class="tag">Aplicado ✓</span>` : ""}</div>`;
  }
  const historico = () => { const h = store.get(HK, []); return h.length ? `<div class="hist"><div class="eyebrow">Últimas rolagens (só neste aparelho)</div>${h.map(x => `<div>${new Date(x.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${x.pc ? esc(x.pc) + " · " : ""}${esc(x.rot)}: <b>${x.total}</b> ${x.tipo}</div>`).join("")}</div>` : ""; };
  draw();
}
