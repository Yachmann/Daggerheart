// Criar personagens por JSON (one-shots com IA): cola a resposta do Claude, o site valida e cria as fichas.
import { esc, icon, toast } from "../util.js";
import { lerPersonagens, instrucoesPersonagemIA, catalogoPersonagemMD, EXEMPLO_PERSONAGEM } from "../personagem-json.js";
import { criarFicha, S } from "../store.js";
import { deriv } from "../calc.js";
import { app } from "../main.js";
import { voltar } from "./common.js";
import { cardPC } from "./fichas.js";

let texto = "", itens = [], erroLeitura = "", sel = new Set(), modelo = true, mesa = "";

function baixar(nome, txt, tipo = "text/markdown") { const b = new Blob([txt], { type: tipo + ";charset=utf-8" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); }
const copiar = (t, m) => navigator.clipboard.writeText(t).then(() => toast(m), () => toast("O navegador bloqueou a cópia"));

export function html() {
  const prontos = itens.filter(i => i.ok), escolhidos = prontos.filter(i => sel.has(i.indice)), comAviso = itens.filter(i => i.avisos.length);
  const mesas = (S.mesas || []);
  return `<div style="margin-bottom:10px">${voltar("#/", "Fichas")}</div>
  <div class="page-h"><h1>Criar por JSON</h1><div class="sub">Peça ao Claude os personagens da sua one-shot, cole a resposta aqui e cada bloco JSON vira uma ficha de nível 1, pronta para jogar ou entregar.</div></div>
  <section class="card">
    <label class="f">Resposta ou JSON<textarea id="pj" data-in="t" data-k="pj" style="min-height:170px;font-family:ui-monospace,Consolas,monospace;font-size:.85rem" placeholder='Cole a resposta inteira. Blocos como { "formato": "daggerheart-personagem", "nome": "…", "classe": "…" } são encontrados sozinhos; também vale uma lista ou {"personagens": [ … ]}.'>${esc(texto)}</textarea></label>
    <div class="acts"><button class="btn hope" data-act="ler" ${texto.trim() ? "" : "disabled"}>${icon("sparkle")} Ler e validar</button>
      <label class="btn" style="position:relative;overflow:hidden">Abrir arquivo .json<input type="file" accept=".json,.txt,application/json,text/plain" data-ch="arq" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <button class="btn ghost" data-act="colar">Colar da área de transferência</button></div>
  </section>
  ${erroLeitura ? `<div class="err" style="margin-top:12px">${esc(erroLeitura)}</div>` : ""}
  ${itens.length ? `<p class="muted" style="margin:14px 0 0">${itens.length} bloco${itens.length > 1 ? "s" : ""}: ${prontos.length} válido${prontos.length === 1 ? "" : "s"}${itens.length - prontos.length ? `, ${itens.length - prontos.length} com erro` : ""}.</p>
    ${itens.map(card).join("")}
    ${prontos.length ? `<label class="switch"><input type="checkbox" data-ch="modelo" ${modelo ? "checked" : ""}><span class="t"><b>Criar como modelo para entregar</b><span>Marca a ficha como modelo; com um personagem só, já abre o envio por link para o jogador.</span></span></label>` : ""}
    ${prontos.length && mesas.length ? `<label class="f" style="margin-top:8px;max-width:360px">Mesa<select data-ch="mesa"><option value="">Nenhuma (só eu vejo)</option>${mesas.map(m => `<option value="${m.id}"${mesa === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>` : ""}
    <div class="wiz-foot"><button class="btn" data-act="copiarerros" ${comAviso.some(i => !i.ok) ? "" : "disabled"}>Copiar pedido de correção</button><button class="btn hope" data-act="criar" ${escolhidos.length ? "" : "disabled"}>${icon("sparkle")} Criar ${escolhidos.length > 1 ? escolhidos.length + " personagens" : "selecionado"}</button></div>` : ""}
  <section class="card" style="margin-top:16px"><h3>Como pedir ao Claude</h3>
    <ol class="steps"><li><b>Configure uma vez.</b> Cole as instruções abaixo no projeto do Claude e anexe o catálogo (nomes exatos de classes, cartas, armas e armaduras).</li>
    <li><b>Peça.</b> Ex.: “Monte 4 personagens pré-prontos para a one-shot da Ponte de Ferro, um por classe diferente, cada um com ligação ao enredo.”</li>
    <li><b>Cole aqui.</b> O site confere as regras (atributos, cartas do domínio, equipamento de Patamar 1) e aponta o que corrigir.</li></ol>
    <div class="acts"><button class="btn" data-act="cpinst">${icon("copy")} Copiar instruções</button><button class="btn" data-act="dlinst">Baixar instruções .md</button><button class="btn" data-act="dlcat">Baixar catálogo .md</button></div>
    <details class="more fold-s" style="margin-top:10px"><summary>Exemplo de JSON</summary><pre class="code-block">${esc(JSON.stringify(EXEMPLO_PERSONAGEM, null, 2))}</pre><div class="acts"><button class="btn sm" data-act="cpex">${icon("copy")} Copiar exemplo</button><button class="btn sm ghost" data-act="tstex">Testar este exemplo</button></div></details></section>`;
}

function card(it) {
  const erros = it.avisos.filter(a => a.k === "erro"), outros = it.avisos.filter(a => a.k !== "erro");
  let prev = "";
  if (it.pc) { const d = deriv(it.pc); prev = `<div style="margin-top:10px;max-width:420px">${cardPC({ id: "x", data: it.pc }, "#/personagem-json")}</div><div class="muted small" style="margin-top:6px">Evasão ${d.ev} · PV ${d.pvMax} · Estresse ${d.esMax} · Armadura ${d.armMax} · Limiares ${d.lim[0]}/${d.lim[1]}</div>`; }
  return `<section class="card" style="margin-top:12px;${it.ok ? "" : "border-color:var(--blood)"}">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      ${it.ok ? `<label class="switch" style="padding:0"><input type="checkbox" data-ch="sel" data-i="${it.indice}" ${sel.has(it.indice) ? "checked" : ""} aria-label="Criar este personagem"><span class="t"></span></label>` : `<span class="tag dead">Erro</span>`}
      <h3 style="flex:1;min-width:160px;margin:0">${esc(it.titulo)}</h3>
      ${it.ok ? `<button class="btn sm" data-act="criarum" data-i="${it.indice}">Criar só este</button>` : ""}</div>
    ${prev}
    ${erros.length ? `<div class="err" style="margin-top:10px"><b>Corrija antes de criar:</b><ul style="margin:6px 0 0;padding-left:1.2em">${erros.map(a => `<li>${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
    ${outros.length ? `<div class="note" style="margin-top:10px"><ul style="margin:0;padding-left:1.2em">${outros.map(a => `<li>⚠️ ${esc(a.t)}</li>`).join("")}</ul></div>` : ""}
  </section>`;
}

function ler() {
  erroLeitura = ""; itens = []; sel = new Set();
  try { itens = lerPersonagens(texto); itens.forEach(i => { if (i.ok) sel.add(i.indice); }); }
  catch (e) { erroLeitura = e.message; }
}

function criar(lista) {
  const ids = lista.map(i => { const pc = JSON.parse(JSON.stringify(i.pc)); if (modelo) pc.modelo = true; return criarFicha(pc, mesa || null); });
  texto = ""; itens = []; sel = new Set();
  toast(ids.length > 1 ? `${ids.length} personagens criados` : "Personagem criado!");
  location.hash = ids.length === 1 ? "#/ficha/" + encodeURIComponent(ids[0]) + (modelo ? "?aba=ajustes&enviar=1" : "") : "#/";
}

export function on(a, el) {
  const i = +el.dataset.i;
  switch (a) {
    case "ler": ler(); break;
    case "colar": navigator.clipboard.readText().then(t => { texto = t; ler(); app.render(true); }).catch(() => toast("O navegador bloqueou a colagem: cole no campo manualmente")); return;
    case "criarum": criar([itens.find(x => x.indice === i)]); return;
    case "criar": criar(itens.filter(x => x.ok && sel.has(x.indice))); return;
    case "copiarerros": {
      const l = itens.filter(x => !x.ok).map(x => `Bloco ${x.indice + 1} (${x.titulo}):\n` + x.avisos.filter(a => a.k === "erro").map(a => "- " + a.t).join("\n")).join("\n\n");
      navigator.clipboard.writeText(`O site não aceitou parte do JSON dos personagens. Corrija e me envie os blocos JSON completos de novo:\n\n${l}`).then(() => toast("Pedido copiado: cole no Claude"));
      return;
    }
    case "cpinst": copiar(instrucoesPersonagemIA(), "Instruções copiadas: cole no projeto do Claude"); return;
    case "dlinst": baixar("instrucoes-personagens-daggerheart.md", instrucoesPersonagemIA()); return;
    case "dlcat": baixar("catalogo-personagens-daggerheart.md", catalogoPersonagemMD()); return;
    case "cpex": copiar(JSON.stringify(EXEMPLO_PERSONAGEM, null, 2), "Exemplo copiado"); return;
    case "tstex": texto = JSON.stringify(EXEMPLO_PERSONAGEM, null, 2); ler(); break;
  }
  app.render(true);
}
export function input(k, el) {
  if (k === "t") { texto = el.value; const b = document.querySelector('[data-act="ler"]'); if (b) b.disabled = !texto.trim(); }
}
export function change(k, el) {
  if (k === "arq") { const f = el.files[0]; if (!f) return; f.text().then(t => { texto = t; ler(); app.render(true); }); return; }
  if (k === "modelo") modelo = el.checked;
  if (k === "mesa") mesa = el.value;
  if (k === "sel") { const i = +el.dataset.i; el.checked ? sel.add(i) : sel.delete(i); }
  app.render(true);
}
