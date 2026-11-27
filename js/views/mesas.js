// Mesas (campanhas): o mestre cria, os jogadores entram com um código e vinculam suas fichas.
import { esc, icon, toast, confirmar, openSheet, closeSheet } from "../util.js";
import { S, sb, user, criarMesa, entrarNaMesa, atualizarMesa, sairDaMesa, excluirMesa, fichasDaMesa, minhasFichas, moverParaMesa, carregarMesas, sincronizar } from "../store.js";
import { EXP } from "../data.js";
import { app } from "../main.js";
import { cardPC } from "./fichas.js";
import { voltar, condBanner } from "./common.js";
import { deriv } from "../calc.js";
import { tokens as tokensDe, infimo, TOK_PADRAO } from "../homebrew.js";

let codigoPre = "";

export const ouve = m => m.startsWith("ficha:");
export function html(p, q) {
  if (q.entrar) codigoPre = q.entrar;
  if (!sb) return `<div class="empty"><h3>Servidor não configurado</h3></div>`;
  if (!S.sess) return `<div class="page-h"><h1>Mesas</h1></div><div class="empty"><h3>Entre para usar mesas</h3><p>A mesa liga as fichas dos jogadores ao mestre: ele vê as alterações em tempo real.</p><a class="btn hope" href="#/conta">Entrar ou criar conta</a></div>`;
  if (location.hash.startsWith("#/mesa/")) return detalhe(p[0]);
  const uid = user().id;
  const mestre = S.mesas.filter(m => m.mestre === uid), jogador = S.mesas.filter(m => m.mestre !== uid);
  const item = m => `<a class="card mesa-row" href="#/mesa/${m.id}" style="text-decoration:none;color:inherit;margin-top:10px"><div class="grow"><h3>${esc(m.nome)}</h3><div class="muted small">${m.mestre === uid ? "Você é o mestre" : "Jogador"} · ${fichasDaMesa(m.id).length} ficha(s)</div></div>${icon("chev")}</a>`;
  return `<div class="page-h"><h1>Mesas</h1></div>
  ${!S.tabelaOk ? `<div class="err">As tabelas de mesas ainda não existem no banco. Rode o arquivo <code>supabase-fichas.sql</code> no Supabase (SQL Editor).</div>` : ""}
  <section class="card"><h3>Entrar numa mesa</h3><p class="muted small">Peça o código de 6 letras ao mestre.</p>
    <div class="row"><label class="f">Código<input type="text" id="cod" value="${esc(codigoPre)}" autocapitalize="none" autocomplete="off" maxlength="12" placeholder="ex.: k7m2qp"></label><label class="f">Seu nome na mesa<input type="text" id="apel" placeholder="Opcional"></label></div>
    <div class="acts"><button class="btn hope" data-act="entrar">Entrar</button></div></section>
  ${jogador.length ? `<section class="sec"><h2>Mesas em que jogo</h2>${jogador.map(item).join("")}</section>` : ""}
  <section class="sec"><h2>Mesas que mestro</h2>${mestre.map(item).join("") || `<p class="muted">Nenhuma ainda.</p>`}
    <div class="acts"><button class="btn" data-act="criar">${icon("crown")} Criar mesa</button><a class="btn ghost" href="#/mestre">Ferramentas do mestre</a></div></section>`;
}

