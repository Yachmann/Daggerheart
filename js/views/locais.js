// Aba "Locais": lojas, serviços e estabelecimentos com estoque e preços, ajustados por tamanho, qualidade e região.
import { esc, md, icon, toast, openSheet, confirmar } from "../util.js";
import { get, loc, T, dmgPT, traitPT, isExp } from "../data.js";
import { GM, salvarGM } from "../gm.js";
import { app } from "../main.js";
import { TIPOS, TAMANHOS, QUALIDADES, REGIOES, RARIDADE, fmtPreco, gerarLocal, sortearLinha, textoLocal, tipoPor, nivelItem } from "../locais.js";
import { darItem } from "./dar.js";
import { expTag } from "./common.js";

const ui = { tipo: "ferraria", tam: "loja", qual: "comum", reg: "cidade", atual: null };
const KIND_ROT = { weapons: "Arma", armor: "Armadura", consumables: "Consumível", items: "Item" };

function resumo(kind, x) {
  if (kind === "weapons") return `${traitPT(x.tr)} · ${T(x.rng)} · ${dmgPT(x.dmg)} · ${T(x.bur)}`;
  if (kind === "armor") return `Armadura ${x.sc} · limiares ${x.th}`;
  const t = String(x.x || ""); return t.length > 110 ? t.slice(0, 108) + "…" : t;
}
function linha(e, i, salvo) {
  const x = get(e.kind, e.id); if (!x) return "";
  const o = loc(e.kind, x), n = nivelItem(e.kind, x);
  const nivel = e.kind === "weapons" || e.kind === "armor" ? `P${n}` : RARIDADE[n];
  return `<div class="loc-row"><div class="grow"><b>${esc(o.n)}</b> <span class="tag">${esc(KIND_ROT[e.kind])} · ${nivel}</span> ${expTag(x)}<div class="muted small">${esc(resumo(e.kind, o))}</div></div>
    <div class="preco"><b>${esc(fmtPreco(e.preco))}</b>${e.qtd > 1 ? `<small>em estoque: ${e.qtd}</small>` : e.kind !== "consumables" && n >= 3 ? `<small>peça única</small>` : ""}</div>
    <div class="loc-acts"><button class="btn sm" data-act="lc-ver" data-i="${i}">Ver</button><button class="btn sm hope" data-act="lc-dar" data-i="${i}">Dar</button><button class="icon-btn" data-act="lc-troca" data-i="${i}" aria-label="Trocar por outro item" title="Trocar por outro item">↻</button><button class="icon-btn" data-act="lc-rm" data-i="${i}" aria-label="Remover do estoque" title="Remover">✕</button></div></div>`;
}

function resultado(l) {
  const cfg = tipoPor(l.tipo);
  return `<article class="card loc-card">
    <div class="eyebrow">${esc(cfg.n)} · ${esc(TAMANHOS[l.tam].n)} · ${esc(QUALIDADES[l.qual].n)} · ${esc(REGIOES[l.reg].n)}</div>
    <h2 style="margin:2px 0 6px">${esc(l.nome)}</h2>
    <p style="margin:0 0 8px">${esc(l.desc)}</p>
    <p class="small" style="margin:0 0 4px"><b>Dono(a):</b> ${esc(l.dono.nome)}, ${esc(l.dono.traco)}; ${esc(l.dono.mania)}.</p>
    <p class="small muted" style="margin:0"><b>Gancho:</b> ${esc(l.gancho)}</p>
    ${l.estoque.length ? `<h3 style="margin:16px 0 4px">À venda <span class="muted small">(${l.estoque.length})</span></h3>${l.estoque.map((e, i) => linha(e, i)).join("")}
      <div class="acts" style="margin-top:6px"><button class="btn sm" data-act="lc-mais">${icon("plus")} Mais um item</button></div>` : ""}
    ${l.servicos.length ? `<h3 style="margin:16px 0 4px">${l.estoque.length ? "Serviços e mercadorias" : "Cardápio e serviços"}</h3>${l.servicos.map(s => `<div class="loc-row"><div class="grow">${esc(s.n)} ${s.fonte === "SRD" ? `<span class="tag hope" title="Valor da tabela de custos médios do SRD">SRD</span>` : `<span class="tag" title="Sugestão do site, ajustável pelo mestre; não vem do livro">sugestão</span>`}${s.nota ? `<div class="muted small">${esc(s.nota)}</div>` : ""}</div><div class="preco"><b>${s.preco ? esc(fmtPreco(s.preco)) : "a combinar"}</b></div></div>`).join("")}` : ""}
    ${l.compra ? `<p class="muted small" style="margin:12px 0 0">Compra os itens dos jogadores por cerca de <b>${l.compra}%</b> do valor (sugestão).</p>` : ""}
    <p class="muted small" style="margin:6px 0 0">Preços em punhados, bolsas e baús (10 punhados = 1 bolsa; 10 bolsas = 1 baú). Abaixo de 1 punhado, usa a regra opcional de moedas (10 moedas = 1 punhado). As faixas de armas e armaduras vêm da tabela de custos médios do SRD; o resto é sugestão.</p>
    <div class="acts"><button class="btn" data-act="lc-gerar">Gerar outro igual</button>${l.salvo ? `<span class="tag hope" style="align-self:center">Salvo nos meus locais</span>` : `<button class="btn hope" data-act="lc-salvar">Salvar nos meus locais</button>`}<button class="btn ghost" data-act="lc-copiar">${icon("copy")} Copiar texto</button></div>
  </article>`;
}

