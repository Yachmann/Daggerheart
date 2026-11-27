// "Especiais do personagem": o que é diferente no seu personagem e pede interação na mesa.
// Botão flutuante (acima do Resumo de jogo) que só aparece quando a classe, a subclasse, a multiclasse
// ou algo da expansão Hope & Fear traz uma regra própria. Cada especial tem um PAINEL INTERATIVO (formas do Druida,
// dados de prece, Imparável, Foco, Favor, Maldições...) e, logo abaixo, o texto da regra tirado do livro.
// Estado próprio fica em pc.x (dados, alvos, usos por descanso); a Forma Bestial fica em pc.bf (ver js/forma.js).
import { esc, md, mdBlock, sgn } from "../util.js";
import { get, loc, beast, nome, TRAITS } from "../data.js";
import { ancFeats, tierOf, deriv } from "../calc.js";
import { feat, expTag, temaAttr, temaVars } from "./common.js";
import { ilustracao } from "../ilustracoes.js";
import { formaAtiva, formasDisponiveis, basesEvoluida, origensHibrida, formaPorId, ehEvoluida, ehHibrida, HIB, EVO, podeAssumir, assumir, sairForma, custoEstresse, fmtDano } from "../forma.js";

const rnd = n => 1 + Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Quais classes têm regra própria ----------
// Habilidades de classe que mudam como se joga. Classes sem entrada não têm nada fora do comum além das cartas.
// As classes da expansão (src "hf") entram inteiras: tudo nelas é novo.
const ESPECIAL = {
  Bard: ["Rally"], Druid: ["Beastform"], Guardian: ["Unstoppable"], Ranger: ["Ranger's Focus"],
  Rogue: ["Cloaked", "Sneak Attack"], Seraph: ["Prayer Dice"], Sorcerer: ["Channel Raw Power"], Wizard: ["Strange Patterns"],
};

function featsDaClasse(id) {
  const raw = get("classes", id), pt = loc("classes", id);
  if (!raw || !pt) return [];
  const lista = ESPECIAL[id] || [];
  const idx = raw.src === "hf" ? raw.feats.map((_, i) => i) : raw.feats.map((f, i) => (lista.includes(f.n) ? i : -1)).filter(i => i >= 0);
  return idx.map(i => pt.feats[i]).filter(Boolean);
}

// ---------- Estado de interface (vive só enquanto a folha está aberta) ----------
const UI = { esc: null, res: null };
let corpo = null;
const rolls = (n, f) => Array.from({ length: n }, f);
const soma = a => a.reduce((s, x) => s + x, 0);
const X = pc => (pc.x = pc.x || {});
const conjVal = (pc, d) => (d.conj ? Math.max(1, d.atr[d.conj.k]) : 1);
const dadoNivel = (pc, a, b) => (pc.nivel >= 5 ? b : a); // d6 → d8 no nível 5 (Inspirar, Dado do Patrono)

// ---------- Blocos de HTML ----------
const card = (cab, titulo, corpoHtml, cls = "") => `<article class="rj-card esp-card ${cls}"><div class="esp-cab">${cab}</div>${titulo ? `<div class="esp-tit">${titulo}</div>` : ""}${corpoHtml}</article>`;
const secao = (t, cards) => (cards.length ? `<section class="rj-sec"><h4>${t}</h4><div class="rj-grid">${cards.join("")}</div></section>` : "");
const btn = (act, txt, extra = "", cls = "btn sm") => `<button class="${cls}" data-act="${act}" ${extra}>${txt}</button>`;
const chip = (on, act, txt, extra = "") => `<button class="chip${on ? " on" : ""}" data-act="${act}" ${extra}>${txt}</button>`;
const dadoBox = (v, cls = "") => `<span class="esp-dado ${cls}">${v}</span>`;
const nota = t => `<p class="esp-onde">${t}</p>`;
const regra = f => `<details class="more esp-regra"><summary>Texto da regra</summary>${feat(f)}</details>`;
const ctrl = (corpoHtml) => `<div class="esp-ctrl">${corpoHtml}</div>`;

// ---------- Painéis por especial ----------
// Cada painel devolve HTML interativo. As ações (data-act="x-…") são tratadas em acao() mais abaixo.
function painelBardo(pc) {
  const x = X(pc), r = x.rally || {}, tam = dadoNivel(pc, 6, 8);
  return ctrl(`<p class="esp-linha">Dado de Inspiração: <b>d${tam}</b> ${r.u ? `<span class="tag">Inspirar usado nesta sessão</span>` : ""}</p>
    <div class="acts">${!r.u ? btn("x-rally-usar", "Inspirar o grupo (1× por sessão)", "", "btn sm hope") : ""}${r.d ? btn("x-rally-rolar", `Gastar meu d${tam}: somar ao teste`, 'data-m="soma"') + btn("x-rally-rolar", `Gastar meu d${tam}: curar Estresse`, 'data-m="est"') : r.u ? `<span class="muted small">Seu dado já foi gasto.</span>` : ""}</div>
    ${r.d ? `<p class="muted small">Você tem um Dado de Inspiração guardado. Cada aliado recebe o seu também (marque na ficha dele).</p>` : ""}`);
}

function painelGuardiao(pc) {
  const x = X(pc), im = x.imp || {}, max = dadoNivel(pc, 4, 6);
  return ctrl(`<p class="esp-linha">Dado Imparável: <b>d${max}</b> · ${im.v ? `<b>Imparável agora</b>` : im.u ? "já usado neste descanso" : "disponível"}</p>
    ${im.v ? `<div class="esp-dado-grande">${dadoBox(im.v, "on")}<span class="muted small">de ${max}</span></div>
      <div class="acts">${btn("x-imp-sobe", "Causei PV de dano: subir o dado", "", "btn sm hope")}${btn("x-imp-fim", "Fim da cena: encerrar")}</div>
      <ul class="esp-lista"><li>Reduz a gravidade do dano físico em um limiar.</li><li>Soma o valor do dado (<b>+${im.v}</b>) à rolagem de dano.</li><li>Não pode ficar Contido nem Vulnerável.</li></ul>`
      : `<div class="acts">${btn("x-imp-ini", "Ficar Imparável (1× por descanso longo)", im.u ? "disabled" : "", "btn sm hope")}</div>`}`);
}

