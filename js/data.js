// Carrega o conteúdo do jogo (SRD + traduções + expansão) e expõe consultas já em português.
import { store, norm } from "./util.js";

const KINDS = ["classes", "subclasses", "ancestries", "communities", "cards", "weapons", "armor", "consumables", "items", "transformations"];
const RAW = Object.fromEntries(KINDS.map(k => [k, []]));
const BY = Object.fromEntries(KINDS.map(k => [k, new Map()]));
let PT = {}, OF = {}, TERMS = {}, BEAST = null, GUIA = [], DOMDESC = {}, ICONS = {};
export const EXP = { disponivel: false, errata: [] };

async function j(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) return null; return await r.json(); } catch { return null; }
}

export async function loadData() {
  const v = "?v=" + (window.APP_VERSION || "1");
  const [base, exp, c1, c2, orig, equip, pexp, of, beast, guia] = await Promise.all([
    j("data/base.json" + v), j("data/exp.json" + v), j("data/pt/cards-1.json" + v), j("data/pt/cards-2.json" + v),
    j("data/pt/origens.json" + v), j("data/pt/equip.json" + v), j("data/pt/exp.json" + v), Promise.resolve(null),
    j("data/beast.json" + v), j("data/guia.json" + v),
  ]);
  if (!base) throw new Error("Não foi possível carregar os dados do jogo.");
  for (const k of KINDS) RAW[k] = [...(base[k] || [])];
  ICONS = base.domainIcons || {};
  if (exp) {
    EXP.disponivel = true;
    EXP.errata = exp.errata || [];
    for (const k of KINDS) for (const it of exp[k] || []) RAW[k].push({ ...it, src: it.src || "hf" });
    Object.assign(DOMDESC, exp.domains || {});
  }
  for (const k of KINDS) { BY[k] = new Map(RAW[k].map(x => [x.id || x.n, x])); RAW[k].forEach(x => { if (!x.id) x.id = x.n; }); }
  // Traduções: mapas id -> campos em PT
  PT = Object.fromEntries(KINDS.map(k => [k, {}]));
  const merge = src => { if (!src) return; for (const k of KINDS) Object.assign(PT[k], src[k] || {}); };
  PT.cards = Object.assign({}, c1 || {}, c2 || {});
  merge(orig); merge(equip); merge(pexp);
  if (pexp && pexp.cards) Object.assign(PT.cards, pexp.cards);
  if (pexp && pexp.domains) Object.assign(DOMDESC_PT, pexp.domains);
  TERMS = Object.assign({}, equip && equip.terms || {});
  OF = of || {};
  Object.assign(TERMS, OF.terms || {});
  BEAST = beast;
  GUIA = guia || [];
}
const DOMDESC_PT = {};

// ---------- configuração do usuário ----------
const CFG_KEY = "dh-config";
const DEF = { hf: false, tema: "auto", nomesEN: false };
export function cfg() { return Object.assign({}, DEF, store.get(CFG_KEY, {})); }
export function setCfg(p) { store.set(CFG_KEY, Object.assign(cfg(), p)); }
// A mesa pode forçar a expansão ligada/desligada para as fichas dela
let mesaHF = null;
export function setMesaExp(v) { mesaHF = v; }
export const hfOn = () => EXP.disponivel && (mesaHF ?? cfg().hf);

// ---------- consultas ----------
export function list(kind, { todas = false } = {}) {
  const on = todas || hfOn();
  return RAW[kind].filter(x => on || x.src !== "hf");
}
export const get = (kind, id) => (id ? BY[kind].get(id) : undefined);
export const isExp = x => x && x.src === "hf";