export function aba() {
  const sel = (k, obj) => `<select data-ch="lc" data-f="${k}">${Object.entries(obj).map(([v, o]) => `<option value="${v}"${ui[k] === v ? " selected" : ""}>${esc(o.n)}</option>`).join("")}</select>`;
  return `<section class="card"><h3>Gerar um local</h3><p class="muted small" style="margin:2px 0 10px">Escolha o tipo e ajuste o tamanho, a qualidade e a região. O estoque e os preços mudam com eles.</p>
    <div class="loc-tipos">${TIPOS.map(t => `<button class="loc-tipo${ui.tipo === t.k ? " on" : ""}" data-act="lc-tipo" data-v="${t.k}"><b>${esc(t.n)}</b><span>${esc(t.desc)}</span></button>`).join("")}</div>
    <div class="grid3" style="margin-top:12px"><label class="f">Tamanho${sel("tam", TAMANHOS)}</label><label class="f">Qualidade${sel("qual", QUALIDADES)}</label><label class="f">Região${sel("reg", REGIOES)}</label></div>
    <div class="acts"><button class="btn hope" data-act="lc-gerar">Gerar</button></div></section>
  ${ui.atual ? `<div style="margin-top:14px">${resultado(ui.atual)}</div>` : ""}
  ${GM.locais.length ? `<section class="sec"><h2>Meus locais <span class="tag">${GM.locais.length}</span></h2>${GM.locais.map(l => `<div class="card" style="margin-top:8px;display:flex;gap:10px;align-items:center"><div class="grow"><b>${esc(l.nome)}</b><div class="muted small">${esc(tipoPor(l.tipo).n)} · ${esc(TAMANHOS[l.tam].n)} · ${esc(QUALIDADES[l.qual].n)}</div></div><button class="btn sm" data-act="lc-abrir" data-id="${l.id}">Abrir</button><button class="btn sm ghost danger" data-act="lc-del" data-id="${l.id}" aria-label="Excluir ${esc(l.nome)}">${icon("trash")}</button></div>`).join("")}</section>` : ""}`;
}

const persiste = () => { if (ui.atual && ui.atual.salvo) salvarGM(); };

// Devolve true se a ação era desta aba
export async function on(a, el) {
  const i = +el.dataset.i, id = el.dataset.id, l = ui.atual;
  switch (a) {
    case "lc-tipo": ui.tipo = el.dataset.v; break;
    case "lc-gerar": ui.atual = gerarLocal({ tipo: ui.tipo, tam: ui.tam, qual: ui.qual, reg: ui.reg }); break;
    case "lc-salvar": l.salvo = true; GM.locais.unshift(l); salvarGM(); toast("Local salvo"); break;
    case "lc-abrir": ui.atual = GM.locais.find(x => x.id === id); ui.tipo = ui.atual.tipo; ui.tam = ui.atual.tam; ui.qual = ui.atual.qual; ui.reg = ui.atual.reg; break;
    case "lc-del": if (await confirmar("Excluir este local?", { ok: "Excluir", perigo: true })) { GM.locais = GM.locais.filter(x => x.id !== id); if (ui.atual && ui.atual.id === id) ui.atual = null; salvarGM(); } break;
    case "lc-copiar": navigator.clipboard.writeText(textoLocal(l)).then(() => toast("Texto copiado"), () => toast("O navegador bloqueou a cópia")); return true;
    case "lc-rm": l.estoque.splice(i, 1); persiste(); break;
    case "lc-troca": { const nova = sortearLinha({ ...l, estoque: l.estoque.filter((_, k) => k !== i) }); if (nova) { l.estoque[i] = nova; persiste(); } else toast("Não há outro item disponível"); break; }
    case "lc-mais": { const nova = sortearLinha(l); if (nova) { l.estoque.push(nova); l.estoque.sort((x, y) => x.preco - y.preco); persiste(); } else toast("Não há mais itens disponíveis"); break; }
    case "lc-dar": darItem(l.estoque[i].kind, l.estoque[i].id); return true;
    case "lc-ver": {
      const e = l.estoque[i], x = get(e.kind, e.id), o = loc(e.kind, x);
      openSheet(`<div class="eyebrow">${esc(KIND_ROT[e.kind])} ${isExp(x) ? "· Hope & Fear" : ""}</div><h3 style="margin:2px 0 8px">${esc(o.n)}</h3>
        <p class="small" style="margin:0 0 8px"><b>Preço aqui:</b> ${esc(fmtPreco(e.preco))}${e.qtd > 1 ? ` · estoque ${e.qtd}` : ""}</p>
        ${e.kind === "weapons" ? `<div class="kv"><span><b>${esc(traitPT(o.tr))}</b></span><span>${esc(T(o.rng))}</span><span><b>${esc(dmgPT(o.dmg))}</b></span><span>${esc(T(o.bur))}</span><span>Patamar ${o.t}</span></div>` : e.kind === "armor" ? `<div class="kv"><span>Armadura <b>${esc(o.sc)}</b></span><span>Limiares <b>${esc(o.th)}</b></span><span>Patamar ${o.t}</span></div>` : `<div class="tx">${md(o.x)}</div>`}
        ${(o.f || []).map(f => `<p class="small"><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}
        <div class="acts"><button class="btn hope" id="lvd">Adicionar à ficha de um jogador</button></div>`, { title: o.n }).querySelector("#lvd").addEventListener("click", () => { document.querySelector(".sheet-wrap [data-close]").click(); darItem(e.kind, e.id); });
      return true;
    }
    default: return false;
  }
  app.render(true);
  return true;
}
export function change(k, el) {
  if (k !== "lc") return false;
  ui[el.dataset.f] = el.value; app.render(true); return true;
}
