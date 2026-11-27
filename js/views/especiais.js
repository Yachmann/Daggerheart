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

// ---------- Dados: só lembrete visual. Nada é rolado no site: a pessoa rola na mesa e aqui marca/anota ----------
const FORMA_DADO = {
  4: `<polygon points="24,5 44,40 4,40"/>`,
  6: `<rect x="6" y="6" width="36" height="36" rx="8"/>`,
  8: `<polygon points="24,3 44,24 24,45 4,24"/>`,
  10: `<polygon points="24,3 43,18 24,45 5,18"/>`,
  12: `<polygon points="24,3 44,18 36,43 12,43 4,18"/>`,
  20: `<polygon points="24,3 43,14 43,34 24,45 5,34 5,14"/>`,
};
// Um dado desenhado. texto: o que aparece dentro (valor anotado ou "d6"); estado: on (em jogo), off (gasto), vazio (falta anotar)
export const dado = (faces, texto, estado = "on") => `<span class="dd ${estado}" title="d${faces}"><svg viewBox="0 0 48 48" aria-hidden="true">${FORMA_DADO[faces] || FORMA_DADO[6]}<text x="24" y="${faces === 4 ? 33 : 29}" text-anchor="middle">${esc(texto ?? "d" + faces)}</text></svg></span>`;
// Vários dados iguais num bloco com legenda: "3× d6 · Ataque Furtivo"
const dadosBloco = (qtd, faces, legenda, estado = "on") => `<div class="dd-bloco"><div class="dd-fila">${Array.from({ length: Math.min(qtd, 8) }, () => dado(faces, "d" + faces, estado)).join("")}</div><div class="dd-leg"><b>${qtd}× d${faces}</b> ${legenda}</div></div>`;
const lembrete = t => `<p class="esp-rola">🎲 ${t}</p>`;

// ---------- Painéis por especial ----------
// Cada painel devolve HTML interativo. As ações (data-act="x-…") são tratadas em acao() mais abaixo.
function painelBardo(pc) {
  const x = X(pc), r = x.rally || {}, tam = dadoNivel(pc, 6, 8);
  const estado = r.d ? "on" : r.u ? "off" : "vazio";
  return ctrl(`<div class="dd-bloco"><div class="dd-fila">${dado(tam, "d" + tam, estado)}</div><div class="dd-leg"><b>Dado de Inspiração d${tam}</b> ${r.d ? "· você tem este dado" : r.u ? "· já gasto nesta sessão" : "· ainda não inspirou o grupo"}</div></div>
    <div class="acts">${!r.u ? btn("x-rally-usar", "Inspirar o grupo (1× por sessão)", "", "btn sm hope") : ""}${r.d ? btn("x-rally-gasto", "Gastei meu dado", "", "btn sm fear") : ""}</div>
    ${lembrete(`Role o d${tam} na mesa quando gastar: some ao teste de ação, de reação, ao dano, ou recupere Estresse igual ao resultado. Cada aliado recebe o seu dado também (marque na ficha dele).`)}`);
}