function painelPatrulheiro(pc, d) {
  const x = X(pc), foco = x.foco || "";
  return ctrl(`<p class="esp-linha">Foco atual: <b>${foco ? esc(foco) : "nenhum"}</b></p>
    <div class="esp-form"><input type="text" data-in="x-foco" data-k="xfoco" id="x-foco-in" value="${esc(foco)}" placeholder="Nome ou descrição do alvo">${btn("x-foco-marcar", "Definir Foco (−1 Esperança)", "", "btn sm hope")}${foco ? btn("x-foco-fim", "Encerrar Foco") : ""}</div>
    <p class="muted small">Gaste 1 de Esperança e ataque; em um sucesso o alvo vira seu Foco. Contra o Foco: você sabe a direção dele, ele marca 1 de Estresse quando você causa dano, e numa falha você pode encerrar o Foco para rolar de novo os dados de Dualidade.</p>`);
}

function painelCompanheiro(pc, d) {
  const c = pc.comp = pc.comp || {}, max = c.max || 3, es = clamp(c.es || 0, 0, max), dado = c.dado || 6, fora = !!c.fora;
  const pips = Array.from({ length: max }, (_, i) => `<button class="pip${i < es ? " on" : ""}" data-act="x-comp-pip" data-i="${i}" aria-label="Estresse ${i + 1}"></button>`).join("");
  return ctrl(`<div class="esp-form"><label class="f">Nome<input type="text" data-in="comp" data-f="nome" data-k="xcn" value="${esc(c.nome || "")}"></label><label class="f">Espécie<input type="text" data-in="comp" data-f="esp" data-k="xce" value="${esc(c.esp || "")}"></label></div>
    ${fora ? `<div class="err" style="margin:8px 0">${esc(c.nome || "O companheiro")} saiu da cena e volta no próximo descanso longo.</div>` : ""}
    <div class="esp-pips"><span class="vl">Estresse</span><div class="pips es">${pips}</div>${btn("x-comp-slot", "−", 'data-v="-1"')}${btn("x-comp-slot", "+", 'data-v="1"')}</div>
    <div class="acts">${btn("x-comp-dano", "Sofreu dano: marcar 1 Estresse", fora ? "disabled" : "", "btn sm fear")}${btn("x-comp-curar", "Recuperar 1 Estresse")}${btn("x-comp-ataque", `Atacar: ${pc.nivel ? "" : ""}${d.prof}d${dado}`, fora ? "disabled" : "", "btn sm hope")}</div>
    <div class="chips" style="margin-top:8px"><span class="muted small">Dado de dano:</span>${[6, 8, 10, 12].map(n => chip(dado === n, "x-comp-dado", `d${n}`, `data-v="${n}"`)).join("")}</div>
    <p class="muted small">Ajuste os espaços de Estresse e o dado conforme a sua ficha de companheiro e os avanços escolhidos. Companheiro sem Estresse sai da cena e volta com 1 Estresse recuperado no próximo descanso longo.</p>`);
}

function painelLadino(pc, d) {
  const x = X(pc), enc = pc.st.cond.includes("Encoberto"), t = tierOf(pc.nivel);
  return ctrl(`<div class="acts">${chip(enc, "x-enc", enc ? "Encoberto ✓" : "Ficar Encoberto")}${chip(!!x.esquiva, "x-esquiva", x.esquiva ? "Esquiva ativa (+2 Evasão)" : "Esquiva do Ladino (3 Esperança)")}</div>
    <p class="esp-linha">Ataque Furtivo: <b>${t}d6</b> de dano extra se estiver Encoberto ou com um aliado em Corpo a Corpo do alvo.</p>
    <div class="acts">${btn("x-furtivo", `Rolar Ataque Furtivo (${t}d6)`, "", "btn sm hope")}</div>
    <p class="muted small">Encoberto vale como Oculto e termina após um ataque ou ao terminar um movimento à vista de um adversário. A Esquiva dura até um ataque acertar você ou até o próximo descanso.</p>`);
}

function painelSerafim(pc, d) {
  const x = X(pc), pr = x.prece || [], n = conjVal(pc, d);
  const dados = pr.map((p, i) => `<div class="esp-prece${p.u ? " usado" : ""}">${dadoBox(p.v, p.u ? "off" : "on")}<div class="esp-prece-b">${btn("x-prece", "Usar", `data-i="${i}" ${p.u ? "disabled" : ""}`)}${btn("x-prece-esp", `+${p.v} Esp.`, `data-i="${i}" ${p.u ? "disabled" : ""}`, "btn sm hope")}</div></div>`).join("");
  const vivos = pr.filter(p => !p.u);
  return ctrl(`<p class="esp-linha">Dados de Prece: <b>${vivos.length}</b> de ${pr.length || n} (d4)</p>
    <div class="esp-pracas">${dados || `<span class="muted small">Role no início da sessão.</span>`}</div>
    <div class="acts">${btn("x-prece-rolar", `Rolar ${n}d4 (início da sessão)`, "", "btn sm hope")}${pr.length ? btn("x-prece-limpar", "Descartar (fim da sessão)") : ""}</div>
    <p class="muted small">Cada dado gasto reduz dano recebido, soma ao resultado de uma rolagem de você ou de um aliado a alcance Longe (depois de rolada), ou vira Esperança igual ao valor.</p>`);
}