function detalhe(id) {
  const m = S.mesas.find(x => x.id === id);
  if (!m) return `<div class="empty"><h3>Mesa não encontrada</h3><a class="btn" href="#/mesas">Voltar</a></div>`;
  const souMestre = m.mestre === user().id;
  const fichas = fichasDaMesa(id);
  const minhas = minhasFichas().filter(f => f.mesa_id !== id);
  const link = location.origin + location.pathname + "#/mesas?entrar=" + m.codigo;
  const membros = m.mesa_membros || [];
  const hf = !!(m.config && m.config.expansao && m.config.expansao.hf);
  const hb = (m.config && m.config.homebrew) || {}, tokMax = Math.min(9, Math.max(1, parseInt(hb.tokMax, 10) || TOK_PADRAO));
  return `<div style="margin-bottom:10px">${voltar("#/mesas", "Mesas")}</div>
  <div class="page-h"><h1>${esc(m.nome)}</h1><div class="sub">${souMestre ? "Você é o mestre" : "Você é jogador"} · ${membros.length} jogador(es) · as fichas atualizam sozinhas</div></div>
  ${souMestre ? `<section class="card"><div class="mesa-row"><div class="grow"><div class="eyebrow">Código de convite</div><span class="code">${esc(m.codigo)}</span></div><button class="btn sm" data-act="copiar" data-v="${esc(link)}">${icon("link")} Copiar link</button></div></section>` : ""}
  <section class="sec"><h2>Personagens</h2>
    ${fichas.length ? `<div class="pcs">${fichas.map(f => resumo(f)).join("")}</div>` : `<div class="empty">Nenhuma ficha vinculada ainda. ${souMestre ? "Peça aos jogadores para entrar com o código e vincular suas fichas." : ""}</div>`}
    ${minhas.length ? `<div class="acts"><label class="f" style="flex:1;min-width:220px">Vincular uma ficha minha<select id="vinc">${minhas.map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}</select></label><button class="btn hope" data-act="vincular" data-id="${id}" style="align-self:flex-end">Vincular</button></div>` : ""}
  </section>
  ${souMestre ? `<section class="sec"><h2>Configurações da mesa</h2><div class="card">
    <label class="f">Nome<input type="text" id="mnome" value="${esc(m.nome)}"></label>
    ${EXP.disponivel ? `<label class="switch"><input type="checkbox" data-ch="hf" ${hf ? "checked" : ""}><span class="t"><b>Usar a expansão Hope & Fear nesta mesa</b><span>Libera novas classes, ancestralidades, comunidades, cartas e equipamentos para as fichas desta mesa.</span></span></label>` : ""}
    <div class="divider"></div><h3 style="margin:0">Homebrews da mesa <span class="tag">HB</span></h3>
    <label class="switch"><input type="checkbox" data-ch="hblimiar" ${hb.limiar ? "checked" : ""}><span class="t"><b>Limiar Ínfimo</b><span>Aparece à esquerda do Maior: ⌊Maior ÷ 3⌋. Dano até esse valor pode ser pago com 1 Esperança ou 1 Estresse.</span></span></label>
    <label class="switch"><input type="checkbox" data-ch="hbtokens" ${hb.tokens ? "checked" : ""}><span class="t"><b>Tokens de ação</b><span>Cada jogador gasta 1 token por ação. Os tokens só voltam quando você aperta Reiniciar tokens.</span></span></label>
    ${hb.tokens ? `<div class="row"><label class="f">Tokens por jogador<input type="number" min="1" max="9" value="${tokMax}" data-ch="hbmax"></label><button class="btn" data-act="hbreset" data-id="${id}" style="align-self:flex-end">Reiniciar tokens</button></div>` : ""}
    <div class="acts"><button class="btn" data-act="renomear" data-id="${id}">Salvar nome</button><button class="btn danger" data-act="excluirmesa" data-id="${id}">${icon("trash")} Excluir mesa</button></div></div>
    ${membros.length ? `<div class="card"><h3>Jogadores</h3>${membros.map(x => `<div class="inv-row"><div class="grow">${esc(x.apelido || "Jogador")}</div><button class="btn sm ghost danger" data-act="remover" data-u="${x.user_id}" data-id="${id}">Remover</button></div>`).join("")}</div>` : ""}</section>`
    : `<div class="acts"><button class="btn danger" data-act="sair" data-id="${id}">Sair da mesa</button></div>`}`;
}
const hbInf = (f, d) => { const m = S.mesas.find(x => x.id === f.mesa_id), c = m && m.config && m.config.homebrew; return c && c.limiar && infimo(d.lim[0]) ? infimo(d.lim[0]) + "/" : ""; };
const tokTxt = f => { const t = tokensDe(f); return t ? `<span>Tokens <b>${t.resta}/${t.max}</b></span>` : ""; };
function resumo(f) {
  const pc = f.data, d = deriv(pc);
  const cond = (d.forma ? `<div class="chips" style="margin-top:8px"><span class="tag forma-tag">Transformado: ${esc(d.forma.n)}</span></div>` : "") + condBanner(pc.st.cond, "ele");
  return cardPC(f).replace("</a>", `<div class="kv" style="margin-top:8px"><span>Evasão <b>${d.ev}</b></span><span>Limiares <b>${hbInf(f, d)}${d.lim[0]}/${d.lim[1]}</b></span>${tokTxt(f)}<span>Armadura <b>${d.armMax - pc.st.arm}/${d.armMax}</b></span></div>${cond}</a>`);
}

