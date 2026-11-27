// Forma Bestial do Druida: lógica pura (sem tela). A ficha guarda em pc.bf a forma ativa; tudo o mais é calculado aqui.
//   pc.bf = { id, evo?: "agi"|"for"|…, base?: id (Fera Lendária/Mítica), hib?: { src: [ids], feats: [nomes], advs: [textos] } }
// Regras (livro): marcar 1 de Estresse para se transformar (ou 3 de Esperança na Evolução, com +1 em um atributo até sair);
// soma o bônus de Evasão da forma; usa o atributo da forma no ataque; sem armas nem magias de domínio; sai se marcar o último PV.
import { beast, TRAITS } from "./data.js";

const trPT = pt => TRAITS.find(t => t.pt === pt);
export const patamarDe = id => { const b = beast(); const f = b && b.beastforms.find(x => x.id === id); return f ? f.tier : 0; };
export const formaPorId = id => { const b = beast(); return (b && b.beastforms.find(x => x.id === id)) || null; };
export const ehEvoluida = id => id === "Legendary Beast" || id === "Mythic Beast";
export const ehHibrida = id => id === "Legendary Hybrid" || id === "Mythic Hybrid";

// Evoluída: bônus por patamar (livro). Híbrida: quantas opções de origem, vantagens e características escolher, e Estresse extra.
export const EVO = { "Legendary Beast": { dano: 6, tr: 1, ev: 2, base: [1], passo: 0 }, "Mythic Beast": { dano: 9, tr: 2, ev: 3, base: [1, 2], passo: 1 } };
export const HIB = { "Legendary Hybrid": { origens: 2, tiers: [1, 2], advs: 4, feats: 2, extra: 1 }, "Mythic Hybrid": { origens: 3, tiers: [1, 2, 3], advs: 5, feats: 3, extra: 2 } };

// Formas que o personagem pode assumir (patamar igual ou menor ao dele)
export const formasDisponiveis = tier => ((beast() || {}).beastforms || []).filter(f => f.tier <= tier);
export const basesEvoluida = id => ((beast() || {}).beastforms || []).filter(f => EVO[id] && EVO[id].base.includes(f.tier) && !ehEvoluida(f.id) && !ehHibrida(f.id));
export const origensHibrida = id => ((beast() || {}).beastforms || []).filter(f => HIB[id] && HIB[id].tiers.includes(f.tier) && !ehEvoluida(f.id) && !ehHibrida(f.id));

const PASSO = [4, 6, 8, 10, 12, 20];
// "d8+2 fís" -> { n: 8, flat: 2, tipo: "fís" }
function dano(s) {
  const m = String(s || "").match(/d(\d+)\s*([+\-]\s*\d+)?\s*(.*)$/i);
  return m ? { n: +m[1], flat: m[2] ? parseInt(m[2].replace(/\s/g, ""), 10) : 0, tipo: m[3].trim() } : null;
}
export function fmtDano(dn, prof) {
  if (!dn) return "";
  return `${prof ? prof : ""}d${dn.n}${dn.flat ? (dn.flat > 0 ? "+" : "") + dn.flat : ""}`;
}