function painelFeiticeiro(pc, d) {
  const x = X(pc), mao = pc.cartas.mao.map(id => get("cards", id)).filter(Boolean);
  return ctrl(`<p class="esp-linha">Canalizar Poder Bruto: ${x.canal ? `<span class="tag">usado (volta no descanso longo)</span>` : "<b>disponível</b>"}</p>
    ${x.canal ? "" : mao.length ? `<div class="esp-cartas">${mao.map(c => { const o = loc("cards", c); return `<div class="inv-row"><div class="grow"><b>${esc(o.n)}</b> <span class="muted small">nível ${c.l}</span></div>${btn("x-canal", `+${c.l} Esperança`, `data-id="${esc(c.id)}" data-m="esp"`, "btn sm hope")}${btn("x-canal", `+${2 * c.l} dano`, `data-id="${esc(c.id)}" data-m="dano"`)}</div>`; }).join("")}</div>` : `<p class="muted small">Sem cartas na mão para colocar no cofre.</p>`}
    <p class="muted small">A carta escolhida vai da mão para o cofre. Ganhe Esperança igual ao nível dela, ou some o dobro do nível à rolagem de uma magia de dano.</p>`);
}

function painelMago(pc) {
  const x = X(pc), n = x.padrao || 0;
  return ctrl(`<p class="esp-linha">Seu número: <b>${n || "—"}</b></p>
    <div class="chips">${Array.from({ length: 12 }, (_, i) => chip(n === i + 1, "x-padrao", String(i + 1), `data-v="${i + 1}"`)).join("")}</div>
    ${n ? `<div class="acts">${btn("x-padrao-hit", "Rolei meu número: +1 Esperança", 'data-m="esp"', "btn sm hope")}${btn("x-padrao-hit", "Rolei meu número: −1 Estresse", 'data-m="est"')}</div>` : ""}
    <p class="muted small">Quando um Dado de Dualidade mostrar o seu número, ganhe 1 de Esperança ou recupere 1 de Estresse. Você pode trocar o número ao fazer um descanso longo.</p>`);
}

function painelBruxo(pc, d) {
  const x = X(pc), p = x.pat = x.pat || {}, favor = clamp(p.favor ?? 3, 0, 6), dp = dadoNivel(pc, 6, 8), n = conjVal(pc, d);
  const pips = Array.from({ length: 6 }, (_, i) => `<button class="pip${i < favor ? " on" : ""}" data-act="x-favor-pip" data-i="${i}" aria-label="Favor ${i + 1}"></button>`).join("");
  return ctrl(`<div class="esp-form"><label class="f">Patrono<input type="text" data-in="x-pat" data-f="nome" data-k="xpn" value="${esc(p.nome || "")}"></label><label class="f">Esfera de influência<input type="text" data-in="x-pat" data-f="esfera" data-k="xpe" value="${esc(p.esfera || "")}"></label></div>
    <div class="esp-pips"><span class="vl">Favor</span><div class="pips hope">${pips}</div><b>${favor}/6</b></div>
    <div class="acts">${btn("x-favor-usar", `Invocar o patrono: −1 Favor, rolar d${dp}`, favor < 1 ? "disabled" : "", "btn sm hope")}${btn("x-favor-tributo", `Tributo (descanso): +${n} Favor`)}${btn("x-favor-ganha", "Sucesso com Esperança: +1 Favor")}</div>
    <p class="muted small">Antes de um teste ligado à esfera do patrono, gaste 1 de Favor, role o Dado do Patrono (d${dp}) e some ao total. O máximo é 6 de Favor.</p>`);
}

function painelBruxa(pc, d) {
  const x = X(pc), m = x.mald || [], lim = conjVal(pc, d), t = tierOf(pc.nivel);
  return ctrl(`<p class="esp-linha">Amaldiçoados: <b>${m.length}/${lim}</b> · penalidade <b>−${t}</b> no dano e na Dificuldade deles</p>
    <div class="chips">${m.map((nm, i) => `<button class="chip on" data-act="x-mald-tira" data-i="${i}">${esc(nm)} ✕</button>`).join("") || `<span class="muted small">Ninguém amaldiçoado.</span>`}</div>
    <div class="esp-form"><input type="text" id="x-mald-in" placeholder="Alvo a amaldiçoar">${btn("x-mald-poe", "Amaldiçoar (marcar 1 Estresse)", m.length >= lim ? "disabled" : "", "btn sm fear")}</div>
    <div class="acts">${btn("x-comungar", `Comungar: rolar ${lim}d6 ${x.comung ? "(já usado)" : "(1× por descanso longo)"}`, x.comung ? "disabled" : "", "btn sm hope")}</div>`);
}

function painelAssassino(pc) {
  const x = X(pc), t = tierOf(pc.nivel), alvo = x.alvo || "";
  return ctrl(`<p class="esp-linha">Marcado para Morrer: <b>${alvo ? esc(alvo) : "ninguém"}</b> · dano extra <b>${t}d4</b></p>
    <div class="esp-form"><input type="text" id="x-alvo-in" placeholder="Alvo do ataque bem-sucedido" value="${esc(alvo)}">${btn("x-alvo-marca", "Marcar (1 Estresse)", "", "btn sm fear")}</div>
    <div class="acts">${alvo ? btn("x-alvo-rolar", `Rolar dano extra (${t}d4)`, "", "btn sm hope") + btn("x-alvo-fim", "Encerrar (alvo derrotado ou descanso)") : ""}</div>
    <p class="muted small">Só um adversário por vez. Termina num descanso, quando o alvo for derrotado, ou quando o Mestre gastar ${t} de Medo.</p>`);
}

function painelBrigao(pc, d) {
  const x = X(pc), dc = x.combo || 4;
  return ctrl(`<p class="esp-linha">Dado de Combo: <b>d${dc}</b></p>
    <div class="chips">${[4, 6, 8, 10, 12].map(n => chip(dc === n, "x-combo-tam", `d${n}`, `data-v="${n}"`)).join("")}</div>
    <div class="acts">${btn("x-combo", "Golpe Combinado (marcar 1 Estresse)", "", "btn sm hope")}${btn("x-golpe", `Dano do Golpe do Lutador (${d.prof}d8+${d.prof}d6)`)}</div>
    <p class="muted small">Role o Dado de Combo; continue rolando enquanto o resultado novo não for menor que o anterior. O dano extra é a soma de todos os resultados. Aumente o dado de Combo aqui quando escolher esse avanço de nível.</p>`);
}

