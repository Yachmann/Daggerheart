// Início: meus personagens
import { esc, icon } from "../util.js";
import { S, minhasFichas, sb, user } from "../store.js";
import { deriv } from "../calc.js";
import { coresClasse, temaAttr, temaVars, temaEmblema, classeSub, origemTxt, condFx, COND_COR } from "./common.js";

const barra = (v, max, cor) => `<div class="tr"><i style="width:${max ? Math.round((v / max) * 100) : 0}%;background:${cor}"></i></div>`;

export function cardPC(f, href) {
  const pc = f.data, d = deriv(pc);
  const fx = condFx(pc.st.cond);
  return `<a class="pc-card${fx.cls}"${temaAttr(pc)} href="${href || "#/ficha/" + encodeURIComponent(f.id)}" style="${coresClasse(pc.classe)};${temaVars(pc)}${fx.style}">
    ${temaEmblema(pc)}<span class="lvl">Nv ${pc.nivel}</span>
    ${pc.modelo ? `<div class="eyebrow" style="margin-bottom:2px;color:var(--steel)">Modelo para entregar</div>` : ""}
    <div class="nm">${esc(pc.nome || "Sem nome")}</div>
    <div class="meta">${esc(classeSub(pc) || "Classe não escolhida")}</div>
    <div class="meta small">${esc(origemTxt(pc))}</div>
    ${pc.st.cond.length ? `<div class="chips" style="margin-top:8px">${pc.st.cond.map(c => `<span class="tag cond-tag" style="--k:${COND_COR[c] || "var(--steel)"}">${esc(c)}</span>`).join("")}</div>` : ""}
    <div class="mini-bars">
      <div class="mbar">PV ${d.pvMax - pc.st.pv}/${d.pvMax}${barra(d.pvMax - pc.st.pv, d.pvMax, "var(--blood)")}</div>
      <div class="mbar">Estresse ${pc.st.es}/${d.esMax}${barra(pc.st.es, d.esMax, "var(--fear)")}</div>
      <div class="mbar">Esperança ${pc.st.esp}/${d.espMax}${barra(pc.st.esp, d.espMax, "var(--hope)")}</div>
    </div>
  </a>`;
}

export function html() {
  const lista = minhasFichas();
  const semConta = sb && !S.sess;
  return `<div class="page-h"><h1>Meus personagens</h1><a class="btn hope" href="#/nova">${icon("plus")} Novo personagem</a></div>
  ${semConta ? `<div class="note info" style="margin-bottom:16px"><b>Entre na sua conta</b> para guardar suas fichas na nuvem, abrir no celular e no computador e participar da mesa do mestre. <a href="#/conta">Entrar ou criar conta</a></div>` : ""}
  ${S.sess && !S.tabelaOk ? `<div class="err" style="margin-bottom:16px">O banco de dados ainda não tem as tabelas de fichas. O mestre precisa rodar o arquivo <code>supabase-fichas.sql</code> no Supabase. Enquanto isso, tudo fica salvo neste aparelho.</div>` : ""}
  ${lista.length ? `<div class="pcs">${lista.map(f => cardPC(f)).join("")}</div>` :
    `<div class="empty"><h3>Nenhum personagem ainda</h3><p>Crie seu primeiro herói em poucos passos: classe, origem, atributos, equipamento e cartas.</p><a class="btn hope" href="#/nova">${icon("plus")} Criar personagem</a></div>`}
  <section class="sec"><h2>Atalhos</h2>
    <div class="guide-grid">
      <a class="gtile" href="#/regras"><b>Regras em português</b><span>Guia rápido e busca no SRD</span></a>
      <a class="gtile" href="#/compendio"><b>Cartas de domínio</b><span>Todas as cartas, filtráveis</span></a>
      <a class="gtile" href="#/compendio?aba=classes"><b>Classes</b><span>Habilidades e subclasses</span></a>
      <a class="gtile" href="#/mesas"><b>Minha mesa</b><span>Entre com o código do mestre</span></a>
      <a class="gtile" href="#/mestre"><b>Ferramentas do mestre</b><span>Adversários, combate, geradores</span></a>
    </div>
  </section>`;
}
