// Regras de ficha: estatísticas derivadas e progressão de nível (SRD Daggerheart)
import { get, loc, TRAITS, TRAIT_EN } from "./data.js";

export const tierOf = l => (l <= 1 ? 1 : l <= 4 ? 2 : l <= 7 ? 3 : 4);
export const MAX_SLOTS = 12;

export function novoPersonagem() {
  return {
    v: 1, nome: "", pronomes: "", nivel: 1,
    classe: "", subclasse: "", anc: { tipo: "uma", id: "" }, comunidade: "",
    atr: { agi: 0, for: 0, acu: 0, ins: 0, pre: 0, con: 0 },
    exp: [{ n: "", v: 2 }, { n: "", v: 2 }],
    armas: { p: "", s: "" }, armadura: "", reserva: [],
    inventario: [], ouro: { p: 1, b: 0, c: 0 },
    cartas: { mao: [], cofre: [] },
    scNivel: 0, mc: null, log: [],
    st: { pv: 0, es: 0, esp: 2, arm: 0, cond: [] },
    cicatrizes: 0, mod: { ev: 0, arm: 0, lim: 0, pv: 0, es: 0, prof: 0 },
    recursos: [], forma: "", transf: "",
    hist: { aparencia: "", origem: "", perguntas: [], conexoes: [], notas: "" },
    criadoEm: Date.now(),
  };
}

// Modificadores escritos nas características de armas e armaduras: "-1 to Evasion", "+1 to Armor Score", "-1 to Agility"...
export function featMods(feats) {
  const m = { ev: 0, arm: 0, tr: {} };
  for (const f of feats || []) {
    for (const part of String(f.t || "").split(/[;.]/)) {
      const r = part.trim().match(/^([+\-−])\s?(\d+)\s+(?:bonus\s+)?to\s+(.+)$/i);
      if (!r) continue;
      const v = (r[1] === "+" ? 1 : -1) * +r[2];
      const alvo = r[3].trim().toLowerCase();
      if (/^all character traits and evasion$/.test(alvo)) { TRAITS.forEach(t => (m.tr[t.k] = (m.tr[t.k] || 0) + v)); m.ev += v; continue; }
      if (/^all character traits$/.test(alvo)) { TRAITS.forEach(t => (m.tr[t.k] = (m.tr[t.k] || 0) + v)); continue; }
      if (/^evasion$/.test(alvo)) m.ev += v;
      else if (/^armor score$/.test(alvo)) m.arm += v;
      else {
        const t = TRAITS.find(t => t.en.toLowerCase() === alvo);
        if (t) m.tr[t.k] = (m.tr[t.k] || 0) + v;
      }
    }
  }
  return m;
}

// Características de ancestralidade escolhidas (considera ancestralidade mista)
export function ancFeats(pc) {
  const a = pc.anc || {};
  if (a.tipo === "mista") return (a.f || []).map(x => { const o = get("ancestries", x.anc); return o && o.f[x.i] ? { ...loc("ancestries", o).f[x.i], en: o.f[x.i].n, de: x.anc } : null; }).filter(Boolean);
  const o = get("ancestries", a.id);
  return o ? loc("ancestries", o).f.map((f, i) => ({ ...f, en: o.f[i].n, de: a.id })) : [];
}

export function bonusLog(pc) {
  const b = { hp: 0, st: 0, ev: 0, pf: 0, tr: {} };
  for (const e of pc.log || []) {
    if ([2, 5, 8].includes(e.to)) b.pf++;
    for (const p of e.picks || []) {
      if (p.o === "hp") b.hp++;
      if (p.o === "st") b.st++;
      if (p.o === "ev") b.ev++;
      if (p.o === "pf") b.pf++;
      if (p.o === "tr") (p.traits || []).forEach(t => (b.tr[t] = (b.tr[t] || 0) + 1));
    }
  }
  return b;
}