// Formas Bestiais (Druida)
const chipsForma = f => {
  const c = [`<span class="rj-chip">P${f.tier}</span>`];
  if (f.trait) c.push(`<span class="rj-chip"><b>${esc(f.trait)}</b> ${sgn(f.tb || 0)}</span>`);
  if (f.ev != null) c.push(`<span class="rj-chip">Evasão ${sgn(f.ev)}</span>`);
  if (f.atk) c.push(`<span class="rj-chip">${esc(f.atk)}</span>`);
  if (f.dmg) c.push(`<span class="rj-chip"><b>${esc(f.dmg)}</b></span>`);
  return c.join("");
};

function formaAtivaHtml(pc, d) {
  const f = d.forma;
  const evT = f.evo ? TRAITS.find(t => t.k === f.evo) : null;
  const dn = f.dn ? fmtDano(f.dn, d.prof) : "";
  return `<div class="forma-ativa">
    <div class="forma-topo"><div class="forma-ilu grande">${ilustracao(f.ilu)}</div>
      <div class="forma-id"><span class="esp-cab">Você está transformado</span><div class="esp-tit">${esc(f.n)}</div><div class="muted small">${esc(f.ex)}</div>
        <div class="rj-chips">${f.trait ? `<span class="rj-chip"><b>${esc(f.trait)}</b> ${sgn(f.tb)}${evT ? ` +1 (Evolução)` : ""}</span>` : ""}<span class="rj-chip">Evasão ${sgn(f.ev)}${""}</span>${f.atk ? `<span class="rj-chip">${esc(f.atk)}</span>` : ""}${dn ? `<span class="rj-chip"><b>${dn} ${esc(f.tipoDano)}</b></span>` : ""}</div></div></div>
    ${evT && evT.k !== f.tk ? `<p class="muted small">Evolução: +1 em ${esc(evT.pt)} até sair da forma.</p>` : ""}
    <div class="acts">${f.tk ? btn("x-forma-ataque", `Rolar ataque (${esc(f.trait)} ${sgn(d.atr[f.tk])})`, "", "btn sm hope") : ""}${dn ? btn("x-forma-dano", `Rolar dano (${dn})`) : ""}${btn("x-forma-sair", "Sair da forma", "", "btn sm fear")}</div>
    ${f.adv.length ? `<div class="chips" style="margin-top:8px"><span class="muted small">Vantagem em:</span>${f.adv.map(a => `<span class="rj-chip">${esc(a)}</span>`).join("")}</div>` : ""}
    ${f.feats.map(x => feat(x)).join("")}
    <p class="esp-onde">Em forma você não usa armas nem conjura magias de cartas de domínio, mas mantém suas outras habilidades. Sua armadura vira parte do corpo. Se marcar o último PV, você sai da forma.</p></div>`;
}

function formaCard(f, pc, d) {
  const evo = ehEvoluida(f.id), hib = ehHibrida(f.id);
  const nEstresse = custoEstresse(f.id, "estresse");
  const semEst = pc.st.es + nEstresse > d.esMax, semEsp = pc.st.esp < 3;
  return `<article class="forma-card"><div class="forma-ilu">${ilustracao(f.id)}</div>
    <div class="forma-info"><b>${esc(f.n)}</b><div class="muted small">${esc(f.ex || "")}</div>
      <div class="rj-chips">${chipsForma(f)}</div>
      ${f.adv ? `<div class="muted small" style="margin-top:6px">Vantagem em: ${esc(f.adv)}</div>` : ""}
      <details class="more"><summary>Características</summary>${(f.f || []).map(x => feat(x)).join("")}</details>
      <div class="acts">${btn("x-forma-escolher", `Transformar · ${nEstresse} Estresse`, `data-id="${esc(f.id)}" data-modo="estresse" ${semEst && !evo && !hib ? "disabled" : ""}`, "btn sm hope")}${btn("x-forma-escolher", "Evolução · 3 Esperança", `data-id="${esc(f.id)}" data-modo="evolucao" ${semEsp ? "disabled" : ""}`)}</div></div></article>`;
}

function escolhaHtml(pc, d) {
  const e = UI.esc, f = formaPorId(e.id);
  const evo = ehEvoluida(f.id), hib = ehHibrida(f.id);
  let h = `<div class="forma-escolha"><b>${esc(f.n)}</b> · ${e.modo === "evolucao" ? "Evolução (3 Esperança)" : `${custoEstresse(f.id, "estresse")} Estresse`}`;
  if (e.modo === "evolucao") h += `<p class="muted small">Escolha o atributo que sobe +1 enquanto você estiver nesta forma:</p><div class="chips">${TRAITS.map(t => chip(e.evo === t.k, "x-forma-evo", esc(t.pt), `data-v="${t.k}"`)).join("")}</div>`;
  if (evo) h += `<p class="muted small">Escolha a forma que será evoluída (mantém tudo dela e ganha os bônus: +${EVO[f.id].dano} dano, +${EVO[f.id].tr} no atributo, +${EVO[f.id].ev} Evasão${EVO[f.id].passo ? ", dado de dano maior" : ""}):</p><div class="chips">${basesEvoluida(f.id).map(b => chip(e.base === b.id, "x-forma-base", esc(b.n), `data-v="${esc(b.id)}"`)).join("")}</div>`;
  if (hib) {
    const H = HIB[f.id], srcs = origensHibrida(f.id), sel = e.hib.src.map(formaPorId).filter(Boolean);
    h += `<p class="muted small">1) Escolha ${H.origens} formas de origem (${e.hib.src.length}/${H.origens}):</p><div class="chips">${srcs.map(b => chip(e.hib.src.includes(b.id), "x-forma-hib", esc(b.n), `data-t="src" data-v="${esc(b.id)}"`)).join("")}</div>`;
    const advs = [...new Set(sel.flatMap(b => (b.adv || "").split(/,\s*/)).filter(Boolean))], fs = sel.flatMap(b => b.f || []).filter((x, i, a) => a.findIndex(y => y.n === x.n) === i);
    if (sel.length) h += `<p class="muted small">2) Escolha ${H.advs} vantagens (${e.hib.advs.length}/${H.advs}):</p><div class="chips">${advs.map(a => chip(e.hib.advs.includes(a), "x-forma-hib", esc(a), `data-t="advs" data-v="${esc(a)}"`)).join("")}</div>
      <p class="muted small">3) Escolha ${H.feats} características (${e.hib.feats.length}/${H.feats}):</p><div class="chips">${fs.map(x => chip(e.hib.feats.includes(x.n), "x-forma-hib", esc(x.n), `data-t="feats" data-v="${esc(x.n)}" title="${esc(x.t.replace(/\*/g, ""))}"`)).join("")}</div>`;
  }
  const erro = podeAssumir(pc, d, f.id, e.modo, { base: e.base, evo: e.evo, hib: e.hib });
  return h + `${erro ? `<p class="muted small" style="margin-top:8px">${esc(erro)}</p>` : ""}<div class="acts">${btn("x-forma-ok", "Transformar", erro ? "disabled" : "", "btn sm hope")}${btn("x-forma-cancelar", "Cancelar")}</div></div>`;
}

