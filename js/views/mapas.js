// Aba "Mapas": galeria dos battlemaps gerados (python -m mapa) e conferência do JSON que a IA entrega.
import { esc, icon, toast } from "../util.js";
import { app } from "../main.js";
import { TIPOS, VARIANTES, imgMarc, ler, gravar, ouvir, celulas, guardarCelulas, desenharNevoa, marcadoresHtml } from "../mapa-estado.js";

// ferr: "ver" | "rev" (pincel que revela) | "esc" (pincel que esconde) | "marc" (põe marcador) | "apagar" (tira marcador)
const ui = { idx: null, erro: "", sel: null, fase: null, grade: false, zoom: 1, texto: "", conf: null, ferr: "ver", tipo: "fogo", tam: 1, pincel: 0, salas: {} };
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
  ${painel(m)}
  <div class="mapa-vista"><div class="mapa-img" id="mp-palco" data-ferr="${ui.ferr}" style="width:${ui.zoom * 100}%"><img src="${esc(f.imagem)}" alt="${esc(m.nome)}"><div class="marcs"></div><canvas class="nv"></canvas>${ui.grade ? `<div class="mapa-gr" style="background-size:calc(100% / ${cols}) calc(100% / ${rows})"></div>` : ""}<div class="sala-dica" hidden></div></div></div>
  <div class="acts"><a class="btn hope" href="projetor.html?mapa=${encodeURIComponent(m.id)}&fase=${encodeURIComponent(f.id)}${ui.grade ? "&grade=1" : ""}" target="dh-projetor" title="Abre só o mapa, sem o site, para arrastar ao projetor. Na nova janela: F = tela cheia.">Projetar em tela cheia</a><a class="btn" href="${esc(f.imagem)}" download="${esc(m.id)}-${esc(f.id)}.jpg">${icon("copy")} Baixar imagem</a><button class="btn ghost" data-act="mp-json" data-id="${esc(m.id)}">Copiar JSON do mapa</button></div>
  <p class="muted small" style="margin-top:8px">Para imprimir no tamanho real, use os PNG de alta resolução em <code>mapas-hd/${esc(m.id)}/</code> (já com o DPI certo, com e sem grade).</p>`;
}

// ---------- mesa ao vivo: névoa de guerra e marcadores ----------
function salasDe(m) {
  const sp = ui.salas[m.id];
  return (sp ? sp.estruturas || [] : []).filter(x => x.tipo === "sala" && isFinite(x.x0) && isFinite(x.x1)).map((x, i) => ({ ...x, rot: x.nome || `Sala ${i + 1}${x.piso ? " · " + x.piso : ""}` }));
}
function painel(m) {
  const e = ler(m.id), nv = e.nevoa.ativa, salas = salasDe(m);
  const fb = (f, n, t) => `<button class="chip${ui.ferr === f ? " on" : ""}" data-act="mp-ferr" data-v="${f}"${t ? ` title="${esc(t)}"` : ""}>${n}</button>`;
  return `<details class="card" open style="margin:0 0 10px;padding:10px 12px"><summary style="cursor:pointer;font-weight:700">Mesa ao vivo <span class="muted small" style="font-weight:400">— o que você faz aqui aparece na janela do projetor</span></summary>
    <div style="margin-top:8px"><div class="muted small" style="margin-bottom:4px">Névoa de guerra (esconde partes do mapa dos jogadores; você continua vendo, escurecido)</div>
    <div class="scroll-x"><button class="chip${nv ? " on" : ""}" aria-pressed="${nv}" data-act="mp-nv">Névoa ${nv ? "ligada" : "desligada"}</button>
      ${nv ? `<button class="chip" data-act="mp-tudo" data-v="1">Revelar tudo</button><button class="chip" data-act="mp-tudo" data-v="0">Esconder tudo</button>` : ""}</div>
    ${nv && salas.length ? `<div class="scroll-x" style="margin-top:6px"><span class="muted small" style="align-self:center">Salas:</span>${salas.map((s, i) => `<button class="chip" data-act="mp-sala" data-sala="${i}" data-i="${i}">${esc(s.rot)}</button>`).join("")}</div>` : ""}
    <div class="muted small" style="margin:8px 0 4px">Ferramenta</div>
    <div class="scroll-x">${fb("ver", "Só ver", "Rolar o mapa sem alterar nada")}${fb("rev", "Revelar", "Pinte em cima do mapa para mostrar")}${fb("esc", "Esconder", "Pinte em cima do mapa para esconder")}${fb("apagar", "Apagar marcador", "Clique num marcador para tirar")}</div>
    ${ui.ferr === "rev" || ui.ferr === "esc" ? `<div class="scroll-x" style="margin-top:6px"><span class="muted small" style="align-self:center">Pincel:</span>${[[0, "1×1"], [1, "3×3"], [2, "5×5"]].map(([r, n]) => `<button class="chip${ui.pincel === r ? " on" : ""}" data-act="mp-pincel" data-v="${r}">${n}</button>`).join("")}</div>` : ""}
    <div class="muted small" style="margin:8px 0 4px">Marcadores (escolha e toque no mapa)</div>
    <div class="scroll-x">${TIPOS.map(x => `<button class="chip${ui.ferr === "marc" && ui.tipo === x.t ? " on" : ""}" data-act="mp-tipo" data-v="${x.t}"><img class="mi" src="${imgMarc(x.t)}" alt="" width="22" height="22"> ${x.n}</button>`).join("")}</div>
    <div class="scroll-x" style="margin-top:6px"><span class="muted small" style="align-self:center">Tamanho:</span>${[1, 2, 3].map(t => `<button class="chip${ui.tam === t ? " on" : ""}" data-act="mp-tam" data-v="${t}">${t}×${t}</button>`).join("")}<button class="chip" data-act="mp-limpar">Limpar marcadores (${e.marc.length})</button></div></div></details>`;
}

let desligaOuvinte = null;
let marcaId = 0;
function montarPalco() {
  const el = document.getElementById("mp-palco");
  if (!el || el._ok) return;
  const m = ui.sel && achar(ui.sel); if (!m) return;
  el._ok = true;
  const [cols, rows] = m.grade;
  const cv = el.querySelector("canvas"), mk = el.querySelector(".marcs"), dica = el.querySelector(".sala-dica");
  const desenhar = () => { const e = ler(m.id); desenharNevoa(cv, e, cols, rows, 0.62); mk.innerHTML = marcadoresHtml(e, cols, rows); };
  desenhar();
  if (desligaOuvinte) desligaOuvinte();
  desligaOuvinte = ouvir(id => {
    if (!ui.sel || id !== ui.sel) return;
    const e = ler(id);
    if ((e.fase || null) !== ui.fase || !!e.grade !== ui.grade) { ui.fase = e.fase; ui.grade = !!e.grade; app.render(true); return; } // fase/grade mudaram no projetor
    desenhar();
  });
  const pos = ev => { const r = el.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * cols, ((ev.clientY - r.top) / r.height) * rows]; };
  const pintar = (x, y, revelar) => {
    const e = ler(m.id), arr = celulas(e, cols, rows), cx = Math.floor(x), cy = Math.floor(y); let mudou = false;
    if (!e.nevoa.ativa) { e.nevoa.ativa = true; mudou = true; }
    for (let j = cy - ui.pincel; j <= cy + ui.pincel; j++) for (let i = cx - ui.pincel; i <= cx + ui.pincel; i++) {
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      if (arr[j * cols + i] !== (revelar ? 1 : 0)) { arr[j * cols + i] = revelar ? 1 : 0; mudou = true; }
    }
    if (mudou) { guardarCelulas(e, arr); gravar(m.id, e); desenhar(); }
  };
  let pintando = false;
  el.addEventListener("pointerdown", ev => {
    if (ui.ferr === "ver" || ev.button > 0) return;
    const [x, y] = pos(ev), e = ler(m.id);
    if (ui.ferr === "rev" || ui.ferr === "esc") { pintando = true; el.setPointerCapture(ev.pointerId); pintar(x, y, ui.ferr === "rev"); }
    else if (ui.ferr === "marc") {
      const s = ui.tam, px = s % 2 ? Math.floor(x) + 0.5 : Math.round(x), py = s % 2 ? Math.floor(y) + 0.5 : Math.round(y);
      e.marc.push({ i: Date.now() + "-" + ++marcaId, t: ui.tipo, v: 1 + Math.floor(Math.random() * VARIANTES), x: px, y: py, s });
      gravar(m.id, e); desenhar();
    } else if (ui.ferr === "apagar") {
      let melhor = -1, d0 = Infinity;
      e.marc.forEach((k, i) => { const d = Math.hypot(k.x - x, k.y - y); if (d < d0 && d <= Math.max(0.7, (k.s || 1) / 2)) { d0 = d; melhor = i; } });
      if (melhor >= 0) { e.marc.splice(melhor, 1); gravar(m.id, e); desenhar(); app.render(true); }
    }
    ev.preventDefault();
  });
  el.addEventListener("pointermove", ev => { if (pintando) { const [x, y] = pos(ev); pintar(x, y, ui.ferr === "rev"); } });
  const fim = () => { pintando = false; };
  el.addEventListener("pointerup", fim); el.addEventListener("pointercancel", fim);
  // realce da sala ao passar o mouse no botão dela
  el._dica = i => {
    const s = i == null ? null : salasDe(m)[i];
    if (!s) { dica.hidden = true; return; }
    Object.assign(dica.style, { left: (s.x0 / cols) * 100 + "%", top: (s.y0 / rows) * 100 + "%", width: ((s.x1 - s.x0) / cols) * 100 + "%", height: ((s.y1 - s.y0) / rows) * 100 + "%" });
    dica.hidden = false;
  };
}
document.addEventListener("mouseover", ev => {
  const p = document.getElementById("mp-palco"); if (!p || !p._dica) return;
  const b = ev.target.closest && ev.target.closest("[data-sala]");
  p._dica(b ? +b.dataset.sala : null);
});

function alterar(fn) { const e = ler(ui.sel); fn(e); gravar(ui.sel, e); }

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
  if (m) setTimeout(montarPalco, 0);
  return `${ui.erro ? `<div class="note info" style="margin-bottom:12px">Não consegui ler <code>mapas/index.json</code> (${esc(ui.erro)}). Gere um mapa primeiro.</div>` : ""}${m ? visor(m) : lista()}${m ? "" : gerar()}`;
}

export async function on(a, el) {
  switch (a) {
    case "mp-abrir": {
      ui.sel = el.dataset.id; ui.zoom = 1; ui.ferr = "ver";
      const e = ler(ui.sel); ui.fase = e.fase; ui.grade = !!e.grade;
      const m = achar(ui.sel);
      if (m && !ui.salas[m.id]) fetch(m.spec, { cache: "no-store" }).then(r => r.json()).then(j => { ui.salas[m.id] = j; }).catch(() => { ui.salas[m.id] = {}; }).finally(() => app.render(true));
      break;
    }
    case "mp-voltar": ui.sel = null; break;
    case "mp-fase": ui.fase = el.dataset.v; alterar(e => { e.fase = ui.fase; }); break;
    case "mp-grade": ui.grade = !ui.grade; alterar(e => { e.grade = ui.grade; }); break;
    case "mp-nv": alterar(e => { e.nevoa.ativa = !e.nevoa.ativa; }); break;
    case "mp-tudo": { const m = achar(ui.sel); alterar(e => { e.nevoa.ativa = true; e.nevoa.rev = (el.dataset.v === "1" ? "1" : "0").repeat(m.grade[0] * m.grade[1]); }); break; }
    case "mp-sala": {
      const m = achar(ui.sel), s = salasDe(m)[+el.dataset.i], [cols, rows] = m.grade; if (!s) return true;
      alterar(e => {
        const arr = celulas(e, cols, rows), idx = [];
        for (let y = Math.max(0, Math.floor(s.y0)); y < Math.min(rows, Math.ceil(s.y1)); y++) for (let x = Math.max(0, Math.floor(s.x0)); x < Math.min(cols, Math.ceil(s.x1)); x++) idx.push(y * cols + x);
        const tudo = idx.every(k => arr[k]);
        idx.forEach(k => { arr[k] = tudo ? 0 : 1; });
        e.nevoa.ativa = true; guardarCelulas(e, arr);
      });
      break;
    }
    case "mp-ferr": ui.ferr = el.dataset.v; if (ui.ferr === "rev" || ui.ferr === "esc") alterar(e => { e.nevoa.ativa = true; }); break;
    case "mp-pincel": ui.pincel = +el.dataset.v; break;
    case "mp-tipo": ui.ferr = "marc"; ui.tipo = el.dataset.v; break;
    case "mp-tam": ui.tam = +el.dataset.v; break;
    case "mp-limpar": alterar(e => { e.marc = []; }); break;
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
