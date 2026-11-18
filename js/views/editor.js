// Criar ou editar adversário do zero (ou a partir de um existente)
import { esc, icon, uid, toast, confirmar, openSheet, clone, mdBlock } from "../util.js";
import { GM, salvarGM, adversarios, achaAdv, TIPOS, TIPO_PT, BENCH, PASSIVAS, KIND_PT, gerarAdversario, sortearHabilidade } from "../gm.js";
import { app } from "../main.js";
import { statBlock, escolherBatalha } from "./mestre-ui.js";
import { voltar } from "./common.js";

let D = null, alvo = null;
const RNG = [["Melee", "Corpo a Corpo"], ["Very Close", "Muito Perto"], ["Close", "Perto"], ["Far", "Longe"], ["Very Far", "Muito Longe"]];

function vazio(tipo = "Standard", tier = 1) {
  const b = BENCH[tier];
  return { id: uid(), name: "", tier, type: tipo, horde: "", desc: "", mot: "", dif: String(b.dif), th: tipo === "Minion" ? "None" : b.lim.replace(/\s/g, ""), hp: tipo === "Minion" ? "1" : "6", st: "3", atk: b.atk, wpn: "", rng: "Melee", dmg: "", xp: "", al: [], f: [], cat: "" };
}
function carregar(p, q) {
  const chave = p[1] + "|" + (q.base || "") + "|" + (q.tipo || "");
  if (alvo === chave && D) return;
  alvo = chave;
  if (p[1] === "novo") {
    if (q.base) { const a = achaAdv(q.base); D = a ? { ...clone(a), id: uid(), name: a.name + " (variante)", src: undefined, ia: false } : vazio(); }
    else D = vazio(q.tipo && TIPOS.includes(q.tipo) ? q.tipo : "Standard", +q.tier || 1);
    D.novo = true;
  } else {
    const a = GM.custom.find(x => x.id === p[1]);
    D = a ? clone(a) : null;
  }
}
function th2(D) { const m = String(D.th || "").split("/"); return [m[0] === "None" ? "" : m[0] || "", m[1] || ""]; }