function painelDruida(pc, d) {
  if (d.forma) return formaAtivaHtml(pc, d);
  const lista = formasDisponiveis(d.tier);
  const porTier = t => lista.filter(f => f.tier === t);
  return `${UI.esc ? escolhaHtml(pc, d) : ""}
    <p class="muted small esp-intro">Toque em <b>Transformar</b> para assumir a forma: a ficha passa a usar a Evasão e o atributo dela. Formas até o patamar ${d.tier}. Custo: 1 de Estresse (ou 3 de Esperança na Evolução).</p>
    ${[1, 2, 3, 4].filter(t => porTier(t).length).map(t => `<h5 class="esp-sub">Patamar ${t}</h5><div class="forma-grid">${porTier(t).map(f => formaCard(f, pc, d)).join("")}</div>`).join("")}`;
}

const PAINEL = { Bard: painelBardo, Guardian: painelGuardiao, Ranger: painelPatrulheiro, Rogue: painelLadino, Seraph: painelSerafim, Sorcerer: painelFeiticeiro, Wizard: painelMago, Warlock: painelBruxo, Witch: painelBruxa, Assassin: painelAssassino, Brawler: painelBrigao, Druid: painelDruida };

function cardsClasse(pc, d, id, rotulo) {
  const raw = get("classes", id), pt = loc("classes", id);
  if (!raw) return [];
  const hf = raw.src === "hf", fs = featsDaClasse(id), out = [];
  const painel = PAINEL[id];
  // Druida: o painel das formas ocupa a largura toda e vem antes das regras
  if (id === "Druid") out.push(card(`${rotulo} · ${esc(pt.n)}`, "Formas Bestiais", painel(pc, d), "esp-largo"));
  else if (painel) out.push(card(`${rotulo} · ${esc(pt.n)} ${hf ? expTag(raw) : ""}`, "", painel(pc, d)));
  fs.forEach(f => out.push(card(`${rotulo} · ${esc(pt.n)} ${hf ? expTag(raw) : ""}`, "", feat(f), "esp-texto")));
  if (hf && raw.hope) out.push(card(`${rotulo} · ${esc(pt.n)} ${expTag(raw)}`, "", feat(pt.hope, `<span class="tag hope">3 Esperança</span>`), "esp-texto"));
  return out;
}

// Monta as seções. Devolve [{ t, cards }]; vazio = nada de especial (o botão não aparece).
export function especiais(pc, d) {
  d = d || deriv(pc);
  const s = [];
  if (pc.classe && get("classes", pc.classe)) s.push({ t: "Da sua classe", cards: cardsClasse(pc, d, pc.classe, "Classe") });

  const sub = pc.subclasse && get("subclasses", pc.subclasse), subL = pc.subclasse && loc("subclasses", pc.subclasse);
  const subCards = [];
  if (pc.classe === "Ranger" && sub && sub.id === "Beastbound") {
    const B = beast();
    subCards.push(card(`Subclasse · ${esc(subL.n)}`, "Companheiro animal", painelCompanheiro(pc, d), "esp-largo")
      .replace("</article>", (B && B.companion ? `<details class="more"><summary>Regras do companheiro</summary><div class="tx">${mdBlock(B.companion.rules)}${(B.companion.levelUp || []).map(f => `<p><b>${esc(f.n)}:</b> ${md(f.t)}</p>`).join("")}</div></details>` : "") + "</article>"));
  }
  if (sub && sub.src === "hf") {
    const sn = pc.scNivel || 0;
    [...(subL.f || []), ...(sn >= 1 ? subL.s || [] : []), ...(sn >= 2 ? subL.m || [] : [])].forEach(f => subCards.push(card(`Subclasse · ${esc(subL.n)} ${expTag(sub)}`, "", feat(f), "esp-texto")));
  }
  if (subCards.length) s.push({ t: "Da sua subclasse", cards: subCards });

  if (pc.mc && pc.mc.cls) {
    const mc = cardsClasse(pc, d, pc.mc.cls, "Multiclasse");
    if (mc.length) s.push({ t: "Da multiclasse", cards: mc });
  }

  // Expansão Hope & Fear: o que o personagem usa vindo dela e que não apareceu acima
  const hf = [];
  const anc = pc.anc || {};
  const ids = anc.tipo === "mista" ? [...new Set((anc.f || []).map(x => x.anc))] : anc.id ? [anc.id] : [];
  ids.map(id => get("ancestries", id)).filter(o => o && o.src === "hf").forEach(o => {
    const feats = anc.tipo === "mista" ? ancFeats(pc).filter(f => f.de === o.id) : ancFeats(pc);
    hf.push(card(`Ancestralidade · ${esc(loc("ancestries", o).n)} ${expTag(o)}`, "", feats.map(f => feat(f)).join(""), "esp-texto"));
  });
  const com = pc.comunidade && get("communities", pc.comunidade);
  if (com && com.src === "hf") hf.push(card(`Comunidade · ${esc(loc("communities", com).n)} ${expTag(com)}`, "", feat(loc("communities", com).f), "esp-texto"));
  const tr = pc.transf && get("transformations", pc.transf);
  if (tr) { const t = loc("transformations", tr); hf.push(card(`Transformação ${expTag(tr)}`, esc(t.n), `<div class="tx">${mdBlock(t.desc)}</div>${(t.f || []).map(f => feat(f)).join("")}`, "esp-texto")); }
  const cartasHf = [...(pc.cartas ? pc.cartas.mao : []), ...(pc.cartas ? pc.cartas.cofre : [])].map(id => get("cards", id)).filter(o => o && o.src === "hf");
  if (cartasHf.length) hf.push(card(`Cartas de domínio ${expTag(cartasHf[0])}`, `${cartasHf.length} da expansão`, `<div class="rj-chips">${cartasHf.map(o => `<span class="rj-chip">${esc(loc("cards", o).n)}</span>`).join("")}</div>`, "esp-texto"));
  if (hf.length) s.push({ t: "Expansão Hope & Fear", cards: hf });

  return s.filter(x => x.cards.length);
}