export async function on(a, el) {
  try {
    if (a === "entrar") {
      const cod = document.getElementById("cod").value.trim(), ap = document.getElementById("apel").value.trim();
      if (!cod) { toast("Digite o código"); return; }
      const id = await entrarNaMesa(cod, ap); codigoPre = ""; toast("Você entrou na mesa!"); location.hash = "#/mesa/" + id;
    }
    if (a === "criar") {
      const w = openSheet(`<label class="f">Nome da mesa<input type="text" id="nm" placeholder="Ex.: A Queda de Haven"></label><div class="acts"><button class="btn hope" id="ok">Criar</button></div>`, { title: "Nova mesa" });
      w.querySelector("#ok").addEventListener("click", async () => { const n = w.querySelector("#nm").value.trim(); if (!n) return; try { const m = await criarMesa(n); closeSheet(); location.hash = "#/mesa/" + m.id; } catch (e) { toast(e.message, "err"); } });
    }
    if (a === "hbreset") { const m = S.mesas.find(x => x.id === el.dataset.id), h = { ...((m.config || {}).homebrew || {}) }; h.epoca = (h.epoca || 0) + 1; await atualizarMesa(m.id, { config: { ...(m.config || {}), homebrew: h } }); toast("Tokens reiniciados"); app.render(true); }
    if (a === "copiar") { await navigator.clipboard.writeText(el.dataset.v).catch(() => {}); toast("Link copiado: envie aos jogadores"); }
    if (a === "vincular") { const fid = document.getElementById("vinc").value; await moverParaMesa(fid, el.dataset.id); toast("Ficha vinculada"); app.render(true); }
    if (a === "renomear") { await atualizarMesa(el.dataset.id, { nome: document.getElementById("mnome").value.trim() || "Mesa" }); toast("Salvo"); app.render(true); }
    if (a === "excluirmesa") { if (await confirmar("Excluir a mesa? As fichas continuam existindo, só deixam de estar vinculadas.", { ok: "Excluir", perigo: true })) { await excluirMesa(el.dataset.id); location.hash = "#/mesas"; } }
    if (a === "sair") { if (await confirmar("Sair desta mesa? Suas fichas continuam com você.", { ok: "Sair" })) { await sairDaMesa(el.dataset.id); location.hash = "#/mesas"; } }
    if (a === "remover") { if (await confirmar("Remover este jogador da mesa?", { ok: "Remover", perigo: true })) { const { error } = await sb.from("mesa_membros").delete().eq("mesa_id", el.dataset.id).eq("user_id", el.dataset.u); if (error) throw error; await carregarMesas(); await sincronizar(); app.render(true); } }
  } catch (e) {
    console.warn(e);
    toast(/codigo invalido/i.test(e.message) ? "Código inválido" : "Erro: " + e.message, "err");
  }
}
export async function change(k, el) {
  if (["hblimiar", "hbtokens", "hbmax"].includes(k)) {
    const id = location.hash.split("/")[2], m = S.mesas.find(x => x.id === id), h = { ...((m.config || {}).homebrew || {}) };
    if (k === "hblimiar") h.limiar = el.checked;
    if (k === "hbtokens") { h.tokens = el.checked; h.epoca = (h.epoca || 0) + 1; }
    if (k === "hbmax") { h.tokMax = Math.min(9, Math.max(1, parseInt(el.value, 10) || TOK_PADRAO)); h.epoca = (h.epoca || 0) + 1; }
    try { await atualizarMesa(id, { config: { ...(m.config || {}), homebrew: h } }); toast("Homebrew atualizada"); app.render(true); } catch (e) { toast(e.message, "err"); }
    return;
  }
  if (k === "hf") {
    const id = location.hash.split("/")[2];
    const m = S.mesas.find(x => x.id === id);
    try { await atualizarMesa(id, { config: { ...(m.config || {}), expansao: { hf: el.checked } } }); toast(el.checked ? "Expansão ligada para a mesa" : "Expansão desligada para a mesa"); } catch (e) { toast(e.message, "err"); }
  }
}