// Forma ativa já resolvida (estatísticas finais). null = sem forma.
export function formaAtiva(pc) {
  const bf = pc && pc.bf;
  if (!bf || !bf.id) return null;
  const f = formaPorId(bf.id);
  if (!f) return null;
  let src = f, trait = f.trait, tb = f.tb || 0, ev = f.ev || 0, dn = dano(f.dmg), adv = f.adv ? f.adv.split(/,\s*/) : [], feats = [...(f.f || [])], atk = f.atk || "";
  let rotulo = f.n, ilu = f.id;
  if (ehEvoluida(f.id)) {
    const base = formaPorId(bf.base), e = EVO[f.id];
    if (!base) return null;
    src = base; trait = base.trait; tb = (base.tb || 0) + e.tr; ev = (base.ev || 0) + e.ev; atk = base.atk;
    dn = dano(base.dmg);
    if (dn) { dn.flat += e.dano; if (e.passo) dn.n = PASSO[Math.min(PASSO.length - 1, Math.max(0, PASSO.indexOf(dn.n)) + e.passo)] || dn.n; }
    adv = base.adv ? base.adv.split(/,\s*/) : [];
    feats = [...(base.f || []), ...(f.f || [])];
    rotulo = `${f.n}: ${base.n}`; ilu = base.id;
  } else if (ehHibrida(f.id)) {
    const h = bf.hib || { src: [], feats: [], advs: [] };
    adv = [...(h.advs || [])];
    const todas = (h.src || []).flatMap(id => (formaPorId(id) || {}).f || []);
    feats = [...todas.filter(x => (h.feats || []).includes(x.n)), ...(f.f || [])];
  }
  const t = trait && trPT(trait);
  return { id: f.id, n: rotulo, nBase: f.n, tier: f.tier, ex: f.ex || "", trait, tk: t ? t.k : null, tb, ev, atk, dn, tipoDano: dn ? dn.tipo : "", adv, feats, evo: bf.evo || null, ilu, src, evoluida: ehEvoluida(f.id), hibrida: ehHibrida(f.id) };
}

// O que a forma muda em deriv(): Evasão e atributos (bônus da forma + o +1 da Evolução)
export function efeitosForma(pc) {
  const f = formaAtiva(pc);
  if (!f) return null;
  const tr = {};
  if (f.tk) tr[f.tk] = (tr[f.tk] || 0) + f.tb;
  if (f.evo) tr[f.evo] = (tr[f.evo] || 0) + 1;
  return { ev: f.ev, tr, forma: f };
}

// Estresse marcado ao transformar: 1 (nenhum na Evolução), mais o adicional das formas Híbridas
export const custoEstresse = (id, modo) => (modo === "evolucao" ? 0 : 1) + (ehHibrida(id) ? HIB[id].extra : 0);

// Custo e validação. modo: "estresse" | "evolucao". Devolve texto de erro, ou null se pode.
export function podeAssumir(pc, d, id, modo, extra = {}) {
  if (pc.bf && pc.bf.id) return "Você já está transformado: saia da forma antes.";
  const f = formaPorId(id);
  if (!f) return "Forma desconhecida.";
  if (f.tier > d.tier) return "Forma de patamar maior que o seu.";
  if (ehEvoluida(id) && !(extra.base && basesEvoluida(id).some(b => b.id === extra.base))) return "Escolha qual forma evoluir.";
  if (ehHibrida(id)) {
    const h = HIB[id], x = extra.hib || {};
    if ((x.src || []).length !== h.origens) return `Escolha ${h.origens} formas de origem.`;
    if ((x.advs || []).length !== h.advs) return `Escolha ${h.advs} vantagens.`;
    if ((x.feats || []).length !== h.feats) return `Escolha ${h.feats} características.`;
  }
  if (modo === "evolucao") {
    if (pc.st.esp < 3) return "Evolução custa 3 de Esperança.";
    if (!TRAITS.some(t => t.k === extra.evo)) return "Escolha o atributo que sobe +1.";
  }
  if (pc.st.es + custoEstresse(id, modo) > d.esMax) return "Sem Estresse livre para se transformar.";
  return null;
}

export function assumir(pc, id, modo, extra = {}) {
  if (modo === "evolucao") pc.st.esp -= 3;
  pc.st.es += custoEstresse(id, modo);
  pc.bf = { id };
  if (modo === "evolucao") pc.bf.evo = extra.evo;
  if (ehEvoluida(id)) pc.bf.base = extra.base;
  if (ehHibrida(id)) pc.bf.hib = { src: [...extra.hib.src], feats: [...extra.hib.feats], advs: [...extra.hib.advs] };
  pc.forma = formaAtiva(pc).n;
}
export function sairForma(pc) { pc.bf = null; pc.forma = ""; }