function painelGuardiao(pc) {
  const x = X(pc), im = x.imp || {}, max = dadoNivel(pc, 4, 6);
  return ctrl(`<div class="dd-bloco"><div class="dd-fila">${dado(max, im.v ? String(im.v) : "d" + max, im.v ? "on" : im.u ? "off" : "vazio")}</div><div class="dd-leg"><b>Dado Imparável d${max}</b> ${im.v ? `· valor atual <b>${im.v}</b>` : im.u ? "· já usado neste descanso" : "· disponível"}</div></div>
    ${im.v ? `<div class="acts">${btn("x-imp-sobe", "Causei PV de dano: subir o dado", "", "btn sm hope")}${btn("x-imp-fim", "Fim da cena: encerrar")}</div>
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
  const c = pc.comp = pc.comp || {}, max = c.max || 3, es = clamp(c.es || 0, 0, max), dd = c.dado || 6, fora = !!c.fora;
  const pips = Array.from({ length: max }, (_, i) => `<button class="pip${i < es ? " on" : ""}" data-act="x-comp-pip" data-i="${i}" aria-label="Estresse ${i + 1}"></button>`).join("");
  return ctrl(`<div class="esp-form"><label class="f">Nome<input type="text" data-in="comp" data-f="nome" data-k="xcn" value="${esc(c.nome || "")}"></label><label class="f">Espécie<input type="text" data-in="comp" data-f="esp" data-k="xce" value="${esc(c.esp || "")}"></label></div>
    ${fora ? `<div class="err" style="margin:8px 0">${esc(c.nome || "O companheiro")} saiu da cena e volta no próximo descanso longo.</div>` : ""}
    <div class="esp-pips"><span class="vl">Estresse</span><div class="pips es">${pips}</div>${btn("x-comp-slot", "−", 'data-v="-1"')}${btn("x-comp-slot", "+", 'data-v="1"')}</div>
    <div class="acts">${btn("x-comp-dano", "Sofreu dano: marcar 1 Estresse", fora ? "disabled" : "", "btn sm fear")}${btn("x-comp-curar", "Recuperar 1 Estresse")}</div>
    ${dadosBloco(d.prof, dd, "dano do companheiro (usa a sua Proficiência)")}
    <div class="chips"><span class="muted small">Dado de dano:</span>${[6, 8, 10, 12].map(n => chip(dd === n, "x-comp-dado", `d${n}`, `data-v="${n}"`)).join("")}</div>
    <p class="muted small">Ajuste os espaços de Estresse e o dado conforme a sua ficha de companheiro e os avanços escolhidos. Companheiro sem Estresse sai da cena e volta com 1 Estresse recuperado no próximo descanso longo.</p>`);
}

function painelLadino(pc, d) {
  const x = X(pc), enc = pc.st.cond.includes("Encoberto"), t = tierOf(pc.nivel);
  return ctrl(`<div class="acts">${chip(enc, "x-enc", enc ? "Encoberto ✓" : "Ficar Encoberto")}${chip(!!x.esquiva, "x-esquiva", x.esquiva ? "Esquiva ativa (+2 Evasão)" : "Esquiva do Ladino (3 Esperança)")}</div>
    ${dadosBloco(t, 6, `de Ataque Furtivo${enc ? " · você está Encoberto: some ao dano!" : ""}`, enc ? "on" : "vazio")}
    <p class="muted small">Some esses dados ao dano se acertar estando Encoberto ou com um aliado em Corpo a Corpo do alvo (role na mesa). Encoberto vale como Oculto e termina após um ataque ou ao terminar um movimento à vista de um adversário. A Esquiva dura até um ataque acertar você ou até o próximo descanso.</p>`);
}

function painelSerafim(pc, d) {
  const x = X(pc), pr = x.prece || [], n = conjVal(pc, d);
  const slots = pr.map((p, i) => {
    if (!p.v) return `<div class="esp-prece vazio">${dado(4, "?", "vazio")}<div class="esp-prece-b">${[1, 2, 3, 4].map(k => btn("x-prece-val", String(k), `data-i="${i}" data-v="${k}"`)).join("")}</div><span class="muted small">anote o valor</span></div>`;
    return `<div class="esp-prece${p.u ? " usado" : ""}">${dado(4, String(p.v), p.u ? "off" : "on")}<div class="esp-prece-b">${btn("x-prece", p.u ? "Gasto" : "Gastar", `data-i="${i}" ${p.u ? "disabled" : ""}`)}${btn("x-prece-esp", `+${p.v} Esp.`, `data-i="${i}" ${p.u ? "disabled" : ""}`, "btn sm hope")}${btn("x-prece-edita", "✎", `data-i="${i}" title="Corrigir o valor" ${p.u ? "disabled" : ""}`)}</div></div>`;
  }).join("");
  const vivos = pr.filter(p => p.v && !p.u).length;
  return ctrl(`<div class="dd-bloco"><div class="dd-leg"><b>Dados de Prece</b> · ${pr.length ? `<b>${vivos}</b> disponíve${vivos === 1 ? "l" : "is"} de ${pr.length}` : `${n}× d4 por sessão`}</div></div>
    ${slots ? `<div class="esp-pracas">${slots}</div>` : ""}
    <div class="acts">${!pr.length ? btn("x-prece-prep", `Começar sessão: anotar ${n} dados`, "", "btn sm hope") : btn("x-prece-limpar", "Descartar (fim da sessão)")}</div>
    ${lembrete(`Role ${n}d4 na mesa no início da sessão e anote aqui o valor de cada dado. Cada dado gasto reduz dano recebido, soma ao resultado de uma rolagem sua ou de um aliado a alcance Longe (depois de rolada), ou vira Esperança igual ao valor.`)}`);
}

function painelFeiticeiro(pc, d) {
  const x = X(pc), mao = pc.cartas.mao.map(id => get("cards", id)).filter(Boolean);
  return ctrl(`<p class="esp-linha">Canalizar Poder Bruto: ${x.canal ? `<span class="tag">usado (volta no descanso longo)</span>` : "<b>disponível</b>"}</p>
    ${x.canal ? "" : mao.length ? `<div class="esp-cartas">${mao.map(c => { const o = loc("cards", c); return `<div class="inv-row"><div class="grow"><b>${esc(o.n)}</b> <span class="muted small">nível ${c.l}</span></div>${btn("x-canal", `+${c.l} Esperança`, `data-id="${esc(c.id)}" data-m="esp"`, "btn sm hope")}${btn("x-canal", `+${2 * c.l} dano`, `data-id="${esc(c.id)}" data-m="dano"`)}</div>`; }).join("")}</div>` : `<p class="muted small">Sem cartas na mão para colocar no cofre.</p>`}
    <p class="muted small">A carta escolhida vai da mão para o cofre. Ganhe Esperança igual ao nível dela, ou some o dobro do nível à rolagem de uma magia de dano.</p>`);
}

function painelMago(pc) {
  const x = X(pc), n = x.padrao || 0;
  return ctrl(`<div class="dd-bloco"><div class="dd-fila">${dado(12, n ? String(n) : "?", n ? "on" : "vazio")}</div><div class="dd-leg"><b>Seu número dos Padrões Estranhos:</b> ${n || "ainda não escolhido"}</div></div>
    <div class="chips">${Array.from({ length: 12 }, (_, i) => chip(n === i + 1, "x-padrao", String(i + 1), `data-v="${i + 1}"`)).join("")}</div>
    ${n ? `<div class="acts">${btn("x-padrao-hit", "Saiu meu número: +1 Esperança", 'data-m="esp"', "btn sm hope")}${btn("x-padrao-hit", "Saiu meu número: −1 Estresse", 'data-m="est"')}</div>` : ""}
    <p class="muted small">Quando um Dado de Dualidade mostrar o seu número, ganhe 1 de Esperança ou recupere 1 de Estresse. Você pode trocar o número ao fazer um descanso longo.</p>`);
}

function painelBruxo(pc, d) {
  const x = X(pc), p = x.pat = x.pat || {}, favor = clamp(p.favor ?? 3, 0, 6), dp = dadoNivel(pc, 6, 8), n = conjVal(pc, d);
  const pips = Array.from({ length: 6 }, (_, i) => `<button class="pip${i < favor ? " on" : ""}" data-act="x-favor-pip" data-i="${i}" aria-label="Favor ${i + 1}"></button>`).join("");
  return ctrl(`<div class="esp-form"><label class="f">Patrono<input type="text" data-in="x-pat" data-f="nome" data-k="xpn" value="${esc(p.nome || "")}"></label><label class="f">Esfera de influência<input type="text" data-in="x-pat" data-f="esfera" data-k="xpe" value="${esc(p.esfera || "")}"></label></div>
    <div class="dd-bloco"><div class="dd-fila">${dado(dp, "d" + dp, favor ? "on" : "off")}</div><div class="dd-leg"><b>Dado do Patrono d${dp}</b> · ${favor ? "role ao gastar 1 Favor" : "sem Favor para invocar"}</div></div>
    <div class="esp-pips"><span class="vl">Favor</span><div class="pips hope">${pips}</div><b>${favor}/6</b></div>
    <div class="acts">${btn("x-favor-usar", "Gastei 1 Favor (invoquei o patrono)", favor < 1 ? "disabled" : "", "btn sm hope")}${btn("x-favor-tributo", `Tributo (descanso): +${n} Favor`)}${btn("x-favor-ganha", "Sucesso com Esperança: +1 Favor")}</div>
    <p class="muted small">Antes de um teste ligado à esfera do patrono, gaste 1 de Favor, role o Dado do Patrono na mesa e some ao total. O máximo é 6 de Favor.</p>`);
}

function painelBruxa(pc, d) {
  const x = X(pc), m = x.mald || [], lim = conjVal(pc, d), t = tierOf(pc.nivel);
  return ctrl(`<p class="esp-linha">Amaldiçoados: <b>${m.length}/${lim}</b> · penalidade <b>−${t}</b> no dano e na Dificuldade deles</p>
    <div class="chips">${m.map((nm, i) => `<button class="chip on" data-act="x-mald-tira" data-i="${i}">${esc(nm)} ✕</button>`).join("") || `<span class="muted small">Ninguém amaldiçoado.</span>`}</div>
    <div class="esp-form"><input type="text" id="x-mald-in" placeholder="Alvo a amaldiçoar">${btn("x-mald-poe", "Amaldiçoar (marcar 1 Estresse)", m.length >= lim ? "disabled" : "", "btn sm fear")}</div>
    ${dadosBloco(lim, 6, `de Comunhão ${x.comung ? "· já usada neste descanso longo" : "· 1× por descanso longo"}`, x.comung ? "off" : "on")}
    <div class="acts">${btn("x-comungar", x.comung ? "Comunhão usada" : "Comunguei (marcar como usada)", x.comung ? "disabled" : "", "btn sm hope")}${x.comung ? btn("x-comungar-volta", "Desfazer") : ""}</div>
    ${lembrete("Role os d6 na mesa e escolha um resultado: 1–3 sabor, cheiro ou sensação · 4–5 sons ou visão · 6 vivência psíquica da cena.")}`);
}

function painelAssassino(pc) {
  const x = X(pc), t = tierOf(pc.nivel), alvo = x.alvo || "";
  return ctrl(`<p class="esp-linha">Marcado para Morrer: <b>${alvo ? esc(alvo) : "ninguém"}</b></p>
    ${dadosBloco(t, 4, `de dano extra contra o alvo marcado`, alvo ? "on" : "vazio")}
    <div class="esp-form"><input type="text" id="x-alvo-in" placeholder="Alvo do ataque bem-sucedido" value="${esc(alvo)}">${btn("x-alvo-marca", "Marcar (1 Estresse)", "", "btn sm fear")}${alvo ? btn("x-alvo-fim", "Encerrar") : ""}</div>
    <p class="muted small">Só um adversário por vez. Termina num descanso, quando o alvo for derrotado, ou quando o Mestre gastar ${t} de Medo. Role os dados na mesa ao causar dano nele.</p>`);
}

function painelBrigao(pc, d) {
  const x = X(pc), dc = x.combo || 4;
  return ctrl(`<div class="dd-bloco"><div class="dd-fila">${dado(dc, "d" + dc, "on")}</div><div class="dd-leg"><b>Dado de Combo d${dc}</b></div></div>
    <div class="chips">${[4, 6, 8, 10, 12].map(n => chip(dc === n, "x-combo-tam", `d${n}`, `data-v="${n}"`)).join("")}</div>
    <div class="acts">${btn("x-combo", "Iniciei um Golpe Combinado (marcar 1 Estresse)", "", "btn sm hope")}</div>
    ${dadosBloco(d.prof, 8, "do Golpe do Lutador")}${dadosBloco(d.prof, 6, "do Golpe do Lutador (junto com os d8)")}
    ${lembrete("Golpe Combinado: role o Dado de Combo na mesa e continue rolando enquanto o resultado novo não for menor que o anterior. O dano extra é a soma de todos. Aumente o dado de Combo aqui quando escolher esse avanço de nível.")}`);
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
  const dn = f.dn;
  return `<div class="forma-ativa">
    <div class="forma-topo"><div class="forma-ilu grande">${ilustracao(f.ilu)}</div>
      <div class="forma-id"><span class="esp-cab">Você está transformado</span><div class="esp-tit">${esc(f.n)}</div><div class="muted small">${esc(f.ex)}</div>
        <div class="rj-chips">${f.trait ? `<span class="rj-chip"><b>${esc(f.trait)}</b> ${sgn(f.tb)}${evT ? ` +1 (Evolução)` : ""}</span>` : ""}<span class="rj-chip">Evasão ${sgn(f.ev)}</span>${f.atk ? `<span class="rj-chip">${esc(f.atk)}</span>` : ""}</div></div></div>
    ${evT && evT.k !== f.tk ? `<p class="muted small">Evolução: +1 em ${esc(evT.pt)} até sair da forma.</p>` : ""}
    ${f.tk ? `<p class="esp-linha">Ataque com <b>${esc(f.trait)} ${sgn(d.atr[f.tk])}</b> (já somado na ficha)</p>` : ""}
    ${dn ? dadosBloco(d.prof, dn.n, `de dano${dn.flat ? ` ${sgn(dn.flat)}` : ""} ${esc(f.tipoDano)}`) : ""}
    <div class="acts">${btn("x-forma-sair", "Sair da forma", "", "btn sm fear")}</div>
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
    // ----- Bardo -----
    case "x-rally-usar": mutar(pc => { X(pc).rally = { u: true, d: true }; }); return true;
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
    // ----- Ladino -----
    case "x-enc": mutar(pc => { const k = pc.st.cond.indexOf("Encoberto"); k >= 0 ? pc.st.cond.splice(k, 1) : pc.st.cond.push("Encoberto"); }); return true;
    case "x-esquiva": {
      const on = !!(ctx.pc.x && ctx.pc.x.esquiva);
      if (!on && ctx.pc.st.esp < 3) { toast("Esquiva custa 3 de Esperança"); break; }
      mutar(pc => { const x = X(pc); if (x.esquiva) x.esquiva = false; else { x.esquiva = true; pc.st.esp -= 3; } }); return true;
    }
    // ----- Serafim -----
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
    // ----- Assassino -----
    case "x-alvo-marca": {
      const t = ((document.getElementById("x-alvo-in") || {}).value || "").trim() || "alvo";
      if (ctx.pc.st.es >= d.esMax) { toast("Sem Estresse livre"); break; }
      mutar(pc => { X(pc).alvo = t; pc.st.es += 1; }); return true;
    }
    case "x-alvo-fim": mutar(pc => { X(pc).alvo = ""; }); return true;
    // ----- Brigão -----
    case "x-combo-tam": mutar(pc => { X(pc).combo = +v; }); return true;
    // ----- Dados anotados (a pessoa rola na mesa; aqui só marca/anota) -----
    case "x-rally-gasto": mutar(pc => { X(pc).rally.d = false; }); return true;
    case "x-prece-prep": { const n = conjVal(ctx.pc, d); mutar(pc => { X(pc).prece = Array.from({ length: n }, () => ({ v: 0, u: false })); }); return true; }
    case "x-prece-val": mutar(pc => { X(pc).prece[i].v = +v; }); return true;
    case "x-prece-edita": mutar(pc => { X(pc).prece[i].v = 0; }); return true;
    case "x-prece": mutar(pc => { X(pc).prece[i].u = true; }); return true;
    case "x-prece-esp": { const p = ctx.pc.x.prece[i]; mutar(pc => { X(pc).prece[i].u = true; pc.st.esp = Math.min(d.espMax, pc.st.esp + p.v); }); toast(`+${p.v} Esperança`); return true; }
    case "x-prece-limpar": mutar(pc => { X(pc).prece = []; }); return true;
    case "x-favor-usar": mutar(pc => { const p = X(pc).pat = X(pc).pat || {}; p.favor = Math.max(0, (p.favor ?? 3) - 1); }); toast("−1 Favor: role o Dado do Patrono na mesa"); return true;
    case "x-comungar": mutar(pc => { X(pc).comung = true; }); return true;
    case "x-comungar-volta": mutar(pc => { X(pc).comung = false; }); return true;
    case "x-combo": {
      if (ctx.pc.st.es >= d.esMax) { toast("Sem Estresse livre"); break; }
      mutar(pc => { pc.st.es += 1; }); toast("1 Estresse marcado: role o Dado de Combo na mesa"); return true;
    }
    // ----- Sessão -----
    case "x-sessao": mutar(pc => { const x = X(pc); x.prece = []; x.rally = { u: false, d: false }; }); toast("Dados de sessão limpos"); return true;
    default: ok = false;
  }
  if (ok) fim();
  return ok;
}

// ---------- Dados especiais na aba Jogo: um lembrete de que o personagem tem algo em jogo ----------
// Devolve [{ faces, texto, estado, nome }] só do que está valendo agora (nada é rolado aqui).
export function dadosEmJogo(pc, d) {
  const x = pc.x || {}, out = [], cls = [pc.classe, pc.mc && pc.mc.cls];
  if (cls.includes("Bard") && x.rally && x.rally.d) out.push({ faces: dadoNivel(pc, 6, 8), nome: "Inspiração", estado: "on" });
  if (cls.includes("Guardian") && x.imp && x.imp.v) out.push({ faces: dadoNivel(pc, 4, 6), texto: String(x.imp.v), nome: "Imparável", estado: "on" });
  if (cls.includes("Seraph")) (x.prece || []).forEach(p => { if (p.v && !p.u) out.push({ faces: 4, texto: String(p.v), nome: "Prece", estado: "on" }); });
  if (cls.includes("Rogue") && pc.st.cond.includes("Encoberto")) for (let i = 0; i < tierOf(pc.nivel); i++) out.push({ faces: 6, nome: "Furtivo", estado: "on" });
  if (pc.classe === "Assassin" && x.alvo) for (let i = 0; i < tierOf(pc.nivel); i++) out.push({ faces: 4, nome: "Marcado", estado: "on" });
  if (pc.classe === "Brawler") out.push({ faces: x.combo || 4, nome: "Combo", estado: "on" });
  if (pc.classe === "Warlock") { const f = x.pat ? x.pat.favor ?? 3 : 3; out.push({ faces: dadoNivel(pc, 6, 8), nome: "Patrono", estado: f ? "on" : "off" }); }
  if (cls.includes("Wizard") && x.padrao) out.push({ faces: 12, texto: String(x.padrao), nome: "Número", estado: "on" });
  if (d.forma && d.forma.dn) for (let i = 0; i < Math.min(d.prof, 4); i++) out.push({ faces: d.forma.dn.n, nome: "Forma", estado: "on" });
  return out;
}
export function faixaDados(pc, d) {
  const l = dadosEmJogo(pc, d);
  if (!l.length) return "";
  return `<button class="dd-faixa" data-act="especiais" aria-label="Dados especiais em jogo: abrir Especiais"><span class="dd-faixa-t">Dados especiais</span><span class="dd-faixa-l">${l.map(x => `<span class="dd-item">${dado(x.faces, x.texto, x.estado)}<small>${esc(x.nome)}</small></span>`).join("")}</span></button>`;
}
