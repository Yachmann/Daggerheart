// Receber um personagem enviado por link (#/receber/<ficha>): a ficha vem dentro do endereço.
import { esc, icon, toast, store } from "../util.js";
import { desempacotar } from "../entrega.js";
import { criarFicha, S, user, sb, entrarNaMesa } from "../store.js";
import { app } from "../main.js";
import { deriv } from "../calc.js";
import { classeSub, origemTxt, coresClasse, temaAttr, temaVars, temaEmblema } from "./common.js";

const RK = "dh-recebidos";
let est = { payload: null, st: "carregando", pc: null, erro: "", mesa: "" };
const chave = p => p.length + ":" + p.slice(0, 24) + p.slice(-24);

export function html(p, q) {
  const payload = p[0] || "";
  if (est.payload !== payload) {
    est = { payload, st: "carregando", pc: null, erro: "", mesa: q.m || "" };
    desempacotar(payload).then(pc => { est.pc = pc; est.st = "ok"; app.render(true); }).catch(e => { est.erro = e.message; est.st = "erro"; app.render(true); });
  }
  est.mesa = q.m || "";
  if (est.st === "carregando") return `<div class="loading"><div class="spin"></div>Abrindo o personagem…</div>`;
  if (est.st === "erro") return `<div class="empty"><h3>Não foi possível abrir o personagem</h3><p>${esc(est.erro)}</p><a class="btn" href="#/">Ir para as minhas fichas</a></div>`;
  const pc = est.pc, d = deriv(pc);
  const jaId = (store.get(RK, {}))[chave(payload)], ja = jaId && S.fichas[jaId];
  return `<div class="page-h"><h1>Você recebeu um personagem</h1><div class="sub">Quem enviou criou este herói para você. Ao receber, você ganha uma cópia só sua e pode jogar, atualizar e subir de nível.</div></div>
  <section class="sheet-hero"${temaAttr(pc)} style="${coresClasse(pc.classe)};${temaVars(pc)}">
    ${temaEmblema(pc)}<div class="hero-top"><div class="grow"><div class="nm">${esc(pc.nome || "Sem nome")}</div><div class="meta">${esc(classeSub(pc))}</div><div class="meta small">${esc(origemTxt(pc))}${pc.pronomes ? " · " + esc(pc.pronomes) : ""}</div></div>
      <div class="lvl-badge"><span>Nível</span><b>${pc.nivel}</b></div></div>
    <div class="core"><div class="stat"><b>${d.ev}</b><span>Evasão</span></div><div class="stat"><b>${d.pvMax}</b><span>PV</span></div><div class="stat"><b>${d.esMax}</b><span>Estresse</span></div></div>
  </section>
  ${est.mesa ? `<div class="note info" style="margin-top:14px">${user() ? "Ao receber, você também entra na mesa do mestre (código <b>" + esc(est.mesa) + "</b>)." : `Este personagem vem com um convite para a mesa do mestre (código <b>${esc(est.mesa)}</b>). <a href="#/conta">Entre na sua conta</a> antes de receber para entrar na mesa automaticamente.`}</div>` : ""}
  ${sb && !user() ? `<div class="note" style="margin-top:14px">Sem conta, o personagem fica salvo só neste aparelho. <a href="#/conta">Entre ou crie uma conta</a> para guardá-lo na nuvem e abrir no celular e no computador.</div>` : ""}
  ${ja ? `<div class="note" style="margin-top:14px">Você já recebeu este personagem. <a href="#/ficha/${esc(jaId)}">Abrir a ficha</a>.</div>` : ""}
  <div class="acts"><button class="btn hope" data-act="receber">${icon("sparkle")} ${ja ? "Receber outra cópia" : "Receber este personagem"}</button><a class="btn ghost" href="#/">Agora não</a></div>`;
}

export async function on(a) {
  if (a !== "receber" || !est.pc) return;
  let mesaId = null;
  if (est.mesa && user()) {
    try { mesaId = await entrarNaMesa(est.mesa, est.pc.nome); }
    catch (e) { toast(/codigo invalido/i.test(e.message) ? "O código da mesa não é válido: recebi só o personagem" : "Não consegui entrar na mesa: " + e.message, "err"); }
  }
  const id = criarFicha(JSON.parse(JSON.stringify(est.pc)), mesaId);
  const r = store.get(RK, {}); r[chave(est.payload)] = id; store.set(RK, r);
  toast("Personagem recebido!");
  location.hash = "#/ficha/" + encodeURIComponent(id);
}
export function input() {}
export function change() {}
