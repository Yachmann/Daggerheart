// Importar batalha criada pela IA (JSON colado) com validação e pré-visualização
import { esc, icon, toast, mdBlock, openSheet } from "../util.js";
import { extrairJSON, montarDaIA, salvarBatalha, orcamento, TIPO_PT, CUSTO } from "../gm.js";
import { S, user } from "../store.js";
import { app } from "../main.js";
import { statBlock, barraOrc, tipoTag } from "./mestre-ui.js";
import { voltar } from "./common.js";

let texto = "", res = null, erroLeitura = "", salvarNovos = true, mesa = "";

export function html() {
  const mesas = S.mesas.filter(m => user() && m.mestre === user().id);
  return `<div style="margin-bottom:10px">${voltar("#/mestre", "Mestre")}</div>
  <div class="page-h"><h1>Importar da IA</h1><div class="sub">Cole o JSON que o seu projeto do Claude gerou. O site monta a batalha com todos os adversários, pronta para iniciar.</div></div>
  <section class="card">
    <label class="f">JSON da batalha<textarea id="jt" data-in="t" data-k="jt" style="min-height:170px;font-family:ui-monospace,Consolas,monospace;font-size:.85rem" placeholder='{ "formato": "daggerheart-batalha", "nome": "…", "adversarios": [ … ] }'>${esc(texto)}</textarea></label>
    <div class="acts"><button class="btn hope" data-act="ler" ${texto.trim() ? "" : "disabled"}>${icon("sparkle")} Ler e validar</button>
      <label class="btn" style="position:relative;overflow:hidden">Abrir arquivo .json<input type="file" accept=".json,.txt,application/json,text/plain" data-ch="arq" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <button class="btn ghost" data-act="colar">Colar da área de transferência</button></div>
    <p class="muted small" style="margin:8px 0 0">Pode colar a resposta inteira do Claude: o site encontra o bloco JSON sozinho. Ainda não configurou o projeto? <a href="#/mestre?aba=ia">Veja como conectar a IA</a>.</p>
  </section>
  ${erroLeitura ? `<div class="err" style="margin-top:12px">${esc(erroLeitura)}</div>` : ""}
  ${res ? resultado(res, mesas) : ""}`;
}

