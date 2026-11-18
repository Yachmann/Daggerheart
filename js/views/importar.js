// Importar da IA: cola a resposta inteira; cada bloco JSON vira uma batalha ou uma cena, com validação e pré-visualização.
import { esc, icon, toast, mdBlock, openSheet } from "../util.js";
import { lerResposta, salvarBatalha, orcamento, CUSTO } from "../gm.js";
import { RESULTADOS } from "../cena.js";
import { S, user } from "../store.js";
import { app } from "../main.js";
import { statBlock, barraOrc, tipoTag } from "./mestre-ui.js";
import { voltar } from "./common.js";

let texto = "", itens = [], erroLeitura = "", salvarNovos = true, mesa = "", sel = new Set();

export function html() {
  const mesas = S.mesas.filter(m => user() && m.mestre === user().id);
  const prontos = itens.filter(i => i.ok);
  const escolhidos = itens.filter(i => i.ok && sel.has(i.indice));
  const comAviso = itens.filter(i => i.avisos.length);
  return `<div style="margin-bottom:10px">${voltar("#/mestre", "Mestre")}</div>
  <div class="page-h"><h1>Importar da IA</h1><div class="sub">Cole a resposta do Claude. Cada bloco JSON vira uma <b>batalha</b> ou uma <b>cena complexa</b>, pronta para conduzir.</div></div>
  <section class="card">
    <label class="f">Resposta ou JSON<textarea id="jt" data-in="t" data-k="jt" style="min-height:170px;font-family:ui-monospace,Consolas,monospace;font-size:.85rem" placeholder='Cole a resposta inteira. Blocos como { "formato": "daggerheart-batalha", "tipo": "cena", … } são encontrados sozinhos.'>${esc(texto)}</textarea></label>
    <div class="acts"><button class="btn hope" data-act="ler" ${texto.trim() ? "" : "disabled"}>${icon("sparkle")} Ler e validar</button>
      <label class="btn" style="position:relative;overflow:hidden">Abrir arquivo .json<input type="file" accept=".json,.txt,application/json,text/plain" data-ch="arq" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <button class="btn ghost" data-act="colar">Colar da área de transferência</button></div>
    <p class="muted small" style="margin:8px 0 0">Ainda não configurou o projeto? <a href="#/mestre?aba=ia">Veja como conectar a IA</a> e o <a href="#/mestre?aba=ia">formato da cena complexa</a>.</p>
  </section>
  ${erroLeitura ? `<div class="err" style="margin-top:12px">${esc(erroLeitura)}</div>` : ""}
  ${itens.length ? `<p class="muted" style="margin:14px 0 0">${itens.length} bloco${itens.length > 1 ? "s" : ""} encontrado${itens.length > 1 ? "s" : ""}: ${prontos.length} válido${prontos.length === 1 ? "" : "s"}${itens.length - prontos.length ? `, ${itens.length - prontos.length} com erro` : ""}.</p>
    ${mesas.length ? `<label class="f" style="margin-top:8px;max-width:360px">Mesa das batalhas<select data-ch="mesa"><option value="">Nenhuma</option>${mesas.map(m => `<option value="${m.id}"${mesa === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>` : ""}
    ${itens.map(card).join("")}
    ${itens.some(i => i.novos.length) ? `<label class="switch"><input type="checkbox" data-ch="novos" ${salvarNovos ? "checked" : ""}><span class="t"><b>Salvar os adversários novos na biblioteca</b><span>Para reutilizar em outras batalhas e cenas.</span></span></label>` : ""}
    <div class="wiz-foot"><button class="btn" data-act="copiarerros" ${comAviso.length ? "" : "disabled"}>Copiar pedido de correção</button><button class="btn hope" data-act="criar" ${escolhidos.length ? "" : "disabled"}>${icon("sword")} Criar ${escolhidos.length > 1 ? escolhidos.length + " itens" : "selecionado"}</button></div>` : ""}`;
}

function resumoCena(c) {
  return `<div class="muted small"><b>Objetivo:</b> ${esc(c.objetivo)}</div>
    <div class="chips" style="margin:8px 0">${c.contagens.map(k => `<span class="tag" style="border:1px solid var(--line)">${esc(k.n)} · ${k.size} caixas · ${esc(k.lado)}</span>`).join("")}</div>
    <div class="muted small">${RESULTADOS.length} resultados · ${c.medoJogadas.length} jogada${c.medoJogadas.length === 1 ? "" : "s"} de Medo · ${c.jogadoresUsos.length} uso${c.jogadoresUsos.length === 1 ? "" : "s"} dos jogadores · ${c.gatilhos.length} gatilho${c.gatilhos.length === 1 ? "" : "s"}${c.unidades.length ? ` · ${c.unidades.length} adversário${c.unidades.length === 1 ? "" : "s"}` : ""}${c.lembretes && c.lembretes.length ? ` · ${c.lembretes.length} lembrete${c.lembretes.length === 1 ? "" : "s"}` : ""}${c.ambiente ? ` · ambiente ${esc(c.ambiente.name)}` : ""}</div>`;
}
function resumoBatalha(b) {
  const g = []; b.unidades.forEach(u => { const x = g.find(y => y.ref === u.ref); x ? x.n++ : g.push({ ref: u.ref, n: 1, u }); });
  return `${barraOrc(b)}${b.lembretes && b.lembretes.length ? `<div class="muted small" style="margin-top:8px">⚑ ${b.lembretes.length} lembrete${b.lembretes.length === 1 ? "" : "s"}: ${b.lembretes.map(l => esc(l.titulo)).join(" · ")}</div>` : ""}<div style="margin-top:8px">${g.map(x => `<div class="inv-row"><span class="numb" style="flex:none">${x.n}×</span><div class="grow"><b>${esc(x.ref)}</b>${itensNovos(x.ref) ? ` <span class="tag hope">novo</span>` : ""}<div class="muted small">${esc(tipoTag(x.u))} · Dif ${esc(x.u.dif)} · PV ${x.u.hpMax} · ${CUSTO[x.u.type] ?? 2} pt${x.u.type === "Minion" ? " por grupo" : " cada"}</div></div><button class="btn sm ghost" data-act="ver" data-ref="${esc(x.ref)}">Ver</button></div>`).join("")}</div>`;
}
const itensNovos = ref => itens.some(i => i.novos.some(n => n.name === ref));

function card(it) {
  const erros = it.avisos.filter(a => a.k === "erro"), outros = it.avisos.filter(a => a.k !== "erro");
  const r = it.registro, ehCena = it.tipo === "cena";
  return `<section class="card" style="margin-top:12px;${it.ok ? "" : "border-color:var(--blood)"}">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      ${it.ok ? `<label class="switch" style="padding:0"><input type="checkbox" data-ch="sel" data-i="${it.indice}" ${sel.has(it.indice) ? "checked" : ""} aria-label="Criar este item"><span class="t"></span></label>` : `<span class="tag dead">Erro</span>`}
      <span class="tag ${ehCena ? "exp" : "hope"}">${ehCena ? "Cena complexa" : it.tipo === "batalha" ? "Batalha" : "Bloco"}</span>
      <h3 style="flex:1;min-width:160px;margin:0">${esc(it.titulo)}</h3>
      ${it.ok ? `<button class="btn sm" data-act="criarum" data-i="${it.indice}">Criar só este</button>` : ""}</div>
    ${r ? `<div style="margin-top:10px">${ehCena ? resumoCena(r) : resumoBatalha(r)}</div>` : ""}
    ${r && !ehCena && r.cena ? `<div class="tx muted small" style="margin-top:8px">${mdBlock(r.cena)}</div>` : ""}
    ${r && !ehCena ? `<label class="f" style="margin-top:10px;max-width:160px">Jogadores<input type="number" min="1" max="8" value="${r.jogadores}" data-in="jog" data-i="${it.indice}" data-k="ijog${it.indice}"></label>` : ""}
    ${erros.length ? `<div class="err" style="margin-top:10px"><b>Corrija antes de criar:</b><ul style="margin:6px 0 0;padding-left:1.2em">${erros.map(a => `<li>${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
    ${outros.length ? `<div class="note" style="margin-top:10px"><ul style="margin:0;padding-left:1.2em">${outros.map(a => `<li>${a.k === "dica" ? "💡 " : "⚠️ "}${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
  </section>`;
}

function ler() {
  erroLeitura = ""; itens = []; sel = new Set();
  try { itens = lerResposta(texto); itens.forEach(i => { if (i.ok) sel.add(i.indice); if (i.registro && i.tipo !== "cena") i.registro.mesa = mesa || null; }); }
  catch (e) { erroLeitura = e.message; }
}
export function preencher(t) { texto = t; ler(); }

function criar(lista) {
  let ultimo = null;
  lista.forEach(i => { salvarBatalha(i.registro, { novos: salvarNovos ? i.novos : [] }); ultimo = i; });
  texto = ""; itens = []; sel = new Set();
  toast(lista.length > 1 ? `${lista.length} itens criados` : (ultimo.tipo === "cena" ? "Cena criada!" : "Batalha criada!"));
  location.hash = lista.length === 1 ? `#/mestre/${ultimo.tipo === "cena" ? "cena" : "batalha"}/${ultimo.registro.id}` : "#/mestre";
}

export function on(a, el) {
  const i = +el.dataset.i;
  switch (a) {
    case "ler": ler(); break;
    case "colar": navigator.clipboard.readText().then(t => { texto = t; ler(); app.render(true); }).catch(() => toast("O navegador bloqueou a colagem: cole no campo manualmente")); return;
    case "ver": {
      const ref = el.dataset.ref;
      for (const it of itens) { const adv = it.novos.find(n => n.name === ref); const u = it.registro && it.registro.unidades.find(x => x.ref === ref); if (adv || u) { openSheet(statBlock(adv || { name: u.name, tier: u.tier, type: u.type, horde: u.horde, dif: u.dif, th: `${u.maj ?? "None"}/${u.sev ?? ""}`, hp: u.hpMax, st: u.stMax, atk: u.atk, wpn: u.wpn, rng: u.rng, dmg: u.dmg, xp: u.xp, mot: u.mot, f: u.f }), { title: ref, wide: true }); break; } }
      return;
    }
    case "copiarerros": {
      const l = itens.filter(x => x.avisos.length).map(x => `Bloco ${x.indice + 1} (${x.titulo}):\n` + x.avisos.map(a => "- " + a.t).join("\n")).join("\n\n");
      navigator.clipboard.writeText(`O site não aceitou parte do JSON. Corrija e me envie os blocos JSON completos de novo:\n\n${l}`).then(() => toast("Pedido copiado: cole no Claude"));
      return;
    }
    case "criarum": criar([itens.find(x => x.indice === i)]); return;
    case "criar": criar(itens.filter(x => x.ok && sel.has(x.indice))); return;
  }
  app.render(true);
}
export function input(k, el) {
  if (k === "t") { texto = el.value; const b = document.querySelector('[data-act="ler"]'); if (b) b.disabled = !texto.trim(); }
  if (k === "jog") { const it = itens.find(x => x.indice === +el.dataset.i); if (it && it.registro) { it.registro.jogadores = Math.max(1, Math.min(8, parseInt(el.value, 10) || 1)); const o = el.closest("section").querySelector(".orc"); if (o) o.outerHTML = barraOrc(it.registro); } }
}
export function change(k, el) {
  if (k === "mesa") { mesa = el.value; itens.forEach(i => { if (i.registro && i.tipo !== "cena") i.registro.mesa = mesa || null; }); }
  if (k === "novos") salvarNovos = el.checked;
  if (k === "sel") { const i = +el.dataset.i; el.checked ? sel.add(i) : sel.delete(i); app.render(true); }
  if (k === "arq") { const f = el.files[0]; if (!f) return; f.text().then(t => { texto = t; ler(); app.render(true); }); }
}