// Quantos especiais o personagem tem: nas seções de classe conta só os painéis (o texto da regra acompanha o painel)
export const quantosEspeciais = pc => especiais(pc).reduce((n, x) => n + (x.t === "Da sua classe" || x.t === "Da multiclasse" ? x.cards.filter(c => !c.includes("esp-texto")).length : x.cards.length), 0);

export function htmlEspeciais(pc, d) {
  const s = especiais(pc, d);
  const rot = c => (c ? nome("classes", c) : "");
  const res = UI.res ? `<div class="esp-res"><b>${esc(UI.res.t)}</b><div>${UI.res.h}</div><button class="icon-btn" data-act="x-res-fecha" aria-label="Fechar resultado">✕</button></div>` : "";
  return `<div class="ficha-tema rj esp"${temaAttr(pc)} style="${temaVars(pc)}">
    ${res}<p class="muted small esp-intro">O que muda no seu ${esc(rot(pc.classe) || "personagem")} em relação às regras comuns.</p>
    ${s.map(x => secao(x.t, x.cards)).join("")}
    ${temSessao(pc) ? `<div class="acts"><button class="btn ghost" data-act="x-sessao">Começar nova sessão (limpa dados de sessão)</button></div>` : ""}
  </div>`;
}
const temSessao = pc => ["Bard", "Seraph", "Warlock"].includes(pc.classe) || (pc.mc && ["Bard", "Seraph"].includes(pc.mc.cls));

// ---------- Folha aberta: guarda o corpo para redesenhar depois de cada ação ----------
export const reinicia = () => { UI.res = null; UI.esc = null; };
export function abriu(w) { corpo = w.querySelector(".sheet-body"); }
export function refresca(pc, d) {
  if (!corpo || !corpo.isConnected) return;
  const y = corpo.scrollTop;
  corpo.innerHTML = htmlEspeciais(pc, d);
  corpo.scrollTop = y;
}

// ---------- Descanso: o que volta ----------
export function descansoEspeciais(pc, curto) {
  const x = pc.x; if (!x) return;
  x.esquiva = false;
  if (!curto) {
    if (x.imp) { x.imp.u = false; x.imp.v = 0; }
    x.canal = false; x.comung = false;
    if (pc.comp && pc.comp.fora) { pc.comp.fora = false; pc.comp.es = Math.max(0, (pc.comp.max || 3) - 1); }
  }
}

// ---------- Texto digitado ----------
export function entrada(k, el, pc) {
  const x = X(pc), v = el.value;
  if (k === "x-foco") x.foco = v;
  else if (k === "x-pat") (x.pat = x.pat || {})[el.dataset.f] = v;
}

