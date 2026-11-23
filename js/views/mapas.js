// Aba "Mapas": galeria dos battlemaps gerados (python -m mapa) e conferência do JSON que a IA entrega.
import { esc, icon, toast } from "../util.js";
import { app } from "../main.js";

const ui = { idx: null, erro: "", sel: null, fase: null, grade: false, zoom: 1, texto: "", conf: null };
let carregando = false;

function carregar() {
  if (ui.idx || carregando) return;
  carregando = true;
  fetch("mapas/index.json?_=" + Date.now(), { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then(j => { ui.idx = j; })
    .catch(e => { ui.idx = { mapas: [] }; ui.erro = e.message; })
    .finally(() => { carregando = false; app.render(true); });
}

const achar = id => (ui.idx?.mapas || []).find(m => m.id === id);
const cmTxt = (m) => {
  const [w, h] = m.grade, cm = m.cm_por_quadrado || 2.5;
  return `${(w * cm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} × ${(h * cm).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm impresso (quadrado de ${cm.toLocaleString("pt-BR")} cm)`;
};

// ---------- conferência rápida do JSON colado ----------
function extrair(t) {
  const out = [];
  for (const m of t.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g)) {
    try { const o = JSON.parse(m[1]); if (o && o.formato === "daggerheart-mapa") out.push(o); } catch { /* ignora */ }
  }
  if (!out.length) { try { const o = JSON.parse(t); if (o && o.formato === "daggerheart-mapa") out.push(o); } catch { /* ignora */ } }
  return out;
}
function conferir(t) {
  if (!t.trim()) return { vazio: true };
  const mapas = extrair(t);
  if (!mapas.length) return { erro: 'Não achei nenhum JSON com "formato": "daggerheart-mapa". Cole a resposta inteira da IA.' };
  return {
    mapas: mapas.map(o => {
      const probs = [];
      if (!o.nome) probs.push('falta "nome"');
      if (!Array.isArray(o.grade) || o.grade.length !== 2) probs.push('"grade" precisa ser [colunas, linhas]');
      if (!o.bioma) probs.push('falta "bioma"');
      const n = k => (Array.isArray(o[k]) ? o[k].length : 0);
      return { o, probs, resumo: `${o.grade ? o.grade.join("×") : "?"} quadrados · ${o.bioma || "?"} · ${n("regioes")} regiões, ${n("linhas")} linhas, ${n("estruturas")} estruturas, ${n("objetos")} objetos · ${(o.fases || [1]).length} fase(s)` };
    }),
  };
}

// ---------- telas ----------
function lista() {
  const ms = [...(ui.idx.mapas || [])].reverse();
  if (!ms.length) return `<div class="empty"><h3>Nenhum mapa ainda</h3><p>Gere um com <code>python -m mapa gerar</code> (veja "Como gerar" abaixo). Os mapas aparecem aqui sozinhos.</p></div>`;
  return `<div class="mapa-lista">${ms.map(m => `<button class="mapa-card" data-act="mp-abrir" data-id="${esc(m.id)}"><img src="${esc(m.thumb)}" alt="" loading="lazy"><span class="mc-t"><b>${esc(m.nome)}</b><small>${m.grade[0]}×${m.grade[1]} · ${m.fases.length} fase${m.fases.length > 1 ? "s" : ""}</small></span></button>`).join("")}</div>`;
}

function visor(m) {
  const f = m.fases.find(x => x.id === ui.fase) || m.fases[0];
  const [cols, rows] = m.grade;
  return `<div class="acts" style="margin:0 0 10px;justify-content:space-between;align-items:center"><button class="btn sm ghost" data-act="mp-voltar">← Todos os mapas</button><span class="muted small">${esc(cmTxt(m))}</span></div>
  <h2 style="margin:0 0 4px">${esc(m.nome)}</h2>${m.descricao ? `<p class="muted" style="margin:0 0 10px">${esc(m.descricao)}</p>` : ""}
  <div class="scroll-x" style="margin-bottom:10px">
    ${m.fases.length > 1 ? m.fases.map(x => `<button class="chip${x.id === f.id ? " on" : ""}" data-act="mp-fase" data-v="${esc(x.id)}">${esc(x.nome)}</button>`).join("") : ""}
    <button class="chip${ui.grade ? " on" : ""}" aria-pressed="${ui.grade}" data-act="mp-grade">Grade</button>
    ${[[1, "Ajustar"], [1.6, "160%"], [2.4, "240%"]].map(([z, n]) => `<button class="chip${ui.zoom === z ? " on" : ""}" data-act="mp-zoom" data-v="${z}">${n}</button>`).join("")}
  </div>
  <div class="mapa-vista"><div class="mapa-img" style="width:${ui.zoom * 100}%"><img src="${esc(f.imagem)}" alt="${esc(m.nome)}">${ui.grade ? `<div class="mapa-gr" style="background-size:calc(100% / ${cols}) calc(100% / ${rows})"></div>` : ""}</div></div>
  <div class="acts"><a class="btn" href="${esc(f.imagem)}" download="${esc(m.id)}-${esc(f.id)}.jpg">${icon("copy")} Baixar imagem</a><button class="btn ghost" data-act="mp-json" data-id="${esc(m.id)}">Copiar JSON do mapa</button></div>
  <p class="muted small" style="margin-top:8px">Para imprimir no tamanho real, use os PNG de alta resolução em <code>mapas-hd/${esc(m.id)}/</code> (já com o DPI certo, com e sem grade).</p>`;
}

function gerar() {
  const c = ui.conf;
  const res = !c ? "" : c.vazio ? "" : c.erro ? `<div class="err" style="margin-top:10px">${esc(c.erro)}</div>` : c.mapas.map((x, i) => `<div class="card" style="margin-top:10px"><b>${esc(x.o.nome || "(sem nome)")}</b><div class="muted small">${esc(x.resumo)}</div>${x.probs.length ? `<div class="err" style="margin-top:6px">${x.probs.map(esc).join("; ")}</div>` : `<div class="acts"><button class="btn sm hope" data-act="mp-baixar" data-i="${i}">Baixar .json</button></div>`}</div>`).join("");
  return `<section class="card" style="margin-top:16px"><h3>Gerar um mapa novo</h3>
    <ol class="small" style="margin:6px 0 10px;padding-left:20px;line-height:1.5">
      <li>Peça o mapa à IA da história. Ela responde com um bloco <code>json</code> de mapa.</li>
      <li>Copie a <b>resposta inteira</b> e dê dois cliques em <code>gerar-mapa.cmd</code> (na pasta do projeto). Ele lê a área de transferência, confere e desenha.</li>
      <li>O mapa novo aparece aqui. Se o gerador reclamar do JSON, copie a mensagem de erro e devolva à IA.</li>
    </ol>
    <label class="f">Conferir um JSON antes (opcional)<textarea id="mp-json" rows="5" placeholder="Cole aqui a resposta da IA">${esc(ui.texto)}</textarea></label>
    <div class="acts"><button class="btn" data-act="mp-conferir">Conferir</button></div>${res}
    <p class="muted small" style="margin:10px 0 0">Esta conferência é rápida. A validação completa (tipos de objeto, campos, coordenadas) roda no gerador e explica cada erro em português.</p></section>`;
}

export function aba() {
  carregar();
  if (!ui.idx) return `<div class="loading"><div class="spin"></div></div>`;
  const m = ui.sel && achar(ui.sel);
  return `${ui.erro ? `<div class="note info" style="margin-bottom:12px">Não consegui ler <code>mapas/index.json</code> (${esc(ui.erro)}). Gere um mapa primeiro.</div>` : ""}${m ? visor(m) : lista()}${m ? "" : gerar()}`;
}

export async function on(a, el) {
  switch (a) {
    case "mp-abrir": ui.sel = el.dataset.id; ui.fase = null; ui.zoom = 1; break;
    case "mp-voltar": ui.sel = null; break;
    case "mp-fase": ui.fase = el.dataset.v; break;
    case "mp-grade": ui.grade = !ui.grade; break;
    case "mp-zoom": ui.zoom = +el.dataset.v; break;
    case "mp-json": {
      const m = achar(el.dataset.id);
      try { const t = await (await fetch(m.spec, { cache: "no-store" })).text(); await navigator.clipboard.writeText(t); toast("JSON copiado"); } catch { toast("Não consegui copiar"); }
      return true;
    }
    case "mp-conferir": {
      const t = document.getElementById("mp-json");
      ui.texto = t ? t.value : ui.texto; ui.conf = conferir(ui.texto);
      break;
    }
    case "mp-baixar": {
      const o = ui.conf?.mapas?.[+el.dataset.i]?.o; if (!o) return true;
      const nome = String(o.nome || "mapa").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mapa";
      const u = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: "application/json" }));
      const l = Object.assign(document.createElement("a"), { href: u, download: nome + ".json" }); l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
      return true;
    }
    default: return false;
  }
  app.render(true);
  return true;
}
