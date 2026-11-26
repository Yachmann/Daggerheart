// Adicionar um item (arma, armadura, consumível ou item) à ficha de um jogador. Vale para o mestre (fichas das suas mesas) e para o dono da ficha.
// A alteração é salva na hora e chega ao celular do jogador em tempo real (Supabase).
import { esc, icon, toast, openSheet, closeSheet } from "../util.js";
import { S, user, editar, sb, entregarItem } from "../store.js";
import { get, loc, nome as nomeDe } from "../data.js";
import { tierOf } from "../calc.js";

const TIPO_ROTULO = { weapons: "Arma", armor: "Armadura", consumables: "Consumível", items: "Item" };

// Fichas que dá para editar: as minhas e as das mesas em que sou mestre
export function candidatos() {
  const u = user();
  const minhasMesas = new Set(S.mesas.filter(m => u && m.mestre === u.id).map(m => m.id));
  return Object.values(S.fichas)
    .filter(f => !f.removida && f.data && (!u || !f.dono || f.dono === u.id || (f.mesa_id && minhasMesas.has(f.mesa_id))))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
}

// Aplica o item na ficha. Devolve um texto curto do que aconteceu.
export function aplicar(fichaId, kind, id, { qtd = 1, equipar = false } = {}) {
  let msg = "";
  editar(fichaId, pc => {
    pc.inventario = pc.inventario || []; pc.reserva = pc.reserva || [];
    const o = loc(kind, id);
    if (kind === "consumables" || kind === "items") {
      const it = pc.inventario.find(x => x.ref === id);
      if (it) it.q = (it.q ?? 1) + qtd; else pc.inventario.push({ n: o ? o.n : id, q: qtd, ref: id, k: kind });
      msg = `${qtd > 1 ? qtd + "× " : ""}no inventário`;
      return;
    }
    const x = get(kind, id), tier = tierOf(pc.nivel || 1);
    pc.reserva = pc.reserva.filter(r => !(r.k === kind && r.id === id));
    if (!equipar || !x || x.t > tier) { pc.reserva.push({ k: kind, id }); msg = equipar && x && x.t > tier ? "guardada (patamar maior que o do personagem)" : "guardada"; return; }
    if (kind === "armor") {
      if (pc.armadura && pc.armadura !== id) pc.reserva.push({ k: "armor", id: pc.armadura });
      pc.armadura = id; pc.st.arm = 0; msg = "armadura equipada"; return;
    }
    const prim = get("weapons", pc.armas.p);
    if (x.ps === "Secondary") {
      if (prim && prim.bur === "Two-Handed") { pc.reserva.push({ k: "weapons", id }); msg = "guardada (a primária usa duas mãos)"; return; }
      if (pc.armas.s && pc.armas.s !== id) pc.reserva.push({ k: "weapons", id: pc.armas.s });
      pc.armas.s = id; msg = "equipada como secundária"; return;
    }
    if (pc.armas.p && pc.armas.p !== id) pc.reserva.push({ k: "weapons", id: pc.armas.p });
    pc.armas.p = id;
    if (x.bur === "Two-Handed" && pc.armas.s) { pc.reserva.push({ k: "weapons", id: pc.armas.s }); pc.armas.s = ""; }
    msg = "equipada como primária";
  }, { imediato: true });
  return msg;
}

export function darItem(kind, id) {
  const o = loc(kind, id);
  if (!o) return;
  const lista = candidatos();
  if (!lista.length) { toast("Nenhuma ficha disponível: crie um personagem ou entre numa mesa"); return; }
  const u = user(), mesaDe = f => S.mesas.find(m => m.id === f.mesa_id);
  const grupos = new Map();
  lista.forEach(f => { const m = mesaDe(f), k = m ? m.nome : "Minhas fichas"; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(f); });
  const empilha = kind === "consumables" || kind === "items";
  const equip = kind === "weapons" || kind === "armor";
  const w = openSheet(`<p class="muted" style="margin-top:0"><span class="tag">${TIPO_ROTULO[kind]}</span> <b>${esc(o.n)}</b></p>
    ${empilha ? `<label class="f" style="max-width:140px;margin-bottom:10px">Quantidade<input type="number" id="dq" min="1" max="20" value="1"></label>` : ""}
    ${[...grupos].map(([g, fs]) => `<div class="eyebrow" style="margin:12px 0 4px">${esc(g)}</div>${fs.map(f => { const pc = f.data; return `<div class="inv-row" data-f="${esc(f.id)}"><div class="grow"><b>${esc(f.nome || "Sem nome")}</b><div class="muted small">${esc(nomeDe("classes", pc.classe))} · nível ${pc.nivel}${f.dono && u && f.dono !== u.id ? " · jogador" : ""}</div></div>
      ${equip ? `<button class="btn sm" data-d="guardar">Guardar</button><button class="btn sm hope" data-d="equipar">Equipar</button>` : `<button class="btn sm hope" data-d="dar">${icon("plus")} Adicionar</button>`}<span class="dar-ok" hidden>✓</span></div>`; }).join("")}`).join("")}
    <p class="muted small" style="margin-top:12px">A ficha é atualizada na hora${u ? " e aparece no celular do jogador" : ""}. Você pode adicionar a mais de uma ficha.</p>`, { title: "Adicionar à ficha" });
  w.addEventListener("click", e => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    const row = b.closest("[data-f]"), fid = row.dataset.f, q = empilha ? Math.max(1, parseInt(w.querySelector("#dq").value, 10) || 1) : 1;
    const msg = aplicar(fid, kind, id, { qtd: q, equipar: b.dataset.d === "equipar" });
    const f = S.fichas[fid];
    toast(`${o.n}: ${msg} (${f ? f.nome : "ficha"})`);
    const ok = row.querySelector(".dar-ok"); ok.hidden = false; ok.textContent = "✓ " + msg;
  });
}

