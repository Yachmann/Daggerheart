// Conta e configurações
import { esc, icon, toast, confirmar } from "../util.js";
import { S, sb, user, entrar, cadastrar, linkMagico, recuperarSenha, novaSenha, sair, authMsg, exportar, importar, sincronizar } from "../store.js";
import { cfg, setCfg, EXP } from "../data.js";
import { app } from "../main.js";

let msg = "", ocupado = false, modo = "entrar";

export function html(p, q) {
  const c = cfg();
  const conta = !sb ? `<div class="note">Servidor não configurado: tudo fica salvo neste aparelho.</div>`
    : S.sess ? `<section class="card"><div class="mesa-row"><div class="grow"><div class="eyebrow">Conectado</div><b>${esc(user().email)}</b></div><button class="btn sm ghost" data-act="sair">${icon("logout")} Sair</button></div>
        <div class="acts"><button class="btn sm" data-act="sync">${icon("cloud")} Sincronizar agora</button></div></section>
        ${q.senha ? `<section class="card"><h3>Definir nova senha</h3><label class="f">Nova senha<input type="password" id="ns" autocomplete="new-password"></label><div class="acts"><button class="btn hope" data-act="novasenha">Salvar senha</button></div></section>` : ""}`
    : `<section class="card"><div class="chips" style="margin-bottom:14px"><button class="chip${modo === "entrar" ? " on" : ""}" data-act="modo" data-v="entrar">Entrar</button><button class="chip${modo === "criar" ? " on" : ""}" data-act="modo" data-v="criar">Criar conta</button><button class="chip${modo === "link" ? " on" : ""}" data-act="modo" data-v="link">Link por e-mail</button></div>
        <label class="f">E-mail<input type="email" id="ae" autocomplete="email" inputmode="email"></label>
        ${modo !== "link" ? `<label class="f" style="margin-top:10px">Senha<input type="password" id="ap" autocomplete="${modo === "criar" ? "new-password" : "current-password"}" minlength="6"></label>` : `<p class="muted small">Enviamos um link de acesso para o seu e-mail; basta tocar nele no celular.</p>`}
        ${msg ? `<p class="${/criada|enviado|Enviamos/.test(msg) ? "note" : "err"}" style="margin-top:12px">${esc(msg)}</p>` : ""}
        <div class="acts"><button class="btn hope" data-act="auth" ${ocupado ? "disabled" : ""}>${ocupado ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}</button>${modo === "entrar" ? `<button class="btn ghost" data-act="esqueci">Esqueci a senha</button>` : ""}</div></section>`;
  return `<div class="page-h"><h1>Conta e ajustes</h1></div>
  ${conta}
  <section class="sec"><h2>Conteúdo</h2><div class="card">
    <label class="switch"><input type="checkbox" data-ch="hf" ${c.hf ? "checked" : ""} ${EXP.disponivel ? "" : "disabled"}><span class="t"><b>Expansão Hope & Fear</b><span>${EXP.disponivel ? "Mostra as classes Assassino, Lutador, Bruxo e Feiticeira (Witch), o domínio Pavor, novas ancestralidades, comunidades, transformações, cartas e equipamentos. Mesas podem ligar ou desligar isso para as fichas delas." : "Os dados da expansão ainda não estão disponíveis neste site."}</span></span></label>
    <label class="switch"><input type="checkbox" data-ch="mestre" ${c.mestre ? "checked" : ""}><span class="t"><b>Modo mestre</b><span>Mostra a aba Mestre: batalhas, biblioteca de adversários, criador de adversários e importação de batalhas da IA.</span></span></label>
    <label class="switch"><input type="checkbox" data-ch="nomesEN" ${c.nomesEN ? "checked" : ""}><span class="t"><b>Mostrar nomes originais em inglês</b><span>Exibe o nome em inglês ao lado das cartas, classes e itens — útil para conferir com o livro.</span></span></label>
  </div></section>
  <section class="sec"><h2>Aparência</h2><div class="chips">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Escuro"]].map(([v, n]) => `<button class="chip${c.tema === v ? " on" : ""}" data-act="tema" data-v="${v}">${n}</button>`).join("")}</div></section>
  <section class="sec"><h2>Backup</h2><p class="muted" style="margin-top:-4px">Baixe uma cópia das suas fichas ou restaure de um arquivo.</p>
    <div class="acts"><button class="btn" data-act="exportar">Baixar backup</button><label class="btn" style="position:relative;overflow:hidden">Restaurar backup<input type="file" accept=".json,application/json" data-ch="importar" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div></section>
  <section class="sec"><h2>Instalar no celular</h2><p class="muted">No Android (Chrome): menu ⋮ → <b>Instalar app</b>. No iPhone (Safari): botão Compartilhar → <b>Adicionar à Tela de Início</b>. O site abre como um aplicativo, em tela cheia.</p></section>`;
}

