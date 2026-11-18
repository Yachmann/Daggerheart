// Componentes visuais do mestre: ficha de adversário, pips, seleção de batalha
import { esc, md, mdBlock, icon, openSheet, closeSheet, toast } from "../util.js";
import { T, dmgPT } from "../data.js";
import { TIPO_PT, KIND_PT, parseTh, GM, adicionar, salvarGM, novaBatalha, salvarBatalha, orcamento } from "../gm.js";

export const tipoTag = a => `${a.tier ? "P" + a.tier + " · " : ""}${TIPO_PT[a.type] || a.type}${a.horde ? " (" + a.horde + ")" : ""}`;
export const fonteTag = a => (a.src === "hf" ? `<span class="tag exp" title="Expansão Hope & Fear">H&F</span>` : a.src === "custom" ? `<span class="tag hope">${a.ia ? "IA" : "Meu"}</span>` : "");
export const kindTag = k => (k ? `<span class="tag k-${esc(k)}">${esc(KIND_PT[k] || k)}</span>` : "");

export function statBlock(a, { acts = "", compact = false } = {}) {
  const th = parseTh(a.th);
  return `<article class="sb2 ty-${esc(a.type)}">
    <div class="eyebrow">${esc(tipoTag(a))} ${fonteTag(a)}</div>
    <h3>${esc(a.name)}</h3>
    ${a.desc ? `<p class="sb-desc">${esc(a.desc)}</p>` : ""}
    <div class="nums">
      <div class="num"><b>${esc(a.dif)}</b><span>Dificuldade</span></div>
      <div class="num"><b>${th.maj ?? "–"} / ${th.sev ?? "–"}</b><span>Limiares</span></div>
      <div class="num"><b>${esc(a.hp)}</b><span>PV</span></div>
      <div class="num"><b>${esc(a.st)}</b><span>Estresse</span></div>
      <div class="num"><b>${esc(a.atk)}</b><span>Ataque</span></div>
    </div>
    <p class="l"><b>${esc(a.wpn)}</b> · ${esc(T(a.rng))} · ${esc(dmgPT(a.dmg))}</p>
    ${a.xp ? `<p class="l"><b>Experiência:</b> ${esc(a.xp)}</p>` : ""}
    ${a.mot ? `<p class="l"><b>Motivações:</b> ${esc(a.mot)}</p>` : ""}
    ${compact ? "" : (a.f || []).map(f => `<div class="feat"><div class="feat-h"><b>${esc(f.n)}</b> ${kindTag(f.k)}</div><div class="tx">${mdBlock(f.t)}</div></div>`).join("")}
    ${acts}
  </article>`;
}

export function envBlock(e, { acts = "" } = {}) {
  return `<article class="sb2 ty-env"><div class="eyebrow">Ambiente · P${e.tier} · ${esc(e.type || "")} ${e.src === "hf" ? `<span class="tag exp">H&F</span>` : ""}</div>
    <h3>${esc(e.name)}</h3>${e.desc ? `<p class="sb-desc">${esc(e.desc)}</p>` : ""}
    <div class="nums"><div class="num"><b>${esc(e.dif || "–")}</b><span>Dificuldade</span></div></div>
    ${e.impulses ? `<p class="l"><b>Impulsos:</b> ${esc(e.impulses)}</p>` : ""}
    ${e.adv ? `<p class="l"><b>Adversários possíveis:</b> ${esc(e.adv)}</p>` : ""}
    ${(e.f || []).map(f => `<div class="feat"><div class="feat-h"><b>${esc(f.n)}</b> ${kindTag(f.k)}</div><div class="tx">${mdBlock(f.t)}</div></div>`).join("")}${acts}</article>`;
}

export function pipsU(n, on, act, id) {
  let h = "";
  for (let i = 0; i < n; i++) h += `<button class="pip${i < on ? " on" : ""}" data-act="${act}" data-id="${id}" data-i="${i}" aria-label="${i + 1}" aria-pressed="${i < on}"></button>`;
  return h;
}

// Escolher uma batalha (ou criar uma) para receber adversários
export function escolherBatalha(a, qtdPadrao = 1, aposAdicionar) {
  const abertas = GM.batalhas.filter(b => b.tipo !== "cena" && b.status !== "fim");
  const qtd0 = a.type === "Minion" ? 4 : qtdPadrao;
  const w = openSheet(`<p class="muted" style="margin-top:0">${esc(a.name)} · ${esc(tipoTag(a))}</p>
    <label class="f">Quantos<input type="number" id="eqtd" min="1" max="30" value="${qtd0}"></label>
    <div class="eyebrow" style="margin:14px 0 6px">Adicionar a</div>
    ${abertas.length ? `<div class="opts" style="grid-template-columns:1fr">${abertas.map(b => `<button class="opt" data-b="${b.id}"><span class="t" style="font-size:1.1rem">${esc(b.nome)}</span><span class="s">${b.unidades.length} adversário(s) · ${b.status === "ativa" ? "em andamento" : "em preparação"}</span></button>`).join("")}</div>` : `<p class="muted small">Nenhuma batalha aberta.</p>`}
    <div class="acts"><button class="btn hope" data-b="nova">${icon("plus")} Nova batalha com ele</button></div>`, { title: "Adicionar à batalha" });
  w.querySelectorAll("[data-b]").forEach(btn => btn.addEventListener("click", () => {
    const q = parseInt(w.querySelector("#eqtd").value, 10) || 1;
    let b;
    if (btn.dataset.b === "nova") { b = novaBatalha({ nome: "Batalha: " + a.name }); GM.batalhas.unshift(b); }
    else b = GM.batalhas.find(x => x.id === btn.dataset.b && x.tipo !== "cena");
    adicionar(b, a, q); salvarGM(); closeSheet();
    toast(`${q > 1 ? q + "× " : ""}${a.name} em “${b.nome}”`);
    if (aposAdicionar) aposAdicionar(b);
  }));
}

export const barraOrc = b => {
  const o = orcamento(b), pct = Math.min(100, Math.round((o.custo / Math.max(1, o.total)) * 100));
  const cor = o.sobra < 0 ? "var(--blood)" : o.sobra === 0 ? "var(--moss)" : "var(--hope)";
  return `<div class="orc"><div class="orc-h"><b>${o.custo} / ${o.total}</b><span class="muted small">pontos de batalha</span></div><div class="orc-b"><i style="width:${pct}%;background:${cor}"></i></div>
    <p class="muted small" style="margin:6px 0 0">${o.sobra < 0 ? `Passou ${-o.sobra} ponto${o.sobra === -1 ? "" : "s"}: luta mais pesada que o padrão.` : o.sobra === 0 ? "No ponto." : `Sobram ${o.sobra} ponto${o.sobra === 1 ? "" : "s"}.`}${o.solos >= 2 ? " Com 2 ou mais Solos, o livro recomenda ajuste de −2." : ""}</p></div>`;
};