// Objeto localizado: campos PT por cima do EN (arrays de {n,t} por índice)
const LC = new Map();
export function loc(kind, x) {
  if (!x) return x;
  if (typeof x === "string") x = get(kind, x);
  if (!x) return x;
  const key = kind + "|" + x.id;
  if (LC.has(key)) return LC.get(key);
  const p = (PT[kind] || {})[x.id] || {};
  const o = { ...x, en: x.n };
  for (const [f, v] of Object.entries(p)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v) && Array.isArray(x[f])) o[f] = x[f].map((e, i) => (e && typeof e === "object" && v[i] ? { ...e, ...v[i], en: e.n } : v[i] ?? e));
    else if (typeof v === "object" && !Array.isArray(v) && x[f] && typeof x[f] === "object") o[f] = { ...x[f], ...v, en: x[f].n };
    else o[f] = v;
  }
  const off = OF[kind] && OF[kind][x.id];
  if (off) o.n = off;
  // nomes oficiais de habilidades de classe
  if (OF.classFeatures) {
    const fix = f => (f && OF.classFeatures[f.en || f.n] ? { ...f, n: OF.classFeatures[f.en || f.n] } : f);
    if (o.hope) o.hope = fix(o.hope);
    if (o.feats) o.feats = o.feats.map(fix);
  }
  o.translated = !!p.n || !!p.x || !!p.desc || !!off;
  LC.set(key, o);
  return o;
}
export const nome = (kind, x) => { const o = loc(kind, x); return o ? o.n : (typeof x === "string" ? x : ""); };

// ---------- termos fixos ----------
export const TRAITS = [
  { k: "agi", en: "Agility", pt: "Agilidade", v: "Correr, Saltar, Manobrar" },
  { k: "for", en: "Strength", pt: "Força", v: "Erguer, Esmagar, Agarrar" },
  { k: "acu", en: "Finesse", pt: "Acuidade", v: "Controlar, Esconder, Manipular" },
  { k: "ins", en: "Instinct", pt: "Instinto", v: "Perceber, Sentir, Navegar" },
  { k: "pre", en: "Presence", pt: "Presença", v: "Encantar, Atuar, Enganar" },
  { k: "con", en: "Knowledge", pt: "Conhecimento", v: "Lembrar, Analisar, Compreender" },
];
export const TRAIT_EN = Object.fromEntries(TRAITS.map(t => [t.en, t]));
export const traitPT = en => term(en) || (TRAIT_EN[en] ? TRAIT_EN[en].pt : en);

const DOM_PT = { Arcana: "Arcano", Blade: "Lâmina", Bone: "Osso", Codex: "Códice", Grace: "Graça", Midnight: "Meia-Noite", Sage: "Sábio", Splendor: "Esplendor", Valor: "Valor", Dread: "Pavor" };
export const domPT = d => (OF.domains && OF.domains[d]) || DOM_PT[d] || d;
const DREAD_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7 2 3.5 5.6 3.5 10.3c0 2.6 1.1 4.6 2.9 6v3.2c0 .8.7 1.5 1.5 1.5h1.4v-2.2h1.4V21h2.6v-2.2h1.4V21h1.4c.8 0 1.5-.7 1.5-1.5v-3.2c1.8-1.4 2.9-3.4 2.9-6C20.5 5.6 17 2 12 2zM8.6 14.2a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zm6.8 0a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zM12 15.2l-1.2 2h2.4z"/></svg>';
export const domIcon = d => ICONS[d] || (d === "Dread" ? DREAD_ICON : "");
export const DOMS = () => Object.keys(DOM_PT).filter(d => d !== "Dread" || hfOn());

const FIX = {
  Melee: "Corpo a Corpo", "Very Close": "Muito Perto", Close: "Perto", Far: "Longe", "Very Far": "Muito Longe",
  "One-Handed": "Uma Mão", "Two-Handed": "Duas Mãos", Physical: "Físico", Magic: "Mágico", Magical: "Mágico", Primary: "Primária", Secondary: "Secundária",
  Spell: "Magia", Ability: "Habilidade", Grimoire: "Grimório", Spellcast: "Conjuração",
};
export function term(en) { if (en == null) return ""; return TERMS[en] || FIX[en] || (TRAIT_EN[en] && TRAIT_EN[en].pt) || ""; }
export const T = en => term(en) || en;
export const dmgPT = s => String(s || "").replace(/\bphy\b/g, "fís").replace(/\bmag\b/g, "mág");

export const beast = () => BEAST;
export const guia = () => GUIA;
export const domDesc = d => DOMDESC_PT[d] || DOMDESC[d] || "";

// Busca simples por texto em português e inglês
export function matches(o, q) {
  if (!q) return true;
  const hay = norm([o.n, o.en, o.x, o.desc, ...(o.f || []).map(f => (f.n || "") + " " + (f.t || "")), ...(o.feats || []).map(f => f.n + " " + f.t)].join(" "));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