function resultado(r, mesas) {
  const b = r.batalha, erros = r.avisos.filter(a => a.k === "erro"), outros = r.avisos.filter(a => a.k !== "erro");
  const grupos = []; b.unidades.forEach(u => { const g = grupos.find(x => x.ref === u.ref); g ? g.n++ : grupos.push({ ref: u.ref, n: 1, u }); });
  return `<section class="card" style="margin-top:14px"><div class="eyebrow">Pré-visualização</div><h2 style="margin:4px 0 6px">${esc(b.nome)}</h2>
    ${b.cena ? `<div class="tx muted">${mdBlock(b.cena)}</div>` : ""}
    <div class="grid2" style="margin-top:10px"><label class="f">Jogadores<input type="number" min="1" max="8" value="${b.jogadores}" data-in="jog" data-k="ijog"></label>
      <label class="f">Mesa<select data-ch="mesa"><option value="">Nenhuma</option>${mesas.map(m => `<option value="${m.id}"${mesa === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label></div>
    <div style="margin-top:12px">${barraOrc(b)}</div></section>
  ${erros.length ? `<div class="err" style="margin-top:12px"><b>Corrija antes de criar:</b><ul style="margin:6px 0 0;padding-left:1.2em">${erros.map(a => `<li>${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
  ${outros.length ? `<div class="note" style="margin-top:12px"><ul style="margin:0;padding-left:1.2em">${outros.map(a => `<li>${a.k === "dica" ? "💡 " : "⚠️ "}${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
  <section class="sec"><h2>Adversários (${b.unidades.length})</h2>
    ${grupos.map(g => `<div class="card" style="margin-top:8px;display:flex;gap:12px;align-items:center"><span class="numb" style="flex:none">${g.n}×</span><div class="grow" style="min-width:0"><b>${esc(g.ref)}</b> ${r.novos.some(n => n.name === g.ref) ? `<span class="tag hope">novo</span>` : ""}<div class="muted small">${esc(tipoTag(g.u))} · Dif ${esc(g.u.dif)} · PV ${g.u.hpMax} · ${CUSTO[g.u.type] ?? 2} pt${g.u.type === "Minion" ? " por grupo" : " cada"}</div></div><button class="btn sm ghost" data-act="ver" data-ref="${esc(g.ref)}">Ver</button></div>`).join("")}</section>
  ${b.ambiente ? `<p class="muted"><b>Ambiente:</b> ${esc(b.ambiente.name)}</p>` : ""}
  ${b.contagens.length ? `<p class="muted"><b>Contagens:</b> ${b.contagens.map(c => esc(c.n) + " (" + c.size + ")").join(", ")}</p>` : ""}
  ${r.novos.length ? `<label class="switch"><input type="checkbox" data-ch="novos" ${salvarNovos ? "checked" : ""}><span class="t"><b>Salvar ${r.novos.length} adversário(s) novo(s) na biblioteca</b><span>Para reutilizar em outras batalhas.</span></span></label>` : ""}
  <div class="wiz-foot"><button class="btn" data-act="copiarerros" ${erros.length || outros.length ? "" : "disabled"}>Copiar pedido de correção</button><button class="btn hope" data-act="criar" ${r.ok ? "" : "disabled"}>${icon("sword")} Criar batalha</button></div>`;
}

function ler() {
  erroLeitura = ""; res = null;
  try { res = montarDaIA(extrairJSON(texto)); res.batalha.mesa = mesa || null; }
  catch (e) { erroLeitura = e.message; }
}
export function preencher(t) { texto = t; erroLeitura = ""; res = null; ler(); }
export function on(a, el) {
  switch (a) {
    case "ler": ler(); break;
    case "colar": navigator.clipboard.readText().then(t => { texto = t; ler(); app.render(true); }).catch(() => toast("O navegador bloqueou a colagem: cole no campo manualmente")); return;
    case "ver": { const adv = res.novos.find(n => n.name === el.dataset.ref); const u = res.batalha.unidades.find(x => x.ref === el.dataset.ref); openSheet(statBlock(adv || { name: u.name, tier: u.tier, type: u.type, horde: u.horde, dif: u.dif, th: `${u.maj ?? "None"}/${u.sev ?? ""}`, hp: u.hpMax, st: u.stMax, atk: u.atk, wpn: u.wpn, rng: u.rng, dmg: u.dmg, xp: u.xp, mot: u.mot, f: u.f }), { title: el.dataset.ref, wide: true }); return; }
    case "copiarerros": {
      const l = res.avisos.map(x => "- " + x.t).join("\n");
      navigator.clipboard.writeText(`O site não aceitou o JSON da batalha. Corrija e me envie o JSON completo de novo:\n${l}`).then(() => toast("Pedido copiado: cole no Claude"));
      return;
    }
    case "criar": {
      const b = res.batalha; b.mesa = mesa || null;
      salvarBatalha(b, { novos: salvarNovos ? res.novos : [] });
      texto = ""; res = null;
      toast("Batalha criada!"); location.hash = "#/mestre/batalha/" + b.id; return;
    }
  }
  app.render(true);
}
export function input(k, el) {
  if (k === "t") { texto = el.value; const b = document.querySelector('[data-act="ler"]'); if (b) b.disabled = !texto.trim(); }
  if (k === "jog" && res) { res.batalha.jogadores = Math.max(1, Math.min(8, parseInt(el.value, 10) || 1)); const o = document.querySelector(".orc"); if (o) o.outerHTML = barraOrc(res.batalha); }
}
export function change(k, el) {
  if (k === "mesa") { mesa = el.value; if (res) res.batalha.mesa = mesa || null; }
  if (k === "novos") salvarNovos = el.checked;
  if (k === "arq") { const f = el.files[0]; if (!f) return; f.text().then(t => { texto = t; ler(); app.render(true); }); }
}