export function deriv(pc) {
  const cls = get("classes", pc.classe), sub = get("subclasses", pc.subclasse);
  const arm = get("armor", pc.armadura), wp = get("weapons", pc.armas.p), ws = get("weapons", pc.armas.s);
  const b = bonusLog(pc), mod = pc.mod || {};
  const eq = featMods([...(arm ? arm.f : []), ...(wp ? wp.f : []), ...(ws ? ws.f : [])]);
  const af = ancFeats(pc).map(f => f.en);
  const nivel = pc.nivel || 1;
  const prof = 1 + b.pf + (mod.prof || 0);
  const atr = {};
  for (const t of TRAITS) atr[t.k] = (pc.atr[t.k] || 0) + (b.tr[t.pt] || b.tr[t.k] || 0) + (eq.tr[t.k] || 0);
  const ev = (cls ? cls.ev : 10) + b.ev + eq.ev + (af.includes("Nimble") ? 1 : 0) + (mod.ev || 0);
  const pvMax = Math.min(MAX_SLOTS, (cls ? cls.hp : 6) + b.hp + (af.includes("Endurance") ? 1 : 0) + (mod.pv || 0));
  const esMax = Math.min(MAX_SLOTS, 6 + b.st + (af.includes("High Stamina") ? 1 : 0) + (mod.es || 0));
  const espMax = Math.max(0, 6 - (pc.cicatrizes || 0));
  const armMax = Math.max(0, Math.min(MAX_SLOTS, (arm ? +arm.sc || 0 : 0) + eq.arm + (mod.arm || 0)));
  let lim;
  if (arm) { const [a, c] = String(arm.th).split("/").map(s => parseInt(s, 10) || 0); lim = [a + nivel, c + nivel]; }
  else lim = [nivel, nivel * 2];
  const extra = (mod.lim || 0) + (af.includes("Shell") ? prof : 0);
  lim = [lim[0] + extra, lim[1] + extra];
  const conj = sub && sub.sc ? TRAIT_EN[sub.sc] : null;
  const doms = cls ? [...cls.d] : [];
  if (pc.mc && pc.mc.dom && !doms.includes(pc.mc.dom)) doms.push(pc.mc.dom);
  const arma = w => {
    if (!w) return null;
    const m = String(w.dmg).match(/^(\d*)d(\d+)\s*([+\-]\s*\d+)?\s*(\w+)?/);
    const dano = m ? `${prof}d${m[2]}${m[3] ? m[3].replace(/\s/g, "") : ""}` : w.dmg;
    const tr = TRAIT_EN[w.tr] || (w.tr === "Spellcast" ? conj : null);
    return { w, dano, tipo: m && m[4] ? m[4] : "", atr: tr ? tr.k : null, bonus: tr ? atr[tr.k] : null };
  };
  return {
    cls, sub, arm, prof, atr, ev, pvMax, esMax, espMax, armMax, lim, conj, doms, tier: tierOf(nivel),
    p: arma(wp), s: arma(ws), eq,
  };
}

// ---------- Subida de nível ----------
export const OPT = [
  { k: "tr", n: "+1 em dois atributos não marcados", s: 3, c: 1, f: 2 },
  { k: "hp", n: "+1 espaço de Pontos de Vida", s: 2, c: 1, f: 2 },
  { k: "st", n: "+1 espaço de Estresse", s: 2, c: 1, f: 2 },
  { k: "xp", n: "+1 em duas Experiências", s: 1, c: 1, f: 2 },
  { k: "dc", n: "Carta de domínio adicional", s: 1, c: 1, f: 2 },
  { k: "ev", n: "+1 em Evasão", s: 1, c: 1, f: 2 },
  { k: "sc", n: "Carta de subclasse aprimorada", s: 1, c: 1, f: 3 },
  { k: "pf", n: "+1 em Proficiência (usa as duas escolhas)", s: 1, c: 2, f: 3 },
  { k: "mc", n: "Multiclasse (usa as duas escolhas)", s: 1, c: 2, f: 3 },
];
export const OPTM = Object.fromEntries(OPT.map(o => [o.k, o]));
export const TCAP = { 2: 4, 3: 7, 4: 10 };
export const usados = (pc, o, t) => (pc.log || []).reduce((n, e) => n + (e.picks || []).filter(p => p.o === o && p.tier === t).length, 0);