export function html(p, q) {
  carregar(p, q);
  if (!D) return `<div class="empty"><h3>Adversário não encontrado</h3><a class="btn" href="#/mestre?aba=biblioteca">Voltar</a></div>`;
  const b = BENCH[D.tier] || BENCH[1], [maj, sev] = th2(D), minion = D.type === "Minion";
  return `<div style="margin-bottom:10px">${voltar("#/mestre?aba=biblioteca", "Biblioteca")}</div>
  <div class="page-h"><h1>${D.novo ? "Novo adversário" : "Editar adversário"}</h1><div class="sub">Crie do zero ou ajuste uma variação. Ele fica salvo na sua biblioteca e pode entrar em qualquer batalha.</div></div>
  <div class="acts" style="margin:0 0 14px"><button class="btn sm" data-act="sorteio">Preencher com um sorteio do SRD</button><button class="btn sm ghost" data-act="partir">Partir de um existente</button></div>

  <section class="card"><div class="grid2">
    <label class="f">Nome<input type="text" data-in="f" data-f="name" data-k="en" value="${esc(D.name)}" placeholder="Ex.: Madame Ferrugem"></label>
    <div class="row" style="align-items:end"><label class="f">Tipo<select data-ch="tipo">${TIPOS.map(t => `<option value="${t}"${t === D.type ? " selected" : ""}>${TIPO_PT[t]}</option>`).join("")}</select></label>
      <label class="f">Patamar<select data-ch="tier">${[1, 2, 3, 4].map(t => `<option${t === D.tier ? " selected" : ""}>${t}</option>`).join("")}</select></label></div></div>
    <label class="f" style="margin-top:12px">Descrição (aparência e atitude)<textarea data-in="f" data-f="desc" data-k="ed" style="min-height:70px">${esc(D.desc)}</textarea></label>
    <label class="f" style="margin-top:12px">Motivações e táticas<input type="text" data-in="f" data-f="mot" data-k="em" value="${esc(D.mot)}" placeholder="Ex.: Cobrar pedágio, nunca morrer pelo bando"></label></section>

  <section class="card"><h3>Números</h3>
    <div class="note info" style="margin:8px 0 12px;font-size:.88rem">Referência do patamar ${D.tier}: ataque ${b.atk} · dano ${b.dano} · Dificuldade ${b.dif} · limiares ${b.lim}.</div>
    <div class="grid3">
      <label class="f">Dificuldade<input type="number" data-in="f" data-f="dif" data-k="edf" value="${esc(D.dif)}"></label>
      <label class="f">Limiar Maior<input type="number" data-in="th" data-f="0" data-k="et0" value="${maj}" ${minion ? "disabled" : ""}></label>
      <label class="f">Limiar Grave<input type="number" data-in="th" data-f="1" data-k="et1" value="${sev}" ${minion ? "disabled" : ""}></label>
      <label class="f">PV<input type="number" min="1" data-in="f" data-f="hp" data-k="ehp" value="${esc(D.hp)}"></label>
      <label class="f">Estresse<input type="number" min="0" data-in="f" data-f="st" data-k="est" value="${esc(D.st)}"></label>
      <label class="f">Ataque (bônus)<input type="text" data-in="f" data-f="atk" data-k="eatk" value="${esc(D.atk)}"></label></div>
    ${D.type === "Horde" ? `<label class="f" style="margin-top:12px">Horda (ex.: 5/HP)<input type="text" data-in="f" data-f="horde" data-k="eh" value="${esc(D.horde)}"></label>` : ""}</section>

  <section class="card"><h3>Ataque padrão</h3><div class="grid3">
    <label class="f">Arma ou ataque<input type="text" data-in="f" data-f="wpn" data-k="ew" value="${esc(D.wpn)}" placeholder="Ex.: Sabre"></label>
    <label class="f">Alcance<select data-ch="rng">${RNG.map(([v, n]) => `<option value="${v}"${v === D.rng ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="f">Dano<input type="text" data-in="f" data-f="dmg" data-k="edm" value="${esc(D.dmg)}" placeholder="Ex.: 1d8+3 phy"></label></div>
    <p class="muted small" style="margin:6px 0 0">Use “phy” para físico e “mag” para mágico, ou “direct” antes do tipo para dano direto.</p>
    <label class="f" style="margin-top:12px">Experiência (opcional)<input type="text" data-in="f" data-f="xp" data-k="exp" value="${esc(D.xp)}" placeholder="Ex.: Tocaia +2"></label></section>

  <section class="card"><div class="track-h"><h3>Habilidades</h3></div>
    ${D.f.map((f, i) => `<div class="fed"><div class="row"><label class="f" style="flex:3">Nome<input type="text" data-in="fn" data-i="${i}" data-k="fn${i}" value="${esc(f.n)}"></label>
      <label class="f" style="flex:1.2">Tipo<select data-ch="fk" data-i="${i}"><option value=""${!f.k ? " selected" : ""}>—</option>${["Passive", "Action", "Reaction"].map(k => `<option value="${k}"${f.k === k ? " selected" : ""}>${KIND_PT[k]}</option>`).join("")}</select></label></div>
      <label class="f" style="margin-top:8px">Texto (use **negrito** e _itálico_)<textarea data-in="ft" data-i="${i}" data-k="ft${i}">${esc(f.t)}</textarea></label>
      <div class="acts" style="margin-top:6px"><button class="btn sm ghost" data-act="fup" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button><button class="btn sm ghost" data-act="fdn" data-i="${i}" ${i === D.f.length - 1 ? "disabled" : ""} aria-label="Descer">↓</button><button class="btn sm ghost danger" data-act="frm" data-i="${i}">${icon("trash")} Remover</button></div></div>`).join("") || `<p class="muted small">Nenhuma habilidade ainda.</p>`}
    <div class="acts"><button class="btn" data-act="fadd">${icon("plus")} Habilidade em branco</button><button class="btn" data-act="fpass">Passiva padrão…</button><button class="btn" data-act="fsort">Sortear do SRD</button></div></section>

  <div class="wiz-foot"><button class="btn" data-act="prev">Pré-visualizar</button><button class="btn hope" data-act="salvar" ${D.name.trim() && D.wpn.trim() ? "" : "disabled"}>${icon("sparkle")} Salvar na biblioteca</button></div>
  ${!D.novo ? `<div class="acts"><button class="btn danger" data-act="excluir">${icon("trash")} Excluir</button></div>` : ""}`;
}

function pronto() { return { ...clone(D), al: [D.name], src: "custom" }; }
export function on(a, el) {
  const i = +el.dataset.i;
  switch (a) {
    case "sorteio": { const g = gerarAdversario(D.type, D.tier); Object.assign(D, g, { id: D.id, novo: D.novo }); delete D.baseTier; break; }
    case "partir": {
      const todos = adversarios();
      const w = openSheet(`<div class="search"><span>${icon("search")}</span><input type="search" id="pq" placeholder="Buscar adversário…"></div><div id="pl"></div>`, { title: "Partir de um existente", wide: true });
      const draw = q => { w.querySelector("#pl").innerHTML = todos.filter(x => !q || x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40).map(x => `<button class="res" data-n="${esc(x.name)}" data-s="${x.src}"><div class="k">P${x.tier} · ${TIPO_PT[x.type]}</div><div class="t">${esc(x.name)}</div></button>`).join(""); };
      draw(""); w.querySelector("#pq").addEventListener("input", e => draw(e.target.value));
      w.querySelector("#pl").addEventListener("click", e => { const r = e.target.closest("[data-n]"); if (!r) return; const x = todos.find(y => y.name === r.dataset.n && y.src === r.dataset.s); const id = D.id, novo = D.novo; D = { ...clone(x), id, novo, name: x.name + " (variante)", src: undefined, ia: false }; document.querySelector(".sheet-wrap [data-close]").click(); app.render(true); });
      return;
    }
    case "fadd": D.f.push({ n: "", k: "Action", t: "" }); break;
    case "fpass": {
      const w = openSheet(`<div class="opts" style="grid-template-columns:1fr">${PASSIVAS.map((x, k) => `<button class="opt" data-k="${k}"><span class="t" style="font-size:1.1rem">${esc(x.n)}</span><span class="x">${esc(x.t)}</span></button>`).join("")}</div>`, { title: "Passivas padrão" });
      w.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => { D.f.unshift(clone(PASSIVAS[+b.dataset.k])); document.querySelector(".sheet-wrap [data-close]").click(); app.render(true); }));
      return;
    }
    case "fsort": { const f = sortearHabilidade(D.type, D.tier, D.f.map(x => x.n)); if (f) D.f.push({ n: f.n, k: f.k, t: f.t.replace(/\b(the|The) (Burrower|Crawler)\b/g, D.name || "o adversário") }); else toast("Sem habilidades diferentes nesse grupo"); break; }
    case "frm": D.f.splice(i, 1); break;
    case "fup": [D.f[i - 1], D.f[i]] = [D.f[i], D.f[i - 1]]; break;
    case "fdn": [D.f[i + 1], D.f[i]] = [D.f[i], D.f[i + 1]]; break;
    case "prev": openSheet(statBlock(pronto()), { title: D.name || "Pré-visualização", wide: true }); return;
    case "salvar": {
      const x = pronto(); delete x.novo;
      const k = GM.custom.findIndex(c => c.id === x.id);
      k >= 0 ? (GM.custom[k] = x) : GM.custom.unshift(x);
      salvarGM(); toast("Salvo na biblioteca");
      const w = openSheet(`<p class="lead" style="margin-top:0">${esc(x.name)} está na sua biblioteca.</p><div class="acts"><button class="btn hope" id="sb">${icon("plus")} Adicionar a uma batalha</button><a class="btn" href="#/mestre?aba=biblioteca" data-close>Ir para a biblioteca</a></div>`, { title: "Salvo" });
      w.querySelector("#sb").addEventListener("click", () => { document.querySelector(".sheet-wrap [data-close]").click(); escolherBatalha(x); });
      D = x; alvo = null; D.novo = false;
      if (/\/novo/.test(location.hash)) { history.replaceState(null, "", "#/mestre/adversario/" + x.id); }
      break;
    }
    case "excluir": confirmar("Excluir este adversário da biblioteca? As batalhas que já o usam não mudam.", { ok: "Excluir", perigo: true }).then(ok => { if (ok) { GM.custom = GM.custom.filter(c => c.id !== D.id); salvarGM(); D = null; alvo = null; location.hash = "#/mestre?aba=biblioteca"; } }); return;
    default: return;
  }
  app.render(true);
}
export function input(k, el) {
  const i = +el.dataset.i;
  if (k === "f") D[el.dataset.f] = el.value;
  else if (k === "fn") D.f[i].n = el.value;
  else if (k === "ft") D.f[i].t = el.value;
  else if (k === "th") { const [a, b] = th2(D); const v = el.value.replace(/\D/g, ""); D.th = el.dataset.f === "0" ? `${v}/${b}` : `${a}/${v}`; }
  const btn = document.querySelector('[data-act="salvar"]'); if (btn) btn.disabled = !(D.name.trim() && D.wpn.trim());
}
export function change(k, el) {
  const i = +el.dataset.i;
  if (k === "tipo") { D.type = el.value; if (el.value === "Minion") { D.th = "None"; D.hp = "1"; } else if (D.th === "None") D.th = BENCH[D.tier].lim.replace(/\s/g, ""); }
  if (k === "tier") { D.tier = +el.value; }
  if (k === "rng") D.rng = el.value;
  if (k === "fk") D.f[i].k = el.value;
  app.render(true);
}