export async function on(a, el) {
  try {
    if (a === "modo") { modo = el.dataset.v; msg = ""; app.render(true); return; }
    if (a === "auth") {
      const e = (document.getElementById("ae").value || "").trim(), s = (document.getElementById("ap") || {}).value || "";
      if (!e) { msg = "Informe o e-mail."; app.render(true); return; }
      if (modo !== "link" && s.length < 6) { msg = "A senha precisa ter pelo menos 6 caracteres."; app.render(true); return; }
      ocupado = true; msg = ""; app.render(true);
      if (modo === "entrar") { await entrar(e, s); toast("Bem-vindo!"); location.hash = "#/"; }
      else if (modo === "criar") { const r = await cadastrar(e, s); msg = r.data.session ? "" : "Conta criada. Confirme pelo link que chegou no seu e-mail e depois entre aqui."; if (r.data.session) location.hash = "#/"; }
      else { await linkMagico(e); msg = "Enviamos um link de acesso para o seu e-mail."; }
    }
    if (a === "esqueci") { const e = (document.getElementById("ae").value || "").trim(); if (!e) { msg = "Digite o e-mail acima e toque de novo em “Esqueci a senha”."; app.render(true); return; } await recuperarSenha(e); msg = "Enviamos um link para redefinir a senha."; }
    if (a === "novasenha") { const s = document.getElementById("ns").value; if (s.length < 6) { toast("Mínimo de 6 caracteres"); return; } await novaSenha(s); toast("Senha alterada"); location.hash = "#/conta"; }
    if (a === "sair") { if (await confirmar("Sair da conta neste aparelho? As fichas ficam salvas na nuvem.", { ok: "Sair" })) { await sair(); toast("Você saiu"); } }
    if (a === "sync") { await sincronizar(); toast(S.status === "erro" ? "Não foi possível sincronizar" : "Sincronizado"); }
    if (a === "tema") { setCfg({ tema: el.dataset.v }); if (el.dataset.v === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = el.dataset.v; }
    if (a === "exportar") { const b = new Blob([exportar()], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = "daggerheart-fichas-" + new Date().toISOString().slice(0, 10) + ".json"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
  } catch (e) { msg = authMsg(e); }
  ocupado = false; app.render(true);
}
export async function change(k, el) {
  if (k === "hf") { setCfg({ hf: el.checked }); toast(el.checked ? "Expansão ligada" : "Expansão desligada"); app.render(true); }
  if (k === "mestre") { setCfg({ mestre: el.checked }); toast(el.checked ? "Aba Mestre ligada" : "Aba Mestre desligada"); app.render(true); }
  if (k === "nomesEN") { setCfg({ nomesEN: el.checked }); location.reload(); }
  if (k === "importar") { const f = el.files[0]; if (!f) return; try { const n = importar(await f.text()); toast(`${n} ficha(s) restaurada(s)`); location.hash = "#/"; } catch (e) { toast("Arquivo inválido: " + e.message, "err"); } }
}