// atributos marcados (as marcas são limpas nos níveis 5 e 8)
export function marcados(pc, novoNivel) {
  const corte = novoNivel >= 8 ? 8 : novoNivel >= 5 ? 5 : 0, s = new Set();
  (pc.log || []).forEach(e => { if (e.to >= corte) (e.picks || []).forEach(p => { if (p.o === "tr") (p.traits || []).forEach(x => s.add(x)); }); });
  return s;
}

// Por que uma opção está (in)disponível; "ok" se pode escolher
export function podeEscolher(pc, rascunho, o, t) {
  const op = OPTM[o], novoNivel = pc.nivel + 1, nt = tierOf(novoNivel);
  if (t < op.f || t > nt) return "Indisponível neste patamar";
  const noRasc = rascunho.picks.filter(p => p.o === o && p.tier === t).length;
  if (op.s - usados(pc, o, t) - noRasc <= 0) return "Sem espaço livre";
  const custo = rascunho.picks.reduce((s, p) => s + OPTM[p.o].c, 0);
  if (custo + op.c > 2) return "Já escolheu dois avanços";
  if (o === "sc") {
    if ((pc.scNivel || 0) + rascunho.picks.filter(p => p.o === "sc").length >= 2) return "Subclasse já está na Maestria";
    if (usados(pc, "mc", t) || rascunho.picks.some(p => p.o === "mc" && p.tier === t)) return "Bloqueada pela multiclasse neste patamar";
  }
  if (o === "mc") {
    if (pc.mc || rascunho.picks.some(p => p.o === "mc")) return "Já tem multiclasse";
    if (usados(pc, "sc", t) || rascunho.picks.some(p => p.o === "sc" && p.tier === t)) return "Bloqueada pela subclasse neste patamar";
  }
  if (o === "dc" && t > nt) return "Indisponível";
  return "ok";
}

export const conquista = nv => ({
  2: "Ganhe uma nova Experiência com +2 e +1 de Proficiência.",
  5: "Ganhe uma nova Experiência com +2, +1 de Proficiência e limpe as marcas de atributos.",
  8: "Ganhe uma nova Experiência com +2, +1 de Proficiência e limpe as marcas de atributos.",
}[nv] || "");

// Cartas que o personagem pode pegar (domínios da classe até o nível; domínio de multiclasse até metade do nível)
export function cartasElegiveis(pc, { maxL, novoNivel, mcDom = null, exclui = [], lista }) {
  const cls = get("classes", pc.classe);
  const tem = new Set([...(pc.cartas.mao || []), ...(pc.cartas.cofre || []), ...exclui]);
  const mcMax = Math.min(maxL, Math.ceil((novoNivel || pc.nivel) / 2));
  const md = mcDom || (pc.mc && pc.mc.dom);
  return lista.filter(c => !tem.has(c.id) && ((cls && cls.d.includes(c.d) && c.l <= maxL) || (md && c.d === md && c.l <= mcMax)));
}

// Recursos sugeridos por classe (contadores na ficha)
export const RECURSOS_CLASSE = {
  Bard: [{ n: "Dado de Inspiração (Rally)", max: 1 }],
  Guardian: [{ n: "Dado Imparável", max: 6 }],
  Seraph: [{ n: "Dados de Oração", max: 4 }],
  Sorcerer: [],
  Ranger: [{ n: "Marca do Foco (Hunter's Focus)", max: 1 }],
};

export const fmtOuro = o => [o.c ? `${o.c} baú${o.c > 1 ? "s" : ""}` : "", o.b ? `${o.b} bolsa${o.b > 1 ? "s" : ""}` : "", o.p ? `${o.p} punhado${o.p > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") || "Sem ouro";