// ---------- Passar um item da minha ficha para outro jogador da mesa ----------
// tipo 'inv': item do inventário (índice i) · tipo 'res': arma/armadura guardada (índice i)
export function colegasDaMesa(fichaId) {
  const f = S.fichas[fichaId];
  if (!f || !f.mesa_id) return [];
  return Object.values(S.fichas).filter(x => x.id !== fichaId && !x.removida && x.data && x.mesa_id === f.mesa_id)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
}
export const podePassar = fichaId => !!(sb && user() && colegasDaMesa(fichaId).length);

export function passarItem(fichaId, tipo, i) {
  const f = S.fichas[fichaId]; if (!f) return;
  const pc = f.data;
  // tipo 'eq': arma/armadura equipada (i = "p" | "s" | "a"); no destino ela vai para as guardadas
  const orig = tipo === "inv" ? (pc.inventario || [])[i]
    : tipo === "eq" ? (i === "a" ? (pc.armadura ? { k: "armor", id: pc.armadura } : null) : (pc.armas && pc.armas[i] ? { k: "weapons", id: pc.armas[i] } : null))
    : (pc.reserva || [])[i];
  if (!orig) return;
  const o = tipo === "inv" ? null : loc(orig.k === "armor" ? "armor" : "weapons", orig.id);
  const nomeItem = tipo === "inv" ? orig.n : (o ? o.n : orig.id);
  const qMax = tipo === "inv" ? Math.max(1, orig.q ?? 1) : 1;
  const colegas = colegasDaMesa(fichaId);
  if (!colegas.length) { toast("Não há outro personagem na sua mesa"); return; }
  const mesa = S.mesas.find(m => m.id === f.mesa_id);
  const w = openSheet(`<p class="muted" style="margin-top:0">Passar <b>${esc(nomeItem)}</b>${mesa ? ` · mesa <b>${esc(mesa.nome)}</b>` : ""}</p>
    ${qMax > 1 ? `<label class="f" style="max-width:140px;margin-bottom:10px">Quantidade<input type="number" id="pq" min="1" max="${qMax}" value="1"></label>` : ""}
    ${colegas.map(c => `<div class="inv-row"><div class="grow"><b>${esc(c.nome || "Sem nome")}</b><div class="muted small">${esc(nomeDe("classes", c.data.classe))} · nível ${c.data.nivel}</div></div>
      <button class="btn sm hope" data-p="${esc(c.id)}">Passar</button></div>`).join("")}
    <p class="muted small" style="margin-top:12px">O item sai da sua ficha e aparece na do outro jogador na hora.</p>`, { title: "Dar a outro jogador" });
  w.addEventListener("click", async e => {
    const b = e.target.closest("[data-p]"); if (!b || b.disabled) return;
    const destino = S.fichas[b.dataset.p];
    const q = qMax > 1 ? Math.min(qMax, Math.max(1, parseInt(w.querySelector("#pq").value, 10) || 1)) : 1;
    w.querySelectorAll("[data-p]").forEach(x => (x.disabled = true));
    try {
      const pacote = tipo === "inv" ? { n: orig.n, q, ref: orig.ref, k: orig.k, nota: orig.nota } : { k: orig.k === "armor" ? "armor" : "weapons", id: orig.id };
      await entregarItem(b.dataset.p, tipo === "eq" ? "res" : tipo, pacote);
      // só tira da minha ficha depois que o banco confirmou
      editar(fichaId, p => {
        if (tipo === "inv") {
          const k = (p.inventario || []).findIndex(x => x.n === orig.n && x.ref === orig.ref);
          if (k < 0) return;
          p.inventario[k].q = (p.inventario[k].q ?? 1) - q;
          if (p.inventario[k].q <= 0) p.inventario.splice(k, 1);
        } else if (tipo === "eq") {
          if (i === "a") { if (p.armadura === orig.id) { p.armadura = ""; p.st.arm = 0; } }
          else if (p.armas && p.armas[i] === orig.id) p.armas[i] = "";
        } else {
          const k = (p.reserva || []).findIndex(x => x.k === orig.k && x.id === orig.id);
          if (k >= 0) p.reserva.splice(k, 1);
        }
      }, { imediato: true });
      closeSheet();
      toast(`${q > 1 ? q + "× " : ""}${nomeItem} foi para ${destino ? destino.nome : "o outro jogador"}`);
    } catch (err) {
      w.querySelectorAll("[data-p]").forEach(x => (x.disabled = false));
      toast(err.message || "Não consegui passar o item", "err");
    }
  });
}