// ---------- Ações ----------
// ctx: { pc, d, ed(fn), toast, F }. Devolve true se tratou a ação.
export function acao(a, el, ctx) {
  if (!a.startsWith("x-")) return false;
  const { ed, toast } = ctx, d = ctx.d, i = +el.dataset.i, v = el.dataset.v, mf = el.dataset.m;
  const dual = (mod, rot) => { const h = rnd(12), m = rnd(12), t = h + m + mod; return { h, m, t, tipo: h === m ? "Sucesso crítico" : h > m ? "com Esperança" : "com Medo", rot, mod }; };
  const mostra = (t, h) => { UI.res = { t, h }; };
  const fim = () => { const p = ctx.F().data; refresca(p, deriv(p)); };
  const mutar = fn => { ed(fn); fim(); };
  const topo = () => { if (corpo) corpo.scrollTop = 0; };
  let ok = true;

  switch (a) {
    case "x-res-fecha": UI.res = null; break;
    // ----- Druida -----
    case "x-forma-escolher": {
      const modo = el.dataset.modo, id = el.dataset.id;
      const precisa = modo === "evolucao" || ehEvoluida(id) || ehHibrida(id);
      if (!precisa) { const erro = podeAssumir(ctx.pc, d, id, modo, {}); if (erro) { toast(erro); break; } mutar(pc => assumir(pc, id, modo, {})); topo(); toast("Transformado: " + formaAtiva(ctx.F().data).n); return true; }
      UI.esc = { id, modo, evo: "", base: "", hib: { src: [], feats: [], advs: [] } }; fim(); topo(); return true;
    }
    case "x-forma-evo": UI.esc.evo = v; break;
    case "x-forma-base": UI.esc.base = v; break;
    case "x-forma-hib": {
      const t = el.dataset.t, h = UI.esc.hib, lim = { src: HIB[UI.esc.id].origens, advs: HIB[UI.esc.id].advs, feats: HIB[UI.esc.id].feats }[t], k = h[t].indexOf(v);
      if (k >= 0) h[t].splice(k, 1); else if (h[t].length < lim) h[t].push(v);
      if (t === "src") { // some uma origem: tira vantagens e características que ficaram sem origem
        const sel = h.src.map(formaPorId).filter(Boolean);
        const advs = new Set(sel.flatMap(b => (b.adv || "").split(/,\s*/))), fs = new Set(sel.flatMap(b => (b.f || []).map(x => x.n)));
        h.advs = h.advs.filter(x => advs.has(x)); h.feats = h.feats.filter(x => fs.has(x));
      }
      break;
    }
    case "x-forma-cancelar": UI.esc = null; break;
    case "x-forma-ok": {
      const e = UI.esc, erro = podeAssumir(ctx.pc, d, e.id, e.modo, { base: e.base, evo: e.evo, hib: e.hib });
      if (erro) { toast(erro); break; }
      UI.esc = null; mutar(pc => assumir(pc, e.id, e.modo, { base: e.base, evo: e.evo, hib: e.hib })); topo(); toast("Transformado: " + formaAtiva(ctx.F().data).n); return true;
    }
    case "x-forma-sair": mutar(pc => sairForma(pc)); topo(); toast("Você saiu da Forma Bestial"); return true;
    case "x-forma-ataque": { const f = d.forma, r = dual(d.atr[f.tk], `Ataque: ${f.n}`); mostra(`Ataque de ${f.n}`, `<b class="esp-total">${r.t}</b> (${r.h} + ${r.m} ${sgn(r.mod)}) · ${r.tipo}${r.h === r.m ? "<br>Dano crítico." : ""}<br><span class="muted small">Sucesso com Esperança: +1 Esperança · com Medo: o Mestre ganha Medo.</span>`); break; }
    case "x-forma-dano": { const f = d.forma, ro = rolls(d.prof, () => rnd(f.dn.n)), s = soma(ro) + f.dn.flat; mostra(`Dano de ${f.n}`, `<b class="esp-total">${s}</b> (${d.prof}d${f.dn.n}: ${ro.join(" + ")}${f.dn.flat ? ` ${sgn(f.dn.flat)}` : ""}) ${esc(f.tipoDano)}<br><span class="muted small">Num crítico, some o valor máximo dos dados.</span>`); break; }
    // ----- Bardo -----
    case "x-rally-usar": mutar(pc => { X(pc).rally = { u: true, d: true }; }); return true;
    case "x-rally-rolar": { const tam = dadoNivel(ctx.pc, 6, 8), r = rnd(tam); mutar(pc => { X(pc).rally.d = false; if (mf === "est") pc.st.es = Math.max(0, pc.st.es - r); }); mostra("Dado de Inspiração", `<b class="esp-total">${r}</b> (d${tam}) · ${mf === "est" ? `${r} de Estresse recuperado.` : "Some ao teste de ação, de reação ou ao dano."}`); fim(); return true; }
    // ----- Guardião -----
    case "x-imp-ini": mutar(pc => { X(pc).imp = { u: true, v: 1 }; }); return true;
    case "x-imp-sobe": { const max = dadoNivel(ctx.pc, 4, 6); let fimIm = false; mutar(pc => { const im = X(pc).imp; if (im.v + 1 > max) { im.v = 0; fimIm = true; } else im.v++; }); if (fimIm) toast("O dado passou do máximo: você deixou de estar Imparável"); return true; }
    case "x-imp-fim": mutar(pc => { X(pc).imp.v = 0; }); return true;
    // ----- Patrulheiro -----
    case "x-foco-marcar": {
      const t = (document.getElementById("x-foco-in") || {}).value || "";
      if (!t.trim()) { toast("Escreva quem é o Foco"); break; }
      if (ctx.pc.st.esp < 1) { toast("Sem Esperança para gastar"); break; }
      mutar(pc => { X(pc).foco = t.trim(); pc.st.esp -= 1; }); toast("Foco definido: −1 Esperança"); return true;
    }
    case "x-foco-fim": mutar(pc => { X(pc).foco = ""; }); return true;
    case "x-comp-pip": mutar(pc => { const c = pc.comp, max = c.max || 3, n = i + 1; c.es = (c.es || 0) === n ? i : n; c.fora = c.es >= max; }); return true;
    case "x-comp-slot": mutar(pc => { const c = pc.comp; c.max = clamp((c.max || 3) + +v, 1, 8); c.es = Math.min(c.es || 0, c.max); }); return true;
    case "x-comp-dano": mutar(pc => { const c = pc.comp, max = c.max || 3; c.es = Math.min(max, (c.es || 0) + 1); c.fora = c.es >= max; }); return true;
    case "x-comp-curar": mutar(pc => { const c = pc.comp; c.es = Math.max(0, (c.es || 0) - 1); c.fora = false; }); return true;
    case "x-comp-dado": mutar(pc => { pc.comp.dado = +v; }); return true;
    case "x-comp-ataque": { const n = ctx.pc.comp.dado || 6, ro = rolls(d.prof, () => rnd(n)); mostra("Ataque do companheiro", `<b class="esp-total">${soma(ro)}</b> (${d.prof}d${n}: ${ro.join(" + ")}) · usa a sua Proficiência`); break; }
    // ----- Ladino -----
    case "x-enc": mutar(pc => { const k = pc.st.cond.indexOf("Encoberto"); k >= 0 ? pc.st.cond.splice(k, 1) : pc.st.cond.push("Encoberto"); }); return true;
    case "x-esquiva": {
      const on = !!(ctx.pc.x && ctx.pc.x.esquiva);
      if (!on && ctx.pc.st.esp < 3) { toast("Esquiva custa 3 de Esperança"); break; }
      mutar(pc => { const x = X(pc); if (x.esquiva) x.esquiva = false; else { x.esquiva = true; pc.st.esp -= 3; } }); return true;
    }
    case "x-furtivo": { const t = tierOf(ctx.pc.nivel), ro = rolls(t, () => rnd(6)); mostra("Ataque Furtivo", `<b class="esp-total">+${soma(ro)}</b> de dano (${t}d6: ${ro.join(" + ")})`); break; }
    // ----- Serafim -----
    case "x-prece-rolar": { const n = conjVal(ctx.pc, d), ro = rolls(n, () => rnd(4)); mutar(pc => { X(pc).prece = ro.map(v => ({ v, u: false })); }); return true; }
    case "x-prece": mutar(pc => { X(pc).prece[i].u = true; }); return true;
    case "x-prece-esp": { const p = ctx.pc.x.prece[i]; mutar(pc => { X(pc).prece[i].u = true; pc.st.esp = Math.min(d.espMax, pc.st.esp + p.v); }); toast(`+${p.v} Esperança`); return true; }
    case "x-prece-limpar": mutar(pc => { X(pc).prece = []; }); return true;
    // ----- Feiticeiro -----
    case "x-canal": {
      const c = get("cards", el.dataset.id); if (!c) break;
      mutar(pc => { pc.cartas.mao = pc.cartas.mao.filter(x => x !== c.id); pc.cartas.cofre.push(c.id); X(pc).canal = true; if (mf === "esp") pc.st.esp = Math.min(d.espMax, pc.st.esp + c.l); });
      if (mf === "dano") mostra("Canalizar Poder Bruto", `<b class="esp-total">+${2 * c.l}</b> na rolagem de dano da magia (dobro do nível ${c.l}).`);
      toast(mf === "esp" ? `+${c.l} Esperança` : "Carta foi para o cofre"); fim(); return true;
    }
    // ----- Mago -----
    case "x-padrao": mutar(pc => { X(pc).padrao = +v; }); return true;
    case "x-padrao-hit": mutar(pc => { if (mf === "esp") pc.st.esp = Math.min(d.espMax, pc.st.esp + 1); else pc.st.es = Math.max(0, pc.st.es - 1); }); return true;
    // ----- Bruxo -----
    case "x-favor-pip": mutar(pc => { const p = X(pc).pat = X(pc).pat || {}; const f = p.favor ?? 3; p.favor = f === i + 1 ? i : i + 1; }); return true;
    case "x-favor-usar": { const dp = dadoNivel(ctx.pc, 6, 8), r = rnd(dp); mutar(pc => { const p = X(pc).pat = X(pc).pat || {}; p.favor = Math.max(0, (p.favor ?? 3) - 1); }); mostra("Dado do Patrono", `<b class="esp-total">+${r}</b> ao total do teste (d${dp}).`); fim(); return true; }
    case "x-favor-tributo": mutar(pc => { const p = X(pc).pat = X(pc).pat || {}; p.favor = Math.min(6, (p.favor ?? 3) + conjVal(pc, d)); }); return true;
    case "x-favor-ganha": mutar(pc => { const p = X(pc).pat = X(pc).pat || {}; p.favor = Math.min(6, (p.favor ?? 3) + 1); }); return true;
    // ----- Bruxa -----
    case "x-mald-poe": {
      const t = ((document.getElementById("x-mald-in") || {}).value || "").trim();
      if (!t) { toast("Escreva quem é o alvo"); break; }
      if (ctx.pc.st.es >= d.esMax) { toast("Sem Estresse livre"); break; }
      mutar(pc => { (X(pc).mald = X(pc).mald || []).push(t); pc.st.es += 1; }); return true;
    }
    case "x-mald-tira": mutar(pc => { X(pc).mald.splice(i, 1); }); return true;
    case "x-comungar": {
      const n = conjVal(ctx.pc, d), ro = rolls(n, () => rnd(6)), tab = r => (r <= 3 ? "sabor, cheiro ou sensação relevante" : r <= 5 ? "sons ou visão relevante" : "vivência psíquica da cena");
      mutar(pc => { X(pc).comung = true; });
      mostra("Comungar", `Dados: <b>${ro.join(", ")}</b><br><span class="muted small">Escolha um resultado: 1–3 sabor/cheiro/sensação · 4–5 sons ou visão · 6 vivência psíquica. Melhor opção agora: ${tab(Math.max(...ro))}.</span>`); fim(); return true;
    }
    // ----- Assassino -----
    case "x-alvo-marca": {
      const t = ((document.getElementById("x-alvo-in") || {}).value || "").trim() || "alvo";
      if (ctx.pc.st.es >= d.esMax) { toast("Sem Estresse livre"); break; }
      mutar(pc => { X(pc).alvo = t; pc.st.es += 1; }); return true;
    }
    case "x-alvo-rolar": { const t = tierOf(ctx.pc.nivel), ro = rolls(t, () => rnd(4)); mostra("Marcado para Morrer", `<b class="esp-total">+${soma(ro)}</b> de dano (${t}d4: ${ro.join(" + ")})`); break; }
    case "x-alvo-fim": mutar(pc => { X(pc).alvo = ""; }); return true;
    // ----- Brigão -----
    case "x-combo-tam": mutar(pc => { X(pc).combo = +v; }); return true;
    case "x-combo": {
      if (ctx.pc.st.es >= d.esMax) { toast("Sem Estresse livre"); break; }
      const n = ctx.pc.x && ctx.pc.x.combo || 4, ro = [rnd(n)];
      for (let g = 0; g < 40; g++) { const r = rnd(n); ro.push(r); if (r < ro[ro.length - 2]) break; }
      mutar(pc => { pc.st.es += 1; });
      mostra("Golpe Combinado", `<b class="esp-total">+${soma(ro)}</b> de dano extra · d${n}: ${ro.join(" → ")}<br><span class="muted small">Continuou até sair um resultado menor que o anterior. Os resultados não podem ser modificados.</span>`); fim(); return true;
    }
    case "x-golpe": { const p = d.prof, a = rolls(p, () => rnd(8)), b = rolls(p, () => rnd(6)); mostra("Golpe do Lutador", `<b class="esp-total">${soma(a) + soma(b)}</b> físico (${p}d8: ${a.join("+")} · ${p}d6: ${b.join("+")})`); break; }
    // ----- Sessão -----
    case "x-sessao": mutar(pc => { const x = X(pc); x.prece = []; x.rally = { u: false, d: false }; }); toast("Dados de sessão limpos"); return true;
    default: ok = false;
  }
  if (ok) fim();
  return ok;
}
